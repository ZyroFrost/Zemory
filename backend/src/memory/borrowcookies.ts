// Borrow an ALREADY SIGNED-IN session from the browser the user actually uses, so
// nobody has to type a password into a window zemory opened.
//
// Why this exists (user, 2026-07-30): being asked for a password is both annoying and
// suspicious-looking — *"cookie là cái có sẵn thì phải xài"*. Correct: a live session
// already sits in their normal Chrome/Edge profile. This moves that ONE session across.
//
// WHAT IT DOES NOT DO — this is the whole design, not a disclaimer:
//   · never reads a cookie VALUE. It copies the file, then DELETES the rows that do not
//     belong to the target site. Decryption happens only inside the browser, as always.
//   · never touches passwords. `Login Data` is not copied; nothing here can read one.
//   · borrows the PLATFORM's cookies + the identity providers it logs in through (Google/
//     Microsoft/Apple — see AUTH_HOSTS), so a fresh OAuth shows the account chooser instead of
//     a blank form. Still NOT the whole jar: bank/mail/arbitrary sites are pruned out. The SSO
//     widening is a user-approved tradeoff (2026-09-02) — the Google session then lives in
//     zemory's local profile. Before that it copied ONE site only.
//
// LIMITS, measured or documented, so nobody is sold magic:
//   · the source profile must ACTUALLY be signed in. A cookie is a session, not a
//     password: if the source is signed out too, there is nothing to borrow.
//   · the target profile must be opened by the SAME browser the cookies came from —
//     App-Bound Encryption ties the key in `Local State` to that browser. That is why
//     the brand marker is written here.
//   · the browser may hold the cookie file open; on Windows the copy usually still
//     works, and if it does not the user closes the browser and retries.
//   · Chromium hardens against exactly this shape every release. It can break on an
//     update — that is the cost of this route, and it is the user's call to take it.

import Database from "better-sqlite3";
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { currentMemoryDir } from "./db.js";

export interface CookieSource {
  key: string;
  label: string;
  userData: string;
  exe: string;
}

const WIN = process.platform === "win32";
const LOCAL = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");

/** Where each browser keeps its profiles + which binary must reopen them. */
export function cookieSources(): CookieSource[] {
  if (!WIN) return [];
  return [
    {
      key: "chrome",
      label: "Google Chrome",
      userData: join(LOCAL, "Google", "Chrome", "User Data"),
      exe: ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].find((p) => existsSync(p)) ?? "",
    },
    {
      key: "edge",
      label: "Microsoft Edge",
      userData: join(LOCAL, "Microsoft", "Edge", "User Data"),
      exe: ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].find((p) => existsSync(p)) ?? "",
    },
    {
      // 🔴 THIẾU TỪ ĐẦU, user bắt 2026-09-02 (*"mở browser đó thì lấy chính cookie web đã có"*).
      // Danh sách này chỉ có Chrome + Edge, trong khi **trình duyệt mặc định của máy này là Brave**
      // — và chính zemory cũng mở Brave (`opening chatgpt window in brave.exe` trong log). Nên
      // phiên thật của người dùng nằm ở Brave mà bộ mượn **không bao giờ nhìn tới**: nó báo
      // "không có trình duyệt nào còn phiên" trong khi phiên đang nằm ngay đó.
      key: "brave",
      label: "Brave",
      userData: join(LOCAL, "BraveSoftware", "Brave-Browser", "User Data"),
      exe: ["C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe", "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"].find((p) => existsSync(p)) ?? "",
    },
  ].filter((s) => existsSync(s.userData) && s.exe);
}

/** Profiles inside one browser's User Data ("Default", "Profile 2", …). */
export function listSourceProfiles(src: CookieSource): string[] {
  try {
    return readdirSync(src.userData).filter((d) => (d === "Default" || d.startsWith("Profile ")) && existsSync(join(src.userData, d, "Network", "Cookies")));
  } catch {
    return [];
  }
}

