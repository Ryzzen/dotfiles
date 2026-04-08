import { Astal, Gtk } from "ags/gtk4"
import { createBinding, createState, For } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import app from "ags/gtk4/app"
import Wp from "gi://AstalWp"
import Bluetooth from "gi://AstalBluetooth"
import Network from "gi://AstalNetwork"

// Nerd Font icon constants
const ICON = {
    REBOOT:     "\u{f0709}",  // nf-md-restart
    POWEROFF:   "\u{f0425}",  // nf-md-power
    BELL:       "\u{f0f3}",   // nf-fa-bell
    WIFI:       "\u{f1eb}",   // nf-fa-wifi
    BLUETOOTH:  "\u{f293}",   // nf-fa-bluetooth
    VOLUME:     "\u{f057e}",   // nf-md-volume_high
    SPEAKER:    "\u{f057e}",   // nf-md-volume_high
    MIC:        "\u{f130}",   // nf-fa-microphone
    MUTE:       "\u{f0581}",   // nf-md-volume_off
    HEADPHONE:  "\u{f025}",   // nf-fa-headphones
    SETTINGS:   "\u{f013}",   // nf-fa-cog
    CHECK:      "\u{f00c}",   // nf-fa-check
    CIRCLE:     "\u{f111}",   // nf-fa-circle
    MIXER:      "\u{f066a}",   // nf-md-tune_vertical
}

// ── Header ──────────────────────────────────────────────────

function Header() {
    const uptime = createPoll("", 30000, ["bash", "-c",
        "uptime -p | sed 's/up //'",
    ])

    const time = createPoll("", 1000, () => {
        const now = new Date()
        return now.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        })
    })

    return (
        <box class="sp-header" spacing={8}>
            <label class="sp-time" label={time} hexpand halign={Gtk.Align.START} />
            <label class="sp-uptime" label={uptime((u) => `uptime ${u}`)} halign={Gtk.Align.END} />
            <box halign={Gtk.Align.END} class="sp-header-buttons" spacing={8}>
                <button class="sp-header-btn" onClicked={() => execAsync("systemctl reboot")}>
                    <label label={ICON.REBOOT} />
                </button>
                <button class="sp-header-btn" onClicked={() => execAsync("systemctl poweroff")}>
                    <label label={ICON.POWEROFF} />
                </button>
            </box>
        </box>
    )
}

// ── Quick Toggles ───────────────────────────────────────────

function QuickToggles() {
    const nw = Network.get_default()
    const bt = Bluetooth.get_default()
    const btPowered = createBinding(bt, "isPowered")
    const wifiEnabled = nw.wifi ? createBinding(nw.wifi, "enabled") : null

    return (
        <box class="quick-toggles" spacing={8}>
            {/* Notifications toggle placeholder */}
            <button class="toggle-btn">
                <label label={ICON.BELL} />
            </button>

            {/* WiFi toggle */}
            {wifiEnabled && (
                <button
                    cssClasses={wifiEnabled((e) =>
                        e ? ["toggle-btn", "active"] : ["toggle-btn"]
                    )}
                    onClicked={() => {
                        if (nw.wifi) nw.wifi.enabled = !nw.wifi.enabled
                    }}
                >
                    <label label={ICON.WIFI} />
                </button>
            )}

            {/* Bluetooth toggle */}
            <button
                cssClasses={btPowered((p) =>
                    p ? ["toggle-btn", "active"] : ["toggle-btn"]
                )}
                onClicked={() => execAsync("blueman-manager")}
            >
                <label label={ICON.BLUETOOTH} />
            </button>

            {/* Audio panel icon - decorative */}
            <button
                cssClasses={["toggle-btn", "active"]}
                onClicked={() => execAsync("pavucontrol")}
            >
                <label label={ICON.VOLUME} />
            </button>
        </box>
    )
}

// ── Volume Slider ───────────────────────────────────────────

