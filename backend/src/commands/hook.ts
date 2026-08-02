// `zemory hook <install|stop|...>` — the 0-token capture hook wiring (HP điều 10).
import { join } from "node:path";
import { currentProjectRoot } from "../core/config.js";
import { handleHook, installCodexHooks, installHooks, uninstallHooks } from "../memory/capture-hook.js";
import { readStdin } from "./_shared.js";

export async function cmdHook(args: string[]): Promise<void> {
  const sub = args[0];
  if (sub === "install") {
    const scoped = args.includes("--project");
    const hi = args.indexOf("--host");
    const host = hi >= 0 ? args[hi + 1] : "all";
    if (!host || !["all", "claude", "codex"].includes(host)) {
      console.log("usage: zemory hook install [--host all|claude|codex] [--project]");
      process.exitCode = 1;
      return;
    }
    const root = currentProjectRoot();
    const where = scoped ? "project" : "global";
    if (host === "all" || host === "claude") {
      const path = scoped ? join(root, ".claude", "settings.json") : undefined;
      const result = installHooks(path);
      const state = result.added.length ? "installed" : "already present";
      console.log(`zemory hook: Claude Stop ${state} (${where}) → ${result.path}`);
    }
    if (host === "all" || host === "codex") {
      const hooksPath = scoped ? join(root, ".codex", "hooks.json") : undefined;
      const configPath = scoped ? join(root, ".codex", "config.toml") : undefined;
      const result = installCodexHooks(hooksPath, configPath);
      const state = result.added.length ? "installed" : "already present";
      console.log(`zemory hook: Codex Stop ${state} (${where}) → ${result.path}`);
      console.log(`  codex_hooks ${result.featureEnabled ? "enabled" : "already enabled"} → ${result.configPath}`);
    }
    console.log("  Stop → nạp phiên vào bộ nhớ sau MỖI lượt trả lời (~0,3s, không chặn bạn gõ tiếp).");
    console.log("  UserPromptSubmit → im lặng tới khi context chạm 95%, rồi chốt sổ + cảnh báo MỘT lần.");
    console.log("  PreCompact → nạp nốt ngay trước khi context bị nén · SessionStart → chỉ nhắc SAU khi bị nén.");
    console.log("  Recall vẫn do agent tự gọi (điều 8). Gỡ: `zemory hook uninstall` (hoặc tắt công tắc trong UI).");
    return;
  }
  if (sub === "uninstall") {
    const scoped = args.includes("--project");
    const path = scoped ? join(currentProjectRoot(), ".claude", "settings.json") : undefined;
    const r = uninstallHooks(path);
    console.log(
      r.removed.length
        ? `zemory hook: gỡ ${r.removed.join(" · ")} khỏi ${r.path}`
        : `zemory hook: không có móc nào của zemory trong ${r.path}`,
    );
    return;
  }
  const EVENTS = ["session-start", "stop", "session-end", "prompt", "pre-compact"];
  if (!EVENTS.includes(sub ?? "")) {
    console.log(`usage: zemory hook <${EVENTS.join("|")}|install|uninstall>`);
    return;
  }
  const raw = await readStdin();
  let payload: Record<string, unknown>;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  if (!payload.cwd) payload.cwd = process.cwd();
  const out = handleHook(sub as Parameters<typeof handleHook>[0], payload);
  if (out) process.stdout.write(out);
}

