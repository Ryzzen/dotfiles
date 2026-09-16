-- Generic OpenOCD / Cortex-M debugging for nvim-dap. NOTHING here is project-
-- specific: each project describes itself in `.debug/nvim-dap.json` at its root,
-- and this config discovers that file, builds the debug configuration from it,
-- and manages the (dockerized) OpenOCD server it names.
--
-- <F5> in a C/C++ buffer under such a project: starts the OpenOCD server, waits
-- until it's listening, attaches gdb with the project's symbols, opens the
-- debugger UI in its own tab, and tears the server + tab down when you stop.
--
-- .nvim/nvim-dap.json  (paths are relative to the project root):
--   {
--     "name":    "My board (OpenOCD + attach)",
--     "program": "build/app_ns.elf",            // primary ELF (has the source)
--     "symbols": ["build/app_s.elf"],           // extra symbol files (optional)
--     "gdb":     "arm-none-eabi-gdb",           // optional
--     "server":  "localhost:3333",              // gdb remote  (optional)
--     "stopAtConnect": true,                     // optional (default true)
--     "openocd": {                               // omit to attach to a manual server
--       "start":     ["make", "openocd"],
--       "stop":      ["make", "openocd-stop"],
--       "ready":     "Listening on port 3333",   // output line meaning "server up"
--       "container": "liberty-ocd"               // docker name → detect a manual one
--     }
--   }

