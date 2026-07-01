// Persistent global settings (~/.zemory/config.json) — small toggles the UI can
// flip and that every fresh CLI process reads. Local-only JSON; fail-open to
// defaults if missing/corrupt. The env var still wins as an explicit override.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BRAIN_DIR } from "./brain/db.js";

const CONFIG_PATH = join(BRAIN_DIR, "config.json");

interface ZConfig {
  hybrid?: boolean;
  rerank?: boolean;
  scope?: boolean;
  drive?: string;
}

function read(): ZConfig {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as ZConfig;
  } catch {
    return {};
  }
}

function write(c: ZConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(c, null, 2)}\n`);
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
