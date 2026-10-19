// One pass that brings a kit repo (folder harness) up to the store — the single implementation behind `zemory sync` and the
// app's "update repo" button (constitution article 17: one function, one command; a second door delegates here).
//
// A pass: assemble every part that is behind the store · put a first-generation repo's constitution in the current shape ·
// repoint links into the old harness · drop marker entries the move replaced · regenerate the guard · write what is still
// off the standard into the repo's TODO ledger, so the repo's next session finds it in the file it reads first.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { harnessPathsAt } from "../core/config.js";
import { conform, type ConformItem } from "./conform.js";
import { generateGuards } from "./guard-gen.js";
import { applyKit, type KitApplyResult } from "./kit-apply.js";
import { normalizeOwnConstitution, pruneMarkerProtected, repointLinks } from "./kit-migrate.js";

export interface KitSyncResult {
  assembly: KitApplyResult;
  own: ReturnType<typeof normalizeOwnConstitution>;
  repointed: string[];
  dropped: string[];
  /** guard files written, or the error that stopped it (apply only) */
  guard: { added: string[] } | { error: string } | null;
  /** the standard block of the TODO ledger after the pass (apply only) */
  todo: StandardTodoResult | null;
}

export function kitSync(root: string, opts: { kitRef?: string; apply: boolean }): KitSyncResult | { error: string } {
  const assembly = applyKit(root, { kitRef: opts.kitRef, apply: opts.apply });
  if ("error" in assembly) return { error: assembly.error };
  const own = normalizeOwnConstitution(root, opts.apply);
  let repointed: string[] = [];
  let dropped: string[] = [];
  let guard: KitSyncResult["guard"] = null;
  let todo: StandardTodoResult | null = null;
  if (opts.apply) {
    // pointers into the old harness follow it every pass (idempotent): links, paths written as text, old skill host names
    repointed = repointLinks(root, true);
    dropped = pruneMarkerProtected(root, true);
    try {
      guard = { added: generateGuards(root).added };
    } catch (e) {
      guard = { error: e instanceof Error ? e.message : String(e) };
    }
    // measured AFTER the parts are in place: what the pass could not fix is the repo's own work
    todo = writeStandardTodo(root, conform(root).items);
  }
  return { assembly, own, repointed, dropped, guard, todo };
}

export const STANDARD_TODO_START = "<!-- zemory:standard-todo:start";
export const STANDARD_TODO_END = "<!-- zemory:standard-todo:end -->";
const STANDARD_TODO_HEAD =
  `${STANDARD_TODO_START} · written by \`zemory sync\` from \`zemory conform\`; rewritten every run, removed once the repo is on the standard — fix the repo, never this block -->`;

export interface StandardTodoResult {
  /** written = block added or changed · removed = the repo is clean, the block left · unchanged · none = no ledger */
  state: "written" | "removed" | "unchanged" | "none";
  /** blocking findings (must fix) · advisory ones listed to look at */
  items: number;
  advisory: number;
  file: string | null;
}

const counts = (items: ConformItem[]): { items: number; advisory: number } => ({
  items: items.filter((i) => i.level === "blocking").length,
  advisory: items.filter((i) => i.level !== "blocking").length,
});

/** Findings listed under one item; past it the item says how many more and where to see them (conform), never silently cut. */
const TODO_ROWS_CAP = 80;

/**
 * The block of open standard work: one item per blocking conform finding with how to fix it, then EVERY place it was found,
 * one line each — the repo's session fixes from this block alone, as from a list a person hand-wrote for it.
 */
export function standardTodoBlock(items: ConformItem[]): string {
  const entry = (i: ConformItem): string[] => {
    const all = i.all ?? i.samples;
    const rows = all.slice(0, TODO_ROWS_CAP).map((s) => `  - ${s}`);
    if (all.length > TODO_ROWS_CAP) rows.push(`  - (+${all.length - TODO_ROWS_CAP} more — \`zemory conform --json\` lists them all)`);
    return [`- [ ] \`${i.check}\` (${i.count}) ${i.title} → ${i.fix}`, ...rows];
  };
  const must = items.filter((i) => i.level === "blocking");
  const look = items.filter((i) => i.level !== "blocking");
  const out = [STANDARD_TODO_HEAD, "## Lệch chuẩn — `zemory sync` giao, tự xoá khi hết lệch", ""];
  if (must.length) out.push("### Phải sửa", ...must.flatMap(entry));
  if (look.length) out.push(...(must.length ? [""] : []), "### Nên xem (máy không phân biệt được — người đọc quyết)", ...look.flatMap(entry));
  return [...out, STANDARD_TODO_END].join("\n");
}

/**
 * Put the block into the TODO ledger (after its first heading), replace the one already there, or remove it when nothing
 * blocks. Every other line of the ledger is the repo's own and stays byte for byte. The line ending follows the file.
 */
export function writeStandardTodo(root: string, items: ConformItem[]): StandardTodoResult {
  const file = harnessPathsAt(root).todo;
  if (!existsSync(file)) return { state: "none", ...counts(items), file: null };
  const text = readFileSync(file, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const s = text.indexOf(STANDARD_TODO_START);
  const e = s >= 0 ? text.indexOf(STANDARD_TODO_END, s) : -1;
  // the ledger without the old block (and the blank line that followed it)
  let rest = text;
  if (s >= 0 && e >= 0) {
    let after = e + STANDARD_TODO_END.length;
    while (text.startsWith(eol, after) && text.startsWith(eol, after + eol.length)) after += eol.length;
    if (text.startsWith(eol, after)) after += eol.length;
    rest = text.slice(0, s) + text.slice(after);
  }
  let next = rest;
  if (items.length) {
    const block = standardTodoBlock(items).split("\n").join(eol);
    const h1 = /^#\s.*$/m.exec(rest);
    const at = h1 ? h1.index + h1[0].length : 0;
    const head = rest.slice(0, at);
    const tail = rest.slice(at).replace(/^(\r?\n)+/, "");
    next = h1 ? `${head}${eol}${eol}${block}${eol}${eol}${tail}` : `${block}${eol}${eol}${tail}`;
  }
  if (next === text) return { state: "unchanged", ...counts(items), file };
  writeFileSync(file, next);
  return { state: items.length ? "written" : "removed", ...counts(items), file };
}
