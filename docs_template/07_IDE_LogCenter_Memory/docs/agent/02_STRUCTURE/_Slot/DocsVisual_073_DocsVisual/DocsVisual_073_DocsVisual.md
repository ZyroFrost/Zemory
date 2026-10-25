---
id: Slot_73
aka: 03-73
name: docs_visual
version: 4
path: docs_visual/
from: _Store/02_STRUCTURE/_Slot/DocsVisual_073_DocsVisual @v4 #c23fd6f82c33
---
# DocsVisual_073_DocsVisual docs_visual — visual views for people

- Role:
  - VISUAL VIEWS for PEOPLE to open and look at (the agent does not read them): self-contained interactive `.html` · hand-drawn `.drawio`/`.svg` — flow / architecture / lineage diagrams / state grids / timelines of the system or a plan (non-app: e.g. the DW load flow, a grid of tables).
  - Sits OUTSIDE the `docs/` tree → the rule of reading every `docs/` file does not touch it (0 tokens).
  - The `.md` file WINS on facts: a visual only presents; a fact that lives only in a visual is invisible to `plan search`.
  - The default is `mermaid` INSIDE the `.md`; `docs_visual/` ONLY when words cannot describe it.
  - Generated from data → the script in `scripts/` + the render in `exports/`; renders are never committed.
- May hold / may not hold: Each file MUST be self-contained (inline CSS/JS/SVG · no CDN/build) and have one owning `.md` that links to it with a markdown link + a 1–3 line summary.
