// plan/28 §0o — every pointer inside the store's parts must land: the parts moved (dictionary names, renumbered shelves),
// so a rule that names another rule, a repo path or a section of the old rules file can point at nothing.
//
// Three kinds of pointer, read from the words of each part (RULE.md · SLOT.md · SKILL.md · references, and the reminder
// text of gate.json — never its examples, which are test data) and from the kits' own files:
//   ① a part: a full name, a key (Rule_38) or a legacy id (02-38) — it must exist; a legacy id is reported (cite the full
//      name); a retired part is reported with what replaced it;
//   ② a repo path in backticks — it must belong to a slot of the structure (the root slot `.` does not count: it would
//      cover everything); under `docs/agent/` the next segment must be a current harness entry; a skill path must name a
//      skill of the store;
//   ③ a section of the old rules file (`§Lõi`, `02_RULES §Git`, `§Cổng cho hiến pháp`) — gone with the file harness.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { citationKey, legacyKey } from "./harness-names.js";
import { listParts, partFiles, SHELVES, STORE_DIR, type Part } from "./store.js";

const HARNESS_ENTRIES = new Set(["01_RULES", "02_CONSTITUTION", "03_STRUCTURE", "04_SKILLS.md", "05_TODO.md", "06_CHANGES.md", "archive"]);
// A NAMED section of the old rules / constitution file. A numbered section (`§3`) is a section of the document it is
// written in, not a pointer into the old file.
const OLD_SECTION = /§\s?(Lõi|Cổng cho hiến pháp|Cổng của hiến pháp|Hành xử|Git|Guardrail|Phạm vi project|Tài liệu|Ngôn ngữ|Sổ việc|Chốt phiên)\b|\b0[12]_(RULES|CONSTITUTION)(\.md)?\s+§/;

/** A slot path as a matcher: `<x>` is one segment, `*` part of one, a trailing `/` covers everything below. */
function slotMatcher(path: string): RegExp {
  const esc = path.trim().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/<[^>]+>/g, "[^/]+").replace(/\*/g, "[^/]*");
  return path.endsWith("/") ? new RegExp(`^${esc}`) : new RegExp(`^${esc}(/|$)`);
}

function storeIndex(storeDir: string): {
  keys: Map<string, Part>; retired: Map<string, Part>; slots: RegExp[]; slotPaths: string[]; skills: Set<string>; roots: Set<string>;
} {
  const keys = new Map<string, Part>(), retired = new Map<string, Part>();
  for (const shelf of SHELVES) {
    for (const p of listParts(storeDir, shelf)) keys.set(p.key, p);
    for (const p of listParts(join(storeDir, "Archive"), shelf)) retired.set(p.key, p);
  }
  const slots: RegExp[] = [];
  const slotPaths: string[] = [];
  for (const p of listParts(storeDir, "03_STRUCTURE")) {
    for (const one of String(p.meta.path ?? "").split(/\s*[·|]\s*/)) {
      if (!one || one === ".") continue;
      slots.push(slotMatcher(one));
      slotPaths.push(one);
    }
  }
  const skills = new Set(listParts(storeDir, "04_SKILLS").map((p) => p.folder));
  // the roots of the repo tree: the first segment of every slot path that has a folder under it
  const roots = new Set(slotPaths.filter((s) => s.includes("/")).map((s) => s.split("/")[0]).filter((s) => !s.startsWith("<")));
  return { keys, retired, slots, slotPaths, skills, roots };
}

/** A path written RELATIVE to the slot or folder it is described in (`api/` in the backend slot): some slot's path ends
 *  with it. Placeholders on either side match one segment. */
function endsSomeSlot(path: string, slotPaths: string[]): boolean {
  const tail = path.replace(/\/+$/, "");
  const re = new RegExp(`(^|/)${tail.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/<[^>]+>/g, "[^/]+").replace(/\*/g, "[^/]*")}/?$`);
  return slotPaths.some((s) => re.test(s.replace(/<[^>]+>/g, "x"))) || slotPaths.some((s) => s.includes(`/${tail.split("/")[0]}/`));
}

/** The words of a part that may point somewhere: its text files and the reminder of its gate.json. */
function wordsOf(dir: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const f of partFiles(dir)) {
    if (/\.(md)$/i.test(f)) out.push([f, readFileSync(join(dir, f), "utf8")]);
    if (f === "gate.json") {
      try {
        const g = JSON.parse(readFileSync(join(dir, f), "utf8")) as { prompt?: { text?: string } };
        if (g.prompt?.text) out.push([`${f} › prompt.text`, g.prompt.text]);
      } catch { /* an unreadable gate.json is reported by the example runner */ }
    }
  }
  return out;
}

