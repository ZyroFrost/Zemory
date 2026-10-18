// plan/29 §13b · §15 — the Cons.md a repo writes fills the frame HS holds. Three readings of that:
//  · a column of a table the frame defines (frame 10 `Server`, frame 14 `File`): the guard reads it, so the marker no
//    longer keeps a second copy (consColumn);
//  · a section of the frame the written Cons.md lacks — the shape of a frame is HS's, the repo only fills it
//    (frameShapeFindings, conform; Rule_Gate_86_LawLayersAgree);
//  · a section HS added to a frame after the repo wrote its Cons.md: sync puts the section in with the template text, so
//    conform holds the repo red on its placeholder until the repo fills it (addMissingSections).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONS_REPO_FILE, SHELF } from "./harness-names.js";
import { frontMatter, isFrame, leafOf, listParts, STORE_DIR } from "./store.js";

function written(file: string): string | null {
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  return String(frontMatter(text)?.meta.status ?? "") === "written" ? text : null;
}

/** The written Cons.md of a frame in the repo (by the frame's folder name), or null when absent / not written. */
function repoCons(agentDir: string, frame: string): string | null {
  const p = listParts(agentDir, SHELF.constitution).find((x) => leafOf(x.folder) === frame);
  return p ? written(join(p.dir, CONS_REPO_FILE)) : null;
}

/** The cells of `column` in every markdown table of `text` that has it: code marks dropped, a cell may list several values
 *  (`a` · `b`, or a, b); a template placeholder `<…>` and an empty mark (— · -) are not values. */
