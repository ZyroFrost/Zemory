// Links between the layers of law (plan/29 §6 · Rule_Gate_86_LawLayersAgree): a law or constitution frame ends with
// `## Links · Liên kết` — `Implements` (a skill that carries it out) · `Repo declares` (the frame where a repo writes its own
// decision) · `Related` (another part on the same matter); a skill names the laws it carries out under `## Implements`.
// The one home of a link is that section in the body; no header field repeats it (Rule_Gate_35_OneHome).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { frontMatter, leafOf, listParts, listStructures, mainOf, mainPath, SHELVES, STORE_DIR, translationsOf, type Shelf } from "./store.js";
import { CONS_REPO_FILE, SHELF } from "./harness-names.js";

export type LinkKind = "implements" | "declares" | "related";
export interface LawLink { kind: LinkKind; name: string }

const KIND: Record<string, LinkKind> = { implements: "implements", "repo declares": "declares", related: "related" };

/** The body of the first `## <heading>` section whose heading starts with one of `heads` (up to the next `## `). */
function section(text: string, heads: RegExp): string | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const i = lines.findIndex((l) => /^##\s/.test(l) && heads.test(l.replace(/^##\s+/, "")));
  if (i < 0) return null;
  const end = lines.findIndex((l, j) => j > i && /^##?\s/.test(l));
  return lines.slice(i + 1, end < 0 ? undefined : end).join("\n");
}

/** The links a law or frame writes in its `## Links` section. */
export function linksOf(text: string): LawLink[] {
  const s = section(text, /^Links\b/);
  if (s === null) return [];
  const out: LawLink[] = [];
  for (const m of s.matchAll(/^-\s*(Implements|Repo declares|Related)\b[^:\n]*:\s*`([^`\n]+)`/gm)) {
    out.push({ kind: KIND[m[1].toLowerCase()], name: m[2].trim() });
  }
  return out;
}

/** The laws a skill names in its `## Implements` section. */
export function implementsOf(text: string): string[] {
  const s = section(text, /^Implements\b/);
  if (s === null) return [];
  return [...s.matchAll(/^-\s*`([^`\n]+)`/gm)].map((m) => m[1].trim());
}

// a frame (Skill_Frame_Own) carries placeholders where its links go: the shape, not links of its own.
// `own` = the Cons.md a repo writes into a constitution frame: the frame's rule text is HS's, so a skill of the repo's own
// (Skill_Own_*) is answered there - its definition rows name the skill (plan/29 §23) - not under the HS text's ## Links
interface Node { leaf: string; shelf: Shelf; text: string; own?: string; frame?: boolean }

function nodesAt(root: string): Map<string, Node> {
  const out = new Map<string, Node>();
  for (const shelf of SHELVES) {
    for (const p of listParts(root, shelf)) {
      const f = mainPath(p.dir, mainOf(p));
      const c = join(p.dir, CONS_REPO_FILE);
      out.set(leafOf(p.folder), { leaf: leafOf(p.folder), shelf, text: existsSync(f) ? readFileSync(f, "utf8") : "", own: existsSync(c) ? readFileSync(c, "utf8") : undefined, frame: shelf === SHELF.skills && String(p.meta.frame ?? "") === "true" });
    }
  }
  // a structure (Struc_*) can be named as related; it carries no link section of its own
  for (const p of listStructures(root)) out.set(leafOf(p.folder), { leaf: leafOf(p.folder), shelf: SHELF.structure, text: "" });
  return out;
}

/**
 * Broken or one-sided links. `root` is the store or a repo's harness folder. In the store every name must be a living part
 * and every `Implements` must be answered by the skill (and the other way round). In a repo a name is dead only when neither
 * the repo nor the store has it (a repo carries part of the store), and the two directions are compared only when both parts
 * are in the repo; a skill of the repo's own is answered by the frame's Cons.md naming it. Returns "<part>: <finding>" lines.
 */
export function lawLinkFindings(root: string = STORE_DIR, storeDir = STORE_DIR): string[] {
  const here = nodesAt(root);
  const isStore = root === storeDir;
  const store = isStore ? here : nodesAt(storeDir);
  const out: string[] = [];
  const known = (n: string): boolean => here.has(n) || store.has(n);
  for (const node of here.values()) {
    if (node.frame) continue;
    if (node.shelf === SHELF.skills) {
      for (const law of implementsOf(node.text)) {
        if (!known(law)) { out.push(`${node.leaf}: ## Implements names ${law}, which is not a living part`); continue; }
        const target = here.get(law);
        if (!target) continue;
        if (!/^(Rule|Cons)_/.test(law)) { out.push(`${node.leaf}: ## Implements names ${law}, which is not a law or a frame`); continue; }
        const answeredInOwn = /^Skill_Own_/.test(node.leaf) && !!target.own && new RegExp("`" + node.leaf + "`").test(target.own);
        if (!answeredInOwn && !linksOf(target.text).some((l) => l.kind === "implements" && l.name === node.leaf)) {
          out.push(`${node.leaf}: says it implements ${law}, but ${law} has no "Implements: ${node.leaf}" line under ## Links`);
        }
      }
      continue;
    }
    for (const l of linksOf(node.text)) {
      if (!known(l.name)) { out.push(`${node.leaf}: ## Links names ${l.name}, which is not a living part`); continue; }
      if (l.kind === "implements" && !l.name.startsWith("Skill_")) out.push(`${node.leaf}: "Implements" names ${l.name}, which is not a skill`);
      if (l.kind === "declares" && !l.name.startsWith("Cons_")) out.push(`${node.leaf}: "Repo declares" names ${l.name}, which is not a constitution frame`);
      if (l.kind !== "implements") continue;
      const skill = here.get(l.name);
      if (skill && !implementsOf(skill.text).includes(node.leaf)) {
        out.push(`${node.leaf}: names ${l.name} as implementing it, but ${l.name} does not list it under ## Implements`);
      }
    }
  }
  return [...new Set(out)].sort();
}

