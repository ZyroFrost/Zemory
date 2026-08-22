// Runtime hooks layer — the bridge from passive store to live agent.
//
// Design mirrors agentmemory's TRIGGER model (verified from its source):
//   - CAPTURE is automatic via a write-only hook (Stop → auto-ingest). 0 tokens,
//     no context change — just keeps the memory fresh.
//   - RECALL is NOT auto-pushed every prompt (that bloats tokens / pollutes
//     context — agentmemory tried it and defaulted it OFF). Recall happens on
//     the AGENT's judgment: it runs `zemory memory search` when the user's prompt
//     references past work (advertised via the project's AGENTS.md).
//
// So `hook install` installs ONLY the Stop capture hook. SessionStart injection
// stays available as an opt-in handler but is NOT installed by default.
// Handlers MUST be fail-safe: a hook error must never break the host session.

import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { writeFileAtomic, writeJsonAtomic } from "../util/fs-atomic.js";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { scan, scanOneFile } from "./ingest.js";
import { recallCard } from "./recall.js";
import { lastCompactAt, readContextUsage } from "./context-guard.js";
import { currentMemoryDir } from "./db.js";
import { daemonJobBusyExternal } from "../jobs/writegate.js";
import { getContextWarnPercent } from "../config/settings.js";
import { syncCheck } from "../docs/adopt.js";

export type HookEventName = "session-start" | "stop" | "session-end" | "prompt" | "pre-compact";

/**
 * Ngưỡng cảnh báo context (%). Chạm là chốt sổ + báo MỘT lần cho cả chu kỳ.
 *
 * Đọc từ config (mặc định 95) chứ không còn là hằng chôn trong file này: cùng một % KHÔNG
 * hợp cho mọi cửa sổ — 95% của 200k chừa ~10k token để chốt việc, 95% của 1M chừa 50k.
 * Đọc MỖI LẦN GỌI (không cache ở tầng module) vì hook là tiến trình ngắn, và vì đổi ngưỡng
 * phải ăn ngay ở lượt sau chứ không đợi khởi động lại.
 */
const warnAtPercent = (): number => getContextWarnPercent();

/**
 * Nạp phiên đang chạy vào GM. Ưu tiên `transcript_path` của host (đường MỘT file, <1s);
 * không có thì KHÔNG rơi về quét cả kho — đường per-message mà lặng lẽ quét 1,8–7s (và ~125s
 * khi embed nền chạy) là đúng thứ làm người ta phải tắt tính năng. Lưới bù sẽ lượm.
 */
function ingestCurrent(payload: any): { newMessages: number; ms: number } | null {
  const path: string | undefined = payload?.transcript_path ?? payload?.transcriptPath;
  if (!path) return null;
  // Write-gate bận (embed nền giữ token chuỗi dài) ⇒ BỎ QUA NGAY, không xếp hàng: chờ là
  // ~125s mỗi lượt trả lời (đo 2026-08-02). Tin không mất — nó nằm trên transcript, lưới bù nạp.
  if (daemonJobBusyExternal()) return null;
  const r = scanOneFile(path);
  return r.ingested ? { newMessages: r.newMessages, ms: r.ms } : null;
}

/** Cờ "đã cảnh báo phiên này" — cạnh DB, không nằm trong repo (dữ liệu runtime). */
function warnedFlagPath(sessionId: string): string {
  return join(currentMemoryDir(), "context-guard", `${sessionId.replace(/[^\w.-]/g, "_")}.warned`);
}

/**
 * Đã cảnh báo cho CHU KỲ ĐẦY hiện tại chưa?
 *
 * Không chỉ hỏi "có cờ không" mà hỏi "cờ còn hiệu lực không": nếu sau lúc đặt cờ đã có một
 * lần nén THẬT (dấu `compact_boundary` trong transcript) thì context đã tụt về ~30% và đang
 * đầy lại — đó là chu kỳ MỚI, phải được nhắc lại.
 *
 * Mốc là DẤU VẾT chứ không phải sự kiện hook, vì hai thứ đó khác nhau ở đúng ca người dùng
 * kể: bấm nhầm `/compact` rồi huỷ ngay ⇒ `PreCompact` đã chạy nhưng **nén không xảy ra**.
 * Lấy hook làm mốc thì mỗi lần bấm nhầm lại mở một chu kỳ giả; lấy dấu vết thì huỷ là như
 * chưa từng bấm.
 */
