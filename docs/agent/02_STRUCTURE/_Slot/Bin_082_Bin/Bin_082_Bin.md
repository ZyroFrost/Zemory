---
id: Slot_82
aka: 03-82
name: bin
version: 4
path: bin/
from: _Store/02_STRUCTURE/_Slot/Bin_082_Bin @v4 #04aaa29ebee7
---
# Bin_082_Bin bin — CLI entry / launchers

- Role:
  - APP repo: the CLI entry by npm convention: `bin/<name>` → `dist/cli.js`.
  - NON-APP repo: LAUNCHERS typed by hand (`.cmd`/`.sh`) — `bin/<name>.cmd`: `<name> <stage>` dispatches · `<name> auto` = gate 00 (exit-code gate) → runs the chain of stages when ready. Recurring cases use their launcher here.
  - A clean repo root: launchers go in `bin/`, not at the root. A deliberate trade-off: type `bin\<name> pull` instead of `<name> pull`.
- May hold / may not hold:
  - Launchers are PURE ASCII — Vietnamese diacritics break cmd.exe's parsing.
  - Never put `>` in a `rem` line — cmd still redirects ⇒ an empty file appears.
