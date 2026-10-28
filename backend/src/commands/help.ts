// `zemory` / `zemory help` — top-level usage. `zemory <command> --help` — refused with that command's usage line.
export function cmdHelp(only?: string): void {
  const lines = usageLines();
  if (only) {
    const at = lines.findIndex((l) => l.startsWith(`  ${only} `));
    console.log(`zemory ${only}: unknown flag --help — nothing was run. Full list: \`zemory help\`.`);
    console.log(`  usage: ${at >= 0 ? lines[at].trim() : "zemory help"}`);
    return;
  }
  console.log(lines.join("\n"));
}

function usageLines(): string[] {
  return (
    [
      "zemory <command>",
      "",
      "  init      set up the harness here (non-destructive; --fresh keeps old docs aside; --kit <no> assembles a kit from the parts store)",
      "  sync      bring this repo up to its set from HS; a workspace manager goes on to every repo it manages (--self: this repo only)",
      "  migrate   analyze existing docs for brownfield adopt (no changes)",
      "  doctor    quick check (text): wired? docs? features?",
      "  ui        open a small status window (app-mode; --no-window = serve only)",
      "  archive   move old 06_CHANGES blocks to docs/archive/ when over threshold",
      "  validate  check docs (.md), links, changelog retention, and supersede",
      "  conform   score how closely this repo follows the declared folder standard (--gate)",
      "  sweep     close leftover browser processes zemory started (--dry-run · --all · --json)",
      "  tidy      what this session left behind, from its transcript - the 12 rows of session-close step 3b (--session <id> · --apply · --json)",
      "  paths     paths check: dead file paths in docs/config, judged only under declared roots (--gate = newly dead) · paths sweep · paths fix [--apply] (propose/repair unique-name targets)",
      "  selfupdate  pull + rebuild this zemory install; a local edit the update also changes is asked about (--keep-local · --take-new); --check only measures origin",
      "  reindex   rebuild the docs search index from .md (read-only; never writes .md)",
      "  todo      todo verify: re-measure every 05_TODO item against the code, print drift",
      "  docs      docs search-index: ls (.md is the SOURCE — edit files, then reindex)",
      "  plan      search project specs (.md is source; DB = index): ls · show · search",
      "  changelog changelog (.md is source; DB = index): ls · search",
      "  memory     scan/search the global memory (memory scan | search | show)",
      "  mcp       run the local MCP stdio server (memory_search/show, plan_search/show)",
      "  hook      runtime hooks: install for Claude/Codex · session-start · stop",
      "  project   project move <from> <to> [--apply]: move a repo folder with its memory, Claude Code sessions and settings (dry run by default)",
      "  peers     which local session to message per repo: title ↔ address, ★ = send here (--repo · --json · --check = title gate)",
      "  gates     does each repo RUN its gates: guard wired · pre-commit wired · a row per constitution article · ungated rules on top (--all · --json · --write-top = write the top block here)",
      "  impact    impact <part>: every repo carrying a store part (law · slot · skill) and its copy state (current · behind · edited · absent) - run before editing or retiring it in the store",
      "  store     store assemble: rebuild every set folder from HS - run after changing a part, commit the part with the sets it changed",
      "  grill     interrogate the plan before building (workflow)",
      "  graph     code-graph queries: impact <file> · callers <symbol> · fitness [--gate]",
      "  structure print the standard harness structure (target to conform to)",
      "  setup     print the full setup & completion runbook",
      "  --version print version",
    ]
  );
}

