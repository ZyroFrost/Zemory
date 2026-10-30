---
id: Slot_108
aka: 03-108
name: .venv
version: 6
path: .venv/ · backend/.venv/
---
# Venv_108_Venv .venv — a repo's own Python environment

## Role

`.venv/` is the Python environment of ONE repo, kept inside it: the repo's own interpreter link and libraries, built by a tool from
the repo's dependency file. It is the CHOICE beside the shared way, as `.env` sits beside the machine vault:

| way | where | when |
|---|---|---|
| shared (default) | `<data root>\Software\Dev\Python\<version>\App\` (`Software_149_Program`); the repo declares `{"python": "<version>"}` in `config/runtime.json` | the repo runs with the libraries every repo on that version shares |
| own (`.venv/`) | `<repo>\.venv\` | the repo needs a library version the shared version does not hold, or ships as an app with its own pinned set (an app's backend) |

A repo uses one of the two ways, never both: a repo with `.venv/` declares no shared version, and its launchers run
`.venv\Scripts\python.exe`.

## Inside

- What the tool builds (`python -m venv` · `uv venv`): `pyvenv.cfg` · `Scripts\` (Windows) or `bin\` · `Lib\site-packages\`.
  Nothing is written into it by hand; it is rebuilt from the repo's dependency file (`requirements.txt` · `pyproject.toml`), so
  deleting it loses nothing.
- An app whose backend has its own dependency file keeps it beside that file (`backend/.venv/`).

## Rules

- Never in git and never synced (`Root_085_Gitignore` · `Root_141_Stignore`): it is built per machine and holds absolute paths.
- A second machine rebuilds it from the dependency file; it is never copied between machines.

## Check

- `.gitignore` of the repo names `.venv/`.
- A repo has `.venv/` and also declares a shared version in `config/runtime.json` ⇒ one of the two is removed.
