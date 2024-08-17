return {
	"https://github.com/liuchengxu/vista.vim",
	config = function()
		-- Keymaps
		local keymap = vim.keymap

		keymap.set("n", "<C-p>", ":Vista!! <CR>", { desc = "Open vista" })
	end,
}
