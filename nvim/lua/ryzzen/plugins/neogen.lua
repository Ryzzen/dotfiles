return {
	"danymat/neogen",
	config = function()
		require("neogen").setup({
			snippet_engine = "luasnip",
		})

		-- Keymaps
		local keymap = vim.keymap

		keymap.set("n", "<leader>dc", "<cmd>Neogen<CR>", { desc = "Play music" })
	end,
}
