---
id: Host_IDE
name: host-ide
version: 2
kind: host
---
# IDE Hệ IDE — agent trong trình soạn code

- Phạm vi: agent chạy trong panel của trình soạn code (extension), mở theo folder đang mở trong trình soạn.
- Mở dự án: mở folder dự án trong trình soạn → mở panel agent → dán câu bootstrap của bộ (bộ Memory: `zemory init --kit <số>`).
- Bộ ráp được: bộ Basic và bộ Memory.
- Kiểm môi trường (doctor):
  - Node ≥ 20 và Git có trên PATH (hook guard là hook Node; Git cho mã thoát 2 và chốt commit);
  - bộ Memory: lệnh `zemory` có trên PATH, `zemory doctor` xanh trong folder dự án;
  - lệnh hook neo theo `CLAUDE_PROJECT_DIR`, không theo folder làm việc của phiên.
