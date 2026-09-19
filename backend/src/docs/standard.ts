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
import { basename, join, resolve } from "node:path";
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

function tplRel(profile: "app" | "non-app", file: string): string {
  const dir = profile === "non-app" ? "03_nonapp" : "05_app";
  return (file === "AGENTS.md" ? `docs_template/${dir}/AGENTS.md` : `docs_template/${dir}/agent/${file}`);
}

type Rev = { sha: string; date: string; path: string };
const histCache = new Map<string, Rev[]>();
const textCache = new Map<string, string | null>();

/**
 * Mọi bản của một file template trong lịch sử git của zemory, MỚI NHẤT trước, **theo cả đổi tên**.
 *
 * 🔴 `--follow` là bắt buộc: bộ mẫu đã đổi đường dẫn khi tách bundle, và bản đầu của hàm tra gốc dùng
 * `git rev-list -- <đường dẫn hiện tại>` nên mọi gốc TRƯỚC lần đổi tên tra ra rỗng — đúng những repo
 * nhận harness sớm nhất, tức những repo lệch nhiều nhất.
 */
export function templateHistory(profile: "app" | "non-app", file: string): Rev[] {
  const rel = tplRel(profile, file);
  const hit = histCache.get(rel);
  if (hit) return hit;
  const self = selfRepoRoot();
  const out: Rev[] = [];
  if (self) {
    try {
      const raw = execFileSync("git", ["log", "--follow", "--name-only", "--format=@@%H %ad", "--date=short", "--", rel], {
        cwd: self,
        encoding: "utf8",
        maxBuffer: 64 << 20,
      });
      for (const blk of raw.split("@@")) {
        const ls = blk.trim().split(/\r?\n/).filter(Boolean);
        if (!ls.length) continue;
        const [sha, date] = ls[0].split(" ");
        out.push({ sha, date, path: ls.length > 1 ? ls[ls.length - 1] : rel });
      }
    } catch {
      /* không có git ⇒ lịch sử rỗng ⇒ mọi thứ về "chưa kết luận", không đoán */
    }
  }
  histCache.set(rel, out);
  return out;
}

function revText(rev: Rev): string | null {
  const key = `${rev.sha}:${rev.path}`;
  if (textCache.has(key)) return textCache.get(key) ?? null;
  let t: string | null = null;
  const self = selfRepoRoot();
  if (self) {
    try {
      t = execFileSync("git", ["show", key], { cwd: self, encoding: "utf8", maxBuffer: 8 << 20 });
    } catch {
      t = null;
    }
  }
  textCache.set(key, t);
  return t;
}

/** Độ dài dãy con chung dài nhất — bản hai hàng, chỉ để ĐO khoảng cách, không để tách đoạn. */
function lcsLen(a: string[], b: string[]): number {
  let prev = new Int32Array(b.length + 1);
  let cur = new Int32Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    [prev, cur] = [cur, prev];
    cur.fill(0);
  }
  return prev[b.length];
}

export type BaseCandidate = { date: string; lines: string[] };
export type PickedBase = { date: string; own: number; miss: number; common: number };

/**
 * Chọn GỐC cho một file repo từ các bản của template (mới nhất trước) — thuần, không đụng git, để
 * test được mà không phụ thuộc lịch sử thật.
 *
 * Luật, và vì sao từng vế:
 *  · khoảng cách = dòng CHỈ repo có + dòng CHỈ bản đó có (qua LCS). Nhỏ nhất thắng.
 *  · hoà ⇒ bản MỚI hơn thắng: coi repo đã hấp thụ nhiều chuẩn hơn thì bớt nguy cơ chở lại một dòng
 *    mà repo đã cố ý xoá.
 *  · cùng NỘI DUNG xuất hiện ở nhiều commit (vd commit đóng dấu không đổi chữ) ⇒ lấy ngày CŨ NHẤT của
 *    nội dung đó — ngày nó ra đời. `templateAt` tra ngày nào trong khoảng ấy cũng ra đúng chữ ấy.
 *  · NGOẠI LỆ: nội dung trùng BẢN HIỆN TẠI ⇒ dấu là dấu của template (`current`). Template đóng dấu
 *    theo lần cuối git CHẠM file, kể cả sửa khoảng trắng mà phép so bỏ qua; đo 2026-09-18: AGENTS.md
 *    bản non-app trùng chữ từ 23/08 mà dấu là 31/08. Không có vế này thì repo đang ĐÚNG bản mới nhất
 *    bị đọc ra là cũ và bị "hợp nhất" rỗng.
 *  · repo chung chưa tới NỬA số dòng của bản gần nhất ⇒ null: file đó không mọc ra từ template nào,
 *    và gọi một bản bất kỳ là "gốc" chỉ để hợp nhất được là đoán — đúng thứ plan/26 §8 cấm.
 */
