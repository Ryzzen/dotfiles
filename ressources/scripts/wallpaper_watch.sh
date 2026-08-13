#!/usr/bin/env bash
# Re-apply the wallpaper whenever an output appears.
#
# swww keeps a per-output cache (~/.cache/swww/<output>) and restores it for
# monitors that show up after login. Outputs are not all present when exec-once
# fires - the DisplayLink heads in particular arrive seconds late - so those
# monitors come back displaying whatever they had last boot while the rest of the
# desktop moved on to the new image. Nothing ever corrected that, which is why the
# screens drifted apart and the pywal palette matched only some of them.
set -u

APPLY="${HOME}/.config/ressources/scripts/wallpaper_apply.sh"
SOCK="${XDG_RUNTIME_DIR}/hypr/${HYPRLAND_INSTANCE_SIGNATURE}/.socket2.sock"

[ -S "$SOCK" ] || exit 0
[ -x "$APPLY" ] || exit 0

# socket2 is Hyprland's event stream; monitoradded>>NAME is emitted per output.
socat -u "UNIX-CONNECT:${SOCK}" - | while IFS= read -r line; do
    case "$line" in
        monitoradded\>\>*)
            # Monitors come up in a burst. Let it settle so a five-screen login
            # does one apply instead of five; extras would be harmless anyway.
            sleep 1
            "$APPLY"
            ;;
    esac
done
