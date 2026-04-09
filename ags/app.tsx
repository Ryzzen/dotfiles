import app from "ags/gtk4/app"
import style from "./style.scss"
import { walCssDefines, reloadWalColors } from "./walColors"
import Bars from "./widgets/Bar"
import SidePanel from "./widgets/SidePanel"
import HwPopup from "./widgets/HwPopup"
import CalendarPopup from "./widgets/CalendarPopup"

const css = walCssDefines() + "\n" + style

app.start({
    instanceName: "ryzzen-shell",
    css: css,
    main() {
        Bars()
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
