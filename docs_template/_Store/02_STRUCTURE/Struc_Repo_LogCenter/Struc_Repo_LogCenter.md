---
id: Struc_Repo_LogCenter
name: repo-log-center
version: 5
profile: non-app
label: LOG-CENTER
intro: : repo giữ nhật ký chạy dùng chung của cả cụm — khuôn log, nơi ghi, cách tra
ask: ; repo mà mọi task và app của cụm ghi nhật ký vào là LOG-CENTER
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · hỏi "thứ này để đâu" · `conform` báo lệch
checked: [Struc_Region_Workspace, Struc_Repo_Dept, Struc_Repo_NonApp]
installs: [bin/_python.cmd, config/runtime.json]
---
# Struc_Repo_LogCenter

The structure standard of the shared log repo: every slot of `Struc_Repo_NonApp` (declares `extends`). Its own slots are measured when the first repo is assembled.

## Role

- Provides: `log` for every repo of the group; within logging (format, where to write) this repo decides.
- Manages no repo and belongs to none.

## Python

- `config/runtime.json` declares the ONE Python version the repo runs (`{"python": "3.12.10"}`); `bin/_python.cmd` resolves
  `<data root>\Software\Dev\Python\<version>\App\python.exe` on the drive holding `_ConfigVault` (slot `Software_149_Program`).
  Both are installed by this template, byte-equal to the copy every other repo template installs.
- Every launcher and script runs Python through it — `call "%~dp0_python.cmd" || exit /b 3` then `"%PY%"`, or
  `bin\_python.cmd scripts\x.py` — never a bare `python` from PATH, never `py`, never `.venv\Scripts\python.exe`.
- `.venv/` (slot `Venv_108_Venv`) is the reserve of a repo cut off from the system, never used by a repo that runs inside it.
- A repo that needs another version changes the number in its own `runtime.json`; sync keeps that edit and reports it.
