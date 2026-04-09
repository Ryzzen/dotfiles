import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createBinding, createComputed, For } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import app from "ags/gtk4/app"
import GLib from "gi://GLib"
import Graphene from "gi://Graphene"
import Hyprland from "gi://AstalHyprland"
import Wp from "gi://AstalWp"
import Network from "gi://AstalNetwork"
import Battery from "gi://AstalBattery"
import Bluetooth from "gi://AstalBluetooth"
import Tray from "gi://AstalTray"
import cairo from "cairo"
import { getWalSurface, getWalPrimary, getWalAccent2 } from "../walColors"

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

// ── Animated border ────────────────────────────────────────

const ANIM_PERIOD = 4.0   // seconds for full ping-pong cycle
const BORDER_PX = 2
const PULSE_W = 0.07      // pulse glow radius (fraction of path length)
const TRAIL_LEN = 0.18    // trail length behind pulse
const TRAIL_ALPHA = 0.18  // max trail brightness
const ANGLE_W = 48        // must match RoundedAngle contentWidth
const CURVE_STEPS = 64
const LINE_STEPS = 64     // subdivide straight sections too

// Per-monitor section widget refs for the border overlay (keyed by connector name).
// left/center/right are the three main content boxes; angleL is the topright angle
// immediately after bar-left, angleCL/angleCR are the topleft/topright angles that
// flank the workspaces box, and angleR is the topleft angle just before bar-right.
type BarRefs = {
    left: Gtk.Widget | null
    center: Gtk.Widget | null
    right: Gtk.Widget | null
    angleL: Gtk.Widget | null
    angleCL: Gtk.Widget | null
    angleCR: Gtk.Widget | null
    angleR: Gtk.Widget | null
}
const barRefs = new Map<string, BarRefs>()

function easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2
}

function gaussFalloff(dist: number, radius: number): number {
    if (dist > radius) return 0
    const x = dist / radius
    return Math.exp(-x * x * 5)
}

// Ping-pong: 0→0.5→0 smoothly (no discontinuity)
function getAnimPos(): number {
    const raw = ((GLib.get_monotonic_time() / 1_000_000) % ANIM_PERIOD) / ANIM_PERIOD
    // 0→1→0 triangle wave
    const tri = raw < 0.5 ? raw * 2 : 2 - raw * 2
    return easeInOutSine(tri) * 0.5  // 0→0.5→0
}

function bezierVal(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
}

type Pt = { x: number; y: number }

function addCurve(pts: Pt[], x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
    for (let i = 1; i <= CURVE_STEPS; i++) {
        const t = i / CURVE_STEPS
        pts.push({ x: bezierVal(t, x0, x1, x2, x3), y: bezierVal(t, y0, y1, y2, y3) })
    }
}

// Subdivide a straight line into many small segments for even rendering
function addLine(pts: Pt[], x0: number, y0: number, x1: number, y1: number) {
    for (let i = 1; i <= LINE_STEPS; i++) {
        const t = i / LINE_STEPS
        pts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t })
    }
}

