return {
  "https://github.com/liuchengxu/vista.vim",
  dependencies = {"wfxr/minimap.vim"},
  config = function()
    -- Keymaps
    local keymap = vim.keymap 

    keymap.set("n", "<C-p>", ":MinimapClose<CR>:Vista!! <CR>", { desc = "Open vista" })
    keymap.set("n", "<C-m>", ":MinimapToggle<CR>", { desc = "Open minimap" })
  end
}
