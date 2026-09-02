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

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { currentMemoryDir, openMemory } from "./db.js";
import { allAdapters } from "./adapters/index.js";
import { findBorrowSource } from "./borrowcookies.js";
import { accountsOf } from "./webslots.js";
import { getWebAuth, getWebPull } from "../config/settings.js";

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
  /** Daemon đang CANH cửa sổ đăng nhập của khe này (sau một cú "Đăng nhập"): người dùng đăng
   *  nhập xong là daemon tự nhận + tự kéo, UI chỉ cần vẽ lại. */
  watching?: boolean;
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
  detailCode?: "lastChecked" | "neverChecked" | "needLogin" | "storePath" | "storeGone" | "noStore";
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
  // `claude-cowork` là LANE PHỤ của cùng nền claude.ai (`PLATFORMS.claude.sub`), không phải
  // nguồn local. Thiếu dòng này nó rơi xuống nhánh local vì có thư mục `imports/cowork` trên
  // đĩa ⇒ bày ra như một "kho local đang nối", TRÙNG TÊN với chính nó ở cây Web chat. Đo
  // 2026-08-28: đúng cái tên `claude-cowork` hiện HAI LẦN trên một màn — thứ user đang bắt.
  "claude-cowork": { label: "Cowork (claude.ai)", platform: "claude" },
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
  // 🔴 BẰNG CHỨNG MỚI NHẤT THẮNG (bug đo 2026-09-02). `webAuth` là kết quả lần KIỂM cuối — có thể
  // đã nhiều ngày tuổi; `webPull` là kết quả lần KÉO cuối. Khi máy đổi trình duyệt mặc định
  // (Brave → Edge) thì `borrowCookies` dời profile sang bên và cả 4 khe mất phiên NGAY, nhưng
  // `webAuth` vẫn giữ `ok:true` từ 29/08 ⇒ bề mặt báo "đã nối" cho khe đang `need-login` từ 02/09.
  // Đúng thứ `02_RULES` gọi là bề mặt NÓI DỐI, và nó còn nguy hơn từ khi vòng tự kéo thôi mở cửa
  // sổ đăng nhập: không có cảnh báo thì khe chết IM LẶNG, không ai biết mà bấm nối lại.
  const pull = getWebPull();

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
        const pl = pull[key];
        // Lượt KÉO gần nhất nói `need-login` và nó MỚI HƠN lượt kiểm ⇒ khe đang MẤT KẾT NỐI,
        // bất kể `webAuth` còn nói gì. So mốc chứ không ưu tiên cứng một nguồn: một lượt kiểm
        // vừa chạy xong PHẢI thắng một lượt kéo hỏng từ hôm kia.
        const lostAt = pl && pl.ok === false && pl.status === "need-login" ? Date.parse(pl.at) : NaN;
        const checkedAt = st ? Date.parse(st.at) : NaN;
        const lost = Number.isFinite(lostAt) && (!Number.isFinite(checkedAt) || lostAt > checkedAt);
        out.push({
          source,
          label: acct === "main" ? web.label : `${web.label} · tài khoản ${acct}`,
          kind: "web",
          platform: web.platform,
          account: acct,
          connected: !lost && st?.ok === true,
          unknown: !st && !pl,
          // Mất kết nối thì NÓI RA việc phải làm, đừng bắt người dùng đoán: vòng tự kéo đã thôi
          // đụng khe này (không được tự bật khung đăng nhập), nên chỉ còn đường người bấm.
          detail: lost
            ? `mất kết nối ${ago(pl.at)} — bấm để đăng nhập lại`
            : st
              ? `kiểm lần cuối ${ago(st.at)}${st.who ? ` · ${st.who}` : ""}`
              : "chưa kiểm lần nào",
          detailCode: lost ? "needLogin" : st ? "lastChecked" : "neverChecked",
          detailArgs: lost ? { at: pl.at } : st ? { at: st.at, who: st.who } : undefined,
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
    // Sổ `known_stores` không có hàng cho nguồn này ⇒ lùi về đường MẶC ĐỊNH của adapter
    // (`~/<signature>`). Đo 2026-08-29: `claude-code-memory` đọc chung `.claude/projects` với
    // claude-code nên chưa từng có hàng riêng trong sổ ⇒ bảng phán "không có kho trên máy này"
    // ngay trên máy đang có 224 tin của nó. Thiếu sổ ≠ thiếu kho.
    let mine = stores.filter((s) => s.source === source);
    if (!mine.length) {
      const sig = allAdapters().find((a) => a.source === source)?.signature;
      if (sig) mine = [{ root: join(homedir(), sig), source }];
    }
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
// 🔴 BẢN SAO ĐÃ GỠ (2026-08-28). Hàm này từng chép nguyên logic của `accountsOf` bên
// `memory/scanweb.ts` — cùng một sự thật ở HAI nơi, đúng thứ mặt ③ của `audit` gọi là
// **NGUỒN TRÙNG**. Cái giá đo được ngay hôm nay: bản vá lọc thư mục sao lưu (`…bak-…`) áp
// vào `accountsOf` nhưng KHÔNG phủ đường này, nên bảng "Liên kết" vẫn bày hai khe ma
// (`tài khoản 2.chrome-bak-…`) kèm nút Link — trên đúng bề mặt người dùng nhìn.
// Nay gọi thẳng bản gốc: một chỗ sửa, mọi bề mặt ăn theo.
const browserAccounts = accountsOf;

/** Thư mục profile trình duyệt của một khe tài khoản. */
export function webProfileDir(platform: string, account?: string): string {
  const a = (account ?? "main").trim();
  return join(currentMemoryDir(), "browser", !a || a === "main" ? platform : platform + "-" + a);
}
