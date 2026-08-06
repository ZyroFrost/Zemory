// `zemory todo verify` — ĐO LẠI từng mục trong `05_TODO.md` thay vì đọc rồi chép.
//
// Vì sao có file này (user chốt 2026-08-06, sau khi lỗi TÁI DIỄN SUỐT MỘT THÁNG): mỗi mục
// TODO là một **khẳng định về trạng thái** ("chưa làm", "chưa có", "còn thiếu"), mà khẳng
// định thì phải truy được về nguồn kiểm được. `.md` là nguồn của NỘI DUNG, KHÔNG phải nguồn
// của SỰ THẬT HỆ THỐNG. Đọc sổ rồi báo lại y nguyên = báo cáo chưa xác minh — và đo tay
// 2026-08-05 cho thấy **11/58 mục sai (~19%)**.
//
// Luật `02_RULES §Hành xử` đã cấm chuyện đó TỪ TRƯỚC và vẫn hỏng ⇒ thêm chữ là vô nghĩa,
// phải có MÁY canh. Đúng doctrine `structure-sync`: *thứ chặn drift là code, không phải rule
// dễ quên.*
//
// RANH GIỚI CỐ Ý (HP điều 13 — máy dựng, agent kiểm): công cụ này KHÔNG phán "mục này đã
// xong". Nó chỉ trả lời những câu TẤT ĐỊNH — *"cái tên mục này nhắc tới có tồn tại trong
// repo không?"* — rồi in bảng LỆCH. Phần ngữ nghĩa ("tồn tại nghĩa là đã làm xong chưa")
// thuộc về agent/người đọc. Máy đoán ngữ nghĩa thì sẽ đẻ ra một lớp khẳng định chưa xác
// minh MỚI, đúng thứ nó sinh ra để diệt.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, posix, relative, sep } from "node:path";

export type TodoStatus = "open" | "doing" | "done";

export interface TodoRef {
  /** Chuỗi nguyên văn trong backtick. */
  raw: string;
  kind: "file" | "symbol" | "endpoint";
  /** Tìm thấy ở đâu (đường tương đối repo), rỗng nếu không thấy. */
  foundAt: string;
  exists: boolean;
}

export interface TodoItem {
  /** Dòng bắt đầu mục trong `05_TODO.md` (1-based) — để nhảy thẳng tới. */
  line: number;
  status: TodoStatus;
  /** Dòng đầu, cắt ngắn cho bảng. */
  title: string;
  /** Toàn văn mục (gồm dòng nối tiếp) — nguồn để rút ref. */
  body: string;
  refs: TodoRef[];
}

export interface TodoFinding {
  line: number;
  title: string;
  kind: "ref-chet" | "nghi-da-xong" | "code-moi-hon-so";
  detail: string;
}

/** Giây epoch của lần commit cuối chạm `file`; 0 = không tra được (chưa commit / không có git). */
function lastCommitTime(root: string, file: string): number {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", file], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return Number(out) || 0;
  } catch {
    return 0;
  }
}

/**
 * Giây epoch của lần commit cuối chạm TỪNG DÒNG của một file (1-based).
 *
 * Một lệnh `git blame` cho cả file thay vì mỗi dòng một lệnh — 57 mục thì đó là khác biệt
 * giữa "chạy được trong gate" và "không ai bật".
 */
