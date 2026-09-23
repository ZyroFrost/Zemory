// ĐO BẢN MỚI NHẤT TỪ GIT — nguồn sự thật của câu "có bản mới không".
//
// 🔴 Vì sao đổi nguồn (user chốt 2026-09-15: *"cần phải fix update tự động lấy từ github, đo
// phiên bản từ git mới đúng"*). Trước đây phép này đọc tem `<Drive>/version.json`, và tem đó
// chỉ được đóng ở CUỐI một lượt `syncDrive` chạy trót lọt. Đo đúng lúc user báo:
//   · `package.json` lên 3.0.0 lúc 15:53, lên 3.1.0 lúc 19:24 (15/09);
//   · lượt ghi Drive gần nhất: 15:14 — TRƯỚC cả hai;
//   ⇒ tem vẫn ghi `2.18.0` (đóng dấu 14/09 09:56) và máy thứ hai đọc thành "đã mới nhất",
//     im lặng, suốt HAI bản phát hành.
// Đây không phải một lượt chạy lỗi mà là lỗi NGUỒN: thông báo phiên bản bị buộc vào một job
// nặng chạy 30 phút/lần, trên một kênh (Drive) mà máy kia có thể không dùng nữa. Bản phát hành
// nằm ở git; hỏi thẳng git thì không có khâu trung gian nào để hỏng.
//
// Vì sao đi bằng `git` chứ không bằng API GitHub: repo đã chuyển PRIVATE ⇒ API không token trả
// 404, mà nhét token vào là đẻ một bí mật mới (điều 14). `git` dùng đúng chứng chỉ mà máy đó
// vốn phải có để clone được. Thêm một chỗ tựa nữa: `github.com` cho tải nhị phân từng đo 1/10
// lượt trên mạng này, nhưng giao thức git thì thông — chính đường `git pull` của `selfupdate`.
//
// Điều 7 (local-only) KHÔNG cấm: lượt hỏi chỉ ĐỌC ref + một file `package.json` của repo công
// cụ, không gửi đi byte dữ liệu nào của user.
//
// Fail-open tuyệt đối (điều 9): mọi trục trặc ⇒ không có số, KHÔNG BAO GIỜ ném ra ngoài. Không
// đo được thì chip cập nhật im — nó là lớp NHẮC, không được phép làm chết đường chính.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { currentMemoryDir } from "../memory/db.js";
import { writeJsonAtomic } from "../util/fs-atomic.js";
import { cmpSemver } from "../util/semver.js";

/** Kết quả một lượt đo. `ok` sai ⇒ có `error` nói vì sao — để bề mặt nói THẬT, không im. */
export interface RemoteMeasure {
  ok: boolean;
  /** Semver đọc từ `package.json` của commit mới nhất trên remote. */
  latest?: string;
  /** Bản ĐANG CHẠY lúc đo — mốc để biết cây mã đã đổi kể từ lượt đo đó. */
  have?: string;
  /** Sha ngắn của commit đó. */
  commit?: string;
  /** Ngày commit (ISO). */
  at?: string;
  error?: string;
}

/** Bản ghi đĩa của lượt đo gần nhất. Đây là thứ mọi bề mặt ĐỌC (rẻ, không mạng). */
export interface RemoteVersionCache extends RemoteMeasure {
  checkedAt: string;
}

export const CACHE_FILE = "update-check.json";

/** Còn hạn bao lâu thì khỏi đo lại. Lượt HỎNG hết hạn nhanh hơn — mạng chập chờn thì thử lại
 *  sớm, nhưng vẫn không được phép hỏi mỗi lượt render. */
export const OK_TTL_MS = 6 * 60 * 60_000;
export const ERR_TTL_MS = 30 * 60_000;

/** Gốc repo của chính công cụ (`dist/update/…` → lên hai bậc). */
export function toolRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/** Cache nằm ở thư mục dữ liệu ĐỨNG YÊN của máy (`currentMemoryDir`), KHÔNG phải kho gửi đi
 *  (`currentStoreRoot`): đây là trạng thái của MÁY NÀY, sang máy khác là vô nghĩa — và
 *  `global-memory/` nằm trong danh sách share. */
export function updateCacheFile(dir: string = currentMemoryDir()): string {
  return join(dir, CACHE_FILE);
}

export function readUpdateCache(file: string = updateCacheFile()): RemoteVersionCache | null {
  try {
    const v = JSON.parse(readFileSync(file, "utf8")) as Partial<RemoteVersionCache>;
    return v && typeof v.checkedAt === "string" ? (v as RemoteVersionCache) : null;
  } catch {
    return null; // thiếu file / JSON hỏng ⇒ coi như chưa đo bao giờ
  }
}