/** Cookie hosts a platform needs. Kept narrow ON PURPOSE — see the header. */
const PLATFORM_HOSTS: Record<string, string[]> = {
  chatgpt: ["chatgpt.com", "openai.com"],
  claude: ["claude.ai", "anthropic.com"],
};

/**
 * Cookie NAME that proves a LIVE session (SQL LIKE pattern; names only, values never read).
 *
 * 🔴 Why "any cookie counts" was a real bug (user hit it 2026-09-02): Chrome held ONE stray
 * chatgpt.com cookie, so the UI offered "borrow from Chrome" — while the actual session sat in
 * Brave, whose locked store was never mentioned. Borrowing the stray cookie produced a signed-out
 * profile, ChatGPT bounced to Google OAuth, and the user faced an EMPTY login form and rightly
 * asked why their account was not there. One junk cookie is not a session.
 *
 * chatgpt: NextAuth token — chunked variants are `…session-token.0/.1`, hence the trailing `%`.
 * claude: `sessionKey`. If a platform is missing here the check is skipped (fail-open): better
 * to offer a maybe-stale borrow than to silently disable the feature on a renamed cookie.
 */
const SESSION_COOKIE_LIKE: Record<string, string> = {
  chatgpt: "__Secure-next-auth.session-token%",
  claude: "sessionKey",
};

/**
 * Identity-provider hosts kept ALONGSIDE the platform during borrow, so the OAuth login shows
 * the account chooser instead of a blank email form.
 *
 * 🔴 WIDER than one site ON PURPOSE — user chose this 2026-09-02 (*"phải nó có cookie hiện lên web
 * khi đăng nhập"*), knowing the tradeoff: the Google/Microsoft SSO session (the master key to
 * Gmail/Drive) then lives in zemory's LOCAL profile under `data/browser/` (gitignored, encrypted
 * per-machine — HP điều 14). This overrides the original header rule "borrows ONE site's cookies,
 * not the jar". Still narrow: only these identity providers, never bank/mail/arbitrary sites.
 */
const AUTH_HOSTS = ["accounts.google.com", "google.com", "login.microsoftonline.com", "login.live.com", "appleid.apple.com"];

/** Whether an identity provider in AUTH_HOSTS holds a LIVE session (names only). */
function hasAuthSession(dbPath: string): boolean {
  if (!existsSync(dbPath)) return false;
  const db = new Database(dbPath, { readonly: true });
  try {
    const hostLike = AUTH_HOSTS.map(() => "host_key LIKE ?").join(" OR ");
    // __Secure-1PSID = Google signed-in · ESTSAUTHPERSISTENT = Microsoft signed-in.
    const row = db.prepare(`SELECT COUNT(1) n FROM cookies WHERE name IN ('__Secure-1PSID','ESTSAUTHPERSISTENT') AND (${hostLike})`).get(...AUTH_HOSTS.map((h) => `%${h}`)) as { n: number };
    return (row?.n ?? 0) > 0;
  } finally {
    db.close();
  }
}

/**
 * Does this Chromium jar hold a LIVE session for the platform?
 * `false` = readable and definitely no session (missing jar counts) · `true` = session cookie
 * present · `null` = cannot tell (jar locked by a running window, or platform has no known
 * session-cookie name) — callers must treat `null` as "hands off", not as "no".
 * Names only — values are never read.
 */
export function jarHasSession(dbPath: string, platform: string): boolean | null {
  const hosts = PLATFORM_HOSTS[platform];
  const like = SESSION_COOKIE_LIKE[platform];
  if (!hosts || !like) return null;
  if (!existsSync(dbPath)) return false;
  try {
    return sessionCount(dbPath, hosts, like) > 0;
  } catch {
    return null;
  }
}

