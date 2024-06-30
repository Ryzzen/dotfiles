return {
	"jakemason/ouroboros",
	config = function()
		-- Keymaps
		local autocmd = vim.api.nvim_create_autocmd

		autocmd("FileType", {
			pattern = "c, cpp",
			command = "nnoremap <C-s> :Ouroboros<CR>",
		})
	end,
}
