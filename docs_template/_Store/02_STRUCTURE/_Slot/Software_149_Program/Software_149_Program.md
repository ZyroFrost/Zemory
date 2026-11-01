---
id: Slot_149
name: program
version: 7
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
- **Python: ONE shared place, one folder per version, used by EVERY repo.** Python follows the same law as every other shared
  thing: what all repos use lives in one shared place, what belongs to one repo alone lives in that repo, and the copy a repo
  would need if it were cut off from the shared place is a reserve slot, not used while the repo runs inside the system.
  - **Where.** Each Python version the machine runs is one program folder named by its full three-part version:
    `<data root>\Software\Dev\Python\3.12.10\{Setup, App}`. That installed copy IS the environment: libraries go into its
    `App\Lib\site-packages`. No venv inside it, no `Data\`, never a second environment for the same version, and the folder
    never takes a group's, a department's, an app's or a purpose's name. On Linux the same tree sits under `/opt`:
    `/opt/Software/Dev/Python/3.12.10/App/bin/python3`.
  - **Who uses it.** Every repo: department repos, the data warehouse, workspace managers AND apps (an app's backend
    included). A repo declares the ONE version it runs in `config/runtime.json` (`{"python": "3.12.10"}`); its launchers call
    `bin\_python.cmd`, which runs `<data root>\Software\Dev\Python\<version>\App\python.exe`, the data root being the drive that
    holds `_ConfigVault\`. Never a bare `python` from `PATH`, never `py`, never the system drive, never `.venv\Scripts\python.exe`.
  - **One version = one pinned library set, one version of each library.** The pinned list of each Python version lives in HS
    (`Skill_Task_VmAutomation/references/python_<version>.txt`); installing a version = installing Python into `App\`, then
    `python -m pip install -r python_<version>.txt`. A repo that needs one more library adds it to that list and installs it into
    the version it declares. A library already in the list is never upgraded or downgraded for one repo.
  - **Two repos that cannot share a library version.** Install a NEW Python version as a NEW sibling folder
    (`Software\Dev\Python\3.12.11\{Setup, App}`) with its own pinned list, and the repo that needs the other library version
    changes its one line in `config/runtime.json`. Never a sub-folder or a venv under an existing version, never two library
    versions inside one version folder.
  - **The reserve slot `.venv/` (`Venv_108_Venv`).** Used ONLY by a repo cut off from the system — it runs where the shared
    tree does not exist (a team repo cloned by other people, an app handed to a machine without `Software\`). A repo inside the
    system never has `.venv/`, even when one would be convenient. Today no managed repo runs cut off.
  - A machine that runs tasks (VM) uses the same tree, so the same path (`E:\Software\Dev\Python\3.12.10\App\`).
- A program's OUTPUT BUFFER — the folder it writes into before the owner sorts the result (a screen recorder's capture folder on a
  fast drive) — is that program's `Data\`, linked to the fast drive per the five laws of `Struc_Disk_Data`; a sorted item moves
  to its own place (a game clip ⇒ `Game\Media\`).

## Naming

A program's name as its vendor writes it, without spaces: `PowerBI` · `VSCode` · `7-Zip` · `LMStudio`. A vendor name in
PascalCase: `Microsoft` · `JetBrains`. The three sub-folders exactly `Setup` · `App` · `Data`. One exception: a runtime kept
one folder per version is named by its full version under the runtime's name (`Python\3.12.10\`).

## Sync

Not in git, not synced: an installed copy belongs to one machine and an installer can be downloaded again. `Data\` can be very
large (virtual disks of tens of GB) — a virtual disk gets a size cap, and the drive's free space is measured before every large
write.

## Check

`zemory conform --layout <data root>` reds (`program-stray`) every program folder holding anything besides `Setup\`, `App\`,
`Data\` and `_README.md`, naming the stray items. A missing sub-folder is never a finding. `Drivers\` and `Fonts\` are not
checked.
