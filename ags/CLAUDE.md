# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AGS (Aylur's GTK Shell)** configuration — a custom desktop shell for the Hyprland window manager, written in TypeScript + SCSS. It renders two GTK4 windows: a top `Bar` and a right-side `SidePanel`.

## Commands

```sh
# Run the shell (compiles and starts the daemon)
ags

# Send IPC commands to the running instance
ags request toggle-sidepanel

# Format code
prettier --write .
```

AGS handles TypeScript compilation internally — there is no separate build step.

## Architecture

**Entry point**: `app.tsx`
- Creates the `ryzzen-shell` instance
- Mounts the two windows (`Bar`, `SidePanel`)
- Sets up an IPC request handler for external commands

**Widgets** (`widgets/`):
- `Bar.tsx` — Top panel; divided into Left (launcher + tray), Center (workspaces), Right (stats, audio, network, battery, clock, power)
- `SidePanel.tsx` — Collapsible right panel; contains system header, quick toggles (WiFi, Bluetooth), speaker/mic sliders, sink/source selectors, and per-app mixer

**Styling**: `style.scss` (single file, ~500 lines) — color palette defined as CSS variables at the top, then per-component sections matching the widget structure.

## Key Patterns

**Reactive bindings**: Use `createBinding()` for values that auto-update the UI, and `createPoll(interval, command)` for periodic shell polling (e.g., CPU/memory/time).

**JSX**: GTK4 widgets are expressed in React-style TSX. JSX maps to GObject widgets via the `ags/gtk4` transform. Dynamic CSS classes are applied via binding the `cssClasses` prop.

**System services** accessed via AGS service modules:
- `Hyprland` — workspaces
- `Wp` (WirePlumber) — audio devices and streams
- `Network` — WiFi/wired status
- `Battery` — power info
- `Bluetooth` — device state
- `Tray` — system tray protocol

**External tools** spawned by widgets: `rofi`, `wlogout`, `blueman-manager`, `nm-connection-editor`, `pavucontrol`, `systemctl`.

## TypeScript Config

`tsconfig.json` targets ES2022 modules / ES2020 output with `ags/gtk4` JSX. Generated GObject type bindings live in `@girs/` (auto-generated, do not edit manually). Custom ambient type declarations are in `env.d.ts`.
