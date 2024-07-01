-- vim.g.mapleader = " "

local keymap = vim.keymap

keymap.set("n", "<leader>nh", ":nohl<CR>", { desc = "Clear search highlights" })

keymap.set("n", "<C-C>", "+y", { desc = "Copy paste to desktop clipboard" })

-- increment/decrement numbers
keymap.set("n", "<leader>+", "<C-a>", { desc = "Increment number" }) -- increment
keymap.set("n", "<leader>-", "<C-x>", { desc = "Decrement number" }) -- decrement

-- window management
keymap.set("n", "<S-t>", "<cmd>tabnew<CR>", { desc = "Open new tab" })
keymap.set("n", "<S-PageUp>", "<cmd>tabnext<CR>", { desc = "Go to next tab" })
keymap.set("n", "<S-PageDown>", "<cmd>tabprevious<CR>", { desc = "Go to previous tab" })
keymap.set("n", "<S-q>", "<cmd>tabclose<CR>", { desc = "Close current tab" })
keymap.set("n", "<space>s", "<cmd>vsplit<CR> <C-W><C-l>", { desc = "Split window horizontally" })
keymap.set("n", "<space>v", "<cmd>split<CR> <C-W><C-j>", { desc = "Split window vertically" })
keymap.set("n", "<space>q", "<cmd>close<CR>", { desc = "Close current split" })
keymap.set("n", "<space><right>", "<C-W><C-l>", { desc = "Go to right window" })
keymap.set("n", "<space><left>", "<C-W><C-h>", { desc = "Go to right window" })
keymap.set("n", "<space><up>", "<C-W><C-k>", { desc = "Go to top window" })
keymap.set("n", "<space><down>", "<C-W><C-j>", { desc = "Go to bottom window" })

keymap.set("n", "<leader>bp", "__BKPT();", { desc = "Insert breakpoint for C/C++" })
