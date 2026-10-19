---
id: Slot_4
aka: 03-4
name: docs
version: 7
path: docs/
---
# Docs_004_Docs docs — harness tài liệu

- Vai trò:
  - ★ Harness: FILE `.md` là NGUỒN; DB chỉ là INDEX dẫn xuất — file wins.
  - Tài liệu / rule / plan → `docs/`, sửa FILE `.md` trực tiếp.
  - Giống hệt ở hệ APP và NON-APP: cùng lệnh zemory, agent điều hướng non-app đúng như app.
  - Hệ NON-APP: định nghĩa nghiệp vụ ở khung HP `Cons_Gate_12_SourceOfTruth` (mục Định nghĩa), cách tính ở skill riêng `Skill_Own_<Tên>` — không tạo `docs/dictionary.md`.
    Thuật ngữ do repo khác làm chủ (chỉ số của phòng nhìn từ DW) chỉ trỏ tới repo đó; repo chỉ giữ cấu trúc DB giữ từ điển cấu trúc
    trong skill riêng, trỏ tới catalog máy dựng, không chép định nghĩa nghiệp vụ.
- Được chứa / không chứa:
  - Chứa: `agent/` (★) · `plan/` (★) · `archive/` (lịch sử harness: sổ cũ, bản chép đã nghỉ hưu, harness dạng file cũ — tra bằng `zemory changelog search` / `plan search`, không đọc mỗi phiên) · `.harness.json` (★, marker: project đã wire harness).
  - Không chứa: bản xem trực quan cho người (→ `docs_visual/`) · ảnh/media công khai (→ `docs_public/`) · `docs/dictionary.md` (hệ NON-APP).
