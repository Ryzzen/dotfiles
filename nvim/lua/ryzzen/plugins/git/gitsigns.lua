return {
	"lewis6991/gitsigns.nvim",
	enabled = true,
	config = function()
		require("gitsigns").setup()
		local keymap = vim.keymap

		keymap.set("n", "<leader>gp", "<cmd>Gitsigns preview_hunk<CR>", { desc = "Preview changes" })
		keymap.set("n", "<leader>gd", "<cmd>Gitsigns diffthis<CR>", { desc = "Diff changes" })

		-- Browse every hunk in Telescope. Gitsigns can dump hunks to the quickfix
		-- list, so populate it with open = false (suppressing its own copen) and hand
		-- that list to Telescope's quickfix picker - the same trick the DAP
		-- breakpoint picker uses in plugins/dap.lua, no extra plugin needed.
		--
		-- The callback is load-bearing: setqflist is async (gitsigns wraps it in
		-- async.create, which takes a callback as the argument after its own two), so
		-- opening the picker inline would race the still-empty list. vim.schedule
		-- keeps the Telescope call off a fast-event context.
		--
		-- "all" means every modified file in the repo, not just attached buffers -
		-- that is the point of the view, so hunks in files you have not opened count.
		-- Each row is coloured by hunk kind with the *same* groups the sign column
		-- uses, so the picker reads like the gutter: GitSignsAdd / GitSignsChange /
		-- GitSignsDelete. They follow the colourscheme, so this needs no palette of
		-- its own and stays correct when the theme changes.
		local hunk_hl = { Added = "GitSignsAdd", Changed = "GitSignsChange", Removed = "GitSignsDelete" }

		-- gitsigns' header is raw diff notation ("-92,0 +93,37"), which does not say
		-- at a glance which lines you are looking at. Resolve it to the range the
		-- hunk occupies in the file *now*: the +side start plus its count.
		--   37 lines added at 93 -> "93-129"
		--   1 line changed at 239 -> "239"
		--   3 lines deleted at 10 -> "10 (-3)", since the new side has no extent
		-- A bare "+239" with no comma means a count of 1, per diff's own shorthand.
		local function hunk_range(header)
			local ns, nc = header:match("%+(%d+),?(%d*)")
			if not ns then
				return ""
			end
			ns, nc = tonumber(ns), tonumber(nc == "" and "1" or nc)
			if nc == 0 then
				local _, oc = header:match("%-(%d+),?(%d*)")
				return ("%d (-%s)"):format(ns, oc == "" and "1" or oc)
			elseif nc == 1 then
				return tostring(ns)
			end
			return ("%d-%d"):format(ns, ns + nc - 1)
		end

		keymap.set("n", "<leader>gs", function()
			require("gitsigns").setqflist("all", { open = false }, function()
				vim.schedule(function()
					if vim.tbl_isempty(vim.fn.getqflist()) then
						vim.notify("No hunks", vim.log.levels.INFO)
						return
					end

					local entry_display = require("telescope.pickers.entry_display")
					local make_entry = require("telescope.make_entry")

					local displayer = entry_display.create({
						separator = " ",
						items = {
							{ width = 38 }, -- path:lnum
							{ width = 7 }, -- Added / Changed / Removed
							{ width = 16 }, -- the -old +new header
							{ remaining = true }, -- first line of the hunk
						},
					})

					-- Preview just this hunk, not the file's whole diff. Two reasons it has to be
					-- a slice rather than a scroll: telescope attaches the freshly created preview
					-- buffer to the window inside a vim.schedule that runs *after* define_preview
					-- returns (buffer_previewer.lua), so any nvim_win_set_cursor here lands on the
					-- previously previewed buffer and is then thrown away - the preview always
					-- reopens at line 1. Slicing also drops git's diff --git/index/---/+++
					-- preamble, which was most of the noise.
					--
					-- `git diff` with no revision is worktree vs index, the same base gitsigns
					-- uses, so the hunk boundaries always line up.
					local hunk_previewer = require("telescope.previewers").new_buffer_previewer({
						-- Needs dynamic_preview_title below; telescope defaults it off.
						dyn_title = function(_, entry)
							local kind, header = entry.text:match("^(%a+)%s*%((.-)%):")
							return ("%s  %s %s"):format(
								vim.fn.fnamemodify(entry.filename, ":."),
								kind or "",
								header and hunk_range(header) or ""
							)
						end,
						-- Rebuild the hunk from gitsigns' own header rather than from `git diff`
						-- output. `git diff -UN` coalesces hunks that sit within 2N lines of each
						-- other, so two edits 4 lines apart come back as ONE @@ block while gitsigns
						-- still reports two - and every row in that block then previewed the same
						-- merged text. Verified: edits at lines 10 and 14 give gitsigns "-10 +10" and
						-- "-14 +14" but a single "@@ -7,11 +7,11 @@" from -U3.
						--
						-- entry.text already carries gitsigns' exact header, so the hunk can be
						-- assembled directly: new lines from the file, removed lines from the index,
						-- context from the file around them. No coalescing is possible this way, and
						-- the context width is ours to pick.
						define_preview = function(self, entry)
							local file = entry.filename
							local dir = vim.fn.fnamemodify(file, ":h")
							local CTX = 3

							local header = entry.text:match("^%a+%s*%((.-)%):") or ""
							local os_, oc_, ns_, nc_ = header:match("^%-(%d+),?(%d*)%s+%+(%d+),?(%d*)$")
							local function num(v, dflt)
								return tonumber(v == "" and dflt or v)
							end
							if not os_ then
								vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, { entry.text })
								return
							end
							local old_start, old_count = num(os_, "1"), num(oc_, "1")
							local new_start, new_count = num(ns_, "1"), num(nc_, "1")

							-- gitsigns diffs the *buffer* when one is loaded, so prefer buffer lines over
							-- what is on disk; otherwise the preview drifts from the gutter on an unsaved
							-- file. Falls back to the file for hunks in files that are not open.
							local buf = vim.fn.bufnr(file)
							local new_lines
							if buf > 0 and vim.api.nvim_buf_is_loaded(buf) then
								new_lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
							else
								new_lines = vim.fn.filereadable(file) == 1 and vim.fn.readfile(file) or {}
							end

							-- Removed lines only exist in the index. ":./name" resolves relative to the
							-- -C directory, so this works for nested paths without computing a prefix.
							-- The index is also gitsigns' default base, so the two always agree.
							local removed = {}
							if old_count > 0 then
								local idx = vim.fn.systemlist({
									"git", "-C", dir, "show", ":./" .. vim.fn.fnamemodify(file, ":t"),
								})
								if vim.v.shell_error == 0 then
									for i = old_start, old_start + old_count - 1 do
										removed[#removed + 1] = idx[i]
									end
								end
							end

							-- For a pure deletion (new_count == 0) gitsigns points at the line the removal
							-- sits *after*, so the added block is empty and that line belongs to context.
							local first = new_count > 0 and new_start or new_start + 1
							local last = new_count > 0 and new_start + new_count - 1 or new_start

							local code, marks = {}, {}
							local function push(text, hl)
								code[#code + 1] = text or ""
								if hl then
									marks[#code] = hl
								end
							end

							for i = math.max(1, first - CTX), first - 1 do
								push(new_lines[i])
							end
							for _, l in ipairs(removed) do
								push(l, "DiffDelete")
							end
							for i = first, last do
								push(new_lines[i], "DiffAdd")
							end
							for i = last + 1, math.min(#new_lines, last + CTX) do
								push(new_lines[i])
							end

							-- Render as *code*, not as a diff listing. filetype=diff colours the whole
							-- line by its +/- prefix and gives up on the language underneath, which is
							-- what made this ugly. There are no prefix columns here at all, so the
							-- buffer is plain source that telescope can syntax-highlight.
							--
							-- DiffAdd/DiffDelete are deliberate over GitSignsAddLn/GitSignsChangeLn:
							-- those two define only `fg`, so they would repaint the text and fight the
							-- syntax highlighting. The Diff* groups carry `bg` only, so treesitter's
							-- foreground shows through and the row just gains a green or red wash.
							vim.api.nvim_buf_set_lines(self.state.bufnr, 0, -1, false, code)

							local putils = require("telescope.previewers.utils")
							putils.highlighter(self.state.bufnr, putils.filetype_detect(file))

							-- line_hl_group rather than nvim_buf_add_highlight: it extends past the end
							-- of the text, so a short added line still reads as a full-width band.
							local ns = vim.api.nvim_create_namespace("gitsigns_hunk_preview")
							vim.api.nvim_buf_clear_namespace(self.state.bufnr, ns, 0, -1)
							for i, hl in pairs(marks) do
								pcall(vim.api.nvim_buf_set_extmark, self.state.bufnr, ns, i - 1, 0, { line_hl_group = hl })
							end
						end,
					})

					require("telescope.builtin").quickfix({
						prompt_title = "Git hunks",
						dynamic_preview_title = true,
						previewer = hunk_previewer,
						-- Wrap the stock quickfix entry maker rather than replacing it: it
						-- supplies filename/lnum/col/bufnr, which the previewer and <CR> need.
						-- Only `display` is swapped out.
						entry_maker = function(qf_entry)
							local entry = make_entry.gen_from_quickfix({})(qf_entry)
							-- gitsigns writes each line as ("%-7s (%s): %s"):format(kind, header, text)
							local kind, header, text = entry.text:match("^(%a+)%s*%((.-)%):%s?(.*)$")
							entry.display = function(e)
								return displayer({
									{ vim.fn.fnamemodify(e.filename, ":.") .. ":" .. e.lnum, "TelescopeResultsIdentifier" },
									{ kind or "?", hunk_hl[kind] or "TelescopeResultsComment" },
									{ header and hunk_range(header) or "", "TelescopeResultsComment" },
									{ vim.trim(text or "") },
								})
							end
							return entry
						end,
					})
				end)
			end)
		end, { desc = "Telescope: all git hunks" })
		keymap.set("n", "<leader>gbb", "<cmd>Gitsigns blame<CR>", { desc = "Perform git blame" })
		keymap.set("n", "<leader>gbl", "<cmd>Gitsigns blame_line<CR>", { desc = "Perform git blame on current line" })
		-- Staging lives under gS, not gs: <leader>gs is the hunk picker above, and a
		-- gss/gsa/gsu prefix would make every invocation of it sit out timeoutlen
		-- first. Capital S keeps the mnemonic and removes the ambiguity entirely.
		keymap.set("n", "<leader>gSs", "<cmd>Gitsigns stage_hunk<CR>", { desc = "Stage current hunk" })
		keymap.set("n", "<leader>gSa", "<cmd>Gitsigns stage_buffer<CR>", { desc = "Stage current buffer" })
		keymap.set("n", "<leader>gSu", "<cmd>Gitsigns undo_stage_hunk<CR>", { desc = "Unstage last staged hunk" })
		keymap.set("n", "<leader>grr", "<cmd>Gitsigns reset_hunk<CR>", { desc = "Undo hunk changes" })
		keymap.set("n", "<leader>gra", "<cmd>Gitsigns reset_buffer<CR>", { desc = "Undo buffer changes" })

		keymap.set("n", "<C-g>n", "<cmd>Gitsigns next_hunk<CR>", { desc = "Go to next hunk" })
		keymap.set("n", "<C-g>p", "<cmd>Gitsigns prev_hunk<CR>", { desc = "Go to previous hunk" })
	end,
}
