// Which install this machine chose (docs/plan/30 §0: native and Docker are backups of each other, a machine runs ONE).
// Each installer writes the choice to one file in the user's home; every other door reads it and says where to go
// instead of answering from a store nobody writes any more (2026-10-28: `node <clone>/dist/cli.js memory search` on a
// Docker machine read the emptied native store and printed "no matches" for every question, to every repo).
//
//   ~/.zemory/install.json   { "runtime": "docker" | "native", "at": "<ISO time>", "by": "<what wrote it>" }
//
// The Docker side's command (backend/scripts/host-cli.mjs, Node built-ins only) reads the same file on its own.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Runtime } from "./runtime.js";

export const INSTALL_CHOICE_FILE = (): string => join(homedir(), ".zemory", "install.json");

export interface InstallChoice {
  runtime: Runtime;
  at: string;
  by: string;
}

/** The machine's choice, or null when no installer wrote one (an install from before the file, or a broken file). */
export function readInstallChoice(file = INSTALL_CHOICE_FILE()): InstallChoice | null {
  try {
    const c = JSON.parse(readFileSync(file, "utf8")) as Partial<InstallChoice>;
    return c.runtime === "docker" || c.runtime === "native" ? { runtime: c.runtime, at: String(c.at ?? ""), by: String(c.by ?? "") } : null;
  } catch {
    return null;
  }
}

export function writeInstallChoice(runtime: Runtime, by: string, file = INSTALL_CHOICE_FILE()): void {
  if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ runtime, at: new Date().toISOString(), by }, null, 2) + "\n");
}

/** What the native command says on a machine that runs zemory in Docker: the one way that answers, nothing else. */
export function dockerMachineMessage(port: number): string {
  return `this machine runs zemory in Docker - use the zemory command (zemory memory search "<query>" --all), or ` +
    `GET http://127.0.0.1:${port}/memory-search?q=<query>&all=1. This one (node <clone>/dist/cli.js) is the native ` +
    "install, whose store the Docker install moved out: it would answer from an empty store.";
}