function blameLineTimes(root: string, file: string): Map<number, number> {
  const out = new Map<number, number>();
  let text: string;
  try {
    text = execFileSync("git", ["blame", "--line-porcelain", "--", file], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return out; // không có git / file chưa commit ⇒ bỏ trục thời gian, không bịa
  }
  let line = 0;
  let time = 0;
  for (const ln of text.split(/\r?\n/)) {
    const head = /^[0-9a-f]{7,40}\s+\d+\s+(\d+)/.exec(ln);
    if (head) {
      line = Number(head[1]);
      time = 0;
      continue;
    }
    const at = /^author-time (\d+)$/.exec(ln);
    if (at) time = Number(at[1]);
    if (ln.startsWith("\t") && line) out.set(line, time);
  }
  return out;
}

export interface TodoVerifyReport {
  file: string;
  items: TodoItem[];
  /** Mục có ít nhất một ref kiểm được. */
  checkable: number;
  findings: TodoFinding[];
}

// ── Rút tham chiếu KIỂM ĐƯỢC ────────────────────────────────────────────────
// Chỉ nhận ba khuôn có thể tra tất định. Mọi thứ khác trong backtick (câu lệnh, số đo,
// tên người) cố ý BỎ QUA: bắt bừa thì bảng lệch đầy nhiễu, mà bảng nhiễu thì không ai đọc —
// đúng cách cảnh báo cũ đã chết.
const RE_FILE = /`([A-Za-z0-9_@][A-Za-z0-9_./-]*\.(?:ts|tsx|mjs|cjs|js|py|md|json|toml))`/g;
const RE_SYMBOL = /`([A-Za-z_][A-Za-z0-9_]{3,})\(\)`|`([A-Z][A-Z0-9_]{4,})`/g;
const RE_ENDPOINT = /`(\/[a-z][a-z0-9-]{2,})`/g;

/** Tên file được nhắc kiểu rút gọn (`commands/memory.ts`) ⇒ khớp theo ĐUÔI đường dẫn. */
function findFile(root: string, needle: string): string {
  const want = needle.replace(/\\/g, "/").toLowerCase();
  // `.claude/` và `docs_template/` LÀ nội dung repo (skill, bản mẫu) — bỏ qua chúng thì
  // `SKILL.md`/`conventions.md` bị báo chết oan. `data/` thì bỏ thật: nó là runtime,
  // gitignored, và chứa cache model hàng nghìn file.
  const SKIP = new Set(["node_modules", ".git", "dist", "attic", "data"]);
  let hit = "";
  const walk = (dir: string, depth: number): void => {
    if (hit || depth > 6) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (hit) return;
      if (SKIP.has(name)) continue;
      const abs = join(dir, name);
      let isDir: boolean;
      try {
        isDir = statSync(abs).isDirectory();
      } catch {
        continue;
      }
      if (isDir) {
        walk(abs, depth + 1);
        continue;
      }
      const rel = relative(root, abs).split(sep).join(posix.sep).toLowerCase();
      if (rel === want || rel.endsWith(`/${want}`)) hit = relative(root, abs).split(sep).join(posix.sep);
    }
  };
  walk(root, 0);
  return hit;
}

/** Toàn bộ mã nguồn của repo, gộp một lần — tra ký hiệu/endpoint bằng includes cho rẻ. */
function loadSourceBlob(root: string): { text: string; byFile: Map<string, string> } {
  const byFile = new Map<string, string>();
  const SKIP = new Set(["node_modules", ".git", "dist", "attic", "data", "docs", "docs_visual"]);
  const EXT = new Set([".ts", ".mjs", ".js", ".py", ".json"]);
  const walk = (dir: string, depth: number): void => {
    if (depth > 6) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (SKIP.has(name)) continue;
      const abs = join(dir, name);
      let isDir: boolean;
      try {
        isDir = statSync(abs).isDirectory();
      } catch {
        continue;
      }
      if (isDir) {
        walk(abs, depth + 1);
      } else if (EXT.has(extname(name))) {
        try {
          byFile.set(relative(root, abs).split(sep).join(posix.sep), readFileSync(abs, "utf8"));
        } catch {
          /* file không đọc được thì bỏ, không phải bằng chứng */
        }
      }
    }
  };
  walk(root, 0);
  return { text: [...byFile.values()].join("\n"), byFile };
}

function findInSource(src: { byFile: Map<string, string> }, needle: string): string {
  for (const [file, text] of src.byFile) if (text.includes(needle)) return file;
  return "";
}

