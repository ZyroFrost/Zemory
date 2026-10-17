---
id: Skill_Dev_Pbi
name: dev-pbi
version: 1
description: Build or change a BI report - layout and chart choice, measures and queries kept in one named store, and the report file handled as a heavy binary. Use whenever a report, dashboard, measure or visual is created or changed. Vietnamese triggers - "báo cáo", "dashboard", "biểu đồ", "measure", "DAX", "Power Query", "pbix".
---

# dev-pbi — dựng và sửa báo cáo BI

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
  trong từng visual (`Rule_Gate_35_OneHome`).
- Đổi một measure dùng chung ⇒ liệt kê mọi visual và báo cáo dùng nó trước khi đổi (`Rule_Core_80_SharedChangeImpact`).
- Sau khi đổi: làm mới dữ liệu và đối chiếu tổng với nguồn bằng số (`Rule_Gate_01_DoneMeansRun`).

## 3. File báo cáo

- `.pbix` là nhị phân nặng: đi qua LFS theo `.gitattributes`, không commit thẳng (`Rule_Gate_21_WhatEntersGit`).
- Dữ liệu thật nằm ngoài git; repo chỉ giữ mẫu nhỏ đủ mở báo cáo.
