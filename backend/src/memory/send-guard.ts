// PreToolUse latch for cross-session messaging (`SendMessage`) — user ruling 2026-10-07:
// "phải gọi vào session đang hoạt động, ko dc gọi mấy cái session Untitle mặc định nữa".
//
// Why a machine latch and not only the 02_RULES sentence: the user's words, the same day — "agent quên quài".
// Measured when the rule was set: 8 sessions open, 3 repos holding TWO sessions with the same prefix
// (`dept-fa-09`/`dept-fa-6f` · `db-datawarehouse-5e`/`db-datawarehouse-fa`). An auto name is
// `<folder>-<2 hex>`, so an agent looking for "the session in repo X" picks one of them at random.
//
// Why at USER level (~/.claude/settings.json) and not in each repo's guard: messaging crosses repos by nature, and
// each repo's matcher is wired by hand (they differ today) — one missed repo would be an open door.
//
// What it judges: the `to` field only. The hook cannot see `ListAgents`, so "active" is left to the rule text;
// what the machine CAN see is the shape of an auto name.
//   BLOCK  `<slug>-<2 hex>` with or without ` [ref]` — an auto-named ("Untitled") session.
//   PASS   a `uds:` address — that is the `from` of a message just received (it spoke, so it is alive);
//          `main`, an agent id, a teammate name, and any name the user set with `/rename` or `--name`.
// LIMIT: a name the user chose that happens to end in `-<2 hex>` (`kho-1a`) is blocked too — the message says
// to pick a name without that tail.

const AUTO_NAME = /^[a-z0-9][a-z0-9._-]*-[0-9a-f]{2}(\s*\[[0-9a-f]+\])?$/;

/** null = let through; otherwise the reason to block. */
export function judgeSendTarget(to: unknown): string | null {
  const t = typeof to === "string" ? to.trim() : "";
  // A `uds:` reply address can never match: `:` and `\` are outside AUTO_NAME's alphabet (the test pins it).
  if (!t || !AUTO_NAME.test(t)) return null;
  return (
    `BLOCKED (send guard): \`${t}\` is an AUTO-NAMED session (\`<folder>-<2 hex>\`) — often an old window, not the one at work ` +
    "(02_RULES §Phạm vi project, user ruling 2026-10-07).\n" +
    "Message only an ACTIVE session whose name the user set (`/rename <name>` in that session, or `claude --name <name>`). " +
    "Run ListAgents: exactly ONE user-named session for that repo ⇒ send to it; none or several ⇒ do NOT send, tell the user. " +
    "Replying to a message you received? Use its `from` address (`uds:…`) — that always passes."
  );
}
