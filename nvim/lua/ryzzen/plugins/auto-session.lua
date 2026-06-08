return {
	"rmagatti/auto-session",
	config = function()
		require("auto-session").setup({
			auto_session_supress_dirs = { "~/", "~/Desktop", "~/Documents", "~/Downloads", "~/Pictures", "~/Videos" },
		})

		-- Keymaps
		local keymap = vim.keymap

		keymap.set("n", "<leader>wr", ":AutoSession restore<CR>", { desc = "Restore session" })
		keymap.set("n", "<leader>ws", ":AutoSession save<CR>", { desc = "Save session" })
		keymap.set("n", "<leader>wd", ":AutoSession delete<CR>", { desc = "Delete session" })
	end,
}
