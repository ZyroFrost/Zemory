---
version: 5
lang: vi
---
# Backend_032_Vault vault — mã hoá + key

- Vai trò:
  - MÃ HOÁ + KEY: derive / encrypt / decrypt, credential vault — CODE ở đây.
  - Mã hoá là concern riêng: key + encrypt/decrypt → `vault/` · at-rest DB (SQLCipher) → `store/` · key/salt/bundle → `data/secrets/` · bundle in-transit → `vault/`.
  - Credential/secret dạng code ở đây; secret runtime thật ở `.env`.
- Được chứa / không chứa: Không chứa: FILE key/bundle (→ `data/secrets/`).
