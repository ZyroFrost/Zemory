// Regenerate the whole app icon set from one master image, and refresh the tray's
// embedded base64 so tray + taskbar + favicon + brand are ONE global logo.
//   node backend/scripts/make-icons.mjs <path-to-master.png>
// Emits served favicon/manifest icons -> frontend/assets/ (media UI, §5), a master
// -> backend/resources/packaging/, and rewrites the ICON_*_B64 constants in
// backend/src/platform/tray.ts (the tray helper embeds base64, not a file path).
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = process.argv[2];
if (!SRC) {
  console.error("usage: node backend/scripts/make-icons.mjs <master.png>");
  process.exit(1);
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ASSETS = join(ROOT, "frontend", "assets");
const PKG = join(ROOT, "backend", "resources", "packaging");

// ensureAlpha → RGBA PNGs: the native window (tao/image crate) rejects non-RGBA
// ICO entries ("The PNG is not in RGBA format"); browsers/shell accept RGBA too.
const png = (size) => sharp(SRC).resize(size, size, { fit: "cover" }).ensureAlpha().png();

/** Build a PNG-in-ICO from {size, buf} entries (Windows scales per display). */
function buildIco(imgs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(imgs.length, 4);
  const entries = Buffer.alloc(16 * imgs.length);
  let offset = 6 + 16 * imgs.length;
  const datas = [];
  imgs.forEach((p, i) => {
    const e = entries.subarray(16 * i, 16 * i + 16);
    e.writeUInt8(p.s >= 256 ? 0 : p.s, 0);
    e.writeUInt8(p.s >= 256 ? 0 : p.s, 1);
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(p.buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += p.buf.length;
    datas.push(p.buf);
  });
  return Buffer.concat([header, entries, ...datas]);
}

// Served PNGs: manifest icons + favicon + a master for packaging.
await png(512).toFile(join(ASSETS, "logo-512.png"));
await png(192).toFile(join(ASSETS, "logo-192.png"));
await png(256).toFile(join(ASSETS, "favicon-256.png"));
await png(512).toFile(join(PKG, "zemory-logo.png"));

// favicon.ico = multi-size (tab, window, hi-dpi taskbar).
const favEntries = [];
for (const s of [32, 64, 256]) favEntries.push({ s, buf: await png(s).toBuffer() });
writeFileSync(join(ASSETS, "favicon.ico"), buildIco(favEntries));

// zemory.ico = Windows app icon for the Start Menu / Desktop shortcut (16..256).
const appEntries = [];
for (const s of [16, 32, 48, 64, 256]) appEntries.push({ s, buf: await png(s).toBuffer() });
writeFileSync(join(PKG, "zemory.ico"), buildIco(appEntries));

// Tray: rewrite the embedded base64 in tray.ts (Windows ICO 64, mac/Linux PNG 64).
const trayIco = buildIco([{ s: 64, buf: await png(64).toBuffer() }]).toString("base64");
const trayPng = (await png(64).toBuffer()).toString("base64");
const trayPath = join(ROOT, "backend", "src", "platform", "tray.ts");
let tray = readFileSync(trayPath, "utf8");
tray = tray.replace(/const ICON_ICO_B64 =\s*"[^"]*";/, `const ICON_ICO_B64 =\n  "${trayIco}";`);
tray = tray.replace(/const ICON_PNG_B64 =\s*"[^"]*";/, `const ICON_PNG_B64 =\n  "${trayPng}";`);
writeFileSync(trayPath, tray);

console.log("done: assets + favicon.ico + packaging master + tray.ts base64 refreshed");