/** Tách `05_TODO.md` thành các mục checklist, gom cả dòng nối tiếp thụt lề. */
export function parseTodoItems(md: string): TodoItem[] {
  const lines = md.split(/\r?\n/);
  const items: TodoItem[] = [];
  let cur: TodoItem | null = null;
  const flush = (): void => {
    if (cur) items.push(cur);
    cur = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const m = /^-\s+(?:\[( |~|x)\]|(✅|⏸))\s*(.*)$/.exec(ln);
    if (m) {
      flush();
      const mark = m[1] ?? m[2];
      const status: TodoStatus = mark === "x" || mark === "✅" ? "done" : mark === "~" ? "doing" : "open";
      cur = { line: i + 1, status, title: m[3].slice(0, 110), body: m[3], refs: [] };
      continue;
    }
    // Dòng nối tiếp: thụt lề và KHÔNG mở mục mới.
    if (cur && /^\s+\S/.test(ln)) cur.body += `\n${ln}`;
    else if (cur && ln.trim() === "") continue;
    else if (cur && /^\S/.test(ln)) flush();
  }
  flush();
  return items;
}

/** Những mục đã tự khai là "hoãn" thì không soi — user chốt gác lại, không phải nợ. */
const isDeferred = (it: TodoItem): boolean => it.title.startsWith("⏸") || it.body.includes("HOÃN VÔ THỜI HẠN");

/** Cách nhau dưới 1 ngày thì coi như cùng một đợt sửa — không phải drift. */
const STALE_MARGIN_S = 86_400;
const ymd = (t: number): string => new Date(t * 1000).toISOString().slice(0, 10);

const NEG = /(chưa|CHƯA|không có|KHÔNG có|còn thiếu|0 match|chưa wire|chưa làm|chưa sửa|chưa code)/;

/**
 * Cắt câu trên văn bản markdown.
 *
 * Phải GỠ dấu nhấn (`**`, `*`, `_`) TRƯỚC khi cắt: docs ở đây viết `**Edge id chưa ai TIÊU
 * THỤ.** Mới có phía phát…` — dấu chấm bị `**` chen giữa nên phép cắt "chấm rồi khoảng
 * trắng" không nhận ra, hai câu dính làm một và phủ định của câu trước rỉ sang câu sau.
 * Đó chính là cách bản đầu báo oan `/code-graph`.
 */
