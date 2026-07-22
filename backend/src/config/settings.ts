// Persistent global settings (~/.zemory/config.json) — small toggles the UI can
// flip and that every fresh CLI process reads. Local-only JSON; fail-open to
// defaults if missing/corrupt. The env var still wins as an explicit override.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentMemoryDir } from "../memory/db.js";

// Resolved per call (not a module const) so a `memory relocate` mid-process makes
// every subsequent read/write hit the config.json that moved with the data dir.
function configPath(): string {
  return join(currentMemoryDir(), "config.json");
}

/** A provenance lane selector. Fields left undefined act as wildcards, so
 *  `{origin:'web'}` matches every web session and `{origin:'local',host:'X',
 *  source:'codex'}` matches exactly one agent on one machine. Used to EXCLUDE
 *  "shared" lanes from sync/recall without deleting anything. */
export interface ScopeLane {
  origin?: string;
  host?: string;
  source?: string;
}

interface ZConfig {
  hybrid?: boolean;
  rerank?: boolean;
  scope?: boolean;
  drive?: string;
  /** UI language: 'vi' (default) | 'en'. */
  lang?: string;
  scopeExclude?: ScopeLane[];
  /** UI UI layout (panel sizes / resize positions) — persisted so a reopen
   *  restores exactly what the user dragged (localStorage resets per random port). */
  ui?: Record<string, unknown>;
  /** Start zemory when the OS starts (plan 14 §B). Default false. */
  autostart?: boolean;
  /** Auto-sync the memory via the Drive bundle when data drifts (plan 14 §3b).
   *  Default false — it moves data off the machine, so it stays opt-in. */
  autosync?: boolean;
  /** Idle background scheduler (scan → embed → digest) while the daemon runs
   *  (plan 14 §B). Default true — this is the "it just keeps itself current" bit. */
  scheduler?: boolean;
  /** How DEEP a cross-machine sync carries (plan 08 §7). "lean" = source rows
   *  only (default, ~74% smaller); "full" = whole-DB snapshot incl. derived
   *  layers (disaster-restore copy). */
  syncLevel?: SyncLevel;
}

/** Cross-machine sync depth (plan 08 §7).
 *  • "lean" — source rows only (sessions/messages/known_stores); the receiver
 *    rebuilds FTS + re-embeds. This is the default and the lean bundle (~74%
 *    smaller). Maps to the "rows" bundle payload.
 *  • "full" — a byte-for-byte snapshot of the whole DB (ships every derived
 *    layer). A disaster-restore copy; much larger. Maps to the "full" payload. */
export type SyncLevel = "lean" | "full";

function read(): ZConfig {
  try {
    return JSON.parse(readFileSync(configPath(), "utf8")) as ZConfig;
  } catch {
    return {};
  }
}

function write(c: ZConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(c, null, 2)}\n`);
}

/** Hybrid recall on? Default true (benchmark gate passed). */
export function getHybridSetting(): boolean {
  return read().hybrid ?? true;
}

export function setHybridSetting(on: boolean): void {
  const c = read();
  c.hybrid = on;
  write(c);
}

/** Cross-encoder rerank on? Default true (UI defaults all filters on); persisted. */
export function getRerankSetting(): boolean {
  return read().rerank ?? true;
}

export function setRerankSetting(on: boolean): void {
  const c = read();
  c.rerank = on;
  write(c);
}

/** Recall scope = all projects? Default true (memory is global); persisted. */
export function getScopeSetting(): boolean {
  return read().scope ?? true;
}

export function setScopeSetting(on: boolean): void {
  const c = read();
  c.scope = on;
  write(c);
}

/** Start-with-OS toggle (the config flag; the actual OS hook is in autostart.ts). */
export function getAutostart(): boolean {
  return read().autostart ?? false;
}
export function setAutostartSetting(on: boolean): void {
  const c = read();
  c.autostart = on;
  write(c);
}

/** Auto-sync the memory via Drive when data drifts (plan 14 §3b). Opt-in. */
export function getAutosync(): boolean {
  return read().autosync ?? false;
}
export function setAutosyncSetting(on: boolean): void {
  const c = read();
  c.autosync = on;
  write(c);
}

/** Idle background scheduler (scan/embed/digest). Default ON. */
export function getScheduler(): boolean {
  return read().scheduler ?? true;
}
export function setSchedulerSetting(on: boolean): void {
  const c = read();
  c.scheduler = on;
  write(c);
}

/** Cross-machine sync depth (plan 08 §7). Default "lean" (the ~74%-smaller
 *  rows bundle); "full" ships the whole-DB snapshot for disaster restore. */
export function getSyncLevel(): SyncLevel {
  return read().syncLevel === "full" ? "full" : "lean";
}
export function setSyncLevel(level: SyncLevel): void {
  const c = read();
  c.syncLevel = level === "full" ? "full" : "lean";
  write(c);
}

/** Drive sync folder (where encrypted bundles live). Empty = not linked. */
export function getDriveDir(): string {
  return read().drive ?? "";
}

export function setDriveDir(path: string): void {
  const c = read();
  c.drive = path;
  write(c);
}

/** UI language. Default Vietnamese (the tool's primary audience); 'en' available. */
export function getLang(): string {
  return read().lang === "en" ? "en" : "vi";
}

export function setLang(lang: string): void {
  const c = read();
  c.lang = lang === "en" ? "en" : "vi";
  write(c);
}

/** Lanes EXCLUDED from sync + recall (default none). A filter, never a delete. */
export function getScopeExclude(): ScopeLane[] {
  const v = read().scopeExclude;
  return Array.isArray(v) ? v : [];
}

export function setScopeExclude(lanes: ScopeLane[]): void {
  const c = read();
  c.scopeExclude = lanes;
  write(c);
}

/** UI UI layout blob (opaque to the server; the page defines its shape). */
export function getUiState(): Record<string, unknown> {
  const v = read().ui;
  return v && typeof v === "object" ? v : {};
}

export function setUiState(state: Record<string, unknown>): void {
  const c = read();
  c.ui = state;
  write(c);
}
