// Compress-on-read: shrink verbose command/file output BEFORE it enters the
// agent's context. Deterministic, no LLM. Heuristics borrowed (Model B) from
// squeez (benign-aware: keep errors, compress clean output harder; adaptive by
// size), RTK (per-command handlers), Caveman (byte-preserve code/URLs/paths).
//
// Lossless-ish: small output is returned almost verbatim; we only get
// aggressive on large output, and error lines always survive.

import { compressionOff } from "./policy.js";

export interface CompressResult {
  text: string;
  before: number; // original line count
  after: number; // compressed line count
  savedPct: number;
}

const lineCount = (s: string): number => (s === "" ? 0 : s.split("\n").length);

/** Verbatim passthrough result (kill switch / fail-open). */
function verbatim(input: string): CompressResult {
  const n = lineCount(input);
  return { text: input, before: n, after: n, savedPct: 0 };
}

export interface CompressOptions {
  /** Command family hint for command-aware handling (e.g. "git", "npm", "test"). */
  cmd?: string;
  /** Below this many lines, return near-verbatim (don't over-compress). */
  lightBelow?: number;
}

// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g;
const ERROR_RE =
  /\b(error|errors|fail(ed|ure|s)?|exception|traceback|fatal|panic|denied|refused|cannot|unable|undefined|null pointer|segfault)\b|✗|✘|\bERR\b|\bE\d{3,}\b/i;
// Lines that are pure progress/noise — safe to drop entirely.
const PROGRESS_RE =
  /^\s*(\d{1,3}%|\[=*>?\.* *\]|[#█▓▒░]+ *\d|\.{3,}|(downloading|fetching|resolving|extracting|building|compiling|installing)\b.*\d+\s*%)/i;
const SPINNER_RE = /^[\s|/\-\\]+$/;

function result(lines: string[], before: number): CompressResult {
  const after = lines.length;
  const savedPct = before > 0 ? Math.round((1 - after / before) * 100) : 0;
  return { text: lines.join("\n"), before, after, savedPct };
}

/** Compress a block of text output. */
export function compress(input: string, opts: CompressOptions = {}): CompressResult {
  if (compressionOff()) return verbatim(input); // ZEMORY_COMPRESS=off → pass through
  const rawLines = input.replace(ANSI, "").split("\n");
  const before = rawLines.length;

  // 1. strip carriage returns + trailing whitespace; 2. drop progress/spinner noise
  let lines = rawLines
    .map((l) => l.replace(/\r/g, "").replace(/[ \t]+$/, ""))
    .filter((l) => !PROGRESS_RE.test(l) && !SPINNER_RE.test(l));
  // 3. collapse runs of blank lines to one
  lines = collapseBlanks(lines);
  // 4. dedupe consecutive identical lines → "line  (×N)"
  lines = dedupeConsecutive(lines);

  const hasErr = lines.some((l) => ERROR_RE.test(l));
  const light = opts.lightBelow ?? 50;

  // Small or already-tidy output → return near-verbatim (don't destroy signal).
  if (lines.length <= light) return result(lines, before);

  // Large output → head/tail truncation. benign-aware budget:
  //   errors present → keep more + preserve every error line in the middle.
  const head = hasErr ? 30 : 14;
  const tail = hasErr ? 20 : 8;
  if (lines.length <= head + tail) return result(lines, before);

  const midStart = head;
  const midEnd = lines.length - tail;
  const middle = lines.slice(midStart, midEnd);
  const keptErrors = hasErr ? middle.filter((l) => ERROR_RE.test(l)).slice(0, 60) : [];
  const omitted = middle.length - keptErrors.length;

  const out = [
    ...lines.slice(0, head),
    `… [zemory compress: ${omitted} line(s) omitted${hasErr ? "; error lines kept" : ""}] …`,
    ...keptErrors,
    ...lines.slice(midEnd),
  ];
  return result(out, before);
}

function collapseBlanks(lines: string[]): string[] {
  const out: string[] = [];
  let blank = false;
  for (const l of lines) {
    const isBlank = l.trim() === "";
    if (isBlank && blank) continue;
    blank = isBlank;
    out.push(l);
  }
  return out;
}

function dedupeConsecutive(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let n = 1;
    while (i + n < lines.length && lines[i + n] === lines[i] && lines[i].trim() !== "") n++;
    out.push(n > 1 ? `${lines[i]}  (×${n})` : lines[i]);
    i += n;
  }
  return out;
}
