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

		local keymap = vim.keymap

		vim.api.nvim_create_autocmd("LspAttach", {
			group = vim.api.nvim_create_augroup("UserLspConfig", {}),
			callback = function(ev)
				-- Buffer local mappings.
				-- See `:help vim.lsp.*` for documentation on any of the below functions
				local opts = { buffer = ev.buf, silent = true }

				-- set keybinds
				opts.desc = "Go to declaration"
				keymap.set("n", "gD", vim.lsp.buf.declaration, opts) -- go to declaration

				opts.desc = "See available code actions"
				keymap.set({ "n", "v" }, "<leader>ca", vim.lsp.buf.code_action, opts) -- see available code actions, in visual mode will apply to selection

				opts.desc = "Smart rename"
				keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts) -- smart rename

				opts.desc = "Show line diagnostics"
				keymap.set("n", "<leader>d", vim.diagnostic.open_float, opts) -- show diagnostics for line

				opts.desc = "Show documentation for what is under cursor"
				keymap.set("n", "K", vim.lsp.buf.hover, opts) -- show documentation for what is under cursor

				opts.desc = "Restart LSP"
				keymap.set("n", "<leader>rs", ":LspRestart<CR>", opts) -- mapping to restart lsp if necessary
			end,
		})

		-- used to enable autocompletion (assign to every lsp server config)
		local capabilities = cmp_nvim_lsp.default_capabilities()
		-- Setup required for ufo
		capabilities.textDocument.foldingRange = {
			dynamicRegistration = false,
			lineFoldingOnly = true,
		}

		-- Change the Diagnostic symbols in the sign column (gutter)
		-- (not in youtube nvim video)
		local signs = { Error = " ", Warn = " ", Hint = "󰠠 ", Info = " " }
		for type, icon in pairs(signs) do
			local hl = "DiagnosticSign" .. type
			vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = "" })
		end

		vim.lsp.config["svelte"] = {
			capabilities = capabilities,
			on_attach = function(client, bufnr)
				vim.api.nvim_create_autocmd("BufWritePost", {
					pattern = { "*.js", "*.ts" },
					callback = function(ctx)
						-- Here use ctx.match instead of ctx.file
						client.notify("$/onDidChangeTsOrJsFile", { uri = ctx.match })
					end,
				})
			end,
		}
		vim.lsp.enable("svelte")

		vim.lsp.config["clangd"] = {
			capabilities = capabilities,
			cmd = {
				"clangd",
				"--all-scopes-completion",
				"--pretty",
				"--background-index",
				"--clang-tidy",
				"--compile_args_from=filesystem", -- lsp-> does not come from compie_commands.json
				"--completion-parse=always",
				"--completion-style=bundled",
				"--cross-file-rename",
				"--debug-origin",
				"--enable-config", -- clangd 11+ supports reading from .clangd configuration file
				"--fallback-style=Qt",
				"--folding-ranges",
				"--function-arg-placeholders",
				"--header-insertion=iwyu",
				"--pch-storage=memory", -- could also be disk
				"--suggest-missing-includes",
				"-j=4", -- number of workers
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
				"build.sh", -- buildProject
				"configure.ac", -- AutoTools
				"run",
				"compile",
				".git",
			},
			single_file_support = true,
		}
		vim.lsp.enable("clangd")

		vim.lsp.config["graphql"] = {
			capabilities = capabilities,
			filetypes = { "graphql", "gql", "svelte", "typescriptreact", "javascriptreact" },
		}
		vim.lsp.enable("graphql")

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

		vim.lsp.config["lua_ls"] = {
			cmd = { "lua-language-server" },
			filetypes = { "lua" },
			capabilities = capabilities,
			root_markers = { { ".luarc.json", ".luarc.jsonc" }, ".git" },
			settings = {
				Lua = {
					-- make the language server recognize "vim" global
					diagnostics = {
						globals = { "vim" },
					},
					completion = {
						callSnippet = "Replace",
					},
				},
			},
		}
		vim.lsp.enable("luals")

		vim.lsp.config["pyright"] = {
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
		}
		vim.lsp.enable("pyright")

		vim.lsp.config["rnix"] = {
			capabilities = capabilities,
			filetypes = { "nix" },
		}
		vim.lsp.enable("rnix")

		vim.lsp.config["docker_compose_language_service"] = {
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
		}
		vim.lsp.enable("docker_compose_language_service")

		vim.lsp.config["dockerls"] = {
			capabilities = capabilities,
			cmd = { "docker-langserver", "--stdio" },
			filetypes = { "dockerfile" },
			root_markers = { "Dockerfile" },
			single_file_support = true,
		}
		vim.lsp.enable("dockerls")

		vim.lsp.config["jdtls"] = {}
		vim.lsp.enable("jdtls")

		vim.lsp.config["phpactor"] = {
			cmd = { "phpactor", "language-server" },
			filetypes = { "php" },
			root_markers = { ".git", "composer.json", ".phpactor.json", ".phpactor.yml" },
			workspace_required = true,
		}
		vim.lsp.enable("phpactor")
	end,
}
