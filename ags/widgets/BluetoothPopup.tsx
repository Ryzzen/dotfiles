import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createBinding, For } from "ags"
import app from "ags/gtk4/app"
import { closeOnClickOutside } from "./dismiss"
import Bluetooth from "gi://AstalBluetooth"

// Third of these: the bluetooth button launched blueman-manager, as the volume
// button launched pavucontrol and the network button nm-connection-editor. Same
// answer - AstalBluetooth is already in this process and exposes powering,
// discovery, and connecting per device.
//
// Keymode.NONE: nothing here is typed into. Bluetooth pairing can demand a PIN,
// but that is agent territory and belongs to whatever pairing agent the session
// runs, not to a popup on a bar.

const ICON = {
    BT:        "\u{f00af}",  // nf-md-bluetooth
    BT_OFF:    "\u{f00b2}",  // nf-md-bluetooth_off
    BT_CONN:   "\u{f00b1}",  // nf-md-bluetooth_connect
    REFRESH:   "\u{f0450}",  // nf-md-refresh
    BATTERY:   "\u{f0079}",  // nf-md-battery
}

export default function BluetoothPopup({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
    const { TOP, RIGHT, BOTTOM, LEFT } = Astal.WindowAnchor
    const connector = gdkmonitor.get_connector() || "unknown"

    const bt = Bluetooth.get_default()
    const powered = createBinding(bt, "isPowered")

    // Connected first, then paired, then whatever discovery has turned up, each
    // group by name. A flat list ordered by however bluez happened to hand them
    // over puts the headphones you are using below a stranger's television.
    // A device with no friendly name is shown by bluez as its own address with
    // the colons swapped for dashes. In a dense area those anonymous entries -
    // phones, cars, televisions passing by - outnumber the ones worth tapping,
    // so they sort last rather than being hidden: still reachable to pair
    // something new, never in the way of the headphones.
    const anonymous = (d: Bluetooth.Device) => {
        const label = d.alias || d.name || ""
        return label.replace(/-/g, ":").toUpperCase() === (d.address || "").toUpperCase()
    }

    const devices = createBinding(bt, "devices")((ds: Bluetooth.Device[]) => {
        const rank = (d: Bluetooth.Device) =>
            d.connected ? 0 : d.paired ? 1 : anonymous(d) ? 3 : 2
        return [...ds]
            .filter((d) => d.name || d.alias)
            .sort((a, b) => {
                const r = rank(a) - rank(b)
                if (r !== 0) return r
                return (a.alias || a.name || "").localeCompare(b.alias || b.name || "")
            })
    })

    const toggleDevice = (d: Bluetooth.Device) => {
        if (d.connected) d.disconnect_device(null)
        else d.connect_device(null)
    }

    const rescan = () => {
        const ad = bt.adapter
        if (!ad) return
        // Toggled rather than started blindly: leaving discovery running burns
        // power and keeps the list churning under the user's finger.
        if (ad.discovering) ad.stop_discovery()
        else ad.start_discovery()
    }

    return (
        <window
            visible={false}
            name={`bt-popup-${connector}`}
            namespace="bt-popup"
            class="BtPopup"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.NORMAL}
            layer={Astal.Layer.TOP}
            keymode={Astal.Keymode.NONE}
            anchor={TOP | RIGHT | BOTTOM | LEFT}
            application={app}
            $={(self: Astal.Window) => {
                const content = self.get_child()
                if (content) closeOnClickOutside(self, content)
                self.connect("notify::visible", () => {
                    // Discovery is stopped on close so it cannot be left running
                    // out of sight, draining the battery of a tablet in a bag.
                    if (!self.visible) bt.adapter?.stop_discovery()
                })
            }}
        >
            <box
                class="bt-box"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={10}
                halign={Gtk.Align.END}
                valign={Gtk.Align.START}
                marginTop={40}
                marginEnd={70}
            >
                <box class="bt-head" spacing={8}>
                    <label class="bt-title" label="Bluetooth" halign={Gtk.Align.START} hexpand />
                    <button class="bt-refresh" onClicked={rescan} tooltipText="Scan">
                        <label label={ICON.REFRESH} />
                    </button>
                    <switch
                        class="bt-switch"
                        active={powered}
                        onNotifyActive={({ active }) => {
                            const ad = bt.adapter
                            if (ad && ad.powered !== active) bt.toggle()
                        }}
                    />
                </box>

                <scrolledwindow
                    class="bt-scroll"
                    hscrollbarPolicy={Gtk.PolicyType.NEVER}
                    propagateNaturalHeight
                    maxContentHeight={420}
                >
                    <box class="bt-list" orientation={Gtk.Orientation.VERTICAL} spacing={3}>
                        <For each={devices}>
                            {(d: Bluetooth.Device) => {
                                const connected = createBinding(d, "connected")
                                const connecting = createBinding(d, "connecting")
                                const battery = createBinding(d, "batteryPercentage")
                                return (
                                    <button
                                        cssClasses={connected((c) =>
                                            c ? ["bt-dev", "active"] : ["bt-dev"]
                                        )}
                                        onClicked={(self: Gtk.Widget) => {
                                            // Touch leaves the cursor on the row,
                                            // so :hover would otherwise stick and
                                            // read as connected state.
                                            self.unset_state_flags(
                                                Gtk.StateFlags.PRELIGHT |
                                                Gtk.StateFlags.ACTIVE
                                            )
                                            toggleDevice(d)
                                        }}
                                    >
                                        <box spacing={8}>
                                            <label
                                                class="bt-dev-icon"
                                                label={connected((c) =>
                                                    c ? ICON.BT_CONN : ICON.BT
                                                )}
                                            />
                                            <label
                                                class="bt-dev-name"
                                                label={d.alias || d.name || d.address}
                                                xalign={0}
                                                hexpand
                                                maxWidthChars={24}
                                                ellipsize={3}
                                            />
                                            <label
                                                class="bt-dev-batt"
                                                label={battery((b) =>
                                                    b > 0 ? `${Math.round(b * 100)}%` : ""
                                                )}
                                            />
                                            <label
                                                class="bt-dev-state"
                                                label={connecting((ing) =>
                                                    ing ? "…" : d.paired ? "paired" : ""
                                                )}
                                            />
                                        </box>
                                    </button>
                                )
                            }}
                        </For>
                    </box>
                </scrolledwindow>
            </box>
        </window>
    )
}