/** Rows whose NAME marks a live session for this platform. Names only — values are never read. */
function sessionCount(dbPath: string, hosts: string[], nameLike: string): number {
  const db = new Database(dbPath, { readonly: true });
  try {
    const like = hosts.map(() => "host_key LIKE ?").join(" OR ");
    const row = db.prepare(`SELECT COUNT(1) n FROM cookies WHERE name LIKE ? AND (${like})`).get(nameLike, ...hosts.map((h) => `%${h}`)) as { n: number };
    return row?.n ?? 0;
  } finally {
    db.close();
  }
}

export interface BorrowResult {
  ok: boolean;
  platform: string;
  source?: string;
  sourceProfile?: string;
  /** How many cookie rows survived pruning (i.e. belong to the target site). */
  kept?: number;
  /** How many rows were dropped as none of zemory's business. */
  dropped?: number;
  browser?: string;
  /** Bản profile cũ được dời sang một bên — gọi restoreProfile() để trả lại nguyên trạng. */
  backup?: string;
  error?: string;
}

export interface BorrowOptions {
  platform: string;
  /** "chrome" | "edge"; default = the first source that has the platform's cookies. */
  from?: string;
  /** Source profile folder name; default "Default". */
  profile?: string;
  /** Overwrite an existing zemory profile for this platform. */
  replace?: boolean;
  /** Test seam: where zemory's browser profiles live. */
  browserRoot?: string;
  /** Test seam: use this source list instead of probing the real browsers. */
  sources?: CookieSource[];
}

/** Count rows per host in a cookie DB. Names only — values are never read. */
function hostCounts(dbPath: string, hosts: string[]): number {
  const db = new Database(dbPath, { readonly: true });
  try {
    const like = hosts.map(() => "host_key LIKE ?").join(" OR ");
    const row = db.prepare(`SELECT COUNT(1) n FROM cookies WHERE ${like}`).get(...hosts.map((h) => `%${h}`)) as { n: number };
    return row?.n ?? 0;
  } finally {
    db.close();
  }
}

export interface BorrowSource {
  from: string;
  label: string;
  profile: string;
  cookies: number;
  /**
   * WHY this source is offered — the count above does NOT say it, and a surface that shows only
   * a number reads as nonsense in the SSO case ("borrow from Chrome (0 cookies)"), which is the
   * exact confusion the junk-cookie fix was meant to end.
   * · `platform` = holds the platform's own live session ⇒ borrowing logs straight in.
   * · `sso`      = only the identity provider is signed in ⇒ borrowing gives a ONE-CLICK OAuth
   *                login (account chooser), not a direct one.
   */
  via: "platform" | "sso";
}

/**
 * First real browser profile that ACTUALLY holds a session for this platform.
 *
 * The UI asks this before offering "borrow" — offering a button that then fails with
 * "your browser is signed out too" is worse than not offering it. Counts rows only.
 */
