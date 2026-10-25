---
id: Slot_75
aka: 03-75
name: config
version: 4
path: config/
from: _Store/02_STRUCTURE/_Slot/Config_075_Config @v4 #a37dc8675f1b
---
# Config_075_Config config — config files the operator edits

- Role:
  - Config files the OPERATOR edits (YAML/TOML): connection profiles, server lists; NON-APP repo: workspace/connection profiles. This is the repo-wide SHARED config.
  - Remote server connection profiles: `config/servers.yaml` + `.env` (`password_env`). Connecting a DB: the profile is here. Permission policy files the operator edits are here.
  - One of the 6 kinds of non-code (config = operator files). A clean repo root: config → `config/`.
- May hold / may not hold:
  - `*.example.*` — TRACKED templates, pointing at secrets by env NAME.
  - The REAL `*.yaml` → gitignored (`password_env` → `.env`).
  - `*.local.*` — per-machine overrides → gitignored.
  - Not here: the config of ONE case (→ the root of `tasks/<case>/`) · config code (→ `backend/src/config/`).
