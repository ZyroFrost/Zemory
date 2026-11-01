---
id: Slot_93
aka: 03-93
name: .env
version: 5
path: .env
---
# Root_093_Env .env — the repo's ONE private home of secrets

- Role:
  - The ONE place for what belongs to this repo alone (`Rule_Gate_21_WhatEntersGit` step 3b): a text secret only this repo uses (a
    department's workbook password · a key only its product uses) and its private settings. GITIGNORED.
  - Not here: a login to a system or anything several repos use (machine vault `ConfigVault_151_ConfigVault`); a secret that is a
    FILE (certificate · key · token file ⇒ `_ConfigVault/certs/<repo>/`). No second private place in the repo: no `data/secrets/`,
    no encrypted vault of the repo.
  - Code reads a private secret by name with `vault_conn.private(<NAME>)` (skill `Skill_Task_VmAutomation`), never printing it.
  - `config/` and `sources/` point at a secret by its env NAME (`password_env`), never holding the value.
  - The template `.env.example` is tracked at the root (the tool forces it).
