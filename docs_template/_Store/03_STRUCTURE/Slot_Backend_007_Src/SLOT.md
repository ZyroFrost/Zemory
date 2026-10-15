---
id: Slot_7
aka: 03-7
name: src
version: 2
path: backend/src/
applies: [App]
---
# Slot_Backend_007_Src src — nơi chứa code

- Vai trò:
  - ★ Nơi CHỨA code (Node: `src/` · Python: `backend/<pkg>/`).
  - Sắp theo MỘT trong hai kiểu, không trộn tuỳ tiện: LAYER-FIRST (mặc định — app nhỏ / CRUD / ít domain: slot nằm phẳng ngay dưới `src/`) HOẶC DOMAIN-FIRST (app nhiều domain rạch ròi: mỗi domain là `src/<domain>/`, bên trong lồng lại đúng slot nó cần, cùng từ điển).
  - Cross-cutting (`core` · `auth` · `vault` · `config` · `logging` · `audit` · `errors` · `i18n` · `update` · `migrations` · `shared` · `util`) LUÔN ở cấp `src/` gốc, không lồng/nhân bản trong từng domain.
  - Bên trong một domain chỉ dùng slot từ CÙNG từ điển (store/services/ai/io/validators…), không tạo tên mới.
  - Surface/entry MỎNG: CLI → `commands/`, HTTP → `api/`, WS → `realtime/`, UI → `frontend/`; entry chỉ wire vào domain, không chứa nghiệp vụ.
  - Mọi slot con `[opt]` — tạo KHI CÓ concern, không tạo folder rỗng; app điển hình chỉ hiện diện 4–10 slot.
- Được chứa / không chứa:
  - Chứa: các slot từ điển (biên vào · biên ra · xử lý · nền tảng · chia sẻ) hoặc các `src/<domain>/`.
  - Không chứa: folder rỗng cho đủ bộ · tên slot ngoài từ điển.
