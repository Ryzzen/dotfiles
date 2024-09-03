local autocmd = vim.api.nvim_create_autocmd

-- C Header
autocmd("BufNewFile", {
	pattern = "*.h",
	command = "r ~/.config/nvim/templates/c_header.h",
})
autocmd("BufNewFile", {
	pattern = "*.h",
	command = "exe '1,' . 15 . 'g/NAME/s//' . toupper(expand('%:t:r')) | 1d | 8",
})

-- C++ Header
autocmd("BufNewFile", {
	pattern = "*.hpp",
	command = "r ~/.config/nvim/templates/cpp_header.hpp",
})
autocmd("BufNewFile", {
	pattern = "*.hpp",
	command = "exe '1,' . 7 . 'g/NAME/s//' . toupper(expand('%:t:r')) | 1d | 4",
})

-- Python pwn header
autocmd("BufNewFile", {
	pattern = "*.pwn.py",
	command = "r ~/.config/nvim/templates/pwn_template.py",
})
autocmd("BufNewFile", {
	pattern = "*.pwn.py",
	command = "exe '1,' . 18 . 'g/NAME/s//' . expand('%:t:r:r') | 1d | 35",
})
