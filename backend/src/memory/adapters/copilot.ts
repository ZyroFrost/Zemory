// GitHub Copilot (github.com/copilot) web adapter — lane `copilot-web`, origin=web. **KHAI DANH, CHƯA PARSE.**
//
// Vì sao một adapter chưa đọc được gì vẫn đáng tồn tại: cây Nguồn dựng danh sách nền từ
// `allAdapters()` (xem `memory/scope.ts` khối "BỘ CHUẨN"), nên một nguồn chưa đăng ký là VÔ HÌNH
// trên UI — kể cả sau khi người dùng đã đăng nhập xong. Đó đúng là vòng luẩn quẩn mà khối đó ghi:
// muốn có dữ liệu thì phải quét, muốn quét thì phải thấy nền tồn tại đã.
//
// Đo 2026-09-10: chưa dò được API lịch sử vì profile dò chưa có phiên GitHub. Nguồn LOCAL cũng chưa
// dùng được — Copilot Chat của VS Code có 46 phiên \`.jsonl\` trên máy này nhưng \`requests[]\` RỖNG cả 46
// (58 KB toàn metadata). Nếu một máy có chat thật thì đường ĐĨA đó tốt hơn cả web: xem \`plan/07 §17.3\`.
//
// Khi đường kéo mở (dò `listExpr`/`convExpr` trên một phiên đã đăng nhập — `plan/07 §17.5`), chỉ
// việc điền `parseFileMulti` ở đây theo hình dạng ĐO ĐƯỢC. Tới lúc đó nó trả `null`: không có
// định dạng nào được đo thì đoán một hình dạng là tự dựng một parser nói dối.

import { basename, join } from "node:path";
import { readFileSync } from "node:fs";
import { safeReaddir, toTranscript } from "./_shared.js";
import type { Adapter, ParsedMessage, ParsedSessionMulti, TranscriptFile } from "./types.js";

/**
 * 🔄 **CẬP NHẬT 2026-09-12 — đường kéo ĐÃ MỞ, nhưng hình dạng một hội thoại VẪN CHƯA ĐO ĐƯỢC.**
 *
 * Đo được (xem `COPILOT_TOKEN` trong `memory/scanweb.ts`): token qua
 * `POST /github-copilot/chat/token` (cần `GitHub-Verified-Fetch` + `Accept: json`), rồi
 * `GET api.individual.githubcopilot.com/github/chat/threads` với scheme **`GitHub-Bearer`**.
 * Chưa đo được: NỘI DUNG một thread — tài khoản trả `{threads: []}` ở cả hai lượt đo (09-11, 09-12).
 *
 * Vì vậy `parseFileMulti` ở đây **chỉ nhận những gì nó NHẬN RA**, theo đúng thứ tự:
 *   ① `raw.messages[]` hoặc `raw` là mảng tin · mỗi tin cần **vai** (`role`/`author`) và **chữ**
 *      (`content` chuỗi, hoặc `content[].text`).
 *   ② Không khớp ⇒ **trả `null`** = "không đọc được file này". `ingestFile` hiểu đúng nghĩa đó: bỏ
 *      qua, KHÔNG ghi `ingest_state`, nên khi parser thật xong thì lượt quét sau nạp lại đủ.
 * Đây là chỗ phân biệt giữa *chưa biết* và *đoán bừa*: đoán một hình dạng rồi nhét vào kho là làm
 * hỏng thứ đắt nhất của hệ (HP điều 15), còn trả `null` thì chỉ mất một lượt quét.
 */
interface CopilotBlock {
  type?: string;
  text?: string;
}
interface CopilotMsg {
  id?: string;
  role?: string;
  author?: string | { role?: string; login?: string };
  content?: string | CopilotBlock[];
  text?: string;
  createdAt?: string;
  created_at?: string;
}

