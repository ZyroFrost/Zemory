// Nối zemory vào các agent nói MCP — `zemory setup mcp [agent]`.
//
// Vì sao cần (đo 2026-08-02): `zemory mcp` đã là MCP server thật (trả lời `initialize` +
// `tools/list`), nhưng KHÔNG có đường nào tự khai nó vào agent — người dùng phải biết file
// cấu hình nằm đâu và viết JSON bằng tay. engram có `engram setup <agent>` làm hộ, và đó là
// khác biệt lớn nhất giữa "có MCP" và "dùng được MCP": ai không rành thì coi như không có.
//
// Ba ràng buộc, đều là luật của repo chứ không phải sở thích:
//   · GHI vào file NGOÀI project (cấu hình agent của user) ⇒ chỉ ghi khi user gọi ĐÍCH DANH
//     một agent; gọi trần thì chỉ LIỆT KÊ (`02_RULES §Phạm vi`: ghi ngoài phạm vi là cấm mặc định).
//   · KHÔNG BAO GIỜ ghi đè: giữ nguyên mọi server khác, có sẵn `zemory` thì báo rồi dừng
//     (trừ `--force`), và luôn sao lưu `.bak` trước khi ghi.
//   · Không đoán đường dẫn: file không tồn tại thì TẠO, nhưng thư mục cha phải có sẵn —
//     agent chưa cài mà tự dựng cây thư mục của nó là rác trên máy user.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

export interface AgentTarget {
  id: string;
  label: string;
  /** File cấu hình MCP đã CHỌN; null = không đường ứng viên nào có thư mục cha thật. */
  path: string | null;
  /** Mọi đường ứng viên, theo thứ tự ưu tiên (tài liệu của agent đôi khi đổi chỗ). */
  candidates: string[];
  /** Khoá chứa bảng server trong file đó. */
  key: string;
  /** Cấu hình theo TỪNG PROJECT (ghi vào repo) hay theo máy. */
  scope: "project" | "user";
  /** File chỉ dẫn thường trực agent tự nạp mỗi phiên — chỗ dặn KHI NÀO gọi trí nhớ.
   *  null = agent này không có chỗ AN TOÀN để dặn (lý do ở `memoWhy`). */
  memo: string | null;
  memoCandidates: string[];
  /** Vì sao không dặn được — in ra thay vì im lặng bỏ qua. */
  memoWhy?: string;
  /** Chỉ dẫn ghi theo project hay theo máy (khác `scope`: Cursor khai server theo máy
   *  nhưng luật thì nạp từ repo). */
  memoScope: "project" | "user";
}

/** Chọn đường ứng viên: ưu tiên file ĐÃ CÓ, kế đến thư mục cha đã có (agent đã cài).
 *
 *  Vì sao không lấy đại cái đầu tiên: đường dẫn của mấy agent này lấy từ tài liệu/bản cài
 *  của bên thứ ba, KHÔNG đo được trên máy chưa cài chúng (đo 2026-08-02: 0/10 đường tồn tại
 *  ở đây). Chọn theo "thư mục cha có thật" biến chỗ đoán thành chỗ TỰ XÁC MINH: sai đường
 *  thì cùng lắm là không ghi gì, chứ không đẻ ra một file cấu hình ma ở nơi vô nghĩa. */
function pickPath(candidates: string[], scope: "project" | "user"): string | null {
  if (scope === "project") return candidates[0] ?? null;
  const existingFile = candidates.find((c) => existsSync(c));
  if (existingFile) return existingFile;
  const installed = candidates.find((c) => existsSync(dirname(c)));
  return installed ?? null;
}

