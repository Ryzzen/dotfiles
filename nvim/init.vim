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
Plug 'scottmckendry/cyberdream.nvim'

Plug 'https://github.com/tpope/vim-commentary'
Plug 'https://github.com/preservim/nerdtree'
Plug 'http://github.com/tpope/vim-surround'
Plug 'https://github.com/neoclide/coc.nvim', {'branch': 'release'}
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

Plug 'jakemason/ouroboros'

call plug#end()

set encoding=UTF-8

" set termguicolors
" colorscheme gruvbox

lua << EOF
require("cyberdream").setup({
    -- Enable transparent background
    transparent = true, -- Default: false

    -- Enable italics comments
    italic_comments = true, -- Default: false

    -- Replace all fillchars with ' ' for the ultimate clean look
    hide_fillchars = true, -- Default: false
})
EOF
colorscheme cyberdream
highlight LineNr guibg='#928374'

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
nnoremap <C-t> :tabnew<CR>

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

" Buffer navigation
nnoremap <S-PageUp> :bn<CR>
nnoremap <S-PageDown> :bp<CR>
nnoremap <S-q> :bd<CR>

" Git
nnoremap <leader>gg :FloatermNew lazygit<CR>
nnoremap <leader>gb :Git blame<CR>

" NerdTree
let NERDTreeShowHidden=1
nnoremap <leader>n :NERDTreeFocus<CR>
nnoremap <C-n> :NERDTreeToggle<CR>
noremap <C-f> :NERDTreeFind<CR>

"Minimap
nnoremap <C-m> :MinimapToggle<CR>

" Telescope
nnoremap <leader>ff :Telescope find_files<CR>
nnoremap <leader>fg :Telescope live_grep<CR>
nnoremap <leader>fb :Telescope buffers<CR>
nnoremap <leader>fh :Telescope help_tags<CR>

"Vista
nnoremap <C-p> :MinimapClose<CR>:Vista!! <CR>

nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)
"vscode like tab completion
inoremap <expr> <TAB> pumvisible() ? "\<C-y>" : "\<TAB>"
let g:coc_snippet_next = '<TAB>'
let g:coc_snippet_prev = '<S-TAB>'

"mdMarkdown
nnoremap <leader>md :FloatermNew (glow %:p; cat) <CR>

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


augroup mygroup
  autocmd!
  " Setup formatexpr specified filetype(s).
  autocmd FileType typescript,json setl formatexpr=CocAction('formatSelected')
  " Update signature help on jump placeholder
  autocmd User CocJumpPlaceholder call CocActionAsync('showSignatureHelp')
augroup end
" Use K to show documentation in preview window
nnoremap <silent> K :call <SID>show_documentation()<CR>

function! s:show_documentation()
    if (index(['vim','help'], &filetype) >= 0)
        execute 'h '.expand('<cword>')
    else
        call CocAction('doHover')
    endif
endfunction


let g:coc_global_extensions = ['coc-pyright']

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
require("bufferline").setup{}
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


