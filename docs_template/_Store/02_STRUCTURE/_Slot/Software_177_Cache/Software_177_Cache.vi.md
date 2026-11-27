---
version: 1
lang: vi
---
# Software_177_Cache cache — cache nhiều công cụ dùng chung trong thư mục `.cache` của người dùng

## Vai trò

`<ổ dữ liệu>\Software\Cache\` chứa những gì công cụ ghi vào thư mục `.cache` của người dùng (`%USERPROFILE%\.cache` trên Windows,
`~/.cache` trên Linux) khi chúng không cho chủ máy chọn chỗ: runtime tự động hoá trình duyệt, CLI của agent, cache dữ liệu và biểu
đồ, trình tải. Ổ hệ thống giữ được nhỏ; cache nằm ở ổ dữ liệu, mỗi công cụ một thư mục, và xoá trống lúc nào cũng được mà không
mất việc.

## Vì sao là slot riêng

- `Software_148_Group`: mười lăm nhóm chứa chương trình; cache không phải chương trình và không thuộc riêng nhóm nào.
- `Software_149_Program`: `Data\` của một chương trình chứa cache mà chương trình cho chủ máy đặt chỗ; các công cụ này ghi vào
  `.cache` của người dùng và không cho chọn, nhiều cái còn không có thư mục chương trình (một CLI chạy qua `npx`).
- `Software_147_Software`: ngoại lệ `_<Hãng>\` chứa bộ dùng chung của các chương trình cùng một hãng, không phải file mà công cụ
  của nhiều hãng ghi ra.
- `Data_096_Cache`: cache của một repo, nằm trong repo đó; cache này thuộc người dùng của máy, không thuộc repo nào.

## Bên trong

```
Software\Cache\
├── chrome-devtools-mcp\
├── codex-runtimes\
├── kagglehub\
├── matplotlib\
└── yt-dlp\
```

`%USERPROFILE%\.cache` là một junction trỏ tới `<ổ dữ liệu>\Software\Cache\`, nên mọi công cụ vẫn ghi vào đường quen của nó.

## Các bước — dời cache sang ổ dữ liệu

1. Đóng các công cụ đang ghi vào cache.
2. Chép `%USERPROFILE%\.cache\` sang `<ổ dữ liệu>\Software\Cache\` rồi so số file và tổng dung lượng.
3. Chỉ xoá thư mục cũ khi cả hai đã khớp, rồi tạo junction:
   `mklink /J "%USERPROFILE%\.cache" "<ổ dữ liệu>\Software\Cache"`.
4. Mở một công cụ và kiểm nó ghi vào `Software\Cache\<công cụ>\`.

## Luật

- `Cache\` nằm cạnh các nhóm của `Software_148_Group`; nó không phải nhóm và không chứa chương trình.
- Mỗi công cụ một thư mục, tên theo đúng tên công cụ tự đặt.
- Chương trình cho chủ máy chọn chỗ đặt cache thì giữ cache trong `Data\` của nó (`Software_149_Program`), không đặt ở đây.
- Không thứ gì ở đây là bản duy nhất: thiết lập và khoá ở `_ConfigVault\`, model ở `_Models\`.

## Khuôn tên

Tên thư mục do công cụ tự ghi (`kagglehub`, `yt-dlp`); không đổi tên.

## Đồng bộ

Không vào git, không đồng bộ: cache thuộc một máy và do chính công cụ đã ghi dựng lại.

## Phép kiểm

`zemory conform --layout <ổ dữ liệu>` nhận `Software\Cache\` nằm cạnh các nhóm (đường của slot này); thư mục nào khác nằm cạnh
các nhóm mà không phải nhóm hay bộ `_<Hãng>\` thì vẫn đỏ (`unknown-value`).
