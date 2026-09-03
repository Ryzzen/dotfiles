#!/usr/bin/env bash
# Launch the session's apps, but only once the tray host is actually up.
#
# Discord (Electron) probes for org.kde.StatusNotifierWatcher exactly once, at
# startup, and never retries. If nothing owns that name yet it silently gives up
# and runs without a tray icon for the rest of the session. libayatana clients
# like nm-applet and udiskie watch for the name appearing and are unaffected,
# which is why they kept working while Discord did not.
#
# ags is the watcher, and under uwsm it can no longer win that race on its own.
# It is WantedBy=graphical-session.target, so it cannot start until the session
# handshake completes: Hyprland reaches exec-once, `uwsm finalize` exports the
# environment (~1.5s, it is Python), the compositor unit is notified ready, the
# target activates, and only then does ags start - after which gjs spends another
# ~1.2s loading before it claims the name. Meanwhile these apps, fired from
# exec-once, are already several seconds into their own startup. Before uwsm ags
# was hand-started by a `systemctl --user start` that ran in milliseconds, so it
# claimed the name first by a comfortable margin. That margin is now inverted.
#
# So block on the name rather than on ags.service: the unit goes active the moment
# gjs forks, which is over a second before the tray host actually exists.
set -u

WATCHER="org.kde.StatusNotifierWatcher"
TIMEOUT=15

deadline=$((SECONDS + TIMEOUT))
until busctl --user status "$WATCHER" >/dev/null 2>&1; do
  if ((SECONDS >= deadline)); then
    echo "autostart_apps: $WATCHER never appeared in ${TIMEOUT}s; starting anyway" >&2
    break
  fi
  sleep 0.1
done

# One per line, as before. Add and remove apps here.
chromium &
thunderbird &
discord &
spotify &
obsidian --disable-gpu &
kitty &

wait
