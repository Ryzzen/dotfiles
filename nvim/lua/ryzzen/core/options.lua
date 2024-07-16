local opt = vim.opt

vim.cmd("filetype on")

opt.relativenumber = true
opt.number = true

-- -- Folds
-- function MyFoldText()
-- 	local foldstart = vim.v.foldstart
-- 	local foldend = vim.v.foldend
-- 	local nl = foldend - foldstart + 1

-- 	local title = vim.fn.substitute(vim.fn.getline(foldstart), "^ *", "", 1)
-- 	local linetext = vim.fn.substitute(vim.fn.getline(foldstart + 1), "^ *", "", 1)

-- 	local txt = "+ " .. title .. "... " .. linetext .. " [" .. nl .. "]"
-- 	return txt
-- end

-- opt.foldmethod = "expr"
-- opt.foldexpr = "v:lua.vim.treesitter.foldexpr()"
-- opt.foldtext = "v:lua.MyFoldText()"
-- opt.fillchars:append("fold: ")
-- opt.foldlevelstart = 99

-- tabs & indentation
opt.tabstop = 2 -- 2 spaces for tabs (prettier default)
opt.shiftwidth = 2 -- 2 spaces for indent width
opt.expandtab = true -- expand tab to spaces
opt.autoindent = true -- copy indent from current line when starting new one

opt.wrap = false

-- search settings
opt.ignorecase = true -- ignore case when searching
opt.smartcase = true -- if you include mixed case in your search, assumes you want case-sensitive

opt.cursorline = true

-- turn on termguicolors for tokyonight colorscheme to work
-- (have to use iterm2 or any other true color terminal)
opt.termguicolors = true
opt.background = "dark" -- colorschemes that can be light or dark will be made dark
opt.signcolumn = "yes" -- show sign column so that text doesn't shift

-- backspace
opt.backspace = "indent,eol,start" -- allow backspace on indent, end of line or insert mode start position

-- split windows
opt.splitright = true -- split vertical window to the right
opt.splitbelow = true -- split horizontal window to the bottom

-- turn off swapfile
opt.swapfile = false
