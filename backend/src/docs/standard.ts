// plan/26 — carry a standard REVISION into a repo that already has the file.
//
// The gap this fills: `zemory sync` gap-fills MISSING files and never overwrites an existing one
// (adopt.ts), and `/harness-updates` counts missing files rather than comparing content. So a repo
// that adopted the harness in July keeps July's text forever, and nothing ever says so. Measured
// 2026-09-18 across 18 linked repos: nine are SHORTER than the current template (one by 63 lines)
// and four are LONGER because someone added their own sections — which is exactly why a blind
// overwrite is not an option.
//
// This module only ever READS. Writing is a separate step with its own permission gate.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, join } from "node:path";
import { templateDir } from "./adopt.js";
import { harnessPathsAt } from "../core/config.js";
import { projectProfile, selfRepoRoot } from "../projects.js";

/**
 * Files the revision mechanism carries — only text that is genuinely SHARED across projects.
 *
 * Deliberately absent, and each for its own reason:
 *  · `01_CONSTITUTION.md` — per-app by definition. The file itself says "mỗi app một bản, như mỗi
 *    quốc gia một hiến pháp", and only the user may change it. Measured 2026-09-18 across 16 repos:
 *    it differs from the template by 13 to 146 lines EVERYWHERE, which is the design working, not
 *    drift. Carrying it would overwrite somebody's constitution.
 *  · `04_SKILLS.md` — the registry of THAT repo's skills, so its content is per-repo too.
 *  · `05_TODO` / `06_CHANGES` — the repo's own backlog and history (plan/26 §8).
 *  · `CLAUDE.md` — a one-line `@AGENTS.md` import with nothing to revise.
 */
export const CARRIED = ["AGENTS.md", "02_RULES.md", "03_STRUCTURE.md"] as const;

const MARK = /<!--\s*zemory-standard:\s*(\d{4}-\d{2}-\d{2})\s*-->\s*$/;

/** The revision stamp a file carries, or null when it predates stamping. */
export function stampOf(text: string): string | null {
  const m = MARK.exec(text);
  return m ? m[1] : null;
}

export type FileVerdict = {
  file: string;
  /** current — repo already on the template's revision
   *  clean   — repo file matches the template AT ITS OWN STAMP, so replacing is lossless
   *  local   — repo edited the file; a merge is needed, not a replace
   *  unknown — no stamp, or the base cannot be recovered ⇒ propose only, never write
   *  absent  — the repo does not have this file at all (that is `sync`'s job, not this one) */
  verdict: "current" | "clean" | "local" | "unknown" | "absent";
  repoStamp: string | null;
  tplStamp: string | null;
  /** lines the repo changed away from its own base (only meaningful for `local`) */
  localLines?: number;
  /** lines the standard changed since the repo's base */
  standardLines?: number;
  reason?: string;
};


/**
 * `adopt.ts` thay `<PROJECT>` bằng tên repo lúc chép, nên file trong repo KHÔNG BAO GIỜ trùng byte
 * với template. Mọi phép so — và mọi lượt GHI — phải thay giống hệt, nếu không:
 *   · phép so: 0/85 file khớp bất kỳ bản lịch sử nào (đo 2026-09-18) ⇒ mọi thứ rơi vào "chưa kết luận";
 *   · phép ghi: ghi nguyên chữ `<PROJECT>` vào repo người ta.
 */
function withProject(text: string, root: string): string {
  return text.replace(/<PROJECT>/g, basename(root));
}

/** Where a carried file sits inside a harness. AGENTS.md is at the repo root; the rest under agent/. */
function repoPathOf(root: string, file: string): string {
  return file === "AGENTS.md" ? join(root, "AGENTS.md") : join(harnessPathsAt(root).agent, file);
}

function tplPathOf(profile: "app" | "non-app", file: string): string {
  const base = templateDir(profile);
  return file === "AGENTS.md" ? join(base, "AGENTS.md") : join(base, "agent", file);
}

/**
 * The template file as it stood on `date`, read out of zemory's OWN git history.
 *
 * This is the BASE of the three-way comparison, and it is the whole reason the stamp exists: without
 * it there is no way to tell "the repo edited this" from "the standard moved on". Returns null when
 * git cannot answer — no guessing (plan/26 §8).
 */
