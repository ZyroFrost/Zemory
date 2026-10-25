---
id: Host_CLI
name: host-cli
version: 3
kind: host
---
# CLI The CLI host — the agent runs in a terminal

- Scope: the agent runs in a terminal, opened at the project folder.
- Opening a project: open a terminal at the project root → run the agent → paste the set's bootstrap line (a Memory set: `zemory init --kit <no>`).
- Sets that can be assembled: Basic and Memory sets.
- Environment check (doctor):
  - Node ≥ 20 and Git on PATH;
  - Memory set: the `zemory` command on PATH, `zemory doctor` green in the project folder;
  - a session may move its working folder down to a sub-folder: the hook command is anchored on `CLAUDE_PROJECT_DIR`, so the guard still runs.
