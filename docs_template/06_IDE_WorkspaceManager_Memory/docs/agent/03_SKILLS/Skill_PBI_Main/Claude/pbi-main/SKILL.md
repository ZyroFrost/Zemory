---
id: Skill_PBI_Main
name: pbi-main
version: 4
type: process
description: Build the MAIN copy of a Power BI report - the warehouse model and the NEW design to the region's standard, with no old copy to cite. Use whenever a report is designed from scratch, the official copy replaces the old system, or the full design standard is applied to a file. Not when the old design is kept (pbi-classic or pbi-mix). Vietnamese triggers - "bản main", "dựng report mới", "thiết kế mới theo chuẩn", "bản chính thức".
from: _Store/03_SKILLS/Skill_PBI_Main @v4 #0213cc135f17
---

# Bản `Main` — thiết kế MỚI trên kho, áp đủ chuẩn

> 🔴 **`Main` = kho DW + thiết kế mới, bản chính thức** (`Skill_PBI_Base` `reference/naming.md`).
> Khác ba loại kia ở đúng một điểm: **không có "bản cũ" nào để viện dẫn.** `Classic` và `Mix` đều
> được phép giữ thứ trông không chuẩn vì bản cũ làm vậy; ở đây **không có ngoại lệ đó**.

## 1. File này KHÔNG chép lại chuẩn — nó chỉ nói chuẩn nằm đâu

Luật thiết kế là tài sản **dùng chung**, nhà của nó ở `repo quản lý vùng`. Chép sang đây là đẻ
bản sao thứ hai, và bản sao thì trôi lệch — đã trả giá: một bản chép của bảng màu mang hai mã đã
chết đi lang thang **suốt một tháng** sau khi chúng bị thay.

| Cần gì | Mở |
|---|---|
| Bảng màu · theme · icon · nút bấm được · slicer | `Skill_PBI_Base` `reference/design.md` §1–§2 |
| Cấu trúc measure, thư mục theo trang, tiền tố `#/%/~`, bảng `Parameter_*` | `Skill_PBI_Base` `reference/model.md` |
| Bộ số khoảng cách, lưới 5, khung trắng | `Skill_PBI_Base` `reference/design.md` §3 |
| Khung UI có sẵn — chỉ thay dữ liệu | `Skill_PBI_Base` `reference/design.md` §3.5 |
| Thao tác sửa `.pbip` mà không vỡ file | `.claude/skills/pbi-pbip/SKILL.md` |
| Tài sản ảnh, theme | thư mục `assets/` của repo tổng quản vùng (`theme_file` · `icons_dir` trong giá trị vùng) |

## 2. Bốn thứ hay bị bỏ sót nhất — nhắc ở đây vì chúng hỏng LẶNG

- 🔴 **`header.show` của slicer không khai thì mặc định BẬT.** Quét `"show": true` ra 0 kết quả và
  tưởng đã tắt là sai — phải khai **tường minh** `false`. Ca thật: **22/22 slicer** dính, trong khi
  `title.show` đã `false` sẵn nên nhìn lướt tưởng xong.
- 🔴 **`visualLink` đặt sai tầng thì nút im lặng** — khoá phải nằm ở `visual.visualContainerObjects.visualLink`, không ở
  `visual.visualLink`. Đặt sai tầng: Power BI vẫn mở file, không báo gì, bấm không chạy. `shape` mang `visualLink` đúng tầng
  bấm được (đo trên chính một report Main: `BG_UserGuide`).
- 🔴 **Bê visual từ khuôn mẫu là thừa hưởng mọi mặc định của khuôn**, kể cả thứ không có dòng nào
  trong JSON. Hay dính nhất: `ThemeDataColor` `ColorId: 7, Percent: 0.2` ⇒ **chữ xám lợt mà JSON vẫn
  hợp lệ**. Chữ thì ghi thẳng mã màu.
- 🔴 **Kéo tay trong Desktop sinh số thập phân** (`50.23255813953489`). Kéo xong phải nắn về bội số
  của 5, mọi `x·y·width·height` của **mọi** object.

## 3. Trang thật, không trang mẫu

🔴 **File thật chỉ chứa trang THẬT** (design.md §3.4). Khuôn mẫu ship sẵn 5 trang demo
(`Sales Overview` · `Payment & Channel` · `Customer Analysis` · `Product Performance` ·
`Regional Insights`) — **không trang nào có thật**. Xem thì xem từ khuôn gốc, đừng để lại trong file.

Kéo theo: **cột nút điều hướng có đúng bấy nhiêu nút như số trang thật**, xếp từ ô đầu, thứ tự theo
`pageOrder`, ô thứ `i` ở `y = (i−1) × 60`. Bỏ một trang thì **dồn các cặp còn lại lên**, đừng để ô
trống phía trên — toạ độ nút là **địa chỉ theo thứ tự trang**, không phải vị trí cố định.

## 4. Đổi tên trong model — cổng nghiệm thu là DAX chạy thật

🔴 **Đọc file KHÔNG chứng minh được gì** (model.md §7). Sau mọi lượt đổi tên bảng/cột/measure:

```
TMSCHEMA_MEASURES   State = 1 toan bo
EVALUATE ROW("v",[<tung measure>])   chay TUNG cai, 0 loi
```

*Ca thật: một lượt báo "0 tham chiếu hụt · Desktop mở sạch" trong khi **23 measure đang lỗi** — cổng
tĩnh chỉ đọc dòng `column`, còn lượt mở Desktop chỉ chạy thử 3 measure.*

⚠ Bảng `DATATABLE` lấy tên cột từ **chuỗi trong `DATATABLE`**, không từ dòng khai `column` — phép
thay tên mù sẽ ăn vào chuỗi và đẻ ra cột tên lạ mà cổng tĩnh không thấy.

## 5. Nghiệm thu

```
model   1 bảng #Measure · thư mục chữ cái theo trang · tiền tố #/%/~ · bảng Parameter_* rời
design  mọi mã màu thuộc bảng màu của cụm · lưới 5 · khe 5 · nút cách 60
     grep -rhoP '#[0-9A-Fa-f]{6}' <Tên>.Report/definition | sort -u
     -> tập con của bảng màu (trừ file theme, đó là nơi khai màu)
     0 slicer còn header bật · 0 visualLink nằm trên shape
DAX  mọi measure State = 1 VÀ chạy ra kết quả
THẬT mở Desktop, KHÔNG có hộp thoại "report has issues", rồi NHÌN tận mắt
```

🔴 Mục cuối **không tự động hoá được**, và nó là mục duy nhất chứng minh được cái gì.
