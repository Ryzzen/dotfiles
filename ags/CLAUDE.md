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

## Where We Left Off (2026-04-09, late evening)

Monitor-hotplug crash workaround is finally correct: run AGS as a systemd user service with `Restart=on-failure` so the crash-loop cycle is ~1 s instead of permanent. **The earlier attempt (same day, evening) was wrong in two independent ways** and needed to be redone — see "Corrections" below so this doesn't get re-broken.

### Reactive Bars() + BorderOverlay work

- `widgets/Bar.tsx` — `Bars()` uses `<For each={createBinding(app, "monitors")}>` with a `cleanup` callback that destroys the window and strips its `barRefs` entry (key: connector name, parsed from `window.name` prefixed `bar-`). GDK4's monitor ListModel preserves `Gdk.Monitor` identity across hotplug, so only the added/removed slot is touched; surviving bars are left alone. Contains the earlier dead-code cleanup + performance pass on `BorderOverlay` (island-skip frame-culling, inlined `colorAt`, halved `CURVE_STEPS`/`LINE_STEPS`). A comment block above `Bars()` documents the GDK bug so future-you doesn't re-instrument.
- `style.scss` — `.bar-inner` padding changed to `0 0 1px` so the bar sits flush with the screen top.
- `../ressources/scripts/ags-monitor-watch.sh` — **deleted** (old poll-and-kill workaround).
- `../hypr/hypr` — **deleted** (self-referential symlink from the scratched workaround; committed in 64cd697).

Pattern source: matshell (`Neurarian/matshell`, `widgets/bar/main.tsx`) — still canonical; the crash is not structural.

### GDK4 hotplug crash

Environment: **GTK 4.18.5 + Hyprland 0.49.0 + NVIDIA 570** (Vulkan via GDK).

Sequence on monitor unplug/replug:

```
[bar-diag] items-changed removed=1 added=0 total=1
(gjs): Gdk-DEBUG: warning: queue 0x... destroyed while proxies still attached:
  wl_registry#... still attached
(gjs): Gdk-DEBUG: Tried to add event to destroyed queue
error: signal: aborted (core dumped)
```

GDK4 tears down a per-monitor `wl_event_queue` when a `Gdk.Monitor` leaves `Gdk.Display.get_monitors()` but leaks `wl_registry` proxies still attached to that queue. The next event through those registries aborts via `g_log` → `abort()`. **Proven non-AGS** — reproduces with a no-op `<For>` cleanup. Not fixable from `Bar.tsx`. See `~/.claude/projects/-home-ryzzen-NixOS-dotfiles/memory/project_gdk4_monitor_crash.md`.

### Workaround landed (needs rebuild + relogin)

- `../../nix-config/home-manager/home.nix` — `programs.ags.systemd.enable = true` (uses the built-in unit from inputs.ags's `hm-module.nix`, which references the **wrapped** `finalPackage` — has `GI_TYPELIB_PATH`, `extraPackages`, and the `main.agsJsPackage` ldflag). The custom `systemd.user.services.ags` block from the earlier attempt has been removed.
- `../hypr/hyprland.conf` (lines 274–280) — three `exec-once` lines: `dbus-update-activation-environment --systemd …`, `systemctl --user import-environment …`, `systemctl --user start ags.service`. The env vars pushed are `WAYLAND_DISPLAY XDG_CURRENT_DESKTOP HYPRLAND_INSTANCE_SIGNATURE` — the third is what AstalHyprland needs for IPC. Starts the service **directly** (see correction #2).

### Corrections from the earlier-evening attempt

Two mistakes, both landed in repo and caused "ags is not starting" on next session:

1. **Wrong ags binary.** The first attempt wrote `ExecStart = "${pkgs.ags}/bin/ags run"`. `pkgs.ags` is raw nixpkgs ags (2.3.0 as of this session), **unwrapped** — no `GI_TYPELIB_PATH`, no `extraPackages`, no `main.agsJsPackage` ldflag. It fails at esbuild (can't resolve `ags`/`ags/gtk4`) AND at GI typelib load (`Gtk 4.0 not found`). The correct binary is `${config.programs.ags.finalPackage}/bin/ags` — ags 3.1.0, wrapped by the `programs.ags` module. Even better: don't handroll the unit at all, use `programs.ags.systemd.enable = true` which references `finalPackage` internally (see `inputs.ags` `nix/hm-module.nix:124-143`). SDK module resolution (`ags`, `ags/gtk4`, `gnim`, etc.) goes through `~/.local/share/ags`, which the same module populates via `home.file.".local/share/ags".source = pkg.jsPackage`. **No local `node_modules` needed** — the `.gitignore` filtering out `node_modules/` and `@girs/` during the nix flake source import is fine.
2. **`graphical-session.target` has `RefuseManualStart=yes`.** The first attempt did `exec-once = systemctl --user start graphical-session.target` and relied on `WantedBy=graphical-session.target` to pull the service up. systemd silently refuses the start ("Operation refused, unit may be requested by dependency only"), the target stays inactive, and nothing pulls ags. Fix: start `ags.service` directly from hyprland.conf. `PartOf`/`WantedBy = graphical-session.target` is still kept in the unit (the built-in one) so stop semantics work if the target ever cycles.

### Open items

- **Test after next rebuild + Hyprland relogin**: `sudo nixos-rebuild switch --flake ~/NixOS/nix-config`, log out/in. Verify with `systemctl --user status ags` and `journalctl --user -u ags -f`. Unplug/replug should show a SIGABRT then `Started ags.service` ~1 s later. Note that `exec-once` only fires on Hyprland *startup*, not on `hyprctl reload` — a full relogin is required.
- **Mystery spdlog-format log lines** appearing in `ags run` output. Literal byte match only exists in Waybar binaries, yet `pgrep waybar` was empty. Next step: `strace -f -e trace=execve -o /tmp/ags-trace.log ags run` to catch whoever execs the stray waybar. Unchanged.
- **Long-term**: if nixpkgs gets a GTK 4.20+ bump, retest without the restart workaround — the `queue destroyed while proxies still attached` warning disappearing is the green light to rely on in-process reactive hotplug and potentially drop the systemd service.
