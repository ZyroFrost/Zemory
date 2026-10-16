---
id: Host_CLI
name: host-cli
version: 1
kind: host
---
# Host_CLI Hệ CLI — agent chạy trong terminal

- Phạm vi: agent chạy trong terminal, mở tại folder dự án.
- Mở dự án: mở terminal tại gốc dự án → chạy agent → dán câu bootstrap của bộ (bộ Memory: `zemory init --kit <số>`).
- Bộ ráp được: bộ Basic và bộ Memory.
- Kiểm môi trường (doctor):
  - Node ≥ 20 và Git có trên PATH;
  - bộ Memory: lệnh `zemory` có trên PATH, `zemory doctor` xanh trong folder dự án;
  - phiên có thể đổi folder làm việc xuống folder con: lệnh hook neo theo `CLAUDE_PROJECT_DIR` nên guard vẫn chạy.