export function writeUpdateCache(c: RemoteVersionCache, file: string = updateCacheFile()): void {
  try {
    writeJsonAtomic(file, c);
  } catch {
    /* ghi hỏng không được làm chết thứ đang gọi */
  }
}

/** Tới hạn đo lại chưa. Chưa từng đo ⇒ tới hạn ngay. */
export function cacheDue(
  c: RemoteVersionCache | null,
  now: number,
  okMs = OK_TTL_MS,
  errMs = ERR_TTL_MS,
  have?: string,
): boolean {
  if (!c) return true;
  // 🔴 BẢN TRÊN MÁY ĐỔI ⇒ đệm hết hạn NGAY, đừng đợi hết 6 giờ.
  //
  // Bắt được 23/09: sau một lượt hạ version (viết lại lịch sử git), app còn khoe *"bản mới trên
  // git 3.6.0, commit f1cce93"* — một bản VÀ một commit không còn tồn tại trên origin. Nó sẽ
  // nói dối suốt 6 tiếng, và người dùng không có cách nào bảo nó đo lại ngoài chờ.
  //
  // Cây mã dưới chân đổi thì mọi thứ đã đo về remote đều đáng ngờ — đó là tín hiệu rẻ nhất và
  // chắc nhất để vứt đệm, rẻ hơn hẳn việc đi hỏi git xem commit cũ còn sống không.
  if (have && c.have && have !== c.have) return true;
  const t = Date.parse(c.checkedAt);
  if (!Number.isFinite(t)) return true;
  return now - t >= (c.ok ? okMs : errMs);
}

/** Lấy sha từ output `git ls-remote origin HEAD` (`<sha>\tHEAD`). */
export function shaFromLsRemote(out: string): string {
  for (const line of out.split(/\r?\n/)) {
    const m = /^([0-9a-f]{40})\s+HEAD$/i.exec(line.trim());
    if (m) return m[1].toLowerCase();
  }
  return "";
}

/** Đọc số hiệu từ nội dung `package.json`. Rỗng nếu không có/không phải chuỗi. */
export function versionFromPackageJson(text: string): string {
  try {
    const v = (JSON.parse(text) as { version?: unknown }).version;
    return typeof v === "string" ? v : "";
  } catch {
    return "";
  }
}

/**
 * Chạy git KHÔNG BAO GIỜ HỎI NGƯỜI. Một lượt đo nền mà bật hộp đăng nhập lên (hoặc ngồi chờ
 * người gõ mật khẩu ở stdin) là treo cứng tiến trình gọi nó — đúng kiểu "vỏ rỗng trông như
 * đang sống" mà `02_RULES` cấm. Thiếu chứng chỉ thì phải HỎNG NGAY và nói ra.
 */
function git(args: string[], cwd: string, timeoutMs: number): { ok: boolean; out: string } {
  try {
    const out = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      timeout: timeoutMs,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never", GIT_OPTIONAL_LOCKS: "0" },
    });
    return { ok: true, out: String(out).trim() };
  } catch (e) {
    const err = e as { stdout?: unknown; stderr?: unknown; message?: string };
    const out = (String(err.stdout ?? "") + String(err.stderr ?? "")).trim();
    return { ok: false, out: out || err.message || "git failed" };
  }
}

/**
 * Đo THẬT — có mạng. Ba bước, và bước nặng chỉ chạy khi cần:
 *   ① `ls-remote` lấy sha của HEAD trên remote — rẻ, không tải object nào;
 *   ② sha đó đã có sẵn dưới máy ⇒ BỎ QUA fetch (ca thường gặp: vừa pull xong);
 *   ③ chưa có ⇒ `fetch` rồi đọc `package.json` tại đúng commit đó.
 *
 * `fetch` chỉ đụng ref theo dõi remote, KHÔNG đụng cây làm việc hay HEAD — nên chạy được cả
 * khi có phiên agent khác đang làm việc trong repo công cụ (`02_RULES §Phạm vi project`).
 */
