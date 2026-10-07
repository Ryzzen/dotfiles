return {
	"mfussenegger/nvim-lint",
	event = { "BufReadPre", "BufNewFile" },
	config = function()
		local lint = require("lint")

		lint.linters_by_ft = {
			javascript = { "eslint_d" },
			typescript = { "eslint_d" },
			javascriptreact = { "eslint_d" },
			typescriptreact = { "eslint_d" },
			svelte = { "eslint_d" },
			-- python = { "pylint" },
			-- cpp = { "cpplint" },
		}

		-- Rules tuned to coexist with prettier; see default.markdownlint.yaml. Binary
		-- comes from nix (baseline.nix extraPackages), not Mason.
		-- Guarded: nvim-lint errors on every BufEnter if the binary is missing.
		if vim.fn.executable("markdownlint-cli2") == 1 then
			lint.linters_by_ft.markdown = { "markdownlint-cli2" }
			lint.linters["markdownlint-cli2"].args = {
				"--config",
				vim.fn.stdpath("config") .. "/default.markdownlint.yaml",
			}
		end

		local lint_augroup = vim.api.nvim_create_augroup("lint", { clear = true })

		vim.api.nvim_create_autocmd({ "BufEnter", "BufWritePost", "InsertLeave" }, {
			group = lint_augroup,
			callback = function()
				lint.try_lint()
			end,
		})

		vim.keymap.set("n", "<leader>l", function()
			lint.try_lint()
		end, { desc = "Trigger linting for current file" })
	end,
}
