return {
  "akinsho/toggleterm.nvim",
  version = "*",
  config = function()
    require("toggleterm").setup({
      hide_numbers = true,
      shell = fish,
    })

    -- Keymaps
    local keymap = vim.keymap 
    local autocmd = vim.api.nvim_create_autocmd

    keymap.set("n", "<leader>t", "<cmd>exe v:count1 . 'ToggleTerm'<CR>", { desc = "Toggle terminal" })
    keymap.set("i", "<leader>t", "<Esc><cmd> exe v:count1 . 'ToggleTerm'<CR>", { desc = "Toggle terminal" })

    autocmd('TermEnter', {
      pattern = 'term://*toggleterm#*',
      command = "tnoremap <silent><leader>t <cmd>exe v:count1 . 'ToggleTerm'<CR>"
    })
  end,
}
