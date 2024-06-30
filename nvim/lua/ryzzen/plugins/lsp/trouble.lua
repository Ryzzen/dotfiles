return {
  "folke/trouble.nvim",
  dependencies = { "nvim-tree/nvim-web-devicons", "folke/todo-comments.nvim" },
  config = function()
    -- Keymaps
    local keymap = vim.keymap 

    keymap.set("n", "<leader>xx", "<cmd>TroubleToggle<cr>", { desc = "Toggle trouble" })
    keymap.set("n", "<leader>xw", "<cmd>TroubleToggle workspace_diagnostics<cr>", { desc = "Workspace diagnostics" })
    keymap.set("n", "<leader>xd", "<cmd>TroubleToggle document_diagnostics<cr>", { desc = "Document diagnostics" })
    keymap.set("n", "<leader>xq", "<cmd>TroubleToggle quickfix<cr>", { desc = "Toggle trouble quickfix" })
    keymap.set("n", "<leader>xl", "<cmd>TroubleToggle loclist<cr>", { desc = "Toggle trouble loclist" })
    keymap.set("n", "gR", "<cmd>TroubleToggle lsp_references<cr>", { desc = "Go to trouble symbole reference" })
  end
}
