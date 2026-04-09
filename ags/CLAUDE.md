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

## Where We Left Off (2026-04-09, evening)

Multi-monitor handling kept on the reactive pattern BUT confirmed to crash on monitor hotplug due to a **GDK4 Wayland bug** (details below). Workaround in progress: run AGS as a systemd user service with `Restart=on-failure` so the crash-loop cycle is 1 s instead of permanent.

### Reactive Bars() + BorderOverlay work (unchanged from earlier today)

- `widgets/Bar.tsx` — `Bars()` uses `<For each={createBinding(app, "monitors")}>` with a `cleanup` callback that destroys the window and strips its `barRefs` entry (key: connector name, parsed from `window.name` prefixed `bar-`). GDK4's monitor ListModel preserves `Gdk.Monitor` identity across hotplug, so only the added/removed slot is touched; surviving bars are left alone. Contains the earlier dead-code cleanup + performance pass on `BorderOverlay` (island-skip frame-culling, inlined `colorAt`, halved `CURVE_STEPS`/`LINE_STEPS`). A comment block above `Bars()` documents the GDK bug so future-you doesn't re-instrument.
- `style.scss` — `.bar-inner` padding changed to `0 0 1px` so the bar sits flush with the screen top.
- `../ressources/scripts/ags-monitor-watch.sh` — **deleted** (old poll-and-kill workaround).
- `../hypr/hypr` — **deleted** (self-referential symlink from the scratched workaround; committed in 64cd697).

Pattern source: matshell (`Neurarian/matshell`, `widgets/bar/main.tsx`) — still canonical; the crash is not structural.

### GDK4 hotplug crash (triaged this session)

Environment: **GTK 4.18.5 + Hyprland 0.49.0 + NVIDIA 570** (Vulkan via GDK).

Sequence on monitor unplug/replug (proven via a `[bar-diag]` probe in `Bar.tsx` + heartbeat timer, both removed afterward):

```
[bar-diag] items-changed removed=1 added=0 total=1
(gjs): Gdk-DEBUG: warning: queue 0x... destroyed while proxies still attached:
  wl_registry#... still attached
  wl_registry#... still attached
...
(gjs): Gdk-DEBUG: Tried to add event to destroyed queue
error: signal: aborted (core dumped)
```

Root cause: GDK4 tears down a per-monitor `wl_event_queue` when a `Gdk.Monitor` leaves `Gdk.Display.get_monitors()` but leaks `wl_registry` proxies still attached to that queue. Any subsequent event routed through those registries (replug, new global) aborts via `g_log` → `abort()`. **Proven non-AGS** by reproducing the same crash with a no-op `<For>` cleanup that never touches the window.

Not fixable from `Bar.tsx`. See `~/.claude/projects/-home-ryzzen-NixOS-dotfiles/memory/project_gdk4_monitor_crash.md` for the full triage. User declined producing an upstream C repro.

### Workaround landed (not yet rebuilt/tested)

- `../../nix-config/home-manager/home.nix` — added `systemd.user.services.ags` next to the existing `programs.ags` block. `ExecStart=${pkgs.ags}/bin/ags run`, `Restart=on-failure`, `RestartSec=1`, `StartLimitBurst=10 / StartLimitIntervalSec=30`, `PartOf`/`WantedBy = graphical-session.target`.
- `../hypr/hyprland.conf` — replaced `exec-once = ags run` (line 274) with three `exec-once` lines: `dbus-update-activation-environment --systemd ...`, `systemctl --user import-environment ...`, `systemctl --user start graphical-session.target`. The env vars pushed are `WAYLAND_DISPLAY XDG_CURRENT_DESKTOP HYPRLAND_INSTANCE_SIGNATURE` — the third one is what AstalHyprland needs to find the IPC socket.

### Open items

- **Test the workaround**: `sudo nixos-rebuild switch --flake ~/NixOS/nix-config`, then log out/in of Hyprland. Verify with `systemctl --user status ags` and `journalctl --user -u ags -f`. Unplug/replug should show a SIGABRT then `Started ags.service` ~1 s later. If `ags.service` comes up `inactive` after the rebuild, the env-import ordering inside `graphical-session.target` may need an explicit `systemctl --user start ags.service` in hyprland.conf as a fallback.
- **Mystery spdlog-format log lines** appearing in `ags run` output. Literal byte match only exists in Waybar binaries, yet `pgrep waybar` was empty. Next step: `strace -f -e trace=execve -o /tmp/ags-trace.log ags run` to catch whoever execs the stray waybar. Unchanged from the morning session.
- **Long-term**: if nixpkgs gets a GTK 4.20+ bump, retest without the restart workaround — the `queue destroyed while proxies still attached` warning disappearing is the green light to rely on in-process reactive hotplug and potentially drop the systemd service.
