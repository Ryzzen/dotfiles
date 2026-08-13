#!/usr/bin/env bash
# Apply the wallpaper pywal last picked to EVERY output.
#
# Deliberately does NOT pick a new image. This also runs on monitor hotplug, and
# "wal --iterative" advances to the next wallpaper on every call - re-running the
# picker per monitor is exactly what desynchronises the screens. Picking lives in
# change_wallpaper.sh; this half is idempotent and safe to run any number of times.
set -u

WAL_CACHE="${HOME}/.cache/wal/wal"

[ -r "$WAL_CACHE" ] || exit 0
img="$(< "$WAL_CACHE")"
[ -n "$img" ] && [ -e "$img" ] || exit 0

# At login this races swww-daemon: exec-once starts both at the same moment and
# "swww img" just fails if the socket isn't up yet. Wait for it, up to ~10s.
for _ in $(seq 100); do
    swww query >/dev/null 2>&1 && break
    sleep 0.1
done

# No --outputs: swww applies to every output it currently knows about.
swww img "$img"

# Palette only changes when the picker ran, but reloading is cheap and keeps this
# script self-contained.
ags request -i ryzzen-shell reload-css >/dev/null 2>&1 || true
