---
id: Slot_32
aka: 03-32
name: vault
version: 5
path: backend/src/vault/
---
# Backend_032_Vault vault — encryption + keys

- Role:
  - ENCRYPTION + KEYS: derive / encrypt / decrypt, the credential vault — the CODE lives here.
  - Encryption is a concern of its own: keys + encrypt/decrypt → `vault/` · DB at rest (SQLCipher) → `store/` · key/salt/bundle files → `data/secrets/` · bundles in transit → `vault/`.
  - Credentials/secrets as code live here; the real runtime secrets are in `.env`.
- May hold / may not hold: Not here: key/bundle FILES (→ `data/secrets/`).
