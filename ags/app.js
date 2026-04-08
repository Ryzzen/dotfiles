import { App, Gtk, Gdk } from "astal/gtk3";
import { Variable, GLib, bind } from "astal";
import Battery   from "gi://AstalBattery";
import Bluetooth from "gi://AstalBluetooth";
import Network   from "gi://AstalNetwork";
import Wp        from "gi://AstalWp";
import Hyprland  from "gi://AstalHyprland";

// ── Helpers ────────────────────────────────────────────────

const time = Variable("").poll(1000, () =>
    GLib.DateTime.new_now_local().format("%H:%M:%S")
);

// ── Workspaces ─────────────────────────────────────────────

function Workspaces() {
    const hypr = Hyprland.get_default();

    return (
        <box className="workspaces">
            {bind(hypr, "workspaces").as(wss =>
                wss.sort((a, b) => a.id - b.id).map(ws => (
                    <button
                        className={bind(hypr, "focusedWorkspace").as(fw =>
                            ws === fw ? "workspace active" : "workspace"
                        )}
                        onClicked={() => hypr.dispatch("workspace", String(ws.id))}
                    >
                        {String(ws.id)}
                    </button>
                ))
            )}
        </box>
    );
}

// ── Clock ──────────────────────────────────────────────────

function Clock() {
    return <label className="clock" label={bind(time)} />;
}

// ── Battery ────────────────────────────────────────────────

function BatteryWidget() {
    const bat = Battery.get_default();

    const icon = bind(bat, "charging").as(c => c ? "󰂄" : "󰁹");
    const pct  = bind(bat, "percentage").as(p => `${Math.round(p * 100)}%`);
    const cls  = bind(bat, "percentage").as(p =>
        p < 0.15 ? "battery critical" :
        p < 0.30 ? "battery warning"  : "battery"
    );

    return (
        <box className={cls} spacing={4}>
            <label label={icon} />
            <label label={pct}  />
        </box>
    );
}

// ── Network ────────────────────────────────────────────────

function NetworkWidget() {
    const net = Network.get_default();

    const label = bind(net, "primary").as(p => {
        if (p === Network.Primary.WIFI) {
            const ssid    = net.wifi?.ssid ?? "?";
            const strength = net.wifi?.strength ?? 0;
            return `󰤨  ${ssid} ${strength}%`;
        }
        if (p === Network.Primary.WIRED) return `󰈀  ${net.wired?.ipAddress ?? ""}`;
        return "󰤭  disconnected";
    });

    const cls = bind(net, "primary").as(p =>
        p === Network.Primary.UNKNOWN ? "network disconnected" : "network"
    );

    return <label className={cls} label={label} />;
}

// ── Audio ──────────────────────────────────────────────────

function Audio() {
    const wp     = Wp.get_default();
    const spk    = wp.defaultSpeaker;
    const volume = bind(spk, "volume").as(v => `${Math.round(v * 100)}%`);
    const icon   = bind(spk, "mute").as(m => m ? "󰝟" : "󰕾");

    return (
        <box className="audio" spacing={4}>
            <label label={icon}   />
            <label label={volume} />
        </box>
    );
}

// ── Bluetooth ──────────────────────────────────────────────

function BluetoothWidget() {
    const bt  = Bluetooth.get_default();
    const cls = bind(bt, "isPowered").as(p => p ? "bluetooth on" : "bluetooth off");
    const lbl = bind(bt, "isPowered").as(p => p ? "󰂯" : "󰂲");

    return <label className={cls} label={lbl} />;
}

// ── Hardware ───────────────────────────────────────────────

function Cpu() {
    const usage = Variable(0).poll(2000, ["bash", "-c",
        "top -bn1 | grep 'Cpu(s)' | awk '{print int($2)}'"]
    );
    return <label className="cpu" label={bind(usage).as(v => `󰍛 ${v}%`)} />;
}

function Mem() {
    const used = Variable("").poll(2000, ["bash", "-c",
        "free | awk '/Mem/{printf \"%d\", $3/$2*100}'"]
    );
    return <label className="memory" label={bind(used).as(v => `󰾕 ${v}%`)} />;
}

function Disk() {
    const used = Variable("").poll(10000, ["bash", "-c",
        "df / | awk 'NR==2{print int($5)}'"]
    );
    return <label className="disk" label={bind(used).as(v => `󰋊 ${v}%`)} />;
}

function Hardware() {
    return (
        <box className="hardware" spacing={0}>
            <Cpu />
            <Mem />
            <Disk />
        </box>
    );
}

// ── Window title ───────────────────────────────────────────

function WindowTitle() {
    const hypr  = Hyprland.get_default();
    const title = bind(hypr, "focusedClient").as(c => c?.title ?? "");

    return <label className="window-title" label={title} truncate maxWidthChars={40} />;
}

// ── App menu button ────────────────────────────────────────

function AppMenu() {
    return (
        <button className="appmenu" onClicked={() => {
            GLib.spawn_command_line_async("rofi -show drun");
        }}>
            APPS
        </button>
    );
}

// ── Power button ───────────────────────────────────────────

function Power() {
    return (
        <button className="power" onClicked={() => {
            GLib.spawn_command_line_async("wlogout");
        }}>
            󰐥
        </button>
    );
}

// ── Bar ────────────────────────────────────────────────────

function Bar(monitor) {
    return (
        <window
            className="bar"
            gdkmonitor={monitor}
            exclusionZone={28}
            anchor={Gdk.Gravity.NORTH}
            layer={Gtk.Layer.TOP}
            application={App}
        >
            <centerbox>
                {/* Left */}
                <box halign={Gtk.Align.START} spacing={4}>
                    <AppMenu />
                    <WindowTitle />
                </box>

                {/* Center */}
                <box halign={Gtk.Align.CENTER}>
                    <Workspaces />
                </box>

                {/* Right */}
                <box halign={Gtk.Align.END} spacing={4}>
                    <Hardware />
                    <Audio />
                    <BluetoothWidget />
                    <NetworkWidget />
                    <BatteryWidget />
                    <Power />
                    <Clock />
                </box>
            </centerbox>
        </window>
    );
}

// ── Entry point ────────────────────────────────────────────

App.start({
    css: `${App.configDir}/style.css`,
    main() {
        const monitors = App.get_monitors();
        monitors.map(Bar);
    },
});