function alreadyWarned(sessionId: string, transcriptPath?: string): boolean {
  const p = warnedFlagPath(sessionId);
  if (!existsSync(p)) return false;
  if (!transcriptPath) return true;
  try {
    const warnedAt = Date.parse(readFileSync(p, "utf8").trim());
    const compactedAt = lastCompactAt(transcriptPath);
    if (Number.isFinite(warnedAt) && compactedAt > warnedAt) return false; // đã nén thật ⇒ chu kỳ mới
  } catch {
    /* đọc cờ hỏng ⇒ coi như đã cảnh báo, thà im còn hơn spam */
  }
  return true;
}

function markWarned(sessionId: string): void {
  const p = warnedFlagPath(sessionId);
  mkdirSync(dirname(p), { recursive: true });
  writeFileAtomic(p, new Date().toISOString());
}

/**
 * Xoá cờ khi context vừa được nén — cảnh báo là "một lần mỗi CHU KỲ ĐẦY", KHÔNG phải một
 * lần mỗi phiên.
 *
 * Đo trên transcript thật của máy này (2026-08-02, 30 lần nén): **7/19 phiên bị nén NHIỀU
 * HƠN MỘT LẦN**, cá biệt một phiên nén **6 lần**. Nén xong context tụt về ~30% rồi đầy lại
 * — nếu giữ cờ theo phiên thì mấy lần sau im lặng, đúng lúc người dùng cần nhắc nhất.
 */
function clearWarned(sessionId: string): void {
  try {
    rmSync(warnedFlagPath(sessionId), { force: true });
  } catch {
    /* cờ là tiện ích: xoá không được thì cùng lắm mất một lần nhắc, không sai dữ liệu */
  }
}

