---
id: Slot_4
aka: 03-4
name: docs
version: 5
path: docs/
from: _Store/02_STRUCTURE/_Slot/Docs_004_Docs @v5 #1a18b5954a15
---
# Docs_004_Docs docs — harness tài liệu

- Vai trò:
  - ★ Harness: FILE `.md` là NGUỒN; DB chỉ là INDEX dẫn xuất — file wins.
  - Tài liệu / rule / plan → `docs/`, sửa FILE `.md` trực tiếp.
  - Giống hệt ở hệ APP và NON-APP: cùng lệnh zemory, agent điều hướng non-app đúng như app.
  - Hệ NON-APP: từ điển dữ liệu nằm trong `02_STRUCTURE` (part `Docs_138_DataDictionary` data-dictionary) — không tạo `docs/dictionary.md`.
- Được chứa / không chứa:
  - Chứa: `agent/` (★) · `plan/` (★) · `archive/` (lịch sử harness: sổ cũ, bản chép đã nghỉ hưu, harness dạng file cũ — tra bằng `zemory changelog search` / `plan search`, không đọc mỗi phiên) · `.harness.json` (★, marker: project đã wire harness).
  - Không chứa: bản xem trực quan cho người (→ `docs_visual/`) · ảnh/media công khai (→ `docs_public/`) · `docs/dictionary.md` (hệ NON-APP).
