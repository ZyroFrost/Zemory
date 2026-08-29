// Scoped sync/recall — a provenance TREE over the memory plus an EXCLUDE list so
// the user can leave "shared" lanes out of sync and recall WITHOUT deleting them
// (spec: docs/plan/08_scoped_sync.md). Built on the columns already stamped on
// every session (origin / host / source) — no new store, no migration. The same
// exclude list drives three surfaces: recall (search.ts), and both directions of
// sync (share.ts export + merge). Data stays in the local DB either way.

import { hostname } from "node:os";
import { type MemoryDB, currentMemoryDb, openMemory } from "./db.js";
import { allAdapters } from "./adapters/index.js";
import { getScopeExclude, getWebAuth, getWebPull, type ScopeLane } from "../config/settings.js";
import { accountsOf, isEmail, slotOfIdentity } from "./webslots.js";
import { findBorrowSource } from "./borrowcookies.js";
import { type ConnectionRow, listConnections } from "./connections.js";

export type { ScopeLane };

/** Máy đang chạy — cùng cách đóng dấu `host` lúc ingest (`ingest.ts`), để so được với hàng máy. */
const thisHost = hostname() || "unknown";

export interface ScopeSession {
  origin: string;
  host: string | null;
  source: string;
  /** v24 — khe tai khoan; null = phien cu chua dong dau. */
  account?: string | null;
}

/**
 * Stable key for a lane selector — UI toggle identity + dedup.
 *
 * 🔴 KHÔNG NÊU và CHUỖI RỖNG phải ra hai khoá KHÁC NHAU. Bản cũ dùng `?? ""` cho cả hai nên
 * lane `{source:'claude-web'}` (cả nguồn) và `{source:'claude-web', account:''}` (nhóm
 * "(không rõ)") sinh **cùng một khoá** — hai hàng khác nhau trên cây dùng chung một danh
 * tính toggle, tức bấm hàng này thì `mark()` đánh dấu luôn hàng kia. Cùng bẫy đó đã nằm sẵn
 * ở `host` (lane máy "(unknown machine)" dùng `host:''`), chỉ chưa ai chạm tới.
 * Dấu `*` là sentinel cho "không nêu": nó không phải giá trị hợp lệ của origin/host/source/account.
 */
const laneField = (v: string | undefined): string => (v === undefined ? "*" : v);

export function laneKey(l: ScopeLane): string {
  return `o=${laneField(l.origin)}|h=${laneField(l.host)}|s=${laneField(l.source)}|a=${laneField(l.account)}`;
}

/** Does one exclude lane match a given session? An empty lane matches nothing
 *  (guard against an all-wildcard selector silently hiding the whole memory). */
export function laneMatches(lane: ScopeLane, s: ScopeSession): boolean {
  let any = false;
  if (lane.origin !== undefined) {
    if (lane.origin !== s.origin) return false;
    any = true;
  }
  if (lane.host !== undefined) {
    if (lane.host !== (s.host ?? "")) return false;
    any = true;
  }
  if (lane.source !== undefined) {
    if (lane.source !== s.source) return false;
    any = true;
  }
  if (lane.account !== undefined) {
    // Lane account="" la nhom "(khong ro)" — khop dung phien CHUA dong dau (NULL). Day la
    // lane THAT, khong phai ky tu dai dien: gop no voi 'main' la gan bua cho du lieu cu.
    if (lane.account !== (s.account ?? "")) return false;
    any = true;
  }
  return any;
}

/** Is a session excluded by any lane in the list (default = the saved list)? */
export function isExcluded(s: ScopeSession, lanes: ScopeLane[] = getScopeExclude()): boolean {
  return lanes.some((l) => laneMatches(l, s));
}

/** Does exclude lane `l` cover (is a prefix of) node lane `n`? Used to grey out a
 *  child in the UI when an ancestor lane already excludes it. */
function laneCovers(l: ScopeLane, n: ScopeLane): boolean {
  if (l.origin !== undefined && l.origin !== n.origin) return false;
  if (l.host !== undefined && l.host !== n.host) return false;
  if (l.source !== undefined && l.source !== n.source) return false;
  if (l.account !== undefined && l.account !== n.account) return false;
  return l.origin !== undefined || l.host !== undefined || l.source !== undefined || l.account !== undefined;
}

