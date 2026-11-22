---
id: Cons_117
aka: 01-17
name: mot-chuc-nang-mot-lenh
version: 1
kind: judgment
---
# Cons_Core_117_MotChucNangMotLenh MỘT CHỨC NĂNG = MỘT LỆNH. KHÔNG BAO GIỜ để HAI lệnh làm cùng một việc

**MỘT CHỨC NĂNG = MỘT LỆNH. KHÔNG BAO GIỜ để HAI lệnh làm cùng một việc** *(user chốt 2026-09-18: "không được để 2 lệnh chạy trùng 1 chức năng, áp dụng cho toàn repo")*. Mỗi việc người dùng gọi được phải có **đúng một cửa vào**. Đẻ cửa thứ hai cho việc đã có cửa là **bug thiết kế**, kể cả khi cả hai chạy đúng.
    - **Phủ MỌI bề mặt, không riêng CLI:** verb dòng lệnh · nút trên UI · endpoint HTTP · tool MCP · script. Hỏi cùng một câu ở hai chỗ thì đó là hai lệnh trùng, dù chúng khác tên.
    - **Trước khi thêm, câu hỏi KHÔNG phải *"cái này có ích không"* mà là *"đã có chỗ nào trả lời câu này chưa"*.** Có rồi ⇒ **MỞ RỘNG chỗ đó**, không mở chỗ mới. Đây là phép thử bắt buộc, không phải lời khuyên.
    - **Ngoại lệ DUY NHẤT — BẢN MIRROR có khai báo:** một bề mặt khác được phép phơi cùng năng lực **nếu nó DELEGATE về đúng một bản cài đặt** và không tự nhận là tính năng khác (MCP `graph_impact` gọi lại CLI · `memory_scan` gọi `scan()`). Hai bản **cài đặt** cho cùng một việc thì không phải mirror, đó là hai lệnh trùng.
    - **Cái giá thật KHÔNG phải mớ mã thừa, mà là người dùng mất khả năng nói gọn.** Nguyên văn user khi chốt: *"lỡ mắc công t nói chạy đồng bộ mà lại chạy 2 cái khác nhau nữa"*. Thêm vào đó, hai đường luôn TRÔI LỆCH — và lệch theo kiểu mỗi bên đều đúng theo tham số của mình.
    - **Hai ca đã trả giá, đo được:** ① 2026-09-18 — thêm `standard diff` cạnh `sync --check` vốn ĐÃ trả lời *"repo này lệch chuẩn chỗ nào"*; đã gỡ, gộp về `sync`. ② 2026-09-12 — app báo *"2 tiến trình thừa"* trong khi `zemory sweep` nói *"không có gì"*, chỉ vì hai ngưỡng tuổi khác nhau; **mỗi bên đều đúng theo tham số của mình**, và đó chính là kiểu sai khó bắt nhất.
    - **Liên hệ, không trùng:** điều 4 nói về *capability trong registry* (1 slot = 1 provider, chuyện nội bộ); điều này nói về **cửa vào người dùng gọi**. `.claude/skills/app-design §F0b` (một chức năng = một khung) và `§F6` (một số = một nhà) là bản áp cho bề mặt UI; điều 17 là tầng trên của cả hai, phủ mọi bề mặt.

- **Chưa có chốt máy:** CHƯA có cổng (manifest verb CLI ↔ endpoint ↔ MCP) — việc mở
