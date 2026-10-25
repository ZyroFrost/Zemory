---
id: Slot_16
aka: 03-16
name: store
version: 5
path: backend/src/store/
from: _Store/02_STRUCTURE/_Slot/Backend_016_Store @v5 #643a5e68fc79
---
# Backend_016_Store store — data access: DB driver + schema

- Role:
  - DATA ACCESS: the driver + schema for the DATABASE (remote / local / cloud).
  - Connecting a DB = `store/` + a profile in `config/` + the secret in `.env`/`vault/`.
  - DB encryption at rest (SQLCipher) is applied here; keys + encrypt/decrypt in `vault/`, key/salt/bundle files in `data/secrets/`. An app with sensitive data (chat/PII/logs) SHOULD encrypt at rest; one that does not writes down that it accepts plaintext, so an audit sees it.
  - Durable storage for other concerns: upload metadata · role data (account→role) · the audit table · agent memory · one place that EXECUTES what an LLM tool calls.
- May hold / may not hold:
  - Holds: drivers, schema, `queries.*`.
  - Not here: the cache layer (→ `cache/`) · runtime cache files (→ `data/cache/`) · upload bytes (→ `data/uploads/`).
- Naming: The name is `store/` — not `db` or `models`, unless the framework forces it (Django `models/`, Rails `app/models`).
