-- Graphical debugging (nvim-dap) for the Liberty v2.5 STM32H573 firmware.
--
-- Backend: run `make openocd` in the project (ST's OpenOCD fork, in Docker, with
-- the ST-LINK passed through) — it serves a GDB remote on :3333. This config
-- attaches to it through the cpptools DAP adapter (OpenDebugAD7, from the
-- embedded home-manager profile), which drives arm-none-eabi-gdb over MI.
--
-- Flow: `make openocd` in a terminal, then in nvim press <F5> (or :lua
-- require("dap").continue()) and pick "Liberty v2.5". The DAP UI opens
-- automatically. Both TrustZone ELFs' symbols are loaded so breakpoints resolve
-- in the secure and non-secure worlds.

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

    -- cpptools adapter (OpenDebugAD7 on PATH via the embedded home-manager profile).
    dap.adapters.cppdbg = {
      id = "cppdbg",
      type = "executable",
      command = "OpenDebugAD7",
    }

    -- Liberty v2.5 (STM32H573, TrustZone) over the OpenOCD gdb server on :3333.
    -- Start it first with `make openocd`. openocd's gdb-attach event reset-halts
    -- the target, so the session stops at the reset vector on connect.
    local liberty = {
      name = "Liberty v2.5 — attach (OpenOCD :3333)",
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
        -- Secure world's symbols (NonSecure is `program` above), loaded at the
        -- ELF's own addresses so breakpoints resolve across the TZ boundary.
        { text = "add-symbol-file ${workspaceFolder}/Makefile/Secure/build/Libertyv2.5_S.elf", ignoreFailures = true },
        { text = "set mem inaccessible-by-default off", ignoreFailures = true },
      },
    }

    dap.configurations.cpp = { liberty }
    dap.configurations.c = { liberty }
  end,
}
