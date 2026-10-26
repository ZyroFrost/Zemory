---
version: 1
lang: vi
---
# dev-assets-pull — bản chép của giao diện dùng chung

Vì sao là một phần riêng: `Skill_Dev_AppDesign` nói bề mặt app trông thế nào, không nói tệp dùng chung lấy từ đâu ·
`Skill_PBI_Base` dựng báo cáo · `Skill_Task_Pull` kéo DỮ LIỆU từ nguồn. Không skill nào lấy tệp giao diện từ `_Design\`.

## Khi nào

- App cần một logo, icon, nền, font hay màu mà tổ chức đã có.
- `_Design\Assets\` vừa đổi (logo mới, bộ icon mới) và repo phải theo.
- Trước khi phát hành: bản chép phải khớp nguồn.

## Nguồn và bản chép

- Nguồn là `Workspace\Company\<Org>\_Design\Assets\<Loại>\` của tổ chức (slot `Design_172_Design`), nơi DUY NHẤT sửa logo, icon
  hay màu dùng chung.
- Repo giữ BẢN CHÉP trong slot của chính nó `frontend/assets/<loại>/` (`Frontend_060_Assets`) và COMMIT chúng, để repo tự build và
  chạy được một mình, không trỏ ra ngoài repo. Cấu trúc tài nguyên của repo không đổi; tệp riêng của repo (nguồn không có) không
  bao giờ bị đụng.
- Bảng loại: `Logo` → `logo/` · `Icon` → `icons/` · `Background` → `backgrounds/` · `Image` → `images/` · `Font` → `fonts/` ·
  `Color` → `color/`. Một tệp trong `frontend/assets/<loại>/` mà đường của nó cũng có trong loại tương ứng của nguồn là bản chép;
  không giữ danh sách bản chép.

## Các bước

1. Lấy một tệp app chưa có: `node scripts/assets_pull.mjs --add Logo/<tệp>` (đường bên trong `_Design\Assets\`).
2. Đưa mọi bản chép về khớp nguồn: `node scripts/assets_pull.mjs`.
3. Nối phép kiểm vào cổng của repo: trong `package.json`, `npm run check` chạy `node scripts/assets_pull.mjs --check`, lệnh này
   thoát 1 khi một bản chép khác nguồn.
4. Commit bản chép cùng thay đổi cần đến nó.

Script tìm nguồn theo thứ tự: `--source <thư mục>` · biến môi trường `ZEMORY_DESIGN_DIR` · thư mục `_Design` đầu tiên phía trên
repo có chứa `Assets\`. Máy không có nguồn (máy build) nhận một dòng báo và thoát 0: bản chép đã commit vẫn build được app.

## Luật

- Không bao giờ sửa bản chép. Logo hay icon sai thì sửa ở `_Design\Assets\` rồi kéo về.
- Không bao giờ cho app trỏ tới `_Design\` lúc build hay lúc chạy.
- Tệp chỉ riêng app dùng thì ở lại trong repo; nó chỉ lên `_Design\` khi một repo thứ hai hoặc một báo cáo cần đến.

## Ví dụ

`_Design\Assets\Logo\Acme.png` vừa đổi. Trong repo app `AcmeFlow`: `node scripts/assets_pull.mjs` cập nhật
`frontend/assets/logo/Acme.png`, để nguyên `frontend/assets/logo/AcmeFlow.png` (tệp riêng của app), và `npm run check` xanh lại.

## Phép kiểm

`node scripts/assets_pull.mjs --check` xanh: mọi bản chép khớp nguồn.

## Thi hành luật
- `Rule_Gate_35_OneHome` — một nguồn cho logo, icon, màu dùng chung; mọi repo chép từ đó, không repo nào tự sửa bản của mình
