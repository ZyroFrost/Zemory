---
name: upload
description: Publish a finished deliverable to its destination (BI workspace, Drive, SharePoint, shared folder). Use when the deliverable is complete and needs to go out, or when the user asks to publish, push, send, or upload the report. Vietnamese triggers - "đẩy lên", "publish", "up báo cáo", "đưa lên workspace", "gửi bản cuối", "đăng lên".
---

# upload — đẩy / publish deliverable

> Kích hoạt: deliverable đã xong → đưa lên đích (workspace BI · Drive · SharePoint). `03_STRUCTURE §5`.

1. Chạy **`scripts/`** publish (pbi-tools / PowerShell / API) — đích + credential lấy từ **`config/`**/`.env`, KHÔNG hardcode.
2. **Xác nhận đích + phạm vi TRƯỚC khi đẩy** (đẩy đè bản đang chạy = khó đảo — như `git push`, phải được user cho phép nếu là môi trường thật/production).
3. Sau khi đẩy: verify ở đích (mở lại / kiểm số) + ghi lần publish vào `06_CHANGES` (sau khi user OK).
4. Giữ bản trước khi đè về **`attic/`** để rollback (đối xứng "backup deploy 2 chiều" của app).
