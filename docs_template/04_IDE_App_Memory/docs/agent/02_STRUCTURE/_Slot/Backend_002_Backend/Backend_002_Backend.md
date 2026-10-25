---
id: Slot_2
aka: 03-2
name: backend
version: 5
path: backend/
from: _Store/02_STRUCTURE/_Slot/Backend_002_Backend @v5 #ab05f3d03975
---
# Backend_002_Backend backend — the server side: our own code + entry

- Role:
  - ★ The server side: our own code + entry — 100% ours, one voice. The code part is the required role `backend/(code)`.
  - The code sits under `backend/`: Node → `backend/src/` · Python → `backend/<pkg>/`. Names follow the stack: only the LAYER changes with the language, never the name of a concern.
  - The smallest tree that runs: (1) our own code under `backend/`; (2) ONE entry — `run.*` OR a manifest declaring `bin`/`main`; (3) ONE manifest — at the root OR in `backend/`, not both. Every other child slot is `[opt]`.
  - A background daemon / long-running server serving a local UI (single instance, fixed port): a thin surface in `backend/src/` opens `api/` endpoints + serves the static `frontend/`; the business logic stays in the domain.
  - Embedded UI (single binary): a CLI/one-binary app may EMBED its UI page as a resource (e.g. HTML/CSS/JS inside one TS file) to ship compact — KEPT in the backend but WRITTEN DOWN; the server serving it is still the backend, the UI content still belongs to the frontend by role. Not forced apart when splitting breaks the one-file build.
  - Single-language UI: an app rendering its UI server-side in the backend's own language (Streamlit/Gradio/Dash/Django+templates) → no separate `frontend/`; the frontend role = pages/views INSIDE the backend (Python: `backend/<pkg>/pages`, or `views/` where the framework forces the name). Then 3 required roles remain: backend(code) + docs + AGENTS.
  - A NON-APP repo has no `backend/` (no app code).
- May hold / may not hold:
  - Holds: `src/` (or `<pkg>/`) · `test/` · `scripts/` · `infra/` · `resources/` · `run.*` · the manifest.
  - Not here: outside code cloned in (→ `external/`).
