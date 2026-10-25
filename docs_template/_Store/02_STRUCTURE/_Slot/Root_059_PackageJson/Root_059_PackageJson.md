---
id: Slot_59
aka: 03-59
name: package.json
version: 6
path: package.json | pyproject.toml | requirements.txt
---
# Root_059_PackageJson package.json — manifest

- Role:
  - ★ Manifest — the file that declares dependencies in the tool's own format: `package.json` (Node) · `pyproject.toml` · `requirements.txt` (Python).
    One kind of file, one slot: another name for the same role is added to this slot's `path:`, never a new slot.
  - At the root OR in `backend/` — not both. A Node CLI puts it at the root and declares `bin` here.
  - Can be the entry instead of `run.*`, through `bin`/`main`.
