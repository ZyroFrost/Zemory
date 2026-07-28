// Claude Code adapter. Transcripts: ~/.claude/projects/<proj>/<id>.jsonl
// (append-mode jsonl). Each line is one record; user/assistant carry messages.

import { basename, join } from "node:path";
import { imageAttachment, imageLabel, isDir, safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedAttachment, ParsedLine, TranscriptFile } from "./types.js";

export const claudeAdapter: Adapter = {
  source: "claude-code",
  mode: "append",
  signature: join(".claude", "projects"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const proj of safeReaddir(storeRoot)) {
      const projPath = join(storeRoot, proj);
      if (!isDir(projPath)) continue;
      for (const f of safeReaddir(projPath)) {
        if (!f.endsWith(".jsonl")) continue;
        const t = toTranscript("claude-code", join(projPath, f));
        if (t) out.push(t);
      }
    }
    return out;
  },

  sessionId(filePath: string): string {
    return basename(filePath).replace(/\.[^.]+$/, "");
  },

  parseLine(line: string): ParsedLine {
    const trimmed = line.trim();
    if (!trimmed) return { kind: "skip" };
    let o: any;
    try {
      o = JSON.parse(trimmed);
    } catch {
      return { kind: "skip" };
    }

    // User-set session name (Claude Code `/title`) — WINS over the AI-generated
    // title. Stored as its own record: {type:"custom-title", customTitle:"..."}.
    if (o.type === "custom-title" && typeof o.customTitle === "string" && o.customTitle.trim()) {
      return { kind: "title", title: o.customTitle.trim(), custom: true };
    }
    if (o.type === "ai-title" && typeof o.aiTitle === "string") {
      return { kind: "title", title: o.aiTitle };
    }
    // FILE NGƯỜI DÙNG KÉO VÀO CHAT — record riêng ở cấp dòng (KHÔNG nằm trong
    // `message.content`, nên `flatten()` không bao giờ thấy). Transcript chở luôn nội dung
    // đầy đủ ở `attachment.content.file.content`.
    //
    // Chỉ nhận `type:"file"`. Các loại `attachment` khác là metadata NỘI BỘ của Claude Code
    // (`todo_reminder` 3.838 · `queued_command` 520 · `deferred_tools_delta` · `skill_listing`…)
    // — nạp vào là rác. Cũng KHÔNG nạp `edited_text_file` (chỉ là snippet có đánh số dòng của
    // file đã nằm trong repo) và KHÔNG đụng `~/.claude/file-history/` (5.009 file · 211 MB
    // snapshot của chính code trong repo ⇒ dựng kho thứ hai, trái điều 3, phình DB +35,7%).
    // Đo 2026-07-26: loại này chỉ 62 file · 0,2 MB — rẻ, mà là dữ liệu KHÔNG có ở đâu khác.
    if (o.type === "attachment") {
      const a = o.attachment;
      const body = a?.type === "file" ? a?.content?.file?.content : undefined;
      if (typeof body !== "string" || !body.trim()) return { kind: "skip" };
      const name = typeof a.filename === "string" ? a.filename : (a?.content?.file?.filePath ?? "(file)");
      return {
        kind: "message",
        msg: {
          uuid: o.uuid ?? null,
          role: "user", // file do NGƯỜI dùng kéo vào — thuộc lượt user
          content: `[file:${name}]\n${body}`,
          toolName: "attachment",
          timestamp: o.timestamp ?? null,
        },
      };
    }
    if (o.type === "user" || o.type === "assistant") {
      const m = o.message ?? {};
      rememberToolPaths(m.content);
      const { text, attachments } = flatten(m.content);
      // ẢNH DO TOOL `Read` TRẢ VỀ — nằm ở `toolUseResult.file.base64`, NGOÀI
      // `message.content`, nên `flatten()` không bao giờ thấy (đúng bẫy "hai đường ghi" đã
      // dính với record `attachment`). Đo 2026-07-28: 166 ảnh chỉ tồn tại ở đường này.
      // Đây cũng là chỗ DUY NHẤT có TÊN GỐC thật: ghép `tool_use_id` ngược về `file_path`
      // của lời gọi tool — đo được 166/166 = 100% ghép trúng.
      const viaTool = toolResultImage(o);
      if (viaTool) {
        attachments.push(viaTool);
        return {
          kind: "message",
          msg: {
            uuid: o.uuid ?? null,
            role: m.role ?? o.type,
            content: `${text ? text + "\n" : ""}${imageLabel(viaTool)}`,
            toolName: firstTool(m.content) ?? "read-image",
            timestamp: o.timestamp ?? null,
            attachments,
          },
        };
      }
      if (!text) return o.cwd ? { kind: "meta", cwd: o.cwd } : { kind: "skip" };
      return {
        kind: "message",
        msg: {
          uuid: o.uuid ?? null,
          role: m.role ?? o.type,
          content: text,
          toolName: firstTool(m.content),
          timestamp: o.timestamp ?? null,
          ...(attachments.length ? { attachments } : {}),
        },
      };
    }
    if (o.cwd) return { kind: "meta", cwd: o.cwd };
    return { kind: "skip" };
  },
};

