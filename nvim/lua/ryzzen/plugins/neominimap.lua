return {
	"Isrothy/neominimap.nvim",
	dependencies = { "lewis6991/gitsigns.nvim" },
	enabled = true,
	lazy = false, -- NOTE: NO NEED to Lazy load
	-- Optional
	-- keys = {
	-- 	{ "<leader>nt", "<cmd>Neominimap toggle<cr>", desc = "Toggle minimap" },
	-- 	{ "<leader>no", "<cmd>Neominimap on<cr>", desc = "Enable minimap" },
	-- 	{ "<leader>nc", "<cmd>Neominimap off<cr>", desc = "Disable minimap" },
	-- 	{ "<leader>nf", "<cmd>Neominimap focus<cr>", desc = "Focus on minimap" },
	-- 	{ "<leader>nu", "<cmd>Neominimap unfocus<cr>", desc = "Unfocus minimap" },
	-- 	{ "<leader>ns", "<cmd>Neominimap toggleFocus<cr>", desc = "Toggle focus on minimap" },
	-- 	{ "<leader>nwt", "<cmd>Neominimap winToggle<cr>", desc = "Toggle minimap for current window" },
	-- 	{ "<leader>nwr", "<cmd>Neominimap winRefresh<cr>", desc = "Refresh minimap for current window" },
	-- 	{ "<leader>nwo", "<cmd>Neominimap winOn<cr>", desc = "Enable minimap for current window" },
	-- 	{ "<leader>nwc", "<cmd>Neominimap winOff<cr>", desc = "Disable minimap for current window" },
	-- 	{ "<leader>nbt", "<cmd>Neominimap bufToggle<cr>", desc = "Toggle minimap for current buffer" },
	-- 	{ "<leader>nbr", "<cmd>Neominimap bufRefresh<cr>", desc = "Refresh minimap for current buffer" },
	-- 	{ "<leader>nbo", "<cmd>Neominimap bufOn<cr>", desc = "Enable minimap for current buffer" },
	-- 	{ "<leader>nbc", "<cmd>Neominimap bufOff<cr>", desc = "Disable minimap for current buffer" },
	-- },
	init = function()
		vim.opt.wrap = false -- Recommended
		vim.opt.sidescrolloff = 36 -- It's recommended to set a large value
		vim.g.neominimap = {
			auto_enable = true,
			exclude_buftypes = {
				"nofile",
				"nowrite",
				"quickfix",
				"terminal",
				"prompt",
			},
			exclude_filetypes = {
				"help",
			},
			sync_cursor = true, ---@type boolean

			click = {
				-- Enable mouse click on minimap
				enabled = true, ---@type boolean
				-- Automatically switch focus to minimap when clicked
				auto_switch_focus = true, ---@type boolean
			},

			-- How many columns a dot should span
			x_multiplier = 8, ---@type integer

			-- How many rows a dot should span
			y_multiplier = 1, ---@type integer

			layout = "float", ---@type Neominimap.Config.LayoutType
			float = {
				-- Border style of the floating window
				-- Accepts all usual border style options (e.g., "none", "rounded", "solid", "shadow" "single", "double")
				window_border = "none", ---@type string | string[] | [string, string][]
				-- Width of the minimap window
				minimap_width = 10, ---@type integer
			},
		}
	end,
	config = function()
		-- Keymaps
		local keymap = vim.keymap

		keymap.set("n", "<C-m>", "<cmd>Neominimap toggle<cr>", { desc = "Toggle minimap" })
	end,
}