/**
 * A positive SQL match for the exclude lanes against a sessions-table alias, e.g.
 * `(COALESCE(a.origin,'local')=? AND a.source=?) OR (...)`. Callers use it as-is
 * to DELETE excluded rows (export) or negated (`NOT (...)`) to skip them (merge).
 * Returns an empty match when there is nothing to exclude.
 */
export function laneSqlClause(alias: string, lanes: ScopeLane[]): { match: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const l of lanes) {
    const conds: string[] = [];
    if (l.origin !== undefined) {
      conds.push(`COALESCE(${alias}.origin,'local') = ?`);
      params.push(l.origin);
    }
    if (l.host !== undefined) {
      conds.push(`COALESCE(${alias}.host,'') = ?`);
      params.push(l.host);
    }
    if (l.source !== undefined) {
      conds.push(`${alias}.source = ?`);
      params.push(l.source);
    }
    if (l.account !== undefined) {
      // `COALESCE(...,'')` để lane "(không rõ)" (`account:""`) khớp đúng hàng NULL. Thiếu
      // nhánh này thì bỏ tick một tài khoản vẫn ngừng KÉO nhưng KHÔNG lọc lúc sync — tức
      // đúng loại ô tick nói sai về chính nó mà chiều `account` sinh ra để diệt.
      conds.push(`COALESCE(${alias}.account,'') = ?`);
      params.push(l.account);
    }
    if (conds.length) parts.push(`(${conds.join(" AND ")})`);
  }
  return { match: parts.join(" OR "), params };
}

export interface ScopeNode {
  key: string; // laneKey of this node's selector (toggle identity)
  label: string;
  lane: ScopeLane; // the selector to exclude/include when this node is toggled
  sessions: number;
  messages: number;
  excluded: boolean; // this exact lane is in the exclude list
  effectiveExcluded: boolean; // excluded by this lane OR an ancestor lane
  /** true = zemory HỖ TRỢ nguồn này nhưng CHƯA có dữ liệu. Hiện ra để user biết nó tồn
   *  tại và biết đường nạp; ẩn đi thì thành vòng luẩn quẩn "muốn có dữ liệu phải tick,
   *  muốn tick phải có dữ liệu" (user 2026-07-27). */
  empty?: boolean;
  /**
   * SỨC KHOẺ của một nguồn WEB đã tick — thêm 2026-08-28.
   *
   * Vì sao phải có: bảng Nguồn trước đây chỉ vẽ **ô tick + số tin**, nên một lane ngừng về
   * từ 24 ngày trước trông y hệt một lane đang chạy tốt — số vẫn to, vẫn xanh. User bắt được
   * đúng chỗ này (*"t thấy nó luôn xanh mà ko báo gì"*), và nó là "vỏ rỗng" mà
   * `02_RULES §Bề mặt CHẾT THEO nền` gọi là kiểu hỏng TỆ NHẤT: nó không báo lỗi, nó nói dối.
   *
   * Luật đi kèm (user chốt cùng ngày): *"bất cứ source nào check vào mà nó lỗi ko kéo dc là
   * phải báo"* ⇒ trường này CHỈ vắng khi lane không phải web, hoặc lane đang bị bỏ tick.
   */
  /**
   * TRẠNG THÁI LIÊN KẾT của chính hàng này — web VÀ local.
   *
   * Đổi tên từ `web` và mở sang local 2026-08-28, vì gộp nửa vời là chưa gộp: bỏ nguồn web
   * khỏi bảng dưới rồi mà `Claude Code` · `Codex` · `Continue` vẫn nằm đó, TRONG KHI cây
   * Local ở trên đã có đúng những dòng ấy. User chỉ ra ngay: *"gộp lên thì ở dưới phải mất
   * chứ sao còn"*. Có trường này cho mọi lá thì bảng dưới không còn gì để nói và bị gỡ hẳn.
   */
  conn?: {
    /** `web` = phải đăng nhập trình duyệt · `local` = kho trên đĩa. Quyết định hành động khi bấm. */
    kind: "web" | "local";
    /** Local của MÁY KHÁC (đồng bộ về): không soi đĩa được, chấm theo "còn đổ dữ liệu về không"
     *  (`staleDays`). Máy ngưng ≥30 ngày = kho lưu trữ, không phải lỗi (user chốt 2026-08-29). */
    remote?: boolean;
    /** Hàng CHA (nguồn · máy): số con đang ⚠ / tổng con — cha gộp từ con, không tự đo. */
    bad?: number;
    kids?: number;
    /**
     * ĐÃ NỐI chưa (phiên đăng nhập còn sống) — `null` = chưa kiểm lần nào.
     *
     * Khác `state` bên dưới, và phải đứng CẠNH nó: *"đã nối"* trả lời **kéo được không**,
     * *"state"* trả lời **lượt kéo vừa rồi ra sao**. Một nguồn có thể ĐANG NỐI mà chưa kéo
     * lần nào, hoặc MẤT PHIÊN nhưng lượt kéo cuối (từ lâu) vẫn "ok". Gộp hai thứ thành một
     * đèn là mất đúng thông tin người dùng cần để biết phải BẤM hay chỉ CHỜ.
     *
     * Trước 2026-08-28 vế này chỉ sống ở bảng "Liên kết" tách rời bên dưới — user chỉ ra đó
     * chính là chỗ chưa gộp: *"mấy cái check link phải nằm ngay sau mấy cái check source"*.
     */
    linked: boolean | null;
    /** Nền + khe để nút nối lại biết gọi ai (`platform`, `account`). */
    platform?: string;
    account?: string;
    /** TÊN tài khoản thật (email lúc kiểm đăng nhập) — hiện thẳng trên hàng (user chốt
     *  2026-08-28). Chỉ có khi đã từng nối; đây là lý do người dùng phân biệt được hai
     *  dòng claude của hai tài khoản khác nhau. */
    who?: string;
    /** Có phiên sẵn trong trình duyệt thật ⇒ mượn được, khỏi gõ mật khẩu. */
    canBorrow?: boolean;
    /** Lượt kéo tự động gần nhất: `ok` xong xuôi · `fail` đã thử và trượt · `never` chưa lần nào. */
    state: "ok" | "fail" | "never";
    /** Lý do khi trượt (`need-login` · `no-browser` · `error`…) — để bề mặt nói ĐÚNG việc phải làm. */
    status?: string;
    /** Lần kéo gần nhất (ISO), bất kể thành hay bại. */
    at?: string;
    /** Số ngày kể từ TIN MỚI NHẤT của lane — thứ người dùng thật sự muốn biết. */
    staleDays?: number;
    /** Câu giải thích của nguồn LOCAL (đường kho, hoặc vì sao không nối) — cùng nội dung
     *  bảng "Liên kết" cũ đưa ra, nay hiện trong hộp chi tiết khi bấm badge. */
    detail?: string;
    detailCode?: string;
  };
  children?: ScopeNode[];
}

