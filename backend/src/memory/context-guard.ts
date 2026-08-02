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

import { closeSync, fstatSync, openSync, readSync } from "node:fs";

/** Các bậc cửa sổ đã biết, tăng dần — dùng cho phép tự sửa ở `windowFor`. */
const TIERS = [200_000, 1_000_000];

/**
 * Cửa sổ context theo model id, có TỰ SỬA theo số đo. Không biết ⇒ null (thà im còn hơn
 * cảnh báo sai).
 *
 * Vì sao cần `observed`: transcript ghi model id của API (`claude-opus-5`) chứ KHÔNG ghi
 * biến thể cửa sổ — phiên 1M và phiên 200k để lại đúng một chuỗi như nhau. Đoán theo tên là
 * sai: đo trên phiên thật 2026-08-02 ra **"Context ~295%"** (590.191 token chia cho 200k).
 * Con số vượt 100% chính là bằng chứng giả định sai, nên dùng luôn nó để sửa: một phiên
 * KHÔNG THỂ dùng quá cửa sổ của chính nó, vậy cửa sổ thật phải là bậc cao hơn.
 */
export function windowFor(model: string | undefined, observed = 0): number | null {
  if (!model) return null;
  const m = model.toLowerCase();
  let base: number | null = null;
  // Hậu tố `[1m]`/`-1m` (khi có) là khai báo tường minh — tin ngay.
  if (m.includes("[1m]") || m.includes("-1m")) base = 1_000_000;
  else if (m.includes("claude")) base = 200_000;
  if (base === null) return null;
  // Tự sửa: nâng lên bậc đầu tiên chứa nổi số đã đo. Vượt cả bậc cao nhất ⇒ số này không
  // đáng tin (transcript lạ / cách tính khác) ⇒ trả null để hook IM, không hét bậy.
  if (observed > base) {
    const fit = TIERS.find((t) => t >= observed);
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
 * Đọc mức context từ ĐUÔI transcript. Đọc ngược 256 KB cuối chứ không đọc cả file: transcript
 * phiên dài tới hàng chục MB, mà số cần lấy luôn nằm ở bản ghi assistant gần nhất.
 */
export function readContextUsage(transcriptPath: string): ContextUsage | null {
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
      const window = windowFor(model, tokens);
      return { tokens, model, window, percent: window ? (100 * tokens) / window : null };
    }
    return null;
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}