/** Run a hook handler. Returns text to write to stdout (may be ""). */
export function handleHook(event: HookEventName, payload: any): string {
  try {
    const cwd: string | undefined = payload?.cwd;

    // SessionStart — chỉ nói khi host báo lý do `compact`. Phiên mới bình thường thì IM:
    // recall là phán đoán của agent (điều 8), không đẩy memory vào mỗi lần mở phiên.
    if (event === "session-start") {
      if (payload?.source !== "compact") return "";
      // Lưới thứ hai cho cùng việc: host nào KHÔNG bắn `PreCompact` thì đây là chỗ duy nhất
      // biết vừa có một lần nén ⇒ mở lại quyền cảnh báo tại đây luôn.
      clearWarned(String(payload?.session_id ?? payload?.transcript_path ?? ""));
      const card = cwd ? recallCard(cwd) : "";
      const note =
        "[zemory] Context vừa bị NÉN — phần chi tiết trước đó đã bị tóm tắt, nhưng Global Memory " +
        "giữ NGUYÊN VẸN cả phiên này. Trước khi làm tiếp: gọi `memory_context` (hoặc " +
        "`zemory memory search`) để dựng lại trạng thái thật, đừng suy ra từ bản tóm tắt.";
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: card ? `${note}\n${card}` : note,
        },
      });
    }

    // PreCompact — lưới chốt cuối: nạp nốt phần đuôi NGAY TRƯỚC khi host nén.
    //
    // Chạy cho CẢ hai kiểu nén (`trigger: "auto" | "manual"`), và đó mới là lưới thật: đo 30
    // lần nén trên máy này thì auto thường nổ sát trần (p50 **1.000.183** token) nhưng KHÔNG
    // phải lúc nào cũng vậy — có lần auto ở **711.803**, có lần chỉ **342.068**, cộng 3 lần
    // user tự bấm (thấp nhất 511.388). Những ca đó ngưỡng 95% không kịp kêu, nên nếu chỉ dựa
    // vào đồng hồ thì mất phần đuôi. Móc này không quan tâm nén vì lý do gì.
    if (event === "pre-compact") {
      ingestCurrent(payload);
      // CỐ Ý không xoá cờ cảnh báo ở đây: móc này chạy TRƯỚC khi nén, mà người dùng có thể
      // bấm nhầm rồi huỷ ⇒ nén không xảy ra. Quyền cảnh báo mở lại dựa trên DẤU VẾT nén thật
      // trong transcript (xem `alreadyWarned`), không dựa trên việc móc này đã nổ.
      return "";
    }

    // UserPromptSubmit — đồng hồ đo context. Dưới ngưỡng: IM TUYỆT ĐỐI (0 ký tự, 0 token).
    if (event === "prompt") {
      // "Chấm than update" tầng hook (2026-08-21, user chốt): kiểm ĐÚNG MỘT LẦN mỗi phiên xem
      // repo đang đứng có CŨ so với bộ chuẩn hiện hành không (file template thiếu / guard lỗi
      // thời). Repo càng nhiều thì đây là tầng thay việc "gọi từng con áp update": agent mở
      // phiên là tự thấy. Marker ghi TRƯỚC khi đo — đo nổ cũng không lặp lại mỗi prompt.
      // CHỈ NHẮC, không tự sync (02_RULES §Phạm vi; hook là lưới đỡ, không phải người quyết).
      let updNote = "";
      try {
        const cwd: string | undefined = payload?.cwd;
        const sidRaw = String(payload?.session_id ?? payload?.transcript_path ?? "");
        if (cwd && sidRaw) {
          const flag = join(currentMemoryDir(), "context-guard", `${sidRaw.replace(/[^\w.-]/g, "_")}.harness`);
          if (!existsSync(flag)) {
            mkdirSync(dirname(flag), { recursive: true });
            // `writeFileAtomic`, KHÔNG phải `writeFileSync` trần: cổng `fs-atomic` cấm ghi trần
            // vào file nguồn/cấu hình, và marker này chạy trong hook — tiến trình có thể bị cắt
            // giữa đường. Đợt "chấm than update" 21/08 lỡ dùng bản trần và gate không ai chạy
            // (nợ gate đầy đủ từ 15/08) nên nó trôi tới 22/08 mới lộ.
            writeFileAtomic(flag, new Date().toISOString());
            const r = syncCheck(cwd);
            if (r.connected && (r.missing.length > 0 || r.guardStale.length > 0)) {
              const parts = [
                r.missing.length ? `${r.missing.length} file chuẩn mới chưa nhận` : "",
                r.guardStale.length ? `guard lỗi thời (${r.guardStale.join(" · ")})` : "",
              ].filter(Boolean);
              updNote =
                `[zemory] ⚠ Harness repo này CŨ so với bộ chuẩn hiện hành — ${parts.join(" · ")}. ` +
                `Chạy \`zemory sync\`${r.guardStale.length ? " rồi `zemory hook guard`" : ""} khi tiện (xem \`zemory doctor\`).`;
            }
          }
        }
      } catch {
        /* fail-open — lời nhắc không bao giờ được chặn prompt */
      }
      const path: string | undefined = payload?.transcript_path ?? payload?.transcriptPath;
      if (!path) return updNote;
      const usage = readContextUsage(path);
      // Mọi lối ra dưới ngưỡng phải mang theo updNote — nuốt nó ở đây là lời nhắc update
      // không bao giờ tới được ca thường gặp nhất (phiên mới, context còn thấp).
      if (!usage || usage.percent === null || usage.percent < warnAtPercent()) return updNote;
      const sid: string = String(payload?.session_id ?? path);
      if (alreadyWarned(sid, path)) return updNote; // một lần mỗi CHU KỲ ĐẦY, không lặp mỗi prompt
      const saved = ingestCurrent(payload); // chạm ngưỡng ⇒ chốt sổ NGAY, không đợi nhịp nền
      markWarned(sid);
      const pct = Math.round(usage.percent);
      const savedNote = saved
        ? `Đã lưu phiên vào Global Memory (+${saved.newMessages} tin, ${saved.ms}ms).`
        : "Global Memory sẽ nạp phiên này ở lượt nền kế tiếp.";
      const ctxNote =
        `[zemory] ⚠ Context ~${pct}% (${usage.tokens.toLocaleString("en-US")} token). ${savedNote} ` +
        "Nên chốt việc đang dở / ghi sổ trước khi bị nén; sau khi nén hãy gọi `memory_context` để dựng lại.";
      return updNote ? `${updNote}\n${ctxNote}` : ctxNote;
    }

    if (event === "stop" || event === "session-end") {
      // Đường nạp CHÍNH (per-message). `scan()` cả kho chỉ còn là lối CHÓT cho host không
      // đưa `transcript_path` — và ngay cả nó cũng phải nhường write-gate.
      const path: string | undefined = payload?.transcript_path ?? payload?.transcriptPath;
      if (!ingestCurrent(payload) && !path && !daemonJobBusyExternal()) scan();
      return "";
    }
    return "";
  } catch {
    return ""; // never break the host
  }
}