export function templateAt(profile: "app" | "non-app", file: string, date: string): string | null {
  const self = selfRepoRoot();
  if (!self) return null;
  const rel = (file === "AGENTS.md"
    ? join("docs_template", profile === "non-app" ? "03_nonapp" : "05_app", "AGENTS.md")
    : join("docs_template", profile === "non-app" ? "03_nonapp" : "05_app", "agent", file)
  ).replace(/\\/g, "/");
  try {
    const rev = execFileSync("git", ["rev-list", "-1", `--before=${date}T23:59:59`, "HEAD", "--", rel], {
      cwd: self,
      encoding: "utf8",
    }).trim();
    if (!rev) return null;
    return execFileSync("git", ["show", `${rev}:${rel}`], { cwd: self, encoding: "utf8", maxBuffer: 8 << 20 });
  } catch {
    return null;
  }
}

/**
 * Compare ignoring the stamp, the line endings, and trailing blank lines — none of the three is a
 * content difference.
 *
 * 🔴 The trailing-blank rule is not tidiness, it is the difference between the safe class being
 * reachable and not. The stamper appends `\n\n<!-- … -->\n`, and stripping that marker greedily eats
 * the file's own final newline too: measured on a file that was otherwise byte-identical to its base,
 * 321 lines against 322, one phantom line, so EVERY stamped file would have been read as "the repo
 * edited this" and `clean` — the one class safe to replace wholesale — could never occur.
 */
