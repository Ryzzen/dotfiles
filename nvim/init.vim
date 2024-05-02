set number
set relativenumber
set autoindent
set tabstop=4
set shiftwidth=4
set mouse=a
set smarttab
set cursorline
filetype on


let data_dir = has('nvim') ? stdpath('data') . '/site' : '~/.vim'
if empty(glob(data_dir . '/autoload/plug.vim'))
  silent execute '!curl -fLo '.data_dir.'/autoload/plug.vim --create-dirs  https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'
  autocmd VimEnter * PlugInstall --sync | source $MYVIMRC
endif

call plug#begin()

" Visual improvement
Plug 'nvim-lualine/lualine.nvim'
Plug 'https://github.com/ryanoasis/vim-devicons'
Plug 'https://github.com/morhetz/gruvbox'
Plug 'akinsho/bufferline.nvim', { 'tag': '*' }
Plug 'voldikss/vim-floaterm'
Plug 'lukas-reineke/indent-blankline.nvim'

Plug 'https://github.com/tpope/vim-commentary'
Plug 'https://github.com/preservim/nerdtree'
Plug 'http://github.com/tpope/vim-surround'
Plug 'https://github.com/mfussenegger/nvim-dap'
Plug 'https://github.com/rcarriga/nvim-dap-ui'
Plug 'https://github.com/liuchengxu/vista.vim'
Plug 'https://github.com/junegunn/fzf', { 'do': { -> fzf#install() } }
Plug 'nvim-lua/plenary.nvim'
Plug 'nvim-telescope/telescope.nvim'
Plug 'nvim-treesitter/nvim-treesitter'
Plug 'https://github.com/airblade/vim-gitgutter'
Plug 'https://github.com/tpope/vim-fugitive'
Plug 'https://github.com/tpope/vim-rhubarb'
Plug 'rmagatti/auto-session'

Plug 'kdheepak/lazygit.nvim'

Plug 'folke/trouble.nvim'

" Auto completion
"Plug 'https://github.com/neoclide/coc.nvim', {'branch': 'release'}
Plug 'williamboman/mason.nvim'
Plug 'williamboman/mason-lspconfig.nvim'
Plug 'neovim/nvim-lspconfig'
Plug 'hrsh7th/cmp-nvim-lsp'
Plug 'hrsh7th/cmp-buffer'
Plug 'hrsh7th/cmp-path'
Plug 'hrsh7th/cmp-cmdline'
Plug 'hrsh7th/nvim-cmp'
Plug 'L3MON4D3/LuaSnip'
Plug 'saadparwaiz1/cmp_luasnip'
Plug 'onsails/lspkind.nvim'

" Markdown
Plug 'iamcco/markdown-preview.nvim', { 'do': 'cd app && npx --yes yarn install' }
Plug 'godlygeek/tabular'
Plug 'elzr/vim-json'
Plug 'plasticboy/vim-markdown'
Plug 'vim-pandoc/vim-pandoc-syntax'

Plug 'wfxr/minimap.vim', {'do': ':!cargo install --locked code-minimap'}
Plug 'nvim-tree/nvim-web-devicons' " Recommended (for coloured icons)
Plug 'https://github.com/tiagovla/scope.nvim'

" Music control
Plug 'rcarriga/nvim-notify'
Plug 'AntonVanAssche/music-controls.nvim'
Plug 'maxi0604/music.nvim'

Plug 'junegunn/vim-easy-align'
Plug 'windwp/nvim-autopairs'

Plug 'jakemason/ouroboros'

call plug#end()

set encoding=UTF-8

set termguicolors
set background=dark
colorscheme gruvbox
hi Normal guibg=NONE ctermbg=NONE
" highlight LineNr guibg='dark'

" Music player
nnoremap <leader>mm :MusicPlay<CR>
nnoremap <leader>mp :MusicPause<CR>
nnoremap <leader>m<PageUp> :MusicNext<CR>
nnoremap <leader>m<PageDown> :MusicPrev<CR>
nnoremap <leader>mc :MusicCurrent<CR>
nnoremap <leader>ms :MusicShuffle<CR>
nnoremap <leader>ml :MusicLoop<CR>


" Stuff
xnoremap <silent> <C-c> :w !wl-copy<CR><CR>

" Insert Breakpoint fpr C/C++
nnoremap <leader>bp o__BKPT();<CR><Esc>

" Automatic header files
autocmd BufNewFile *.h r ~/.config/nvim/templates/c_header.h
autocmd BufNewFile *.h exe "1," . 15 . "g/NAME/s//" . toupper(expand("%:t:r")) | 1d | 8

autocmd BufNewFile *.hpp r ~/.config/nvim/templates/cpp_header.hpp
autocmd BufNewFile *.hpp exe "1," . 7 . "g/NAME/s//" . toupper(expand("%:t:r")) | 1d | 4

" Switch between header and source files
autocmd Filetype c,cpp nnoremap <C-s> :Ouroboros<CR>

" Easy align
" " Start interactive EasyAlign in visual mode (e.g. vipga)
xmap ga <Plug>(EasyAlign)
" Start interactive EasyAlign for a motion/text object (e.g. gaip)
nmap ga <Plug>(EasyAlign)

" Tabs/Buffer navigation
nnoremap <silent> <S-t> :tabnew<CR>
nnoremap <silent> <S-PageUp> :tabnext<CR>
nnoremap <silent> <S-PageDown> :tabprevious<CR>
nnoremap <silent> <S-q> :tabclose<CR>
nnoremap <silent> <space>s :vsplit<CR>
nnoremap <silent> <space>v :split<CR>
nnoremap <silent> <space>q :close<CR>
nnoremap <silent> <space><right> <C-W><C-l>
nnoremap <silent> <space><left> <C-W><C-h>
nnoremap <silent> <space><up> <C-W><C-k>
nnoremap <silent> <space><down> <C-W><C-j>

" Git
nnoremap <silent> <leader>gg :LazyGit<CR>
nnoremap <silent> <leader>gb :Git blame<CR>

" NerdTree
let NERDTreeShowHidden=1
nnoremap <silent> <leader>n :NERDTreeFocus<CR>
nnoremap <silent> <C-n> :NERDTreeToggle<CR>
noremap <silent> <C-f> :NERDTreeFind<CR>

"Minimap
nnoremap <silent> <C-m> :MinimapToggle<CR>

" Telescope
nnoremap <silent> <leader>ff :Telescope find_files<CR>
nnoremap <silent> <leader>fg :Telescope live_grep<CR>
nnoremap <silent> <leader>fb :Telescope buffers<CR>
nnoremap <silent> <leader>fh :Telescope help_tags<CR>

"Vista
nnoremap <silent> <C-p> :MinimapClose<CR>:Vista!! <CR>

nmap <silent> gr <cmd>Telescope lsp_references<CR> 
nmap <silent> gD <cmd>lua vim.lsp.buf.declaration()<CR>
nmap <silent> gd <cmd>Telescope lsp_definitions<CR>
nmap <silent> gi <cmd>Telescope lsp_implementations<CR>
nmap <silent> gt <cmd>Telescope lsp_type_definitions<CR>
nmap <silent> <leader>rn <cmd>lua vim.lsp.buf.rename()<CR>
nmap <silent> K
" nmap <silent> gd <Plug>(coc-definition)
" nmap <silent> gy <Plug>(coc-type-definition)
" nmap <silent> gi <Plug>(coc-implementation)
" nmap <silent> gr <Plug>(coc-references)

" Trouble
nnoremap <leader>xx <cmd>TroubleToggle<cr>
nnoremap <leader>xw <cmd>TroubleToggle workspace_diagnostics<cr>
nnoremap <leader>xd <cmd>TroubleToggle document_diagnostics<cr>
nnoremap <leader>xq <cmd>TroubleToggle quickfix<cr>
nnoremap <leader>xl <cmd>TroubleToggle loclist<cr>
nnoremap gR <cmd>TroubleToggle lsp_references<cr>

"vscode like tab completion
" inoremap <expr> <TAB> pumvisible() ? "\<C-y>" : "\<TAB>"
" let g:coc_snippet_next = '<TAB>'
" let g:coc_snippet_prev = '<S-TAB>'

"mdMarkdown
nnoremap <leader>md :FloatermNew (glow %:p; cat) <CR>

nnoremap <leader>wr :SessionRestore<CR>
nnoremap <leader>ws :SessionSave<CR>

function OpenMarkdownPreview (url)
    execute "silent ! firefox --new-window " . a:url
endfunction
let g:mkdp_browserfunc = 'OpenMarkdownPreview'
let g:mkdp_auto_start = 0
autocmd FileType markdown nnoremap ms <Plug>MarkdownPreview
autocmd FileType markdown nnoremap mst <Plug>MarkdownPreviewStop
autocmd FileType markdown nnoremap mp <Plug>MarkdownPreviewToggle
" disable header folding
let g:vim_markdown_folding_disabled = 1

" do not use conceal feature, the implementation is not so good
let g:vim_markdown_conceal = 0

" disable math tex conceal feature
let g:tex_conceal = ""
let g:vim_markdown_math = 1

" support front matter of various format
let g:vim_markdown_frontmatter = 1  " for YAML format
let g:vim_markdown_toml_frontmatter = 1  " for TOML format
let g:vim_markdown_json_frontmatter = 1  " for JSON format
augroup pandoc_syntax
    au! BufNewFile,BufFilePre,BufRead *.md set filetype=markdown.pandoc
augroup END


" augroup mygroup
"   autocmd!
"   " Setup formatexpr specified filetype(s).
"   autocmd FileType typescript,json setl formatexpr=CocAction('formatSelected')
"   " Update signature help on jump placeholder
"   autocmd User CocJumpPlaceholder call CocActionAsync('showSignatureHelp')
" augroup end
" " Use K to show documentation in preview window
" nnoremap <silent> K :call <SID>show_documentation()<CR>

" function! s:show_documentation()
"     if (index(['vim','help'], &filetype) >= 0)
"         execute 'h '.expand('<cword>')
"     else
"         call CocAction('doHover')
"     endif
" endfunction

" let g:coc_global_extensions = ['coc-pyright']

lua << EOF
require 'nvim-treesitter.configs'.setup {
	ensure_installed = { "c", "cpp", "lua", "vim", "vimdoc", "query" },

	highlight = {
		enable = true,
		disable = {}
	},
	indent = {
		enable = true,
		disable = {}
	}
}
EOF

lua << EOF
local telescope = require('telescope')
	telescope.setup {
		pickers = {
			find_files = {

				hidden = true

			}
		}
	}
EOF

" Bufferline init
set termguicolors
lua << EOF
require("bufferline").setup{
	options = {
			mode = "tabs",
			separator_style = "thin",
		},
}
EOF

" Lualine
lua << END
local gruvbox = require'lualine.themes.gruvbox'

require('lualine').setup {
	options = { theme  = gruvbox },
	sections = {
		lualine_a = {'mode'},
		lualine_b = {'filename', 'filesize'},
		lualine_c = {'branch', 'diff'},
		lualine_x = {'diagnostics', "require('music').info()"},
		lualine_y = {'encoding', 'fileformat', 'filetype'},
		lualine_z = {'progress'},
	},
	inactive_sections = {
		lualine_a = {},
		lualine_b = {},
		lualine_c = {'filename'},
		lualine_x = {'diagnostics', 'progress'},
		lualine_y = {},
		lualine_z = {}
  },
  ...
}
END

" Scope
lua << END
require("scope").setup({})
END

" Music
lua << END
require("music").setup({})
END

lua << END
_G.music_controls_default_player = 'spotify'
END

lua << EOF
require('auto-session').setup {
	auto_session_supress_dirs = {"~/", "~/Desktop", "~/Documents", "~/Downloads", "~/Pictures", "~/Videos"},
}
EOF

lua << EOF
require("ibl").setup()
EOF

lua << EOF
local mason = require("mason")
local mason_lspconfig = require("mason-lspconfig")

mason.setup({
	ui = {
		icons = {
			package_installed = "✓",
			package_pending = "➜",
			package_uninstalled = "✗"
		}
	}	
})
mason_lspconfig.setup({
	ensure_installed = {
		"lua_ls",
		"pyright",
		"clangd",
		"rnix",
	}
})
EOF

lua <<EOF
-- Set up nvim-cmp.
local cmp = require('cmp')
local lspkind = require('lspkind')

cmp.setup({
	snippet = {
		-- REQUIRED - you must specify a snippet engine
		expand = function(args)
		require('luasnip').lsp_expand(args.body) -- For `luasnip` users.
		end,
	},
	window = {
		-- completion = cmp.config.window.bordered(),
		-- documentation = cmp.config.window.bordered(),
	},
	mapping = cmp.mapping.preset.insert({
		['<TAB>'] = cmp.mapping.select_next_item(),
		['<S-TAB>'] = cmp.mapping.select_prev_item(),
		['<C-b>'] = cmp.mapping.scroll_docs(-4),
		['<C-f>'] = cmp.mapping.scroll_docs(4),
		['<C-Space>'] = cmp.mapping.complete(),
		['<C-e>'] = cmp.mapping.abort(),
		['<CR>'] = cmp.mapping.confirm({ select = true }), -- Accept currently selected item. Set `select` to `false` to only confirm explicitly selected items.
	}),
	sources = cmp.config.sources({
		{ name = 'nvim_lsp' },
		{ name = 'luasnip' }, -- For luasnip users.
	}, {
		{ name = 'buffer' },
		{ name = 'path' },
	}),
	formatting = {
		format = lspkind.cmp_format({
			maxwidth = 50,
			ellipsis_char = '...',
			show_labelDetails = true, -- show labelDetails in menu. Disabled by default
		})
	}
})

-- Set up lspconfig.
local lspconfig = require("lspconfig")
local mason_lspconfig = require("mason-lspconfig")
local cmp_nvim_lsp = require("cmp_nvim_lsp")

local capabilities = cmp_nvim_lsp.default_capabilities()

-- Change the Diagnostic symbols in the sign column (gutter)
-- (not in youtube nvim video)
local signs = { Error = " ", Warn = " ", Hint = "󰠠 ", Info = " " }
for type, icon in pairs(signs) do
	local hl = "DiagnosticSign" .. type
	vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = "" })
