# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This directory holds a single file — `kitty.conf`, the user's kitty terminal config — and lives inside the larger `~/NixOS/dotfiles` repo (origin: `git@github.com:Ryzzen/dotfiles.git`). There is no build, lint, or test step.

## Reloading config

Remote control is enabled and kitty listens on a unix socket (`listen_on unix:/tmp/mykitty`), so the running terminal can be told to reload after edits without restarting.

**kitty appends its PID to that path** — the actual socket is `/tmp/mykitty-<pid>`, one per instance, and `--to=unix:/tmp/mykitty` matches nothing. Iterate instead:

```
for sock in /tmp/mykitty-*; do kitty @ --to="unix:$sock" load-config; done
```

Reloading is what makes a config change reach **new tabs**: kitty parses `kitty.conf` once at start, so an existing instance keeps handing its stale in-memory palette to tabs it opens later, even after `~/.cache/wal/colors-kitty.conf` changes on disk. `../ressources/scripts/change_wallpaper.sh` does this reload after every `wal` run for exactly that reason.

Signalling by process name is not a workable alternative here — on NixOS the process is `.kitty-wrapped`, so `pkill -x kitty` misses it.

## Color scheme is externally generated

`kitty.conf` does `include ~/.cache/wal/colors-kitty.conf`. Colors come from **pywal**, not from this file. Editing palette colors directly in `kitty.conf` will be overwritten on the next `wal` run, and changing the wallpaper/theme via pywal is what actually changes kitty's colors. The sibling `../wal/` directory in this dotfiles repo holds the pywal templates that drive this.

## Font dependency

`font_family CaskaydiaCove NF` — a Nerd Font. If glyphs render as boxes after a fresh setup, the font isn't installed, not a config bug.