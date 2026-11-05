---
id: Struc_Repo_App
name: repo-app
version: 12
profile: app
label: APP
intro: (có code chạy: UI · server · CLI)
index-role: mục lục slot do máy sinh lúc sync, không sửa tay
trigger: tạo · đổi tên · dời folder · thêm slot · `conform` báo lệch
installs: [bin/_python.cmd, config/runtime.json]
---
# Struc_Repo_App

The structure standard of an APP repo: a repo that builds and maintains an app with running code (UI · server · CLI). This
structure is how the slots are put together in `structure.json`; the slots live in `_Slot/` and belong to no kind.

## Python

- `config/runtime.json` declares the ONE Python version the repo runs (`{"python": "3.12.10"}`); `bin/_python.cmd` resolves
  `<data root>\Software\Dev\Python\<version>\App\python.exe` on the drive holding `_ConfigVault` (slot `Software_149_Program`).
  Both are installed by this template, byte-equal to the copy every other repo template installs.
- Every launcher and script runs Python through it — `call "%~dp0_python.cmd" || exit /b 3` then `"%PY%"`, or
  `bin\_python.cmd scripts\x.py` — never a bare `python` from PATH, never `py`, never `.venv\Scripts\python.exe`.
- The app's backend runs on the same shared version: the launcher sets `PYTHONPATH` to the backend folder and runs
  `"%PY%" -m <package>`; the app is never installed into the shared version (`pip install -e`), and its libraries are in that
  version's pinned list. On a Linux server the same tree sits under `/opt`: `/opt/Software/Dev/Python/<version>/App/bin/python3`.
- `.venv/` (slot `Venv_108_Venv`) is the reserve of a repo cut off from the system, never used by a repo that runs inside it.
- A repo that needs another version changes the number in its own `runtime.json`; sync keeps that edit and reports it.
