---
version: 1
lang: vi
---
# Design_172_Design design — giao diện dùng chung của tổ chức

## Vai trò

`Workspace\Company\<Org>\_Design\` là NGUỒN DUY NHẤT của mọi thứ giao diện mà các repo của tổ chức dùng chung: mẫu báo cáo của
từng công cụ báo cáo, và tài nguyên giao diện (logo, icon, nền, ảnh, font, màu). App và báo cáo của mọi phòng ban đều dùng, nên
theo luật khối của `Struc_Disk_Data` (luật 3) nó nằm ở cấp tổ chức, dưới tên có `_`. Đây là nơi cung cấp vai `design`, ráp từ
khung `Struc_Repo_Reference`.

Vì sao là một phần riêng: `Template_157` giữ mẫu của MỘT công cụ báo cáo, không giữ tài nguyên giao diện cho app ·
`Profile_170` là giấy tờ của chủ máy, bị loại khỏi đồng bộ · `Assets_127` và `Frontend_060` là slot BÊN TRONG một repo, nơi bản
chép đặt xuống, không phải nguồn để chép từ đó.

## Bên trong

Con chia theo LOẠI, chữ đầu viết hoa, không có `_` bên trong khối. Chỉ tạo thư mục khi có tệp để chứa.

```
_Design\
├── PBI_Template\      mẫu báo cáo Power BI và theme của nó (Template_157)
├── <Tool>_Template\   mẫu của công cụ báo cáo khác, nằm cạnh (Template_157)
└── Assets\
    ├── Logo\          logo của tổ chức, logo của từng app
    ├── Icon\          bộ icon đầy đủ, cho cả app lẫn báo cáo
    ├── Background\
    ├── Image\
    ├── Font\
    └── Color\         tệp màu (.json)
```

## Quy tắc

- Nguồn DUY NHẤT. Logo, icon, màu hay mẫu chỉ sửa ở đây, không sửa ở nơi nào khác; repo không bao giờ sửa bản chép của mình.
- Repo CHÉP đúng những tệp nó dùng vào slot của chính nó và COMMIT bản chép, để repo tự build và chạy được một mình: không có
  đường dẫn nào trỏ ra ngoài repo lúc build hay lúc chạy. Cấu trúc tài nguyên của repo không đổi: app giữ `frontend/assets/<loại>/`
  (`Frontend_060_Assets`), báo cáo giữ chỗ của công cụ nó (Power BI: `StaticResources`), tệp riêng của repo mà nguồn không có thì
  không bị đụng.
- Bản chép được lấy và kiểm bằng skill `Skill_Dev_AssetsPull`: một tệp trong `frontend/assets/<loại>/` trùng tên với một tệp trong
  `_Design\Assets\<Loại>\` là bản chép (Logo → `logo/` · Icon → `icons/` · Background → `backgrounds/` · Image → `images/` ·
  Font → `fonts/` · Color → `color/`); không giữ danh sách bản chép nào bên cạnh.
- Thư mục ĐỒNG BỘ bằng Syncthing, KHÔNG phải repo git: không `git init`, không push. Mỗi tổ chức một thư mục.
- Không nằm ở đây: báo cáo đã điền số (thuộc repo phòng ban) · giấy tờ của chủ máy với tổ chức (`_Profile\`, Profile_170).

## Đặt tên

Đúng `_Design`. Thư mục mẫu: `<TOOL>_Template`, tên ngắn của công cụ viết hoa (`PBI_Template` · `TBL_Template`). Loại tài
nguyên: `Logo` · `Icon` · `Background` · `Image` · `Font` · `Color`.

## Ví dụ

`D:\Workspace\Company\Acme\_Design\Assets\Logo\Acme.png` là logo của tổ chức. Repo app `AcmeFlow` chép nó sang
`frontend/assets/logo/Acme.png`, giữ nguyên `frontend/assets/logo/AcmeFlow.png` (tệp riêng, nguồn không có), và
`npm run check` của nó đỏ khi `Acme.png` khác nguồn.

## Phép kiểm

- `zemory conform --layout <ổ>\Workspace\Company\<Org>` nhận `_Design\` ở cấp tổ chức.
- Trong repo: `node scripts/assets_pull.mjs --check` (do `Skill_Dev_AssetsPull` cài) đỏ khi một bản chép khác nguồn.
