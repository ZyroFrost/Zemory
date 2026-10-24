---
id: Slot_151
name: configvault
version: 4
path: _ConfigVault/<tool>/
scope: layout
---
# ConfigVault_151_ConfigVault configvault — the machine's vault of tool settings and keys

## Role

`<data root>\_ConfigVault\` is a shared store of the whole machine (the `_` of `Struc_Disk_Data`): it keeps the OWNER settings
and the secret keys of every tool, and every program and repo that needs a key or a setting points here. One folder per tool,
`_ConfigVault\<tool>\`. Gathered in one place so that setting up a new machine means carrying this one folder, and so that one
exclusion rule keeps every secret out of git, sync and cloud backup.

Examples of what lives here:
- `_ConfigVault\git\` — the global `.gitconfig` (name, e-mail, aliases).
- `_ConfigVault\ssh\` — SSH keys and the `config` file.
- `_ConfigVault\vpn\` — VPN connection profiles.
- `_ConfigVault\rclone\` — `rclone.conf` with the remotes of a cloud drive.
- `_ConfigVault\npm\` — `.npmrc` with a registry token.

zemory's `location.json` is read at `%USERPROFILE%\.zemory\location.json`, before zemory knows where anything else is: that
path must keep working. Its folder may be a junction into `_ConfigVault\zemory\` (step 3 below); the file itself only points at
the Global Memory folder and holds no secret.

## Inside

A tool with one or two files keeps them straight in `_ConfigVault\<tool>\`. A tool with several kinds of files splits them in
three:
- `configs\` — settings (readable, not secret).
- `credentials\` — keys, tokens, passwords.
- `cache\` — what the tool rebuilds by itself; deleting it loses nothing.

Example: `D:\_ConfigVault\agentswitch\configs\profiles.json` · `D:\_ConfigVault\agentswitch\credentials\tokens.json`.

## Steps — moving a tool's settings here

1. Create `_ConfigVault\<tool>\`.
2. If the tool has a setting or an environment variable for its config place (`GIT_CONFIG_GLOBAL`, `RCLONE_CONFIG`,
   `NPM_CONFIG_USERCONFIG`), point it at the new folder and move the files.
3. If it has none, move the files and replace the old place with a junction (folder) or a symlink (file) to the new one
   (`mklink /J "%USERPROFILE%\.ssh" "D:\_ConfigVault\ssh"`).
4. Run the tool once and check it reads its settings.

## Steps — undoing a HOME set to the data drive

A machine where `HOME` points at a folder of the data drive (so many tools keep `.ssh`, `.gitconfig`, `.npmrc`, `.cache`,
`AppData` there) is set back in ONE pass, because changing `HOME` changes where every one of those tools reads at once:
1. List the tool folders and files in the current `HOME` folder.
2. Settings and keys (`.ssh`, `.gitconfig`, `.npmrc`, tool tokens) ⇒ move each into `_ConfigVault\<tool>\` by the steps above.
3. Caches and state a tool rebuilds (`.cache`, editor state) ⇒ leave them to be rebuilt under the default home, or move a large
   one into the `Data\` of its program and link it.
4. Remove the `HOME` override (the account's environment variables), sign out and in, and run each listed tool once to check it reads its
   settings.
5. The old `HOME` folder is now empty of tool files; it is moved to its own place in the tree or deleted with the owner's
   approval.

## Secrets rule — no exceptions

- The content of `_ConfigVault\` NEVER goes into git (not even a private repo), and is NOT inside a synced folder (Syncthing) or a
  cloud backup folder (Drive).
- It reaches another machine by hand, over a safe path (the owner's own USB drive, a password manager), and is put back in the
  same place.

## May not hold

Program installs (in `Software\`) · model files (`_Models\`) · working data and repos (`Workspace\`) · personal documents
(`Documents\`).

## Naming

`_ConfigVault` exactly. Tool folders lower case, as the tool's command is called: `git` · `ssh` · `vpn` · `rclone` · `npm`.

## Check

`zemory conform --layout <data root>` accepts `_ConfigVault` at the data root and reds a repo inside it
(`repo-outside-workspace`). There is no machine check yet for a secret leaking into git or a synced folder — whoever places the
file keeps it.