/** Every part tied to `leaf` in the store, both ways: what its own text links to, and what links to it (a law's `## Links`
 *  line or a skill's `## Implements` line). `zemory impact` prints it: changing one layer means checking the ones tied to it. */
export function partLinks(leaf: string, storeDir = STORE_DIR): { to: LawLink[]; from: Array<{ name: string; kind: LinkKind }> } {
  const nodes = nodesAt(storeDir);
  const self = nodes.get(leaf);
  const to = self ? (self.shelf === SHELF.skills ? implementsOf(self.text).map((name) => ({ kind: "implements" as const, name })) : linksOf(self.text)) : [];
  const from: Array<{ name: string; kind: LinkKind }> = [];
  for (const n of nodes.values()) {
    if (n.leaf === leaf) continue;
    if (n.shelf === SHELF.skills) { if (implementsOf(n.text).includes(leaf)) from.push({ name: n.leaf, kind: "implements" }); continue; }
    for (const l of linksOf(n.text)) if (l.name === leaf) from.push({ name: n.leaf, kind: l.kind });
  }
  return { to, from };
}

/** The sections every law and frame of the store carries, English first, then Vietnamese (plan/29 §11). */
export const LAW_SECTIONS = {
  en: ["What", "When", "Do", "Example", "Check"],
  vi: ["Luật là gì", "Khi nào áp", "Phải làm gì", "Ví dụ", "Máy kiểm"],
} as const;

/** Top-level steps of a section: lines that open with `1.` or `- ` at the margin. */
function steps(body: string | null): number {
  return body === null ? 0 : body.split("\n").filter((l) => /^(?:\d+\.|-)\s/.test(l)).length;
}

const headsOf = (text: string): string[] => [...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
const readText = (f: string): string => (existsSync(f) ? readFileSync(f, "utf8").replace(/\r\n/g, "\n") : "");
const LINKS_HEADS = ["Links", "Links · Liên kết"];

/**
 * A store law or frame not in the shape of plan/33: the English header carries the five English sections in order and then
 * Links, and nothing in another language; each translation beside it (`<header>.<code>.md`) carries the same sections - the
 * Vietnamese names for `vi`, the same number of sections for any other language - and the same number of `Do` steps, the one
 * count that shows a step lost in translation. Retired parts keep their old text. Returns "<part>: <finding>".
 */
export function lawFormatFindings(storeDir = STORE_DIR): string[] {
  const out: string[] = [];
  for (const shelf of [SHELF.rules, SHELF.constitution] as const) {
    for (const p of listParts(storeDir, shelf)) {
      if (String(p.meta.retired ?? "") === "true") continue;
      const text = readText(mainPath(p.dir, mainOf(p)));
      const leaf = leafOf(p.folder);
      const heads = headsOf(text);
      const missing = LAW_SECTIONS.en.filter((h) => !heads.includes(h));
      if (missing.length) { out.push(`${leaf}: missing section(s) ${missing.map((h) => `"## ${h}"`).join(", ")}`); continue; }
      const order = LAW_SECTIONS.en.map((h) => heads.indexOf(h));
      if (order.some((v, i) => i > 0 && v < order[i - 1])) out.push(`${leaf}: sections out of order (${LAW_SECTIONS.en.join(", ")}, then Links)`);
      const stray = LAW_SECTIONS.vi.filter((h) => heads.includes(h));
      if (stray.length) out.push(`${leaf}: the English header carries Vietnamese sections (${stray.join(", ")}) - they belong in ${leaf}.vi.md`);
      const en = steps(section(text, /^Do$/));
      for (const [lang, file] of translationsOf(p.dir)) {
        const tr = readText(join(p.dir, file));
        const th = headsOf(tr).filter((h) => !LINKS_HEADS.includes(h));
        if (lang === "vi") {
          const lost = LAW_SECTIONS.vi.filter((h) => !th.includes(h));
          if (lost.length) { out.push(`${leaf}.vi.md: missing section(s) ${lost.map((h) => `"## ${h}"`).join(", ")}`); continue; }
          const vi = steps(section(tr, /^Phải làm gì$/));
          if (vi !== en) out.push(`${leaf}: "Do" has ${en} step(s) but "Phải làm gì" in ${file} has ${vi}`);
        } else {
          if (th.length < LAW_SECTIONS.en.length) out.push(`${file}: ${th.length} section(s), the English header has ${LAW_SECTIONS.en.length}`);
          const third = th[2] ? steps(section(tr, new RegExp(`^${th[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`))) : 0;
          if (third !== en) out.push(`${leaf}: "Do" has ${en} step(s) but the third section of ${file} has ${third}`);
        }
      }
    }
  }
  return out;
}

/**
 * Translations behind their header (plan/33): a translation's `version:` names the header version it was translated from;
 * a lower one means the English changed since. Advisory - the translation still reads, it may lag. "<file>: v<n> of v<m>".
 */
export function staleTranslations(storeDir = STORE_DIR): string[] {
  const out: string[] = [];
  for (const shelf of SHELVES) {
    for (const p of listParts(storeDir, shelf)) {
      for (const [, file] of translationsOf(p.dir)) {
        const v = Number(frontMatter(readText(join(p.dir, file)))?.meta.version ?? 0);
        if (v < p.version) out.push(`${p.folder}/${file}: translated from v${v}, the header is v${p.version}`);
      }
    }
  }
  return out;
}