// ---- Installer: merge zemory hooks into Claude Code settings (non-destructive) ----

interface HookCmd {
  hooks: { type: "command"; command: string }[];
}

const CLAUDE_SETTINGS = join(homedir(), ".claude", "settings.json");
const CODEX_HOOKS = join(homedir(), ".codex", "hooks.json");
const CODEX_CONFIG = join(homedir(), ".codex", "config.toml");

// Bốn móc, mỗi cái một vai — user chốt 2026-08-02 ("mỗi 1 mes phải tự đưa lên luôn"):
//   · Stop              — ĐƯỜNG NẠP CHÍNH: mỗi lượt trả lời xong, nạp NGAY phiên đó (<1s).
//   · UserPromptSubmit  — đồng hồ context; im tuyệt đối tới khi chạm ngưỡng.
//   · PreCompact        — chốt sổ lần cuối ngay trước khi host nén.
//   · SessionStart      — CHỈ nói khi `source=compact`: thẻ nhắc dựng lại trạng thái.
//
// SessionStart ở đây KHÔNG phải "auto-inject memory mỗi phiên" (điều 8 cấm) — handler tự
// kiểm `source` và im lặng với mọi phiên mở bình thường; nó chỉ mở miệng đúng lúc agent vừa
// MẤT trí nhớ vì bị nén, tức đúng sự kiện chứ không phải mỗi prompt.
const ZEMORY_HOOKS: { event: string; command: string }[] = [
  { event: "Stop", command: "zemory hook stop" },
  { event: "UserPromptSubmit", command: "zemory hook prompt" },
  { event: "PreCompact", command: "zemory hook pre-compact" },
  { event: "SessionStart", command: "zemory hook session-start" },
];

export interface InstallResult {
  path: string;
  added: string[];
  present: string[];
}

export interface CodexInstallResult extends InstallResult {
  configPath: string;
  featureEnabled: boolean;
}

