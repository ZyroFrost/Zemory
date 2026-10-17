// plan/28 §0n — every gate carries its own examples: `block` (must be blocked) and `pass` (must go through). This runs them
// for real: a rule hook gets each example's files in a temp folder and the example's tool call; a slot gets the files and
// its conform check. A gate with a hook or a conform check and no example of either kind is a finding too — an untested
// gate proves nothing (rule 02-13). Read-only on the store; examples write only into their own temp folders.
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { listParts, SHELVES, slotGateFailures, STORE_DIR, type Part } from "./store.js";
import { promptMatches } from "./harness-names.js";
import { READ_FIRST_SOURCE } from "./read-first-src.js";

interface Example {
  note?: string;
  files?: Record<string, string>;
  policy?: Record<string, unknown>;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  /** prompt gates: the words of the request */
  prompt?: string;
  /** read gates: the path written · the command run · the body of the script that command runs */
  path?: string;
  command?: string;
  script?: string;
}

interface Gate {
  hook?: string | string[];
  conform?: unknown;
  prompt?: { re: string };
  read?: Array<{ when: string; prefix?: string; re?: string }>;
  block?: Example[];
  pass?: Example[];
}

// The read-first latch's own trigger test, loaded from the generated source: a second copy of that logic here drifted the
// day the latch learned that a file merely named in a command is not run (2026-10-17). The example's script body is written
// where the command runs it, in a temp folder, so the latch reads it exactly as it would in a repo.
type TriggerHit = (tr: unknown, root: string, targets: string[], cmd: string) => boolean;
let latchTriggerHit: TriggerHit | null = null;
function readTriggerFires(t: { when: string; prefix?: string; re?: string }, ex: Example): boolean {
  if (!latchTriggerHit) {
    const mod = { exports: {} as { triggerHit?: TriggerHit } };
    new Function("module", "exports", "require", "__dirname", READ_FIRST_SOURCE)(mod, mod.exports, createRequire(import.meta.url), tmpdir());
    latchTriggerHit = mod.exports.triggerHit ?? (() => false);
  }
  const root = mkdtempSync(join(tmpdir(), "zemory-door-"));
  try {
    const cmd = ex.command ?? "";
    if (ex.script) {
      const run = /\s([\w./\\-]+\.(?:py|ps1|js|mjs|cjs|cmd|bat|sh))\b/i.exec(" " + cmd);
      if (run) { const p = join(root, run[1]); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, ex.script); }
    }
    return latchTriggerHit(t, root, ex.path ? [ex.path] : [], cmd);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** Does a prompt / read gate fire on this example? Same matching as the reminder hook and the read-first latch. */
function fires(gate: Gate, ex: Example): boolean {
  if (gate.prompt) return promptMatches(gate.prompt.re, ex.prompt ?? "");
  return (gate.read ?? []).some((t) => readTriggerFires(t, ex));
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
  // The SHAPE of the example decides which door it tries: a rule can carry both a blocking hook and a keyword reminder
  // (plan/28 §0o), and a request is judged by the keywords while a tool call is judged by the hook.
  if (typeof ex.prompt === "string") return gate.prompt ? promptMatches(gate.prompt.re, ex.prompt) : false;
  if (gate.read && (ex.path !== undefined || ex.command !== undefined || ex.script !== undefined) && !gate.hook) return fires(gate, ex);
  if (!gate.hook && !gate.conform) return fires(gate, ex);
  return withFiles(ex.files, (root) => {
    // A real repo always has its flags folder (the guard generator makes it); a hook that remembers per session writes
    // there and lets the call through when it cannot — so the example gets one too.
    const flagsDir = (ex.policy as { flags_dir?: unknown } | undefined)?.flags_dir;
    if (typeof flagsDir === "string" && flagsDir) mkdirSync(join(root, flagsDir), { recursive: true });
    if (gate.hook) {
      // a rule that took in another carries one hook per check; the call is blocked when any of them blocks
      const input = { ...(ex.tool_input ?? {}) };
      if (typeof input.file_path === "string") input.file_path = join(root, input.file_path);
      return (Array.isArray(gate.hook) ? gate.hook : [gate.hook]).some((h) => {
        const file = join(part.dir, h);
        delete requireHere.cache[requireHere.resolve(file)];
        const mod = requireHere(file) as { check: (p: unknown, r: string, pol: unknown) => unknown };
        return Boolean(mod.check({ tool_name: ex.tool_name, tool_input: input, session_id: "gate-example" }, root, ex.policy ?? {}));
      });
    }
    return slotGateFailures(root, part.dir).length > 0;
  });
}

/** Findings for every part of a store (or a repo harness): an example that behaves the other way, or a gate with none. */
export function gateExampleFindings(root = STORE_DIR): string[] {
  const out: string[] = [];
  for (const shelf of SHELVES) {
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
      if (!gate.hook && !gate.conform && !gate.prompt && !gate.read) continue; // a mark only (guard · test:x …) — run by its own test
      const label = `${part.id} ${part.name}`;
      if (!(gate.block ?? []).length || !(gate.pass ?? []).length) {
        out.push(`${label}: needs at least one block and one pass example`);
      }
      // Two doors, two sets of examples: keywords next to a hook need their own request examples both ways.
      if (gate.prompt && (gate.hook || gate.conform)) {
        const asks = (xs: Example[] | undefined): boolean => (xs ?? []).some((x) => typeof x.prompt === "string");
        if (!asks(gate.block) || !asks(gate.pass)) out.push(`${label}: its keywords need a request example that fires and one that does not`);
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

/** Patterns a part may never carry: a person named as the one deciding, a dated decision, contact or machine details. The
 *  first two are about the TEXT of a rule or skill (`.md`): a hook that exists to catch "user chốt <date>" must carry that
 *  phrase in its detector and its examples. Contact and machine details are checked in every file. Kept narrow on purpose
 *  — a check that cries wolf is ignored. */
const PRIVATE: Array<[string, RegExp, "md" | "all"]> = [
  ["names the person giving the work", /\buser\b/i, "md"],
  ["a dated decision", /\b(chốt|chot)\s+\d{4}-\d{2}-\d{2}/i, "md"],
  // `.example` / `example.com` are reserved for examples (RFC 2606) — a sample address, not a contact.
  ["an e-mail address", /[\w.+-]+@(?![\w.-]*\bexample\b)[\w-]+\.[\w.]+/, "all"],
  ["an IPv4 address", /\b(?:\d{1,3}\.){3}\d{1,3}\b/, "all"],
  ["a path under a user profile", /[A-Za-z]:[\\/]Users[\\/][^\\/\s<]+/, "all"],
  ["a personal alias", /ZyroFrost/i, "all"],
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
      if (r === "source.json") continue; // the ONE place the tool's own address lives (plan/28 §0f)
      if (!/\.(md|json|cjs|mjs|js|ps1|py|txt)$/i.test(name)) continue;
      let text = readFileSync(p, "utf8");
      // A gate's block/pass examples are test data: a block example of the privacy gate must carry the very detail the
      // gate stops, so they are not scanned. The gate's own words (its reminder, its settings) still are.
      if (name === "gate.json") {
        try {
          const g = JSON.parse(text) as Record<string, unknown>;
          delete g.block;
          delete g.pass;
          text = JSON.stringify(g, null, 2);
        } catch { /* an unreadable gate.json is scanned as it is */ }
      }
      text.split(/\r?\n/).forEach((line, i) => {
        const md = /\.md$/i.test(name);
        // In prose, text inside backticks is data (a transcript role `user`, a command) — not a person being named.
        const prose = line.replace(/`[^`]*`/g, " ");
        for (const [what, re, scope] of PRIVATE) {
          if (scope === "md" ? md && re.test(prose) : re.test(line)) out.push(`${r}:${i + 1} — ${what}`);
        }
      });
    }
  };
  if (existsSync(storeDir)) walk(storeDir, "");
  return out;
}
