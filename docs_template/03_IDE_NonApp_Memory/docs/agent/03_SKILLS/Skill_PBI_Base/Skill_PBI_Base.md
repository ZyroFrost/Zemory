---
id: Skill_PBI_Base
name: pbi-base
version: 9
type: process
installs: [scripts/pbi_engine_query.ps1]
aka: dev-pbi
replaces: [Skill_Dev_Pbi]
description: Build or change a BI report - layout and chart choice, measures and queries kept in one named store, and the report file handled as a heavy binary. Use whenever a report, dashboard, measure or visual is created or changed. Vietnamese triggers - "báo cáo", "dashboard", "biểu đồ", "measure", "DAX", "Power Query", "pbix".
from: _Store/03_SKILLS/Skill_PBI_Base @v9 #3cf44da5ba4b
---

# pbi-base — dựng và sửa báo cáo BI

> Đổi bố cục, biểu đồ, theme của báo cáo đang dùng ⇒ trình trước (`Rule_Keys_62_DesignChangeApproval`). Điền số theo
> mẫu có sẵn thì cứ làm. Repo có skill báo cáo riêng chi tiết hơn ⇒ theo skill đó, skill này là sàn.

## 1. Bố cục và biểu đồ

- Giữ bố cục đã chốt; thêm trang hay ô mới theo khuôn các trang có sẵn (`Rule_Core_81_FollowExistingPattern`).
- Chọn biểu đồ theo câu hỏi: so sánh giữa nhóm ⇒ cột/thanh · xu hướng theo thời gian ⇒ đường · cơ cấu ít phần ⇒ cột chồng
  hoặc tròn (tối đa vài phần) · chi tiết tra cứu ⇒ bảng.
- Mỗi hình có tiêu đề nói điều nó trả lời; mỗi số có đơn vị và kỳ; nhãn bằng từ nghiệp vụ (`Rule_Gate_02_ReaderText`).
- Ý tưởng biểu đồ mới ⇒ rút khuyến nghị, trình phương án; không tự áp.

## 2. Measure và truy vấn

- DAX · M · SQL của báo cáo gom ở kho câu của repo (`queries/` · `measures/`), mỗi câu có tên, gọi theo tên; không viết rải
  trong từng visual (`Rule_Gate_35_OneHome`). Câu chỉ MỘT case dùng ⇒ `tasks/<case>/check_*.sql`; `queries/` chỉ giữ câu từ hai
  case trở lên dùng (slot `Queries_122_Queries`).
- Đổi một measure dùng chung ⇒ liệt kê mọi visual và báo cáo dùng nó trước khi đổi (`Rule_Core_80_SharedChangeImpact`).
- Sau khi đổi: làm mới dữ liệu và đối chiếu tổng với nguồn bằng số (`Rule_Gate_01_DoneMeansRun`).

## 3. File báo cáo

- `.pbix` là nhị phân nặng: đi qua LFS theo `.gitattributes`, không commit thẳng (`Rule_Gate_21_WhatEntersGit`).
- Dữ liệu thật nằm ngoài git; repo chỉ giữ mẫu nhỏ đủ mở báo cáo.

## 4. Chuẩn report Power BI của repo phòng ban

Repo phòng ban dựng report Power BI trên DW theo bốn loại (`Legacy` · `Classic` · `White` · `Red`, skill `pbi-pbip` §0). Chuẩn
chung của bốn loại nằm ở ba file dưới; skill của từng loại chỉ nói phần riêng và trỏ về đây.

| Cần gì | Mở |
|---|---|
| tên thư mục và file · số report · đổi tên · một report một thư mục · `.pbip` · bỏ hệ cũ | `reference/naming.md` |
| `#Measure` · thư mục measure theo trang · tên measure · `Parameter_*` · Kimball của DW · hai tầng tên của `Classic` | `reference/model.md` |
| màu · tương tác · icon · slicer · lưới 5 · khung · dải title · dựng trên khung có sẵn | `reference/design.md` |

Giá trị thật của cụm (mã màu, theme, icon, khuôn gốc, máy chủ DW, nguồn hệ cũ) nằm ở tổng quản; file chuẩn chỉ nêu tên khoá
trong giá trị cụm.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — the report design standard whose suggestions are shown first · chuẩn thiết kế báo cáo mà gợi ý phải trình trước
