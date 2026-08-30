import { Astal, Gtk } from "ags/gtk4"

/**
 * Close a popup when the user clicks or taps outside its content.
 *
 * A layer-shell window is only as large as what it holds, so a click beside a
 * popup lands on whatever is underneath and the popup never hears about it.
 * Catching that click means the window has to cover the screen: anchor it to all
 * four edges, keep the background transparent, and position the content with
 * halign/valign plus the margins it used to be anchored by. It looks identical
 * and the whole surface becomes a target.
 *
 * The cost is real and worth stating: while the popup is open, that invisible
 * surface takes clicks meant for anything below it, including the bar. So the
 * first click anywhere dismisses, and a second one reaches whatever was aimed
 * at. That is ordinary modal behaviour, but it is the same mechanism that makes
 * rofi so hostile on this machine, so it is deliberately confined to popups that
 * are only up while the user is interacting with them.
 *
 * The keyboard stays reachable regardless: these windows sit on Layer.TOP while
 * wvkbd is on OVERLAY, so it is never covered.
 *
 * CAPTURE phase so the gesture is evaluated before the content's own widgets
 * claim the press - otherwise a click on a slider or a button inside the popup
 * would be seen here first as a plain press and could close what the user was
 * aiming at.
 */
export function closeOnClickOutside(win: Astal.Window, content: Gtk.Widget) {
    const click = new Gtk.GestureClick({
        button: 0,
        propagationPhase: Gtk.PropagationPhase.CAPTURE,
    })

    click.connect("pressed", (_gesture, _nPress, x: number, y: number) => {
        const [ok, rect] = content.compute_bounds(win)
        // If the bounds cannot be resolved the popup is mid-layout; doing
        // nothing is better than closing on a press we cannot place.
        if (!ok) return

        const inside =
            x >= rect.get_x() &&
            x <= rect.get_x() + rect.get_width() &&
            y >= rect.get_y() &&
            y <= rect.get_y() + rect.get_height()

        if (!inside) win.visible = false
    })

    win.add_controller(click)
}
