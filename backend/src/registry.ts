// Known-projects registry — a global list of projects zemory has seen, so the
// UI can offer a picker (instead of only the launch directory). Stored at
// ~/.zemory/projects.json. Visiting or setting up a project registers it.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { CONFIG_FILE } from "./core/config.js";

const DIR = join(homedir(), ".zemory");
const FILE = join(DIR, "projects.json");

function read(): string[] {
  if (!existsSync(FILE)) return [];
  try {
    const v = JSON.parse(readFileSync(FILE, "utf8"));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Record a project root (idempotent). */
export function rememberProject(root: string): void {
  const list = read();
  if (list.includes(root)) return;
  list.push(root);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n");
}

/** Known projects that still exist + are still set up. */
export function listKnownProjects(): { root: string; name: string }[] {
  return read()
    .filter((r) => existsSync(join(r, CONFIG_FILE)))
    .map((r) => ({ root: r, name: basename(r) }));
}