/** Bảng đích. Đường dẫn theo tài liệu chính thức của từng agent; OS khác thì đổi gốc. */
export function agentTargets(projectRoot: string): AgentTarget[] {
  const home = homedir();
  const os = platform();
  const appdata = process.env.APPDATA ?? join(home, "AppData", "Roaming");
  const desktop =
    os === "win32"
      ? join(appdata, "Claude", "claude_desktop_config.json")
      : os === "darwin"
        ? join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
        : join(home, ".config", "Claude", "claude_desktop_config.json");
  // 🔴 BẢN MSIX (cài từ Microsoft Store) CHUYỂN HƯỚNG AppData — 2026-08-27.
  //
  // Gói MSIX chạy trong container: mọi phép ghi vào `%APPDATA%` bị lái sang
  // `%LOCALAPPDATA%\Packages\<PackageFamilyName>\LocalCache\Roaming\…`. Nên trên một máy ĐANG
  // CHẠY Claude Desktop, đường `%APPDATA%\Claude\` vẫn TRỐNG và lệnh này báo "chưa cài" —
  // đo được trên máy thật: tiến trình `Claude.exe` chạy từ
  // `C:\Program Files\WindowsApps\Claude_1.37937.1.0_x64__pzs8sxrjxfjjc\`, còn config thật nằm ở
  // `…\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`.
  //
  // Cái giá của lỗ này KHÔNG phải một dòng báo sai: user kết luận "Desktop không đọc được kho"
  // rồi đi dựng cả một bộ template riêng cho máy ảo — xem `plan/20`.
  //
  // Dò bằng GLOB theo tiền tố `Claude_` chứ không ghim đúng một PackageFamilyName: phần đuôi
  // (`pzs8sxrjxfjjc`) là mã publisher, đổi theo kênh phát hành. Ghim cứng là vá cho đúng MỘT máy.
  const msixDesktop: string[] = [];
  if (os === "win32") {
    const pkgRoot = join(process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"), "Packages");
    try {
      for (const dir of readdirSync(pkgRoot)) {
        if (!dir.startsWith("Claude_")) continue;
        msixDesktop.push(join(pkgRoot, dir, "LocalCache", "Roaming", "Claude", "claude_desktop_config.json"));
      }
    } catch {
      /* không đọc được thư mục Packages ⇒ coi như không có bản MSIX (fail-open) */
    }
  }
  // Khai server = agent CÓ tool. Dặn trong file chỉ dẫn = agent BIẾT LÚC NÀO gọi. Thiếu vế
  // sau thì tool nằm đó không ai đụng — đo trên chính repo này trước 2026-08-02: 0 dòng cài
  // chỉ dẫn. Hai vế đi cùng nhau trong MỘT lệnh, không bắt user nhớ làm bước hai.
  const raw: Omit<AgentTarget, "path" | "memo">[] = [
    {
      id: "claude-code",
      label: "Claude Code (theo project)",
      candidates: [join(projectRoot, ".mcp.json")],
      key: "mcpServers",
      scope: "project",
      // `AGENTS.md`/`CLAUDE.md` là file HARNESS của project (docs/agent làm chủ nội dung, gate
      // đếm dòng nó) ⇒ zemory tự chèn vào là sửa tài sản của project. Claude Code đã nhận lời
      // dặn qua MÔ TẢ TOOL (`tools/index.ts`, luật "mô tả = lời dặn" chốt 2026-08-02c).
      memoCandidates: [],
      memoWhy: "AGENTS.md/CLAUDE.md do harness làm chủ — không tự chèn; lời dặn đã nằm trong mô tả tool",
      memoScope: "project",
    },
    {
      id: "claude-desktop",
      label: "Claude Desktop",
      // MSIX TRƯỚC: máy cài từ Store thì `%APPDATA%\Claude` trống, ghi vào đó là ghi vào hư không.
      candidates: [...msixDesktop, desktop],
      key: "mcpServers",
      scope: "user",
      memoCandidates: [],
      memoWhy: "không có file chỉ dẫn thường trực — lời dặn đi theo mô tả tool",
      memoScope: "user",
    },
    {
      id: "cursor",
      label: "Cursor",
      candidates: [join(home, ".cursor", "mcp.json")],
      key: "mcpServers",
      scope: "user",
      // Cursor nạp rule từ `~/.cursor/rules/` (toàn máy) và `<project>/.cursor/rules/`.
      // Ưu tiên bản toàn máy nếu Cursor đã cài; không thì rơi về rule của project.
      // File mới phải mang `alwaysApply: true` mới được nạp mỗi phiên (xem writeProtocol).
      memoCandidates: [
        join(home, ".cursor", "rules", "zemory-memory.mdc"),
        join(projectRoot, ".cursor", "rules", "zemory-memory.mdc"),
      ],
      memoScope: "user",
    },
    {
      id: "windsurf",
      label: "Windsurf (Cascade)",
      candidates: [join(home, ".codeium", "windsurf", "mcp_config.json")],
      key: "mcpServers",
      scope: "user",
      memoCandidates: [join(home, ".codeium", "windsurf", "memories", "global_rules.md")],
      memoScope: "user",
    },
    // Gemini: hai đường đang cùng lưu hành (bản cài khác nhau đặt khác chỗ) — thử cả hai.
    {
      id: "gemini",
      label: "Gemini CLI",
      candidates: [join(home, ".gemini", "settings.json"), join(appdata, "gemini", "settings.json")],
      key: "mcpServers",
      scope: "user",
      memoCandidates: [join(home, ".gemini", "GEMINI.md"), join(appdata, "gemini", "GEMINI.md")],
      memoScope: "user",
    },
    {
      id: "qwen",
      label: "Qwen Code",
      candidates: [join(home, ".qwen", "settings.json")],
      key: "mcpServers",
      scope: "user",
      memoCandidates: [join(home, ".qwen", "QWEN.md")],
      memoScope: "user",
    },
    {
      id: "kiro",
      label: "Kiro IDE",
      candidates: [join(home, ".kiro", "settings", "mcp.json")],
      key: "mcpServers",
      scope: "user",
      memoCandidates: [
        join(home, ".kiro", "steering", "zemory-memory.md"),
        join(projectRoot, ".kiro", "steering", "zemory-memory.md"),
      ],
      memoScope: "user",
    },
    {
      id: "antigravity",
      label: "Antigravity CLI",
      candidates: [join(home, ".gemini", "config", "mcp_config.json")],
      key: "mcpServers",
      scope: "user",
      // Antigravity nạp `~/.gemini/GEMINI.md` — CÙNG file với Gemini CLI, nên khai cả hai
      // vẫn an toàn: khối có marker nên lần thứ hai chỉ cập nhật đúng khối đó, không nhân đôi.
      memoCandidates: [join(home, ".gemini", "GEMINI.md")],
      memoScope: "user",
    },
  ];
  const inProject = (p: string) => p.toLowerCase().startsWith(projectRoot.toLowerCase());
  /** Chọn chỗ đặt lời dặn: ① file đã có → ② thư mục đã có (agent đã cài) → ③ đường nằm
   *  TRONG repo (luôn tạo được) → ④ chịu. Bậc ③ là khác biệt so với `pickPath`: với file
   *  cấu hình thì "chưa có thư mục" nghĩa là agent chưa cài nên thôi; còn rule trong repo
   *  của chính user thì tạo là hợp lệ, và đó là đường duy nhất còn lại cho Cursor/Kiro
   *  khi bản toàn máy chưa dựng. */
  const pickMemo = (candidates: string[]): string | null => {
    if (!candidates.length) return null;
    return (
      candidates.find((c) => existsSync(c)) ??
      candidates.find((c) => existsSync(dirname(c))) ??
      candidates.find((c) => inProject(c)) ??
      null
    );
  };
  return raw.map((r) => {
    // Một agent có thể có ứng viên ở CẢ hai nơi (Cursor/Kiro: rule toàn máy hoặc rule của
    // repo). Quyền "được tạo thư mục" phải theo ĐƯỜNG ĐÃ CHỌN, không theo nhãn khai sẵn:
    // trong repo của user thì tạo thư mục là bình thường, còn dựng cây trong home của một
    // agent chưa cài là để lại rác.
    const memo = pickMemo(r.memoCandidates);
    return {
      ...r,
      path: pickPath(r.candidates, r.scope),
      memo,
      memoScope: memo && inProject(memo) ? ("project" as const) : r.memoScope,
    };
  });
}

/** Agent KHÔNG khai được bằng bảng trên — nêu tên + lý do thay vì im lặng bỏ qua.
 *  Im lặng thì người dùng tưởng zemory không hỗ trợ; nói ra thì họ biết phải khai tay. */
export const UNSUPPORTED: { id: string; why: string }[] = [
  { id: "codex", why: "cấu hình là TOML (config.toml), không phải JSON — cần bộ ghi riêng" },
  { id: "opencode", why: "dùng khoá `mcp` với khuôn entry khác (`type: local`), không phải `mcpServers`" },
  { id: "pi", why: "nối bằng plugin package, không qua file cấu hình MCP" },
];

/** Khối server zemory được khai vào file cấu hình của agent. */
export const SERVER_ENTRY = { command: "zemory", args: ["mcp"] };

export interface MergeResult {
  next: Record<string, unknown>;
  changed: boolean;
  reason: "added" | "already" | "replaced";
}

/** Trộn khai báo zemory vào JSON cấu hình có sẵn — HÀM THUẦN, không đụng đĩa.
 *
 *  Tách riêng để test được: đây là chỗ dễ làm hỏng file của user nhất (xoá mất server khác,
 *  hoặc đè cấu hình họ đã sửa tay). Giữ nguyên mọi khoá lạ ở mọi tầng. */
export function mergeServerConfig(
  existing: Record<string, unknown>,
  key: string,
  name = "zemory",
  force = false,
): MergeResult {
  const servers = { ...((existing[key] as Record<string, unknown>) ?? {}) };
  const had = Object.prototype.hasOwnProperty.call(servers, name);
  if (had && !force) return { next: existing, changed: false, reason: "already" };
  servers[name] = { ...SERVER_ENTRY };
  return { next: { ...existing, [key]: servers }, changed: true, reason: had ? "replaced" : "added" };
}

export interface WriteReport {
  target: AgentTarget;
  wrote: boolean;
  reason: MergeResult["reason"] | "no-parent-dir" | "bad-json";
  backup?: string;
}

/** Ghi khai báo vào ĐÚNG MỘT agent. Không tự tạo cây thư mục của agent chưa cài. */
export function wireAgent(target: AgentTarget, force = false): WriteReport {
  if (!target.path) return { target, wrote: false, reason: "no-parent-dir" };
  const parent = dirname(target.path);
  const fileExists = existsSync(target.path);
  if (!fileExists && !existsSync(parent)) {
    // Project scope thì tạo thư mục là hợp lệ (đang ở trong repo của user); user scope thì
    // KHÔNG: thiếu thư mục nghĩa là agent đó chưa cài, dựng cây cho nó là để lại rác.
    if (target.scope !== "project") return { target, wrote: false, reason: "no-parent-dir" };
    mkdirSync(parent, { recursive: true });
  }
  let current: Record<string, unknown> = {};
  if (fileExists) {
    try {
      const parsed = JSON.parse(readFileSync(target.path, "utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) current = parsed;
      else return { target, wrote: false, reason: "bad-json" };
    } catch {
      // File hỏng ⇒ DỪNG. Ghi đè một file JSON không parse được là xoá cấu hình của user.
      return { target, wrote: false, reason: "bad-json" };
    }
  }
  const merged = mergeServerConfig(current, target.key, "zemory", force);
  if (!merged.changed) return { target, wrote: false, reason: merged.reason };
  let backup: string | undefined;
  if (fileExists) {
    backup = `${target.path}.bak`;
    copyFileSync(target.path, backup);
  }
  writeFileSync(target.path, JSON.stringify(merged.next, null, 2) + "\n", "utf8");
  return { target, wrote: true, reason: merged.reason, backup };
}

// ─── Memory protocol: dặn agent KHI NÀO gọi trí nhớ ────────────────────────────
//
// Khai server chỉ cho agent CÓ tool. Thứ quyết định nó có GỌI hay không là lời dặn nằm
// trong file chỉ dẫn thường trực — với Cursor/Windsurf/Qwen/Gemini thì `AGENTS.md` của
// project không chắc được nạp, nên tool có mà agent không biết lúc nào dùng.
//
// Viết bằng tiếng Anh: đây là văn bản cho AGENT đọc, không phải docs người đọc
// (`02_RULES §Ngôn ngữ` — docs tiếng Việt, thứ agent/code đọc thì tiếng Anh).

export const PROTOCOL_BEGIN = "<!-- zemory:memory-protocol -->";
export const PROTOCOL_END = "<!-- /zemory:memory-protocol -->";

/** Thân khối. Ngắn có chủ đích: nó nằm trong ngữ cảnh MỌI phiên của agent đó. */
export const MEMORY_PROTOCOL = `## zemory — memory protocol

This machine has a local cross-session memory (zemory MCP server). Use it instead of asking
the user to re-explain work you could look up.

- **Starting or resuming work in a project** → call \`memory_context\` first. Cheap, read-only.
- **Anything that may have been discussed, decided, or hit before** — "we tried X", "why is Y
  like this", an error that looks familiar → \`memory_search\`, then \`memory_show\` on the hits
  worth reading in full. Snippets are deliberately short; never conclude from one you did not open.
- **Before acting on a rule, convention or past decision — and always before saying "we never
  did X"** → \`changelog_search\`. A hit flagged \`supersededBy\` is DEAD: read the newer entry
  and follow that one. This is the only surface that knows a decision was reversed.
- **Before proposing or changing a design** → \`plan_search\` / \`plan_show\`.
- **Empty or surprising result** → \`project_current\` (wrong scope?) then \`memory_stats\`
  (empty store?). An empty store and a bad query look identical from \`memory_search\`.
- **Right after your context was COMPACTED or summarised** — details you had are gone, and a
  summary reads like knowledge you still have → call \`memory_context\` (and \`memory_search\`
  for the specifics) to rebuild the real state BEFORE continuing. zemory kept the full session
  on disk even though your context did not. Never continue from the summary alone.

Everything here is local and read-only. Nothing is sent anywhere.`;

export function protocolBlock(): string {
  return `${PROTOCOL_BEGIN}\n${MEMORY_PROTOCOL}\n${PROTOCOL_END}`;
}

export interface ProtocolMerge {
  next: string;
  changed: boolean;
  reason: "added" | "updated" | "already" | "broken-marker";
}

/** Chèn/cập nhật khối chỉ dẫn trong một file markdown của user — HÀM THUẦN.
 *
 *  Neo bằng cặp marker để lần chạy sau GHI ĐÈ đúng khối cũ thay vì nối thêm bản thứ hai
 *  (chạy `setup mcp` ba lần mà ra ba khối là lỗi kinh điển của kiểu chèn-vào-cuối-file).
 *  Mọi chữ user tự viết nằm ngoài marker không bị đụng. */
export function mergeProtocol(existing: string): ProtocolMerge {
  const block = protocolBlock();
  const b = existing.indexOf(PROTOCOL_BEGIN);
  const e = existing.indexOf(PROTOCOL_END);
  if (b >= 0 && e < 0) {
    // Mở mà không đóng ⇒ ai đó đã cắt file. Đoán chỗ kết thúc là đoán vào văn bản của user;
    // dừng lại và báo, đúng luật "chưa xác minh thì chưa phải sự thật".
    return { next: existing, changed: false, reason: "broken-marker" };
  }
  if (b >= 0 && e > b) {
    const next = existing.slice(0, b) + block + existing.slice(e + PROTOCOL_END.length);
    return next === existing
      ? { next: existing, changed: false, reason: "already" }
      : { next, changed: true, reason: "updated" };
  }
  if (!existing.trim()) return { next: `${block}\n`, changed: true, reason: "added" };
  const pad = existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
  return { next: `${existing}${pad}${block}\n`, changed: true, reason: "added" };
}

export interface ProtocolReport {
  target: AgentTarget;
  path: string | null;
  wrote: boolean;
  reason: ProtocolMerge["reason"] | "no-parent-dir" | "unsupported";
  backup?: string;
}

/** Cursor chỉ nạp một rule file mỗi phiên khi nó tự khai `alwaysApply`. File .mdc mới mà
 *  thiếu frontmatter này thì nằm im — tức là ghi xong vẫn không ai đọc. */
const MDC_FRONTMATTER = "---\nalwaysApply: true\n---\n\n";

/** Ghi lời dặn vào file chỉ dẫn của ĐÚNG MỘT agent. Cùng ba chốt chặn như `wireAgent`:
 *  không tự dựng cây thư mục của agent chưa cài · sao lưu `.bak` · không đè phần user viết. */
export function writeProtocol(target: AgentTarget): ProtocolReport {
  if (!target.memoCandidates.length) return { target, path: null, wrote: false, reason: "unsupported" };
  if (!target.memo) return { target, path: null, wrote: false, reason: "no-parent-dir" };
  const path = target.memo;
  const parent = dirname(path);
  const fileExists = existsSync(path);
  if (!fileExists && !existsSync(parent)) {
    if (target.memoScope !== "project") return { target, path, wrote: false, reason: "no-parent-dir" };
    mkdirSync(parent, { recursive: true });
  }
  const current = fileExists ? readFileSync(path, "utf8") : path.endsWith(".mdc") ? MDC_FRONTMATTER : "";
  const merged = mergeProtocol(current);
  if (!merged.changed) return { target, path, wrote: false, reason: merged.reason };
  let backup: string | undefined;
  if (fileExists) {
    backup = `${path}.bak`;
    copyFileSync(path, backup);
  }
  writeFileSync(path, merged.next, "utf8");
  return { target, path, wrote: true, reason: merged.reason, backup };
}

/** Trạng thái lời dặn: đã cài · cài bản CŨ · chưa cài · không áp dụng. */
export function inspectProtocol(
  target: AgentTarget,
): "installed" | "stale" | "absent" | "no-file" | "unsupported" | "broken-marker" {
  if (!target.memoCandidates.length) return "unsupported";
  if (!target.memo || !existsSync(target.memo)) return "no-file";
  const text = readFileSync(target.memo, "utf8");
  if (!text.includes(PROTOCOL_BEGIN)) return "absent";
  if (!text.includes(PROTOCOL_END)) return "broken-marker";
  return text.includes(protocolBlock()) ? "installed" : "stale";
}

/** Trạng thái hiện tại của một đích: đã khai zemory chưa. */
export function inspectAgent(target: AgentTarget): "wired" | "present-not-wired" | "no-file" | "bad-json" {
  if (!target.path || !existsSync(target.path)) return "no-file";
  try {
    const parsed = JSON.parse(readFileSync(target.path, "utf8")) as Record<string, unknown>;
    const servers = (parsed?.[target.key] as Record<string, unknown>) ?? {};
    return Object.prototype.hasOwnProperty.call(servers, "zemory") ? "wired" : "present-not-wired";
  } catch {
    return "bad-json";
  }
}
