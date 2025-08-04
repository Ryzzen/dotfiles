return {
	"nvim-treesitter/nvim-treesitter",
	branch = "master",
	lazy = "false",
	build = ":TSUpdate",
	event = { "BufReadPre", "BufNewFile" },
	dependencies = {
		"nvim-treesitter/nvim-treesitter-textobjects",
	},
	config = function()
		require("nvim-treesitter.configs").setup({
			ensure_installed = {
				"c",
				"cpp",
				"lua",
				"vim",
				"vimdoc",
				"query",
				"nix",
				"python",
				"bash",
				"ruby",
				"rust",
				"objdump",
				"mermaid",
				"llvm",
				"kconfig",
				"json",
				"java",
			},
			auto_install = true,

			highlight = {
				enable = true,
			},
			indent = {
				enable = true,
			},
			textobjects = {
				select = {
					enable = true,
					lookahead = true,
					keymaps = {
						["af"] = "@function.outer",
						["if"] = "@function.inner",
						["ac"] = "@class.outer",
						["ic"] = { query = "@class.inner", desc = "Select inner part of a class region" },
						["as"] = { query = "@local.scope", query_group = "locals", desc = "Select language scope" },
					},
				},
				move = {
					enable = true,
					set_jumps = true, -- whether to set jumps in the jumplist
					goto_next_start = {
						["]m"] = "@function.outer",
						["]]"] = { query = "@class.outer", desc = "Next class start" },
						--
						-- You can use regex matching (i.e. lua pattern) and/or pass a list in a "query" key to group multiple queries.
						["]o"] = "@loop.*",
						-- ["]o"] = { query = { "@loop.inner", "@loop.outer" } }
						--
						-- You can pass a query group to use query from `queries/<lang>/<query_group>.scm file in your runtime path.
						-- Below example nvim-treesitter's `locals.scm` and `folds.scm`. They also provide highlights.scm and indent.scm.
						["]s"] = { query = "@local.scope", query_group = "locals", desc = "Next scope" },
						["]z"] = { query = "@fold", query_group = "folds", desc = "Next fold" },
					},
					goto_next_end = {
						["]M"] = "@function.outer",
						["]["] = "@class.outer",
					},
					goto_previous_start = {
						["[m"] = "@function.outer",
						["[["] = "@class.outer",
					},
					goto_previous_end = {
						["[M"] = "@function.outer",
						["[]"] = "@class.outer",
					},
					-- Below will go to either the start or the end, whichever is closer.
					-- Use if you want more granular movements
					-- Make it even more gradual by adding multiple queries and regex.
					goto_next = {
						["]d"] = "@conditional.outer",
					},
					goto_previous = {
						["[d"] = "@conditional.outer",
					},
				},
			},
		})
	end,
}
