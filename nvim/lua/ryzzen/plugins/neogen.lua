return {
	"danymat/neogen",
	config = function()
		require("neogen").setup({
			snippet_engine = "luasnip",
		})

		-- Keymaps
		local keymap = vim.keymap

		keymap.set("n", "<leader>cd", "<cmd>Neogen<CR>", { desc = "Generate function header" })
	end,
}
