return {
  "kdheepak/lazygit.nvim",
  config = function()
    -- Keymaps
    local keymap = vim.keymap 

    keymap.set("n", "<leader>gg", "<cmd>LazyGit<CR>", { desc = "Open lazy git" })
  end
}
