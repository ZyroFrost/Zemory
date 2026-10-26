---
id: Slot_102
aka: 03-102
name: secrets
version: 7
path: data/secrets/
---
# Data_102_Secrets secrets — the secrets of the repo's own product: keys · tokens · the encrypted vault

- Role: the ONE place for the secrets that belong to this repo's own product (`Rule_Gate_21_WhatEntersGit` step 3b):
  - `data/secrets/<key · token · salt · bundle>`;
  - `data/secrets/vault/` — the encrypted vault (`*.sec` · `*.dpapi`), the vault tool reads and writes here;
  - the one exception: `.env` at the repo root, because the tools read it only there.
- Not here: a login to a system that a program or an agent uses (a database login, an ssh key, an API account) — it lives once in
  the machine's `_ConfigVault/<tool>/credentials/` (`ConfigVault_151_ConfigVault`), shared by every repo that uses it; the repo
  names the vault entry, never copies it here.
- Each secret file name is declared in the `File` column of the secrets table in the constitution frame `Cons_Gate_14_Access`; the guard blocks that file from a commit.
- May hold / may not hold: no code (the app's encryption code is in `backend/src/vault/`) · no second secrets folder inside the repo
  (`.vault/` at the root is the old form, moved into `data/secrets/vault/`).
- `.gitignore` blocks `/data/`; secrets reach another machine through the sync channel, never through git.