const looksLikePath = (s: string): boolean =>
  /^[.\w<>*-][\w.<>*/-]*$/.test(s) && (s.includes("/") || /^(AGENTS|CLAUDE|README)\.md$|^\.(env|gitignore|gitattributes)$/.test(s)) &&
  !/^(https?:|\/\/|\.\.?\/|[A-Za-z]:)/.test(s) && !/^\d/.test(s) && !s.includes("//") &&
  // `cx/cy`, `a/b`: short tokens with a slash that are not paths (units, ratios)
  !/^[a-z]{1,3}\/[a-z]{1,3}$/i.test(s);

export interface PointerFinding {
  where: string;
  kind: "part" | "legacy-id" | "retired" | "path" | "harness-path" | "skill" | "old-section";
  pointer: string;
  note?: string;
}

/** Every pointer of the store that lands nowhere (or lands on an old name). Empty = every pointer resolves. */
export function storePointerFindings(storeDir = STORE_DIR): PointerFinding[] {
  const idx = storeIndex(storeDir);
  const out: PointerFinding[] = [];
  const texts: Array<[string, string, string | null]> = [];
  for (const shelf of SHELVES) for (const p of listParts(storeDir, shelf)) for (const [f, t] of wordsOf(p.dir)) texts.push([`${shelf}/${p.folder}/${f}`, t, p.dir]);
  const own = join(storeDir, "Own");
  if (existsSync(own)) for (const kit of readdirSync(own)) for (const f of partFiles(join(own, kit))) if (/\.md$/i.test(f)) texts.push([`Own/${kit}/${f}`, readFileSync(join(own, kit, f), "utf8"), null]);

  for (const [where, text, partDir] of texts) {
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/^(aka|from|id|replaced-by):/.test(line)) return;
      const at = `${where}:${i + 1}`;
      // ① parts
      for (const m of line.matchAll(/\b(Rule|Cons|Slot)_[A-Z][A-Za-z]*_\d{2,3}_[A-Z0-9][A-Za-z0-9]*\b|\b(Rule|Cons|Slot)_\d{1,3}\b/g)) {
        const key = citationKey(m[0]);
        if (!key || idx.keys.has(key)) continue;
        const gone = idx.retired.get(key);
        out.push(gone ? { where: at, kind: "retired", pointer: m[0], note: `retired; replaced by ${String(gone.meta["replaced-by"] ?? "?")}` }
          : { where: at, kind: "part", pointer: m[0], note: "no such part" });
      }
      for (const m of line.matchAll(/(?<![\w./-])(0[123]-\d{1,3})(?![\w.]|-\d)/g)) {
        const key = legacyKey(m[1]);
        const live = key ? idx.keys.get(key) : undefined;
        out.push({ where: at, kind: "legacy-id", pointer: m[1], note: live ? `cite ${live.folder}` : "no such part" });
      }
      // ② repo paths
      for (const m of line.matchAll(/`([^`\s]+)`/g)) {
        const raw = m[1].replace(/[),.;:]+$/, "");
        if (!looksLikePath(raw)) continue;
        const path = raw.replace(/^\.\//, "");
        if (path.startsWith("docs/agent/")) {
          const next = path.slice("docs/agent/".length).split("/")[0];
          if (next && next !== "*" && !HARNESS_ENTRIES.has(next)) out.push({ where: at, kind: "harness-path", pointer: raw, note: `'${next}' is not a current harness entry` });
          continue;
        }
        if (path.startsWith("docs/hooks/")) { out.push({ where: at, kind: "harness-path", pointer: raw, note: "docs/hooks/ is gone in the folder harness (hooks live beside their rule)" }); continue; }
        const skill = /^\.claude\/skills\/([^/]+)/.exec(path);
        if (skill) {
          if (!skill[1].startsWith("<") && !idx.skills.has(skill[1])) out.push({ where: at, kind: "skill", pointer: raw, note: `no skill ${skill[1]} in the store` });
          continue;
        }
        // A pointer INTO THE REPO starts at a root the structure knows (`backend/` · `data/` · `.claude/` …) and must land
        // on a slot. Anything else is a word, not a pointer: a sub-folder a slot describes for itself (`logo/`), a file
        // inside a format (`word/document.xml`), an example of a name to avoid (`misc/`), a path on the machine.
        if (!idx.roots.has(path.split("/")[0])) continue;
        if (idx.slots.some((re) => re.test(path))) continue;
        if (partDir && existsSync(join(partDir, path.replace(/\*.*$/, "")))) continue;
        if (endsSomeSlot(path, idx.slotPaths)) continue;
        out.push({ where: at, kind: "path", pointer: raw, note: "no slot of the structure holds this path" });
      }
      // ③ sections of the old rules file
      const sec = OLD_SECTION.exec(line);
      if (sec) out.push({ where: at, kind: "old-section", pointer: sec[0].trim() });
    });
  }
  return out;
}

/** Counts per kind, for a report line. */
export function pointerSummary(f: PointerFinding[]): string {
  const by = new Map<string, number>();
  for (const x of f) by.set(x.kind, (by.get(x.kind) ?? 0) + 1);
  return [...by].map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
}

