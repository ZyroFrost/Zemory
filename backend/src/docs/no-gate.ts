// Rules with NO machine gate go to the TOP (user 2026-10-07: "các luật nào mà ko viết hook dc thì đưa lên đầu để nó ko
// đọc lướt… kể cả hiến pháp luôn"). A gated rule has a net under it; a words-only rule is held by the reader alone, so it
// is the one that must not be skimmed. Article NUMBERS never move ("HP 16" is referenced from tests, plans, the gate
// table): a GENERATED block at the top of 01_CONSTITUTION and 02_RULES lists the ungated articles instead, built from
// 02_RULES `## Cổng cho hiến pháp`. In 02_RULES the judgement section (`## Hành xử`) stands first as well.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { constitutionArticles, hpGateRows } from "./validate.js";

const START = "<!-- zemory:no-gate:start";
const END = "<!-- zemory:no-gate:end -->";
const BLOCK = /<!-- zemory:no-gate:start[\s\S]*?<!-- zemory:no-gate:end -->\r?\n?(?:\r?\n)?/;

export interface NoGateArticle {
  n: number;
  title: string;
  /** words = kind CHỮ · unbuilt = the row says the gate is not built yet · unmapped = no row at all */
  why: "words" | "unbuilt" | "unmapped";
}

/** Constitution articles nothing mechanical holds. null = no constitution article to speak of. */
export function noGateArticles(agentDir: string): NoGateArticle[] | null {
  const con = join(agentDir, "01_CONSTITUTION.md");
  if (!existsSync(con)) return null;
  const arts = constitutionArticles(readFileSync(con, "utf8").replace(BLOCK, ""));
  if (!arts.length) return null;
  const rows = new Map((hpGateRows(agentDir) ?? []).map((r) => [r.n, r]));
  const out: NoGateArticle[] = [];
  for (const a of arts) {
    const r = rows.get(a.n);
    const short = (s: string): string => (s.length > 110 ? s.slice(0, 107).trimEnd() + "…" : s);
    if (!r) out.push({ n: a.n, title: short(a.title), why: "unmapped" });
    else if (/^CHỮ/i.test(r.kind)) out.push({ n: a.n, title: short(r.title || a.title), why: "words" });
    else if (/CHƯA có/i.test(r.gate) && !/^CHẶN/i.test(r.kind)) out.push({ n: a.n, title: short(r.title || a.title), why: "unbuilt" });
  }
  return out;
}

/** The block text (lines joined by `eol`), or null when there is no article to map. */
export function noGateBlock(agentDir: string, eol = "\n"): string | null {
  const list = noGateArticles(agentDir);
  if (!list) return null;
  const why = { words: "chỉ chữ", unbuilt: "chưa dựng cổng", unmapped: "chưa có hàng trong bảng cổng" } as const;
  const body = list.length
    ? [
        "> ⚠ **ĐỌC KỸ, KHÔNG LƯỚT — các điều hiến pháp dưới đây KHÔNG có chốt máy.** Vi phạm thì không hook/test nào kêu: chỉ người đọc giữ được chúng.",
        ...list.map((a) => `> - **Điều ${a.n}** — ${a.title} *(${why[a.why]})*`),
      ]
    : ["> ✓ Mọi điều hiến pháp đều có chốt máy — bảng: `02_RULES` §Cổng cho hiến pháp."];
  return [`${START} · SINH BỞI \`zemory gates --write-top\` từ 02_RULES §Cổng cho hiến pháp — đừng sửa tay, số điều KHÔNG đổi -->`, ...body, END].join(eol);
}

const FILES = ["01_CONSTITUTION.md", "02_RULES.md"] as const;

