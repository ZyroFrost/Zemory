// `zemory` / `zemory help` — top-level usage.
export function cmdHelp(): void {
  console.log(
    [
      "zemory <command>",
      "",
      "  init      set up the harness here (non-destructive; --fresh keeps old docs aside)",
      "  sync      gap-fill missing template docs vs the standard",
      "  migrate   analyze existing docs for brownfield adopt (no changes)",
      "  doctor    quick check (text): wired? docs? features?",
      "  ui        open a small status window (app-mode; --no-window = serve only)",
      "  archive   move old 06_CHANGES blocks to docs/agent/archive/ when over threshold",
      "  validate  check docs (.md), links, changelog retention, and supersede",
      "  selfupdate  pull + rebuild this zemory install (stops if the tree is dirty)",
      "  reindex   rebuild the docs search index from .md (read-only; never writes .md)",
      "  todo      todo verify: re-measure every 05_TODO item against the code, print drift",
      "  docs      docs search-index: ls (.md is the SOURCE — edit files, then reindex)",
      "  plan      search project specs (.md is source; DB = index): ls · show · search",
      "  changelog changelog (.md is source; DB = index): ls · search",
      "  memory     scan/search the global memory (memory scan | search | show)",
      "  mcp       run the local MCP stdio server (memory_search/show, plan_search/show)",
      "  hook      runtime hooks: install for Claude/Codex · session-start · stop",
      "  grill     interrogate the plan before building (workflow)",
      "  graph     code-graph queries: impact <file> · callers <symbol> · fitness [--gate]",
      "  structure print the standard harness structure (target to conform to)",
      "  setup     print the full setup & completion runbook",
      "  --version print version",
    ].join("\n"),
  );
}

