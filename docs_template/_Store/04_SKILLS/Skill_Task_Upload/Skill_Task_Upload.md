---
id: Skill_Task_Upload
aka: upload
name: task-upload
version: 5
description: Publish a finished deliverable to its destination (BI workspace, Drive, SharePoint, shared folder). Use when the deliverable is complete and needs to go out, or when asked to publish, push, send, or upload the report. Vietnamese triggers - "đẩy lên", "publish", "up báo cáo", "đưa lên workspace", "gửi bản cuối", "đăng lên".
---

# upload — đẩy / publish sản phẩm lên đích

> Kích hoạt: deliverable đã xong → đưa lên đích (workspace BI · Drive · SharePoint · thư mục chung).
> Xem `Slot_Scripts_128_Scripts` — KÉO / ĐIỀN / UPLOAD file.
>
> ⚠️ Đây là thao tác **khó đảo ngược**. Đẩy đè lên bản đang chạy giống như `git push` — phải được
> cho phép rõ ràng khi đích là môi trường thật/production.

## Quy trình

1. **XÁC NHẬN ĐÍCH VÀ PHẠM VI TRƯỚC KHI ĐẨY.** Nêu rõ: đẩy file nào, lên đâu, đè lên cái gì. Chờ gật.
2. **Giữ bản hiện tại vào `attic/`** trước khi đè — để rollback được (đối xứng "backup deploy 2
   chiều" của app).
3. Chạy script publish trong **`scripts/`** (pbi-tools / PowerShell / API). Đích và credential lấy từ
   **`config/`** hoặc `.env`, **KHÔNG hardcode**.
4. **Verify ở đích**: mở lại bản vừa đẩy, kiểm vài số mốc. Đẩy xong mà không mở ra nhìn thì chưa gọi
   là xong.
5. **Ghi lần publish** vào `06_CHANGES.md` — sau khi được duyệt.

## Cấm

- Đẩy khi chưa xác nhận đích.
- Đè bản đang chạy mà không sao lưu vào `attic/`.
- Coi lệnh "ghi changelog" hay câu "xong rồi" là đã cho phép publish. **Ghi sổ ≠ publish.**
