---
name: upload
description: Publish a finished deliverable to its destination (BI workspace, Drive, SharePoint, shared folder). Use when the deliverable is complete and needs to go out, or when the user asks to publish, push, send, or upload the report. Vietnamese triggers - "đẩy lên", "publish", "up báo cáo", "đưa lên workspace", "gửi bản cuối", "đăng lên".
---

# upload — đẩy sản phẩm lên đích

> ⚠️ Đây là thao tác **khó đảo ngược**. Đè lên bản đang chạy giống như `git push` — phải được user cho phép rõ ràng khi đích là môi trường thật.

## Quy trình

1. **XÁC NHẬN ĐÍCH VÀ PHẠM VI TRƯỚC KHI ĐẨY.** Nêu rõ: đẩy file nào, lên đâu, đè lên cái gì. Chờ user gật.
2. **Giữ bản hiện tại vào `attic/`** trước khi đè — để rollback được.
3. Chạy script publish trong `scripts/`. Đích và credential lấy từ `config/` hoặc `.env`, **KHÔNG hardcode**.
4. **Verify ở đích**: mở lại bản vừa đẩy, kiểm vài số mốc. Đẩy xong mà không mở ra nhìn thì chưa gọi là xong.
5. **Ghi lần publish** vào `06_CHANGES.md` — sau khi user OK.

## Cấm

- Đẩy khi chưa xác nhận đích.
- Đè bản đang chạy mà không sao lưu vào `attic/`.
- Coi "user bảo ghi changelog" hay "user bảo xong rồi" là đã cho phép publish. **Ghi sổ ≠ publish.**
