---
id: Slot_108
aka: 03-108
name: .venv
version: 7
path: .venv/ · backend/.venv/
from: _Store/02_STRUCTURE/_Slot/Venv_108_Venv @v7 #50c0b0edc074
---
# Venv_108_Venv .venv — reserve Python environment of a repo cut off from the system

## Role

`.venv/` is a RESERVE slot. Python follows the same law as every shared thing: what all repos use lives in ONE shared place,
what belongs to one repo alone lives in that repo, and the copy a repo would need if it were cut off from the shared place is a
reserve slot that stays unused while the repo runs inside the system.

| way | where | used by |
|---|---|---|
| shared — the ONLY way inside the system | `<data root>\Software\Dev\Python\<version>\App\` (`Software_149_Program`); the repo declares `{"python": "<version>"}` in `config/runtime.json` and runs through `bin\_python.cmd` | EVERY repo that runs inside the system: department repos, the data warehouse, workspace managers, apps (an app's backend included) |
| reserve — `.venv/` (this slot) | `<repo>\.venv\` | ONLY a repo cut off from the system |

**Cut off from the system** means the repo runs where the shared tree does not exist: a team repo cloned and run by other
people on their own machines, or an app handed to a machine that has no `Software\Dev\Python\`. A repo that runs on a machine of
the system (work PC, VM, server) is never cut off, whatever it is (app or not), so it has no `.venv/`.

Not a reason to use `.venv/`:
- "The app needs its own pinned libraries." — Libraries are pinned per Python version, one version of each library
  (`Software_149_Program`). A library the version does not hold is added to that version's pinned list.
- "Two repos need different versions of one library." — Install a NEW Python version as a NEW sibling folder
  (`Software\Dev\Python\3.12.11\`) with its own pinned list; the repo that needs the other library version changes its one line
  in `config/runtime.json`. Never a venv, never a sub-folder under an existing version.
- "It is quicker to build." — Convenience never opens the reserve slot.

## Steps

**A repo inside the system that still has `.venv/` (moving it to the shared way):**
1. Write `config/runtime.json` `{"python": "<version>"}` and install `bin/_python.cmd` (both come from HS through `installs:` of
   the repo's structure).
2. Compare the repo's dependency file (`requirements.txt` · `pyproject.toml`) with `python_<version>.txt` of that version. Add each
   missing library to the pinned list and install it into the shared version. A library pinned at another version in the list ⇒
   run the repo's tests on the pinned one; red because of that library ⇒ the repo needs a new Python version (above).
3. Point every launcher and script at `bin\_python.cmd` (no `.venv\Scripts\python.exe`, no bare `python`, no `py`).
4. Run the repo's tests and its real start with the shared version. Green ⇒ delete `.venv/`.

**A repo that really is cut off (reserve slot in use):**
1. Build `.venv/` from the repo's dependency file with the tool it names (`python -m venv .venv` · `uv venv`), then install the
   dependency file into it.
2. The repo has no `config/runtime.json` Python line: one repo uses one way, never both.
3. The repo states in its `AGENTS.md` that it runs cut off and why (who runs it, on which machines).

## Inside

- What the tool builds: `pyvenv.cfg` · `Scripts\` (Windows) or `bin\` · `Lib\site-packages\`. Nothing is written into it by hand;
  it is rebuilt from the dependency file, so deleting it loses nothing.
- An app whose backend has its own dependency file keeps it beside that file (`backend/.venv/`).

## Rules

- Never in git and never synced (`Root_085_Gitignore` · `Root_141_Stignore`): it is built per machine and holds absolute paths.
- A second machine rebuilds it from the dependency file; it is never copied between machines.

## Check

- `.gitignore` of the repo names `.venv/`.
- A repo has `.venv/` and also declares a shared version in `config/runtime.json` ⇒ delete `.venv/` (steps above).
- A repo has `.venv/`, no `config/runtime.json`, and its `AGENTS.md` does not say it runs cut off ⇒ it is a repo inside the
  system on the wrong way: move it to the shared way (steps above).
