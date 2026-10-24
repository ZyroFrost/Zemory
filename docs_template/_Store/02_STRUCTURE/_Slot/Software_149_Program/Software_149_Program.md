---
id: Slot_149
name: program
version: 3
path: Software/<Nhóm>/[<Hãng>/]<Ứng dụng>/
scope: layout
---
# Software_149_Program program — one program

## Role

Each program has EXACTLY ONE folder of its own. Everything that belongs to that program sits in it: its installer, its installed
copy, and its own data. One look at the folder shows all three, and a new machine can rebuild the program from this folder alone.

## Required rule — no exceptions beyond the three listed below

The folder of EVERY program ALWAYS holds the three sub-folders `Setup/` · `App/` · `Data/`. Missing one of them is off-standard,
even when that part has nothing to hold yet: then the folder is still created, empty.

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

A program with NO data of its own — `Data/` is still there, empty:

```
Software\Utility\7-Zip\
├── Setup\    7z2409-x64.exe
├── App\      7z.exe · 7zFM.exe …
└── Data\     (empty)
```

## Steps

**Installing a new program:**
1. Create `Software\<Group>\[<Vendor>\]<App>\` with all three sub-folders `Setup\` · `App\` · `Data\`.
2. Download the installer into `Setup\`, file name unchanged.
3. Run the installer; at the install-folder step, choose exactly `…\<App>\App\`.
4. If the program offers a place for its data (virtual disk, workspace, database) ⇒ choose `…\<App>\Data\`.

**A program already installed somewhere else:**
- A portable copy (copy it and it runs): move the whole folder into `App\`.
- A copy installed by an installer (the registry and shortcuts hold the old path): do NOT move it by hand — uninstall it and
  install again by the steps above. Do it one program at a time, as each one is needed; move its installer into `Setup\` now.

## Exceptions

1. **An installer that gives no choice of place** (forces the system drive, for example some versions of Docker Desktop or a
   machine maker's drivers): install where the installer chooses; the program folder still holds all three sub-folders —
   `Setup\` keeps the installer, `App\` stays empty, `Data\` holds the data if the program lets the data move out.
2. **A program split over two drives** (the five laws of `Struc_Disk_Data`): its folder exists on each drive, each holding the
   parts real there plus a `_README.md` saying which part lives where. A folder with that `_README.md` is not asked for the
   parts that live on the other drive. Example: `H:\Software\System\Microsoft\WSL\` holds `_README.md` and `Data\` only.
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

## Naming

A program's name as its vendor writes it, without spaces: `PowerBI` · `VSCode` · `7-Zip` · `LMStudio`. A vendor name in
PascalCase: `Microsoft` · `JetBrains`. The three sub-folders exactly `Setup` · `App` · `Data`.

## Sync

Not in git, not synced: an installed copy belongs to one machine and an installer can be downloaded again. `Data\` can be very
large (virtual disks of tens of GB) — a virtual disk gets a size cap, and the drive's free space is measured before every large
write.

## Check

`zemory conform --layout <data root>` reds (`program-incomplete`) every program folder without `Setup\`, `App\` or `Data\`,
naming the missing ones. It does not ask a folder holding `_README.md` (split), `Drivers\` or `Fonts\`.
