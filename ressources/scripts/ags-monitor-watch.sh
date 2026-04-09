#!/bin/sh
# Poll for monitor changes and restart AGS when detected.

get_monitor_count() {
    hyprctl monitors -j | grep -c '"id"'
}

start_ags() {
    ags run >/dev/null 2>&1 &
}

kill_ags() {
    pkill -9 -f "ags run" 2>/dev/null
    sleep 0.5
}

is_ags_running() {
    pgrep -f "ags run" >/dev/null 2>&1
}

LAST_COUNT=$(get_monitor_count)
start_ags

while true; do
    sleep 2
    COUNT=$(get_monitor_count)
    if [ "$COUNT" != "$LAST_COUNT" ]; then
        echo "Monitor count changed: $LAST_COUNT -> $COUNT — restarting AGS"
        kill_ags
        start_ags
        LAST_COUNT="$COUNT"
    elif ! is_ags_running; then
        echo "AGS crashed — restarting"
        sleep 0.5
        start_ags
    fi
done
