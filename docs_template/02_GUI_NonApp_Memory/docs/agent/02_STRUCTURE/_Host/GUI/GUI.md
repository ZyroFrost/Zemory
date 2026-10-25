---
id: Host_GUI
name: host-gui
version: 3
kind: host
from: _Store/02_STRUCTURE/_Host/GUI @v3 #e42e8032e0dc
---
# GUI The GUI host — the agent runs in a stand-alone app

- Scope: the agent runs in a separate desktop app, and a project is opened by picking a folder in the app. Named by the kind of
  environment; a new app of the same kind joins this host, no new host is added.
- Opening a project: create a project → add the project folder → allow commands in that folder → pick a model → paste the set's bootstrap line.
- A chat that runs in the app's virtual machine cannot call commands on the real machine: no Memory set is assembled from there; it only reads Global Memory through
  MCP (`zemory setup mcp`).
- Sets that can be assembled: a Basic set (needs no zemory install); a Memory set once the machine has zemory installed.
- Environment check (doctor):
  - the base permissions `permissions.deny` / `ask` in `.claude/settings.json` block on a bare machine, without any runtime;
  - a Node hook runs only where the machine has Node — without Node the host lets it through without a word ⇒ a Basic set carries no Node hook;
  - a hook blocks with the JSON `permissionDecision: "deny"`; exit code 2 is only a fallback (on a machine without Git, exit code 2 does not block).
