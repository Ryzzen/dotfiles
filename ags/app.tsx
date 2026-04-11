import app from "ags/gtk4/app"
import { createBinding, For } from "ags"
import { Gdk } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"
import style from "./style.scss"
import { walCssDefines, reloadWalColors } from "./walColors"
import Bars from "./widgets/Bar"
import SidePanel from "./widgets/SidePanel"
import HwPopup from "./widgets/HwPopup"
import CalendarPopup from "./widgets/CalendarPopup"

const css = walCssDefines() + "\n" + style

// Per-monitor popup windows. Uses the same reactive monitor binding as
// Bars() so popups are created/destroyed in sync with monitor hotplug.
function HwPopups() {
    const monitors = createBinding(app, "monitors")
    return (
        <For each={monitors}>
            {(mon) => <HwPopup gdkmonitor={mon as Gdk.Monitor} />}
        </For>
    )
}

function CalendarPopups() {
    const monitors = createBinding(app, "monitors")
    return (
        <For each={monitors}>
            {(mon) => <CalendarPopup gdkmonitor={mon as Gdk.Monitor} />}
        </For>
    )
}

// Best-effort "focused monitor connector" for IPC toggles — external
// commands can't know which monitor the user is on, so we ask Hyprland.
function focusedConnector(): string | null {
    try {
        const hypr = Hyprland.get_default()
        const fm = hypr?.get_focused_monitor?.()
        return fm?.name ?? null
    } catch {
        return null
    }
}

function togglePopupOnFocusedMonitor(prefix: string) {
    const conn = focusedConnector()
    const name = conn ? `${prefix}-${conn}` : null
    const win = name ? app.get_window(name) : null
    if (win) {
        win.visible = !win.visible
        return
    }
    // Fallback: toggle whichever popup window exists.
    for (const w of app.get_windows()) {
        if (w.name?.startsWith(`${prefix}-`)) {
            w.visible = !w.visible
            return
        }
    }
}

app.start({
    instanceName: "ryzzen-shell",
    css: css,
    main() {
        Bars()
        SidePanel(0)
        HwPopups()
        CalendarPopups()
    },
    requestHandler(argv: string[], response: (msg: string) => void) {
        const [cmd] = argv
        if (cmd === "toggle-sidepanel") {
            const win = app.get_window("sidepanel")
            if (win) win.visible = !win.visible
            response("ok")
        } else if (cmd === "toggle-hw-popup") {
            togglePopupOnFocusedMonitor("hw-popup")
            response("ok")
        } else if (cmd === "toggle-calendar") {
            togglePopupOnFocusedMonitor("calendar-popup")
            response("ok")
        } else if (cmd === "reload-css") {
            reloadWalColors()
            const newCss = walCssDefines() + "\n" + style
            app.reset_css()
            app.apply_css(newCss)
            response("reloaded")
        } else {
            response(`unknown command: ${cmd}`)
        }
    },
})
