---
id: Slot_117
aka: 03-117
name: case
version: 5
path: tasks/<case>/
---
# Tasks_117_Case case — the file of one case

- Role:
  - Each problem is a line of work you come back to many times — a case ON REQUEST (investigation · incident · a dim that needs care again and again), on a par with recurring cases.
  - `spec.md` = the LIVING LEDGER: state · how the case is called · contents · open work · when it reopens.
  - A CLOSED case can reopen — the folder is a living file, never deleted.
  - Real data → `data/<case>/` (gitignored, mirrors the SAME NAME). Not `data/adhoc/`: adhoc is a one-off, throwaway file with no spec.
- May hold / may not hold:
  - `spec.md` · findings / evidence / measurements `<date>_<slug>.md` · PROPOSED fix scripts `<date>_<slug>.sql` (the operator runs them) · check queries ONLY this case uses `check_*.sql` · `pipeline/`.
  - The config of ONE case (a tracked `*.example.*` template + the real `*.local.*`, gitignored) sits at the ROOT of `tasks/<case>/` — not in `pipeline/` (that place holds only stage-numbered scripts; `NN_` keeps its meaning only when nothing else sits beside it) and not in the repo-level `config/` (that slot is for shared config); kept in a shared slot, nobody knows which work it belongs to.
  - Not here: real data (→ `data/<case>/`).
- Naming: Plain names, no numbers, ASCII English. Findings: `<date>_<slug>.md`; own queries: `check_*.sql`.
