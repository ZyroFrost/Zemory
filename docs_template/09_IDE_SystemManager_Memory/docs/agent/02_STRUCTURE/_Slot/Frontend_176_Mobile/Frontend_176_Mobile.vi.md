---
version: 1
lang: vi
---
# Frontend_176_Mobile mobile — vỏ native đưa app lên điện thoại

## Vai trò

Dự án native đưa app lên điện thoại (Android bằng Gradle, iOS bằng Xcode), mỗi nền tảng một thư mục. Nó là một vỏ MỎNG: hiện
CHÍNH giao diện của app (các trang của `frontend/`, do app phục vụ) và chỉ thêm thứ điện thoại cần mà trang web không làm được —
khoá máy, việc chạy nền, thông báo, client mạng với tới app từ bên ngoài.

- Không phải `Frontend_003_Frontend` (bản thân giao diện): vỏ không giữ trang riêng lặp lại giao diện; màn điện thoại cần là một
  trang của giao diện, hiện trong vỏ.
- Không phải `Frontend_173_Shell` (khung mọi app của một hệ cùng mang): cái đó là code web dùng chung giữa các app của một hệ;
  cái này là dự án native của một app.

## Bên trong

```
frontend/mobile/
└── <nền-tảng>/        android/ · ios/ — bên trong theo đúng bố cục của nền tảng (Gradle · Xcode), không nắn
    ├── core/          client mà phần điện thoại của app dùng chung (mạng, ghép đôi, giao thức) — thử được ngoài điện thoại
    └── app/           vỏ của nền tảng (màn khởi động, khoá, web view, thông báo)
```

- Loại file: mã nguồn và file build của nền tảng (`.kt` · `.swift` · `build.gradle.kts` · `*.xcodeproj`), và đoạn script nhỏ
  nối vỏ với giao diện.
- Không bao giờ vào git: đầu ra build, cache của công cụ build, file đường dẫn SDK cục bộ, khoá ký — `.gitignore` riêng của
  thư mục nền tảng giữ chúng ngoài. Không bao giờ ở đây: bản sao các trang của giao diện.
- Không trỏ tới slot con nào: trong một thư mục nền tảng, quy ước của nền tảng quyết.

## Luật

- Một giao diện: điện thoại hiện các trang app phục vụ, qua liên kết riêng của nó tới app; một màn dựng native phải nói được vì
  sao trang web không làm được (khoá máy, bộ chọn, thông báo).
- Bản dựng image không bao giờ lấy thư mục này (`.dockerignore`): cache build của nó đổi trong lúc build chạy.
- Điện thoại không bao giờ giữ một khoá mở được toàn bộ dữ liệu của app; nó được ghép bằng một thẻ riêng mà app thu hồi được.

## Ví dụ

App `Zemory` giữ vỏ điện thoại ở `frontend/mobile/android/`: `core/` là Kotlin thuần (mã ghép đôi, client relay, TLS, liên kết
chỉ-thư) và chạy trên JVM máy tính với daemon thật; `app/` khoá sau khoá máy và hiện chính giao diện của daemon trong web view.

## Kiểm

- `zemory conform` nhận `frontend/mobile/<nền-tảng>/` trong một repo app; dự án điện thoại ở chỗ khác trong cây là lệch chuẩn.
