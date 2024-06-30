return {
	"puremourning/vimspector",
	config = function()
		vim.g.vimspector_base_dir = vim.fn.expand("$HOME/.local/share/nvim/plugged/vimspector")
		vim.g.vimspector_enable_mappings = "HUMAN"
	end,
}
