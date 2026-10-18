// Rule_Gate_27_HarnessLanguage in the gate: hook 02-27 sees only the Write tool, so a part written by a script slipped the
// bare word "kho" past it (2026-10-19). Here every Markdown file of HS is counted the hook's way, and a file may only get
// better than HEAD: a new file has none; an old file has no more than it had. Older text gets to zero as it is rewritten.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { STORE_DIR } from "./store.js";

// the same reading as hook 02-27: quoted or code text is a mention; the stockroom words are plain business Vietnamese
const KHO = /(^|[^\p{L}])[Kk]ho(?![\p{L}])(?!\s+(?:dữ\s+liệu|hàng))/u;
const QUOTED = /"[^"\n]*"|“[^”\n]*”|`[^`\n]*`/g;
const STOCK = /(tồn|nhập|xuất|kiểm)\s+kho(?![\p{L}])/giu;

/** Lines of `text` that use the bare word the vocabulary forbids. */
export function bareKhoLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n").filter((l) => KHO.test(l.replace(QUOTED, "").replace(STOCK, "")));
}

/** "<file>: <n> line(s) with bare "kho" (HEAD had <m>)" for every HS file that got worse than HEAD. */
export function harnessWordFindings(storeDir = STORE_DIR, headText?: (rel: string) => string | null): string[] {
  let top = "";
  try { top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: storeDir, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* no git */ }
  const fromHead = headText ?? ((rel: string): string | null => {
    if (!top) return null;
    try { return execFileSync("git", ["show", `HEAD:${rel}`], { cwd: top, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }); } catch { return null; }
  });
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!(d === storeDir && e.name === "Archive")) walk(p); continue; }
      if (!/\.md$/i.test(e.name)) continue;
      const now = bareKhoLines(readFileSync(p, "utf8")).length;
      if (!now) continue;
      const rel = relative(top || storeDir, p).replace(/\\/g, "/");
      const head = fromHead(rel);
      const before = head === null ? 0 : bareKhoLines(head).length;
      if (now > before) out.push(`${relative(storeDir, p).replace(/\\/g, "/")}: ${now} line(s) with bare "kho" (HEAD had ${before}) — write DW or HS, or a word of the vocabulary table`);
    }
  };
  if (existsSync(storeDir)) walk(storeDir);
  return out;
}
