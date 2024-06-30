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