return {
  "mfussenegger/nvim-dap",
  dependencies = {
    "rcarriga/nvim-dap-ui",
    "nvim-neotest/nvim-nio",
    "theHamsta/nvim-dap-virtual-text",
  },
  keys = {
    { "<F5>", function() require("dap").continue() end, desc = "DAP: continue / start" },
    { "<F6>", function() require("dap").pause() end, desc = "DAP: pause" },
    { "<F10>", function() require("dap").step_over() end, desc = "DAP: step over" },
    { "<F11>", function() require("dap").step_into() end, desc = "DAP: step into" },
    { "<F12>", function() require("dap").step_out() end, desc = "DAP: step out" },
    { "<leader>db", function() require("dap").toggle_breakpoint() end, desc = "DAP: toggle breakpoint" },
    { "<leader>dB", function() require("dap").set_breakpoint(vim.fn.input("Condition: ")) end, desc = "DAP: conditional breakpoint" },
    -- Clears ALL breakpoints, including the phantom entries the adapter injects
    -- for pseudo-sources ("[Unknown/Just-In-Time compiled code]", shown under a
    -- bogus buffer number) — <leader>db can't touch those, it only toggles the
    -- breakpoint on the current buffer+line.
    { "<leader>dx", function() require("dap").clear_breakpoints() end, desc = "DAP: clear ALL breakpoints" },
    { "<leader>dc", function() require("dap").run_to_cursor() end, desc = "DAP: run to cursor" },
    { "<leader>dr", function() require("dap").repl.toggle() end, desc = "DAP: REPL" },
    { "<leader>du", function() require("dapui").toggle() end, desc = "DAP: toggle UI" },
    { "<leader>dl", function() require("dap").run_last() end, desc = "DAP: run last" },
    { "<leader>dd", function() require("dap").disconnect() end, desc = "DAP: disconnect (leave running)" },
    { "<leader>dq", function() require("dap").terminate() end, desc = "DAP: quit / terminate" },
  },
  config = function()
    local dap = require("dap")
    local dapui = require("dapui")

    dapui.setup()
    require("nvim-dap-virtual-text").setup()

    vim.fn.sign_define("DapBreakpoint", { text = "●", texthl = "DiagnosticError", numhl = "" })
    vim.fn.sign_define("DapBreakpointCondition", { text = "◆", texthl = "DiagnosticWarn", numhl = "" })
    vim.fn.sign_define("DapStopped", { text = "▶", texthl = "DiagnosticInfo", linehl = "Visual", numhl = "" })

    -- ── Debugger UI in its own tab ───────────────────────────────────────────
    -- Opens when the session starts, and the whole tab closes when it ends — by
    -- Terminate (■), Disconnect, or the program exiting — dropping you back in
    -- your code, never leaving a dead UI behind. (Terminate and Disconnect still
    -- differ where it counts: Terminate releases the board halted; Disconnect
    -- detaches and leaves the firmware running. Both then release OpenOCD.)
    local dbg_tab = nil
    local function open_dbg_ui()
      vim.cmd("tabnew")
      dbg_tab = vim.api.nvim_get_current_tabpage()
      dapui.open()
    end
    local function close_dbg_ui()
      pcall(function() dapui.close() end)
      if dbg_tab and vim.api.nvim_tabpage_is_valid(dbg_tab) and vim.fn.tabpagenr("$") > 1 then
        pcall(function() vim.cmd(vim.api.nvim_tabpage_get_number(dbg_tab) .. "tabclose") end)
      end
      dbg_tab = nil
    end
    dap.listeners.after.event_initialized["dapui_config"] = open_dbg_ui
    dap.listeners.before.event_terminated["dapui_config"] = close_dbg_ui
    dap.listeners.before.event_exited["dapui_config"] = close_dbg_ui
    dap.listeners.before.disconnect["dapui_config"] = close_dbg_ui

    -- ── Per-project discovery: .debug/nvim-dap.json ──────────────────────────
    local function find_project(bufnr)
      bufnr = bufnr or 0
      local root
      if vim.fs and vim.fs.root then
        root = vim.fs.root(bufnr, { ".git", "GNUmakefile", "Makefile" })
      end
      if not root then
        local buf = vim.api.nvim_buf_get_name(bufnr)
        local start = (buf ~= "" and vim.fs.dirname(buf)) or vim.fn.getcwd()
        local hit = vim.fs.find(".nvim", { upward = true, type = "directory", path = start })[1]
        root = hit and vim.fs.dirname(hit) or nil
      end
      if not root then return nil end
      local file = root .. "/.nvim/nvim-dap.json"
      if vim.fn.filereadable(file) == 0 then return nil end
      local ok, data = pcall(vim.json.decode, table.concat(vim.fn.readfile(file), "\n"))
      if not ok or type(data) ~= "table" then
        vim.notify("nvim-dap: could not parse " .. file, vim.log.levels.WARN)
        return nil
      end
      return root, data
    end

    -- Build a cppdbg config from the project description.
    local function build_config(root, p)
      local setup = { { text = "-enable-pretty-printing", ignoreFailures = true } }
      for _, s in ipairs(p.symbols or {}) do
        table.insert(setup, { text = "add-symbol-file " .. root .. "/" .. s, ignoreFailures = true })
      end
      table.insert(setup, { text = "set mem inaccessible-by-default off", ignoreFailures = true })
      return {
        name = p.name or "OpenOCD attach",
        type = "cppdbg",
        request = "launch",
        program = root .. "/" .. (p.program or ""),
        cwd = root,
        MIMode = "gdb",
        miDebuggerPath = p.gdb or "arm-none-eabi-gdb",
        miDebuggerServerAddress = p.server or "localhost:3333",
        stopAtConnect = (p.stopAtConnect ~= false),
        externalConsole = false,
        setupCommands = setup,
        _openocd = p.openocd, -- carried to the adapter for lifecycle management
        _root = root,
      }
    end

    -- Offer the project's debug config for C/C++ buffers, computed per buffer.
    local function provide(bufnr)
      local ft = vim.bo[bufnr].filetype
      if ft ~= "c" and ft ~= "cpp" then return {} end
      local root, p = find_project(bufnr)
      if not root then return {} end
      return { build_config(root, p) }
    end
    if dap.providers and dap.providers.configs then
      dap.providers.configs["dap-openocd-project"] = provide
      -- Don't auto-load .vscode/launch.json in nvim: its configs (e.g. the
      -- cortex-debug entry kept for the VS Code teammates) can't run under
      -- nvim-dap and would add a dead second entry to the <F5> picker. The
      -- project's .nvim/nvim-dap.json is the single source of truth here.
      dap.providers.configs["dap.launch.json"] = nil
    else -- older nvim-dap without providers: fall back to a FileType autocmd
      vim.api.nvim_create_autocmd("FileType", {
        pattern = { "c", "cpp" },
        callback = function(ev)
          local cfgs = provide(ev.buf)
          if #cfgs > 0 then
            dap.configurations.c = cfgs
            dap.configurations.cpp = cfgs
          end
        end,
      })
    end

    -- ── Generic OpenOCD lifecycle (driven entirely by config._openocd) ───────
    local ocd = { job = nil, ours = false, stop = nil, root = nil }
    local function container_up(name)
      if not name then return false end
      local out = vim.fn.system({ "docker", "ps", "-q", "-f", "name=" .. name })
      return (out or ""):gsub("%s", "") ~= ""
    end
    local function stop_openocd()
      if not ocd.ours then return end -- never kill a server the user started
      ocd.ours = false
      if ocd.job then pcall(vim.fn.jobstop, ocd.job); ocd.job = nil end
      if ocd.stop and ocd.root then vim.fn.jobstart(ocd.stop, { cwd = ocd.root, detach = true }) end
      ocd.stop, ocd.root = nil, nil
    end
    dap.listeners.after.event_terminated["dap_openocd"] = stop_openocd
    dap.listeners.after.event_exited["dap_openocd"] = stop_openocd
    dap.listeners.after.disconnect["dap_openocd"] = stop_openocd
    vim.api.nvim_create_autocmd("VimLeavePre", { callback = function() stop_openocd() end })

    -- cpptools adapter (OpenDebugAD7 on PATH), wrapped so it stands the project's
    -- OpenOCD server up first when nothing is already listening.
    local cppdbg = { id = "cppdbg", type = "executable", command = "OpenDebugAD7" }
    dap.adapters.cppdbg = function(callback, config)
      local oc = config._openocd
      if not oc or not oc.start then
        callback(cppdbg) -- no managed server for this project — attach as-is
        return
      end
      if container_up(oc.container) then
        ocd.ours = false -- attach to the running (manual) server, don't manage it
        callback(cppdbg)
        return
      end

      local root = config._root or vim.fn.getcwd()
      local ready = oc.ready or "Listening on port 3333"
      ocd.ours, ocd.stop, ocd.root = true, oc.stop, root
      local attached = false
      local function attach_once()
        if attached then return end
        attached = true
        callback(cppdbg)
      end
      local function watch(_, data)
        if not data then return end
        for _, line in ipairs(data) do
          if type(line) == "string" and line:find(ready, 1, true) then vim.schedule(attach_once) end
        end
      end

      vim.notify("Debug: starting OpenOCD…", vim.log.levels.INFO)
      ocd.job = vim.fn.jobstart(oc.start, {
        cwd = root,
        on_stdout = watch,
        on_stderr = watch,
        on_exit = function() ocd.job = nil end,
      })
      if not ocd.job or ocd.job <= 0 then
        ocd.ours = false
        vim.notify("Debug: could not launch OpenOCD (" .. table.concat(oc.start, " ") .. ")", vim.log.levels.ERROR)
        return
      end
      vim.defer_fn(function()
        if not attached then
          vim.notify("Debug: OpenOCD didn't come up (waiting for \"" .. ready .. "\") — board connected?", vim.log.levels.ERROR)
          stop_openocd()
        end
      end, 25000)
    end
  end,
}
