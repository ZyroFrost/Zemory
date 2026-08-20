// Context-guard — đo phiên đang chạy còn bao nhiêu chỗ, và chốt sổ TRƯỚC khi bị nén.
//
// Bài toán: khi context đầy, host tự NÉN (compact) — chi tiết đang làm dở biến thành một bản
// tóm tắt, và phiên sau đó dễ đoán bừa tiếp thay vì tra lại. zemory vốn đã giữ nguyên vẹn
// transcript trên đĩa + digest per-phiên, nên thứ THIẾU không phải kho, mà là:
//   ① biết mình sắp bị nén (không ai báo), và
//   ② chốt sổ đúng lúc đó thay vì chờ nhịp nền.
//
// Số đo nền (2026-08-02, chính phiên đang chạy): dòng cuối của transcript mang
// `usage.cache_read_input_tokens + cache_creation_input_tokens + input_tokens` ≈ 439k — tức
// mức context hiện tại NẰM SẴN trên đĩa, đọc cơ học, 0 token (HP điều 10).
//
// KHÔNG gọi model, không sinh văn bản: chỉ cộng số + so ngưỡng.

import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currentMemoryDir } from "./db.js";

/** Các bậc cửa sổ đã biết, tăng dần — dùng cho phép tự sửa ở `windowFor`. */
const TIERS = [200_000, 1_000_000];

/**
 * Trần cửa sổ ĐÃ ĐƯỢC CHỨNG MINH cho từng model id, học từ chính các phiên đã chạy trên máy này.
 *
 * Vì sao phải học thay vì đoán: transcript KHÔNG khai cửa sổ ở đâu cả (đo 2026-08-20 —
 * `context_management` là null, không trường nào mang trần), và model id của phiên 1M với phiên
 * 200k là CÙNG MỘT CHUỖI `claude-opus-5`. Đoán theo tên vì thế luôn sai một nửa số ca.
 *
 * Bằng chứng đáng tin duy nhất là SỐ ĐÃ ĐO: một phiên không thể dùng quá cửa sổ của chính nó,
 * nên thấy 730k token tức cửa sổ ít nhất phải là bậc chứa nổi 730k. Đo trên máy này cùng ngày:
 * 5/6 phiên gần nhất đã vượt 200k với đúng model id đó ⇒ phỏng đoán 200k sai với thực tế máy,
 * và cái giá là hook hét "~95%" ở 190k trong khi phiên mới dùng 19% — agent đọc xong đi chốt sổ
 * sớm hơn cần thiết.
 */
export interface WindowMemory {
  /** model id (chữ thường) → cửa sổ lớn nhất đã CHỨNG MINH được bằng số đo. */
  get(model: string): number | undefined;
  /** Ghi lại một trần vừa chứng minh được; nơi gọi tự lo phần bền hoá. */
  learn(model: string, window: number): void;
}

/**
 * Cửa sổ context, ưu tiên BẰNG CHỨNG hơn phỏng đoán. Không biết ⇒ null (thà im còn hơn hét bậy).
 *
 * Thứ tự: ① hậu tố tường minh `[1m]`/`-1m` → tin ngay · ② trần đã HỌC cho model đó (số đo của
 * phiên trước) · ③ mới tới phỏng đoán theo tên. Cuối cùng vẫn tự sửa bằng `observed` của lượt
 * này — và khi phải tự sửa thì GHI LẠI, để phiên sau không trả giá cùng một cảnh báo sai.
 */
export function windowFor(model: string | undefined, observed = 0, memory?: WindowMemory): number | null {
  if (!model) return null;
  const m = model.toLowerCase();
  let base: number | null = null;
  // Hậu tố `[1m]`/`-1m` (khi có) là khai báo tường minh — tin ngay.
  if (m.includes("[1m]") || m.includes("-1m")) base = 1_000_000;
  else {
    // Trần đã chứng minh ở phiên trước THẮNG phỏng đoán theo tên: nó là số đo, tên chỉ là nhãn.
    const learned = memory?.get(m);
    if (learned) base = learned;
    else if (m.includes("claude")) base = 200_000;
  }
  if (base === null) return null;
  // Tự sửa: nâng lên bậc đầu tiên chứa nổi số đã đo. Vượt cả bậc cao nhất ⇒ số này không
  // đáng tin (transcript lạ / cách tính khác) ⇒ trả null để hook IM, không hét bậy.
  if (observed > base) {
    const fit = TIERS.find((t) => t >= observed);
    if (fit) memory?.learn(m, fit); // nhớ lại, để dải 190k–200k của phiên SAU không bị hét oan
    return fit ?? null;
  }
  return base;
}

/**
 * Thời điểm lần NÉN gần nhất ĐÃ THỰC SỰ xảy ra trong transcript (ms), 0 nếu chưa lần nào.
 *
 * Bằng chứng là bản ghi `{"type":"system","subtype":"compact_boundary","compactMetadata":{…}}`
 * do chính host ghi SAU KHI nén xong — đo trên máy này: 30 bản ghi như vậy, mang cả
 * `trigger` (auto/manual) lẫn `preTokens`.
 *
 * Vì sao cần đúng thứ này thay vì "hook PreCompact đã nổ": user BẤM NHẦM `/compact` rồi huỷ
 * ngay — hook đã chạy nhưng nén KHÔNG xảy ra. Lấy sự kiện làm mốc thì mọi lần bấm nhầm đều
 * bị tính là một chu kỳ mới; lấy dấu vết trong transcript thì chỉ lần nén THẬT mới tính.
 */
