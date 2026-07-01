import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { installCodexHooks, installHooks } from "../dist/hooks.js";
import { tempDir } from "./helpers.mjs";

test("Claude and Codex hook installers merge safely and are idempotent", (t) => {
  const root = tempDir(t, "zemory-hooks-");
  const claudePath = join(root, ".claude", "settings.json");
  const codexHooksPath = join(root, ".codex", "hooks.json");
  const codexConfigPath = join(root, ".codex", "config.toml");
  mkdirSync(join(root, ".claude"), { recursive: true });
  mkdirSync(join(root, ".codex"), { recursive: true });
  writeFileSync(claudePath, JSON.stringify({ env: { KEEP: "yes" } }));
  writeFileSync(codexHooksPath, `\uFEFF${JSON.stringify({ hooks: { SessionStart: [] } })}`);
  writeFileSync(codexConfigPath, "model = \"test\"\n\n[features]\njs_repl = false\n");

  installHooks(claudePath);
  installCodexHooks(codexHooksPath, codexConfigPath);
  const secondClaude = installHooks(claudePath);
  const secondCodex = installCodexHooks(codexHooksPath, codexConfigPath);

  const claude = JSON.parse(readFileSync(claudePath, "utf8"));
  const codex = JSON.parse(readFileSync(codexHooksPath, "utf8"));
  const config = readFileSync(codexConfigPath, "utf8");
  assert.equal(claude.env.KEEP, "yes");
  assert.equal(claude.hooks.Stop[0].hooks[0].command, "zemory hook stop");
  assert.equal(codex.hooks.Stop[0].hooks[0].command, "zemory hook stop");
  assert.equal((config.match(/codex_hooks = true/g) ?? []).length, 1);
  assert.deepEqual(secondClaude.present, ["Stop"]);
  assert.deepEqual(secondCodex.present, ["Stop"]);
});
