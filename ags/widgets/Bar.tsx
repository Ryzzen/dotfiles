import { Astal, Gtk } from "ags/gtk4"
import { createBinding, createComputed, For } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import { readFile } from "ags/file"
import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import Hyprland from "gi://AstalHyprland"
import Wp from "gi://AstalWp"
import Network from "gi://AstalNetwork"
import Battery from "gi://AstalBattery"
import Bluetooth from "gi://AstalBluetooth"
import Tray from "gi://AstalTray"

// Nerd Font icon constants (CaskaydiaCove Nerd Font codepoints)
const ICON = {
    // Volume
    VOL_MUTE:   "\u{f0581}",  // nf-md-volume_off
    VOL_LOW:    "\u{f057f}",  // nf-md-volume_low
    VOL_MED:    "\u{f0580}",  // nf-md-volume_medium
    VOL_HIGH:   "\u{f057e}",  // nf-md-volume_high
    // Bluetooth
    BT_ON:      "\u{f293}",  // nf-fa-bluetooth
    BT_OFF:     "\u{f294}",  // nf-fa-bluetooth_b
    // Network
    WIFI:       "\u{f1eb}",  // nf-fa-wifi
    ETH:        "\u{f6ff}",  // nf-md-ethernet
    NET_OFF:    "\u{f467}",  // nf-md-wifi_off
    // Battery
    BAT_100:    "\u{f240}",  // nf-fa-battery_full
    BAT_75:     "\u{f241}",  // nf-fa-battery_three_quarters
    BAT_50:     "\u{f242}",  // nf-fa-battery_half
    BAT_25:     "\u{f243}",  // nf-fa-battery_quarter
    BAT_0:      "\u{f244}",  // nf-fa-battery_empty
    CHARGING:   "\u{f0e7}",  // nf-fa-bolt
    // Hardware
    CPU:        "\u{f4bc}",  // nf-md-cpu_64_bit
    MEM:        "\u{f035b}", // nf-md-memory
    DISK:       "\u{f02ca}", // nf-md-harddisk
    // Quick links
    CHAT:       "\u{f0b79}",  // nf-md-chat
    FOLDER:     "\u{f07c}",  // nf-fa-folder_open
    WINDOWS:    "\u{f17a}",  // nf-fa-windows
    ANDROID:    "\u{f17b}",  // nf-fa-android
    // Power
    POWER:      "\u{f011}",  // nf-fa-power_off
}

// Read surface color from pywal for Cairo drawing (+20 lighten to match CSS surface)
function walSurface(): [number, number, number] {
    const home = GLib.get_home_dir()
    const line = readFile(`${home}/.cache/wal/colors`).trim().split("\n")[0]
    const r = Math.min(255, parseInt(line.slice(1, 3), 16) + 20) / 255
    const g = Math.min(255, parseInt(line.slice(3, 5), 16) + 20) / 255
    const b = Math.min(255, parseInt(line.slice(5, 7), 16) + 20) / 255
    return [r, g, b]
}
const [S_R, S_G, S_B] = walSurface()

function RoundedAngle({ place }: { place: "topleft" | "topright" }) {
    return (
        <drawingarea
            vexpand
            contentWidth={48}
            $={(self: Gtk.DrawingArea) => {
                self.set_draw_func((_area, cr, width, height) => {
                    cr.setSourceRGBA(S_R, S_G, S_B, 1)

                    if (place === "topright") {
                        cr.moveTo(width, 0)
                        cr.curveTo(width / 2, 0, width / 2, height, 0, height)
                        cr.lineTo(0, 0)
                    } else {
                        cr.moveTo(0, 0)
                        cr.curveTo(width / 2, 0, width / 2, height, width, height)
                        cr.lineTo(width, 0)
                    }
                    cr.closePath()
                    cr.fill()
                })
            }}
        />
    )
}

// ── App Menu ────────────────────────────────────────────────

function AppMenuButton() {
    return (
        <button class="appmenu-btn" onClicked={() => execAsync("rofi -show drun")}>
            <label label="Apps" />
        </button>
    )
}

// ── Quick Links ─────────────────────────────────────────────

function QuickLinks() {
    return (
        <box class="quicklinks" spacing={2}>
            <button
                class="quicklink-btn"
                tooltipText="ChatGPT"
                onClicked={() => execAsync("chromium https://chat.openai.com")}
            >
                <label label={ICON.CHAT} />
            </button>
            <button
                class="quicklink-btn"
                tooltipText="File Manager"
                onClicked={() => execAsync("thunar")}
            >
                <label label={ICON.FOLDER} />
            </button>
            <button
                class="quicklink-btn"
                tooltipText="Windows 11 VM"
                onClicked={() => execAsync(["bash", "-c", "virsh --connect qemu:///system start win11 && virt-viewer --connect qemu:///system win11"])}
            >
                <label label={ICON.WINDOWS} />
            </button>
            <button
                class="quicklink-btn"
                tooltipText="Android Emulator"
                onClicked={() => execAsync("run-test-emulator")}
            >
                <label label={ICON.ANDROID} />
            </button>
        </box>
    )
}

