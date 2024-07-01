return {
	"oysandvik94/curl.nvim",
	dependencies = {
		"nvim-lua/plenary.nvim",
	},
	config = function()
		require("curl").setup({})

		local keymap = vim.keymap

		keymap.set("n", "<leader>cu", "<cmd>CurlOpen<CR>", { desc = "Open curl window" })
		keymap.set("n", "<leader>cuc", "<cmd>CurlClose<CR>", { desc = "Close curl window" })
	end,
}
