import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createState, For } from "ags"
import app from "ags/gtk4/app"
import Apps from "gi://AstalApps"

// Replaces rofi, and not for taste: rofi is unusable by touch on this machine.
// It binds no wl_touch at all, so taps never reach it, and while it is open it
// takes a pointer grab - measured, by clicking a bar button that worked moments
// earlier and watching nothing happen. That grab is what made the on-screen
// keyboard unreachable, so the launcher could not even be typed into.
//
// Being an ags window fixes both ends. GTK4 handles touch, and Keymode.ON_DEMAND
// asks for keyboard focus without grabbing the pointer, so the bar and the
// keyboard stay live while this is open. Typing then works the same way it does
// anywhere else: wvkbd sends through the virtual-keyboard protocol to whatever
// holds keyboard focus, which is this window.

const MAX_RESULTS = 8

export default function Launcher() {
    const { TOP } = Astal.WindowAnchor
    const apps = new Apps.Apps()

    const [query, setQuery] = createState("")
    const results = query((q) =>
        (q.trim() === "" ? apps.get_list() : apps.fuzzy_query(q)).slice(0, MAX_RESULTS)
    )

    // Kept alongside the reactive query so Enter can act on the current text
    // without reading a binding synchronously.
    let text = ""
    let entry: Gtk.Entry | null = null
    let win: Astal.Window | null = null

    const close = () => {
        if (win) win.visible = false
    }

    const launch = (a: Apps.Application) => {
        a.launch()
        close()
    }

    const launchFirst = () => {
        const list = text.trim() === "" ? apps.get_list() : apps.fuzzy_query(text)
        if (list.length) launch(list[0])
    }

    return (
        <window
            visible={false}
            name="launcher"
            namespace="launcher"
            class="Launcher"
            layer={Astal.Layer.TOP}
            // ON_DEMAND, never EXCLUSIVE. Exclusive is what rofi uses and what
            // takes the pointer with it; on-demand takes keyboard focus only.
            keymode={Astal.Keymode.ON_DEMAND}
            exclusivity={Astal.Exclusivity.NORMAL}
            anchor={TOP}
            marginTop={70}
            application={app}
            $={(self: Astal.Window) => {
                win = self
                self.connect("notify::visible", () => {
                    if (!self.visible) return
                    // Reset and focus on every open, so the launcher never comes
                    // back showing the last search.
                    text = ""
                    setQuery("")
                    if (entry) {
                        entry.set_text("")
                        entry.grab_focus()
                    }
                })
            }}
        >
            <Gtk.EventControllerKey
                onKeyPressed={(_self, keyval) => {
                    if (keyval === Gdk.KEY_Escape) {
                        close()
                        return true
                    }
                    return false
                }}
            />
            <box class="launcher-box" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
                <entry
                    class="launcher-entry"
                    placeholderText="Search applications"
                    $={(self: Gtk.Entry) => {
                        entry = self
                        self.connect("notify::text", () => {
                            text = self.get_text()
                            setQuery(text)
                        })
                        self.connect("activate", launchFirst)
                    }}
                />
                <box
                    class="launcher-list"
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={2}
                >
                    <For each={results}>
                        {(a: Apps.Application) => (
                            <button class="launcher-item" onClicked={() => launch(a)}>
                                <box spacing={10}>
                                    <label
                                        class="launcher-item-name"
                                        label={a.name}
                                        xalign={0}
                                        hexpand
                                        maxWidthChars={34}
                                        ellipsize={3}
                                    />
                                </box>
                            </button>
                        )}
                    </For>
                </box>
            </box>
        </window>
    )
}
