import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createBinding, createState, For } from "ags"
import app from "ags/gtk4/app"
import { closeOnClickOutside } from "./dismiss"
import Network from "gi://AstalNetwork"

// The wifi button used to launch nm-connection-editor - a separate application,
// mouse-sized, to do what is nearly always one tap: look at the list and join
// something. AstalNetwork is already bound into this process and exposes the
// whole thing, including AccessPoint.activate(password), which reuses a saved
// connection when there is one and creates a WPA-PSK connection when there is
// not. So joining a new network works here too, not just switching between
// remembered ones.
//
// Keymode.ON_DEMAND rather than the NONE the other popups use, because this one
// has a password field. On-demand takes keyboard focus without grabbing the
// pointer, so the bar and the on-screen keyboard stay usable while typing a key
// in - which is the whole reason rofi had to be replaced.

const ICON = {
    WIFI_4:  "\u{f0928}",   // nf-md-wifi_strength_4
    WIFI_3:  "\u{f0925}",   // nf-md-wifi_strength_3
    WIFI_2:  "\u{f0922}",   // nf-md-wifi_strength_2
    WIFI_1:  "\u{f091f}",   // nf-md-wifi_strength_1
    WIFI_0:  "\u{f092f}",   // nf-md-wifi_strength_off
    LOCK:    "\u{f033e}",   // nf-md-lock
    REFRESH: "\u{f0450}",   // nf-md-refresh
}

function strengthIcon(strength: number) {
    if (strength >= 75) return ICON.WIFI_4
    if (strength >= 50) return ICON.WIFI_3
    if (strength >= 25) return ICON.WIFI_2
    if (strength > 0) return ICON.WIFI_1
    return ICON.WIFI_0
}

