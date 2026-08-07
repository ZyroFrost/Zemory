---
name: case
description: >
  Mở, đóng hoặc mở lại một CASE trong tasks/<case>/ (chuẩn 1 case = 1 folder của hệ
  NON-APP). Dùng khi user đưa một vấn đề mới cần điều tra, quay lại một vấn đề đã xử,
  hoặc muốn đóng/mở lại một case. Cụm user hay gõ: "mở case", "lưu thành task",
  "task mới", "đóng case", "mở lại case", "vụ này lưu ở đâu".
---

# case — mở · đóng · mở lại một case

> Chuẩn slot + luật 1-case-1-folder: `03_STRUCTURE §2 §3 §4`. Hồn của mẫu: mỗi vấn đề là
> một MẠCH VIỆC quay lại nhiều lần — mọi thứ của nó phải nằm MỘT chỗ, mở một folder ra hết.

## Trước khi mở case mới — TRA ĐÃ CÓ CHƯA

Đọc `content/README.md` (INDEX case) + cột *"vào đây khi user nói"* trong spec các case.
Vấn đề trùng chủ đề case cũ → **mở lại case đó, KHÔNG đẻ case mới**. Đẻ thêm = kiến thức
tách đôi, đúng thứ luật này sinh ra để chặn.

🔴 **Xếp một PHÁT HIỆN LẠC vào case nào → DÒ GLOBAL MEMORY TRƯỚC, đừng đoán theo tên file.**
`zemory memory search "<từ khoá>" --all` → tìm **session sinh ra nó** → xếp theo **CHỦ ĐỀ
của session đó**. Bài học gốc (repo đầu tiên dùng mẫu này): một phát hiện nằm trong folder
X bị xếp thành "vụ X" theo tên folder — báo sai chủ đề 3 lượt liền; gốc thật là một mạch
việc khác hẳn. **Tên file nói nơi nó NẰM, không nói nó thuộc VIỆC gì.**

⚠ Cùng repo đó còn một bài học nữa: agent bỏ hẳn bước tra INDEX khi mở case mới — user
phải nhắc. Tra trước, luôn luôn.

## MỞ case

1. `tasks/<tên_case>/` — tên thường không số. **Số `NN_` CHỈ cho case định kỳ / chạy tự động.**
2. `spec.md` **viết TRƯỚC khi dò**, đủ 5 mục: **Trạng thái** · **Gọi case** *(user nói gì
   thì vào đây)* · **Mục lục file** · **Việc còn mở** · **§Mở lại case khi nào**.
3. Dò → findings `<ngày>_<slug>.md` · fix script `<ngày>_<slug>.sql` (**ĐỀ XUẤT**, user tự
   chạy — không tự thi hành lên nguồn ngoài) · query riêng `check_*.sql`. Data thật →
   `data/<tên_case>/` (gitignore, **mirror ĐÚNG TÊN**, chia 3 chặng theo `03_STRUCTURE §4`).
4. Cập nhật INDEX `content/README.md`; metric mới (nếu có) → từ điển `03_STRUCTURE §7`;
   defect/spec dài (nếu có) → `docs/plan/`. Ba thứ này là **3 ngoại lệ** được nằm ngoài
   folder case.

## ĐÓNG case

Đổi Trạng thái → `🟢 ĐÓNG <ngày>` + ghi **vì sao đóng** (đã vá / user chốt không sửa /
không phải defect). **Việc còn mở KHÔNG được xoá** — chuyển thành *"đề xuất treo"* kèm điều
kiện lôi ra lại. ⚠ Việc **chưa xong mà không thuộc phạm vi case** thì ghi rõ **"KHÔNG đóng
theo"** và đẩy sang `05_TODO` — đóng case không được nuốt mất việc còn nợ.

## MỞ LẠI

Đọc `§Mở lại case khi nào` trước — nó đã ghi sẵn dấu hiệu cần canh. Đổi Trạng thái về
`🟡 MỞ`, **nối findings mới vào CUỐI** (KHÔNG sửa/xoá findings cũ — đó là bản ghi lịch sử),
nêu rõ lần này khác lần trước ở đâu.

## Bất biến

Mở đúng **1 folder** phải thấy hết: *đã biết gì · đã vá gì · còn nợ gì*.
Thấy file của case nằm lạc slot khác → nắn về (`git mv`), trừ 3 ngoại lệ ở trên.
