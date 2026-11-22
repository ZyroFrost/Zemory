---
version: 7
lang: vi
---
# Venv_108_Venv .venv — môi trường Python dự phòng của repo bị tách khỏi hệ thống

## Vai trò

`.venv/` là slot DỰ PHÒNG. Python theo cùng một luật với mọi thứ dùng chung: thứ mọi repo dùng thì nằm ở MỘT chỗ chung, thứ
của riêng một repo thì nằm trong repo đó, còn bản mà repo sẽ cần nếu bị tách khỏi chỗ chung là một slot dự phòng, không dùng khi
repo còn chạy trong hệ thống.

| đường | ở đâu | ai dùng |
|---|---|---|
| dùng chung — đường DUY NHẤT trong hệ thống | `<gốc dữ liệu>\Software\Dev\Python\<bản>\App\` (`Software_149_Program`); repo khai `{"python": "<bản>"}` ở `config/runtime.json` và chạy qua `bin\_python.cmd` | MỌI repo chạy trong hệ thống: repo phòng, kho dữ liệu, repo quản lý workspace, app (kể cả backend của app) |
| dự phòng — `.venv/` (slot này) | `<repo>\.venv\` | CHỈ repo bị tách khỏi hệ thống |

**Bị tách khỏi hệ thống** nghĩa là repo chạy ở nơi không có cây dùng chung: repo nhóm do người khác clone về chạy trên máy của
họ, hoặc app giao sang một máy không có `Software\Dev\Python\`. Repo chạy trên một máy của hệ thống (máy trạm, VM, server) thì
không bao giờ bị tách, dù nó là gì (app hay không), nên không có `.venv/`.

Không phải lý do để dùng `.venv/`:
- "App cần bộ thư viện ghim riêng." — Thư viện ghim theo từng bản Python, mỗi thư viện một phiên bản (`Software_149_Program`).
  Thư viện bản đó chưa có thì thêm vào danh sách ghim của bản đó.
- "Hai repo cần hai phiên bản khác nhau của một thư viện." — Cài một bản Python MỚI thành một thư mục MỚI nằm cạnh
  (`Software\Dev\Python\3.12.11\`) với danh sách ghim riêng; repo cần phiên bản thư viện kia đổi đúng một dòng ở
  `config/runtime.json`. Không bao giờ dùng venv, không bao giờ tạo thư mục con dưới một bản đã có.
- "Dựng cho nhanh." — Tiện không bao giờ là lý do mở slot dự phòng.

## Các bước

**Repo trong hệ thống mà còn `.venv/` (chuyển sang đường dùng chung):**
1. Ghi `config/runtime.json` `{"python": "<bản>"}` và cài `bin/_python.cmd` (cả hai lấy từ HS qua `installs:` của cấu trúc repo).
2. So file khai thư viện của repo (`requirements.txt` · `pyproject.toml`) với `python_<bản>.txt` của bản đó. Thư viện nào thiếu
   thì thêm vào danh sách ghim và cài vào bản dùng chung. Thư viện đã ghim ở phiên bản khác ⇒ chạy test của repo bằng bản đã
   ghim; đỏ vì thư viện đó ⇒ repo cần một bản Python mới (như trên).
3. Trỏ mọi launcher và script sang `bin\_python.cmd` (không `.venv\Scripts\python.exe`, không `python` trơn, không `py`).
4. Chạy test của repo và chạy thật bằng bản dùng chung. Xanh ⇒ xoá `.venv/`.

**Repo thật sự bị tách (slot dự phòng đang dùng):**
1. Dựng `.venv/` từ file khai thư viện của repo bằng công cụ file đó nêu (`python -m venv .venv` · `uv venv`), rồi cài file khai
   thư viện vào đó.
2. Repo không có dòng Python ở `config/runtime.json`: một repo dùng một đường, không dùng cả hai.
3. `AGENTS.md` của repo ghi rõ repo chạy tách lẻ và vì sao (ai chạy, trên máy nào).

## Bên trong

- Thứ công cụ dựng ra: `pyvenv.cfg` · `Scripts\` (Windows) hoặc `bin\` · `Lib\site-packages\`. Không ghi tay gì vào đây; dựng lại
  từ file khai thư viện, nên xoá đi không mất gì.
- App có backend mang file khai thư viện riêng thì đặt nó cạnh file đó (`backend/.venv/`).

## Luật

- Không vào git, không đồng bộ (`Root_085_Gitignore` · `Root_141_Stignore`): dựng riêng từng máy và chứa đường dẫn tuyệt đối.
- Máy thứ hai dựng lại từ file khai thư viện; không bao giờ chép giữa các máy.

## Phép kiểm

- `.gitignore` của repo có dòng `.venv/`.
- Repo vừa có `.venv/` vừa khai bản dùng chung ở `config/runtime.json` ⇒ xoá `.venv/` (các bước trên).
- Repo có `.venv/`, không có `config/runtime.json`, và `AGENTS.md` không ghi là chạy tách lẻ ⇒ đó là repo trong hệ thống đi sai
  đường: chuyển sang đường dùng chung (các bước trên).
