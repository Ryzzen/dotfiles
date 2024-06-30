return {
	"AntonVanAssche/music-controls.nvim",
	dependencies = { "rcarriga/nvim-notify" },
	config = function()
		require("music").setup({})
		_G.music_controls_default_player = "spotify"

		-- Keymaps
		local keymap = vim.keymap

		keymap.set("n", "<leader>mm", "<cmd>MusicPlay<CR>", { desc = "Play music" })
		keymap.set("n", "<leader>mp", "<cmd>MusicPause<CR>", { desc = "Pause music" })
		keymap.set("n", "<leader>m<PageUp>", "<cmd>MusicNext<CR>", { desc = "Play next music" })
		keymap.set("n", "<leader>m<PageDown>", "<cmd>MusicPrev<CR>", { desc = "Play previous music" })
		keymap.set("n", "<leader>mc", "<cmd>MusicCurrent<CR>", { desc = "Play current music" })
		keymap.set("n", "<leader>ms", "<cmd>MusicShuffle<CR>", { desc = "Shuffle music" })
		keymap.set("n", "<leader>ml", "<cmd>MusicLoop<CR>", { desc = "Loop music" })
	end,
}
