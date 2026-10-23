---
id: Slot_150
name: drivers
version: 2
path: Software/Drivers/<Thiết bị>/
scope: layout
---
# Software_150_Drivers drivers — gói driver của một thiết bị

## Vai trò

`Software\Drivers\` giữ gói driver đã tải về của các thiết bị gắn vào máy (máy in, card mạng, màn hình phụ, thiết bị đọc
thẻ…), để cài lại được ngay trên máy mới mà không phải đi tìm lại trên trang của hãng.

## Hai cách đặt

- Gói nhiều tệp (thư mục `disk1\`, các tệp `.inf`, bộ cài kèm) ⇒ một thư mục cho mỗi thiết bị:
  `Software\Drivers\<Hãng>_<Mẫu>\`, bên trong GIỮ NGUYÊN cây gói như hãng phát hành, không xếp lại.
  Ví dụ: `D:\Software\Drivers\Ricoh_2852\disk1\…`.
- Bộ cài driver một tệp ⇒ được để thẳng ngay dưới `Software\Drivers\`, giữ nguyên tên tệp.
  Ví dụ: `D:\Software\Drivers\PrinterDriver_x64_v5.exe`.

## Luật

- Driver KHÔNG theo khuôn `Setup\` · `App\` · `Data\` của `Software_149_Program`: driver được cài vào hệ thống, không có bản
  chạy tại chỗ. Vì vậy `conform` không đòi ba thư mục con ở đây.
- Chỉ chứa gói driver. Phần mềm đi kèm thiết bị có giao diện riêng (ví dụ công cụ quản lý máy in của hãng) là một phần mềm ⇒
  xếp vào nhóm của nó (thường `System\<Hãng>\<Ứng dụng>\`) với đủ ba thư mục con.

## Khuôn tên

`<Hãng>_<Mẫu>`: tên hãng và mã mẫu thiết bị nối bằng dấu gạch dưới, không dấu cách: `Ricoh_2852` · `Canon_LBP2900`.

## Phép kiểm

`zemory conform --layout <gốc ổ>` chỉ kiểm rằng `Drivers` là một nhóm hợp lệ của `Software\`; bên trong `Drivers\` không bị
kiểm khuôn ba thư mục.
