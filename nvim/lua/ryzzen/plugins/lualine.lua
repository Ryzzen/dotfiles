return {
	"nvim-lualine/lualine.nvim",
	dependencies = { "maxi0604/music.nvim" },
	config = function()
		require("music").setup({})

		require("lualine").setup({
			options = { theme = "auto" },
			sections = {
				lualine_a = { "mode" },
				lualine_b = { "filename", "filesize" },
				lualine_c = { "branch", "diff" },
				lualine_x = { "diagnostics", "require('music').info()" },
				lualine_y = { "encoding", "fileformat", "filetype" },
				lualine_z = { "progress" },
			},
			inactive_sections = {
				lualine_a = {},
				lualine_b = {},
				lualine_c = { "filename" },
				lualine_x = { "diagnostics", "progress" },
				lualine_y = {},
				lualine_z = {},
			},
		})
	end,
}