export function contentLines(text: string): string[] {
  const lines = text.replace(/(?:\r?\n)*<!--\s*zemory-standard:[^>]*-->\s*$/, "").split(/\r?\n/);
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** How many lines differ, counted as a plain set difference. Enough to size a change for a REPORT;
 *  the apply step needs real hunks, and that is built there rather than guessed here. */
function changedLines(a: string[], b: string[]): number {
  const bag = new Map<string, number>();
  for (const l of a) bag.set(l, (bag.get(l) ?? 0) + 1);
  let diff = 0;
  for (const l of b) {
    const n = bag.get(l) ?? 0;
    if (n > 0) bag.set(l, n - 1);
    else diff++;
  }
  for (const n of bag.values()) diff += n;
  return diff;
}

/** Read-only verdict for every carried file of one repo. */
export function standardDiff(root: string): { profile: "app" | "non-app"; files: FileVerdict[] } {
  const profile = projectProfile(root);
  const files: FileVerdict[] = [];

  for (const file of CARRIED) {
    const rp = repoPathOf(root, file);
    const tp = tplPathOf(profile, file);
    if (!existsSync(rp)) {
      files.push({ file, verdict: "absent", repoStamp: null, tplStamp: null, reason: "zemory sync sẽ bù file này" });
      continue;
    }
    const mine = readFileSync(rp, "utf8");
    const theirs = existsSync(tp) ? withProject(readFileSync(tp, "utf8"), root) : null;
    const repoStamp = stampOf(mine);
    const tplStamp = theirs ? stampOf(theirs) : null;

    if (!theirs) {
      files.push({ file, verdict: "unknown", repoStamp, tplStamp: null, reason: "bộ mẫu không có file này" });
      continue;
    }
    if (repoStamp && tplStamp && repoStamp === tplStamp) {
      files.push({ file, verdict: "current", repoStamp, tplStamp });
      continue;
    }
    if (!repoStamp) {
      files.push({ file, verdict: "unknown", repoStamp: null, tplStamp, reason: "chưa có dấu bản chuẩn" });
      continue;
    }
    const baseRaw0 = templateAt(profile, file, repoStamp);
    const base = baseRaw0 === null ? null : withProject(baseRaw0, root);
    if (base === null) {
      files.push({ file, verdict: "unknown", repoStamp, tplStamp, reason: `không lấy được bản gốc ${repoStamp} từ git` });
      continue;
    }
    const mineL = contentLines(mine);
    const baseL = contentLines(base);
    const theirsL = contentLines(theirs);
    const local = changedLines(baseL, mineL);
    const moved = changedLines(baseL, theirsL);
    files.push({
      file,
      verdict: local === 0 ? "clean" : "local",
      repoStamp,
      tplStamp,
      localLines: local,
      standardLines: moved,
    });
  }
  return { profile, files };
}

// ── HỢP NHẤT BA BÊN (plan/26 §4, bước ③) ────────────────────────────────────────────────────────
//
// Vì sao tự viết thay vì kéo một thư viện diff: HP điều 2 (dependency mới phải rà license) và điều 1
// (đừng thêm khi thứ có sẵn đủ dùng). File chuẩn dài ~330 dòng nên LCS O(n·m) là ~100k ô — rẻ hơn
// nhiều so với chi phí nhận thêm một phụ thuộc vào lõi.

/** Bảng LCS: dùng để tách ra ĐOẠN thay đổi, không phải để in diff cho người đọc. */
function lcs(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  return dp;
}

export type Hunk = {
  /** vùng BỊ THAY trên BASE, nửa mở [start, end) */
  start: number;
  end: number;
  /** dòng thay thế */
  lines: string[];
};

/** Các đoạn biến `base` thành `other`. Đoạn liền nhau được gộp làm một để phép so chồng lấn
 *  không bị vụn thành hàng chục đoạn một dòng. */
export function hunks(base: string[], other: string[]): Hunk[] {
  const dp = lcs(base, other);
  const out: Hunk[] = [];
  let i = 0;
  let j = 0;
  let cur: Hunk | null = null;
  const flush = () => {
    if (cur) out.push(cur);
    cur = null;
  };
  while (i < base.length && j < other.length) {
    if (base[i] === other[j]) {
      flush();
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // dòng của BASE bị bỏ
      cur ??= { start: i, end: i, lines: [] };
      cur.end = i + 1;
      i++;
    } else {
      // dòng của OTHER được thêm
      cur ??= { start: i, end: i, lines: [] };
      cur.lines.push(other[j]);
      j++;
    }
  }
  if (i < base.length || j < other.length) {
    cur ??= { start: i, end: i, lines: [] };
    cur.end = base.length;
    for (; j < other.length; j++) cur.lines.push(other[j]);
  }
  flush();
  return out;
}

export type MergeResult =
  | { ok: true; lines: string[]; mine: number; theirs: number }
  | { ok: false; reason: string; at?: { mine: Hunk; theirs: Hunk } };

/**
 * Hợp nhất ba bên. CHỈ trộn khi hai bên sửa hai vùng KHÔNG chồng nhau; chồng nhau thì TỪ CHỐI và
 * nói ra chỗ chồng — `plan/24 §9.4` đã chốt luật này cho lớp file và ở đây dùng lại nguyên văn:
 * *trùng đoạn thì CHẶN và hỏi, không tự trộn*. Đoán ở đây là cách mất việc của người khác, mà 4 repo
 * đang mang phần tự viết (một repo +160 dòng).
 */
export function merge3(base: string[], mine: string[], theirs: string[]): MergeResult {
  const hm = hunks(base, mine);
  const ht = hunks(base, theirs);
  for (const a of hm)
    for (const b of ht) {
      // Chạm nhau tính là chồng: hai đoạn kề sát nhau sửa cùng một chỗ về mặt ngữ nghĩa thường
      // xuyên hơn là ngẫu nhiên, và đây là phía AN TOÀN của lỗi.
      if (a.start <= b.end && b.start <= a.end) return { ok: false, reason: "đoạn sửa CHỒNG nhau", at: { mine: a, theirs: b } };
    }
  const all = [...hm.map((h) => ({ ...h, src: "mine" as const })), ...ht.map((h) => ({ ...h, src: "theirs" as const }))].sort(
    (x, y) => x.start - y.start,
  );
  const out: string[] = [];
  let at = 0;
  for (const h of all) {
    for (let k = at; k < h.start; k++) out.push(base[k]);
    out.push(...h.lines);
    at = Math.max(at, h.end);
  }
  for (let k = at; k < base.length; k++) out.push(base[k]);
  return { ok: true, lines: out, mine: hm.length, theirs: ht.length };
}

export type ApplyOne = {
  file: string;
  action: "would-write" | "written" | "skipped";
  verdict: FileVerdict["verdict"];
  reason?: string;
  added?: number;
  removed?: number;
};

/**
 * Áp bản chuẩn mới vào MỘT repo. **Mặc định KHÔNG ghi** — `apply` phải được bật tường minh.
 *
 * Chỉ ghi hai hạng: `clean` (khớp gốc của chính nó ⇒ thay nguyên file, không mất gì) và `local` mà
 * hai bên sửa KHÔNG chồng nhau (⇒ hợp nhất). Mọi ca còn lại TỪ CHỐI và nói lý do: `unknown` không có
 * gốc để so, chồng đoạn thì người phải chọn (`plan/26 §4` lớp C).
 *
 * Giữ nguyên kiểu xuống dòng của FILE ĐÍCH và đóng lại dấu của bản chuẩn mới — ghi lại cả file bằng
 * LF là đẻ một diff toàn-file che mất thay đổi thật (`02_RULES §EOL`).
 */
export function applyStandard(root: string, opts: { apply: boolean; only?: string[] }): ApplyOne[] {
  const { profile, files } = standardDiff(root);
  const out: ApplyOne[] = [];

  for (const v of files) {
    if (opts.only?.length && !opts.only.includes(v.file)) continue;
    if (v.verdict === "current" || v.verdict === "absent") continue;
    if (v.verdict === "unknown") {
      out.push({ file: v.file, action: "skipped", verdict: v.verdict, reason: v.reason ?? "chưa kết luận được" });
      continue;
    }
    const rp = repoPathOf(root, v.file);
    const tp = tplPathOf(profile, v.file);
    const mineRaw = readFileSync(rp, "utf8");
    const theirsRaw = withProject(readFileSync(tp, "utf8"), root);
    const baseRaw0 = v.repoStamp ? templateAt(profile, v.file, v.repoStamp) : null;
    const baseRaw = baseRaw0 === null ? null : withProject(baseRaw0, root);
    if (baseRaw === null) {
      out.push({ file: v.file, action: "skipped", verdict: v.verdict, reason: "không lấy được bản gốc từ git" });
      continue;
    }

    const eol = mineRaw.includes("\r\n") ? "\r\n" : "\n";
    const base = contentLines(baseRaw);
    const mine = contentLines(mineRaw);
    const theirs = contentLines(theirsRaw);

    let merged: string[];
    if (v.verdict === "clean") {
      merged = theirs; // khớp gốc ⇒ thay thẳng, không có gì của repo để giữ
    } else {
      const r = merge3(base, mine, theirs);
      if (!r.ok) {
        out.push({ file: v.file, action: "skipped", verdict: v.verdict, reason: r.reason + " — phải sửa tay ở repo đó" });
        continue;
      }
      merged = r.lines;
    }

    const stamp = stampOf(theirsRaw);
    const body = merged.join(eol) + eol + (stamp ? eol + `<!-- zemory-standard: ${stamp} -->` + eol : "");
    const added = merged.filter((l) => !mine.includes(l)).length;
    const removed = mine.filter((l) => !merged.includes(l)).length;

    if (opts.apply) writeFileSync(rp, body);
    out.push({ file: v.file, action: opts.apply ? "written" : "would-write", verdict: v.verdict, added, removed });
  }
  return out;
}

/**
 * ĐÓNG DẤU MỒI cho một repo đã có harness nhưng chưa có dấu (plan/26 §3).
 *
 * 🔴 Nói thẳng dấu này nghĩa là gì: nó KHÔNG khai "file này khớp bản chuẩn hôm nay" — đo 2026-09-18
 * cho thấy 77/85 file mang dòng mà template không có. Nó khai **"từ mốc này trở đi, thứ repo đang
 * có là CỦA REPO"**. Hệ quả: mọi bản sửa chuẩn SAU mốc chở được; phần đã lệch TRƯỚC mốc thì không,
 * và vẫn phải nắn tay ở repo đó. Đây là mồi, không phải phép chữa.
 *
 * Chỉ THÊM một dòng chú thích ở cuối file; không đụng một chữ nội dung nào.
 */
export function stampRepo(root: string, opts: { apply: boolean }): Array<{ file: string; action: string; date?: string }> {
  const profile = projectProfile(root);
  const out: Array<{ file: string; action: string; date?: string }> = [];
  for (const file of CARRIED) {
    const rp = repoPathOf(root, file);
    const tp = tplPathOf(profile, file);
    if (!existsSync(rp) || !existsSync(tp)) {
      out.push({ file, action: "không có file" });
      continue;
    }
    const mine = readFileSync(rp, "utf8");
    if (stampOf(mine)) {
      out.push({ file, action: "đã có dấu", date: stampOf(mine) ?? undefined });
      continue;
    }
    const date = stampOf(readFileSync(tp, "utf8"));
    if (!date) {
      out.push({ file, action: "bộ mẫu chưa có dấu" });
      continue;
    }
    const eol = mine.includes("\r\n") ? "\r\n" : "\n";
    const body = mine.replace(/\s*$/, "") + eol + eol + `<!-- zemory-standard: ${date} -->` + eol;
    if (opts.apply) writeFileSync(rp, body);
    out.push({ file, action: opts.apply ? "đã đóng dấu" : "sẽ đóng dấu", date });
  }
  return out;
}
