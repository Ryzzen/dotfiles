# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This directory holds a single file — `kitty.conf`, the user's kitty terminal config — and lives inside the larger `~/NixOS/dotfiles` repo (origin: `git@github.com:Ryzzen/dotfiles.git`). There is no build, lint, or test step.

## Reloading config

Remote control is enabled and kitty listens on a fixed socket (`listen_on unix:/tmp/mykitty`), so the running terminal can be told to reload after edits without restarting:

```
kitty @ --to=unix:/tmp/mykitty load-config
```

The socket path is the load-bearing detail — other kitty tooling (e.g. `kitten @ ...`) should target the same socket.

## Color scheme is externally generated

`kitty.conf` does `include ~/.cache/wal/colors-kitty.conf`. Colors come from **pywal**, not from this file. Editing palette colors directly in `kitty.conf` will be overwritten on the next `wal` run, and changing the wallpaper/theme via pywal is what actually changes kitty's colors. The sibling `../wal/` directory in this dotfiles repo holds the pywal templates that drive this.

## Font dependency

`font_family CaskaydiaCove NF` — a Nerd Font. If glyphs render as boxes after a fresh setup, the font isn't installed, not a config bug.