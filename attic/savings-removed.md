# Removed: token-savings ledger (2026-07-06)

The token-savings "benchmark" was removed from the live app because it measured
nothing real:

- **`compress`** events were the only true before/after saving — but compression
  was dropped from scope (its code is in `attic/src/compress/`). No compress
  events are ever logged.
- **`recall`** was never logged as a saving: its benefit is counterfactual, so
  claiming a "% saved" would be fake (see the note kept in `src/brain/search.ts`).
- zemory does **not** read API usage/cost (no provider exposes it usefully), so
  there is no real usage number to show.

Net: `logSavings()` had **no callers**, the `ledger` table stayed empty, and
`zemory brain savings` always printed zeros. Dead surface → removed.

Kept working, untouched: capture is still **0 extra tokens** (hooks read
transcript files, no model call) — that is "free capture", not a measured bill
reduction, and it is not marketed as "savings".

## What was removed (for reference)

- `src/brain/ledger.ts` → moved here as `attic/src/brain/ledger.ts`
  (`estTokens`, `logSavings`, `ledgerSummary`, `LedgerRow`, `LedgerSummary`).

- `src/cli.ts` — the `savings` subcommand + its help line + the
  `import { ledgerSummary }`:

```ts
if (sub === "savings") {
  const s = ledgerSummary();
  console.log("zemory brain savings — token benchmark (≈ chars/4)");
  console.log(`  ${"".padEnd(10)} ${"baseline".padStart(10)} ${"actual".padStart(10)} ${"saved".padStart(10)}`);
  for (const r of [...s.byKind, s.total]) {
    const tag = r.kind === "total" ? "TOTAL" : r.kind;
    console.log(`  ${tag.padEnd(10)} ${String(r.baseline).padStart(10)} ${String(r.actual).padStart(10)} ${(String(r.saved) + ` (-${r.pct}%)`).padStart(10)}`);
  }
  if (!s.total.events) console.log("  (no events yet — use `zemory run` / `compress` on real output)");
  else console.log("  note: only compress counts (real before/after). Recall is not a measurable saving.");
  return;
}
```

- `src/brain/db.ts` — the `ledger` table + index (kept in existing DBs as an
  empty unused table; simply no longer created in the schema):

```sql
CREATE TABLE IF NOT EXISTS ledger (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ts              TEXT,
  kind            TEXT,            -- 'compress' | 'recall'
  project_root    TEXT,
  baseline_tokens INTEGER,
  actual_tokens   INTEGER,
  detail          TEXT
);
CREATE INDEX IF NOT EXISTS idx_ledger_ts ON ledger(ts DESC);
```

- `src/brain/search.ts` — the dead `log?: boolean` SearchOptions field (it only
  gated savings logging, which no longer exists) and the `log: true` args at its
  call sites in `cli.ts` and `ui.ts`.

To restore: move `ledger.ts` back to `src/brain/`, re-add the snippets above, and
re-wire a real source of before/after numbers first.