// Ngưỡng lưu nhị phân + bộ đọc block ảnh nay dùng CHUNG ở `_shared.ts` (`MAX_BLOB_BYTES`,
// `imageAttachment`, `imageLabel`): trước đây chỉ file này biết đọc ảnh, nên 4 adapter còn
// lại bỏ im lặng mọi block không phải text. Một định nghĩa — nhân bản parser là cách chắc
// chắn để hai bản lệch nhau (bài học F1 "nguồn trùng").
// Đo trên corpus thật 2026-07-28: 1.245 ảnh, p90 182 KB, max 1,28 MB, tổng 93 MB ⇒ trần
// 8 MB rộng rãi, gần như không ai chạm.

/**
 * `tool_use_id` → đường dẫn file của lời gọi tool, để ảnh do `Read` trả về lấy lại được
 * TÊN GỐC. Hợp đồng `parseLine` không có hook theo-file nên bảng này ở cấp module; id của
 * Anthropic (`toolu_…`) là duy nhất toàn cục nên không sợ đụng giữa các file.
 * CÓ TRẦN: một lần quét đi qua hàng trăm transcript, không chặn thì bảng phình vô hạn
 * trong daemon chạy dài. Quá trần thì bỏ nửa cũ — mất tên là mất một tiện ích, không phải
 * mất dữ liệu (ảnh vẫn vào, chỉ rơi về tên dự phòng).
 */
const TOOL_PATH_CAP = 5000;
const toolPaths = new Map<string, string>();

function rememberToolPaths(content: unknown): void {
  if (!Array.isArray(content)) return;
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    const blk = b as any;
    if (blk.type !== "tool_use" || typeof blk.id !== "string") continue;
    const inp = blk.input ?? {};
    const p = inp.file_path ?? inp.path ?? inp.notebook_path;
    if (typeof p !== "string" || !p) continue;
    if (toolPaths.size >= TOOL_PATH_CAP) {
      for (const k of [...toolPaths.keys()].slice(0, Math.floor(TOOL_PATH_CAP / 2))) toolPaths.delete(k);
    }
    toolPaths.set(blk.id, p);
  }
}

/** Ảnh nằm ở `toolUseResult.file.base64` (kết quả `Read` một file ảnh), kèm tên gốc. */
function toolResultImage(rec: any): ParsedAttachment | null {
  const file = rec?.toolUseResult?.file;
  if (!file || typeof file !== "object" || typeof file.base64 !== "string" || !file.base64) return null;
  const a = imageAttachment({ type: "image", source: { type: "base64", media_type: file.type, data: file.base64 } });
  if (!a) return null;
  const tid =
    (typeof rec.tool_use_id === "string" && rec.tool_use_id) ||
    (Array.isArray(rec?.message?.content) ? rec.message.content.find((b: any) => b?.tool_use_id)?.tool_use_id : null);
  const p = tid ? toolPaths.get(tid) : undefined;
  if (p) {
    a.srcPath = p;
    a.name = basename(p);
  }
  return a;
}

function flatten(content: unknown): { text: string; attachments: ParsedAttachment[] } {
  if (content == null) return { text: "", attachments: [] };
  if (typeof content === "string") return { text: content.trim(), attachments: [] };
  if (!Array.isArray(content)) return { text: "", attachments: [] };
  const parts: string[] = [];
  const attachments: ParsedAttachment[] = [];
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    const block = b as any;
    switch (block.type) {
      case "text":
        if (typeof block.text === "string") parts.push(block.text);
        break;
      case "tool_use":
        parts.push(`[tool_use:${block.name}] ${JSON.stringify(block.input ?? {})}`);
        break;
      case "tool_result":
        parts.push(`[tool_result] ${resultText(block.content)}`);
        break;
      case "image": {
        // Đo 2026-07-28: 1.245 block ảnh / 93 MB nằm trong transcript, và nhánh này
        // TRƯỚC ĐÂY KHÔNG TỒN TẠI ⇒ toàn bộ bị bỏ im lặng ở khâu nạp. Nay tách sang
        // `attachments`, chỉ để lại MỘT DÒNG NHÃN trong text: base64 mà vào `content`
        // là thổi FTS5 lên mà không tìm được gì (bài học v16/v17).
        const a = imageAttachment(block);
        if (a) {
          attachments.push(a);
          parts.push(imageLabel(a));
        }
        break;
      }
      // 'thinking' intentionally skipped: large, internal, noisy.
    }
  }
  return { text: parts.join("\n").trim(), attachments };
}

function firstTool(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  for (const b of content) {
    if (b && typeof b === "object" && (b as any).type === "tool_use") return (b as any).name ?? null;
  }
  return null;
}

function resultText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((b) => (b && typeof b === "object" && (b as any).type === "text" ? (b as any).text : ""))
      .join("\n");
  }
  return c == null ? "" : JSON.stringify(c);
}
