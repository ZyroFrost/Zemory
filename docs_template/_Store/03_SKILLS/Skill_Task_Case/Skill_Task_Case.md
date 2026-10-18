---
id: Skill_Task_Case
aka: case
name: task-case
version: 9
type: process
description: >
  Mở, đóng hoặc mở lại một CASE trong tasks/<case>/ (chuẩn 1 case = 1 folder của hệ
  NON-APP). Dùng khi có một vấn đề mới cần điều tra, khi quay lại một vấn đề đã xử,
  hoặc khi được yêu cầu đóng/mở lại một case. Cụm hay gặp: "mở case", "lưu thành task",
  "task mới", "đóng case", "mở lại case", "vụ này lưu ở đâu".
---

# case — mở · đóng · mở lại một case

> Chuẩn slot + luật 1-case-1-folder: slot `Tasks_115_Tasks` `tasks/` · `Tasks_117_Case` `tasks/<case>/` · `Data_131_Case` `data/<case>/` (+ từ điển `Docs_138_DataDictionary`). Hồn của mẫu: mỗi vấn đề là
> một MẠCH VIỆC quay lại nhiều lần — mọi thứ của nó phải nằm MỘT chỗ, mở một folder ra hết.

## Trước khi mở case mới — TRA ĐÃ CÓ CHƯA

Đọc `content/README.md` (INDEX case) + cột *"gọi case"* (khi nào thì vào case này) trong spec các
case. Vấn đề trùng chủ đề case cũ → **mở lại case đó, KHÔNG đẻ case mới**. Đẻ thêm = kiến thức
tách đôi, đúng thứ luật này sinh ra để chặn. **Bước tra INDEX là bắt buộc, luôn luôn** — bỏ hẳn bước
này khi mở case mới là lỗi đã gặp thật.

🔴 **Xếp một PHÁT HIỆN LẠC vào case nào → DÒ GLOBAL MEMORY TRƯỚC, đừng đoán theo tên file.**
`zemory memory search "<từ khoá>" --all` → tìm **session sinh ra nó** → xếp theo **CHỦ ĐỀ
của session đó**. Ca điển hình: một phát hiện nằm trong folder X bị xếp thành "vụ X" theo tên
folder — báo sai chủ đề 3 lượt liền; gốc thật là một mạch việc khác hẳn. **Tên file nói nơi nó
NẰM, không nói nó thuộc VIỆC gì.**

## MỞ case

1. `tasks/<tên_case>/` — **tên THƯỜNG, KHÔNG đánh số**, kể cả case định kỳ. Quy ước đặt tên là của
   repo (vd một estate dùng `<MÃ PHÒNG>_<NHỊP>_<TênViệc>` như `IT_Weekly_Inventory`); chuẩn không ép
   tên, chỉ ép **không có số thứ tự**. ⚠ Bãi bỏ vế cũ *"số `NN_` cho case định kỳ"*: số trên tên case
   là số chết (case không chạy theo thứ tự, thêm/bỏ là đánh số lại cả dãy) và nó lẫn với số STAGE
   trong `pipeline/` của case vốn có nghĩa thật.
2. `spec.md` **viết TRƯỚC khi dò**, đủ 5 mục: **Trạng thái** · **Gọi case** *(nói gì thì vào đây)* ·
   **Mục lục file** · **Việc còn mở** · **§Mở lại case khi nào**.
3. Dò → findings `<ngày>_<slug>.md` · fix script `<ngày>_<slug>.sql` (**ĐỀ XUẤT**, người có quyền tự
   chạy — không tự thi hành lên nguồn ngoài) · query riêng `check_*.sql`. Data thật →
   `data/<tên_case>/` (gitignore, **mirror ĐÚNG TÊN**, chia 3 chặng theo slot `Data_132_01Raw`…`Data_134_03Output`).
4. Cập nhật INDEX `content/README.md`; metric mới (nếu có) → từ điển dữ liệu trong `02_STRUCTURE`;
   defect/spec dài (nếu có) → `docs/plan/`. Ba thứ này là **3 ngoại lệ** được nằm ngoài
   folder case.

**Chủ và dời case.** Tiền tố mã phòng trên tên case là chủ sở hữu: dời việc giữa các repo thì lấy đúng các folder mang tiền tố
của phòng đó, không mở nội dung ra phán lại. Dời là cắt, không chép: bản gốc biến mất trong cùng lượt (case + `data/<case>/`),
INDEX bên kia ghi đã dời, mọi tham chiếu đường cũ được nắn — hai bản cùng sống là trạng thái cấm. Dời thì giữ nguyên tên: đổi
tên là dời `project_root` trong bộ nhớ chung.

## ĐÓNG case

Đổi Trạng thái → `🟢 ĐÓNG <ngày>` + ghi **vì sao đóng** (đã vá / đã chốt không sửa /
không phải defect). **Việc còn mở KHÔNG được xoá** — chuyển thành *"đề xuất treo"* kèm điều
kiện lôi ra lại. ⚠ Việc **chưa xong mà không thuộc phạm vi case** thì ghi rõ **"KHÔNG đóng
theo"** và đẩy sang `04_TODO` — đóng case không được nuốt mất việc còn nợ.

## MỞ LẠI

Đọc `§Mở lại case khi nào` trước — nó đã ghi sẵn dấu hiệu cần canh. Đổi Trạng thái về
`🟡 MỞ`, **nối findings mới vào CUỐI** (KHÔNG sửa/xoá findings cũ — đó là bản ghi lịch sử),
nêu rõ lần này khác lần trước ở đâu.

## Bất biến

Mở đúng **1 folder** phải thấy hết: *đã biết gì · đã vá gì · còn nợ gì*.
Thấy file của case nằm lạc slot khác → nắn về (`git mv`), trừ 3 ngoại lệ ở trên.
