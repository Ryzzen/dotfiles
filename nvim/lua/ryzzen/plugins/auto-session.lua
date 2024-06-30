return {
  "rmagatti/auto-session",
  config = function()
    require('auto-session').setup {
      auto_session_supress_dirs = {"~/", "~/Desktop", "~/Documents", "~/Downloads", "~/Pictures", "~/Videos"},
    }

    -- Keymaps
    local keymap = vim.keymap 

    keymap.set("n", "<leader>wr", ":SessionRestore<CR>", { desc = "Restore session" })
    keymap.set("n", "<leader>ws", ":SessionSave<CR>", { desc = "Save session" })
  end
}
