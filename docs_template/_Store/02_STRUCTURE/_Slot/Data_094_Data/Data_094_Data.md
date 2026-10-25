---
id: Slot_94
aka: 03-94
name: data
version: 4
path: data/
---
# Data_094_Data data — runtime / real files per machine

- Role:
  - APP repo: RUNTIME living per machine / per account. NON-APP repo: REAL FILES per machine (heavy / PII). GITIGNORED. One of the 6 kinds of non-code (data = runtime, gitignored).
  - Split into children as it grows — never a hundred JSON files in one place.
  - Where a local DB lives: `data/*.db` or the app-data folder `~/.<tool>/`. The place is decided by the FIXED pointer `~/.<tool>/location.json` (env override > pointer > default `~/.<tool>`); every helper (config / browser / imports / backups) follows it. A DB that grows → let it move off the system drive with the tool's relocate command / the Storage screen.
  - Moving safely: checkpoint the WAL → copy → verify (integrity + counts) → switch the pointer → KEEP the old copy as `.bak`. The pointer MUST be in a fixed place, never beside the DB (a circular dependency). A live DB never sits in a Drive-synced folder (WAL corruption).
  - NON-APP repo: the children of `data/` are free under the standard (`data/<case>/`) — never treated as off-standard.
- May hold / may not hold:
  - APP repo: `state/` · `cache/` · `settings/` · `logs/` · `tmp/` · `snapshots/` · `models/` · `secrets/` · `uploads/`.
  - NON-APP repo: `extract/` · `adhoc/` · `<case>/`.