function BorderOverlay({ connector }: { connector: string }) {
    return (
        <drawingarea
            hexpand
            vexpand
            canTarget={false}
            $={(self: Gtk.DrawingArea) => {
                self.set_draw_func((_da, cr, totalW, totalH) => {
                    if (!self.get_mapped()) return
                    const refs = barRefs.get(connector)
                    if (
                        !refs?.left || !refs?.center || !refs?.right ||
                        !refs?.angleL || !refs?.angleCL || !refs?.angleCR || !refs?.angleR ||
                        totalW <= 0
                    ) return
                    if (
                        !refs.left.get_mapped() || !refs.center.get_mapped() || !refs.right.get_mapped() ||
                        !refs.angleL.get_mapped() || !refs.angleCL.get_mapped() ||
                        !refs.angleCR.get_mapped() || !refs.angleR.get_mapped()
                    ) return

                    const origin = new Graphene.Point({ x: 0, y: 0 })
                    const getX = (w: Gtk.Widget): number | null => {
                        const [ok, pt] = w.compute_point(self, origin)
                        return ok ? pt.x : null
                    }

                    const lx = getX(refs.left)
                    const cx = getX(refs.center)
                    const rx = getX(refs.right)
                    const alx = getX(refs.angleL)
                    const clx = getX(refs.angleCL)
                    const crx = getX(refs.angleCR)
                    const arx = getX(refs.angleR)
                    if (
                        lx === null || cx === null || rx === null ||
                        alx === null || clx === null || crx === null || arx === null
                    ) return

                    const lw = refs.left.get_width()
                    const cw = refs.center.get_width()
                    const rw = refs.right.get_width()
                    const alw = refs.angleL.get_width()
                    const clw = refs.angleCL.get_width()
                    const crw = refs.angleCR.get_width()
                    const arw = refs.angleR.get_width()
                    // Bottom of the curves: match the angle widget's *actual* drawn
                    // bottom exactly, so the Bezier control points (P2/P3) are at the
                    // same y as the angle widget's curveTo endpoint. Using totalH -
                    // BORDER_PX/2 vertically compresses the S-curve relative to the
                    // angle's own curve and pushes the stroke inside the filled
                    // wedge on the curved sides.
                    const bot = refs.angleCL.get_height()

                    // Build three island contours with evenly subdivided segments.
                    // Each curve uses the angle widget's actual position and width so
                    // the border path exactly tracks the filled angle shape; each
                    // addLine spans from the box edge to the angle edge, so any
                    // centerbox gap between the two is bridged along the bottom.

                    // Island 1: bar-left bottom → topright angle curve up
                    const i1: Pt[] = [{ x: lx, y: bot }]
                    addLine(i1, lx, bot, alx, bot)
                    addCurve(i1, alx, bot, alx + alw / 2, bot, alx + alw / 2, 0, alx + alw, 0)

                    // Island 2: topleft angle curve down → workspaces bottom → topright angle curve up
                    const i2: Pt[] = [{ x: clx, y: 0 }]
                    addCurve(i2, clx, 0, clx + clw / 2, 0, clx + clw / 2, bot, clx + clw, bot)
                    addLine(i2, clx + clw, bot, crx, bot)
                    addCurve(i2, crx, bot, crx + crw / 2, bot, crx + crw / 2, 0, crx + crw, 0)

                    // Island 3: topleft angle curve down → bar-right bottom
                    const i3: Pt[] = [{ x: arx, y: 0 }]
                    addCurve(i3, arx, 0, arx + arw / 2, 0, arx + arw / 2, bot, arx + arw, bot)
                    addLine(i3, arx + arw, bot, rx + rw, bot)

                    // Compute cumulative arc-length for each island
                    function arcLengths(pts: Pt[]): number[] {
                        const lens = [0]
                        for (let i = 1; i < pts.length; i++) {
                            const dx = pts[i].x - pts[i - 1].x
                            const dy = pts[i].y - pts[i - 1].y
                            lens.push(lens[i - 1] + Math.sqrt(dx * dx + dy * dy))
                        }
                        return lens
                    }

                    // Build a single unified path across all islands for consistent parameterization
                    const allIslands = [i1, i2, i3]
                    const allLens = allIslands.map(arcLengths)
                    const islandTotalLens = allLens.map(l => l[l.length - 1])
                    const grandTotal = islandTotalLens.reduce((a, b) => a + b, 0)

                    // Cumulative offset per island in the grand path
                    const islandOffsets = [0, islandTotalLens[0], islandTotalLens[0] + islandTotalLens[1]]

                    // Animation: ping-pong pulses (no discontinuity)
                    const animPos = getAnimPos()  // 0→0.5→0 smoothly
                    const [pr, pg, pb] = getWalPrimary()
                    const [ar, ag, ab] = getWalAccent2()

                    const leftPos = animPos          // 0 → 0.5 → 0
                    const rightPos = 1 - animPos     // 1 → 0.5 → 1

                    // Meeting flash when pulses converge at center
                    const meetDist = rightPos - leftPos
                    const meetGlow = meetDist < 0.12 ? (1 - meetDist / 0.12) * 0.35 : 0

                    cr.setLineWidth(BORDER_PX)
                    cr.setLineCap(1)  // ROUND
                    cr.setLineJoin(1) // ROUND

                    // Helper: compute color at a given path fraction
                    function colorAt(frac: number): [number, number, number, number] {
                        let alpha = 0, rr = 0, gg = 0, bb = 0

                        const lDist = Math.abs(frac - leftPos)
                        const lGlow = gaussFalloff(lDist, PULSE_W) * 0.9
                        if (lGlow > alpha) { alpha = lGlow; rr = pr; gg = pg; bb = pb }

                        if (frac < leftPos && frac > leftPos - TRAIL_LEN) {
                            const tf = (leftPos - frac) / TRAIL_LEN
                            const ta = TRAIL_ALPHA * (1 - tf * tf)
                            if (ta > alpha) { alpha = ta; rr = pr; gg = pg; bb = pb }
                        }

                        const rDist = Math.abs(frac - rightPos)
                        const rGlow = gaussFalloff(rDist, PULSE_W) * 0.9
                        if (rGlow > alpha) { alpha = rGlow; rr = ar; gg = ag; bb = ab }

                        if (frac > rightPos && frac < rightPos + TRAIL_LEN) {
                            const tf = (frac - rightPos) / TRAIL_LEN
                            const ta = TRAIL_ALPHA * (1 - tf * tf)
                            if (ta > alpha) { alpha = ta; rr = ar; gg = ag; bb = ab }
                        }

                        if (meetGlow > 0) {
                            const centerDist = Math.abs(frac - 0.5)
                            const cg = meetGlow * gaussFalloff(centerDist, 0.3)
                            if (cg > 0) {
                                const mr = pr * 0.5 + ar * 0.5
                                const mg = pg * 0.5 + ag * 0.5
                                const mb = pb * 0.5 + ab * 0.5
                                alpha = Math.min(1, alpha + cg)
                                rr = rr * (1 - cg) + mr * cg
                                gg = gg * (1 - cg) + mg * cg
                                bb = bb * (1 - cg) + mb * cg
                            }
                        }

                        return [rr, gg, bb, alpha]
                    }

                    // Draw each island as one continuous path with a gradient
                    for (let isle = 0; isle < 3; isle++) {
                        const pts = allIslands[isle]
                        const lens = allLens[isle]
                        const offset = islandOffsets[isle]
                        const totalLen = islandTotalLens[isle]

                        if (pts.length < 2 || totalLen <= 0) continue

                        const x0 = pts[0].x
                        const x1 = pts[pts.length - 1].x
                        if (Math.abs(x1 - x0) < 1) continue

                        // Build gradient with color stops at each point's x-position
                        const grad = new cairo.LinearGradient(x0, 0, x1, 0)
                        for (let j = 0; j < pts.length; j++) {
                            const frac = (offset + lens[j]) / grandTotal
                            const [r, g, b, a] = colorAt(frac)
                            const stop = (pts[j].x - x0) / (x1 - x0)
                            grad.addColorStopRGBA(Math.max(0, Math.min(1, stop)), r, g, b, a)
                        }

                        // Build continuous path and stroke once
                        cr.newPath()
                        cr.moveTo(pts[0].x, pts[0].y)
                        for (let j = 1; j < pts.length; j++) {
                            cr.lineTo(pts[j].x, pts[j].y)
                        }
                        cr.setSource(grad)
                        cr.stroke()
                    }
                })

                self.add_tick_callback(() => {
                    if (!self.get_mapped()) return true
                    self.queue_draw()
                    return true
                })
            }}
        />
    )
}