function VolumeSlider({
    endpoint,
    icon,
    label: labelText,
}: {
    endpoint: Wp.Endpoint
    icon: string
    label: string
}) {
    const volume = createBinding(endpoint, "volume")
    const mute = createBinding(endpoint, "mute")

    return (
        <box class="volume-row" spacing={10}>
            <button
                class="mute-btn"
                onClicked={() => (endpoint.mute = !endpoint.mute)}
            >
                <label label={mute((m) => (m ? ICON.MUTE : icon))} />
            </button>
            <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                <box class="volume-label-row">
                    <label
                        class="volume-label"
                        label={labelText}
                        halign={Gtk.Align.START}
                        hexpand
                    />
                    <label
                        class="volume-pct"
                        label={volume((v) => `${Math.round(v * 100)}%`)}
                        halign={Gtk.Align.END}
                    />
                </box>
                <slider
                    class="volume-slider"
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

// ── Audio Section ───────────────────────────────────────────

function AudioSection() {
    const wp = Wp.get_default()!
    const audio = wp.audio!
    const speaker = audio.default_speaker!
    const mic = audio.default_microphone!

    return (
        <box class="audio-section" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
            <label class="section-title" label="Audio" halign={Gtk.Align.START} />

            {/* Default speaker */}
            <VolumeSlider endpoint={speaker} icon={ICON.SPEAKER} label="Speaker" />

            {/* Default microphone */}
            {mic && <VolumeSlider endpoint={mic} icon={ICON.MIC} label="Microphone" />}
        </box>
    )
}

// ── Sink Selector ───────────────────────────────────────────

function SinkSelector() {
    const wp = Wp.get_default()!
    const audio = wp.audio!
    const speakers = createBinding(audio, "speakers")
    const defaultSpeaker = createBinding(audio, "defaultSpeaker")

    return (
        <box class="sink-selector" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <box class="section-header" spacing={8}>
                <label label={ICON.HEADPHONE} class="section-icon" />
                <label class="section-title" label="Sink Selector" halign={Gtk.Align.START} hexpand />
                <button class="section-settings" onClicked={() => execAsync("pavucontrol")}>
                    <label label={ICON.SETTINGS} />
                </button>
            </box>
            <For each={speakers}>
                {(speaker) => {
                    const isDefault = defaultSpeaker((ds) => ds?.id === speaker.id)
                    const cssClasses = isDefault((d) =>
                        d ? ["sink-item", "active"] : ["sink-item"]
                    )
                    const desc = createBinding(speaker, "description")
                    return (
                        <button
                            cssClasses={cssClasses}
                            onClicked={() => (speaker.isDefault = true)}
                        >
                            <box>
                                <label class="sink-check" label={isDefault((d) => d ? ICON.CHECK : ICON.CIRCLE)} />
                                <label class="sink-name" label={desc} hexpand halign={Gtk.Align.START} />
                            </box>
                        </button>
                    )
                }}
            </For>
        </box>
    )
}

// ── Source Selector ──────────────────────────────────────────

function SourceSelector() {
    const wp = Wp.get_default()!
    const audio = wp.audio!
    const microphones = createBinding(audio, "microphones")
    const defaultMic = createBinding(audio, "defaultMicrophone")

    return (
        <box class="source-selector" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <box class="section-header" spacing={8}>
                <label label={ICON.MIC} class="section-icon" />
                <label class="section-title" label="Source Selector" halign={Gtk.Align.START} hexpand />
                <button class="section-settings" onClicked={() => execAsync("pavucontrol")}>
                    <label label={ICON.SETTINGS} />
                </button>
            </box>
            <For each={microphones}>
                {(mic) => {
                    const isDefault = defaultMic((dm) => dm?.id === mic.id)
                    const cssClasses = isDefault((d) =>
                        d ? ["source-item", "active"] : ["source-item"]
                    )
                    const desc = createBinding(mic, "description")
                    return (
                        <button
                            cssClasses={cssClasses}
                            onClicked={() => (mic.isDefault = true)}
                        >
                            <box>
                                <label class="source-check" label={isDefault((d) => d ? ICON.CHECK : ICON.CIRCLE)} />
                                <label class="source-name" label={desc} hexpand halign={Gtk.Align.START} />
                            </box>
                        </button>
                    )
                }}
            </For>
        </box>
    )
}

// ── App Mixer ───────────────────────────────────────────────

function AppMixer() {
    const wp = Wp.get_default()!
    const audio = wp.audio!
    const streams = createBinding(audio, "streams")

    return (
        <box class="app-mixer" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
            <box class="section-header" spacing={8}>
                <label label={ICON.MIXER} class="section-icon" />
                <label class="section-title" label="App Mixer" halign={Gtk.Align.START} hexpand />
                <button class="section-settings" onClicked={() => execAsync("pavucontrol")}>
                    <label label={ICON.SETTINGS} />
                </button>
            </box>
            <For each={streams}>
                {(stream) => {
                    const volume = createBinding(stream, "volume")
                    const desc = createBinding(stream, "description")
                    return (
                        <box class="mixer-item" spacing={8}>
                            <label
                                class="mixer-name"
                                label={desc}
                                maxWidthChars={14}
                                ellipsize={3}
                            />
                            <slider
                                class="mixer-slider"
                                value={volume}
                                min={0}
                                max={1}
                                hexpand
                                onChangeValue={({ value }) => {
                                    stream.volume = value
                                }}
                            />
                            <label
                                class="mixer-pct"
                                label={volume((v) => `${Math.round(v * 100)}%`)}
                            />
                        </box>
                    )
                }}
            </For>
        </box>
    )
}

// ── Side Panel ──────────────────────────────────────────────

export default function SidePanel(monitor: number) {
    const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor

    return (
        <window
            visible={false}
            name="sidepanel"
            namespace="sidepanel"
            class="SidePanel"
            monitor={monitor}
            exclusivity={Astal.Exclusivity.NORMAL}
            layer={Astal.Layer.TOP}
            keymode={Astal.Keymode.ON_DEMAND}
            anchor={TOP | RIGHT | BOTTOM}
            application={app}
            marginTop={6}
            marginRight={6}
            marginBottom={6}
        >
            <Gtk.GestureClick
                button={0}
                propagationPhase={Gtk.PropagationPhase.CAPTURE}
                onPressed={(_self, _nPress, x, y) => {
                    // Close if click is outside the panel content
                }}
            />
            <scrolledwindow class="sp-scroll" hscrollbarPolicy={Gtk.PolicyType.NEVER}>
                <box class="sp-content" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                    <Header />
                    <QuickToggles />
                    <AudioSection />
                    <SinkSelector />
                    <SourceSelector />
                    <AppMixer />
                </box>
            </scrolledwindow>
        </window>
    )
}
