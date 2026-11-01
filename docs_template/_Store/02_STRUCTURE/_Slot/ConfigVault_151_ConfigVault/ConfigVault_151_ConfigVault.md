---
id: Slot_151
name: configvault
version: 16
path: _ConfigVault/<tool>/ · Workspace/Company/<Org>/_ConfigVault/<tool>/
scope: layout
---
# ConfigVault_151_ConfigVault configvault — the machine's vault of tool settings and keys

## Role

`<data root>\_ConfigVault\` is step 5 of the drive's question chain (`Struc_Disk_Data`) and a shared store of the whole machine:
settings and keys that a PROGRAM or an AGENT reads by itself. Every program and repo that needs a key or a setting points here. One
folder per tool, `_ConfigVault\<tool>\`, so a new machine needs this one folder carried over, and one exclusion rule keeps every
secret out of git, sync and cloud backup.

The fact that splits it from `Documents\`: WHO READS IT. A program or an agent reads it by itself ⇒ here. A person opens and reads it
(a list of web passwords, a wallet phrase) ⇒ `Documents\Profile\Secret\`.

## Two levels

The block law of `Struc_Disk_Data` picks the BLOCK first: a secret of one organisation belongs to that organisation's block, a tool
setting of the machine or its user belongs to the machine. So the vault has two levels with the SAME tree inside, plus the repo:

| Level | Where | Holds |
|---|---|---|
| machine | `<data root>\_ConfigVault\` | the machine's and its user's own tools: `zemory\` · `git\` (personal identity) · tool caches · the root `ssh\config` (with one `Include` per organisation) · `known_hosts` · personal ssh keys |
| organisation | `Workspace\Company\<Org>\_ConfigVault\` | every secret the organisation's repos and apps share: `sql\` · `api\` · `mail\` · `windows\` · `tls\` · `certs\<repo>\` · `vpn\` · `ssh\` (keys + `config` of the organisation's hosts) |
| repo | `.env` at the repo root (`Root_093_Env`) | a text secret of that repo alone |

- A machine owned by ONE organisation (its servers, its VM) has one vault at its data root (`E:\_ConfigVault` · Linux `~/data/_ConfigVault`):
  there the machine block IS the organisation block.
- The name is always `_ConfigVault`; the path says whose it is (as `_Profile` inside an organisation). Never `_ConfigVault_<Org>`.
- Finding the vault, one rule for every machine: `CONFIGVAULT_DIR` if set, else the nearest `_ConfigVault` holding secrets (`sql\` ·
  `api\` · `mail\`) walking UP from the repo, else the Linux data root. The machine vault holds no secrets folder and is skipped; it stays
  at the drive root because the Python launcher finds the data root from it.
- `Workspace\Company\<Org>\` itself is never a synced folder (only each repo inside it may be): the organisation vault is never carried by a
  sync tool, git or a cloud folder; it reaches another machine by `scp`.
- Each vault has its own README: the machine README lists the machine tools, the organisation README lists the logins, apps,
  mailboxes, machines and which entry is carried to which machine.

## Inside

```
_ConfigVault\
├── README.md          the ONE register of the vault (see below)
├── ssh\               machine level: root config (Include per organisation) · known_hosts · personal keys;
│                      organisation level: the keys + config of that organisation's hosts
├── git\  vpn\  zemory\
├── sql\configs\       connections.json: the machine's SHARED connection register (server · database · address · driver · the
│                      account THIS machine uses for that database) — not secret, outside git because it holds internal addresses
├── sql\credentials\   SQL logins programs and agents use: ONE logins.env, a block per server, two lines per login
├── api\credentials\   app · API · webhook secrets: ONE services.env
├── mail\configs\      mailboxes.json · recipients.json — the mail book of every repo (below), contact data, not secret
├── mail\credentials\  the passwords of the sending mailboxes: ONE smtp.env
├── windows\credentials\  Windows accounts of the machines (a scheduler or service credential runs as them): ONE logins.env
├── tls\               certificates shared by several repos or machines
├── certs\<repo>\      secrets that are FILES and belong to one repo (certificate · .pvk / .pem key · token file)
└── <tool>\            one or two files straight; several kinds ⇒ configs\ · credentials\ · cache\
```

- The rule behind it: what several repos or apps use has ONE shared home and ONE name; only what belongs to one repo stays in that
  repo. Shared CODE has one source in HS and reaches each repo by `zemory sync`; shared DATA, SETTINGS and SECRETS live here and
  every repo reads them in place.
- The vault is the ONE home of every env-type secret that a program or an agent uses — SQL logins, app and API secrets, mail
  accounts, shared certificates — and of the shared connection register, for all repos and apps on the machine
  (`Rule_Gate_21_WhatEntersGit` step 3a). No repo and no app keeps its own copy, and no repo holds a connection string or a
  variable of its own for one (`<SYSTEM>_CONN` goes): code asks `vault_conn.py` (skill `Skill_Task_VmAutomation`) for `conn(<machine>, <database>)` and the
  reader builds it from this folder, never printing the secret. What stays in a repo is only its `.env` (`Root_093_Env`, the repo's ONE private home): a text
  business secret one department uses alone (the password of that department's workbook) or a key only that repo's own product
  uses. A secret FILE of one repo lives in `certs\<repo>\` here, never in the repo. An app
  that keeps its server-side copy sealed (systemd credentials on a Linux host) holds a COPY: the source is the vault.
- ONE master vault: the operator's work PC. A machine that runs automation holds a copy of only the entries it needs, in the SAME
  tree and with the same key names; what differs between machines is the content (a work PC's register names the read-only agent
  account, the task machine's names the account its tasks run with). The README table says which entry is carried to which
  machine; the copy is carried over ssh (`scp`), never by a sync tool. A changed password is changed in the master and carried
  again to the machines the README names.
- A login entry holds the secret only; who owns it, what it may do and which repos use it go in the README table of that tool.
- The mail book, `mail\configs\`, is the ONE home of every mailbox and every recipient of every repo — no repo keeps a
  mail list, an address book or a mailbox password of its own. Two files, read in place (contact data: outside git and sync,
  like the rest of the vault):
  - `mailboxes.json` — the mailboxes that send or belong to a person (support · a named staff mailbox): address · who holds it ·
    department · job title · what it is used for · the key name of its password in `mail\credentials\smtp.env`.
  - `recipients.json` — everyone mail is sent to: every store and every recipient of a task, each with address · name ·
    department · job title · store id when it is a store · the groups it belongs to.
  - A task names a mailbox and a group by key; it never copies an address or a password into the repo. Adding or changing a
    mailbox or a recipient goes through the session of the repo that keeps the group's values (the workspace manager).

- `configs\` — settings (readable, not secret) · `credentials\` — keys, tokens, passwords · `cache\` — what the tool rebuilds by
  itself, its logs included; deleting it loses nothing.
- `ssh\`: the machine level keeps the root `config` that ssh reads and `known_hosts`; each organisation's hosts and keys sit in that
  organisation's vault and are pulled in by one `Include <org vault>/ssh/config` line (`IdentityFile` reads a key anywhere). Callers
  use the alias only.
- zemory's `location.json` is read at `%USERPROFILE%\.zemory\location.json`; that folder may be a junction into
  `_ConfigVault\zemory\`. The file only points at the Global Memory folder and holds no secret.

## Naming

- `_ConfigVault` exactly. Tool folders lower case, as the tool's command is called: `git` · `ssh` · `vpn` · `rclone`.
- An ssh alias names the ROLE of the machine: `<org>-<role>` (`acme-dev` · `acme-central` · `acme-log`). Callers use the alias only,
  never a key file name.
- A key file names the REAL machine: `id_<type>_<host name in lower case>` (`id_ed25519_server-dev` · `id_ed25519_acme-data`). The
  host name is measured, not remembered: `ssh <alias> hostname`. A machine renamed ⇒ its key renamed, the alias stays.
- A PERSON's account uses a dot: `name.surname` (`jane.doe`). An account a program or an agent uses takes an UNDERSCORE,
  `<subsystem>_<role>`: `svc_agent` on servers · `datawarehouse_agent` · `erp_agent` · `logcentral_reader`. A dot must be quoted in
  every statement (`[ ]` on SQL Server, `" "` on PostgreSQL) and `adduser` on Debian/Ubuntu refuses it; an underscore works
  everywhere unquoted. File names use underscores or hyphens.
- ONE grammar for every key in the vault: `<MACHINE>_<DATABASE>_<ACCOUNT>_<KIND>`, upper case. Segments are joined by `_`; the
  words inside one segment are joined by `-` (a dot or an underscore inside a name becomes `-`), so a key splits back into its four
  answers:
  - `MACHINE` — the REAL host name, measured (`SELECT SERVERPROPERTY('MachineName')` · `hostname`), never remembered; for a cloud
    service, the service's name (`M365` · `SHOPAPI` · `SMTP-OFFICE365`).
  - `DATABASE` — the real database name; for a service that is not SQL, the resource inside it (the tenant · the shop · the app).
  - `ACCOUNT` — the login, app or mailbox (`jane.doe` ⇒ `JANE-DOE` · `logcentral_reader` ⇒ `LOGCENTRAL-READER`).
  - `KIND` — `ID` (the account name, written in advance) · `PASS` · `TOKEN` · `SECRET` · `TENANT`.
  Examples: `DB-MAIN_ACME-WAREHOUSE_LOGCENTRAL-READER_ID` · `DB-MAIN_ACME-WAREHOUSE_LOGCENTRAL-READER_PASS` ·
  `POS-DB02_POSDATA_JANE-DOE_PASS` · `M365_ACME-COM_SYNC-APP_SECRET`. A login that opens two databases is two keys. A Windows
  account of a machine takes `WINDOWS` as its second segment: `DB-MAIN_WINDOWS_JANE-DOE_PASS`. A mailbox key is read from the
  address: the part before `@` is the account, the domain is the resource ⇒ `SMTP-OFFICE365_<DOMAIN>_<MAILBOX>_PASS`.
- A vault key is read by the vault reader only, never set as an environment variable, so the `-` in it is safe. Names are written
  whole, never abbreviated (`DATA-WAREHOUSE`, not `DW`); a name a system gives (a database, a host) is kept as that system writes it.
- The register `sql\configs\connections.json` keys each entry `<MACHINE>/<DATABASE>` (the real names) with `address` · `driver` ·
  `options` · `account` (the account this machine uses for that database by default).
- Each file holds a `#` block per REAL machine or service (`# ===== <host> (<address>) — <engine> · <what it serves> =====`), a
  `# <account> — <what it may do>` line before each account, and its lines. Nothing else but `#` comments. The person pastes the
  secret after `=`.
