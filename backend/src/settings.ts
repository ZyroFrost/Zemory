// Persistent global settings (~/.zemory/config.json) — small toggles the UI can
// flip and that every fresh CLI process reads. Local-only JSON; fail-open to
// defaults if missing/corrupt. The env var still wins as an explicit override.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentBrainDir } from "./brain/db.js";

// Resolved per call (not a module const) so a `brain relocate` mid-process makes
// every subsequent read/write hit the config.json that moved with the data dir.
function configPath(): string {
  return join(currentBrainDir(), "config.json");
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
  /** UI cockpit layout (panel sizes / resize positions) — persisted so a reopen
   *  restores exactly what the user dragged (localStorage resets per random port). */
  ui?: Record<string, unknown>;
}

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

/** Pick a string by the current UI language. Server-side i18n for the few
 *  human-facing strings that originate in the backend (status/checks/doctor). */
export function tr(vi: string, en: string): string {
  return getLang() === "en" ? en : vi;
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

/** UI cockpit layout blob (opaque to the server; the page defines its shape). */
export function getUiState(): Record<string, unknown> {
  const v = read().ui;
  return v && typeof v === "object" ? v : {};
}

export function setUiState(state: Record<string, unknown>): void {
  const c = read();
  c.ui = state;
  write(c);
}
