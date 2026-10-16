---
id: Struc_Repo_NonApp
name: repo-nonapp
version: 2
profile: non-app
label: NON-APP
intro: : sản phẩm / tài sản — agent đọc · dò · kéo · điền · xuất FILE (BI/report · data · docs-only · design), không phát triển app; không có luật UI
ask: ; mở một `.pbix` ra dò, đổ số vào template là NON-APP
index-role: thứ gì nằm đâu, từ điển dữ liệu của repo
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
from: _Store/03_STRUCTURE/Struc_Repo_NonApp @v2 #3812b90cdd35
---
# Struc_Repo_NonApp

Chuẩn cấu trúc của một repo hệ NON-APP: sản phẩm hoặc tài sản; agent đọc · dò · kéo · điền · xuất file, không phát triển
app. Cấu trúc này là cách ghép các slot trong `structure.json`; slot nằm ở `_Struc_Slot/` và không mang hệ nào.