interface LaneRow {
  origin: string;
  host: string;
  source: string;
  /** v24 — khe tài khoản; "" = phiên chưa đóng dấu (nhóm "(không rõ)"). */
  account: string;
  sessions: number;
  messages: number;
}

/**
 * Provenance tree for the UI: Local → machine → agent, and Web → platform, each
 * node carrying session/message counts and its current exclude state. Purely
 * derived — GROUP BY over `sessions`, then assembled in JS.
 */
export function scopeTree(dbPath: string = currentMemoryDb(), lanes: ScopeLane[] = getScopeExclude()): ScopeNode[] {
  const db: MemoryDB = openMemory(dbPath);
  let rows: LaneRow[];
  try {
    rows = db
      .prepare(
        `SELECT COALESCE(origin,'local') AS origin,
                COALESCE(host,'')         AS host,
                source,
                COALESCE(account,'')      AS account,
                COUNT(*)                       AS sessions,
                COALESCE(SUM(message_count),0) AS messages
           FROM sessions
          GROUP BY COALESCE(origin,'local'), COALESCE(host,''), source, COALESCE(account,'')`,
      )
      .all() as LaneRow[];
  } finally {
    db.close();
  }

  // BỘ CHUẨN: mọi nguồn zemory hỗ trợ, kể cả nguồn CHƯA có dữ liệu. Trước đây cây chỉ
  // dựng từ `GROUP BY sessions` nên một adapter mới (vd claude-web) vô hình cho tới khi
  // capture được lần đầu — mà muốn capture thì user phải biết nó tồn tại đã. Vòng luẩn
  // quẩn. Nay lane rỗng vẫn hiện, gắn cờ `empty` để UI nói rõ "chưa có dữ liệu".
  const seen = new Set(rows.map((r) => `${r.origin}|${r.source}`));
  for (const a of allAdapters()) {
    const origin = a.origin ?? "local";
    if (seen.has(`${origin}|${a.source}`)) continue;
    // host rỗng: nguồn chưa có dữ liệu thì chưa gắn với máy nào cả.
    rows.push({ origin, host: "", source: a.source, account: "", sessions: 0, messages: 0 } as LaneRow);
  }

  const mark = (lane: ScopeLane): { excluded: boolean; effectiveExcluded: boolean } => ({
    excluded: lanes.some((l) => laneKey(l) === laneKey(lane)),
    effectiveExcluded: lanes.some((l) => laneCovers(l, lane)),
  });

  const originOrder = ["local", "web"];
  const out: ScopeNode[] = [];
  for (const origin of [...originOrder, ...[...new Set(rows.map((r) => r.origin))].filter((o) => !originOrder.includes(o))]) {
    const orows = rows.filter((r) => r.origin === origin);
    if (!orows.length) continue;
    const originLane: ScopeLane = { origin };
    const originNode: ScopeNode = {
      key: laneKey(originLane),
      label: origin === "local" ? "Local" : origin === "web" ? "Web chat" : origin, // "(agents)" thừa — user 2026-08-29
      lane: originLane,
      sessions: sum(orows, "sessions"),
      messages: sum(orows, "messages"),
      ...mark(originLane),
      children: [],
    };

    // Đọc MỘT LẦN cho cả nhánh local (nó dò đĩa + đọc `known_stores`); gọi trong vòng lặp là
    // lặp lại đúng phép dò đó cho mỗi máy × mỗi agent.
    const conns = origin === "local" ? safeConnections(dbPath) : [];
    const newestHost = origin === "local" ? newestPerHostSource(dbPath) : {};
    if (origin === "local") {
      // Local → machine → agent
      for (const host of [...new Set(orows.map((r) => r.host))].sort()) {
        const hrows = orows.filter((r) => r.host === host);
        const hostLane: ScopeLane = { origin, host };
        const hostNode: ScopeNode = {
          key: laneKey(hostLane),
          label: host || "(unknown machine)",
          lane: hostLane,
          sessions: sum(hrows, "sessions"),
          messages: sum(hrows, "messages"),
          ...mark(hostLane),
          children: hrows
            .slice()
            .sort((a, b) => b.sessions - a.sessions)
            .map((r) => {
              const lane: ScopeLane = { origin, host, source: r.source };
              const lm = mark(lane);
              return {
                key: laneKey(lane),
                label: r.source,
                lane,
                sessions: r.sessions,
                messages: r.messages,
                empty: r.sessions === 0, // nguồn được hỗ trợ nhưng chưa nạp gì
                ...lm,
                // Nguồn LOCAL cũng mang trạng thái ngay trên hàng — đó là điều kiện để gỡ hẳn
                // bảng "Liên kết" bên dưới (nó chỉ lặp lại đúng những dòng này).
                // CHỈ hàng của MÁY NÀY mới soi được kho trên đĩa. Hàng của máy khác (đồng bộ
                // sang) không có store ở đây là ĐÚNG, không phải đứt — bản cũ gắn ⚠ "kho đã mất"
                // lên codex/lmstudio/continue của DESKTOP (đường `C:\Users\Zyro\…`) trên máy
                // SS01-IT-12: báo oan (user 2026-08-29). Máy khác ⇒ không gắn `conn`.
                ...(lm.effectiveExcluded
                  ? {}
                  : host === thisHost
                    ? { conn: localHealth(r.source, conns) }
                    : { conn: remoteHealth(newestHost[`${host} ${r.source}`]) }),
              };
            }),
        };
        hostNode.conn = aggregateConn(hostNode.children ?? []);
        originNode.children!.push(hostNode);
      }
    } else {
      // Web → platform (source), flat. Aggregate across machines so one platform
      // is ONE node (a bundle merged from another PC stamps its own host, but the
      // lane we exclude is per-platform, not per-machine).
      const bySource = new Map<string, { sessions: number; messages: number }>();
      for (const r of orows) {
        const acc = bySource.get(r.source) ?? { sessions: 0, messages: 0 };
        acc.sessions += r.sessions;
        acc.messages += r.messages;
        bySource.set(r.source, acc);
      }
      const pull = getWebPull();
      const newest = newestPerSource(dbPath);
      for (const [source, acc] of [...bySource.entries()].sort((a, b) => b[1].sessions - a[1].sessions)) {
        const lane: ScopeLane = { origin, source };
        const m = mark(lane);
        // TẦNG THỨ TƯ — mỗi KHE TÀI KHOẢN một dòng (v24, user chốt 2026-08-28: *"lỡ lấy từ
        // nhiều tk thì sao? … có thể có 2 dòng claude khác nhau với 2 tên tk khác"*).
        //
        // Hai nguồn hợp lại, cố ý:
        //  · khe có DỮ LIỆU trong kho (`GROUP BY account`) — thứ tick/bỏ tick lọc được;
        //  · khe có PROFILE trình duyệt mà chưa kéo được gì — nếu bỏ, một tài khoản vừa
        //    thêm sẽ vô hình cho tới lần kéo đầu tiên, đúng vòng luẩn quẩn mà cờ `empty`
        //    sinh ra để phá ("muốn thấy phải có dữ liệu, muốn có dữ liệu phải thấy").
        const srows = orows.filter((r) => r.source === source);
        const slots = new Map<string, { sessions: number; messages: number }>();
        for (const r of srows) {
          const a = slots.get(r.account) ?? { sessions: 0, messages: 0 };
          a.sessions += r.sessions;
          a.messages += r.messages;
          slots.set(r.account, a);
        }
        // 🔴 CHỈ khe THẬT mới được thành hàng — khe THẬT = **đã đăng nhập được ít nhất một
        // lần** (`webAuth[..].ok`), hoặc **đang có dữ liệu** trong kho.
        //
        // Vì sao (user chốt 2026-08-28, nguyên văn: *"chưa liên kết thì sẽ ko hiện, đéo có
        // chuyện mà nó lưu thông tin nhảm tk2"*): `accountsOf` liệt kê theo THƯ MỤC profile,
        // mà một thư mục được tạo ngay khi bấm "＋ thêm tài khoản" — kể cả khi người dùng
        // đóng cửa sổ mà không đăng nhập. Kết quả: một vỏ rỗng 0 tin, chưa từng nối, đứng
        // trên cây làm một hàng ⚠ VĨNH VIỄN. Đó không phải cảnh báo, đó là rác — và rác kiểu
        // này làm người ta bỏ qua cả cảnh báo thật.
        const auth = getWebAuth();
        const plat = source.replace(/-(web|cowork)$/u, "");
        // KHOÁ HÀNG = DANH TÍNH (email) khi biết, khe khi chưa biết (xem `webslots.accountKey`).
        // Khe đã đăng nhập mà chưa có dữ liệu: hàng của nó mang email đang đăng nhập — và nếu
        // email đó đã có hàng (dữ liệu cũ) thì KHÔNG đẻ hàng thứ hai. Ngược lại, dữ liệu của
        // một email không còn khe nào đăng nhập vẫn giữ hàng riêng, hiện "chưa nối" — đó là
        // "hiện song song các tài khoản" mà user yêu cầu 2026-08-28.
        for (const a of webSlotsOf(source)) {
          const rec = auth[a === "main" ? plat : `${plat}#${a}`];
          if (rec?.ok !== true) continue;
          const key = isEmail(rec.who) ? rec.who : a;
          if (!slots.has(key) && !slots.has(a)) slots.set(key, { sessions: 0, messages: 0 });
        }
        // MỘT KHUÔN cho mọi nguồn web: hàng nguồn → hàng TÀI KHOẢN bên dưới, kể cả khi chỉ có
        // một. (Bản chiều 2026-08-28 chỉ bung khi ≥2 ⇒ chatgpt dính email lên hàng nguồn còn
        // claude tách hàng — user: *"thằng gpt lại dính lên 1 dòng nữa chứ"*.) Chỉ không bung
        // khi KHÔNG có khe thật nào (chưa từng đăng nhập, không dữ liệu) — lúc đó chẳng có gì để bày.
        const realSlots = [...slots.keys()].filter((a) => a !== "");
        const onlyUnknown = realSlots.length === 0;
        const kids = onlyUnknown
          ? undefined
          : [...slots.entries()]
              .sort((x, y) => y[1].sessions - x[1].sessions)
              .map(([account, a]) => {
                const kl: ScopeLane = { origin, source, account };
                const km = mark(kl);
                // NHÃN = DANH TÍNH web trả về lúc đăng nhập (email), KHÔNG gì khác. User chốt 2026-08-28:
                // *"khi thông tin chính thức của web nhận về lưu thì lấy nó, đéo phải lấy lại cái cũ đã chế
                // bị sai"* — không mượn email của khe, không suy từ tên org, không "main". Như đổi tài khoản
                // trên Claude: mỗi tài khoản một hàng; mất nối ⇒ nút. Phiên đời cũ chưa có danh tính ⇒ MỘT
                // hàng "chưa gắn tài khoản" + nút liên kết mở khe MỚI; đăng nhập xong, web liệt kê hội thoại
                // của tài khoản đó ⇒ `restampAccount` gắn ⇒ hàng này tự hết. Không đoán chủ cũ từ sổ.
                const known = isEmail(account);
                const h = km.effectiveExcluded
                  ? undefined
                  : known
                    ? webHealth(source, pull, newest[source], account)
                    : ({ kind: "web", linked: false, platform: plat, account: "new", state: "never" } as const);
                const label = known ? account : "(chưa gắn tài khoản)";
                return {
                  key: laneKey(kl),
                  label,
                  lane: kl,
                  sessions: a.sessions,
                  messages: a.messages,
                  empty: a.sessions === 0,
                  ...km,
                  ...(h ? { conn: h } : {}),
                } satisfies ScopeNode;
              });
        originNode.children!.push({
          key: laneKey(lane),
          label: source,
          lane,
          sessions: acc.sessions,
          messages: acc.messages,
          empty: acc.sessions === 0, // nguồn được hỗ trợ nhưng chưa nạp gì
          ...m,
          // Chỉ gắn sức khoẻ cho lane ĐANG TICK: lane người dùng đã tắt thì "không về" là
          // đúng ý họ, cảnh báo ở đó là tiếng ồn (và tiếng ồn làm người ta bỏ qua cả cảnh
          // báo thật — chính là cách một cổng tự phá giá trị của mình).
          // Tầng con THU LẠI (0–1 tài khoản) ⇒ hàng nguồn phải mang trạng thái của CHÍNH khe
          // đó, không phải trạng thái gộp. Gộp thì `linked` ra `null` và hàng hiện `•` "chưa
          // kiểm" trong khi tài khoản duy nhất của nó đang nối bình thường — bề mặt lại nói sai.
          // Hàng NGUỒN gộp từ hàng tài khoản (một con ⚠ ⇒ cha ⚠); không có con thì tự đo khe main.
          ...(m.effectiveExcluded ? {} : { conn: kids ? aggregateConn(kids) : webHealth(source, pull, newest[source], realSlots[0] ?? "main") }),
          ...(kids ? { children: kids } : {}),
        });
      }
    }
    out.push(originNode);
  }
  return out;
}

