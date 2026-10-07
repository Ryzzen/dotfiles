-- Browser preview of the current markdown file, live-reloaded and scroll-synced.
--
-- Picked over markdown-preview.nvim / peek.nvim because it is pure Lua with
-- its renderer, KaTeX and mermaid vendored in the plugin: no `build` step, no
-- node/deno, no prebuilt binary or webview .so downloaded at install time,
-- which is what breaks those two on NixOS. Works offline.
return {
	"brianhuster/live-preview.nvim",
	cmd = "LivePreview",
	keys = {
		{
			"<leader>v",
			function()
				if require("livepreview").is_running() then
					vim.cmd("LivePreview close")
				else
					vim.cmd("LivePreview start")
				end
			end,
			desc = "Toggle markdown browser preview",
			ft = "markdown",
		},
	},
	config = function()
		require("livepreview.config").set({
			picker = "telescope", -- :LivePreview pick
			sync_scroll = true,
		})
	end,
}
