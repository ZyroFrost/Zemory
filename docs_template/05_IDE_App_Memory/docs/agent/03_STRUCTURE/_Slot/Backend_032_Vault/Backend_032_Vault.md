---
id: Slot_32
aka: 03-32
name: vault
version: 4
path: backend/src/vault/
from: _Store/03_STRUCTURE/_Slot/Backend_032_Vault @v4 #38ba240d378f
---
# Backend_032_Vault vault — mã hoá + key

- Vai trò:
  - MÃ HOÁ + KEY: derive / encrypt / decrypt, credential vault — CODE ở đây.
  - Mã hoá là concern riêng: key + encrypt/decrypt → `vault/` · at-rest DB (SQLCipher) → `store/` · key/salt/bundle → `data/secrets/` · bundle in-transit → `vault/`.
  - Credential/secret dạng code ở đây; secret runtime thật ở `.env`.
- Được chứa / không chứa: Không chứa: FILE key/bundle (→ `data/secrets/`).