export function findBorrowSource(platform: string, sources?: CookieSource[]): BorrowSource | null {
  const hosts = PLATFORM_HOSTS[platform];
  if (!hosts || !WIN) return null;
  const sessionLike = SESSION_COOKIE_LIKE[platform];
  // 🔴 PHIÊN NỀN THẮNG PHIÊN SSO — thứ tự này LOAD-BEARING, không phải sở thích.
  // Nguồn có phiên NỀN cho đăng nhập THẲNG; nguồn chỉ có SSO chỉ cho một cú bấm ở trang OAuth.
  // Quét một lượt "ai qualify trước thì thắng" là để THỨ TỰ THƯ MỤC quyết định, mà thứ tự đó là
  // chrome→edge→brave. Đo 2026-09-02 trên máy thật: chrome chỉ có phiên Google (0 phiên ChatGPT)
  // vẫn THẮNG brave đang giữ phiên nền thật ⇒ bề mặt mời đúng đường YẾU HƠN và giấu đường mạnh.
  // Nên: gặp phiên nền là trả NGAY; nguồn SSO chỉ được nhớ làm ĐƯỜNG LÙI.
  let ssoFallback: BorrowSource | null = null;
  for (const src of sources ?? cookieSources()) {
    for (const profile of listSourceProfiles(src)) {
      try {
        const jar = join(src.userData, profile, "Network", "Cookies");
        const n = hostCounts(jar, hosts);
        // "Has cookies" is NOT "is signed in": a jar must hold the SESSION cookie to be offered.
        // Offering a junk-cookie source sends the user to an empty login form (see SESSION_COOKIE_LIKE).
        if (n > 0 && (!sessionLike || sessionCount(jar, hosts, sessionLike) > 0)) {
          return { from: src.key, label: src.label, profile, cookies: n, via: "platform" };
        }
        // Platform session gone but the SSO provider still signed in ⇒ borrowing gives a one-click
        // OAuth login instead of a blank form (user chose 2026-09-02). Keep the FIRST such source.
        if (!ssoFallback && hasAuthSession(jar)) {
          ssoFallback = { from: src.key, label: src.label, profile, cookies: n, via: "sso" };
        }
      } catch {
        // Hồ sơ bị khoá/không đọc được ⇒ thử hồ sơ kế. Việc NÓI RA "đang khoá" là của
        // `borrowBlockedBy` — trộn vào đây thì một giá trị trả về phải mang hai nghĩa.
        continue;
      }
    }
  }
  if (ssoFallback) return ssoFallback;
  // Không tìm được nguồn ĐỌC ĐƯỢC. Nếu có nguồn bị khoá thì đó là câu trả lời KHÁC hẳn
  // ("cửa đang khoá") và người gọi phải phân biệt được — xem `borrowBlockedBy`.
  return null;
}

/**
 * Có nguồn cookie nào ĐANG BỊ KHOÁ vì trình duyệt còn mở không — trả về TÊN nguồn, hoặc null.
 *
 * Tách khỏi `findBorrowSource` thay vì nhồi một giá trị đặc biệt (`cookies: -1`) vào cùng kiểu
 * trả về: người gọi hiện đang làm `Boolean(findBorrowSource(...))`, nên một object 'khoá' sẽ
 * lặng lẽ thành `canBorrow: true` ⇒ UI mời **Mượn** rồi thất bại. Hai câu hỏi khác nhau —
 * "mượn được không" và "có phải đang khoá không" — thì hai hàm, không phải một kiểu trả về
 * mang cờ ngầm.
 *
 * Đo trên máy này 2026-09-02: Chromium giữ khoá độc quyền trên kho cookie khi đang chạy — đọc
 * thẳng ném `unable to open database file`, và `copyFileSync` ném **EBUSY**. Tức khi trình duyệt
 * còn mở thì KHÔNG có đường đọc nào; câu duy nhất dùng được cho người dùng là *đóng nó rồi thử
 * lại*. Bản cũ nuốt lỗi và báo 'không có trình duyệt nào còn phiên' — sai, và không chỉ được
 * việc phải làm.
 */
export function borrowBlockedBy(platform: string, sources?: CookieSource[]): string | null {
  const hosts = PLATFORM_HOSTS[platform];
  if (!hosts || !WIN) return null;
  for (const src of sources ?? cookieSources()) {
    for (const profile of listSourceProfiles(src)) {
      const p = join(src.userData, profile, "Network", "Cookies");
      try {
        hostCounts(p, hosts);
      } catch {
        return src.label;
      }
    }
  }
  return null;
}

/**
 * Copy ONE site's live session from a real browser profile into zemory's profile for
 * that platform. Returns what it kept/dropped so the caller can report honestly.
 */