function sum(rows: LaneRow[], k: "sessions" | "messages"): number {
  return rows.reduce((n, r) => n + Number(r[k] || 0), 0);
}

/**
 * Local của MÁY KHÁC: thứ đo được duy nhất là "dữ liệu máy đó còn về không". ≥30 ngày không
 * có tin mới ⇒ coi máy đã ngưng/đã dời — ✓ xám, tooltip nói là kho lưu trữ; không bao giờ ⚠
 * vì không có gì để người dùng bấm ở đây. Không có mốc nào ⇒ chưa biết.
 */
export const REMOTE_RETIRED_DAYS = 30;
export function remoteHealth(newest: string | undefined, now = Date.now()): NonNullable<ScopeNode["conn"]> {
  if (!newest) return { kind: "local", remote: true, linked: null, state: "never" };
  const staleDays = Math.max(0, Math.floor((now - Date.parse(newest)) / 86_400_000));
  return { kind: "local", remote: true, linked: true, state: "ok", staleDays };
}

/**
 * Hàng CHA gộp từ con — thuần. Một con ⚠ (mất nối / kéo hỏng) ⇒ cha ⚠ kèm `bad/kids`;
 * không con nào ⚠ và có ít nhất một con ✓ ⇒ ✓; toàn con chưa biết ⇒ chưa biết.
 * Cha KHÔNG tự đo: cha nói khác con là đúng loại "hai bề mặt hai sự thật" đã trả giá.
 */