// ── RoundedAngle ───────────────────────────────────────────

function RoundedAngle({
    place,
    setup,
}: {
    place: "topleft" | "topright"
    setup?: (self: Gtk.Widget) => void
}) {
    return (
        <drawingarea
            vexpand
            contentWidth={ANGLE_W}
            $={(self: Gtk.DrawingArea) => {
                setup?.(self)
                self.set_draw_func((_area, cr, width, height) => {
                    const [r, g, b] = getWalSurface()
                    cr.setSourceRGBA(r, g, b, 1)

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

function Workspaces({ setup }: { setup?: (self: Gtk.Widget) => void }) {
    const hypr = Hyprland.get_default()
    const workspaces = createBinding(hypr, "workspaces")
    const focusedWs = createBinding(hypr, "focusedWorkspace")

    return (
        <box class="ws-container" spacing={0} $={setup}>
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

function Bar({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
    const connector = gdkmonitor.get_connector() || "unknown"
    const refs: BarRefs = {
        left: null,
        center: null,
        right: null,
        angleL: null,
        angleCL: null,
        angleCR: null,
        angleR: null,
    }
    barRefs.set(connector, refs)

    return (
        <window
            visible
            name={`bar-${connector}`}
            namespace="bar"
            class="Bar"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            anchor={TOP | LEFT | RIGHT}
            application={app}
        >
            <overlay>
                <centerbox class="bar-inner">
                    {/* ── Left: appmenu + quicklinks + tray + title + angle ── */}
                    <box $type="start">
                        <box class="bar-left" $={(s: Gtk.Widget) => { refs.left = s }} spacing={4}>
                            <AppMenuButton />
                            <QuickLinks />
                            <SysTray />
                            <FocusedTitle />
                        </box>
                        <RoundedAngle place="topright" setup={(s) => { refs.angleL = s }} />
                    </box>

                    {/* ── Center: workspaces ── */}
                    <box $type="center">
                        <RoundedAngle place="topleft" setup={(s) => { refs.angleCL = s }} />
                        <Workspaces setup={(s: Gtk.Widget) => { refs.center = s }} />
                        <RoundedAngle place="topright" setup={(s) => { refs.angleCR = s }} />
                    </box>

                    {/* ── Right: angle + indicators + clock ── */}
                    <box $type="end">
                        <box hexpand />
                        <RoundedAngle place="topleft" setup={(s) => { refs.angleR = s }} />
                        <box class="bar-right" $={(s: Gtk.Widget) => { refs.right = s }} spacing={4}>
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
                <BorderOverlay connector={connector} $type="overlay" />
            </overlay>
        </window>
    )
}

export default function Bars() {
    const display = Gdk.Display.get_default()!
    const monitors = display.get_monitors()
    for (let i = 0; i < monitors.get_n_items(); i++) {
        const gdkmon = monitors.get_item(i) as Gdk.Monitor
        Bar({ gdkmonitor: gdkmon })
    }
}
