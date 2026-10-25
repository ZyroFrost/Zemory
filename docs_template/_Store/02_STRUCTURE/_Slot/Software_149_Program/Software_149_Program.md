---
id: Slot_149
name: program
version: 5
path: Software/<Nhóm>/[<Hãng>/]<Ứng dụng>/
scope: layout
---
# Software_149_Program program — one program

## Role

Each program has EXACTLY ONE folder of its own. Everything that belongs to that program sits in it: its installer, its installed
copy, and its own data. One look at the folder shows all three, and a new machine can rebuild the program from this folder alone.

## Required rule — no exceptions beyond the three listed below

A program folder holds ONLY the sub-folders `Setup/` · `App/` · `Data/` (plus the `_README.md` of a split program). Each
sub-folder exists only when it has something to hold: a program with no data of its own has no `Data/`, a program whose
installer is not kept has no `Setup/`. A missing sub-folder is on standard; an empty one is not — it makes the owner open a
folder to find nothing. Off-standard is an item outside the three: a file or a folder lying straight in the program folder.

| sub-folder | holds | real example |
|---|---|---|
| `Setup/` | the original installer exactly as downloaded, file name unchanged; with crack, key or activation file if any | `Software\Dev\Microsoft\VSCode\Setup\VSCodeUserSetup-x64-1.106.0.exe` |
| `App/` | the installed copy (the install path chosen when running the installer) or the portable copy | `Software\Dev\Microsoft\VSCode\App\` (holds `Code.exe`) |
| `Data/` | the program's own data, where the program lets the owner choose: virtual disks, cache, workspace, database, logs | `Software\System\Microsoft\WSL\Data\Ubuntu\ext4.vhdx` · `Software\Dev\Database\MongoDB\Data\db\` |

A program folder on standard:

```
Software\Dev\Database\MongoDB\
├── Setup\    mongodb-windows-x86_64-8.0.4-signed.msi
├── App\      (the install path chosen in the installer: bin\mongod.exe …)
└── Data\     db\  ·  log\
```

A program with NO data of its own — no `Data/`:

```
Software\Utility\7-Zip\
├── Setup\    7z2409-x64.exe
└── App\      7z.exe · 7zFM.exe …
```

## Steps

**Installing a new program:**
1. Create `Software\<Group>\[<Vendor>\]<App>\Setup\` and download the installer into it, file name unchanged.
2. Run the installer; at the install-folder step, choose exactly `…\<App>\App\`.
3. If the program offers a place for its data (virtual disk, workspace, database) ⇒ choose `…\<App>\Data\`. No such place ⇒
   no `Data\`.

**A program already installed somewhere else:**
- A portable copy (copy it and it runs): move the whole folder into `App\`.
- A copy installed by an installer (the registry and shortcuts hold the old path): do NOT move it by hand — uninstall it and
  install again by the steps above. Do it one program at a time, as each one is needed; move its installer into `Setup\` now.

## Exceptions

1. **An installer that gives no choice of place** (forces the system drive, for example some versions of Docker Desktop or a
   machine maker's drivers): install where the installer chooses; the program folder holds `Setup\` with the installer, no
   `App\`, and `Data\` only if the program lets its data move out.
2. **A program split over two drives** (the five laws of `Struc_Disk_Data`): its folder exists on each drive, each holding the
   parts real there plus a `_README.md` saying which part lives where. Example: `H:\Software\System\Microsoft\WSL\` holds
   `_README.md` and `Data\` only.
3. **Folders that are not programs:** the groups `Drivers\` and `Fonts\` hold driver and font packs (Software_150); they have
   no installed copy.

## May hold / may not hold

- A `<Vendor>\` level sits in between when one vendor has several programs in the same group: `Software\Dev\Microsoft\VSCode\` ·
  `Software\Dev\Microsoft\SQLServer\`. A vendor with one program in the group drops the vendor level: `Software\Utility\7-Zip\`.
- May not hold: the owner's settings and keys (in `_ConfigVault\<tool>\`) · working documents (`Documents\`) · repos
  (`Workspace\`) · model files (`_Models\`).
- A package manager's global install folder is the `Data\` of its runtime: `npm config set prefix
  D:\Software\Dev\NodeJS\Data\npm-global`, so every CLI installed with `npm -g` lives there and that one folder is on `PATH`.
  A CLI installed by its own installer gets its own program folder (`Software\AI\Anthropic\ClaudeCode\`).
- A program's OUTPUT BUFFER — the folder it writes into before the owner sorts the result (a screen recorder's capture folder on a
  fast drive) — is that program's `Data\`, linked to the fast drive per the five laws of `Struc_Disk_Data`; a sorted item moves
  to its own place (a game clip ⇒ `Game\Media\`).

## Naming

A program's name as its vendor writes it, without spaces: `PowerBI` · `VSCode` · `7-Zip` · `LMStudio`. A vendor name in
PascalCase: `Microsoft` · `JetBrains`. The three sub-folders exactly `Setup` · `App` · `Data`.

## Sync

Not in git, not synced: an installed copy belongs to one machine and an installer can be downloaded again. `Data\` can be very
large (virtual disks of tens of GB) — a virtual disk gets a size cap, and the drive's free space is measured before every large
write.

## Check

`zemory conform --layout <data root>` reds (`program-stray`) every program folder holding anything besides `Setup\`, `App\`,
`Data\` and `_README.md`, naming the stray items. A missing sub-folder is never a finding. `Drivers\` and `Fonts\` are not
checked.
