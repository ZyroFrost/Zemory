---
id: Rule_21
aka: 02-21
name: what-enters-git
version: 13
kind: action
code: 03_Safety
from: _Store/01_LAW/_Rule/03_Safety/Rule_Gate_21_WhatEntersGit @v13 #232f9d91c5bd
---
# Rule_Gate_21_WhatEntersGit — What never enters git

## What
Three things never go into git: real secrets, real data, and heavy binaries without LFS. Tracked files only name where a secret is
read from (an environment variable or a vault entry), never its value. A secret has exactly one home, chosen by whose it is: a
login to a system lives in the machine's `_ConfigVault`; a secret of one repo's own product lives in that repo's `data/secrets/`.

## When
- About to stage or commit a file.
- Writing a setting that needs a password, key or connection string.
- Adding data or a heavy binary file to the repo.

## Do
1. Real secrets (password · key · connection string · vault · `.env`) never go into git, encrypted or not.
2. A tracked file (`config/` · `*.example.*` · `.env.example`) names only where the value is read from (an environment variable such
   as `password_env`, or a login's key in the vault such as `DB_MAIN_LOGCENTRAL_READER_PASS` in `_ConfigVault/sql/credentials/logins.env`), never the value.
3. One home per secret, by whose it is:
   a. A login to a system that a program or an agent uses — a database login, an ssh key, an API account, a VPN profile — lives in
      `_ConfigVault/<tool>/credentials/` (`ConfigVault_151_ConfigVault`), one copy for the whole machine, shared by every repo that
      uses that login. Scripts read it at run time and never print it or copy it into a repo.
   b. A secret that belongs to one repo's own product only (its encryption key, its app's own vault) lives in that repo's
      `data/secrets/` (the encrypted vault in `data/secrets/vault/`), blocked by `.gitignore`. `.env` at the root is allowed because
      tools read it there.
   c. No third place: no copy of a vault login inside a repo, no secret folder anywhere else.
4. To another machine: a repo's `data/secrets/` goes through the sync channel; `_ConfigVault` is never synced and goes by hand over a
   safe path. Never through git.
5. Real data (sources · extracts · customer data) never goes into git. The repo keeps only small fake samples, enough to open the
   product. Where: the data and sample slots of `02_STRUCTURE`.
6. Heavy binaries (`.pbix` · `.twb` · `.fig` · `.psd` · models) are not committed directly; they follow the LFS lines in
   `.gitattributes`.

## Example
- Situation: a job in the log repo needs the read-only SQL login that the warehouse server gave it; two other repos use the same
  login.
- ✗ Wrong: write the connection string with the password into a committed config file; or put a copy of the password in the
  `data/secrets/` of each of the three repos, so changing it means finding every copy.
- ✓ Right: the password sits once, on the line `DB_MAIN_LOGCENTRAL_READER_PASS=` of `_ConfigVault/sql/credentials/logins.env`; the config of
  each repo names the login and the server; the job reads it at run time.

## Check
- The pre-commit check blocks a file with a secret name (`secretNames`) from being staged, also for commits made by a person.
- A hook blocks a write that puts a secret VALUE into a tracked code or setting file (a literal password · a connection string with
  a password · a private key · a cloud access key); the pre-commit check looks for the same patterns in the staged diff. Passed: a
  value read from an environment variable · a placeholder (`<password>` · `changeme`) · `.env` · `data/secrets/` · `.md` text.
  Test files: one reminder per session (fake passwords are normal). Secrets have no flag.
- `_ConfigVault` is outside every repo, so git never sees it; writing there is a write outside the project (`Rule_Gate_44_RepoScope`).
- Whether a secret sits in the right one of the two homes is judgment.

## Links · Liên kết
- Repo declares · Repo khai: `Cons_Gate_14_Access` — the repo declares its secrets and access · repo khai bí mật và quyền truy cập
- Related · Liên quan: `ConfigVault_151_ConfigVault` — the machine's vault, home of logins · két của máy, nhà của thông tin đăng nhập
- Implements · Thi hành: `Skill_Harness_SyncPath` — secrets to a second machine · bí mật sang máy thứ hai
