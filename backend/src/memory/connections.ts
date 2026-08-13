// "Liên kết" — trạng thái kết nối của TỪNG nguồn trong Sources.
//
// Vì sao có (user chốt 2026-07-30): hộp thoại đăng nhập tự nhảy ra giữa lúc quét là
// kiểu sai — nó xuất hiện đúng lúc người ta không hỏi, và không trả lời được câu hỏi
// thật là *"rốt cuộc nguồn nào đang nối, nguồn nào đứt?"*. Nên trạng thái được TRƯNG
// RA thành một bảng cạnh Sources: nguồn nào còn nối thì tick xanh, nguồn nào đứt thì
// chấm than kèm nút nối lại. Người dùng bấm khi họ muốn, không bị hỏi ngang.
//
// NGUYÊN TẮC ĐO (điều 12 — không trưng số không đo được):
//   · nguồn LOCAL: nối = thư mục store của agent CÒN TRÊN ĐĨA. Đo được ngay, rẻ.
//   · nguồn WEB: nối = phiên đăng nhập còn sống. Kiểm thật thì phải MỞ TRÌNH DUYỆT, nên
//     ở đây chỉ hiện kết quả của lần kiểm GẦN NHẤT kèm thời điểm — không bịa "đang nối"
//     từ việc có sẵn thư mục profile. Bấm nút mới đi kiểm thật.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { currentMemoryDir, openMemory } from "./db.js";
import { findBorrowSource } from "./borrowcookies.js";
import { getWebAuth } from "../config/settings.js";

export interface ConnectionRow {
  /** `source` như trong Sources/scope tree: `codex` · `claude-code` · `chatgpt-web`… */
  source: string;
  label: string;
  kind: "local" | "web";
  /** Nền web tương ứng (chatgpt/claude) — để nút nối lại biết gọi ai. */
  platform?: string;
  /** Khe tài khoản của nền đó ("main", "2", …). */
  account?: string;
  connected: boolean;
  /** Câu giải thích NGẮN, luôn là thứ đo được: đường dẫn store, hoặc lần kiểm cuối. */
  detail?: string;
  /**
   * CÙNG câu đó nhưng ở dạng MÃ + THAM SỐ, để UI tự ghép theo ngôn ngữ của nó.
   *
   * Vì sao cần: `detail` là câu tiếng Việt đã ghép sẵn ở backend, nên UI **không có cách nào**
   * dịch — bật `lang=en` là bảng Liên kết vẫn ra tiếng Việt (trái `02_RULES §Ngôn ngữ`).
   * Thêm MỚI chứ không thay `detail`: mọi thứ đang đọc `detail` vẫn chạy y nguyên, UI nào hiểu
   * mã thì dùng mã. Ngày không còn ai đọc `detail` nữa thì bỏ nó đi là việc riêng, có kiểm.
   */
  detailCode?: "lastChecked" | "neverChecked" | "storePath" | "storeGone" | "noStore";
  detailArgs?: { at?: string; who?: string; path?: string };
  /** Số tin đang có trong bộ nhớ của nguồn này. */
  messages: number;
  /** Nền web: có phiên sẵn trong trình duyệt thật ⇒ nối lại bằng MỘT bấm, khỏi mật khẩu. */
  canBorrow?: { from: string; label: string; profile: string; cookies: number } | null;
  /** Chưa từng kiểm lần nào (khác hẳn "đã kiểm và thấy đứt"). */
  unknown?: boolean;
}

const WEB_LABEL: Record<string, { label: string; platform: string }> = {
  "chatgpt-web": { label: "ChatGPT (web)", platform: "chatgpt" },
  "claude-web": { label: "Claude.ai (web)", platform: "claude" },
  "gemini-web": { label: "Gemini (web)", platform: "gemini" },
};

const LOCAL_LABEL: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  continue: "Continue",
  lmstudio: "LM Studio",
  cowork: "Cowork",
};

