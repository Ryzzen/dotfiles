-- List editing for markdown: <CR> / o continue the current bullet, numbered
-- item or checkbox (an empty item ends the list), gN renumbers, <C-t>/<C-d>
-- and >>/<< nest/un-nest, <leader>cx toggles a checkbox.
return {
	"bullets-vim/bullets.vim",
	ft = { "markdown", "text", "gitcommit" },
	init = function()
		vim.g.bullets_enabled_file_types = { "markdown", "text", "gitcommit" }
		-- Stock mappings put the checkbox toggle on <leader>x, which Trouble
		-- already uses as a prefix (<leader>xx…); set them by hand instead.
		vim.g.bullets_set_mappings = 0
		vim.g.bullets_custom_mappings = {
			{ "imap", "<cr>", "<Plug>(bullets-newline)" },
			{ "inoremap", "<C-cr>", "<cr>" },
			{ "nmap", "o", "<Plug>(bullets-newline)" },
			{ "vmap", "gN", "<Plug>(bullets-renumber)" },
			{ "nmap", "gN", "<Plug>(bullets-renumber)" },
			{ "nmap", "<leader>cx", "<Plug>(bullets-toggle-checkbox)" },
			{ "imap", "<C-t>", "<Plug>(bullets-demote)" },
			{ "nmap", ">>", "<Plug>(bullets-demote)" },
			{ "vmap", ">", "<Plug>(bullets-demote)" },
			{ "imap", "<C-d>", "<Plug>(bullets-promote)" },
			{ "nmap", "<<", "<Plug>(bullets-promote)" },
			{ "vmap", "<", "<Plug>(bullets-promote)" },
		}
		-- Renumber the rest of an ordered list after inserting/removing an item.
		vim.g.bullets_renumber_on_change = 1
		-- Toggle between [ ] and [x] only (default cycles . o O X partial
		-- states and writes an uppercase X).
		vim.g.bullets_checkbox_markers = " x"
	end,
}
