return {
	"L3MON4D3/LuaSnip",
	version = "v2.*", -- Replace <CurrentMajor> by the latest released major (first number of latest release)
	build = "make install_jsregexp",

	dependencies = {
		{
			"rafamadriz/friendly-snippets",
			config = function()
				require("luasnip.loaders.from_vscode").lazy_load()
				require("luasnip.loaders.from_lua").load()

				local ls = require("luasnip")
				-- Register once for both C and C++
				ls.filetype_set("cpp", { "c" })

				-- Keymaps
				vim.keymap.set({ "i", "s" }, "<Tab>", function()
					if ls.expand_or_jumpable() then
						ls.expand_or_jump()
					else
						vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<Tab>", true, false, true), "n", false)
					end
				end, { silent = true })

				-- Jump backward
				vim.keymap.set({ "i", "s" }, "<S-Tab>", function()
					if ls.jumpable(-1) then
						ls.jump(-1)
					else
						vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<S-Tab>", true, false, true), "n", false)
					end
				end, { silent = true })

				-- Cycle choices with Ctrl-l (or any key you like)
				vim.keymap.set({ "i", "s" }, "<C-l>", function()
					if ls.choice_active() then
						ls.change_choice(1)
					else
						vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<C-l>", true, false, true), "n", false)
					end
				end, { silent = true })
			end,
		},
	},
}
