---
version: 11
lang: vi
---
# Rule_Gate_59_ReadFirst — Read before the first write

## Luật là gì
Trước lần ghi đầu tiên của phiên, agent đọc trọn các luật không có máy giữ, hiến pháp repo đã điền và sổ việc. Đọc một phần file
không tính.

## Khi nào áp
- Lần Write / Edit / lệnh có ghi đầu tiên của phiên trong một repo.
- Lần ghi cần đọc riêng: file của một case, thư mục mới, việc khớp một skill.

## Phải làm gì
1. Đọc trọn: các luật loại `Core` (không hook nào giữ) trong `01_LAW/_Rule`, mọi `Cons.md` đã điền và điều riêng của repo trong
   `01_LAW/_Cons`, và cả `04_TODO`.
2. Đọc thứ lần ghi cần: ghi vào `tasks/<case>/` ⇒ spec và mẫu mail của case đó; tạo thư mục ⇒ cấu trúc đã ráp của repo
   (`02_STRUCTURE/INDEX.md`, rồi tới slot); việc khớp một skill ⇒ skill đó (`Rule_Gate_63_SkillTrigger`).
3. `grep`, `head` hay đọc lướt không tính là đã đọc; mở file bằng Read.

## Ví dụ
- Tình huống: phiên mới mở repo báo cáo, được giao sửa mẫu email gửi hằng tuần.
- ✗ Sai: mở file mẫu rồi sửa ngay, chưa đọc luật lõi, hiến pháp, sổ việc và spec của case.
- ✓ Đúng: đọc đủ phần bắt đọc và spec của case rồi mới ghi; chưa đọc thì lần ghi bị chặn và lời chặn nêu rõ còn thiếu gì.

## Máy kiểm
- Chốt read-first chặn lần ghi tới khi đọc đủ; không có cờ vượt. Cách hoạt động (so theo dòng, nén ngữ cảnh, khoá marker
  `readFirst`, fail-open): ghi chú guard ở `02_STRUCTURE/_Host/IDE`.
