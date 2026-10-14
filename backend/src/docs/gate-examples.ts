// plan/28 §0n — every gate carries its own examples: `block` (must be blocked) and `pass` (must go through). This runs them
// for real: a rule hook gets each example's files in a temp folder and the example's tool call; a slot gets the files and
// its conform check. A gate with a hook or a conform check and no example of either kind is a finding too — an untested
// gate proves nothing (rule 02-13). Read-only on the store; examples write only into their own temp folders.
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { listParts, SHELVES, slotGateFailures, STORE_DIR, type Part } from "./store.js";

interface Example {
  note?: string;
  files?: Record<string, string>;
  policy?: Record<string, unknown>;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

interface Gate {
  hook?: string;
  conform?: unknown;
  block?: Example[];
  pass?: Example[];
}

const requireHere = createRequire(import.meta.url);

function withFiles<T>(files: Record<string, string> | undefined, run: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), "zemory-gate-ex-"));
  try {
    for (const [rel, text] of Object.entries(files ?? {})) {
      const p = join(root, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, text);
    }
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** Does this example get blocked? A rule hook: check() returns non-null. A slot: conform finds something. */
function blocks(part: Part, gate: Gate, ex: Example): boolean {
  return withFiles(ex.files, (root) => {
    if (gate.hook) {
      const file = join(part.dir, gate.hook);
      delete requireHere.cache[requireHere.resolve(file)];
      const mod = requireHere(file) as { check: (p: unknown, r: string, pol: unknown) => unknown };
      const input = { ...(ex.tool_input ?? {}) };
      if (typeof input.file_path === "string") input.file_path = join(root, input.file_path);
      return Boolean(mod.check({ tool_name: ex.tool_name, tool_input: input, session_id: "gate-example" }, root, ex.policy ?? {}));
    }
    return slotGateFailures(root, part.dir).length > 0;
  });
}

/** Findings for every part of a store (or a repo harness): an example that behaves the other way, or a gate with none. */
export function gateExampleFindings(root = STORE_DIR): string[] {
  const out: string[] = [];
  for (const shelf of SHELVES) {
    if (shelf === "04_SKILLS") continue;
    for (const part of listParts(root, shelf)) {
      const p = join(part.dir, "gate.json");
      if (!existsSync(p)) continue;
      let gate: Gate;
      try {
        gate = JSON.parse(readFileSync(p, "utf8")) as Gate;
      } catch {
        out.push(`${part.id}: gate.json unreadable`);
        continue;
      }
      if (!gate.hook && !gate.conform) continue; // a mark only (guard · test:x …) — run by its own test
      const label = `${part.id} ${part.name}`;
      if (!(gate.block ?? []).length || !(gate.pass ?? []).length) {
        out.push(`${label}: needs at least one block and one pass example`);
      }
      (gate.block ?? []).forEach((ex, i) => {
        try {
          if (!blocks(part, gate, ex)) out.push(`${label}: block example ${i + 1}${ex.note ? ` (${ex.note})` : ""} went through`);
        } catch (e) {
          out.push(`${label}: block example ${i + 1} threw ${(e as Error).message}`);
        }
      });
      (gate.pass ?? []).forEach((ex, i) => {
        try {
          if (blocks(part, gate, ex)) out.push(`${label}: pass example ${i + 1}${ex.note ? ` (${ex.note})` : ""} was blocked`);
        } catch (e) {
          out.push(`${label}: pass example ${i + 1} threw ${(e as Error).message}`);
        }
      });
    }
  }
  return out;
}

// ── privacy of the store (plan/28 §0f) ──────────────────────────────────────────────────────────────────────────────

/** Patterns a part may never carry: a person named as the one deciding, a quoted decision, a dated decision, contact or
 *  machine details. Kept narrow on purpose — a check that cries wolf is ignored. */
const PRIVATE: Array<[string, RegExp]> = [
  ["names the person giving the work", /\buser\b/i],
  ["a dated decision", /\b(chốt|chot)\s+\d{4}-\d{2}-\d{2}/i],
  ["an e-mail address", /[\w.+-]+@[\w-]+\.[\w.]+/],
  ["an IPv4 address", /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
  ["a path under a user profile", /[A-Za-z]:[\\/]Users[\\/][^\\/\s<]+/],
  ["a personal alias", /ZyroFrost/i],
];

/** Every private detail found in the store's parts and kit files: `file:line — what`. */
export function storePrivacyFindings(storeDir = STORE_DIR): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      if (statSync(p).isDirectory()) {
        walk(p, r);
        continue;
      }
      if (!/\.(md|json|cjs|mjs|js|ps1|py|txt)$/i.test(name)) continue;
      readFileSync(p, "utf8").split(/\r?\n/).forEach((line, i) => {
        for (const [what, re] of PRIVATE) if (re.test(line)) out.push(`${r}:${i + 1} — ${what}`);
      });
    }
  };
  if (existsSync(storeDir)) walk(storeDir, "");
  return out;
}
