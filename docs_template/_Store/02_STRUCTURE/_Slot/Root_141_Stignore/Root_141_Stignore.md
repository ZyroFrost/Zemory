---
id: Slot_141
aka: 03-141
name: .stignore
version: 3
path: .stignore
checked: [Root_085_Gitignore, Data_102_Secrets, Data_095_State]
---
# Root_141_Stignore .stignore — what Syncthing never carries to another machine

- Role: the list Syncthing does not carry to another machine (a VM, a second machine) for a repo synced by Syncthing. Not
  `Root_085_Gitignore`: `.gitignore` keeps things out of git, `.stignore` keeps things off the sync path — a file outside git can still
  be carried by Syncthing, and the other way round.
- Principle: **carry only what automation uses.** The repo folder on the machine that runs tasks (the VM) stays there to run them, but takes only
  the part its tasks need; Power BI reports, design assets, documents, old saved copies stay on the workstation. *(Measured on a VM while it still
  carried the whole repo: `reports` 10.5 GB + their `.stversions` 24.9 GB, 27.8 GB left on the drive.)*
- Two parts, in this order in the file (Syncthing takes the FIRST MATCHING pattern):
  1. **Never carried**, even inside a carried folder — written by hand, required:
     - `docs/.harness-state` — each machine's own guard state (one-use flags, read traces): carried to the other machine, a flag made here would open
       writes there.
     - `data` · `exports` · `.vault` · `*.local.*` — run data, exports, the vault, per-machine config (`Data_102_Secrets`).
     - things generated in place: `__pycache__` · `.venv` · `node_modules` · `.stversions` (marked `(?d)` so Syncthing may delete them when cleaning).
  2. **The allow list — MACHINE-WRITTEN, never edited by hand**: the `zemory:stignore-allow` block at the end of the file, rewritten by `zemory sync` on every
     run from every `tasks/*/vm_deploy.json` · `pipelines/*/vm_deploy.json` (the entries `files` · `needs` · `secrets` · `wrapper` · `check`,
     plus the manifest's own folder, plus the `../<this repo>/…` paths a sibling repo's manifest needs) — one `!/<entry>` line each,
     the last line `*` blocks the rest. A new task on the VM ⇒ sync opens the folder it needs by itself; nobody adds lines by hand.
- No longer blocks the flag path of the old file harness (the hooks folder beside docs): flags moved to `docs/.harness-state`.
- On the VM: turn off Syncthing's File Versioning for the repo folders — each save over a file leaves the old copy in `.stversions`.
- Syncthing does not sync this file itself. The SENDING end (the workstation) decides what goes; the receiving end keeps the same content for comparison.
- Machine check: `conform` › `slot-gate` reds when `.stignore` exists but misses a required line, misses the allow block, or still has an old path;
  `zemory sync` writes the block and puts what is still off into the repo's ledger. A repo without `.stignore` (not synced by Syncthing)
  is not reported.