/** Vai của một tin, quy về bộ chuẩn. Không nhận ra ⇒ `null` (người gọi bỏ tin đó). */
function roleOf(m: CopilotMsg): string | null {
  const raw =
    typeof m.role === "string"
      ? m.role
      : typeof m.author === "string"
        ? m.author
        : typeof m.author === "object" && typeof m.author?.role === "string"
          ? m.author.role
          : null;
  if (!raw) return null;
  const r = raw.toLowerCase();
  if (r === "user" || r === "human") return "user";
  if (r === "assistant" || r === "model" || r === "bot" || r === "copilot") return "assistant";
  if (r === "system") return "system";
  return null;
}

/** Chữ của một tin: `content` chuỗi → `content[].text` → `text`. Rỗng ⇒ "" (bỏ tin). */
function textOf(m: CopilotMsg): string {
  if (typeof m.content === "string" && m.content.trim()) return m.content.trim();
  if (Array.isArray(m.content)) {
    const parts = m.content.filter((b) => b && typeof b.text === "string" && b.text.trim()).map((b) => b.text as string);
    if (parts.length) return parts.join("\n").trim();
  }
  return typeof m.text === "string" ? m.text.trim() : "";
}

export const copilotAdapter: Adapter = {
  source: "copilot-web",
  origin: "web",
  mode: "whole",
  signature: join(".zemory", "imports", "copilot"),

  enumerate(storeRoot: string): TranscriptFile[] {
    const out: TranscriptFile[] = [];
    for (const f of safeReaddir(storeRoot)) {
      if (!f.endsWith(".json")) continue;
      if (f.startsWith("_")) continue; // sidecar (`_pulled.json`…), không phải transcript
      const t = toTranscript("copilot-web", join(storeRoot, f));
      if (t) out.push(t);
    }
    return out;
  },

  /** Khoá phiên theo TÊN FILE — ổn định và không cần parse (cùng lối `cowork`). */
  sessionId(filePath: string): string {
    return "copilot-file-" + basename(filePath).replace(/.[^.]+$/, "");
  },

  // Hợp đồng: `whole` + `parseFileMulti` (một file nhiều phiên — `plan/07 §9`), y như các adapter
  // web kia. Tiền tố phiên là `copilotweb-` — khai sẵn ở `PLATFORMS.copilot.sessionPrefix`, và
  // `scanweb-platforms.test` so hai giá trị đó nên chúng không thể lệch nhau.
  parseFileMulti(filePath: string): ParsedSessionMulti[] | null {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return null;
    }
    const items: { threadId?: string; from?: string; raw?: unknown; title?: string }[] = Array.isArray(data)
      ? (data as { threadId?: string; raw?: unknown }[])
      : [data as { threadId?: string; raw?: unknown }];

    const out: ParsedSessionMulti[] = [];
    for (const it of items) {
      if (!it || typeof it !== "object") continue;
      const raw = it.raw;
      // Chỉ hai hình dạng được NHẬN: mảng tin trần, hoặc `{messages:[…]}`. Bất kỳ hình dạng nào
      // khác ⇒ bỏ qua hội thoại đó (không đoán) — xem khối chú thích ở đầu file.
      const arr: CopilotMsg[] = Array.isArray(raw)
        ? (raw as CopilotMsg[])
        : Array.isArray((raw as { messages?: unknown })?.messages)
          ? ((raw as { messages: CopilotMsg[] }).messages)
          : [];
      const messages: ParsedMessage[] = [];
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        if (!m || typeof m !== "object") continue;
        const role = roleOf(m);
        const content = textOf(m);
        if (!role || !content) continue;
        messages.push({
          uuid: typeof m.id === "string" && m.id ? m.id : null,
          role,
          content,
          toolName: null,
          timestamp: m.createdAt ?? m.created_at ?? null,
        });
      }
      if (!messages.length) continue;
      const tid = typeof it.threadId === "string" && it.threadId ? it.threadId : String(out.length);
      out.push({ sessionId: `copilotweb-${tid}`, title: it.title?.trim() || undefined, messages });
    }
    return out.length ? out : null;
  },
};
