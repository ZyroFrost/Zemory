---
id: Cons_107
aka: 01-7
name: local-only-privacy
version: 1
kind: content
---
# Cons_Core_107_LocalOnlyPrivacy Local-only + privacy mặc định.

**Local-only + privacy mặc định.** Mọi dữ liệu nằm trên máy user; không transmit đi đâu ngoài bundle **mã hóa** do user chủ động sync. Credential-shaped content bị redact NGAY lúc ingest (mọi đường: file, web). Password/2FA của nền web **không bao giờ nhập vào zemory** (login trên trang thật, chỉ mượn phiên). **KHÔNG commit data thật/PII vào git** — chỉ code + docs; bundle sync phải là `.enc`. *(gốc: plan 07 §4 §13 §14, plan 08, share.ts design)*

- **Chốt máy:** `no-data-in-git` · `git-history-secrets` · `memory-privacy` · precommit-guard
