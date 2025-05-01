return {
	"floating-man",
	dev = true, -- Set this to `true` if you are developing the plugin locally
	dir = "/home/ryzzen/NixOS/dotfiles/nvim/lua/ryzzen/plugins/dev/floating-man/",
	config = function()
		-- Keymaps
		local keymap = vim.keymap
		keymap.set("n", "<leader>m", function()
			require("floating-man").floating_man_page()
		end, { desc = "Open floating man page" })
	end,
}