export function tableColumn(text: string, column: string): string[] {
  const out: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const cells = (l: string): string[] => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const at = cells(lines[i]).findIndex((c) => c.toLowerCase() === column.toLowerCase());
    let j = i + 2;
    for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
      if (at < 0) continue;
      const cell = cells(lines[j])[at] ?? "";
      for (const v of cell.replace(/<[^<>]*>/g, "").split(/\s*(?:·|,)\s*/)) {
        const s = v.replace(/`/g, "").trim();
        if (s && !/^<[^>]*>$/.test(s) && !/^[—–-]$/.test(s)) out.push(s);
      }
    }
    i = j - 1;
  }
  return [...new Set(out)];
}

/** A column of the table in a frame's written Cons.md (frame 10 `Server` · frame 14 `File`). */
export function consColumn(agentDir: string, frame: string, column: string): string[] {
  const text = repoCons(agentDir, frame);
  return text ? tableColumn(text, column) : [];
}

const headings = (text: string): string[] => [...text.replace(/\r\n/g, "\n").matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);

/** The template Cons.md of a frame in the store. */
function template(frame: string, storeDir: string): string | null {
  const p = listParts(storeDir, SHELF.constitution).find((x) => leafOf(x.folder) === frame);
  const f = p ? join(p.dir, CONS_REPO_FILE) : "";
  return f && existsSync(f) ? readFileSync(f, "utf8").replace(/\r\n/g, "\n") : null;
}

/** Each assembled frame whose written Cons.md lacks a section of the store's template: "<frame>: section "## X" missing". */
export function frameShapeFindings(agentDir: string, storeDir = STORE_DIR): string[] {
  const out: string[] = [];
  for (const p of listParts(agentDir, SHELF.constitution)) {
    if (!isFrame(p)) continue;
    const text = written(join(p.dir, CONS_REPO_FILE));
    const tpl = text ? template(leafOf(p.folder), storeDir) : null;
    if (!text || !tpl) continue;
    const have = new Set(headings(text));
    for (const h of headings(tpl)) if (!have.has(h)) out.push(`${leafOf(p.folder)}: section "## ${h}" missing from Cons.md`);
  }
  return out;
}

/**
 * Each skill of the repo's own (`Skill_Own_*` on the skills shelf, no `from:`) checked against the frame `Skill_Frame_Own`
 * (the repo's assembled copy, else the store's): the same sections in the same order, no template placeholder `<…>` left,
 * a `type:` of process or design and a `description:` (the host opens a skill by it). "<skill>: <finding>" per problem.
 */
export function ownSkillFindings(agentDir: string, storeDir = STORE_DIR): string[] {
  const own = listParts(agentDir, SHELF.skills).filter((p) => !p.from && /^Skill_Own_/.test(leafOf(p.folder)));
  if (!own.length) return [];
  const frameOf = (root: string): string | null => {
    const p = listParts(root, SHELF.skills).find((x) => leafOf(x.folder) === "Skill_Frame_Own");
    const f = p ? join(p.dir, "Skill_Frame_Own.md") : "";
    return f && existsSync(f) ? readFileSync(f, "utf8") : null;
  };
  const frame = frameOf(agentDir) ?? frameOf(storeDir);
  const out: string[] = [];
  for (const p of own) {
    const leaf = leafOf(p.folder);
    if (!frame) { out.push(`${leaf}: the frame Skill_Frame_Own is not assembled — run zemory sync --standard`); continue; }
    const f = join(p.dir, `${leaf}.md`);
    const text = existsSync(f) ? readFileSync(f, "utf8") : "";
    const want = headings(frame);
    const got = headings(text);
    const missing = want.filter((h) => !got.includes(h));
    const extra = got.filter((h) => !want.includes(h));
    if (missing.length) out.push(`${leaf}: section(s) of the frame missing: ${missing.map((h) => `"## ${h}"`).join(", ")}`);
    if (extra.length) out.push(`${leaf}: section(s) not in the frame: ${extra.map((h) => `"## ${h}"`).join(", ")}`);
    if (!missing.length && !extra.length && want.join("|") !== got.join("|")) out.push(`${leaf}: sections out of the frame's order`);
    const left = /<[^<>\n`]{1,80}>/.exec(text.replace(/`[^`\n]*`/g, ""));
    if (left) out.push(`${leaf}: template placeholder ${left[0]} left`);
    if (!["process", "design"].includes(String(p.meta.type ?? ""))) out.push(`${leaf}: header type: must be process or design`);
    if (!String(p.meta.description ?? "").trim()) out.push(`${leaf}: header description: missing (the host opens a skill by it)`);
  }
  return out;
}

/** The body of the section `## h` in `text` (up to the next `## `). */
function sectionOf(text: string, h: string): string {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l === `## ${h}`);
  if (i < 0) return "";
  const j = lines.findIndex((l, k) => k > i && /^##\s/.test(l));
  return lines.slice(i + 1, j < 0 ? undefined : j).join("\n").trim();
}

/**
 * Put into each written Cons.md the sections the store's template has and it lacks — after the section that comes before
 * it in the template, with the template's text (placeholders and all). Returns "<frame>: + ## X" per section added.
 */
export function addMissingSections(agentDir: string, apply: boolean, storeDir = STORE_DIR): string[] {
  const out: string[] = [];
  for (const p of listParts(agentDir, SHELF.constitution)) {
    if (!isFrame(p)) continue;
    const file = join(p.dir, CONS_REPO_FILE);
    const raw = written(file);
    const tpl = raw ? template(leafOf(p.folder), storeDir) : null;
    if (!raw || !tpl) continue;
    const crlf = raw.includes("\r\n");
    let lines = raw.replace(/\r\n/g, "\n").replace(/\s*$/, "").split("\n");
    const order = headings(tpl);
    let changed = false;
    order.forEach((h, idx) => {
      if (lines.includes(`## ${h}`)) return;
      // after the end of the nearest earlier template section the file has; none ⇒ at the end
      let at = lines.length;
      for (let k = idx - 1; k >= 0; k--) {
        const s = lines.indexOf(`## ${order[k]}`);
        if (s < 0) continue;
        const next = lines.findIndex((l, n) => n > s && /^##\s/.test(l));
        at = next < 0 ? lines.length : next;
        break;
      }
      const block = ["", `## ${h}`, "", sectionOf(tpl, h), ""];
      while (at > 0 && lines[at - 1] === "") at--;
      lines = [...lines.slice(0, at), ...block, ...lines.slice(at)];
      out.push(`${leafOf(p.folder)}: + ## ${h}`);
      changed = true;
    });
    if (changed && apply) {
      const t = lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "") + "\n";
      writeFileSync(file, crlf ? t.replace(/\n/g, "\r\n") : t);
    }
  }
  return out;
}
