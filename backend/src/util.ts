import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

/** Resolve an executable on PATH (handles Windows extensions). Null if absent. */
export function onPath(cmd: string): string | null {
  const exts =
    process.platform === "win32" ? ["", ".cmd", ".exe", ".ps1", ".bat"] : [""];
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const full = join(dir, cmd + ext);
      if (existsSync(full)) return full;
    }
  }
  return null;
}
