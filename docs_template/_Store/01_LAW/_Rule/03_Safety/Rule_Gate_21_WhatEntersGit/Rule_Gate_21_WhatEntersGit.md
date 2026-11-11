---
id: Rule_21
aka: 02-21
name: what-enters-git
version: 16
kind: action
code: 03_Safety
---
# Rule_Gate_21_WhatEntersGit — What never enters git

## What
Three things never go into git: real secrets, real data, and heavy binaries without LFS. Tracked files only name where a secret is
read from (an environment variable or a vault entry), never its value. A secret has exactly one home, chosen by whose it is: a
login to a system, and every secret that is a FILE, lives in the machine's `_ConfigVault`; a text secret of one repo alone lives in
that repo's `.env` — the repo's ONE private home.

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
   b. A text secret that belongs to one repo alone (the password of one department's workbook, a key only its product uses) lives
      in that repo's `.env` at the root, blocked by `.gitignore` — the ONE private home of a repo; code reads it by name
      (`vault_conn.private(<NAME>)`).
   c. A secret that is a FILE (a certificate, a `.pvk` / `.pem` key, a token file) lives in the machine vault, shared ones in
      `_ConfigVault/tls/`, one repo's own in `_ConfigVault/certs/<repo>/`; `.env` holds nothing about it.
   d. No other place: no secret folder inside a repo (`data/secrets/` is retired), no per-repo encrypted vault, no copy of a
      vault login inside a repo.
4. To another machine: a repo's `.env` is carried only as the `secrets` of a deploy manifest; `_ConfigVault` is never synced and
   goes by hand over a safe path (`scp`). Never through git.
5. Real data (sources · extracts · customer data) never goes into git. The repo keeps only small fake samples, enough to open the
   product. Where: the data and sample slots of `02_STRUCTURE`.
6. Heavy binaries (`.pbix` · `.twb` · `.fig` · `.psd` · models) are not committed directly; they follow the LFS lines in
   `.gitattributes`.
7. A secret the person must supply ⇒ open a window of its own where the person pastes it straight into its home (3a-3c); the
   agent never asks for the value, never sees it and never echoes it.

## Example
- Situation: a job in the log repo needs the read-only SQL login that the warehouse server gave it; two other repos use the same
  login.
- ✗ Wrong: write the connection string with the password into a committed config file; or put a copy of the password in the
  `.env` of each of the three repos, so changing it means finding every copy.
- ✓ Right: the password sits once, on the line `DB_MAIN_LOGCENTRAL_READER_PASS=` of `_ConfigVault/sql/credentials/logins.env`; the config of
  each repo names the login and the server; the job reads it at run time.

## Check
- The pre-commit check blocks a file with a secret name (`secretNames`) from being staged, also for commits made by a person.
- A hook blocks a write that puts a secret VALUE into a tracked code or setting file (a literal password · a connection string with
  a password · a private key · a cloud access key); the pre-commit check looks for the same patterns in the staged diff. Passed: a
  value read from an environment variable · a placeholder (`<password>` · `changeme`) · `.env` · `.md` text.
  Test files: one reminder per session (fake passwords are normal). Secrets have no flag.
- `_ConfigVault` is outside every repo, so git never sees it; writing there is a write outside the project (`Rule_Gate_44_RepoScope`).
- Whether a secret sits in the right one of the two homes (`_ConfigVault` · `.env`) is judgment.

## Links · Liên kết
- Repo declares · Repo khai: `Cons_Gate_14_Access` — the repo declares its secrets and access · repo khai bí mật và quyền truy cập
- Related · Liên quan: `ConfigVault_151_ConfigVault` — the machine's vault, home of logins · két của máy, nhà của thông tin đăng nhập
- Implements · Thi hành: `Skill_Harness_SyncPath` — secrets to a second machine · bí mật sang máy thứ hai
