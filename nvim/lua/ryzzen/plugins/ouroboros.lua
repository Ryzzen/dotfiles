return {
	"jakemason/ouroboros",
	config = function()
		-- Keymaps
		--
		-- pattern MUST be a list, not "c, cpp". nvim_create_autocmd does split a
		-- string on commas, but it does not trim: "c, cpp" became the two patterns
		-- `c` and ` cpp` (leading space), and ` cpp` matches no filetype that
		-- exists. Only `c` ever armed the mapping.
		--
		-- That mattered more than it looks: neovim sends *.h to filetype `cpp`, not
		-- `c` (see vim/filetype/detect.lua header(), which only returns `c` when
		-- vim.g.c_syntax_for_h is set). So headers -- the whole point of a
		-- header/source switcher -- fell in the broken arm, as did every .cpp/.hpp.
		-- Opening nvim on a header left <C-s> unmapped entirely.
		--
		-- The mapping is also buffer-local now. The old bare `nnoremap` was global,
		-- so the first C file opened leaked <C-s> -> :Ouroboros into *every* buffer
		-- for the rest of the session, which is what made the breakage look
		-- intermittent: it depended on whether a .c had been opened first.
		vim.api.nvim_create_autocmd("FileType", {
			pattern = { "c", "cpp" },
			callback = function(args)
				vim.keymap.set("n", "<C-s>", "<cmd>Ouroboros<CR>", {
					buffer = args.buf,
					silent = true,
					desc = "Ouroboros: switch between header and source",
				})
			end,
		})
	end,
}
