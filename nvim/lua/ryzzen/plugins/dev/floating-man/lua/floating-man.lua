local M = {}

-- Function to open :Man in a floating window
function M.floating_man_page()
	-- Get the current word under the cursor (if available)
	local man_page = vim.fn.expand("<cword>")

	-- If no word under cursor, prompt for a man page
	if man_page == "" then
		man_page = vim.fn.input("Man page: ")
	end

	if man_page == "" then
		return
	end

	local width = math.floor(vim.o.columns * 0.8)
	local height = math.floor(vim.o.lines * 0.8)
	local col = math.floor((vim.o.columns - width) / 2)
	local row = math.floor((vim.o.lines - height) / 2)

	local buf = vim.api.nvim_create_buf(false, true)
	local win = vim.api.nvim_open_win(buf, true, {
		relative = "editor",
		width = width,
		height = height,
		col = col,
		row = row,
		style = "minimal",
		border = "none",
	})

	vim.api.nvim_buf_set_option(buf, "buftype", "nofile")

	-- Try to open the man page
	local success = pcall(vim.cmd, "edit man://" .. man_page .. "(3)")

	if not success then
		-- If the man page could not be opened, show an error message
		vim.notify("No man entry for: " .. man_page, vim.log.levels.ERROR)
		-- Close the floating window and delete the buffer
		vim.api.nvim_win_close(win, true)
		vim.api.nvim_buf_delete(buf, { force = true })
		return
	end

	local man_buf = vim.api.nvim_get_current_buf()
	vim.api.nvim_win_set_buf(win, man_buf)

	vim.api.nvim_set_current_win(win)
end

return M
