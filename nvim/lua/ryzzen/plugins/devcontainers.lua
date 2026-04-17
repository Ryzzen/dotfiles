return {
	"jedrzejboczar/devcontainers.nvim",
	dependencies = {
		"netman.nvim",
		"overseer.nvim",
	},
	config = function()
		require("devcontainers").setup({
			devcontainers_cli_cmd = "devcontainer",
			log = {
				level = "debug",
			},
		})
	end,
}
