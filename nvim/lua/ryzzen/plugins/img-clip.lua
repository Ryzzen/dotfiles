-- Paste an image from the clipboard (a grim/swappy screenshot, a copied
-- image…) into ./assets/ next to the file and insert the ![]() link.
-- Needs wl-clipboard on Wayland (wl-paste).
return {
	"HakonHarnes/img-clip.nvim",
	cmd = "PasteImage",
	keys = {
		{ "<leader>i", "<cmd>PasteImage<cr>", desc = "Paste image from clipboard", ft = "markdown" },
	},
	opts = {
		default = {
			dir_path = "assets",
			relative_to_current_file = true, -- README.md and docs/x.md each get their own assets/
			prompt_for_file_name = true, -- name it now, not 2026-10-07-14-03-11.png
			use_absolute_path = false,
		},
	},
}