function readJsonObject(path: string): Record<string, any> {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8");
  try {
    const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("expected a JSON object");
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Cannot update ${path}: ${error instanceof Error ? error.message : "invalid JSON"}`,
      { cause: error },
    );
  }
}

function mergeCommandHook(
  path: string,
  rootKey: string | null,
  event: string,
  command: string,
): InstallResult {
  const document = readJsonObject(path);
  const settings = rootKey
    ? ((document[rootKey] ??= {}) as Record<string, HookCmd[]>)
    : (document as Record<string, HookCmd[]>);
  const groups = Array.isArray(settings[event]) ? settings[event] : [];
  const already = groups.some((group) =>
    (group.hooks ?? []).some((hook) => hook.type === "command" && hook.command === command),
  );
  if (!already) {
    groups.push({ hooks: [{ type: "command", command }] });
    settings[event] = groups;
    mkdirSync(dirname(path), { recursive: true });
    // File cấu hình của CHÍNH agent (vd settings.json của Claude Code). Ghi hỏng ở đây
    // là làm hỏng công cụ của user, không chỉ hỏng zemory ⇒ phải nguyên tử.
    writeJsonAtomic(path, document);
  }
  return {
    path,
    added: already ? [] : [event],
    present: already ? [event] : [],
  };
}

/** Móc của zemory có THẬT trong settings của host không (không phải chỉ cờ config). */
export function hooksInstalled(settingsPath: string = CLAUDE_SETTINGS): boolean {
  if (!existsSync(settingsPath)) return false;
  try {
    const hooks = (readJsonObject(settingsPath).hooks ?? {}) as Record<string, HookCmd[]>;
    const groups = Array.isArray(hooks.Stop) ? hooks.Stop : [];
    return groups.some((g) => (g.hooks ?? []).some((h) => h.command === "zemory hook stop"));
  } catch {
    return false;
  }
}

/** Add zemory's hooks to Claude Code settings.json, merging (never overwriting). */
export function installHooks(settingsPath: string = CLAUDE_SETTINGS): InstallResult {
  const added: string[] = [];
  const present: string[] = [];
  for (const { event, command } of ZEMORY_HOOKS) {
    const result = mergeCommandHook(settingsPath, "hooks", event, command);
    added.push(...result.added);
    present.push(...result.present);
  }
  return { path: settingsPath, added, present };
}

/**
 * Gỡ đúng những móc do zemory khai — công tắc realtime TẮT phải gỡ được, không thì bật một
 * lần là dính vĩnh viễn. Chỉ xoá entry có `command` khớp chính xác; mọi hook khác của user
 * trong cùng sự kiện giữ nguyên, và sự kiện rỗng thì bỏ luôn khoá cho sạch.
 */
export function uninstallHooks(settingsPath: string = CLAUDE_SETTINGS): { path: string; removed: string[] } {
  if (!existsSync(settingsPath)) return { path: settingsPath, removed: [] };
  const document = readJsonObject(settingsPath);
  const hooks = (document.hooks ?? {}) as Record<string, HookCmd[]>;
  const mine = new Set(ZEMORY_HOOKS.map((h) => h.command));
  const removed: string[] = [];
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;
    const kept = groups
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !mine.has(h.command)) }))
      .filter((g) => g.hooks.length > 0);
    if (kept.length !== groups.length || JSON.stringify(kept) !== JSON.stringify(groups)) removed.push(event);
    if (kept.length) hooks[event] = kept;
    else delete hooks[event];
  }
  if (!removed.length) return { path: settingsPath, removed: [] };
  if (Object.keys(hooks).length) document.hooks = hooks;
  else delete document.hooks;
  writeJsonAtomic(settingsPath, document);
  return { path: settingsPath, removed };
}

function enableCodexHooks(configPath: string): boolean {
  const original = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const lines = original.split(/\r?\n/);
  const section = lines.findIndex((line) => line.trim() === "[features]");
  if (section < 0) {
    if (lines.length && lines[lines.length - 1] !== "") lines.push("");
    lines.push("[features]", "codex_hooks = true", "");
  } else {
    let end = lines.length;
    for (let i = section + 1; i < lines.length; i++) {
      if (/^\s*\[[^\]]+\]\s*$/.test(lines[i])) {
        end = i;
        break;
      }
    }
    const setting = lines.findIndex(
      (line, index) => index > section && index < end && /^\s*codex_hooks\s*=/.test(line),
    );
    if (setting >= 0) lines[setting] = "codex_hooks = true";
    else lines.splice(section + 1, 0, "codex_hooks = true");
  }
  const next = lines.join("\n").replace(/\n*$/, "\n");
  if (next === original) return false;
  mkdirSync(dirname(configPath), { recursive: true });
  // config.toml của Codex — cũng là file của CHÍNH agent, hỏng là hỏng công cụ của user.
  writeFileAtomic(configPath, next);
  return true;
}

/** Install Codex Stop capture and enable its hook runtime. */
export function installCodexHooks(
  hooksPath: string = CODEX_HOOKS,
  configPath: string = CODEX_CONFIG,
): CodexInstallResult {
  const result = mergeCommandHook(hooksPath, "hooks", "Stop", "zemory hook stop");
  return {
    ...result,
    configPath,
    featureEnabled: enableCodexHooks(configPath),
  };
}
