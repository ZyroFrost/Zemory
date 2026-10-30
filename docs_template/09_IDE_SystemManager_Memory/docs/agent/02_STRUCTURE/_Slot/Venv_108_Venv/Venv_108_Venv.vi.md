---
version: 6
lang: vi
---
# Venv_108_Venv .venv — a repo's own Python environment

## Vai trò

`.venv/` là môi trường Python của MỘT repo, nằm trong repo đó: liên kết trình thông dịch và thư viện riêng của repo, do công cụ dựng
từ file khai thư viện của repo. Đây là LỰA CHỌN bên cạnh đường dùng chung, giống `.env` bên cạnh két của máy:

| đường | ở đâu | khi nào |
|---|---|---|
| dùng chung (mặc định) | `<gốc dữ liệu>\Software\Dev\Python\<bản>\App\` (`Software_149_Program`); repo khai `{"python": "<bản>"}` ở `config/runtime.json` | repo chạy bằng bộ thư viện mà mọi repo dùng bản đó chia nhau |
| riêng (`.venv/`) | `<repo>\.venv\` | repo cần một bản thư viện mà bản dùng chung không có, hoặc là app có bộ thư viện ghim riêng (backend của app) |

Một repo dùng một trong hai đường, không dùng cả hai: repo có `.venv/` thì không khai bản dùng chung, và launcher của nó chạy
`.venv\Scripts\python.exe`.

## Bên trong

- Thứ công cụ dựng ra (`python -m venv` · `uv venv`): `pyvenv.cfg` · `Scripts\` (Windows) hoặc `bin\` · `Lib\site-packages\`.
  Không ghi tay gì vào đây; dựng lại từ file khai thư viện của repo (`requirements.txt` · `pyproject.toml`), nên xoá đi không mất
  gì.
- App có backend mang file khai thư viện riêng thì đặt nó cạnh file đó (`backend/.venv/`).

## Luật

- Không vào git, không đồng bộ (`Root_085_Gitignore` · `Root_141_Stignore`): dựng riêng từng máy và chứa đường dẫn tuyệt đối.
- Máy thứ hai dựng lại từ file khai thư viện; không bao giờ chép giữa các máy.

## Phép kiểm

- `.gitignore` của repo có dòng `.venv/`.
- Repo vừa có `.venv/` vừa khai bản dùng chung ở `config/runtime.json` ⇒ bỏ một trong hai.