export function aggregateConn(children: ScopeNode[]): NonNullable<ScopeNode["conn"]> | undefined {
  const cs = children.map((c) => c.conn).filter((c): c is NonNullable<ScopeNode["conn"]> => !!c);
  if (!cs.length) return undefined;
  const kind = cs.every((c) => c.kind === "web") ? "web" : "local";
  const bad = cs.filter((c) => c.linked === false || c.state === "fail").length;
  if (bad) return { kind, linked: false, state: "fail", bad, kids: cs.length };
  const ok = cs.filter((c) => c.linked === true);
  if (!ok.length) return { kind, linked: null, state: "never", kids: cs.length };
  const remote = ok.every((c) => c.remote === true);
  const stale = ok.map((c) => c.staleDays).filter((d): d is number => d !== undefined);
  return { kind, linked: true, state: "ok", kids: cs.length, ...(remote ? { remote } : {}), ...(stale.length ? { staleDays: Math.min(...stale) } : {}) };
}

/** Tin mới nhất theo (máy, nguồn) — khoá `host\0source`; thước cho hàng local của máy khác. */
function newestPerHostSource(dbPath: string): Record<string, string> {
  const db: MemoryDB = openMemory(dbPath);
  try {
    const rows = db.prepare(`SELECT COALESCE(host,'') AS h, source, MAX(ended_at) AS t FROM sessions GROUP BY h, source`).all() as { h: string; source: string; t: string | null }[];
    return Object.fromEntries(rows.filter((r) => r.t).map((r) => [`${r.h} ${r.source}`, r.t as string]));
  } catch {
    return {}; // fail-open (điều 9)
  } finally {
    db.close();
  }
}

