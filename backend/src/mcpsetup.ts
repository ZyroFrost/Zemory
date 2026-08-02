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
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

export interface AgentTarget {
  id: string;
  label: string;
  /** File cấu hình MCP; null = nền này không hỗ trợ trên OS hiện tại. */
  path: string | null;
  /** Khoá chứa bảng server trong file đó. */
  key: string;
  /** Cấu hình theo TỪNG PROJECT (ghi vào repo) hay theo máy. */
  scope: "project" | "user";
}

/** Bảng đích. Đường dẫn theo tài liệu chính thức của từng agent; OS khác thì đổi gốc. */
export function agentTargets(projectRoot: string): AgentTarget[] {
  const home = homedir();
  const os = platform();
  const desktop =
    os === "win32"
      ? join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "Claude", "claude_desktop_config.json")
      : os === "darwin"
        ? join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
        : join(home, ".config", "Claude", "claude_desktop_config.json");
  return [
    { id: "claude-code", label: "Claude Code (theo project)", path: join(projectRoot, ".mcp.json"), key: "mcpServers", scope: "project" },
    { id: "claude-desktop", label: "Claude Desktop", path: desktop, key: "mcpServers", scope: "user" },
    { id: "cursor", label: "Cursor", path: join(home, ".cursor", "mcp.json"), key: "mcpServers", scope: "user" },
    { id: "windsurf", label: "Windsurf", path: join(home, ".codeium", "windsurf", "mcp_config.json"), key: "mcpServers", scope: "user" },
    { id: "gemini", label: "Gemini CLI", path: join(home, ".gemini", "settings.json"), key: "mcpServers", scope: "user" },
  ];
}

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