// ── Workspaces ──────────────────────────────────────────────

function Workspaces() {
    const hypr = Hyprland.get_default()
    const workspaces = createBinding(hypr, "workspaces")
    const focusedWs = createBinding(hypr, "focusedWorkspace")

    return (
        <box class="ws-container" spacing={0}>
            <For each={workspaces}>
                {(ws) => {
                    const isFocused = focusedWs((fw) => fw?.id === ws.id)
                    const cssClasses = isFocused((f) =>
                        f ? ["ws-button", "active"] : ["ws-button"]
                    )
                    return (
                        <button cssClasses={cssClasses} onClicked={() => ws.focus()}>
                            <label class="ws-button-label" label={String(ws.id)} />
                        </button>
                    )
                }}
            </For>
        </box>
    )
}

// ── Focused Title ────────────────────────────────────────────

function FocusedTitle() {
    const hypr = Hyprland.get_default()
    const client = createBinding(hypr, "focusedClient")

    const wmClass = client((c) => (c?.class?.length ? c.class : "Desktop"))
    const title = client((c) => (c?.title?.length ? c.title : "Desktop"))

    return (
        <box class="title-box" orientation={Gtk.Orientation.VERTICAL}>
            <label
                class="title-class"
                label={wmClass}
                halign={Gtk.Align.END}
                maxWidthChars={22}
                ellipsize={3}
            />
            <label
                class="title-title"
                label={title}
                halign={Gtk.Align.END}
                maxWidthChars={22}
                ellipsize={3}
            />
        </box>
    )
}

// ── System Tray ─────────────────────────────────────────────

function SysTray() {
    const tray = Tray.get_default()
    const items = createBinding(tray, "items")

    return (
        <box class="systray-container" spacing={5}>
            <For each={items}>
                {(item) => {
                    const icon = createBinding(item, "gicon")
                    return (
                        <menubutton
                            class="systray-item"
                            tooltipText={createBinding(item, "tooltipMarkup")}
                            menuModel={item.menuModel}
                            $={(self) =>
                                self.insert_action_group("dbusmenu", item.actionGroup)
                            }
                        >
                            <image gicon={icon} pixelSize={16} />
                        </menubutton>
                    )
                }}
            </For>
        </box>
    )
}

// ── Audio Indicator ─────────────────────────────────────────

function AudioIndicator() {
    const wp = Wp.get_default()!
    const speaker = wp.audio.default_speaker!
    const volume = createBinding(speaker, "volume")
    const mute = createBinding(speaker, "mute")

    const icon = createComputed(() => {
        if (mute()) return ICON.VOL_MUTE
        const vol = Math.round(volume() * 100)
        if (vol === 0) return ICON.VOL_MUTE
        if (vol < 33) return ICON.VOL_LOW
        if (vol < 66) return ICON.VOL_MED
        return ICON.VOL_HIGH
    })
    const label = volume((v) => ` ${Math.round(v * 100)}%`)
    const cssClasses = mute((m) =>
        m ? ["bar-indicator", "muted"] : ["bar-indicator"]
    )

    return (
        <button
            cssClasses={cssClasses}
            onClicked={() => execAsync("pavucontrol")}
        >
            <box spacing={4}>
                <label label={icon} />
                <label label={label} />
            </box>
        </button>
    )
}

// ── Bluetooth ───────────────────────────────────────────────

function BluetoothIndicator() {
    const bt = Bluetooth.get_default()
    const powered = createBinding(bt, "isPowered")
    const cssClasses = powered((p) =>
        p ? ["bar-indicator", "bt-on"] : ["bar-indicator", "bt-off"]
    )
    const icon = powered((p) => (p ? ICON.BT_ON : ICON.BT_OFF))

    return (
        <button
            cssClasses={cssClasses}
            onClicked={() => execAsync("blueman-manager")}
        >
            <label label={icon} />
        </button>
    )
}

// ── Network ─────────────────────────────────────────────────

function NetworkIndicator() {
    const nw = Network.get_default()
    const primary = createBinding(nw, "primary")
    const wifi = nw.wifi
    const wired = nw.wired

    const label = primary((p) => {
        if (p === Network.Primary.WIFI && wifi)
            return `${ICON.WIFI}  ${wifi.strength}%`
        if (p === Network.Primary.WIRED && wired)
            return `${ICON.ETH}  ${wired.speed > 0 ? wired.speed + "Mb/s" : "Wired"}`
        return `${ICON.NET_OFF}  --`
    })

    return (
        <button
            class="bar-indicator"
            onClicked={() => execAsync("nm-connection-editor")}
        >
            <label label={label} />
        </button>
    )
}