/** Where the block belongs: before the first `## ` heading (after the title and intro). */
function withBlock(text: string, block: string, eol: string): string {
  const bare = text.replace(BLOCK, "");
  const at = bare.search(/^## /m);
  if (at < 0) return bare.replace(/\s*$/, "") + eol + eol + block + eol;
  return bare.slice(0, at) + block + eol + eol + bare.slice(at);
}

/** Problems with the "ungated first" layout, one English line each. Empty = in place and fresh. */
export function noGateIssues(agentDir: string): string[] {
  const out: string[] = [];
  for (const f of FILES) {
    const p = join(agentDir, f);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const block = noGateBlock(agentDir, eol);
    if (!block) return [];
    if (!text.includes(START)) out.push(`${f}: no "read carefully" block at the top (ungated articles first)`);
    else if (withBlock(text, block, eol) !== text) out.push(`${f}: the "read carefully" block is stale or not at the top`);
  }
  const rules = join(agentDir, "02_RULES.md");
  if (existsSync(rules)) {
    const heads = [...readFileSync(rules, "utf8").matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    if (heads.some((h) => /^Hành xử/.test(h)) && !/^Hành xử/.test(heads[0] ?? "")) out.push('02_RULES.md: "## Hành xử" (judgement rules, no gate) must be the first section');
    const t = readFileSync(rules, "utf8");
    if (stampLast(t) !== t) out.push("02_RULES.md: the zemory-standard stamp is not the last line — the standard can no longer read this file's version");
  }
  return out;
}

/** Write/refresh the block in both files and move `## Hành xử` first in 02_RULES. Returns the files changed. */
export function writeNoGateTop(agentDir: string): string[] {
  const changed: string[] = [];
  const rules = join(agentDir, "02_RULES.md");
  if (existsSync(rules)) {
    const text = readFileSync(rules, "utf8");
    const moved = behaviourFirst(text);
    if (moved !== text) {
      writeFileSync(rules, moved);
      changed.push("02_RULES.md (## Hành xử moved first)");
    }
  }
  for (const f of FILES) {
    const p = join(agentDir, f);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const block = noGateBlock(agentDir, eol);
    if (!block) return changed;
    const next = withBlock(text, block, eol);
    if (next !== text) {
      writeFileSync(p, next);
      changed.push(`${f} (block)`);
    }
  }
  return changed;
}

/** The `<!-- zemory-standard: … -->` stamp must be the LAST line: `standardDiff` reads it only there, and a stamp left
 *  mid-file reads as "no stamp" ⇒ the repo can never be updated by the standard again. Moving a section, or appending
 *  one after the stamp (3.7.7 did exactly that in 17 repos), strands it. Text untouched when already last / absent. */
export function stampLast(text: string): string {
  const re = /^<!--\s*zemory-standard:\s*\d{4}-\d{2}-\d{2}\s*-->[ \t]*$/m;
  const m = re.exec(text);
  if (!m) return text;
  if (!text.slice(m.index + m[0].length).trim()) return text; // already last
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  // drop the stamp line and ONE blank line before it — nothing else in the file is touched
  const head = text.slice(0, m.index).replace(/(\r?\n)(\r?\n)$/, "$1");
  const tail = text.slice(m.index + m[0].length).replace(/^\r?\n/, "");
  return (head + tail).replace(/\s*$/, "") + eol + eol + m[0] + eol;
}

/** Move the `## Hành xử…` section (to the next `## ` or EOF) in front of the first `## `; the stamp stays last. */
export function behaviourFirst(text: string): string {
  return stampLast(moveBehaviour(stampLast(text)));
}

function moveBehaviour(text: string): string {
  const heads = [...text.matchAll(/^## .+$/gm)];
  const i = heads.findIndex((m) => /^## Hành xử/.test(m[0]));
  if (i <= 0) return text;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const from = heads[i].index;
  const to = i + 1 < heads.length ? heads[i + 1].index : text.length;
  const section = text.slice(from, to).replace(/\s*$/, "") + eol + eol;
  const rest = (text.slice(0, from) + text.slice(to)).replace(/\s*$/, "") + eol;
  const first = rest.search(/^## /m);
  return rest.slice(0, first) + section + rest.slice(first);
}
