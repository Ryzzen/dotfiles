-- Graphical debugging (nvim-dap) for the Liberty v2.5 STM32H573 firmware.
--
-- Just press <F5>. It does the whole dance itself: finds the project (the
-- nearest ancestor holding .debug/openocd.cfg), starts the dockerized OpenOCD
-- server (`make openocd`, a NAMED container), waits for it to listen on :3333,
-- attaches the cpptools/gdb session with BOTH TrustZone worlds' symbols, and on
-- stop tears OpenOCD back down (`make openocd-stop`). Nothing to launch by hand.
--
-- If you already ran `make openocd` yourself, it detects the running container
-- and just attaches — and leaves it running when you stop.

return {
  "mfussenegger/nvim-dap",
  dependencies = {
    "rcarriga/nvim-dap-ui",
    "nvim-neotest/nvim-nio",
    "theHamsta/nvim-dap-virtual-text",
  },
  keys = {
    { "<F5>", function() require("dap").continue() end, desc = "DAP: continue / start" },
    { "<F10>", function() require("dap").step_over() end, desc = "DAP: step over" },
    { "<F11>", function() require("dap").step_into() end, desc = "DAP: step into" },
    { "<F12>", function() require("dap").step_out() end, desc = "DAP: step out" },
    { "<leader>db", function() require("dap").toggle_breakpoint() end, desc = "DAP: toggle breakpoint" },
    { "<leader>dB", function() require("dap").set_breakpoint(vim.fn.input("Condition: ")) end, desc = "DAP: conditional breakpoint" },
    { "<leader>dr", function() require("dap").repl.toggle() end, desc = "DAP: REPL" },
    { "<leader>du", function() require("dapui").toggle() end, desc = "DAP: toggle UI" },
    { "<leader>dc", function() require("dap").run_to_cursor() end, desc = "DAP: run to cursor" },
    { "<leader>dt", function() require("dap").terminate() end, desc = "DAP: terminate" },
  },
  config = function()
    local dap = require("dap")
    local dapui = require("dapui")

    dapui.setup()
    require("nvim-dap-virtual-text").setup()

    -- Open/close the debugger UI with the session.
    dap.listeners.after.event_initialized["dapui_config"] = function() dapui.open() end
    dap.listeners.before.event_terminated["dapui_config"] = function() dapui.close() end
    dap.listeners.before.event_exited["dapui_config"] = function() dapui.close() end

    vim.fn.sign_define("DapBreakpoint", { text = "●", texthl = "DiagnosticError", numhl = "" })
    vim.fn.sign_define("DapBreakpointCondition", { text = "◆", texthl = "DiagnosticWarn", numhl = "" })
    vim.fn.sign_define("DapStopped", { text = "▶", texthl = "DiagnosticInfo", linehl = "Visual", numhl = "" })

    -- ── OpenOCD lifecycle ────────────────────────────────────────────────────
    -- Module-local state so the stop hooks can find (and only kill) a server we
    -- started ourselves.
    local ocd = { job = nil, ours = false }
    local OCD_NAME = "liberty-ocd"

    -- Project root: where the GNUmakefile lives, so `make openocd` runs there.
    -- (Markers must be root-level files — a path like ".debug/openocd.cfg" makes
    -- vim.fs.root return the .debug dir, not the root.)
    local function project_root()
      if vim.fs and vim.fs.root then
        local r = vim.fs.root(0, { "GNUmakefile", ".git" })
        if r then return r end
      end
      local buf = vim.api.nvim_buf_get_name(0)
      local start = (buf ~= "" and vim.fs.dirname(buf)) or vim.fn.getcwd()
      local hit = vim.fs.find("GNUmakefile", { upward = true, path = start })[1]
      return hit and vim.fs.dirname(hit) or vim.fn.getcwd()
    end

    -- Is our OpenOCD container already running (e.g. a manual `make openocd`)?
    local function openocd_running()
      local out = vim.fn.system({ "docker", "ps", "-q", "-f", "name=" .. OCD_NAME })
      return (out or ""):gsub("%s", "") ~= ""
    end

    local function stop_openocd()
      if not ocd.ours then return end -- never kill a server the user started
      ocd.ours = false
      if ocd.job then pcall(vim.fn.jobstop, ocd.job); ocd.job = nil end
      -- Guaranteed teardown by container name, whatever the make/job tree looks like.
      vim.fn.jobstart({ "make", "openocd-stop" }, { cwd = project_root(), detach = true })
    end
    dap.listeners.after.event_terminated["liberty_ocd"] = stop_openocd
    dap.listeners.after.event_exited["liberty_ocd"] = stop_openocd
    dap.listeners.after.disconnect["liberty_ocd"] = stop_openocd
    vim.api.nvim_create_autocmd("VimLeavePre", { callback = function() stop_openocd() end })

    -- cpptools adapter (OpenDebugAD7 on PATH via the embedded home-manager
    -- profile), wrapped so it stands OpenOCD up first when nothing is listening.
    local cppdbg = { id = "cppdbg", type = "executable", command = "OpenDebugAD7" }
    dap.adapters.cppdbg = function(callback, _config)
      if openocd_running() then
        ocd.ours = false -- attach to the user's server, don't manage it
        callback(cppdbg)
        return
      end

      local root = project_root()
      ocd.ours = true
      local attached = false
      local function attach_once()
        if attached then return end
        attached = true
        callback(cppdbg)
      end
      local function watch(_, data)
        if not data then return end
        for _, line in ipairs(data) do
          if type(line) == "string" and line:find("Listening on port 3333", 1, true) then
            vim.schedule(attach_once)
          end
        end
      end

      vim.notify("Liberty: starting OpenOCD…", vim.log.levels.INFO)
      ocd.job = vim.fn.jobstart({ "make", "openocd" }, {
        cwd = root,
        on_stdout = watch,
        on_stderr = watch,
        on_exit = function() ocd.job = nil end,
      })
      if not ocd.job or ocd.job <= 0 then
        ocd.ours = false
        vim.notify("Liberty: could not launch `make openocd` in " .. root, vim.log.levels.ERROR)
        return
      end
      -- Fail loudly (and clean up) if it never comes up — board unplugged, etc.
      vim.defer_fn(function()
        if not attached then
          vim.notify("Liberty: OpenOCD didn't reach :3333 — is the board connected?", vim.log.levels.ERROR)
          stop_openocd()
        end
      end, 25000)
    end

    -- Liberty v2.5 (STM32H573, TrustZone). <F5> auto-manages OpenOCD (above) and
    -- attaches over its gdb server on :3333, loading both worlds' symbols so
    -- breakpoints resolve across the secure/non-secure boundary.
    local liberty = {
      name = "Liberty v2.5 (auto: OpenOCD + attach)",
      type = "cppdbg",
      request = "launch",
      program = "${workspaceFolder}/Makefile/NonSecure/build/Libertyv2.5_NS.elf",
      cwd = "${workspaceFolder}",
      MIMode = "gdb",
      miDebuggerPath = "arm-none-eabi-gdb",
      miDebuggerServerAddress = "localhost:3333",
      stopAtConnect = true,
      externalConsole = false,
      setupCommands = {
        { text = "-enable-pretty-printing", ignoreFailures = true },
        { text = "add-symbol-file ${workspaceFolder}/Makefile/Secure/build/Libertyv2.5_S.elf", ignoreFailures = true },
        { text = "set mem inaccessible-by-default off", ignoreFailures = true },
      },
    }

    dap.configurations.cpp = { liberty }
    dap.configurations.c = { liberty }
  end,
}
