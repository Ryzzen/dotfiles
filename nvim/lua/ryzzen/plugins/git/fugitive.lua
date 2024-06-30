return {
  "https://github.com/tpope/vim-fugitive",
  dependencies = "https://github.com/tpope/vim-rhubarb",
  config = function()
    -- Keymaps
    local keymap = vim.keymap 

    keymap.set("n", "<leader>gb", "<cmd>Git blame<CR>", { desc = "Git blame" })
  end
}
