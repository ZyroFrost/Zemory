---
id: Slot_93
aka: 03-93
name: .env
version: 4
path: .env
---
# Root_093_Env .env — the real runtime secrets

- Role:
  - The REAL runtime secrets: passwords / tokens / `DATABASE_URL`; NON-APP repo: connection strings / tokens / workspace ids. GITIGNORED.
  - `config/` and `sources/` point at a secret by its env NAME (`password_env`), never holding the value.
  - The template `.env.example` is tracked at the root (the tool forces it).
