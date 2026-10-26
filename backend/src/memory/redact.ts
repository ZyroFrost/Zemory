// Scrub obvious secrets before they land in the memory. Transcripts can contain
// API keys / tokens pasted into prompts or printed by tools; we replace known
// credential shapes with [REDACTED] at ingest. Local-only DB, but defense in
// depth: the memory shouldn't become the one file that leaks every key.
// (Pattern set mirrors agentmemory's; conservative — known prefixes only.)

import { currentMemoryDb, openMemory } from "./db.js";

const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "anthropic", re: /sk-ant-[A-Za-z0-9-]{20,}/g },
  { name: "openai", re: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { name: "aws-key-id", re: /AKIA[0-9A-Z]{16}/g },
  { name: "github", re: /gh[pousr]_[A-Za-z0-9]{20,}/g },
  { name: "google", re: /AIza[0-9A-Za-z\-_]{35}/g },
  { name: "slack", re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: "jwt", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  // Shape-based (not prefix): each regex matches ONLY the secret span so the
  // uniform [REDACTED] replacement keeps surrounding structure readable.
  { name: "pem", re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g },
  { name: "bearer", re: /(?<=\b[Bb]earer\s)[A-Za-z0-9._~+/=-]{20,}/g },
  { name: "url-userinfo", re: /(?<=:\/\/)[^\s:@/]+:[^\s:@/]+(?=@[^\s/]+)/g },
  {
    name: "quoted-assignment",
    re: /(?<=\b(?:password|passwd|pwd|api[_-]?key|secret|access[_-]?token|client[_-]?secret|private[_-]?key)["']?\s*[:=]\s*["'])[^"'\n]{6,}(?=["'])/gi,
  },
  // Unquoted `KEY=value`: a .env line, or `PWD=...;` inside an ODBC connection string. Measured 2026-10-26: four real
  // passwords and a client secret sat in both machines' stores because only the quoted form was caught. No word
  // boundary in front, so FABI_WEBHOOK_SECRET / CLIENT_SECRET match; one line only ([ \t], never \s), so an empty
  // `SECRET=` never swallows the next line. Skipped: `==`, `${VAR}` / `$VAR`, `%VAR%`, `@param`, a comment, an already
  // [REDACTED] value, and code: a call or index (`os.getenv(`, `environ[`), a dotted name (`args.password`), a format
  // field (`{pwd}`), a path (`PWD=/home/...`), true/false/none/null. Measured on the real store 2026-10-26: without
  // the code exclusions 1002 messages matched, mostly code; with them 382, nearly all real values or placeholders.
  // A hand-made placeholder `<...>` is replaced too, so a copy masked by hand and a copy masked here end up the same
  // text on every machine. The value stops at a quote or backslash, so JSON columns stay valid.
  {
    name: "unquoted-assignment",
    re: /(?<=(?:password|passwd|pwd|secret|secret[_-]?key|api[_-]?key|access[_-]?token|private[_-]?key)[ \t]*=[ \t]*)(?:<[^<>\s;'"\\]{1,40}>|(?![=$%@#[<{|`/(]|(?:true|false|none|null)\b)(?![A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+(?:[\s;'"\\,&)}\]]|$))[^\s;'"\\,&()[\]{}|`]{4,}(?=[\s;'"\\,&)}\]]|$))/gi,
  },
];

/** Replace credential-shaped substrings with [REDACTED]. */
export function redact(text: string): string {
  if (!text) return text;
  let out = text;
  for (const { re } of PATTERNS) out = out.replace(re, "[REDACTED]");
  return out;
}

/** The names of the patterns that would change `text` (for the dry run's per-pattern count). */
export function redactHits(text: string): string[] {
  if (!text) return [];
  const hits: string[] = [];
  let out = text;
  for (const { name, re } of PATTERNS) {
    const next = out.replace(re, "[REDACTED]");
    if (next !== out) hits.push(name);
    out = next;
  }
  return hits;
}

// ── QUÉT CHIỀU VÀO: ký tự ẨN dùng để giấu chỉ dẫn ──────────────────────────────
//
// `redact` ở trên bảo vệ chiều RA (đừng để secret lọt vào bộ nhớ). Đây là chiều
// NGƯỢC LẠI: nội dung độc hại lọt VÀO bộ nhớ rồi nổi lên ở lượt recall sau và được
// agent đọc như ngữ cảnh — tấn công "memory poisoning". Bề mặt này rộng ra từ
// 2026-07-27 khi lớp cắt bị gỡ để khôi phục lớp full: `tool_result` (gồm cả nội dung
// file agent đọc) nay vào bộ nhớ nguyên vẹn.
//
// CỐ Ý CHỈ BẮT KÝ TỰ, KHÔNG BẮT CỤM TỪ. Đã đo trên 173.201 tin thật (2026-07-27):
//   · "ignore previous instructions" · "new instructions:" · "you are now a"  → **0 hit**
//   · U+202E/U+202D (đảo chiều) · U+2066–2069 (isolate)                       → **0 hit**
//   · U+FEFF (BOM)  → 32 hit, **100% hợp lệ** (dấu BOM trong file nguồn)
//   · U+200B        → 11 hit, **100% hợp lệ** (copy từ web, công thức toán)
//   · "system prompt" → 201 hit, toàn là bàn luận bình thường
// Nghĩa là mọi tín hiệu KHÁC 0 đều báo oan, còn tín hiệu ĐÚNG thì bằng 0. Bắt cụm từ
// sẽ nổ trên chính kho tài liệu bàn về prompt injection (kể cả phiên này). Nên chỉ giữ
// nhóm ký tự KHÔNG có công dụng hợp lệ nào ⇒ nhiễu bằng 0 theo cấu tạo, và nếu một
// ngày nó kêu thì đáng đi xem thật.
//
// KHÔNG SỬA, KHÔNG CHẶN — chỉ báo. Điều 3: lớp full là nguồn, không được đụng vào.
const HIDDEN_CHARS: { code: number; name: string }[] = [
  { code: 0x202d, name: "U+202D LEFT-TO-RIGHT OVERRIDE" },
  { code: 0x202e, name: "U+202E RIGHT-TO-LEFT OVERRIDE" },
  { code: 0x2066, name: "U+2066 LEFT-TO-RIGHT ISOLATE" },
  { code: 0x2067, name: "U+2067 RIGHT-TO-LEFT ISOLATE" },
  { code: 0x2068, name: "U+2068 FIRST STRONG ISOLATE" },
  { code: 0x2069, name: "U+2069 POP DIRECTIONAL ISOLATE" },
];

export interface HiddenCharHit {
  id: number;
  sessionId: string;
  /** Tên ký tự tìm thấy (một tin có thể chứa nhiều loại). */
  chars: string[];
}

/**
 * Tìm tin chứa ký tự điều hướng ẩn. THUẦN ĐỌC — không sửa, không xoá, không chặn.
 * Đây là công cụ soi, không phải bộ lọc: người quyết định là user, không phải zemory.
 */
export function scanHiddenChars(dbPath: string = currentMemoryDb(), limit = 50): HiddenCharHit[] {
  const db = openMemory(dbPath);
  try {
    const where = HIDDEN_CHARS.map((c) => `content LIKE '%'||char(${c.code})||'%'`).join(" OR ");
    const rows = db
      .prepare(`SELECT id, session_id, content FROM messages WHERE ${where} LIMIT ?`)
      .all(limit) as { id: number; session_id: string; content: string }[];
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      chars: HIDDEN_CHARS.filter((c) => r.content.includes(String.fromCharCode(c.code))).map((c) => c.name),
    }));
  } finally {
    db.close();
  }
}