export function borrowCookies(opts: BorrowOptions): BorrowResult {
  const platform = opts.platform;
  const hosts = PLATFORM_HOSTS[platform];
  if (!hosts) return { ok: false, platform, error: `unknown platform '${platform}' (chatgpt · claude)` };
  if (!WIN) return { ok: false, platform, error: "borrowing cookies is implemented for Windows browsers only" };

  const sources = opts.sources ?? cookieSources();
  if (!sources.length) return { ok: false, platform, error: "no Chrome/Edge installation found" };
  const src = opts.from ? sources.find((s) => s.key === opts.from) : sources[0];
  if (!src) return { ok: false, platform, error: `unknown source '${opts.from}' (${sources.map((s) => s.key).join(" · ")})` };

  const profile = opts.profile ?? "Default";
  const srcCookies = join(src.userData, profile, "Network", "Cookies");
  const srcLocalState = join(src.userData, "Local State");
  if (!existsSync(srcCookies)) return { ok: false, platform, source: src.key, error: `no cookie store at ${srcCookies}` };

  // Nothing to borrow if the source is signed out of BOTH the platform and its SSO providers —
  // say so instead of producing an empty profile that fails later with a confusing "please log in".
  const sessionLike = SESSION_COOKIE_LIKE[platform];
  let platSess: boolean;
  let authSess: boolean;
  let available: number;
  try {
    available = hostCounts(srcCookies, hosts);
    platSess = sessionLike ? sessionCount(srcCookies, hosts, sessionLike) > 0 : available > 0;
    authSess = hasAuthSession(srcCookies);
  } catch (e) {
    return { ok: false, platform, source: src.key, error: `cannot read the source cookie store (browser may hold it open): ${e instanceof Error ? e.message : e}` };
  }
  // Neither a live platform session NOR a signed-in SSO provider ⇒ borrowing yields a signed-out
  // profile. Refuse with the real reason instead of a confusing "please log in" later.
  if (!platSess && !authSess) {
    const has = available ? `has ${available} ${hosts[0]} cookie(s) but no live session` : `has no ${hosts[0]} cookies and is not signed into Google/Microsoft`;
    return { ok: false, platform, source: src.key, sourceProfile: profile, error: `${src.label} profile '${profile}' ${has} — sign in there first, or pick another --profile` };
  }

  const target = join(opts.browserRoot ?? join(currentMemoryDir(), "browser"), platform);
  if (existsSync(target) && readdirSync(target).length && !opts.replace) {
    return { ok: false, platform, source: src.key, error: `zemory already has a ${platform} browser profile — pass --replace to overwrite it (its current session is lost)` };
  }
  // ĐỔI CHỖ, KHÔNG XOÁ. Đo 2026-07-30: cookie mượn về KHÔNG chắc mở được phiên (App-Bound
  // Encryption), mà profile bị thay có thể đang đăng nhập ngon lành — xoá thẳng là biến
  // một nút "thử xem có mượn được không" thành nút phá. Người gọi kiểm xong: mượn được
  // thì dọn bản lùi, không được thì `restoreProfile()` trả nguyên trạng.
  let backup: string | undefined;
  if (existsSync(target)) {
    backup = `${target}.bak-${process.hrtime.bigint().toString(36)}`;
    try {
      renameSync(target, backup);
    } catch {
      backup = undefined;
      rmSync(target, { recursive: true, force: true }); // bị khoá — không còn đường nào khác
    }
  }
  mkdirSync(join(target, "Default", "Network"), { recursive: true });

  try {
    copyFileSync(srcLocalState, join(target, "Local State")); // holds the app-bound key
    // KHÔNG copyFileSync cho cookie DB: Chromium chạy WAL, nên phần ghi gần nhất — đúng
    // cái cookie phiên vừa đăng nhập — còn nằm ở `Cookies-wal`, chưa vào file chính.
    // Chép file trần khi trình duyệt đang mở là lấy về một bản CŨ, và triệu chứng của nó
    // là "mượn xong vẫn báo chưa đăng nhập". `VACUUM INTO` đọc qua SQLite nên gộp cả WAL
    // và cho một bản sao nhất quán. (Đọc read-only ⇒ không đụng gì tới file gốc.)
    const srcDb = new Database(srcCookies, { readonly: true });
    try {
      srcDb.prepare("VACUUM INTO ?").run(join(target, "Default", "Network", "Cookies"));
    } finally {
      srcDb.close();
    }
  } catch (e) {
    rmSync(target, { recursive: true, force: true });
    if (backup) renameSync(backup, target);
    return { ok: false, platform, source: src.key, error: `copy failed (close ${src.label} and retry): ${e instanceof Error ? e.message : e}` };
  }

  // PRUNE: keep the target site + its identity providers (AUTH_HOSTS), drop everything else.
  // This is the step that keeps the feature defensible — zemory's profile ends up holding the
  // platform session and the SSO login it flows through, not the user's whole life (bank, mail…).
  let kept: number;
  let dropped: number;
  try {
    const db = new Database(join(target, "Default", "Network", "Cookies"));
    try {
      const keepHosts = [...hosts, ...AUTH_HOSTS];
      const like = keepHosts.map(() => "host_key LIKE ?").join(" OR ");
      const args = keepHosts.map((h) => `%${h}`);
      const before = (db.prepare("SELECT COUNT(1) n FROM cookies").get() as { n: number }).n;
      db.prepare(`DELETE FROM cookies WHERE NOT (${like})`).run(...args);
      kept = (db.prepare("SELECT COUNT(1) n FROM cookies").get() as { n: number }).n;
      dropped = before - kept;
      db.exec("VACUUM");
    } finally {
      db.close();
    }
  } catch (e) {
    rmSync(target, { recursive: true, force: true }); // never leave a half-pruned jar behind
    if (backup) renameSync(backup, target); // trả lại profile cũ
    return { ok: false, platform, source: src.key, error: `pruning failed, nothing kept: ${e instanceof Error ? e.message : e}` };
  }

  // The copied key can only be unwrapped by the browser it came from.
  writeFileSync(join(target, ".zemory-browser"), src.exe, "utf8");
  return { ok: true, platform, source: src.key, sourceProfile: profile, kept, dropped, browser: src.exe, backup };
}

