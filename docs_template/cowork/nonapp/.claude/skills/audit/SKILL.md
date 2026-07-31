---
name: audit
description: Run a full review of the project across every dimension, verifying each finding against real files before reporting it. Use only when the user explicitly asks for a thorough audit, or before a major milestone such as a release or a large batch of changes. This is not a quick check. Vietnamese triggers - "audit toàn diện", "soi hết", "kiểm tra toàn bộ", "rà lại hết", "review tổng thể".
---

# audit — soi toàn diện

> User nói **"audit toàn diện" / "soi hết"** = chạy **đủ ba mặt** dưới, **không cắt bớt cho nhanh**.

## Năm luật

**1 — Cổng xanh KHÔNG phải bằng chứng.** Nó chỉ chứng minh *những gì phép kiểm soi thì đúng*, không chứng minh nó đang soi thứ đang chạy. Luôn hỏi: *phép kiểm này đang đọc FILE NÀO?*

**2 — VERIFY từng phát hiện rồi mới ghi.** Một phát hiện sai làm hỏng lòng tin vào cả bảng. Đối chiếu file THẬT trước khi gọi là "lỗi".

**3 — Mọi con số phải ĐO.** Không suy luận, không nhớ lại. Không đo được thì ghi thẳng **"chưa đo"**.

**4 — Hỏi ngược mỗi phép kiểm: *"cái gì làm nó ĐỎ?"*** Trả lời không được ⇒ phép kiểm đó không thể nổ. Một phép kiểm không nổ được **còn tệ hơn không có** — nó phát ra lời bảo đảm trong khi chưa hề nhìn.

**5 — PHÁ THỬ trước khi tin một phép kiểm.** Đừng dừng ở câu trả lời trên giấy: **sửa hỏng đúng thứ nó canh** (đổi một số trong nguồn, xoá một dòng bắt buộc, đổi tên một cột) rồi chạy lại — nó phải ĐỎ. Sống sót ⇒ phép kiểm đó đang canh chỗ khác, hoặc **một bản sao logic ở nơi khác đang gánh thay**. Nhớ hoàn nguyên thứ vừa phá.

## Ba mặt — chạy đủ

**① Chuẩn & docs**
`python .claude/skills/structure/scripts/check_structure.py .` (skill `conform`) · độ dài `05_TODO`/`06_CHANGES` so ngưỡng 300 dòng · `05_TODO` còn mục nào đã xong mà chưa đóng không · entry changelog nào vượt trần 30 dòng.

**② Nguồn trùng**
Cùng một sự thật nằm ở **≥2 nơi** ⇒ chắc chắn sẽ lệch. Soi: metric định nghĩa ở `03_STRUCTURE` §2 nhưng tính khác trong `measures/` · cùng một truy vấn chép ở hai chỗ · file/thư mục ngoài chuẩn · docs lặp nội dung của nhau.

**③ Bề mặt sống — nhìn tận mắt**
**Mở deliverable ra xem.** Suy luận từ file nguồn không thay được việc nhìn: đã có lần mọi phép kiểm xanh mà báo cáo vẫn hiển thị sai. Kiểm vài số mốc so với nguồn, kiểm ngày tháng, kiểm bản đang ở đích có đúng bản mới nhất không.

## Đầu ra

Bảng phát hiện, mỗi mục ghi: **đo được gì · ảnh hưởng · sửa ở đâu**, phân `phải sửa` / `xem xét`.
Vào `05_TODO.md` + `06_CHANGES.md`.
**Nghi vấn đã loại cũng ghi, kèm lý do loại** — để lần sau khỏi đào lại.

## Cấm

- Cắt bớt mặt nào cho nhanh.
- Ghi phát hiện chưa verify.
- Báo "sạch" khi mới chạy mỗi script kiểm chuẩn.
