import { Astal, Gtk } from "ags/gtk4"

/**
 * Close a popup when the user clicks or taps outside its content.
 *
 * A layer-shell window is only as large as what it holds, so a click beside a
 * popup lands on whatever is underneath and the popup never hears about it.
 * These windows therefore cover the screen with a transparent background, and
 * the content positions itself with halign/valign plus margins.
 *
 * "Outside" is a real widget rather than a gesture doing bounds arithmetic. The
 * gesture version worked perfectly with a pointer - five times out of five - and
 * only two times out of four by touch, which is precisely the "sometimes I have
 * to tap twice" it was reported as. GTK arbitrates touch sequences between
 * competing gestures and a capture-phase click gesture does not reliably win;
 * an ordinary button has no such problem, because activation is not something
 * that has to be won.
 *
 * So: a transparent button fills the window, the content sits above it as an
 * overlay child, and anything landing on the button is by definition not on the
 * content. No coordinate maths, and the same path for touch and pointer.
 *
 * The cost is unchanged and worth restating: while a popup is open its invisible
 * surface takes clicks meant for anything below it, so the first click anywhere
 * dismisses and a second reaches what was aimed at. The on-screen keyboard is
 * exempt regardless, sitting on OVERLAY while these are on TOP.
 */
export function closeOnClickOutside(win: Astal.Window, content: Gtk.Widget) {
    const overlay = new Gtk.Overlay()

    const scrim = new Gtk.Button({
        canFocus: false,
        hexpand: true,
        vexpand: true,
    })
    scrim.add_css_class("scrim")
    scrim.connect("clicked", () => {
        win.visible = false
    })

    // Re-parent: the content becomes an overlay child so it keeps drawing where
    // its own alignment puts it, with the scrim filling everything behind it.
    win.set_child(null)
    overlay.set_child(scrim)
    overlay.add_overlay(content)
    win.set_child(overlay)
}