// ── Battery ─────────────────────────────────────────────────

function BatteryIndicator() {
    const bat = Battery.get_default()
    const percentage = createBinding(bat, "percentage")
    const charging = createBinding(bat, "charging")
    const available = createBinding(bat, "isPresent")

    const icon = percentage((p) => {
        const pct = Math.round(p * 100)
        if (pct > 80) return ICON.BAT_100
        if (pct > 60) return ICON.BAT_75
        if (pct > 40) return ICON.BAT_50
        if (pct > 20) return ICON.BAT_25
        return ICON.BAT_0
    })
    const pctLabel = percentage((p) => ` ${Math.round(p * 100)}%`)
    const chargingIcon = charging((c) => (c ? `${ICON.CHARGING} ` : ""))

    const cssClasses = percentage((p) => {
        const cls = ["bar-indicator", "battery"]
        if (p < 0.15) cls.push("critical")
        else if (p < 0.3) cls.push("warning")
        return cls
    })

    return (
        <box cssClasses={cssClasses} visible={available} spacing={2}>
            <label label={chargingIcon} />
            <label label={icon} />
            <label label={pctLabel} />
        </box>
    )
}

// ── Hardware Stats ──────────────────────────────────────────

function HardwareStats() {
    const cpu = createPoll("0", 3000, [
        "bash",
        "-c",
        "top -bn1 | grep 'Cpu(s)' | awk '{print int($2+$4)}'",
    ])
    const mem = createPoll("0", 5000, [
        "bash",
        "-c",
        "free | awk '/Mem:/{print int($3/$2*100)}'",
    ])
    const disk = createPoll("0", 30000, [
        "bash",
        "-c",
        "df / | awk 'NR==2{print int($5)}'",
    ])

    const toggleHw = () => {
        const win = app.get_window("hw-popup")
        if (win) win.visible = !win.visible
    }

    return (
        <box class="hw-stats" spacing={8}>
            <button onClicked={toggleHw}>
                <label label={cpu((c) => `${ICON.CPU} ${c}%`)} />
            </button>
            <button onClicked={toggleHw}>
                <label label={mem((m) => `${ICON.MEM} ${m}%`)} />
            </button>
            <button onClicked={toggleHw}>
                <label label={disk((d) => `${ICON.DISK} ${d}%`)} />
            </button>
        </box>
    )
}

// ── Clock ───────────────────────────────────────────────────

function Clock() {
    const time = createPoll("", 1000, ["date", "+%H:%M:%S"])
    const date = createPoll("", 5000, ["date", "+%a %Y-%m-%d"])

    const toggleCal = () => {
        const win = app.get_window("calendar-popup")
        if (win) win.visible = !win.visible
    }

    return (
        <button class="clock-container" onClicked={toggleCal}>
            <box orientation={Gtk.Orientation.VERTICAL}>
                <label class="clock-date" label={date} halign={Gtk.Align.END} />
                <label class="clock-time" label={time} halign={Gtk.Align.END} />
            </box>
        </button>
    )
}

// ── Power Button ────────────────────────────────────────────

function PowerButton() {
    return (
        <button class="power-btn" onClicked={() => execAsync("wlogout")}>
            <label label={ICON.POWER} />
        </button>
    )
}

// ── Bar ─────────────────────────────────────────────────────

export default function Bar(monitor: number) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

    return (
        <window
            visible
            name="bar"
            namespace="bar"
            class="Bar"
            monitor={monitor}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            anchor={TOP | LEFT | RIGHT}
            application={app}
        >
            <centerbox class="bar-inner">
                {/* ── Left: appmenu + quicklinks + title + angle ── */}
                <box $type="start">
                    <box class="bar-left" spacing={4}>
                        <AppMenuButton />
                        <QuickLinks />
                        <SysTray />
                        <FocusedTitle />
                    </box>
                    <RoundedAngle place="topright" />
                </box>

                {/* ── Center: workspaces ── */}
                <box $type="center">
                    <RoundedAngle place="topleft" />
                    <Workspaces />
                    <RoundedAngle place="topright" />
                </box>

                {/* ── Right: angle + indicators + clock ── */}
                <box $type="end">
                    <box hexpand />
                    <RoundedAngle place="topleft" />
                    <box class="bar-right" spacing={4}>
                        <HardwareStats />
                        <AudioIndicator />
                        <BluetoothIndicator />
                        <NetworkIndicator />
                        <BatteryIndicator />
                        <Clock />
                        <PowerButton />
                    </box>
                </box>
            </centerbox>
        </window>
    )
}