/**
 * Trả profile về trạng thái trước khi mượn (mượn không ăn thì không được để lại hậu quả).
 *
 * 🔴 KIỂM BẢN LÙI CÒN ĐÓ TRƯỚC KHI PHÁ ĐÍCH (vá 2026-09-02, phản biện audit chỉ ra).
 * Thứ tự cũ là `rmSync(target)` rồi `renameSync(backup, target)` — cả hai trong MỘT `try` nuốt lỗi.
 * Bản lùi biến mất vì bất kỳ lý do (vòng dọn 6 giờ chạy trúng lúc `/connect` còn đang chờ
 * `scanWebPlatforms` mở trình duyệt · lỗi đĩa · người dùng xoá tay) ⇒ `rmSync` xoá THÀNH CÔNG
 * profile sống, `renameSync` ném, `catch` nuốt ⇒ **khe mất trắng cả profile mà không một dòng báo**.
 * Đây là kiểu hỏng tệ nhất theo `02_RULES`: nó không báo lỗi, nó phá rồi im.
 * Không còn bản lùi ⇒ THÔI, giữ nguyên hiện trạng: profile mượn-hụt vẫn tệ hơn không có gì.
 */
export function restoreProfile(target: string, backup: string): void {
  if (!existsSync(backup)) return;
  try {
    rmSync(target, { recursive: true, force: true });
    renameSync(backup, target);
  } catch {
    /* fail-open: bản lùi vẫn nằm cạnh đó, người dùng đổi tên tay được */
  }
}

/** Dọn bản lùi khi đã chắc chắn không cần nữa. */
export function dropBackup(backup: string): void {
  try {
    rmSync(backup, { recursive: true, force: true });
  } catch {
    /* để lại cũng vô hại */
  }
}