end

mason_lspconfig.setup_handlers({
	-- default handler for installed servers
	function(server_name)
	  lspconfig[server_name].setup({
	    capabilities = capabilities,
	  })
	end,
	["lua_ls"] = function()
	  lspconfig["lua_ls"].setup({
	    capabilities = capabilities,
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
	  })
	end,
	["clangd"] = function()
	  local root_files = {
	    '.clangd',
	    '.clang-tidy',
	    '.clang-format',
	    'compile_commands.json',
	    'compile_flags.txt',
	    'build.sh', -- buildProject
	    'configure.ac', -- AutoTools
	    'run',
	    'compile',
		'.git',
      }
	  lspconfig["clangd"].setup({
	    capabilities = capabilities,
	    cmd = { "clangd",
	      "--all-scopes-completion",
	      "--background-index",
	      "--clang-tidy",
	      -- "--compile_args_from=filesystem", -- lsp-> does not come from compie_commands.json
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
	      "-j=4",		-- number of workers
	      "--log=error",
	    },
	    filetypes = { "c", "cc", "cpp", "c++", "objc", "objcpp" },
	    root_dir = util.root_pattern(unpack(root_files)),
	    single_file_support = true,
	  })
	end,
})
EOF

lua << EOF
require("nvim-autopairs").setup {}

local cmp_autopairs = require('nvim-autopairs.completion.cmp')
local cmp = require('cmp')
cmp.event:on(
  'confirm_done',
  cmp_autopairs.on_confirm_done()
)
EOF

