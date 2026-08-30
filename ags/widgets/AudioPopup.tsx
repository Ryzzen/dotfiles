import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createBinding, For } from "ags"
import app from "ags/gtk4/app"
import { closeOnClickOutside } from "./dismiss"
import Wp from "gi://AstalWp"

// The bar's volume control used to be a button that launched pavucontrol: a
// whole separate application, in its own window, to nudge a slider. On a tablet
// that is worse than inconvenient - pavucontrol's own widgets are mouse-sized -
// and it is a strange thing to reach for when wireplumber is already bound into
// this process and the side panel has been driving it directly all along.
//
// So: the same controls, in a popup attached to the button that used to spawn
// it. Keymode.NONE, like the other popups - this needs no keyboard, and asking
// for one would take focus off whatever the user was typing in.

const ICON = {
    SPEAKER: "\u{f057e}",   // nf-md-volume_high
    MUTED:   "\u{f0581}",   // nf-md-volume_off
    MIC:     "\u{f036c}",   // nf-md-microphone
    MIC_OFF: "\u{f036d}",   // nf-md-microphone_off
    APPS:    "\u{f0d1a}",   // nf-md-application_cog
}

// Touch targets first: a slider thin enough to look elegant with a mouse is a
// slider you cannot hit with a thumb, so the styling gives these real height.
function EndpointRow({
    endpoint,
    icon,
    mutedIcon,
    label,
}: {
    endpoint: Wp.Endpoint
    icon: string
    mutedIcon: string
    label: string
}) {
    const volume = createBinding(endpoint, "volume")
    const mute = createBinding(endpoint, "mute")

    return (
        <box class="ap-row" spacing={10}>
            <button
                class="ap-mute"
                onClicked={() => (endpoint.mute = !endpoint.mute)}
            >
                <label label={mute((m) => (m ? mutedIcon : icon))} />
            </button>
            <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                <box>
                    <label
                        class="ap-label"
                        label={label}
                        halign={Gtk.Align.START}
                        hexpand
                    />
                    <label
                        class="ap-pct"
                        label={volume((v) => `${Math.round(v * 100)}%`)}
                        halign={Gtk.Align.END}
                    />
                </box>
                <slider
                    class="ap-slider"
                    value={volume}
                    min={0}
                    max={1}
                    hexpand
                    onChangeValue={({ value }) => {
                        endpoint.volume = value
                    }}
                />
            </box>
        </box>
    )
}

// Output picker. Switching sink is the other thing pavucontrol was being opened
// for, and it is one tap here.
function OutputPicker() {
    const audio = Wp.get_default()!.audio!
    const speakers = createBinding(audio, "speakers")
    const dflt = createBinding(audio, "defaultSpeaker")

    return (
        <box class="ap-section" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <label class="ap-title" label="Output" halign={Gtk.Align.START} />
            <For each={speakers}>
                {(sp: Wp.Endpoint) => {
                    const active = dflt((d) => d?.id === sp.id)
                    return (
                        <button
                            cssClasses={active((a) =>
                                a ? ["ap-device", "active"] : ["ap-device"]
                            )}
                            onClicked={() => (sp.is_default = true)}
                        >
                            <label
                                label={sp.description || sp.name}
                                xalign={0}
                                maxWidthChars={30}
                                ellipsize={3}
                            />
                        </button>
                    )
                }}
            </For>
        </box>
    )
}

// Per-application volumes. This is the part that genuinely needed a mixer, and
// the reason the button reached for pavucontrol in the first place.
function AppMixer() {
    const audio = Wp.get_default()!.audio!
    const streams = createBinding(audio, "streams")

    return (
        <box class="ap-section" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <label class="ap-title" label="Applications" halign={Gtk.Align.START} />
            <For each={streams}>
                {(stream: Wp.Endpoint) => {
                    const volume = createBinding(stream, "volume")
                    const mute = createBinding(stream, "mute")
                    return (
                        <box class="ap-row" spacing={10}>
                            <button
                                class="ap-mute"
                                onClicked={() => (stream.mute = !stream.mute)}
                            >
                                <label
                                    label={mute((m) =>
                                        m ? ICON.MUTED : ICON.SPEAKER
                                    )}
                                />
                            </button>
                            <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                                <box>
                                    <label
                                        class="ap-label"
                                        label={stream.name || "audio"}
                                        halign={Gtk.Align.START}
                                        hexpand
                                        maxWidthChars={22}
                                        ellipsize={3}
                                    />
                                    <label
                                        class="ap-pct"
                                        label={volume((v) => `${Math.round(v * 100)}%`)}
                                        halign={Gtk.Align.END}
                                    />
                                </box>
                                <slider
                                    class="ap-slider"
                                    value={volume}
                                    min={0}
                                    max={1}
                                    hexpand
                                    onChangeValue={({ value }) => {
                                        stream.volume = value
                                    }}
                                />
                            </box>
                        </box>
                    )
                }}
            </For>
        </box>
    )
}

export default function AudioPopup({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
    const { TOP, RIGHT, BOTTOM, LEFT } = Astal.WindowAnchor
    const connector = gdkmonitor.get_connector() || "unknown"
    const audio = Wp.get_default()!.audio!

    return (
        <window
            visible={false}
            name={`audio-popup-${connector}`}
            namespace="audio-popup"
            class="AudioPopup"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.NORMAL}
            layer={Astal.Layer.TOP}
            keymode={Astal.Keymode.NONE}
            // Covers the screen so a click beside it can be caught; the box
            // inside is what is actually visible, held in the same spot the
            // window used to be anchored to.
            anchor={TOP | RIGHT | BOTTOM | LEFT}
            application={app}
            $={(self: Astal.Window) => {
                const content = self.get_child()
                if (content) closeOnClickOutside(self, content)
            }}
        >
            <box
                class="ap-box"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={10}
                halign={Gtk.Align.END}
                valign={Gtk.Align.START}
                marginTop={40}
                marginEnd={90}
            >
                <EndpointRow
                    endpoint={audio.default_speaker!}
                    icon={ICON.SPEAKER}
                    mutedIcon={ICON.MUTED}
                    label="Speaker"
                />
                <EndpointRow
                    endpoint={audio.default_microphone!}
                    icon={ICON.MIC}
                    mutedIcon={ICON.MIC_OFF}
                    label="Microphone"
                />
                <OutputPicker />
                <AppMixer />
            </box>
        </window>
    )
}
