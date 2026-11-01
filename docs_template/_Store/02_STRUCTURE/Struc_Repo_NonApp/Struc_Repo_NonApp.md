---
id: Struc_Repo_NonApp
name: repo-nonapp
version: 10
profile: non-app
label: NON-APP
intro: : sản phẩm / tài sản — agent đọc · dò · kéo · điền · xuất FILE (BI/report · data · docs-only · design), không phát triển app; không có luật UI
ask: ; mở một `.pbix` ra dò, đổ số vào template là NON-APP
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
installs: [bin/_python.cmd, config/runtime.json]
---
# Struc_Repo_NonApp

The structure standard of a NON-APP repo: a product or an asset; the agent reads · searches · pulls · fills · exports files and
develops no app. This structure is how the slots are put together in `structure.json`; the slots live in `_Slot/` and belong to
no kind.

## Python

- `config/runtime.json` declares the ONE Python version the repo runs (`{"python": "3.12.10"}`); `bin/_python.cmd` resolves
  `<data root>\Software\Dev\Python\<version>\App\python.exe` on the drive holding `_ConfigVault` (slot `Software_149_Program`).
  Both are installed by this template, byte-equal to the copy every other repo template installs.
- Every launcher and script runs Python through it — `call "%~dp0_python.cmd" || exit /b 3` then `"%PY%"`, or
  `bin\_python.cmd scripts\x.py` — never a bare `python` from PATH, never `py`, never `.venv\Scripts\python.exe`.
- `.venv/` (slot `Venv_108_Venv`) is the reserve of a repo cut off from the system, never used by a repo that runs inside it.
- A repo that needs another version changes the number in its own `runtime.json`; sync keeps that edit and reports it.