export function pickBase(revs: BaseCandidate[], mine: string[], current?: BaseCandidate): PickedBase | null {
  const groups = new Map<string, { firstIdx: number; oldest: string; lines: string[] }>();
  revs.forEach((r, i) => {
    const key = r.lines.join("\n");
    const g = groups.get(key);
    if (!g) groups.set(key, { firstIdx: i, oldest: r.date, lines: r.lines });
    else if (r.date < g.oldest) g.oldest = r.date;
  });
  let best: (PickedBase & { idx: number; baseLen: number; key: string }) | null = null;
  for (const [key, g] of groups) {
    const common = lcsLen(mine, g.lines);
    const own = mine.length - common;
    const miss = g.lines.length - common;
    const d = own + miss;
    if (!best || d < best.own + best.miss || (d === best.own + best.miss && g.firstIdx < best.idx))
      best = { date: g.oldest, own, miss, common, idx: g.firstIdx, baseLen: g.lines.length, key };
  }
  if (!best || best.common * 2 < best.baseLen) return null;
  const date = current && current.lines.join("\n") === best.key ? current.date : best.date;
  return { date, own: best.own, miss: best.miss, common: best.common };
}

/** Đo gốc của một file repo trên lịch sử thật của template. */
export function measureBase(root: string, file: string, mineText: string): PickedBase | null {
  const profile = projectProfile(root);
  const revs: BaseCandidate[] = [];
  for (const r of templateHistory(profile, file)) {
    const t = revText(r);
    if (t !== null) revs.push({ date: r.date, lines: contentLines(withProject(t, root)) });
  }
  const tp = tplPathOf(profile, file);
  const tplText = existsSync(tp) ? readFileSync(tp, "utf8") : null;
  const tplStamp = tplText ? stampOf(tplText) : null;
  const current = tplText && tplStamp ? { date: tplStamp, lines: contentLines(withProject(tplText, root)) } : undefined;
  return pickBase(revs, contentLines(mineText), current);
}

/**
 * The template file as it stood on `date`, read out of zemory's OWN git history.
 *
 * This is the BASE of the three-way comparison, and it is the whole reason the stamp exists: without
 * it there is no way to tell "the repo edited this" from "the standard moved on". Returns null when
 * git cannot answer — no guessing (plan/26 §8).
 *
 * Dấu chỉ mang NGÀY, mà một ngày có thể có vài commit cùng sửa file. Có `ctx` thì chọn bản trong ngày
 * đó khớp repo nhất; không có thì lấy bản cuối ngày. Theo cả đổi tên (`templateHistory`).
 */
