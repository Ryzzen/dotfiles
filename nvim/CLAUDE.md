# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal Neovim configuration (NVIM v0.11.1) maintained inside a larger NixOS dotfiles repo. There is no build, no lint, and no test suite — changes are validated by launching `nvim` and watching for runtime errors.

## Layout

Entry point: `init.lua` → `lua/ryzzen/core/{options,keymaps,auto-headers}.lua` + `lua/ryzzen/lazy.lua` (bootstraps lazy.nvim and imports plugin specs).

`lua/ryzzen/lazy.lua` imports three plugin trees via `lazy.setup`:
- `ryzzen.plugins` — flat directory of per-plugin specs (`*.lua`), each returning a lazy spec table. `plugins/init.lua` returns extra short-form specs that don't need their own file.
- `ryzzen.plugins.lsp` — LSP setup (`lspconfig.lua`, `mason.lua`, `trouble.lua`).
- `ryzzen.plugins.git` — git plugins.

Adding a plugin = drop a new `*.lua` file into the matching directory returning a lazy spec. Lazy's `change_detection` is on, so most edits hot-reload; LSP changes generally need `:LspRestart` or a restart.

## LSP convention (Neovim 0.11 API)

`lspconfig.lua` does not use the legacy `require("lspconfig").<server>.setup{}` pattern. It uses the new 0.11 API:

```lua
vim.lsp.config["<server>"] = { capabilities = ..., cmd = ..., filetypes = ..., root_markers = ..., ... }
vim.lsp.enable("<server>")
```

`root_markers` must be a flat list of strings. The priority-group syntax `{ {".luarc.json", ".luarc.jsonc"}, ".git" }` is documented but breaks `vim.fs.find` on 0.11.1 (`invalid value (table) at index 2 in table for 'concat'`) — keep markers flat.

Servers are installed via `mason.lua` (`ensure_installed`), then configured in `lspconfig.lua`. Both lists must be kept in sync for a server to actually work.

## Templates and auto-headers

`core/auto-headers.lua` injects template files on `BufNewFile` for `*.h`, `*.hpp`, `*.pwn.py`. Templates live in `templates/` and use a literal `NAME` token that is replaced by the file's basename via inline `:g/NAME/s//.../` substitutions. Editing a template means also checking the line numbers in `auto-headers.lua` — they hardcode the substitution range and the final cursor position.

`luasnippets/` holds LuaSnip snippet sources (currently `c.lua`).

## Path coupling

The auto-header autocmds read templates from `~/.config/nvim/templates/...` (a literal path, not `stdpath('config')`). This repo lives at `~/NixOS/dotfiles/nvim` and is expected to be symlinked to `~/.config/nvim` — without the symlink, `BufNewFile` on `*.h`/`*.hpp`/`*.pwn.py` will silently fail to insert the template.
