---
name: conform
description: Measure how closely the project folder follows the declared standard - machine scores, agent judges. Run before closing a session, after restructuring, when taking over an unfamiliar folder, or periodically. Not needed after every small edit. Vietnamese triggers - "soi chuẩn", "kiểm chuẩn", "có đúng chuẩn không", "check cấu trúc", "dự án này có bám chuẩn không".
---

# conform — kiểm độ bám chuẩn

> **Máy chấm trước, agent phán sau.** Máy chỉ biết "thư mục này không khớp slot nào"; **chỉ agent mới biết nó *nên* về slot nào, hay đây là concern thật cần thêm vào chuẩn**.

## Vì sao đừng tự đi soi bằng mắt

Đọc cả cây thư mục rồi tự đối chiếu là **đốt ngữ cảnh**. Script trả về bảng lệch vài trăm token; đọc cả repo tốn gấp hàng chục lần và vẫn sót. Chạy script trước, chỉ đọc **bảng lệch**.

## Quy trình

1. **Chạy:**
   ```
   python .claude/skills/structure/scripts/check_structure.py .
   ```
   Exit `0` = không có mục phải sửa · Exit `1` = có ít nhất một mục.

2. **Đọc từng mục theo mức:**
   - `PHẢI SỬA` — lệch chuẩn thật, phải xử lý
   - `xem xét` — máy không phán được, **agent phải quyết**

3. **Phán phần ngữ nghĩa máy không hiểu.** Một thư mục "không khớp slot nào" có ba khả năng:
   - đặt sai chỗ → đề xuất dời (skill `reconcile`)
   - là **concern THẬT mà chuẩn chưa khai** → đề xuất **thêm slot** vào skill `structure` §3 — đây là **đổi chuẩn**, phải trình user duyệt
   - là rác cần xoá → **đề xuất, chờ user xác nhận**, không tự xoá

4. **Sửa NGUỒN, không sửa báo cáo.** Đặt sai chỗ thì dời file; chuẩn thiếu thì bổ sung chuẩn. Đừng chỉnh script cho hết kêu.

5. **Chạy lại** để xác nhận. Ghi việc vào `05_TODO.md` / `06_CHANGES.md`.

> 🖥️ **Chỉ khi có `zemory` CLI:** `zemory conform --gate` cho bản đầy đủ hơn (có graph, `--json` cho máy đọc, exit 1 khi có mục blocking) và `zemory validate` kiểm riêng bộ docs harness. Hai việc khác nhau — `validate` hỏi *"bộ docs có đúng khuôn không"*, `conform` hỏi *"thư mục có bám chuẩn đã khai không"*. Đừng gộp.

## Cấm

- Coi báo cáo là chân lý mà không mở file thật ra đối chiếu.
- Xoá thư mục/file chỉ vì bảng nói vậy mà chưa hỏi user.
- Thêm slot vào chuẩn "cho đầy đủ" khi chưa có file thật nào thuộc về nó.
