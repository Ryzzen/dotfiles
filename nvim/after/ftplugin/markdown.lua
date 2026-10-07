-- Prose settings for markdown buffers. The global options are tuned for code
-- (nowrap etc.); everything here is buffer/window-local so code files are
-- untouched.

local opt = vim.opt_local

-- Soft-wrap long lines at word boundaries, keeping list continuation lines
-- indented under their bullet.
opt.wrap = true
opt.linebreak = true
opt.breakindent = true
opt.breakindentopt = "list:-1"

-- Spelling. Grammar comes from harper_ls (see lsp/lspconfig.lua), which has
-- its own spellchecker disabled so typos aren't reported twice.
-- ]s / [s next/prev typo, z= suggestions, zg add word to the dictionary.
-- Add "fr" here to write in French too (nvim offers to download the file).
opt.spell = true
opt.spelllang = { "en" }

-- render-markdown hides the markup only with conceal on.
opt.conceallevel = 2

local map = function(mode, lhs, rhs, desc)
	vim.keymap.set(mode, lhs, rhs, { buffer = true, silent = true, desc = desc })
end

-- Move by screen line on wrapped text, but keep counts (5j) on real lines so
-- relativenumber jumps still work.
vim.keymap.set({ "n", "x" }, "j", "v:count == 0 ? 'gj' : 'j'", { buffer = true, expr = true })
vim.keymap.set({ "n", "x" }, "k", "v:count == 0 ? 'gk' : 'k'", { buffer = true, expr = true })

-- ]h / [h: next/previous heading. Uses the treesitter tree rather than a
-- regex so a `# comment` inside a fenced code block isn't taken for a heading.
local function jump_heading(forward)
	local ok, parser = pcall(vim.treesitter.get_parser, 0, "markdown")
	if not ok or not parser then
		return
	end
	local cur = vim.api.nvim_win_get_cursor(0)[1] - 1
	local query = vim.treesitter.query.parse("markdown", "[(atx_heading) (setext_heading)] @h")
	local target
	for _, node in query:iter_captures(parser:parse()[1]:root(), 0) do
		local row = node:start()
		if forward and row > cur then
			target = row
			break
		elseif not forward and row < cur then
			target = row
		end
	end
	if target then
		vim.cmd("normal! m'") -- add to the jumplist, so <C-o> returns
		vim.api.nvim_win_set_cursor(0, { target + 1, 0 })
	end
end

map({ "n", "x", "o" }, "]h", function()
	for _ = 1, vim.v.count1 do
		jump_heading(true)
	end
end, "Next heading")
map({ "n", "x", "o" }, "[h", function()
	for _ = 1, vim.v.count1 do
		jump_heading(false)
	end
end, "Previous heading")
