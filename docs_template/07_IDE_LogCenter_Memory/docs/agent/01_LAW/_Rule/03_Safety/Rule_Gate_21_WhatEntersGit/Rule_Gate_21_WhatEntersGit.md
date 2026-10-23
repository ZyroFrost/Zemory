---
id: Rule_21
aka: 02-21
name: what-enters-git
version: 11
kind: action
code: 03_Safety
from: _Store/01_LAW/_Rule/03_Safety/Rule_Gate_21_WhatEntersGit @v11 #0c2f82dc8493
---
# Rule_Gate_21_WhatEntersGit — What never enters git

## What
Three things never go into git: real secrets, real data, and heavy binaries without LFS. Tracked files only name an environment
variable; secrets live in one place inside the repo, `data/secrets/`, blocked by `.gitignore`.

## When
- About to stage or commit a file.
- Writing a setting that needs a password, key or connection string.
- Adding data or a heavy binary file to the repo.

## Do
1. Real secrets (password · key · connection string · vault · `.env`) never go into git, encrypted or not.
2. A tracked file (`config/` · `*.example.*` · `.env.example`) names only the environment variable (for example `password_env`),
   never the value.
3. Secrets live in one place inside the repo tree: `data/secrets/` (the encrypted vault in `data/secrets/vault/`), blocked by
   `.gitignore`. The only exception is `.env` at the root, because tools read it there. No secret folder outside the repo tree:
   safety comes from `.gitignore` and the sync scope, not from location. An exception that must sit outside the tree (for example
   a pointer to where data lives) is written in the repo's constitution and holds no secret.
4. To another machine: secrets go through the sync channel, never through git.
5. Real data (sources · extracts · customer data) never goes into git. The repo keeps only small fake samples, enough to open the
   product. Where: the data and sample slots of `02_STRUCTURE`.
6. Heavy binaries (`.pbix` · `.twb` · `.fig` · `.psd` · models) are not committed directly; they follow the LFS lines in
   `.gitattributes`.

## Example
- Situation: a job needs a password to connect to the source database.
- ✗ Wrong: write the connection string with the password into a committed config file; or make a "vault" folder on another drive
  to be safe.
- ✓ Right: the config says only `password_env: DB_SOURCE_PASSWORD`; the real value sits in `data/secrets/`, blocked by
  `.gitignore`; to another machine it goes through the sync channel.

## Check
- The pre-commit check blocks a file with a secret name (`secretNames`) from being staged, also for commits made by a person.
- A hook blocks a write that puts a secret VALUE into a tracked code or setting file (a literal password · a connection string with
  a password · a private key · a cloud access key); the pre-commit check looks for the same patterns in the staged diff. Passed: a
  value read from an environment variable · a placeholder (`<password>` · `changeme`) · `.env` · `data/secrets/` · `.md` text.
  Test files: one reminder per session (fake passwords are normal). Secrets have no flag.

## Links · Liên kết
- Repo declares · Repo khai: `Cons_Gate_14_Access` — the repo declares its secrets and access · repo khai bí mật và quyền truy cập
- Implements · Thi hành: `Skill_Harness_SyncPath` — secrets to a second machine · bí mật sang máy thứ hai