/** Bao lâu rồi, dạng người đọc được. */
function ago(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return iso.slice(0, 16).replace("T", " ");
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} giờ trước`;
  return `${Math.round(h / 24)} ngày trước`;
}

/**
 * Mọi nguồn có mặt trong Sources + trạng thái liên kết của nó.
 *
 * Liệt kê theo dữ liệu THẬT trong bộ nhớ (`sessions.source`) chứ không theo một danh
 * sách cứng — Sources hiện gì thì bảng này có đúng cái đó, khỏi lệch nhau. Riêng hai
 * nền web thì luôn có mặt kể cả khi chưa nạp tin nào, vì đó chính là thứ cần nối.
 */
export function listConnections(dbPath?: string): ConnectionRow[] {
  const db = openMemory(dbPath);
  let rows: { source: string; origin: string; n: number }[];
  let stores: { root: string; source: string }[];
  try {
    rows = db
      .prepare(
        `SELECT s.source AS source, s.origin AS origin, COUNT(m.id) AS n
           FROM sessions s LEFT JOIN messages m ON m.session_id = s.id
          GROUP BY s.source, s.origin`,
      )
      .all() as { source: string; origin: string; n: number }[];
    stores = db.prepare("SELECT store_root AS root, source FROM known_stores").all() as { root: string; source: string }[];
  } finally {
    db.close();
  }

  const byMessages = new Map(rows.map((r) => [r.source, r.n]));
  const seen = new Set(rows.map((r) => r.source));
  for (const s of Object.keys(WEB_LABEL)) if (s !== "gemini-web") seen.add(s); // web luôn hiện: đó là thứ cần nối
  const auth = getWebAuth();

  const out: ConnectionRow[] = [];
  for (const source of [...seen].sort()) {
    const web = WEB_LABEL[source];
    const messages = byMessages.get(source) ?? 0;
    if (web) {
      // MỘT DÒNG MỖI TÀI KHOẢN. Hội thoại nằm theo tài khoản: đo 2026-07-31, 3 phiên
      // Cowork user cần nằm ở một tài khoản Claude khác cái đang đăng nhập — gộp thành
      // một dòng thì không nhìn ra điều đó, và cũng không có chỗ để nối tài khoản kia.
      for (const acct of browserAccounts(web.platform)) {
        const key = acct === "main" ? web.platform : `${web.platform}#${acct}`;
        const st = auth[key];
        out.push({
          source,
          label: acct === "main" ? web.label : `${web.label} · tài khoản ${acct}`,
          kind: "web",
          platform: web.platform,
          account: acct,
          connected: st?.ok === true,
          unknown: !st,
          detail: st ? `kiểm lần cuối ${ago(st.at)}${st.who ? ` · ${st.who}` : ""}` : "chưa kiểm lần nào",
          detailCode: st ? "lastChecked" : "neverChecked",
          detailArgs: st ? { at: st.at, who: st.who } : undefined,
          // Số tin là của cả LANE (mọi tài khoản dồn về một lane) — chỉ ghi ở dòng đầu để
          // không cộng dồn nhìn như nhân đôi.
          messages: acct === "main" ? messages : 0,
          canBorrow: st?.ok === true || acct !== "main" ? undefined : findBorrowSource(web.platform),
        });
      }
      continue;
    }
    // Local: nối = còn thư mục store trên đĩa. Máy khác đồng bộ sang thì không có store
    // ở đây — đó KHÔNG phải đứt liên kết, chỉ là dữ liệu của máy khác.
    const mine = stores.filter((s) => s.source === source);
    const alive = mine.filter((s) => existsSync(s.root));
    out.push({
      source,
      label: LOCAL_LABEL[source] ?? source,
      kind: "local",
      connected: alive.length > 0,
      detail: alive.length ? alive[0].root : mine.length ? `store đã biết nhưng không còn trên đĩa: ${mine[0].root}` : "không có store trên máy này (dữ liệu đồng bộ từ máy khác)",
      detailCode: alive.length ? "storePath" : mine.length ? "storeGone" : "noStore",
      detailArgs: alive.length ? { path: alive[0].root } : mine.length ? { path: mine[0].root } : undefined,
      messages,
    });
  }
  return out;
}

/**
 * Các KHE TÀI KHOẢN đang có của một nền: `main` + mọi thư mục `<platform>-<acct>`.
 *
 * Hội thoại nằm theo TÀI KHOẢN, không theo nền — đo 2026-07-31: ba phiên Cowork cần tra
 * lại nằm ở một tài khoản Claude khác cái đang đăng nhập. Không có khe thì muốn lấy chúng
 * phải đăng xuất cái đang dùng, tức đổi mất phiên này để lấy phiên kia.
 */
export function browserAccounts(platform: string): string[] {
  const root = join(currentMemoryDir(), "browser");
  const out = existsSync(join(root, platform)) ? ["main"] : [];
  try {
    for (const d of readdirSync(root)) {
      const m = new RegExp("^" + platform + "-(.+)$").exec(d);
      if (m) out.push(m[1]);
    }
  } catch {
    /* chưa có thư mục browser nào */
  }
  return out.length ? out : ["main"];
}

/** Thư mục profile trình duyệt của một khe tài khoản. */
export function webProfileDir(platform: string, account?: string): string {
  const a = (account ?? "main").trim();
  return join(currentMemoryDir(), "browser", !a || a === "main" ? platform : platform + "-" + a);
}
