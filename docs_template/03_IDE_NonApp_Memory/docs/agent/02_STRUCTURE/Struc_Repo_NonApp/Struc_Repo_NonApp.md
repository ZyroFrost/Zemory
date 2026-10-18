---
id: Struc_Repo_NonApp
name: repo-nonapp
version: 7
profile: non-app
label: NON-APP
intro: : sản phẩm / tài sản — agent đọc · dò · kéo · điền · xuất FILE (BI/report · data · docs-only · design), không phát triển app; không có luật UI
ask: ; mở một `.pbix` ra dò, đổ số vào template là NON-APP
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
from: _Store/02_STRUCTURE/Struc_Repo_NonApp @v7 #9a5270e7bc30
---
# Struc_Repo_NonApp

Chuẩn cấu trúc của một repo hệ NON-APP: sản phẩm hoặc tài sản; agent đọc · dò · kéo · điền · xuất file, không phát triển
app. Cấu trúc này là cách ghép các slot trong `structure.json`; slot nằm ở `_Slot/` và không mang hệ nào.
