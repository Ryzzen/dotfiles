import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createPoll } from "ags/time"
import app from "ags/gtk4/app"

const ICON = {
    CPU:   "\u{f4bc}",
    MEM:   "\u{f035b}",
    DISK:  "\u{f02ca}",
    TEMP:  "\u{f050f}",
    UP:    "\u{f148}",
    DOWN:  "\u{f149}",
}

// ── Shared polls (one instance, reused across all per-monitor popups) ──

const pollCpuPct = createPoll("0", 3000, [
    "bash", "-c",
    "top -bn1 | grep 'Cpu(s)' | awk '{print int($2+$4)}'",
])
const pollMemInfo = createPoll("0 0 0", 5000, [
    "bash", "-c",
    "free -m | awk '/Mem:/{printf \"%d %d %d\", $3, $2, int($3/$2*100)}'",
])
const pollDiskInfo = createPoll("0 0 0", 30000, [
    "bash", "-c",
    "df -h / | awk 'NR==2{printf \"%s %s %d\", $3, $2, $5}'",
])
const pollTemp = createPoll("", 5000, [
    "bash", "-c",
    "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{printf \"%.0f°C\", $1/1000}' || echo 'N/A'",
])
const pollNetSpeed = createPoll("", 2000, [
    "bash", "-c",
    `
    read rx1 < /sys/class/net/$(ip route | awk '/default/{print $5; exit}')/statistics/rx_bytes 2>/dev/null
    read tx1 < /sys/class/net/$(ip route | awk '/default/{print $5; exit}')/statistics/tx_bytes 2>/dev/null
    sleep 1
    read rx2 < /sys/class/net/$(ip route | awk '/default/{print $5; exit}')/statistics/rx_bytes 2>/dev/null
    read tx2 < /sys/class/net/$(ip route | awk '/default/{print $5; exit}')/statistics/tx_bytes 2>/dev/null
    drx=$(( (rx2 - rx1) / 1024 ))
    dtx=$(( (tx2 - tx1) / 1024 ))
    echo "$drx $dtx"
    `,
])
const pollProcs = createPoll("", 3000, [
    "bash", "-c",
    "ps aux --sort=-%cpu | awk 'NR>1 && NR<=6{printf \"%s %.1f%% %.1f%%\\n\", $11, $3, $4}' | sed 's|.*/||'",
])

function StatRow({ icon, label, value, pct }: {
    icon: string
    label: string
    value: any
    pct: any
}) {
    return (
        <box class="hw-row" spacing={8}>
            <label class="hw-icon" label={icon} />
            <box orientation={Gtk.Orientation.VERTICAL} hexpand>
                <box>
                    <label class="hw-label" label={label} halign={Gtk.Align.START} hexpand />
                    <label class="hw-value" label={value} halign={Gtk.Align.END} />
                </box>
                <levelbar
                    class="hw-bar"
                    value={pct}
                    minValue={0}
                    maxValue={1}
                />
            </box>
        </box>
    )
}

function TopProcesses() {
    return (
        <box class="hw-procs" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <label class="hw-procs-title" label="Top Processes" halign={Gtk.Align.START} />
            <label
                class="hw-procs-list"
                label={pollProcs}
                halign={Gtk.Align.START}
            />
        </box>
    )
}

function NetworkSpeed() {
    return (
        <box class="hw-net" spacing={16}>
            <label class="hw-net-label" label={pollNetSpeed((s) => {
                const [rx, tx] = s.split(" ").map(Number)
                return `${ICON.DOWN} ${rx || 0} KB/s`
            })} />
            <label class="hw-net-label" label={pollNetSpeed((s) => {
                const [_rx, tx] = s.split(" ").map(Number)
                return `${ICON.UP} ${tx || 0} KB/s`
            })} />
        </box>
    )
}

export default function HwPopup({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
    const { TOP, RIGHT } = Astal.WindowAnchor
    const connector = gdkmonitor.get_connector() || "unknown"

    return (
        <window
            visible={false}
            name={`hw-popup-${connector}`}
            namespace="hw-popup"
            class="HwPopup"
            gdkmonitor={gdkmonitor}
            exclusivity={Astal.Exclusivity.NORMAL}
            layer={Astal.Layer.TOP}
            keymode={Astal.Keymode.NONE}
            anchor={TOP | RIGHT}
            application={app}
            marginTop={40}
            marginRight={200}
        >
            <box class="hw-popup-content" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                <label class="hw-popup-title" label="System Monitor" halign={Gtk.Align.START} />

                <StatRow
                    icon={ICON.CPU}
                    label="CPU"
                    value={pollCpuPct((c) => `${c}%`)}
                    pct={pollCpuPct((c) => parseInt(c) / 100)}
                />

                <StatRow
                    icon={ICON.MEM}
                    label="Memory"
                    value={pollMemInfo((m) => {
                        const [used, total] = m.split(" ")
                        return `${used}/${total} MB`
                    })}
                    pct={pollMemInfo((m) => parseInt(m.split(" ")[2]) / 100)}
                />

                <StatRow
                    icon={ICON.DISK}
                    label="Disk /"
                    value={pollDiskInfo((d) => {
                        const [used, total] = d.split(" ")
                        return `${used}/${total}`
                    })}
                    pct={pollDiskInfo((d) => parseInt(d.split(" ")[2]) / 100)}
                />

                <StatRow
                    icon={ICON.TEMP}
                    label="Temperature"
                    value={pollTemp}
                    pct={pollTemp((t) => {
                        const n = parseInt(t)
                        return isNaN(n) ? 0 : n / 100
                    })}
                />

                <NetworkSpeed />
                <TopProcesses />
            </box>
        </window>
    )
}