/** Tin mới nhất của mỗi nguồn — thước "lane này còn về không" mà số tổng KHÔNG nói được. */
function newestPerSource(dbPath: string): Record<string, string> {
  const db: MemoryDB = openMemory(dbPath);
  try {
    const rows = db.prepare(`SELECT source, MAX(ended_at) AS t FROM sessions GROUP BY source`).all() as { source: string; t: string | null }[];
    return Object.fromEntries(rows.filter((r) => r.t).map((r) => [r.source, r.t as string]));
  } catch {
    return {}; // fail-open (điều 9): không đo được độ tươi thì vẫn phải vẽ được cây
  } finally {
    db.close();
  }
}

/**
 * Sức khoẻ một lane web đã tick. Ghép HAI sự thật khác nhau, cố ý không gộp:
 *  · **kéo** — lượt tự động gần nhất thành hay bại (từ `webPull`); trả lời *"máy có đang cố không"*;
 *  · **tươi** — tin mới nhất cách đây bao lâu (từ kho); trả lời *"có gì mới về không"*.
 * Một lane có thể kéo THÀNH CÔNG mà vẫn cũ (bạn không chat trên đó nữa) — gộp hai thứ này
 * thành một cờ xanh/đỏ là lại đẻ ra đúng loại bề mặt nói dối mà luật đang đi vá.
 */
