---
id: Slot_102
aka: 03-102
name: secrets
version: 6
path: data/secrets/
from: _Store/02_STRUCTURE/_Slot/Data_102_Secrets @v6 #2a6db3b027ce
---
# Data_102_Secrets secrets — every secret of the repo: keys · tokens · the encrypted vault

- Role: the ONE place for the repo's secrets (`Rule_Gate_21_WhatEntersGit`):
  - `data/secrets/<key · token · salt · bundle>`;
  - `data/secrets/vault/` — the encrypted vault (`*.sec` · `*.dpapi`), the vault tool reads and writes here;
  - the one exception: `.env` at the repo root, because the tools read it only there.
- Each secret file name is declared in the `File` column of the secrets table in the constitution frame `Cons_Gate_14_Access`; the guard blocks that file from a commit.
- May hold / may not hold: no code (the app's encryption code is in `backend/src/vault/`) · no second secrets folder, not even
  outside the repo tree (`.vault/` at the root is the old form, moved into `data/secrets/vault/`).
- `.gitignore` blocks `/data/`; secrets reach another machine through the sync channel, never through git.