export function markdownSentences(body: string): string[] {
  const flat = body.replace(/\*\*/g, "").replace(/(?<!\w)[*_](?!\w)/g, "");
  return flat
    .split(/(?<=[.;:!?])\s+|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function verifyTodo(root: string, todoPath?: string): TodoVerifyReport {
  const file = todoPath ?? join(root, "docs", "agent", "05_TODO.md");
  if (!existsSync(file)) throw new Error(`Không thấy ${file}`);
  const items = parseTodoItems(readFileSync(file, "utf8"));
  const src = loadSourceBlob(root);

  const lineTimes = blameLineTimes(root, relative(root, file).split(sep).join(posix.sep));
  const fileTimeCache = new Map<string, number>();
  const fileCache = new Map<string, string>();
  const symCache = new Map<string, string>();

  for (const it of items) {
    const seen = new Set<string>();
    const push = (raw: string, kind: TodoRef["kind"], foundAt: string): void => {
      if (seen.has(raw)) return;
      seen.add(raw);
      it.refs.push({ raw, kind, foundAt, exists: Boolean(foundAt) });
    };
    for (const m of it.body.matchAll(RE_FILE)) {
      const raw = m[1];
      if (!fileCache.has(raw)) fileCache.set(raw, findFile(root, raw));
      const at = fileCache.get(raw) ?? "";
      if (at && !fileTimeCache.has(at)) fileTimeCache.set(at, lastCommitTime(root, at));
      push(raw, "file", at);
    }
    for (const m of it.body.matchAll(RE_SYMBOL)) {
      const raw = m[1] ?? m[2];
      if (!raw) continue;
      if (!symCache.has(raw)) symCache.set(raw, findInSource(src, raw));
      push(raw, "symbol", symCache.get(raw) ?? "");
    }
    for (const m of it.body.matchAll(RE_ENDPOINT)) {
      const raw = m[1];
      if (!symCache.has(raw)) symCache.set(raw, findInSource(src, `"${raw}"`));
      push(raw, "endpoint", symCache.get(raw) ?? "");
    }
  }

  const findings: TodoFinding[] = [];
  for (const it of items) {
    if (isDeferred(it) || !it.refs.length) continue;

    // Luật ở đây BẤT ĐỐI XỨNG, và phải vậy. Một mục TODO nói về artefact theo hai giọng
    // trái ngược, nên cùng một sự kiện ("có tồn tại") mang ý nghĩa ngược nhau:
    //   · giọng PHỦ ĐỊNH ("`X` chưa wire", "chưa có `X`") ⇒ tồn tại = ĐÁNG NGỜ (sổ thối).
    //   · giọng KHẲNG ĐỊNH ("sửa `X`", "xem `X`")         ⇒ THIẾU  = ĐÁNG NGỜ (trỏ vào hư vô).
    // Bản đầu bỏ qua chiều giọng nên gắn nhãn *"sổ khẳng định có, repo không có"* cho
    // `/session-raw` — trong khi sổ nói rõ nó CHƯA làm. Báo ngược hẳn ý người viết.
    const sentences = markdownSentences(it.body);
    const negated = (raw: string): boolean => sentences.some((s) => s.includes(`\`${raw}\``) && NEG.test(s));

    // ① REF CHẾT — ref được nhắc với giọng KHẲNG ĐỊNH mà repo không có.
    //    Chỉ tính ref có dấu `/` (doc đang khẳng định VỊ TRÍ) hoặc endpoint; tên trần
    //    (`MEMORY.md`, `graph.json`) bỏ qua vì hay trỏ ra ngoài repo / là file sinh lúc chạy.
    const dead = it.refs.filter(
      (r) => !r.exists && !negated(r.raw) && (r.kind === "endpoint" || r.raw.includes("/")),
    );
    if (dead.length) {
      findings.push({
        line: it.line,
        title: it.title,
        kind: "ref-chet",
        detail: `sổ nhắc như thứ đang có, repo không có: ${dead.map((d) => d.raw).join(" · ")}`,
      });
    }

    if (it.status !== "open" && it.status !== "doing") continue;

    // ② "0 match" — sổ tự nêu một PHÉP ĐO (`mcp.ts` 0 match `graph`). Đo lại đúng phép đó
    //    thay vì chỉ hỏi file có tồn tại không: câu này khẳng định NỘI DUNG, không phải sự
    //    tồn tại. Đây là loại khẳng định thối nhanh nhất — code mọc thêm là nó sai ngay.
    const measured = new Set<string>();
    for (const m of it.body.matchAll(/`([A-Za-z0-9_./-]+\.(?:ts|mjs|js|py))`\s*0 match\s*`([A-Za-z0-9_]+)`/g)) {
      const [, fileRaw, term] = m;
      measured.add(fileRaw);
      const at = fileCache.get(fileRaw) ?? findFile(root, fileRaw);
      const text = at ? src.byFile.get(at) : undefined;
      if (text && text.includes(term)) {
        findings.push({
          line: it.line,
          title: it.title,
          kind: "nghi-da-xong",
          detail: `sổ ghi \`${fileRaw}\` 0 match \`${term}\` — ĐO LẠI: ${at} CÓ chứa "${term}"`,
        });
      }
    }

    // ④ CODE MỚI HƠN SỔ — trục THỜI GIAN, và đây mới là trục bắt được ca đã trả giá nặng
    //    nhất. Ca write-gate thật KHÔNG heuristic chữ nghĩa nào bắt nổi: sổ ghi "chưa sửa"
    //    và nêu tên hàm CŨ (`acquireCliWrite`), còn bản vá landing dưới một tên HOÀN TOÀN
    //    MỚI (`acquireCliWriteLock`) mà sổ không hề nhắc. Chữ trong sổ không mâu thuẫn với
    //    chữ nào trong code — nhưng git thì biết: file đó đã bị sửa SAU khi dòng sổ này
    //    được viết. "Đã đụng vào sau" không chứng minh "đã xong", nên đây là NGHI VẤN để
    //    người đọc đo lại, đúng vai máy-nêu-sự-kiện.
    const itemTime = lineTimes.get(it.line) ?? 0;
    if (itemTime) {
      const newer = it.refs
        // Chỉ canh file CODE. Đo 2026-08-07: để cả `.md` thì `AGENTS.md`/`CLAUDE.md` — hub
        // docs đổi hàng tuần vì đủ lý do không liên quan — flag oan 2/4 mục; ca thật
        // (write-gate) là file .ts. Gate ồn là gate chết (bài học cloudguard).
        .filter((r) => r.exists && r.kind === "file" && r.foundAt && !r.foundAt.endsWith(".md"))
        .map((r) => ({ r, t: fileTimeCache.get(r.foundAt) ?? 0 }))
        .filter((x) => x.t > itemTime + STALE_MARGIN_S);
      if (newer.length) {
        findings.push({
          line: it.line,
          title: it.title,
          kind: "code-moi-hon-so",
          detail: `dòng sổ viết ${ymd(itemTime)}, nhưng đã sửa code sau đó: ${newer
            .map((x) => `${x.r.foundAt} (${ymd(x.t)})`)
            .join(" · ")}`,
        });
      }
    }

    // ③ NGHI ĐÃ XONG — sổ nói "X chưa có" ngay trong câu nêu tên X, mà X tồn tại thật.
    //    Đúng khuôn hai ca đã trả giá: write-gate ghi "chưa sửa" trong khi
    //    `acquireCliWriteLock` có kèm test; plan 14 ghi "chưa chốt tray" trong khi
    //    `platform/tray.ts` nặng 24 KB.
    const suspects = it.refs.filter((r) => r.exists && !measured.has(r.raw) && negated(r.raw));
    if (suspects.length) {
      findings.push({
        line: it.line,
        title: it.title,
        kind: "nghi-da-xong",
        detail: `sổ nói "chưa" ngay trong câu nêu tên, nhưng nó TỒN TẠI: ${suspects
          .map((r) => `${r.raw} → ${r.foundAt}`)
          .join(" · ")}`,
      });
    }
  }

  return { file, items, checkable: items.filter((i) => i.refs.length > 0).length, findings };
}

export function formatTodoVerify(r: TodoVerifyReport): string {
  const out: string[] = [];
  out.push(`zemory todo verify — ${r.file}`);
  out.push(`  ${r.items.length} mục · ${r.checkable} mục có tên kiểm được tất định`);
  if (!r.findings.length) {
    out.push("  ✓ không thấy lệch nào giữa sổ và code.");
  } else {
    const dead = r.findings.filter((f) => f.kind === "ref-chet");
    const maybe = r.findings.filter((f) => f.kind === "nghi-da-xong");
    const newer = r.findings.filter((f) => f.kind === "code-moi-hon-so");
    if (maybe.length) {
      out.push(`\n  ⚠ NGHI ĐÃ XONG (${maybe.length}) — sổ nói "chưa", code nói "có":`);
      for (const f of maybe) out.push(`    05_TODO.md:${f.line}  ${f.title}\n        ${f.detail}`);
    }
    if (dead.length) {
      out.push(`\n  ✗ REF CHẾT (${dead.length}) — sổ trỏ vào thứ không còn tồn tại:`);
      for (const f of dead) out.push(`    05_TODO.md:${f.line}  ${f.title}\n        ${f.detail}`);
    }
    // Loại này từng bị NUỐT: findings có (exit 1) mà bảng in 0 dòng — gate đỏ không nói vì
    // sao là gate bị tắt. Bắt buộc mọi kind có mặt trong bảng; kind mới phải thêm ở ĐÂY.
    if (newer.length) {
      out.push(`\n  ⏱ CODE MỚI HƠN SỔ (${newer.length}) — file mục nêu tên đã bị sửa SAU khi dòng sổ được viết (đo lại rồi cập nhật sổ):`);
      for (const f of newer) out.push(`    05_TODO.md:${f.line}  ${f.title}\n        ${f.detail}`);
    }
  }
  out.push(
    `\n  (Máy chỉ nêu SỰ KIỆN tra được. "Tồn tại" KHÔNG tự động nghĩa là "đã xong" —` +
      ` phần đó agent/người đọc phán, rồi sửa NGUỒN là chính \`05_TODO.md\`.)`,
  );
  return out.join("\n");
}