/**
 * Trạng thái một nguồn LOCAL — đọc từ CHÍNH `listConnections()` mà bảng "Liên kết" cũ đọc.
 *
 * Dùng lại nguồn đó chứ không tự dò kho lần nữa: hai bề mặt tự đo riêng là hai bề mặt sẽ có
 * ngày nói khác nhau, và đó đúng là thứ mặt ③ của `audit` gọi tên (NGUỒN TRÙNG) — hôm nay
 * đã trả giá một lần vì `browserAccounts` là bản sao của `accountsOf`.
 */
function safeConnections(dbPath: string): ConnectionRow[] {
  try {
    return listConnections(dbPath);
  } catch {
    return []; // fail-open (điều 9): không dò được kho thì cây vẫn phải dựng được
  }
}

function localHealth(source: string, conns: ConnectionRow[]): NonNullable<ScopeNode["conn"]> {
  const r = conns.find((c) => c.kind === "local" && c.source === source);
  if (!r) return { kind: "local", linked: null, state: "never" };
  return { kind: "local", linked: r.connected, state: "never", detail: r.detail, detailCode: r.detailCode };
}

/** Khe trình duyệt ĐANG CÓ của nền đứng sau một nguồn web (`claude-web` → nền `claude`).
 *  Fail-open: dò không được thì trả rỗng — cây vẫn dựng từ dữ liệu trong kho. */
function webSlotsOf(source: string): string[] {
  try {
    return accountsOf(source.replace(/-(web|cowork)$/u, ""));
  } catch {
    return [];
  }
}