export default function WifiPopup({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
    const { TOP, RIGHT, BOTTOM, LEFT } = Astal.WindowAnchor
    const connector = gdkmonitor.get_connector() || "unknown"

    const nw = Network.get_default()
    const wifi = nw.wifi

    const enabled = wifi ? createBinding(wifi, "enabled") : null
    const scanning = wifi ? createBinding(wifi, "scanning") : null
    const activeAp = wifi ? createBinding(wifi, "activeAccessPoint") : null
    // The raw list is neither sorted nor unique: a router advertising 2.4 and 5
    // GHz shows up once per band, and a mesh once per node, so the same name
    // appears several times at different strengths while a strong network can
    // sit below a weak one. Keep the strongest BSSID per name and order by
    // signal, which is the order someone scanning the list is looking for.
    const points = wifi
        ? createBinding(wifi, "accessPoints")((aps: Network.AccessPoint[]) => {
              const best = new Map<string, Network.AccessPoint>()
              for (const ap of aps) {
                  const key = ap.ssid || ap.bssid
                  const seen = best.get(key)
                  if (!seen || ap.strength > seen.strength) best.set(key, ap)
              }
              return [...best.values()].sort((a, b) => b.strength - a.strength)
          })
        : null

    // Which access point is waiting for a password, and what has been typed so
    // far. Held here rather than per-row so that opening one password field
    // closes any other, and so the entry survives the list re-sorting under it
    // as signal strengths drift.
    const [pending, setPending] = createState<Network.AccessPoint | null>(null)
    let password = ""

    const join = (ap: Network.AccessPoint) => {
        // Tapping the row whose password field is already open closes it again.
        // Without this the same access point was simply set pending a second
        // time, which is not a state change, so the field stayed put and the row
        // looked unresponsive - there was no way to back out of a prompt except
        // by joining or closing the whole popup.
        const current = pending.get()
        if (current && current.bssid === ap.bssid) {
            password = ""
            setPending(null)
            return
        }

        // A saved connection means NetworkManager already holds the secret, so
        // there is nothing to ask for even on a secured network.
        const known = ap.get_connections().length > 0
        if (ap.requires_password && !known) {
            password = ""
            setPending(ap)
            return
        }
        ap.activate(null, null)
        setPending(null)
    }

    const submit = () => {
        const ap = pending.get()
        if (!ap) return
        ap.activate(password, null)
        password = ""
        setPending(null)
    }

    return (
        <window
            visible={false}
            name={`wifi-popup-${connector}`}
            namespace="wifi-popup"
            class="WifiPopup"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.NORMAL}
            layer={Astal.Layer.TOP}
            keymode={Astal.Keymode.ON_DEMAND}
            anchor={TOP | RIGHT | BOTTOM | LEFT}
            application={app}
            $={(self: Astal.Window) => {
                const content = self.get_child()
                if (content) closeOnClickOutside(self, content)
                self.connect("notify::visible", () => {
                    if (self.visible) {
                        setPending(null)
                        password = ""
                        // A list that is minutes stale is worse than useless, so
                        // rescan whenever the popup is opened.
                        if (wifi?.enabled) wifi.scan()
                    }
                })
            }}
        >
            <box
                class="wf-box"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={10}
                halign={Gtk.Align.END}
                valign={Gtk.Align.START}
                marginTop={40}
                marginEnd={40}
            >
                <box class="wf-head" spacing={8}>
                    <label class="wf-title" label="Wi-Fi" halign={Gtk.Align.START} hexpand />
                    {scanning && (
                        <label
                            class="wf-scanning"
                            label={scanning((s) => (s ? "scanning…" : ""))}
                        />
                    )}
                    <button
                        class="wf-refresh"
                        onClicked={() => wifi?.scan()}
                        tooltipText="Rescan"
                    >
                        <label label={ICON.REFRESH} />
                    </button>
                    {enabled && (
                        <switch
                            class="wf-switch"
                            active={enabled}
                            onNotifyActive={({ active }) => {
                                if (wifi) wifi.enabled = active
                            }}
                        />
                    )}
                </box>

                {points && (
                    // Scrolled and capped: in range of a dozen routers the list
                    // would otherwise grow past the bottom of the screen, and a
                    // layer surface does not get clamped to the output for you.
                    <scrolledwindow
                        class="wf-scroll"
                        hscrollbarPolicy={Gtk.PolicyType.NEVER}
                        propagateNaturalHeight
                        maxContentHeight={420}
                    >
                    <box
                        class="wf-list"
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={3}
                    >
                        <For each={points}>
                            {(ap: Network.AccessPoint) => {
                                // Matched by name, not BSSID. The list keeps one
                                // row per network - the strongest radio of each -
                                // but the radio actually associated is often a
                                // different one, so comparing BSSIDs marked the
                                // connected network as unconnected. Worse, it did
                                // so intermittently: as signal strengths drift the
                                // dedupe picks a different BSSID and the highlight
                                // appears and vanishes on its own.
                                const key = ap.ssid || ap.bssid
                                const active = activeAp
                                    ? activeAp((a) => !!a && (a.ssid || a.bssid) === key)
                                    : null
                                const isPending = pending((p) => p?.bssid === ap.bssid)
                                let rowEntry: Gtk.Entry | null = null
                                return (
                                    <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
                                        <button
                                            cssClasses={
                                                active
                                                    ? active((a) =>
                                                          a
                                                              ? ["wf-ap", "active"]
                                                              : ["wf-ap"]
                                                      )
                                                    : ["wf-ap"]
                                            }
                                            onClicked={(self: Gtk.Widget) => {
                                                // Touch delivers no leave event,
                                                // so without clearing these the
                                                // last row tapped keeps its hover
                                                // and pressed styling and reads
                                                // as the selected network - next
                                                // to the row that actually is
                                                // connected. Same reason the Apps
                                                // button clears its own.
                                                self.unset_state_flags(
                                                    Gtk.StateFlags.PRELIGHT |
                                                    Gtk.StateFlags.ACTIVE
                                                )
                                                join(ap)
                                            }}
                                        >
                                            <box spacing={8}>
                                                <label
                                                    class="wf-sig"
                                                    label={strengthIcon(ap.strength)}
                                                />
                                                <label
                                                    class="wf-ssid"
                                                    label={ap.ssid || "(hidden)"}
                                                    xalign={0}
                                                    hexpand
                                                    maxWidthChars={24}
                                                    ellipsize={3}
                                                />
                                                {ap.requires_password && (
                                                    <label
                                                        class="wf-lock"
                                                        label={ICON.LOCK}
                                                    />
                                                )}
                                                <label
                                                    class="wf-pct"
                                                    label={`${ap.strength}%`}
                                                />
                                            </box>
                                        </button>
                                        <revealer
                                            revealChild={isPending}
                                            transitionType={
                                                Gtk.RevealerTransitionType.SLIDE_DOWN
                                            }
                                            $={(self: Gtk.Revealer) => {
                                                // Wipe the box when the prompt
                                                // folds away. The widget outlives
                                                // the prompt, so without this a
                                                // half-typed password from an
                                                // abandoned attempt is still
                                                // sitting there next time.
                                                self.connect(
                                                    "notify::reveal-child",
                                                    () => {
                                                        if (self.revealChild) return
                                                        rowEntry?.set_text("")
                                                    }
                                                )
                                            }}
                                        >
                                            <box class="wf-pw" spacing={6}>
                                                <entry
                                                    class="wf-pw-entry"
                                                    visibility={false}
                                                    placeholderText="Password"
                                                    hexpand
                                                    $={(self: Gtk.Entry) => {
                                                        rowEntry = self
                                                        self.connect("notify::text", () => {
                                                            password = self.get_text()
                                                        })
                                                        self.connect("activate", submit)
                                                    }}
                                                />
                                                <button
                                                    class="wf-join"
                                                    onClicked={submit}
                                                >
                                                    <label label="Join" />
                                                </button>
                                            </box>
                                        </revealer>
                                    </box>
                                )
                            }}
                        </For>
                    </box>
                    </scrolledwindow>
                )}
            </box>
        </window>
    )
}
