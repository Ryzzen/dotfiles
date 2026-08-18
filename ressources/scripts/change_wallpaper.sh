#!/usr/bin/env bash
# Pick the next wallpaper, regenerate the pywal palette, then apply it everywhere.
# Bound to SUPER+W and run once at login.
#
# The apply half is split into wallpaper_apply.sh so monitor hotplug can re-apply
# the SAME image without "wal --iterative" advancing to a different one.
set -u

wal --iterative -i "${HOME}/.config/ressources/images/wallpapers/"

# hyprland resolves "source= ~/.cache/wal/colors-hyprland.conf" once, when it parses
# its config - and at login that happens BEFORE exec-once gets here to run wal. So
# the window borders keep rendering last session's $color1/$color2 while the
# wallpaper, terminal and bar all move to the new palette. Re-reading the config is
# the only way to pick up the regenerated file.
#
# Lives here rather than in wallpaper_apply.sh because the palette only changes when
# the picker runs; monitor hotplug re-applies the same colours and must not reload.
for _ in $(seq 50); do
    hyprctl reload >/dev/null 2>&1 && break
    sleep 0.1
done

# kitty parses kitty.conf - and the "include ~/.cache/wal/colors-kitty.conf" inside
# it - exactly once, at process start. wal recolours already-open windows by writing
# OSC escape sequences into every pty, but that is a per-window runtime override: it
# never touches the palette the process hands to windows it creates later. So the
# focused terminal follows the new wallpaper and a freshly launched kitty reads the
# regenerated file, while a new TAB in an existing kitty is built from that process's
# stale in-memory config. Telling each instance to re-read the config fixes both the
# open windows and the defaults inherited by future tabs.
#
# Iterate the sockets rather than signalling by process name: kitty appends its PID
# to "listen_on unix:/tmp/mykitty", one socket per instance, and on NixOS the process
# is named .kitty-wrapped so pkill -x would miss it. Stale sockets from dead
# instances just fail the call.
for sock in /tmp/mykitty-*; do
    [ -S "$sock" ] || continue
    kitty @ --to="unix:$sock" load-config >/dev/null 2>&1 || true
done

exec "${HOME}/.config/ressources/scripts/wallpaper_apply.sh"