- Agent accounts on servers: ONE shared account `svc_agent`, never named after a vendor; each agent logs in with its own ssh key whose
  comment is the agent's name, so the server's ssh log tells which agent came in; removing an agent = removing its key.

## Rules

- Only settings and keys. A tool's log goes to its `cache\`; backup copies (`*.bak`, `*.old`, `*.pre-*`) are deleted, not kept here.
  A tool that writes its log at a fixed place outside `cache\` is left as it is.
- A key no `Host` uses any more is removed, and its public half is removed from the machines that held it.
- ONE `README.md` at the vault root, no other README inside: for each tool, what it holds · how it is linked (environment variable
  or junction) · the steps to rebuild it on a new machine; for ssh, the table alias · real machine · address · login account · key · shell.
  No history and no dates in it — history is in Global Memory.
- The content of `_ConfigVault\` NEVER goes into git (not even a private repo), and is NOT inside a synced folder (Syncthing) or a
  cloud backup folder (Drive). It reaches another machine by hand over a safe path.

## Steps — moving a tool's settings here

1. Create `_ConfigVault\<tool>\`.
2. The tool has a setting or environment variable for its config place (`GIT_CONFIG_GLOBAL`, `RCLONE_CONFIG`,
   `NPM_CONFIG_USERCONFIG`) ⇒ point it at the new folder and move the files. Otherwise move the files and replace the old place with
   a junction (folder) or symlink (file): `mklink /J "%USERPROFILE%\.ssh" "D:\_ConfigVault\ssh"`.
3. Run the tool once and check it reads its settings; add the tool's line to `README.md`.

## Steps — undoing a HOME set to the data drive

Done in ONE pass, because changing `HOME` changes where every tool reads at once:
1. List the tool files in the current `HOME` folder.
2. Settings and keys ⇒ move each into `_ConfigVault\<tool>\` by the steps above.
3. Caches and state a tool rebuilds ⇒ let the tool rebuild them under the default home, or move a large one into its program's
   `Data\`.
4. Remove the `HOME` override (the account's environment variables), sign out and in, and run each listed tool once.
5. The old `HOME` folder holds no tool file now; it is moved to its place in the tree or deleted with the owner's approval.

## Not here ⇒ goes to

Program installs ⇒ `Software\` · model files ⇒ `_Models\` · a program's own data (a database, a workspace) ⇒ that program's `Data\` ·
secrets a person reads ⇒ `Documents\Profile\Secret\` · repos ⇒ `Workspace\`.

## Check

`zemory conform --layout <data root>` accepts `_ConfigVault` and reds a repo inside it (`repo-outside-workspace`). No machine check
yet for a secret leaking into git or a synced folder, nor for the naming above.
