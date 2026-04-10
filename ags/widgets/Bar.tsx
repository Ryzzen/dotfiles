import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createBinding, createComputed, For } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import app from "ags/gtk4/app"
import System from "system"
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
// 32 steps per segment: curves are ~60px long → ~1.9px per segment (visually
// smooth), straight sections get ~12-20 gradient stops (enough to resolve the
// pulse gaussian via linear interpolation). Halving from 64 cuts cairo calls
// and gradient-stop count by 2× with no observable difference.
const CURVE_STEPS = 32
const LINE_STEPS = 32
// Meet-glow gaussian radius (fraction of path length), matched in the glow
// falloff below and in the per-island activity range check.
const MEET_RADIUS = 0.3

// Per-monitor section widget refs for the border overlay (keyed by connector name).
// left/right are the bar-left and bar-right content boxes; angleL is the topright
// angle immediately after bar-left, angleCL/angleCR are the topleft/topright angles
// that flank the workspaces box, and angleR is the topleft angle just before
// bar-right. The center workspaces box itself doesn't need a ref because the path
// along its bottom is bridged directly between angleCL and angleCR.
type BarRefs = {
    left: Gtk.Widget | null
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

// Cumulative 2D arc-lengths along a point list; lens[0]=0 and
// lens[n-1]=totalLen. Pre-sized array write avoids `push` reallocations.
function arcLengths(pts: Pt[]): number[] {
    const n = pts.length
    const lens = new Array<number>(n)
    lens[0] = 0
    for (let i = 1; i < n; i++) {
        const dx = pts[i].x - pts[i - 1].x
        const dy = pts[i].y - pts[i - 1].y
        lens[i] = lens[i - 1] + Math.sqrt(dx * dx + dy * dy)
    }
    return lens
}

function BorderOverlay({ connector }: { connector: string }) {
    return (
        <drawingarea
            hexpand
            vexpand
            canTarget={false}
            $={(self: Gtk.DrawingArea) => {
                // ── Closure-scoped per-monitor state ────────────────────────
                // Geometry (island point lists and arc-length tables) only
                // changes when the bar's layout changes — essentially never
                // during steady-state animation. We cache it so the per-frame
                // draw path does zero JS allocation for geometry; the only
                // unavoidable native allocations per frame are the three
                // cairo.LinearGradient patterns (and their stops), which is
                // the cost of keeping gradient-based rendering.
                //
                // Before this cache existed, every frame rebuilt ~227 `Pt`
                // objects + ~227 arc-length numbers × every monitor × 60fps,
                // which combined with the cairo pattern churn pushed GJS into
                // a slow-GC regime where RSS crept up to several GB over
                // hours. See `ps` on a freshly-launched ags vs one that has
                // been running for minutes to reproduce.
                const origin = new Graphene.Point({ x: 0, y: 0 })
                const getX = (w: Gtk.Widget): number | null => {
                    const [ok, pt] = w.compute_point(self, origin)
                    return ok ? pt.x : null
                }

                // Cache invalidation keys — NaN sentinel guarantees first
                // frame always rebuilds (NaN !== NaN in JS).
                let c_lx = NaN, c_rx = NaN, c_rw = NaN
                let c_alx = NaN, c_alw = NaN
                let c_clx = NaN, c_clw = NaN
                let c_crx = NaN, c_crw = NaN
                let c_arx = NaN, c_arw = NaN
                let c_bot = NaN
                let cache: {
                    pts: Pt[][]
                    lens: number[][]
                    totals: number[]
                    offsets: number[]
                    invGrandTotal: number
                    x0s: number[]
                    x1s: number[]
                    invXSpans: number[]
                } | null = null

                self.set_draw_func((_da, cr, totalW, _totalH) => {
                    if (!self.get_mapped()) return
                    const refs = barRefs.get(connector)
                    if (
                        !refs?.left || !refs?.right ||
                        !refs?.angleL || !refs?.angleCL || !refs?.angleCR || !refs?.angleR ||
                        totalW <= 0
                    ) return
                    if (
                        !refs.left.get_mapped() || !refs.right.get_mapped() ||
                        !refs.angleL.get_mapped() || !refs.angleCL.get_mapped() ||
                        !refs.angleCR.get_mapped() || !refs.angleR.get_mapped()
                    ) return

                    const lx = getX(refs.left)
                    const rx = getX(refs.right)
                    const alx = getX(refs.angleL)
                    const clx = getX(refs.angleCL)
                    const crx = getX(refs.angleCR)
                    const arx = getX(refs.angleR)
                    if (
                        lx === null || rx === null ||
                        alx === null || clx === null || crx === null || arx === null
                    ) return

                    const rw = refs.right.get_width()
                    const alw = refs.angleL.get_width()
                    const clw = refs.angleCL.get_width()
                    const crw = refs.angleCR.get_width()
                    const arw = refs.angleR.get_width()
                    // Bottom of the curves: match the angle widget's *actual* drawn
                    // bottom exactly, so the Bezier control points (P2/P3) sit on the
                    // same y as the angle widget's curveTo endpoint. Using the draw
                    // area's totalH instead would vertically compress the S-curve
                    // relative to the angle's own curve and push the stroke inside
                    // the filled wedge on the curved sides.
                    const bot = refs.angleCL.get_height()

                    // Rebuild geometry cache on layout change (rare — resize,
                    // monitor swap, or first frame).
                    if (
                        lx !== c_lx || rx !== c_rx || rw !== c_rw ||
                        alx !== c_alx || alw !== c_alw ||
                        clx !== c_clx || clw !== c_clw ||
                        crx !== c_crx || crw !== c_crw ||
                        arx !== c_arx || arw !== c_arw ||
                        bot !== c_bot
                    ) {
                        c_lx = lx; c_rx = rx; c_rw = rw
                        c_alx = alx; c_alw = alw
                        c_clx = clx; c_clw = clw
                        c_crx = crx; c_crw = crw
                        c_arx = arx; c_arw = arw
                        c_bot = bot

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

                        // Arc-length parameterisation across all three islands
                        const l1 = arcLengths(i1)
                        const l2 = arcLengths(i2)
                        const l3 = arcLengths(i3)
                        const total0 = l1[l1.length - 1]
                        const total1 = l2[l2.length - 1]
                        const total2 = l3[l3.length - 1]
                        const grandTotal = total0 + total1 + total2
                        if (grandTotal <= 0) { cache = null; return }

                        const x0_1 = i1[0].x, x1_1 = i1[i1.length - 1].x
                        const x0_2 = i2[0].x, x1_2 = i2[i2.length - 1].x
                        const x0_3 = i3[0].x, x1_3 = i3[i3.length - 1].x
                        const span1 = x1_1 - x0_1
                        const span2 = x1_2 - x0_2
                        const span3 = x1_3 - x0_3

                        cache = {
                            pts: [i1, i2, i3],
                            lens: [l1, l2, l3],
                            totals: [total0, total1, total2],
                            offsets: [0, total0, total0 + total1],
                            invGrandTotal: 1 / grandTotal,
                            x0s: [x0_1, x0_2, x0_3],
                            x1s: [x1_1, x1_2, x1_3],
                            invXSpans: [
                                span1 >= 1 ? 1 / span1 : 0,
                                span2 >= 1 ? 1 / span2 : 0,
                                span3 >= 1 ? 1 / span3 : 0,
                            ],
                        }
                    }
                    if (!cache) return

                    const allIslands = cache.pts
                    const allLens = cache.lens
                    const islandTotals = cache.totals
                    const islandOffsets = cache.offsets
                    const invGrandTotal = cache.invGrandTotal
                    const x0s = cache.x0s
                    const x1s = cache.x1s
                    const invXSpans = cache.invXSpans

                    // Animation: ping-pong pulses (no discontinuity)
                    const animPos = getAnimPos()  // 0→0.5→0 smoothly
                    const [pr, pg, pb] = getWalPrimary()
                    const [ar, ag, ab] = getWalAccent2()

                    const leftPos = animPos          // 0 → 0.5 → 0
                    const rightPos = 1 - animPos     // 1 → 0.5 → 1

                    // Meeting flash when pulses converge at center
                    const meetDist = rightPos - leftPos
                    const meetGlow = meetDist < 0.12 ? (1 - meetDist / 0.12) * 0.35 : 0
                    const hasMeet = meetGlow > 0.001

                    // Precompute meet-glow mix color (constant across frame)
                    const mixR = (pr + ar) * 0.5
                    const mixG = (pg + ag) * 0.5
                    const mixB = (pb + ab) * 0.5

                    // Active frac ranges: outside these a sample's alpha is
                    // guaranteed 0, so we can skip an entire island if its
                    // [isleStart, isleEnd] frac range doesn't overlap any of them.
                    const lLo = leftPos - TRAIL_LEN
                    const lHi = leftPos + PULSE_W
                    const rLo = rightPos - PULSE_W
                    const rHi = rightPos + TRAIL_LEN
                    const mLo = 0.5 - MEET_RADIUS
                    const mHi = 0.5 + MEET_RADIUS

                    const invPulseW = 1 / PULSE_W
                    const invTrailLen = 1 / TRAIL_LEN
                    const invMeetRadius = 1 / MEET_RADIUS

                    cr.setLineWidth(BORDER_PX)
                    cr.setLineCap(1)  // ROUND
                    cr.setLineJoin(1) // ROUND

                    // Draw each island as one continuous path with a gradient
                    for (let isle = 0; isle < 3; isle++) {
                        const isleTotal = islandTotals[isle]
                        if (isleTotal <= 0) continue

                        const offset = islandOffsets[isle]
                        const isleStart = offset * invGrandTotal
                        const isleEnd = (offset + isleTotal) * invGrandTotal

                        // Skip if no active effect touches this island's frac range
                        const touchesLeft = isleStart <= lHi && lLo <= isleEnd
                        const touchesRight = isleStart <= rHi && rLo <= isleEnd
                        const touchesMeet = hasMeet && isleStart <= mHi && mLo <= isleEnd
                        if (!touchesLeft && !touchesRight && !touchesMeet) continue

                        const pts = allIslands[isle]
                        const lens = allLens[isle]
                        const n = pts.length
                        if (n < 2) continue

                        const invXSpan = invXSpans[isle]
                        if (invXSpan === 0) continue
                        const x0 = x0s[isle]
                        const x1 = x1s[isle]

                        // Build gradient with color stops, skipping runs of
                        // consecutive zeros. Within a zero run we emit only
                        // the first and last stop, which anchors the boundary
                        // so cairo still interpolates correctly into/out of
                        // adjacent non-zero bands. Outside the meet-glow window
                        // (when most of each island is zero) this roughly
                        // halves the number of addColorStopRGBA calls and the
                        // cairo-internal stop-array growth driving native RSS.
                        const grad = new cairo.LinearGradient(x0, 0, x1, 0)
                        let prevAlphaZero = false  // last EMITTED stop had alpha 0
                        let pendingJ = -1          // index of last skipped zero

                        for (let j = 0; j < n; j++) {
                            const frac = (offset + lens[j]) * invGrandTotal

                            // Inlined colorAt — avoids function-call overhead and
                            // the per-sample [r,g,b,a] array allocation.
                            let alpha = 0, rr = 0, gg = 0, bb = 0

                            // Left pulse head
                            const lDist = frac > leftPos ? frac - leftPos : leftPos - frac
                            if (lDist < PULSE_W) {
                                const u = lDist * invPulseW
                                const lGlow = Math.exp(-u * u * 5) * 0.9
                                if (lGlow > alpha) { alpha = lGlow; rr = pr; gg = pg; bb = pb }
                            }
                            // Left trail (quadratic falloff behind pulse)
                            if (frac < leftPos && frac > leftPos - TRAIL_LEN) {
                                const tf = (leftPos - frac) * invTrailLen
                                const ta = TRAIL_ALPHA * (1 - tf * tf)
                                if (ta > alpha) { alpha = ta; rr = pr; gg = pg; bb = pb }
                            }
                            // Right pulse head
                            const rDist = frac > rightPos ? frac - rightPos : rightPos - frac
                            if (rDist < PULSE_W) {
                                const u = rDist * invPulseW
                                const rGlow = Math.exp(-u * u * 5) * 0.9
                                if (rGlow > alpha) { alpha = rGlow; rr = ar; gg = ag; bb = ab }
                            }
                            // Right trail
                            if (frac > rightPos && frac < rightPos + TRAIL_LEN) {
                                const tf = (frac - rightPos) * invTrailLen
                                const ta = TRAIL_ALPHA * (1 - tf * tf)
                                if (ta > alpha) { alpha = ta; rr = ar; gg = ag; bb = ab }
                            }
                            // Meet-glow additive blend
                            if (hasMeet) {
                                const cDist = frac > 0.5 ? frac - 0.5 : 0.5 - frac
                                if (cDist < MEET_RADIUS) {
                                    const u = cDist * invMeetRadius
                                    const cg = meetGlow * Math.exp(-u * u * 5)
                                    if (cg > 0) {
                                        alpha += cg
                                        if (alpha > 1) alpha = 1
                                        const im = 1 - cg
                                        rr = rr * im + mixR * cg
                                        gg = gg * im + mixG * cg
                                        bb = bb * im + mixB * cg
                                    }
                                }
                            }

                            if (alpha === 0) {
                                if (prevAlphaZero) {
                                    // Mid-zero-run: remember as potential trail anchor.
                                    pendingJ = j
                                    continue
                                }
                                // First zero after a non-zero run — emit as trail anchor.
                                let stop = (pts[j].x - x0) * invXSpan
                                if (stop < 0) stop = 0
                                else if (stop > 1) stop = 1
                                grad.addColorStopRGBA(stop, rr, gg, bb, 0)
                                prevAlphaZero = true
                                pendingJ = -1
                            } else {
                                // Non-zero: if the previous emitted stop was
                                // zero and we skipped points since, emit a
                                // leading anchor at the last skipped position
                                // so the gradient transitions sharply into
                                // this run instead of smearing colour across
                                // the preceding zero zone.
                                if (prevAlphaZero && pendingJ >= 0) {
                                    let astop = (pts[pendingJ].x - x0) * invXSpan
                                    if (astop < 0) astop = 0
                                    else if (astop > 1) astop = 1
                                    grad.addColorStopRGBA(astop, 0, 0, 0, 0)
                                }
                                let stop = (pts[j].x - x0) * invXSpan
                                if (stop < 0) stop = 0
                                else if (stop > 1) stop = 1
                                grad.addColorStopRGBA(stop, rr, gg, bb, alpha)
                                prevAlphaZero = false
                                pendingJ = -1
                            }
                        }

                        // Build continuous path and stroke once
                        cr.newPath()
                        cr.moveTo(pts[0].x, pts[0].y)
                        for (let j = 1; j < n; j++) {
                            cr.lineTo(pts[j].x, pts[j].y)
                        }
                        cr.setSource(grad)
                        cr.stroke()
                    }
                })

                // Throttle redraws to ~15 fps regardless of monitor refresh
                // rate. The tick callback itself still runs at the frame
                // clock's natural rate (cheap — just a timestamp compare),
                // but queue_draw only fires every ~66 ms. This is the main
                // knob controlling RSS growth: each cairo draw churns ~0.75 MB
                // of heap through cairo patterns + GSK cairo surface nodes
                // that dirty glibc arenas faster than the allocator trims them,
                // and on high-refresh monitors (144 Hz+) add_tick_callback
                // would otherwise fire 2-4× more often than 60 Hz, multiplying
                // the leak rate. 15 fps still looks smooth for the 4 s
                // ping-pong cycle (60 frames per cycle).
                const DRAW_INTERVAL_MS = 66
                let lastDrawMs = 0
                self.add_tick_callback(() => {
                    if (!self.get_mapped()) return true
                    const nowMs = GLib.get_monotonic_time() / 1000
                    if (nowMs - lastDrawMs >= DRAW_INTERVAL_MS) {
                        lastDrawMs = nowMs
                        self.queue_draw()
                    }
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

function Bar({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
    const connector = gdkmonitor.get_connector() || "unknown"
    const refs: BarRefs = {
        left: null,
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
                        <Workspaces />
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
    // Reactive per-monitor Bar. `app.monitors` wraps the GDK display's monitor
    // ListModel, which fires items-changed on hotplug, so <For> adds/removes
    // bar windows in place without recreating untouched ones. Cleanup drops
    // the per-monitor entry from `barRefs` so the overlay draw func for any
    // subsequent frame stops targeting the destroyed widgets.
    //
    // KNOWN BUG (GTK 4.18.5 + Hyprland 0.49.0, NVIDIA): unplug followed by
    // replug SIGABRTs with "Tried to add event to destroyed queue", because
    // GDK4 leaks wl_registry proxies attached to a per-monitor event queue
    // it tears down on monitor removal. Not fixable from here — verified by
    // reproducing with a no-op cleanup that never touches the window. Fix
    // path is a GTK4 / Hyprland upgrade via nixpkgs.

    // Periodic explicit GC to reclaim cairo/GSK surface allocations that
    // otherwise pile up in glibc arenas between SpiderMonkey's natural
    // collection cycles. SpiderMonkey only triggers GC based on JS-heap
    // pressure; it can't see the native-heap cost of cairo_pattern_t +
    // cairo_surface_t instances held by the boxed wrappers in the JS heap,
    // so without a nudge the BorderOverlay's per-frame cairo churn keeps
    // these objects alive (ref-wise) much longer than they're visually
    // needed, and RSS grows faster than the natural collector keeps up.
    // 10 s cadence at PRIORITY_LOW is slow enough to be invisible to frame
    // timing and fast enough to keep RSS bounded.
    GLib.timeout_add(GLib.PRIORITY_LOW, 10000, () => {
        System.gc()
        return GLib.SOURCE_CONTINUE
    })

    const monitors = createBinding(app, "monitors")
    return (
        <For
            each={monitors}
            cleanup={(win) => {
                const w = win as Gtk.Window
                const name = w.name ?? ""
                if (name.startsWith("bar-")) {
                    barRefs.delete(name.slice(4))
                }
                w.destroy()
            }}
        >
            {(mon) => <Bar gdkmonitor={mon as Gdk.Monitor} />}
        </For>
    )
}
