// Small filesystem + text helpers shared by adapters.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { TranscriptFile } from "./types.js";

// GỠ 2026-07-26: `clip()` từng cắt cụt mọi block > 4.000 ký tự.
//
// Vì sao gỡ: `plan/06 §6` khai lớp `messages` là lớp **ĐẦY** ("digest (mỏng) → anchor →
// messages (đầy)"), digest mới là lớp lọc. Nhưng clip() cắt thẳng vào lớp đầy, và cắt MÙ —
// không phân biệt trùng / rác / secret, chỉ xét độ dài. Bốn tầng lọc còn lại đều CÓ LÝ DO và
// được giữ: dedup `UNIQUE(session_id,uuid)` · `redact()` · bỏ dòng rỗng/không-parse-được ·
// bỏ `thinking` (nguồn vốn rỗng, xem 05_TODO).
//
// Đo trước khi gỡ (374 transcript · 83.337 block · 92,7 MB): **95,25% block < 4k**, chỉ
// **4,75% bị cắt**, block lớn nhất **1,30 MB** — không có ca bệnh lý nào ⇒ bỏ cap an toàn.
// Mất mát đang gánh: **16,8% khối lượng lớp full**.
//
// Rủi ro còn lại (ghi rõ, không giấu): giờ KHÔNG còn trần nào. Một lần paste/tool-dump khổng
// lồ sẽ vào DB nguyên vẹn. Chấp nhận có chủ đích — "đầy" là yêu cầu của chuẩn; muốn chặn ca
// bệnh lý thì thêm trần CAO (vd 8 MB) chứ đừng quay lại cắt ở 4k.

export function safeReaddir(p: string): string[] {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

export function safeStat(p: string) {
  try {
    return statSync(p);
  } catch {
    return undefined;
  }
}

export function isDir(p: string): boolean {
  return safeStat(p)?.isDirectory() ?? false;
}

export function toTranscript(source: string, path: string): TranscriptFile | null {
  const st = safeStat(path);
  if (!st || !st.isFile()) return null;
  return { source, path, size: st.size, mtimeMs: Math.floor(st.mtimeMs) };
}

/** Recursively collect files matching `ext` (without dot), up to `depth` levels. */
export function walkFiles(root: string, ext: string, depth = 6): string[] {
  const out: string[] = [];
  const suffix = "." + ext;
  const rec = (dir: string, left: number): void => {
    for (const name of safeReaddir(dir)) {
      const p = join(dir, name);
      const st = safeStat(p);
      if (!st) continue;
      if (st.isDirectory()) {
        if (left > 0) rec(p, left - 1);
      } else if (name.endsWith(suffix)) {
        out.push(p);
      }
    }
  };
  rec(root, depth);
  return out;
}

/** Decode a file:// URI (Continue's workspaceDirectory) to a native path. */
export function decodeFileUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  if (!uri.startsWith("file://")) return uri;
  let p = decodeURIComponent(uri.replace(/^file:\/\//, ""));
  // "/d:/x" -> "d:\x" on Windows-style drive paths
  const m = p.match(/^\/([a-zA-Z]):\/(.*)$/);
  if (m) p = `${m[1]}:\\${m[2].replace(/\//g, "\\")}`;
  return p;
}
