import { readFile } from "ags/file"
import GLib from "gi://GLib"

type RGB = [number, number, number]

// ── Raw file cache ──────────────────────────────────────────

let cachedLines: string[] | null = null

function loadLines(): string[] {
    const home = GLib.get_home_dir()
    return readFile(`${home}/.cache/wal/colors`).trim().split("\n")
}

function getLines(): string[] {
    if (!cachedLines) cachedLines = loadLines()
    return cachedLines
}

// ── Derived cairo caches (0-1 RGB floats) ───────────────────

let cachedSurface: RGB | null = null
let cachedPrimary: RGB | null = null
let cachedAccent2: RGB | null = null

function parseHex(hex: string): RGB {
    return [
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255,
    ]
}

export function getWalSurface(): RGB {
    if (!cachedSurface) {
        const [r, g, b] = parseHex(getLines()[0])
        cachedSurface = [
            Math.min(1, r + 20 / 255),
            Math.min(1, g + 20 / 255),
            Math.min(1, b + 20 / 255),
        ]
    }
    return cachedSurface
}

export function getWalPrimary(): RGB {
    if (!cachedPrimary) cachedPrimary = parseHex(getLines()[4])
    return cachedPrimary
}

export function getWalAccent2(): RGB {
    if (!cachedAccent2) cachedAccent2 = parseHex(getLines()[5])
    return cachedAccent2
}

// ── CSS @define-color block for GTK stylesheet ──────────────

function lightenHex(hex: string, amount: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount)
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount)
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount)
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

export function walCssDefines(): string {
    const lines = getLines()
    const bg = lines[0]
    // 0=bg, 1-6=palette light→dark, 7=fg, 8=gray
    return [
        `@define-color surface ${lightenHex(bg, 20)};`,
        `@define-color surface_container ${lightenHex(bg, 12)};`,
        `@define-color surface_container_low ${lightenHex(bg, 8)};`,
        `@define-color surface_container_high ${lightenHex(bg, 30)};`,
        `@define-color surface_variant ${lines[2]};`,
        `@define-color surface_bright ${lines[3]};`,
        `@define-color primary ${lines[4]};`,
        `@define-color on_primary ${lines[0]};`,
        `@define-color primary_container ${lines[2]};`,
        `@define-color on_surface ${lines[7]};`,
        `@define-color on_surface_variant ${lines[6]};`,
        `@define-color outline ${lines[8]};`,
        `@define-color outline_variant ${lines[2]};`,
        `@define-color error #f53c3c;`,
        `@define-color tertiary ${lines[1]};`,
    ].join("\n")
}

// ── Invalidation ────────────────────────────────────────────

// Call this when ~/.cache/wal/colors has changed on disk (e.g. after
// pywal re-runs on wallpaper change). Re-reads the file once and clears
// all derived caches so the next getWal*() call re-parses from fresh data.
export function reloadWalColors(): void {
    cachedLines = loadLines()
    cachedSurface = null
    cachedPrimary = null
    cachedAccent2 = null
}
