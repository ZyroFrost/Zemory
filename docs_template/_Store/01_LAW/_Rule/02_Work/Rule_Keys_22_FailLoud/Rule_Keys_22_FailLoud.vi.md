---
version: 9
lang: vi
---
# Rule_Keys_22_FailLoud — A failure must show

## Luật là gì
Lỗi không bao giờ được giấu: nền chết thì bề mặt dừng theo hoặc báo lỗi thấy được; chặng chết thì chuỗi dừng với mã thoát khác 0;
sản phẩm ghi dở là lỗi và không giao đi.

## Khi nào áp
- Dựng hay chạy tiến trình nền · launcher · pipeline nhiều chặng · job theo lịch · script · cửa sổ tool.

## Phải làm gì
1. Nền chết ⇒ bề mặt phụ thuộc nó dừng theo, hoặc báo lỗi thấy được; không để vỏ rỗng trông như đang chạy.
2. Chặng chết giữa chừng ⇒ mã thoát ≠ 0, nêu tên chặng. Cổng sẵn sàng hỏng ⇒ dừng chuỗi; không xuất file thiếu số.
3. Sản phẩm ghi dở ⇒ coi là lỗi; không giao đi.

## Ví dụ
- Tình huống: pipeline nhiều chặng xuất báo cáo; chặng kéo dữ liệu chết giữa chừng.
- ✗ Sai: các chặng sau vẫn chạy, xuất file thiếu số, mã thoát 0, cửa sổ tool vẫn hiện "đang chạy".
- ✓ Đúng: chuỗi dừng ngay, mã thoát khác 0, thông báo nêu tên chặng hỏng; file ghi dở không giao đi.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu nói tới pipeline, job, chạy nền, treo hay crash thì hiện luật này; phần còn lại là phán đoán.
