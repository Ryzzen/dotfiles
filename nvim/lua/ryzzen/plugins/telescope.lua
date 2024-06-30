return {
  "nvim-telescope/telescope.nvim",
  dependencies = {"nvim-lua/plenary.nvim"},
  config = function()
    require('telescope').setup {
      pickers = {
        find_files = {
          hidden = true
        }
      }
    }

    -- Keymaps
    local keymap = vim.keymap 

    keymap.set("n", "<leader>ff", "<cmd>Telescope find_files<CR>", { desc = "Find files" })
    keymap.set("n", "<leader>fg", "<cmd>Telescope live_grep<CR>", { desc = "Live grep" })
    keymap.set("n", "<leader>fb", "<cmd>Telescope buffers<CR>", { desc = "Find buffer" })
    keymap.set("n", "<leader>fh", "<cmd>Telescope help_tags<CR>", { desc = "Find help" })
    keymap.set("n", "<leader>fd", "<cmd>Telescope diagnostics bufnr=0<CR>", {desc = "Show buffer diagnostics" }) -- show  diagnostics for file
    keymap.set("n", "gr", "<cmd>Telescope lsp_references<CR>", { desc = "Find symbol reference" })
    keymap.set("n", "gd", "<cmd>Telescope lsp_definitions<CR>", { desc = "Find symbol definition" })
    keymap.set("n", "gi", "<cmd>Telescope lsp_implementations<CR>", { desc = "Find symbol implementation" })
    keymap.set("n", "gt", "<cmd>Telescope lsp_type_definitions<CR>", { desc = "Find symbol type definition" })
  end,
}
