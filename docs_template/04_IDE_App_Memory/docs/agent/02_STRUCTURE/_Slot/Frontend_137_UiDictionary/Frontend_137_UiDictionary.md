---
id: Slot_137
aka: 03-137
name: ui-dictionary
version: 8
kind: guide
path: frontend/
from: _Store/02_STRUCTURE/_Slot/Frontend_137_UiDictionary @v8 #ee269aab11cb
---
# Frontend_137_UiDictionary ui-dictionary — the UI/UX design slot dictionary

- Role:
  - Where an ADAPTED design skill really shows. The full original skills are in `external/skills/`; the agent reads the original directly for aesthetic ideas, then maps them onto the slots below to fit the project's structure/constraints. The skill index: `03_SKILLS`.
  - Looked up like the folder dictionary: a slot is there to LOOK UP — use only slots with a real concern, never force the whole set. `★` = should exist in every UI · `[opt]` = when there is a concern.
  - Boundary: the STACK (Tailwind / no-build CSS vars / framework) is STRUCTURE — fixed per project, not debated each time. LAYOUT & TASTE are what the agent proposes and settles (`Rule_Keys_62_DesignChangeApproval` — UI design is approved before it is built).
  - The REAL values (the repo's tokens/palette) live in `frontend/styles`, not here.
- A. Token base:
  - `tokens` ★ — every colour/size = a CSS var in one place, 0 literals.
  - `theme` ★ — each theme a complete token set; the toggle is saved in config.
  - `color` [opt] — palette primary / secondary / CTA / bg / text + mood.
  - `typography` [opt] — the heading/body font pair + the size scale.
  - `spacing` [opt] — the spacing scale + radius + density.
- B. Taste / aesthetic:
  - `ui-style` [opt] — settle ONE direction BEFORE coding (Minimal / Glass / Brutal / Bento / Dark-native / AI-native…) — against falling back to a generic default.
  - `motion` [opt] — transitions · micro-interactions · hover; respect `prefers-reduced-motion`.
  - `depth` [opt] — elevation / shadow / glow, tokenised, can be turned off in light mode.
  - `iconography` [opt] — one consistent icon style; icons have 3 roles (UI media → `frontend/assets/` · the exe icon and the tray/window icon → `backend/resources/packaging/`).
- C. Components / patterns:
  - `dialog` ★ — 3 sizes 16:9: S 40% · M 60% · L 90% of the app frame, `min(Pvw, Pvh*16/9)`; ESC + backdrop close it, except for an action that cannot be cancelled; the frame does not jump with its content.
  - `layout` [opt] — grid/responsive, fills the app frame, no vh cap leaving a gap.
  - `resizable` ★ — ≥2 adjacent panels ⇒ a draggable seam is REQUIRED: really free · 2D dragging both ways · ONE shared data-driven engine (`frontend/components/`, layout variables in `frontend/styles/`) · saved + restored · double-click resets.
  - `navigation` [opt] — tabs / menus / breadcrumbs; the tab is remembered across sessions.
  - `forms` [opt] — inputs · validation · errors shown inline.
  - `feedback` [opt] — toast · loading · skeletons instead of a jumping layout.
  - `states` [opt] — empty · loading · error · zero data: every list/panel has all 4 states.
  - `data-viz` [opt] — charts/dashboards → use the `dataviz` skill, only POINT at it, never repeat it.
- D. Quality gates (always applied, like a pre-delivery check):
  - `accessibility` ★ — WCAG AA: contrast · visible focus · keyboard · ARIA/labels · target size.
  - `i18n` ★ — UI = English or i18n with both dictionaries complete, 0 hardcoded strings.
  - `no-build` ★ — an embedded/static app: split files by concern, 0 bundlers; a framework with a build only when the project's STACK already has a bundler.
  - `anti-patterns` ★ — the banned checklist: colour literals · jumping dialogs · layout shift on load · low contrast · icon-only without a label · generic defaults.
- May hold / may not hold: only the design slot names + constraints; no real token values (→ `frontend/styles`) and no copy of the component specification of the `app-design` skill.
