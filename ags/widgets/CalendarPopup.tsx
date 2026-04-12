import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createPoll } from "ags/time"
import { createState, createComputed } from "ags"
import app from "ags/gtk4/app"

function daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number): number {
    // 0=Sun, convert to Mon=0
    const d = new Date(year, month, 1).getDay()
    return d === 0 ? 6 : d - 1
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

const ICON = {
    LEFT:  "\u{f053}",   // fa-chevron_left
    RIGHT: "\u{f054}",   // fa-chevron_right
}

function CalendarGrid() {
    const now = new Date()
    const [year, setYear] = createState(now.getFullYear())
    const [month, setMonth] = createState(now.getMonth())

    const today = createPoll("", 60000, () => {
        const d = new Date()
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })

    const prev = () => {
        if (month() === 0) {
            setMonth(11)
            setYear(year() - 1)
        } else {
            setMonth(month() - 1)
        }
    }

    const next = () => {
        if (month() === 11) {
            setMonth(0)
            setYear(year() + 1)
        } else {
            setMonth(month() + 1)
        }
    }

    const goToday = () => {
        const d = new Date()
        setYear(d.getFullYear())
        setMonth(d.getMonth())
    }

    const header = createComputed(() => `${MONTHS[month()]} ${year()}`)

    const grid = createComputed(() => {
        const m = month()
        const y = year()
        const todayStr = today()
        const [tY, tM, tD] = todayStr.split("-").map(Number)
        const days = daysInMonth(y, m)
        const start = firstDayOfMonth(y, m)
        const cells: string[] = []

        // Empty cells before first day
        for (let i = 0; i < start; i++) {
            cells.push("")
        }
        // Day numbers — mark today with brackets
        for (let d = 1; d <= days; d++) {
            if (d === tD && m === tM && y === tY) {
                cells.push(`[${d}]`)
            } else {
                cells.push(String(d))
            }
        }

        // Build grid string: 7 columns
        const rows: string[] = []
        for (let i = 0; i < cells.length; i += 7) {
            const row = cells.slice(i, i + 7)
            rows.push(row.map((c) => c.padStart(4)).join(" "))
        }
        return rows.join("\n")
    })

    return (
        <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
            {/* Month/Year header with nav */}
            <box class="cal-header" spacing={8}>
                <button class="cal-nav" onClicked={prev}>
                    <label label={ICON.LEFT} />
                </button>
                <button class="cal-month-btn" hexpand onClicked={goToday}>
                    <label class="cal-month" label={header} />
                </button>
                <button class="cal-nav" onClicked={next}>
                    <label label={ICON.RIGHT} />
                </button>
            </box>

            {/* Day names header */}
            <label
                class="cal-days-header"
                label={DAYS.map((d) => d.padStart(4)).join(" ")}
                halign={Gtk.Align.CENTER}
            />

            {/* Calendar grid */}
            <label
                class="cal-grid"
                label={grid}
                halign={Gtk.Align.CENTER}
            />
        </box>
    )
}

function UpcomingInfo() {
    const uptime = createPoll("", 30000, ["bash", "-c",
        "uptime -p | sed 's/up //'",
    ])

    const time = createPoll("", 1000, () => {
        const now = new Date()
        return now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        })
    })

    const dateStr = createPoll("", 60000, () => {
        const now = new Date()
        return now.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    })

    return (
        <box class="cal-info" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
            <label class="cal-time" label={time} halign={Gtk.Align.CENTER} />
            <label class="cal-date-full" label={dateStr} halign={Gtk.Align.CENTER} />
            <label class="cal-uptime" label={uptime((u) => `uptime: ${u}`)} halign={Gtk.Align.CENTER} />
        </box>
    )
}

export default function CalendarPopup({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
    const { TOP, RIGHT } = Astal.WindowAnchor
    const connector = gdkmonitor.get_connector() || "unknown"

    return (
        <window
            visible={false}
            name={`calendar-popup-${connector}`}
            namespace="calendar-popup"
            class="CalendarPopup"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.NORMAL}
            layer={Astal.Layer.TOP}
            keymode={Astal.Keymode.NONE}
            anchor={TOP | RIGHT}
            application={app}
            marginTop={40}
            marginRight={6}
        >
            <box class="cal-popup-content" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <UpcomingInfo />
                <CalendarGrid />
            </box>
        </window>
    )
}
