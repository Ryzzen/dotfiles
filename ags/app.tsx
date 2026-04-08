import app from "ags/gtk4/app"
import { Astal } from "ags/gtk4"
import { readFile } from "ags/file"
import GLib from "gi://GLib"
import style from "./style.scss"
import Bar from "./widgets/Bar"
import SidePanel from "./widgets/SidePanel"
import HwPopup from "./widgets/HwPopup"
import CalendarPopup from "./widgets/CalendarPopup"

const HOME = GLib.get_home_dir()

function lighten(hex: string, amount: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount)
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount)
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount)
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function walColors(): string {
    const lines = readFile(`${HOME}/.cache/wal/colors`).trim().split("\n")
    // 0=bg, 1-6=palette light→dark, 7=fg, 8=gray
    const bg = lines[0]
    return [
        `@define-color surface ${lighten(bg, 20)};`,
        `@define-color surface_container ${lighten(bg, 12)};`,
        `@define-color surface_container_low ${lighten(bg, 8)};`,
        `@define-color surface_container_high ${lighten(bg, 30)};`,
        `@define-color surface_variant ${lines[2]};`,
        `@define-color surface_bright ${lines[3]};`,
        `@define-color primary ${lines[4]};`,
        `@define-color on_primary ${lines[0]};`,
        `@define-color primary_container ${lines[2]};`,
        `@define-color on_surface ${lines[7]};`,
        `@define-color on_surface_variant ${lines[6]};`,
        `@define-color outline ${lines[8]};`,
        `@define-color outline_variant ${lines[2]};`,
        `@define-color error #f53c3c;`,
        `@define-color tertiary ${lines[1]};`,
    ].join("\n")
}

const css = walColors() + "\n" + style

app.start({
    instanceName: "ryzzen-shell",
    css: css,
    main() {
        Bar(0)
        SidePanel(0)
        HwPopup(0)
        CalendarPopup(0)
    },
    requestHandler(argv: string[], response: (msg: string) => void) {
        const [cmd] = argv
        if (cmd === "toggle-sidepanel") {
            const win = app.get_window("sidepanel")
            if (win) win.visible = !win.visible
            response("ok")
        } else if (cmd === "toggle-hw-popup") {
            const win = app.get_window("hw-popup")
            if (win) win.visible = !win.visible
            response("ok")
        } else if (cmd === "toggle-calendar") {
            const win = app.get_window("calendar-popup")
            if (win) win.visible = !win.visible
            response("ok")
        } else if (cmd === "reload-css") {
            app.reset_css()
            app.apply_css(walColors() + "\n" + style, false)
            response("ok")
        } else {
            response(`unknown command: ${cmd}`)
        }
    },
})
