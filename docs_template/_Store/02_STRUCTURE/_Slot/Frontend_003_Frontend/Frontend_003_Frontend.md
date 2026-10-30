---
id: Slot_3
aka: 03-3
name: frontend
version: 7
path: frontend/
---
# Frontend_003_Frontend frontend — the interface people use

- Role:
  - ★ UI — every app has a UI, even a tool with little UI; required when the app has a UI. Every child slot is `[opt]`.
  - Tests/e2e/stories: co-located or `frontend/test` — not forced; running the app is the test.
  - The design specification of a surface: skill `app-base` (the base every kind follows) and the skill of the kind the repo declares in `frontend/config/ui.json` (`app-glass`). The child slots, `Frontend_060_Assets` … `Frontend_072_Public`, say what each folder holds; the real token values live in `frontend/styles`.
  - No-build UI (static): the app serves its UI as static files (FastAPI StaticFiles · express.static · nginx), no bundler (webpack/vite): one big HTML file MUST be splittable into files by concern (`styles/*.css` · logic as several `<script src>` · state · api client) — modular without a build. The safe order: `<script src>` keeping the global scope first → remove inline `onclick=` → move to ES modules last (module scope loses global functions ⇒ handlers break). Not an embedded UI (single binary): there splitting is forbidden; here splitting is right.
  - The single-language UI exception (server-side rendering): no `frontend/`, this role lives in the backend — see `backend/`.
  - A NON-APP repo has no `frontend/`; 0 UI rules.
- May hold / may not hold: Holds: `assets/` · `components/` · `styles/` · `pages/` · `layouts/` · `state/` · `hooks/` · `client/` · `locales/` · `config/` · `util/` · `types/` · `public/`.
