---
id: Slot_94
aka: 03-94
name: data
version: 2
path: data/
---
# Slot_Data_094_Data data — runtime / file thật theo máy

- Vai trò:
  - Hệ APP: RUNTIME sống theo máy / người dùng. Hệ NON-APP: FILE THẬT theo máy (nặng / PII). GITIGNORE. Một trong 6 loại non-code (data = runtime gitignore).
  - Chia con khi phình — tránh trăm file JSON một chỗ.
  - Nơi lưu DB local: `data/*.db` hoặc thư mục app-data `~/.<tool>/`. Vị trí do con trỏ CỐ ĐỊNH `~/.<tool>/location.json` quyết định (env override > pointer > mặc định `~/.<tool>`); mọi phụ trợ (config / browser / imports / backups) bám theo. DB lớn dần → cho dời khỏi ổ hệ thống bằng lệnh relocate của tool / UI Nơi lưu.
  - Dời an toàn: checkpoint WAL → copy → verify (integrity + đếm) → đổi pointer → GIỮ bản cũ `.bak`. Con trỏ PHẢI ở chỗ cố định, không cạnh DB (phụ thuộc vòng). Không để DB sống trong folder Drive-sync (WAL corrupt).
  - Hệ NON-APP: con của `data/` là tự do theo chuẩn (`data/<case>/`) — không bị coi là lệch chuẩn.
- Được chứa / không chứa:
  - Hệ APP: `state/` · `cache/` · `settings/` · `logs/` · `tmp/` · `snapshots/` · `models/` · `secrets/` · `uploads/`.
  - Hệ NON-APP: `extract/` · `adhoc/` · `<case>/`.
