---
version: 1
lang: vi
---
# Downloads_168_Downloads downloads — tầng thô: chưa xếp

## Vai trò

`<gốc dữ liệu>\Downloads\` chứa đồ gom từ bất kỳ đâu về mà CHƯA XẾP: file trình duyệt tải về, file chép ra từ điện thoại hay USB,
một mớ đổ ra từ máy cũ. Đây là bước 0 của chuỗi câu hỏi cấp ổ (`Struc_Disk_Data`): món chỉ nằm ở đây tới khi có người trả lời chuỗi
câu hỏi cho nó. Đây là tầng thô nuôi cả cây, không phải hộp chờ của một slot.

## Luật

- Mọi thư mục khác của cây không giữ hộp chờ: món chưa xếp thì ở `Downloads\`, không ở đâu khác.
- Xếp một món = đi chuỗi câu hỏi của `Struc_Disk_Data` rồi dời nó tới đáp án đúng đầu tiên.
- Bên trong chia thế nào tuỳ chủ máy (theo nguồn, theo ngày); không có gì ở đây bị kiểm.
- Trỏ thư mục tải về của trình duyệt vào đây (`D:\Downloads\`), không để ở `%USERPROFILE%\Downloads` trên ổ hệ thống.

## Không thuộc đây ⇒ đi đâu

Mọi thứ đã xếp: chỗ của nó trong chuỗi câu hỏi. Bản sao mà bản gốc còn ⇒ `Backup\`; bản gốc đã nghỉ ⇒ `Archive\`.

## Đồng bộ

Không vào git, không đồng bộ.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `Downloads\` là thư mục cấp 1 hợp lệ và báo đỏ repo nằm trong nó
(`repo-outside-workspace`). Bên trong không bị kiểm.