export function lastCompactAt(transcriptPath: string): number {
  let fd: number;
  try {
    fd = openSync(transcriptPath, "r");
  } catch {
    return 0;
  }
  try {
    const size = fstatSync(fd).size;
    // Nén để lại bản ghi rồi cuộc trò chuyện chạy tiếp, nên mốc có thể đã lùi khá xa cuối
    // file — đọc rộng hơn cửa sổ đo usage, nhưng vẫn không đọc cả file (transcript hàng chục MB).
    const span = Math.min(size, 4 * 1024 * 1024);
    const buf = Buffer.alloc(span);
    readSync(fd, buf, 0, span, size - span);
    let newest = 0;
    for (const line of buf.toString("utf8").split("\n")) {
      if (!line.includes("compact_boundary")) continue;
      try {
        const rec = JSON.parse(line);
        // Chỉ nhận bản ghi THẬT: chuỗi "compact_boundary" cũng xuất hiện trong nội dung chat
        // (đã dính đúng bẫy này khi đo — phiên đang bàn về compact bị đếm thành lần nén).
        if (rec?.type !== "system" || rec?.subtype !== "compact_boundary" || !rec?.compactMetadata) continue;
        const t = Date.parse(rec.timestamp ?? "");
        if (Number.isFinite(t) && t > newest) newest = t;
      } catch {
        /* dòng cụt ở đầu lát cắt */
      }
    }
    return newest;
  } catch {
    return 0;
  } finally {
    closeSync(fd);
  }
}

export interface ContextUsage {
  /** Token đang chiếm cửa sổ = cache_read + cache_creation + input (không tính output). */
  tokens: number;
  model?: string;
  window: number | null;
  /** null khi không biết cửa sổ của model. */
  percent: number | null;
}

/**
 * Bộ nhớ trần cửa sổ, bền qua các phiên — một tệp JSON nhỏ cạnh kho.
 *
 * Đặt cạnh kho (không phải ổ hệ thống) theo HP điều 14, và cố ý để RỜI khỏi `global_memory.db`:
 * đây là quan sát về MÔI TRƯỜNG CHẠY, không phải dữ liệu bộ nhớ — nhét vào kho là làm bẩn thứ
 * phải đồng bộ xuyên máy bằng một con số chỉ đúng cho máy này.
 *
 * FAIL-OPEN tuyệt đối (điều 9): đọc/ghi hỏng thì coi như chưa học được gì, hook vẫn chạy như cũ.
 * Không bao giờ để một tệp mốc hỏng làm chết đường capture.
 */
export function windowMemoryAt(dir?: string): WindowMemory {
  const file = (): string | null => {
    try {
      return join(dir ?? currentMemoryDir(), "context-guard", "observed-window.json");
    } catch {
      return null; // chưa có kho (máy trắng) — không học, không hỏng
    }
  };
  const read = (): Record<string, number> => {
    const f = file();
    if (!f || !existsSync(f)) return {};
    try {
      const j: unknown = JSON.parse(readFileSync(f, "utf8"));
      return j && typeof j === "object" ? (j as Record<string, number>) : {};
    } catch {
      return {};
    }
  };
  return {
    get(model) {
      const v = read()[model];
      return typeof v === "number" && v > 0 ? v : undefined;
    },
    learn(model, window) {
      const f = file();
      if (!f) return;
      try {
        const all = read();
        // CHỈ đi lên: một phiên chứng minh được 1M thì phiên sau thấy 200k không xoá bằng chứng đó.
        if ((all[model] ?? 0) >= window) return;
        all[model] = window;
        mkdirSync(dirname(f), { recursive: true });
        writeFileSync(f, JSON.stringify(all, null, 2));
      } catch {
        // ghi không được thì thôi — mốc là tiện nghi, không phải điều kiện để hook chạy
      }
    },
  };
}
/**
 * Đọc mức context từ ĐUÔI transcript. Đọc ngược 256 KB cuối chứ không đọc cả file: transcript
 * phiên dài tới hàng chục MB, mà số cần lấy luôn nằm ở bản ghi assistant gần nhất.
 */
export function readContextUsage(transcriptPath: string, memory: WindowMemory = windowMemoryAt()): ContextUsage | null {
  let fd: number;
  try {
    fd = openSync(transcriptPath, "r");
  } catch {
    return null;
  }
  try {
    const size = fstatSync(fd).size;
    const span = Math.min(size, 256 * 1024);
    const buf = Buffer.alloc(span);
    readSync(fd, buf, 0, span, size - span);
    const lines = buf.toString("utf8").split("\n");
    // Duyệt NGƯỢC: bản ghi assistant cuối cùng có `usage` là ảnh chụp mới nhất của cửa sổ.
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line.startsWith("{") || !line.includes('"usage"')) continue;
      let rec: any;
      try {
        rec = JSON.parse(line);
      } catch {
        continue; // dòng đầu của lát cắt có thể bị cụt — bỏ qua, không đoán
      }
      const u = rec?.message?.usage ?? rec?.usage;
      if (!u) continue;
      const tokens =
        (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
      if (!tokens) continue;
      const model: string | undefined = rec?.message?.model ?? rec?.model;
      const window = windowFor(model, tokens, memory);
      return { tokens, model, window, percent: window ? (100 * tokens) / window : null };
    }
    return null;
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}
