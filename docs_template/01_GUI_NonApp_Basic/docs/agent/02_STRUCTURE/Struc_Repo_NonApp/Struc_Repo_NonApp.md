---
id: Struc_Repo_NonApp
name: repo-nonapp
version: 9
profile: non-app
label: NON-APP
intro: : sản phẩm / tài sản — agent đọc · dò · kéo · điền · xuất FILE (BI/report · data · docs-only · design), không phát triển app; không có luật UI
ask: ; mở một `.pbix` ra dò, đổ số vào template là NON-APP
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
from: _Store/02_STRUCTURE/Struc_Repo_NonApp @v9 #1b308a17a7db
---
# Struc_Repo_NonApp

The structure standard of a NON-APP repo: a product or an asset; the agent reads · searches · pulls · fills · exports files and
develops no app. This structure is how the slots are put together in `structure.json`; the slots live in `_Slot/` and belong to
no kind.
