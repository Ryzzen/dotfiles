return {
	"danymat/neogen",
	config = function()
		require("neogen").setup({
			snippet_engine = "luasnip",
		})

		-- Keymaps
		local keymap = vim.keymap

		keymap.set(
			"n",
			"<leader>cf",
			"<cmd>lua require('neogen').generate({ type = 'func' })<CR>",
			{ desc = "Generate function header" }
		)
		keymap.set(
			"n",
			"<leader>cc",
			"<cmd>lua require('neogen').generate({ type = 'class' })<CR>",
			{ desc = "Generate class header" }
		)
		keymap.set(
			"n",
			"<leader>ct",
			"<cmd>lua require('neogen').generate({ type = 'type' })<CR>",
			{ desc = "Generate type header" }
		)
		keymap.set(
			"n",
			"<leader>ch",
			"<cmd>lua require('neogen').generate({ type = 'file' })<CR>",
			{ desc = "Generate file header" }
		)
	end,
}
