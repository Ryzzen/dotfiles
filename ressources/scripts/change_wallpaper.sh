#!/usr/bin/env bash
# Pick the next wallpaper, regenerate the pywal palette, then apply it everywhere.
# Bound to SUPER+W and run once at login.
#
# The apply half is split into wallpaper_apply.sh so monitor hotplug can re-apply
# the SAME image without "wal --iterative" advancing to a different one.
set -u

wal --iterative -i "${HOME}/.config/ressources/images/wallpapers/"

exec "${HOME}/.config/ressources/scripts/wallpaper_apply.sh"
