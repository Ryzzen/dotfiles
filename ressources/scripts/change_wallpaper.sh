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

exec "${HOME}/.config/ressources/scripts/wallpaper_apply.sh"
