return {
	"danymat/neogen",
	config = function()
		require("neogen").setup({})

		-- Keymaps
		local keymap = vim.keymap

		keymap.set("n", "<leader>dc", "<cmd>Neogen<CR>", { desc = "Play music" })
	end,
}
