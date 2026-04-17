return {
	"neovim/nvim-lspconfig",
	event = { "BufReadPre", "BufNewFile" },
	dependencies = {
		"hrsh7th/cmp-nvim-lsp",
		{ "antosha417/nvim-lsp-file-operations", config = true },
		{ "folke/neodev.nvim", opts = {} },
	},
	config = function()
		local cmp_nvim_lsp = require("cmp_nvim_lsp")
		local devcontainers = require("devcontainers")

		-- GLOBAL HELPER
		local function with_devcontainer(config)
			if config.cmd then
				config.cmd = devcontainers.lsp_cmd(config.cmd)
			end
			return config
		end

		local keymap = vim.keymap

		vim.api.nvim_create_autocmd("LspAttach", {
			group = vim.api.nvim_create_augroup("UserLspConfig", {}),
			callback = function(ev)
				local opts = { buffer = ev.buf, silent = true }

				opts.desc = "Go to declaration"
				keymap.set("n", "gD", vim.lsp.buf.declaration, opts)

				opts.desc = "See available code actions"
				keymap.set({ "n", "v" }, "<leader>ca", vim.lsp.buf.code_action, opts)

				opts.desc = "Smart rename"
				keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts)

				opts.desc = "Show line diagnostics"
				keymap.set("n", "<leader>d", vim.diagnostic.open_float, opts)

				opts.desc = "Show documentation"
				keymap.set("n", "K", vim.lsp.buf.hover, opts)

				opts.desc = "Restart LSP"
				keymap.set("n", "<leader>rs", ":LspRestart<CR>", opts)
			end,
		})

		local capabilities = cmp_nvim_lsp.default_capabilities()
		capabilities.textDocument.foldingRange = {
			dynamicRegistration = false,
			lineFoldingOnly = true,
		}

		local signs = { Error = " ", Warn = " ", Hint = "󰠠 ", Info = " " }
		for type, icon in pairs(signs) do
			local hl = "DiagnosticSign" .. type
			vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = "" })
		end

		-- SVELTE (no cmd)
		vim.lsp.config["svelte"] = {
			capabilities = capabilities,
			on_attach = function(client, bufnr)
				vim.api.nvim_create_autocmd("BufWritePost", {
					pattern = { "*.js", "*.ts" },
					callback = function(ctx)
						client.notify("$/onDidChangeTsOrJsFile", { uri = ctx.match })
					end,
				})
			end,
		}
		vim.lsp.enable("svelte")

		-- CLANGD (wrapped)
		vim.lsp.config["clangd"] = with_devcontainer({
			capabilities = capabilities,
			cmd = {
				"clangd",
				"--all-scopes-completion",
				"--pretty",
				"--background-index",
				"--clang-tidy",
				"--compile_args_from=filesystem",
				"--completion-parse=always",
				"--completion-style=bundled",
				"--cross-file-rename",
				"--debug-origin",
				"--enable-config",
				"--fallback-style=Qt",
				"--folding-ranges",
				"--function-arg-placeholders",
				"--header-insertion=iwyu",
				"--pch-storage=memory",
				"--suggest-missing-includes",
				"-j=4",
				"--log=error",
				"--query-driver=**",
			},
			filetypes = { "c", "cc", "cpp", "c++", "objc", "objcpp" },
			root_markers = {
				".clangd",
				".clang-tidy",
				".clang-format",
				"compile_commands.json",
				"compile_flags.txt",
				"build.sh",
				"configure.ac",
				"run",
				"compile",
				".git",
			},
			single_file_support = true,
		})
		vim.lsp.enable("clangd")

		-- GRAPHQL (no cmd)
		vim.lsp.config["graphql"] = {
			capabilities = capabilities,
			filetypes = { "graphql", "gql", "svelte", "typescriptreact", "javascriptreact" },
		}
		vim.lsp.enable("graphql")

		-- EMMET (no cmd)
		vim.lsp.config["emmet_ls"] = {
			capabilities = capabilities,
			filetypes = {
				"html",
				"typescriptreact",
				"javascriptreact",
				"css",
				"sass",
				"scss",
				"less",
				"svelte",
			},
		}
		vim.lsp.enable("emmet_ls")

		-- LUA LS (wrapped)
		vim.lsp.config["luals"] = with_devcontainer({
			cmd = { "lua-language-server" },
			filetypes = { "lua" },
			capabilities = capabilities,
			root_markers = { { ".luarc.json", ".luarc.jsonc" }, ".git" },
			settings = {
				Lua = {
					diagnostics = { globals = { "vim" } },
					completion = { callSnippet = "Replace" },
				},
			},
		})
		vim.lsp.enable("luals")

		-- PYRIGHT (wrapped)
		vim.lsp.config["pyright"] = with_devcontainer({
			capabilities = capabilities,
			cmd = { "pyright-langserver", "--stdio" },
			filetypes = { "python" },
			settings = {
				python = {
					analysis = {
						autoSearchPaths = true,
						diagnosticMode = "openFilesOnly",
						useLibraryCodeForTypes = true,
					},
				},
			},
			single_file_support = true,
		})
		vim.lsp.enable("pyright")

		-- RNIX (no cmd)
		vim.lsp.config["rnix"] = {
			capabilities = capabilities,
			filetypes = { "nix" },
		}
		vim.lsp.enable("rnix")

		-- DOCKER COMPOSE (wrapped)
		vim.lsp.config["docker_compose_language_service"] = with_devcontainer({
			capabilities = capabilities,
			cmd = { "docker-compose-langserver", "--stdio" },
			filetypes = { "yaml.docker-compose" },
			root_markers = {
				"docker-compose.yaml",
				"docker-compose.yml",
				"compose.yaml",
				"compose.yml",
			},
			single_file_support = true,
		})
		vim.lsp.enable("docker_compose_language_service")

		-- DOCKER LS (wrapped)
		vim.lsp.config["dockerls"] = with_devcontainer({
			capabilities = capabilities,
			cmd = { "docker-langserver", "--stdio" },
			filetypes = { "dockerfile" },
			root_markers = { "Dockerfile" },
			single_file_support = true,
		})
		vim.lsp.enable("dockerls")

		-- JDTLS (leave alone for now)
		vim.lsp.config["jdtls"] = {}
		vim.lsp.enable("jdtls")

		-- PHPACTOR (wrapped)
		vim.lsp.config["phpactor"] = with_devcontainer({
			cmd = { "phpactor", "language-server" },
			filetypes = { "php" },
			root_markers = { ".git", "composer.json", ".phpactor.json", ".phpactor.yml" },
			workspace_required = true,
		})
		vim.lsp.enable("phpactor")
	end,
}
