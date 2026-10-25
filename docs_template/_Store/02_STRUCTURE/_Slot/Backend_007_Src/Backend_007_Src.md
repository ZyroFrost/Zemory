---
id: Slot_7
aka: 03-7
name: src
version: 5
path: backend/src/
---
# Backend_007_Src src — where the code lives

- Role:
  - ★ Where the code LIVES (Node: `src/` · Python: `backend/<pkg>/`).
  - Arranged in ONE of two shapes, never mixed at will: LAYER-FIRST (the default — a small app / CRUD / few domains: slots sit flat right under `src/`) OR DOMAIN-FIRST (an app with clearly separate domains: each domain is `src/<domain>/`, nesting inside exactly the slots it needs, from the same dictionary).
  - Cross-cutting slots (`core` · `auth` · `vault` · `config` · `logging` · `audit` · `errors` · `i18n` · `update` · `migrations` · `shared` · `util`) are ALWAYS at the root level of `src/`, never nested or copied inside each domain.
  - Inside a domain, use only slots from the SAME dictionary (store/services/ai/io/validators…), never new names.
  - THIN surfaces/entries: CLI → `commands/`, HTTP → `api/`, WS → `realtime/`, UI → `frontend/`; an entry only wires into the domain, never holds business logic.
  - Every child slot is `[opt]` — created WHEN there is a concern, never as an empty folder; a typical app shows only 4–10 slots.
- May hold / may not hold:
  - Holds: the dictionary slots (inbound edge · outbound edge · processing · platform · shared) or the `src/<domain>/` folders.
  - Not here: empty folders to complete a set · slot names outside the dictionary.