function webHealth(
  source: string,
  pull: Record<string, { at: string; ok: boolean; status: string }>,
  newest: string | undefined,
  account?: string,
): NonNullable<ScopeNode["conn"]> {
  // `webPull` khoá theo NỀN (`chatgpt`), còn lane khoá theo NGUỒN (`chatgpt-web`); một nền có
  // thể đẻ nhiều nguồn (claude → `claude-web` + `claude-cowork`) nên lấy lượt kéo MỚI NHẤT
  // trong các khe của nền đó.
  const plat = source.replace(/-(web|cowork)$/u, "");
  // `account` có thể là DANH TÍNH (email) — tra khe đang giữ nó trong `webAuth`; không khe nào
  // ⇒ tài khoản đó hiện KHÔNG đăng nhập ở đâu: hàng vẫn đứng (giữ lịch sử), trạng thái "chưa nối".
  const identity = isEmail(account) ? account : undefined;
  const slotName = identity ? slotOfIdentity(getWebAuth(), plat, identity) : account;
  if (identity && slotName === null) {
    const staleDays0 = newest ? Math.floor((Date.now() - Date.parse(newest)) / 86_400_000) : undefined;
    return { kind: "web", linked: false, platform: plat, account: identity, who: identity, state: "never", ...(staleDays0 === undefined ? {} : { staleDays: staleDays0 }) };
  }
  // Khoá của `webPull`/`webAuth`: `<nền>` cho khe main, `<nền>#<khe>` cho khe phụ. Hỏi một
  // khe cụ thể ⇒ lấy ĐÚNG khoá đó; hỏi cả nguồn ⇒ lấy lượt mới nhất trong mọi khe của nền.
  const slot = slotName === undefined ? null : slotName === "main" || slotName === "" ? plat : `${plat}#${slotName}`;
  const mine = slot
    ? Object.entries(pull).filter(([k]) => k === slot)
    : Object.entries(pull).filter(([k]) => k === plat || k.startsWith(plat + "#"));
  const last = mine.map(([, v]) => v).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  const staleDays = newest ? Math.floor((Date.now() - Date.parse(newest)) / 86_400_000) : undefined;

  // ĐÃ NỐI chưa — đọc từ cùng sổ mà bảng "Liên kết" vẫn đọc (`webAuth`), để hai bề mặt
  // KHÔNG BAO GIỜ nói khác nhau. Chưa kiểm lần nào ⇒ `null`, không phải `false`: "chưa biết"
  // và "biết là đứt" là hai câu khác nhau, và chỉ câu sau mới đáng bày nút nối lại màu cảnh báo.
  const auth = slot ? getWebAuth()[slot] : undefined;
  const linked = auth ? auth.ok === true : null;
  // `account` trả về cho nút nối lại: khe thật khi đã tra được, danh tính khi chỉ biết email.
  const acct = slotName === "" || slotName === undefined || slotName === null ? "main" : slotName;

  const base = {
    kind: "web" as const,
    linked,
    platform: plat,
    account: acct,
    // TÊN TÀI KHOẢN thật (email lúc kiểm đăng nhập) — user chốt 2026-08-28: *"cái nào liên
    // kết tk web thì ghi luôn tk đó"*. Đây là ĐỊNH DANH, không phải trạng thái: nối vào đâu
    // phải đọc được ngay trên hàng, không phải mở hộp mới biết. Chỉ có khi đã từng nối.
    ...(auth?.who ? { who: auth.who } : {}),
    // Chỉ mời mượn khi THẬT SỰ có cookie: mời rồi báo "trình duyệt cũng đăng xuất" tệ hơn
    // là không mời. Khe phụ không mượn được (cookie của trình duyệt thật là của MỘT tài khoản).
    ...(linked === false && acct === "main" ? { canBorrow: Boolean(findBorrowSource(plat)) } : {}),
    ...(staleDays === undefined ? {} : { staleDays }),
  };
  // Không có sổ kéo nhưng KHO CÓ TIN của nguồn này ⇒ đã kéo (sổ `webPull` ra đời 28/08, lượt
  // kéo cũ không ghi). Nói "chưa kéo lần nào" cạnh 31.803 tin là bề mặt nói ngược dữ liệu.
  if (!last && newest) return { ...base, state: "ok" as const };
  if (!last) return { ...base, state: "never" as const };
  return { ...base, state: last.ok ? ("ok" as const) : ("fail" as const), status: last.status, at: last.at };
}

/** Toggle a lane in the exclude list; returns the new list. Pure — caller persists. */
export function toggleLane(lanes: ScopeLane[], lane: ScopeLane, exclude: boolean): ScopeLane[] {
  const key = laneKey(lane);
  const without = lanes.filter((l) => laneKey(l) !== key);
  return exclude ? [...without, lane] : without;
}
