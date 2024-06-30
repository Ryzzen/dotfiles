return {
	"junegunn/vim-easy-align",
	config = function()
		-- Keymaps
		local keymap = vim.keymap

		keymap.set("n", "ga", "<Plug>(EasyAlign)", { desc = "Easy align" })
		keymap.set("x", "ga", "<Plug>(EasyAlign)", { desc = "Easy align" })
	end,
}
