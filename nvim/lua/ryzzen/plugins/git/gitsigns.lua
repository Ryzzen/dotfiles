return {
	"lewis6991/gitsigns.nvim",
	enabled = true,
	config = function()
		require("gitsigns").setup()
		local keymap = vim.keymap

		keymap.set("n", "<leader>gp", "<cmd>Gitsigns preview_hunk<CR>", { desc = "Preview changes" })
		keymap.set("n", "<leader>gd", "<cmd>Gitsigns diffthis<CR>", { desc = "Diff changes" })
		keymap.set("n", "<leader>gbb", "<cmd>Gitsigns blame<CR>", { desc = "Perform git blame" })
		keymap.set("n", "<leader>gbl", "<cmd>Gitsigns blame_line<CR>", { desc = "Perform git blame on current line" })
		keymap.set(
			"n",
			"<leader>gsa",
			"<cmd>Gitsigns stage_buffer<CR>",
			{ desc = "Perform git stage on current buffer" }
		)
		keymap.set("n", "<leader>gss", "<cmd>Gitsigns stage_hunk<CR>", { desc = "Perform git stage on current hunk" })
		keymap.set(
			"n",
			"<leader>gsu",
			"<cmd>Gitsigns undo_stage_hunk<CR>",
			{ desc = "Perform git stage on current hunk" }
		)

		keymap.set("n", "<C-g>n", "<cmd>Gitsigns next_hunk<CR>", { desc = "Go to next hunk" })
		keymap.set("n", "<C-g>p", "<cmd>Gitsigns prev_hunk<CR>", { desc = "Go to previous hunk" })
	end,
}
