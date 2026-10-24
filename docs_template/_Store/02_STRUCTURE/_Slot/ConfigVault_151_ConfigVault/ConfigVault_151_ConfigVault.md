---
id: Slot_151
name: configvault
version: 5
path: _ConfigVault/<tool>/
scope: layout
---
# ConfigVault_151_ConfigVault configvault — the machine's vault of tool settings and keys

## Role

`<data root>\_ConfigVault\` is step 5 of the drive's question chain (`Struc_Disk_Data`) and a shared store of the whole machine:
settings and keys that a PROGRAM or an AGENT reads by itself. Every program and repo that needs a key or a setting points here. One
folder per tool, `_ConfigVault\<tool>\`, so a new machine needs this one folder carried over, and one exclusion rule keeps every
secret out of git, sync and cloud backup.

The fact that splits it from `Documents\`: WHO READS IT. A program or an agent reads it by itself ⇒ here. A person opens and reads it
(a list of web passwords, a wallet phrase) ⇒ `Documents\Profile\Personal\Secret\`.

## Inside

```
_ConfigVault\
├── README.md          the ONE register of the vault (see below)
├── ssh\               config · keys · known_hosts — flat, as ssh reads one folder
├── git\  vpn\  zemory\
└── <tool>\            one or two files straight; several kinds ⇒ configs\ · credentials\ · cache\
```

- `configs\` — settings (readable, not secret) · `credentials\` — keys, tokens, passwords · `cache\` — what the tool rebuilds by
  itself, its logs included; deleting it loses nothing.
- `ssh\` stays flat: ssh reads `config`, the keys and `known_hosts` from one folder.
- zemory's `location.json` is read at `%USERPROFILE%\.zemory\location.json`; that folder may be a junction into
  `_ConfigVault\zemory\`. The file only points at the Global Memory folder and holds no secret.

## Naming

- `_ConfigVault` exactly. Tool folders lower case, as the tool's command is called: `git` · `ssh` · `vpn` · `rclone`.
- An ssh alias names the ROLE of the machine: `<org>-<role>` (`acme-dev` · `acme-central` · `acme-log`). Callers use the alias only,
  never a key file name.
- A key file names the REAL machine: `id_<type>_<host name in lower case>` (`id_ed25519_server-dev` · `id_ed25519_acme-data`). The
  host name is measured, not remembered: `ssh <alias> hostname`. A machine renamed ⇒ its key renamed, the alias stays.

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
secrets a person reads ⇒ `Documents\Profile\Personal\Secret\` · repos ⇒ `Workspace\`.

## Check

`zemory conform --layout <data root>` accepts `_ConfigVault` and reds a repo inside it (`repo-outside-workspace`). No machine check
yet for a secret leaking into git or a synced folder, nor for the naming above.
