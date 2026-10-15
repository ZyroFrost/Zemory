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
  /** prompt gates: the words of the request */
  prompt?: string;
  /** read gates: the path written · the command run · the body of the script that command runs */
  path?: string;
  command?: string;
  script?: string;
}

interface Gate {
  hook?: string;
  conform?: unknown;
  prompt?: { re: string };
  read?: Array<{ when: string; prefix?: string; re?: string }>;
  block?: Example[];
  pass?: Example[];
}

/** Does a prompt / read gate fire on this example? Same matching as the reminder hook and the read-first latch. */
function fires(gate: Gate, ex: Example): boolean {
  if (gate.prompt) return new RegExp(gate.prompt.re, "i").test(ex.prompt ?? "");
  return (gate.read ?? []).some((t) => {
    if (t.when === "path_prefix") return (ex.path ?? "").replace(/\\/g, "/").startsWith(`${t.prefix}/`);
    if (t.when === "cmd_re") return new RegExp(t.re ?? "$^", "i").test(ex.command ?? "");
    if (t.when === "script_re") return new RegExp(t.re ?? "$^", "i").test(ex.script ?? "");
    return false;
  });
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
  if (gate.prompt || gate.read) return fires(gate, ex);
  return withFiles(ex.files, (root) => {
    // A real repo always has its flags folder (the guard generator makes it); a hook that remembers per session writes
    // there and lets the call through when it cannot — so the example gets one too.
    const flagsDir = (ex.policy as { flags_dir?: unknown } | undefined)?.flags_dir;
    if (typeof flagsDir === "string" && flagsDir) mkdirSync(join(root, flagsDir), { recursive: true });
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
      readFileSync(p, "utf8").split(/\r?\n/).forEach((line, i) => {
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
