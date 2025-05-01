return {
	"AntonVanAssche/music-controls.nvim",
	dependencies = { "rcarriga/nvim-notify" },
	config = function()
		require("music").setup({})
		_G.music_controls_default_player = "spotify"

		-- Keymaps
		local keymap = vim.keymap

		keymap.set("n", "<C-m>m", "<cmd>MusicPlay<CR>", { desc = "Play music" })
		keymap.set("n", "<C-m>p", "<cmd>MusicPause<CR>", { desc = "Pause music" })
		keymap.set("n", "<C-m><PageUp>", "<cmd>MusicNext<CR>", { desc = "Play next music" })
		keymap.set("n", "<C-m><PageDown>", "<cmd>MusicPrev<CR>", { desc = "Play previous music" })
		keymap.set("n", "<C-m>c", "<cmd>MusicCurrent<CR>", { desc = "Play current music" })
		keymap.set("n", "<C-m>s", "<cmd>MusicShuffle<CR>", { desc = "Shuffle music" })
		keymap.set("n", "<C-m>l", "<cmd>MusicLoop<CR>", { desc = "Loop music" })
	end,
}