export function templateAt(
  profile: "app" | "non-app",
  file: string,
  date: string,
  ctx?: { root: string; mine: string[] },
): string | null {
  const upTo = templateHistory(profile, file).filter((r) => r.date <= date);
  if (!upTo.length) return null;
  const day = upTo.reduce((m, r) => (r.date > m ? r.date : m), upTo[0].date);
  const sameDay = upTo.filter((r) => r.date === day);
  if (sameDay.length === 1 || !ctx) return revText(sameDay[0]);
  let best: { text: string; d: number } | null = null;
  for (const r of sameDay) {
    const t = revText(r);
    if (t === null) continue;
    const lines = contentLines(withProject(t, ctx.root));
    const c = lcsLen(ctx.mine, lines);
    const d = ctx.mine.length - c + (lines.length - c);
    if (!best || d < best.d) best = { text: t, d };
  }
  return best ? best.text : null;
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

/**
 * Repo NGUỒN của bộ mẫu — chính zemory. Chuẩn đi TỪ đây ra, nên không chở ngược vào.
 *
 * Đo 2026-09-18: `02_RULES` của zemory mang lịch sử quyết định và số đo riêng (*"616 dòng / 28 file"*,
 * *"user chốt 2026-09-12"*), còn bộ mẫu là bản RÚT GỌN dẫn xuất từ đó. Chở bộ mẫu vào đây là xoá chữ gốc
 * để thay bằng bản rút gọn của chính nó. Chiều ngược lại (repo → bộ mẫu) thì §8 đã cấm từ đầu.
 */
export function isStandardSource(root: string): boolean {
  const self = selfRepoRoot();
  if (!self) return false;
  const n = (p: string): string => {
    const r = resolve(p).replace(/[\\/]+$/, "");
    return process.platform === "win32" ? r.toLowerCase() : r;
  };
  return n(self) === n(root);
}

/** Read-only verdict for every carried file of one repo. */
export function standardDiff(root: string): { profile: "app" | "non-app"; files: FileVerdict[] } {
  const profile = projectProfile(root);
  const files: FileVerdict[] = [];
  if (isStandardSource(root)) return { profile, files };

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
    const baseRaw0 = templateAt(profile, file, repoStamp, { root, mine: contentLines(mine) });
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
  /** `superseded` = số chỗ repo mang BẢN CŨ của chính chữ chuẩn, đã thay bằng bản chuẩn mới. */
  | { ok: true; lines: string[]; mine: number; theirs: number; superseded: number }
  | { ok: false; reason: string; at?: { mine: Hunk; theirs: Hunk } };

/**
 * Hợp nhất ba bên. CHỈ trộn khi hai bên sửa hai vùng KHÔNG chồng nhau; chồng nhau thì TỪ CHỐI và
 * nói ra chỗ chồng — `plan/24 §9.4` đã chốt luật này cho lớp file và ở đây dùng lại nguyên văn:
 * *trùng đoạn thì CHẶN và hỏi, không tự trộn*. Đoán ở đây là cách mất việc của người khác, mà 4 repo
 * đang mang phần tự viết (một repo +160 dòng).
 */
export function merge3(base: string[], mine: string[], theirs: string[], known?: ReadonlySet<string>): MergeResult {
  const hmAll = hunks(base, mine);
  // Hai bên sửa Y HỆT nhau — cùng vùng, cùng chữ — nghĩa là repo đã tự chép bản sửa của chuẩn. Đó
  // KHÔNG phải xung đột (git cũng không coi là xung đột): áp MỘT lần. Đo 2026-09-18: 28 file bị từ
  // chối, và ca đầu tiên mở ra xem là đúng thế — repo và chuẩn cùng chèn một dòng `config` y hệt ở
  // cùng một chỗ. Chỉ khớp TRỌN mới tính; lệch một ký tự vẫn là hai lời sửa khác nhau ⇒ vẫn từ chối.
  const same = (a: Hunk, b: Hunk): boolean =>
    a.start === b.start && a.end === b.end && a.lines.length === b.lines.length && a.lines.every((l, i) => l === b.lines[i]);
  const ht = hunks(base, theirs).filter((b) => !hmAll.some((a) => same(a, b)));
  // Chạm nhau tính là chồng: hai đoạn kề sát nhau sửa cùng một chỗ về mặt ngữ nghĩa thường xuyên
  // hơn là ngẫu nhiên, và đây là phía AN TOÀN của lỗi.
  const overlaps = (a: Hunk, b: Hunk): boolean => a.start <= b.end && b.start <= a.end;
  // Repo mang BẢN CŨ của chính chữ chuẩn. Repo được cập nhật TỪNG MẢNH qua nhiều lần (agent chép một
  // luật từ template lúc nào đó, template sau đó viết lại luật ấy), nên không một gốc nào giải thích
  // trọn file và chỗ "chồng" thực ra là bản cũ ↔ bản mới của CÙNG một luật chuẩn. Đo 2026-09-18: sau
  // khi nhận ca trùng khít vẫn còn 27/34 file bị từ chối, và những ca mở ra xem đều đúng khuôn này.
  //
  // Nhận diện được mà không đoán: mọi dòng repo THÊM ở chỗ đó đều từng có mặt trong một bản template
  // nào đó (`known`) ⇒ đó là chữ chuẩn cũ, không phải chữ repo tự viết ⇒ lấy bản chuẩn mới không mất
  // chữ nào của repo. Chỉ cần MỘT dòng repo tự viết là vẫn từ chối. Đoạn repo chỉ XOÁ (không thêm gì)
  // cũng từ chối: xoá có chủ đích hay không thì máy không biết, và chở lại là hồi sinh thứ người ta bỏ.
  let superseded = 0;
  const hm: Hunk[] = [];
  for (const a of hmAll) {
    const clash = ht.find((b) => overlaps(a, b));
    if (!clash) {
      hm.push(a);
      continue;
    }
    if (known && a.lines.length > 0 && a.lines.every((l) => known.has(l))) {
      superseded++;
      continue;
    }
    return { ok: false, reason: "đoạn sửa CHỒNG nhau", at: { mine: a, theirs: clash } };
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
  return { ok: true, lines: out, mine: hm.length, theirs: ht.length, superseded };
}

/** Mọi dòng từng có mặt trong BẤT KỲ bản nào của một file template (đã thay `<PROJECT>`). */
export function knownLines(root: string, file: string): Set<string> {
  const profile = projectProfile(root);
  const known = new Set<string>();
  for (const r of templateHistory(profile, file)) {
    const t = revText(r);
    if (t !== null) for (const l of contentLines(withProject(t, root))) known.add(l);
  }
  const tp = tplPathOf(profile, file);
  if (existsSync(tp)) for (const l of contentLines(withProject(readFileSync(tp, "utf8"), root))) known.add(l);
  return known;
}

/** Dòng của `before` KHÔNG còn trong `after` — đếm theo bội (hai dòng trùng mà mất một thì tính một). */
export function lostLines(before: string[], after: string[]): string[] {
  const left = new Map<string, number>();
  for (const l of after) left.set(l, (left.get(l) ?? 0) + 1);
  const lost: string[] = [];
  for (const l of before) {
    const n = left.get(l) ?? 0;
    if (n > 0) left.set(l, n - 1);
    else lost.push(l);
  }
  return lost;
}

export type ApplyOne = {
  file: string;
  action: "would-write" | "written" | "skipped";
  verdict: FileVerdict["verdict"];
  reason?: string;
  added?: number;
  removed?: number;
  /** số chỗ repo mang bản chuẩn CŨ, đã thay bằng bản chuẩn mới */
  superseded?: number;
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
    const baseRaw0 = v.repoStamp ? templateAt(profile, v.file, v.repoStamp, { root, mine: contentLines(mineRaw) }) : null;
    const baseRaw = baseRaw0 === null ? null : withProject(baseRaw0, root);
    if (baseRaw === null) {
      out.push({ file: v.file, action: "skipped", verdict: v.verdict, reason: "không lấy được bản gốc từ git" });
      continue;
    }

    const eol = mineRaw.includes("\r\n") ? "\r\n" : "\n";
    const base = contentLines(baseRaw);
    const mine = contentLines(mineRaw);
    const theirs = contentLines(theirsRaw);

    const known = knownLines(root, v.file);
    let merged: string[];
    let superseded = 0;
    if (v.verdict === "clean") {
      merged = theirs; // khớp gốc ⇒ thay thẳng, không có gì của repo để giữ
    } else {
      const r = merge3(base, mine, theirs, known);
      if (!r.ok) {
        out.push({ file: v.file, action: "skipped", verdict: v.verdict, reason: r.reason + " — phải sửa tay ở repo đó" });
        continue;
      }
      merged = r.lines;
      superseded = r.superseded;
    }

    // 🔴 LƯỚI CUỐI, độc lập với mọi logic hợp nhất ở trên: một dòng sắp BIẾN MẤT khỏi file thì phải là
    // chữ từng có trong template. Chỉ một dòng repo tự viết sắp mất là TỪ CHỐI cả file — một lỗi ở
    // `hunks`/`merge3` mai sau cũng không xoá được việc của người khác mà không ai hay.
    const lost = lostLines(mine, merged);
    const authored = lost.filter((l) => l.trim() !== "" && !known.has(l));
    if (authored.length) {
      out.push({
        file: v.file,
        action: "skipped",
        verdict: v.verdict,
        reason: `sẽ mất ${authored.length} dòng repo tự viết — phải sửa tay ở repo đó`,
      });
      continue;
    }

    const stamp = stampOf(theirsRaw);
    const body = merged.join(eol) + eol + (stamp ? eol + `<!-- zemory-standard: ${stamp} -->` + eol : "");
    const added = lostLines(merged, mine).length;
    const removed = lost.length;

    if (opts.apply) writeFileSync(rp, body);
    out.push({ file: v.file, action: opts.apply ? "written" : "would-write", verdict: v.verdict, added, removed, superseded });
  }
  return out;
}

/**
 * ĐÓNG DẤU MỒI cho một repo đã có harness nhưng chưa có dấu (plan/26 §3).
 *
 * Dấu mang NGÀY CỦA BẢN TEMPLATE MÀ FILE BÁM SÁT NHẤT — đo trên lịch sử git (`measureBase`), không
 * lấy ngày của template hôm nay.
 *
 * 🔄 Bản đầu (2026-09-18) lấy ngày template HIỆN TẠI. Đóng dấu xong 51 file, cả 51 tự khai "đang ở
 * bản mới nhất" — trong khi đo lại thì phần lớn đứng ở bản tháng 7–8, SasinHub/02_RULES thiếu 168 dòng.
 * Dấu sai làm phần lệch cũ VÔ HÌNH: `sync --check` báo xanh, `--standard` báo "không có gì để áp". Dấu
 * đo được thì hợp nhất ba chiều chở được đúng phần chuẩn repo còn thiếu, và giữ phần repo tự viết.
 *
 * Chỉ THÊM một dòng chú thích ở cuối file; không đụng một chữ nội dung nào. File đã có dấu thì KHÔNG
 * đo lại: sau một lượt hợp nhất thật, dấu là sự thật đã xảy ra, còn phép đo chỉ là suy luận — để phép đo
 * ghi đè sự thật thì một dòng repo cố ý xoá sẽ bị chở ngược lại.
 */
export function stampRepo(
  root: string,
  opts: { apply: boolean },
): Array<{ file: string; action: string; date?: string; own?: number; miss?: number }> {
  const out: Array<{ file: string; action: string; date?: string; own?: number; miss?: number }> = [];
  if (isStandardSource(root)) return out; // repo nguồn — không nhận chở ngược, nên cũng không cần dấu
  for (const file of CARRIED) {
    const rp = repoPathOf(root, file);
    if (!existsSync(rp)) {
      out.push({ file, action: "không có file" });
      continue;
    }
    const mine = readFileSync(rp, "utf8");
    if (stampOf(mine)) {
      out.push({ file, action: "đã có dấu", date: stampOf(mine) ?? undefined });
      continue;
    }
    const picked = measureBase(root, file, mine);
    if (!picked) {
      out.push({ file, action: "không bám bản chuẩn nào — phải xử tay" });
      continue;
    }
    const eol = mine.includes("\r\n") ? "\r\n" : "\n";
    const body = mine.replace(/\s*$/, "") + eol + eol + `<!-- zemory-standard: ${picked.date} -->` + eol;
    if (opts.apply) writeFileSync(rp, body);
    out.push({ file, action: opts.apply ? "đã đóng dấu" : "sẽ đóng dấu", date: picked.date, own: picked.own, miss: picked.miss });
  }
  return out;
}
