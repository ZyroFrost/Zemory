// Per-feature checks — the REAL test behind each green tick. A feature is only
// "on" if its check actually passes (not hardcoded).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_FILE, findProjectRoot, loadContext } from "./core/config.js";
import { createRuntime } from "./core/runtime.js";
import type { Capability } from "./core/types.js";
import { memorySummary } from "./memory/ingest.js";
import { openMemory } from "./memory/db.js";
import { search } from "./memory/search.js";
import { validate } from "./docs/validate.js";
import { tr } from "./settings.js";

export interface CheckResult {
  feature: string;
  ok: boolean;
  state: "on" | "off" | "planned" | "warn";
  detail: string;
}

export async function runCheck(feature: string, rootArg?: string): Promise<CheckResult> {
  const configuredRoot =
    rootArg && existsSync(join(rootArg, CONFIG_FILE)) ? rootArg : findProjectRoot();

  // --- Tool/memory-level features (no project needed) ---
  if (feature === "grill") {
    // Real check: the grill playbook must actually be present in 04_SKILLS.
    const root = configuredRoot;
    if (!root) return { feature, ok: true, state: "on", detail: tr("sẵn sàng (playbook toàn cục)", "ready (global playbook)") };
    const skills = join(loadContext(root).docsDir, "04_SKILLS.md");
    if (!existsSync(skills)) {
      return { feature, ok: false, state: "off", detail: tr("thiếu 04_SKILLS.md", "04_SKILLS.md missing") };
    }
    const hasGrill = /##\s*grill/i.test(readFileSync(skills, "utf8"));
    return hasGrill
      ? { feature, ok: true, state: "on", detail: tr("sẵn sàng (04_SKILLS §grill)", "ready (04_SKILLS §grill)") }
      : { feature, ok: false, state: "off", detail: tr("04_SKILLS thiếu §grill", "04_SKILLS has no §grill") };
  }

  // 'memory' covers both keyword search and recall (one memory, one check).
  const capability = ({ memory: "memory" } as Record<string, Capability>)[feature];
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

  if (feature === "memory") {
    // REAL test: read actual memory rows AND exercise the FTS query path. search()
    // swallows FTS errors and returns [], so a probe of 0 can't detect a dropped
    // index — assert the FTS tables exist directly instead of trusting the probe.
    try {
      const t = memorySummary().totals;
      if (t.sessions === 0) {
        return { feature, ok: true, state: "on", detail: tr("sẵn sàng · memory trống (chạy quét)", "ready · memory empty (run a scan)") };
      }
      const db = openMemory();
      let ftsOk: boolean;
      try {
        ftsOk =
          (db
            .prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name IN ('messages_fts','messages_fts_tri')")
            .get() as { c: number }).c === 2;
      } finally {
        db.close();
      }
      if (!ftsOk) {
        return { feature, ok: false, state: "off", detail: tr("thiếu index FTS (chạy memory scan)", "FTS index missing (run memory scan)") };
      }
      const probe = search("the", { all: true, limit: 3 }).length; // exercise FTS5
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
      return { feature, ok: false, state: "off", detail: tr("lỗi memory", "memory error") };
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
      // Colour from the REAL result: green only when it passes, amber for
      // warnings, red on failure. Previously hardcoded "on" → always green even
      // with issues underneath.
      return {
        feature,
        ok: rep.ok,
        state: rep.ok ? (warns === 0 ? "on" : "warn") : "off",
        detail: warns === 0 ? tr("sẵn sàng · không lỗi", "ready · no issues") : tr(`${warns} lỗi cần sửa`, `${warns} issue(s) to fix`),
      };
    }
    default:
      return { feature, ok: false, state: "off", detail: tr("feature lạ", "unknown feature") };
  }
}
