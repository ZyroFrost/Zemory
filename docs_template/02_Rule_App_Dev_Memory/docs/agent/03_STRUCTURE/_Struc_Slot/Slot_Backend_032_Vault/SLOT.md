---
id: Slot_32
aka: 03-32
name: vault
version: 3
path: backend/src/vault/
from: _Store/03_STRUCTURE/_Struc_Slot/Slot_Backend_032_Vault @v3 #aced5dbb39d0
---
# Slot_Backend_032_Vault vault — mã hoá + key

- Vai trò:
  - MÃ HOÁ + KEY: derive / encrypt / decrypt, credential vault — CODE ở đây.
  - Mã hoá là concern riêng: key + encrypt/decrypt → `vault/` · at-rest DB (SQLCipher) → `store/` · key/salt/bundle → `data/secrets/` · bundle in-transit → `vault/`.
  - Credential/secret dạng code ở đây; secret runtime thật ở `.env`.
- Được chứa / không chứa: Không chứa: FILE key/bundle (→ `data/secrets/`).