export function measureRemoteVersion(root: string = toolRoot()): RemoteMeasure {
  if (!existsSync(join(root, ".git"))) return { ok: false, error: "not a source install (no .git)" };

  const ls = git(["ls-remote", "origin", "HEAD"], root, 30_000);
  if (!ls.ok) return { ok: false, error: `git ls-remote: ${ls.out.split(/\r?\n/).slice(-2).join(" | ").slice(0, 300)}` };
  const sha = shaFromLsRemote(ls.out);
  if (!sha) return { ok: false, error: "git ls-remote: no HEAD line" };

  const haveObject = git(["cat-file", "-e", `${sha}^{commit}`], root, 15_000).ok;
  if (!haveObject) {
    const f = git(["fetch", "--quiet", "--no-tags", "origin"], root, 10 * 60_000);
    if (!f.ok) return { ok: false, error: `git fetch: ${f.out.split(/\r?\n/).slice(-2).join(" | ").slice(0, 300)}` };
  }

  const pkg = git(["show", `${sha}:package.json`], root, 30_000);
  if (!pkg.ok) return { ok: false, error: `git show package.json: ${pkg.out.slice(0, 200)}` };
  const latest = versionFromPackageJson(pkg.out);
  if (!latest) return { ok: false, error: "package.json at origin has no version" };

  const when = git(["log", "-1", "--format=%cI", sha], root, 15_000);
  return { ok: true, latest, commit: sha.slice(0, 7), at: when.ok ? when.out : "" };
}

/** Đo rồi ghi cache — một lời gọi cho cả CLI lẫn lượt làm mới nền. */
export function refreshRemoteVersion(
  root: string = toolRoot(),
  file: string = updateCacheFile(),
  have?: string,
): RemoteVersionCache {
  const m = measureRemoteVersion(root);
  const c: RemoteVersionCache = { ...m, checkedAt: new Date().toISOString(), have };
  writeUpdateCache(c, file);
  return c;
}

/** Nguồn đã trả lời câu "bản mới nhất là bao nhiêu". */
export type UpdateSource = "git" | "channel";

export interface AppUpdate {
  have: string;
  latest: string;
  /** Sha ngắn (nguồn git) hoặc tên máy đã đóng dấu (nguồn kênh chung). */
  from: string;
  at: string;
  source: UpdateSource;
}

/**
 * Chọn câu trả lời từ HAI nguồn — và chọn bản CAO NHẤT, không phải bản ưu tiên.
 *
 * Vì sao lấy max chứ không "git thắng tuyệt đối": tem kênh chung vẫn có ích cho máy không nối
 * được git lúc đó (mạng công ty chặn, chưa có chứng chỉ), nên bỏ hẳn là mất một đường. Nhưng
 * nó KHÔNG BAO GIỜ được kéo câu trả lời xuống — đúng bệnh vừa xảy ra: tem 2.18.0 cũ khiến hai
 * bản phát hành mới biến mất khỏi mắt máy thứ hai. Lấy max thì một nguồn cũ chỉ là im lặng,
 * không phải nói dối.
 */
/**
 * Bản trên máy đang ĐI TRƯỚC repo — trả về khi bản đang chạy CAO hơn bản trên git.
 *
 * 🔴 Vì sao cần nói ra: `pickUpdate` chỉ mời cập nhật khi remote MỚI hơn, nên ở ca ngược lại nó
 * trả rỗng và bề mặt in *"Zemory đang là bản mới nhất"*. Câu đó SAI: máy đang chạy một bản
 * **không còn tồn tại trên repo**, tức chính nó mới là thứ lệch. Xảy ra thật sau lượt hạ version
 * 23/09, và im lặng ở đây là để người dùng tin mình đang đúng chuẩn trong khi không phải.
 *
 * Chỉ xét nguồn GIT: tem kênh chung có thể cũ một cách bình thường (máy lâu không sync), nên
 * lấy nó làm căn cứ *đi trước* là báo động giả.
 */
export function aheadOfRepo(
  have: string,
  git: { latest?: string; commit?: string; at?: string; ok?: boolean } | null,
): { have: string; latest: string; from: string } | undefined {
  if (!have || !git?.ok || !git.latest) return undefined;
  if (cmpSemver(have, git.latest) <= 0) return undefined;
  return { have, latest: git.latest, from: git.commit ?? "" };
}

export function pickUpdate(
  have: string,
  git: { latest?: string; commit?: string; at?: string; ok?: boolean } | null,
  stamp: { latest: string; host?: string; at?: string } | null,
): AppUpdate | undefined {
  if (!have) return undefined;
  const cands: AppUpdate[] = [];
  if (git?.ok && git.latest) cands.push({ have, latest: git.latest, from: git.commit ?? "", at: git.at ?? "", source: "git" });
  if (stamp?.latest) cands.push({ have, latest: stamp.latest, from: stamp.host ?? "?", at: stamp.at ?? "", source: "channel" });
  let best: AppUpdate | undefined;
  for (const c of cands) {
    if (cmpSemver(c.latest, have) <= 0) continue;
    if (!best || cmpSemver(c.latest, best.latest) > 0) best = c;
  }
  return best;
}
