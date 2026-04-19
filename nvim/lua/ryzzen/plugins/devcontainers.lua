return {
	"jedrzejboczar/devcontainers.nvim",
	dependencies = {
		"miversen33/netman.nvim",
		"stevearc/overseer.nvim",
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
