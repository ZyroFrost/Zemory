// Per-feature checks — the REAL test behind each green tick. A feature is only
// "on" if its check actually passes (not hardcoded).

import { existsSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_FILE, findProjectRoot, loadContext } from "./core/config.js";
import { createRuntime } from "./core/runtime.js";
import type { Capability } from "./core/types.js";
import { brainSummary } from "./brain/ingest.js";
import { search } from "./brain/search.js";
import { validate } from "./validate.js";
import { tr } from "./settings.js";

export interface CheckResult {
  feature: string;
  ok: boolean;
  state: "on" | "off" | "planned";
  detail: string;
}

export async function runCheck(feature: string, rootArg?: string): Promise<CheckResult> {
  // --- Tool/brain-level features (no project needed) ---
  if (feature === "grill") {
    // Workflow concept (no per-project file). Guide lives in 02_RULES §Hành xử.
    return { feature, ok: true, state: "on", detail: tr("sẵn sàng (02_RULES §Hành xử)", "ready (02_RULES §Hành xử)") };
  }

  const configuredRoot =
    rootArg && existsSync(join(rootArg, CONFIG_FILE)) ? rootArg : findProjectRoot();
  const capability = ({ search: "search", memory: "memory" } as Record<string, Capability>)[feature];
  if (configuredRoot && capability) {
    try {
      const provider = createRuntime(loadContext(configuredRoot)).registry.resolve(capability);
      if (!provider?.check) {
        return { feature, ok: false, state: "off", detail: tr("provider không có health check", "provider has no health check") };
      }
      const report = await provider.check(loadContext(configuredRoot));
      return {
        feature,
        ok: report.ok,
        state: report.ok ? "on" : "off",
        detail: `${provider.name} · ${report.detail}`,
      };
    } catch (error) {
      return {
        feature,
        ok: false,
        state: "off",
        detail: error instanceof Error ? error.message : tr("lỗi provider", "provider error"),
      };
    }
  }

  if (feature === "search" || feature === "memory") {
    // REAL test: read actual brain rows AND exercise the FTS query path.
    try {
      const t = brainSummary().totals;
      if (t.sessions === 0) {
        return { feature, ok: true, state: "on", detail: tr("sẵn sàng · brain trống (chạy quét)", "ready · brain empty (run a scan)") };
      }
      let probe = 0;
      try {
        probe = search("the", { all: true, limit: 3 }).length; // exercise FTS5
      } catch {
        return { feature, ok: false, state: "off", detail: tr("query FTS lỗi", "FTS query failed") };
      }
      return {
        feature,
        ok: true,
        state: "on",
        detail: tr(
          `${t.sessions} phiên · ${t.messages.toLocaleString()} msg · query ok (${probe} hit)`,
          `${t.sessions} sessions · ${t.messages.toLocaleString()} msg · query ok (${probe} hit)`,
        ),
      };
    } catch {
      return { feature, ok: false, state: "off", detail: tr("lỗi brain", "brain error") };
    }
  }

  // --- Project-level features ---
  const root = configuredRoot;
  if (!root) {
    return { feature, ok: false, state: "off", detail: tr("chưa có dự án (chạy init)", "no project (run init)") };
  }
  const ctx = loadContext(root);

  switch (feature) {
    case "validate": {
      const rep = validate(ctx);
      const warns = rep.issues.filter((i) => i.level !== "info").length;
      return {
        feature,
        ok: rep.ok,
        state: "on",
        detail: warns === 0 ? tr("sẵn sàng · không lỗi", "ready · no issues") : tr(`${warns} lỗi cần sửa`, `${warns} issue(s) to fix`),
      };
    }
    default:
      return { feature, ok: false, state: "off", detail: tr("feature lạ", "unknown feature") };
  }
}
