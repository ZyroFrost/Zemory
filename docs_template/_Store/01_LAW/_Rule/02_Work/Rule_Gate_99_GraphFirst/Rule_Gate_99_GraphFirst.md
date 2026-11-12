---
id: Rule_99
name: graph-first
version: 1
kind: action
code: 02_Work
checked: [Rule_Keys_80_SharedChangeImpact, Rule_Keys_81_FollowExistingPattern, Rule_Gate_59_ReadFirst]
---
# Rule_Gate_99_GraphFirst — Ask the code graph before grepping the code or changing a file

## What
Where zemory is present, the code graph answers who uses a file, what it imports and how far a change reaches, in one call. The
agent asks it before changing an existing source file and before searching the code for its dependencies. Rounds of grep and
file reads for a question the graph answers are a fault.

## When
- About to change an existing source file (`.ts .tsx .js .jsx .mjs .cjs .py .sh .java .go .rs .cs`) that is not a test.
- About to search the code for who calls, imports or depends on something.

## Do
1. Before changing a source file, call `graph_impact` with the file (zemory MCP, answered from the saved graph) or run
   `zemory graph impact <file>`. Read the importers, the transitive importers and whether the file is a hub.
2. Handle every importer the graph lists (`Rule_Keys_80_SharedChangeImpact`).
3. To walk the structure, use `graph_neighbors` one hop at a time instead of opening several files.
4. Keep grep for text that is not a dependency: a message, a string, a setting, a log line.
5. The graph has no answer (a file type it does not read, a repo without code) ⇒ say so and use grep.

## Example
- Situation: the agent is asked to change the signature of a function in `src/db/queries.ts`.
- ✗ Wrong: run `grep -rn "queries" src/` three times, open five files, change the function, miss an importer in another folder.
- ✓ Right: `graph_impact {"file": "src/db/queries.ts"}`, read the importers it lists, change the function and every importer.

## Check
- Hook: the first change of an existing source file the session has not asked the graph about is blocked once, with the exact
  call to run; the same call retried passes. A recursive grep over the code of a repo with code is blocked once per session the
  same way. A graph call already in the session transcript lets both through.
- Keyword reminder: a request to change, refactor or trace code shows this law.

## Links · Liên kết
- Related · Liên quan: `Rule_Keys_80_SharedChangeImpact` — the list of places a change reaches · danh sách nơi một thay đổi chạm tới
- Related · Liên quan: `Rule_Keys_81_FollowExistingPattern` — read how the code is used before adding to it · đọc cách code đang được dùng trước khi thêm
