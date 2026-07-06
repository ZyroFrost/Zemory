<!-- zemory template · luật GENERIC; project thêm luật riêng vào cuối -->
# <PROJECT> — Quy tắc làm việc

> AI đọc file này trước khi làm. Tuân thủ tuyệt đối.
> Mở phiên + mọi hướng dẫn quy trình: xem `AGENTS.md` ở root. Backlog: `02_TODO.md`. Changelog: `03_CHANGES.md`.

## Cấu trúc repo — chuẩn & routing (đọc TRƯỚC khi sửa)
Mọi app theo cùng bộ khung. **Cần sửa gì → vào đúng folder** (tự định tuyến, khỏi hỏi):

| Cần làm | Vào folder | Ghi chú |
|---|---|---|
| Sửa **UI / giao diện** | `frontend/` | html/css/js + asset; font offline nếu cần |
| Sửa **logic / API / xử lý / bảo mật-auth** | `backend/` | code CỦA MÌNH + entry point. **Bảo mật là code ở đây, KHÔNG phải folder riêng** |
| **Dùng / tham chiếu code ngoài** | `vendor/` | repo ngoài clone/build về để tham chiếu — **gọi, KHÔNG dán vào `backend/`** |
| **Config hạ tầng** (deploy / docker / monitoring) | `infra/` | chỉ app nào có hạ tầng riêng |
| **Tài liệu / rule / plan / changelog** | `docs/` | sửa qua lệnh `zemory`, không gõ tay bản mirror |
| Môi trường (app Python) | `.venv/` | ở root |

- **Bắt buộc luôn có:** `backend/` (code mình) + `docs/` (harness) + `AGENTS.md`. Còn lại **tạo khi có nội dung** — `frontend/` khi có UI, `infra/`/`vendor/` khi thật sự cần, `.venv/` cho app Python. App build từ đầu, không xài code ngoài → **không có `vendor/`**.
- **Ranh giới của-mình vs ngoài (BẤT BIẾN):** `backend/` = 100% code mình, một giọng. `vendor/` = gạch public bên ngoài — **gọi/extend**, không trộn vào `backend/`. Luôn rạch ròi "của mình vs người ta".
- **Tên co theo stack, giữ đúng TẦNG:** code-của-mình trong `backend/` = Python `backend/<package>/`; Node `backend/src/` (hoặc `src/`). Không cứng nhắc tên, giữ đúng vai từng tầng.

## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- **UI · CLI output · code · comment công khai**: **TIẾNG ANH** — TUYỆT ĐỐI không nhét tiếng Việt vào giao diện / output lệnh hiển thị cho người dùng.

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `02_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `03_CHANGES.md` | changelog | mỗi lần sửa code; **chỉ ghi sau khi xác nhận OK** (`zemory changelog add`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế |

- **Đồng bộ bắt buộc — rules ↔ todo ↔ change ↔ plan luôn khớp:** mỗi thay đổi → TODO phản ánh việc, CHANGES ghi log (sau khi OK), plan cập nhật nếu đổi thiết kế. Không để 4 cái lệch nhau.
- **Plan phải đánh số:** mỗi file trong `docs/plan/` đặt tên `NN_tên.md` (`00_`, `01_`, …) theo thứ tự; gom mọi mô tả plan rải rác (folder `planning`, doc plan lạc chỗ) về `docs/plan/`.
- **Tra log sâu:** việc/lỗi/quyết định ở phiên khác → `zemory brain search "<q>" [--all]` (recall on-demand, tự tiết kiệm token; đừng tra bừa).

## Changelog — supersede
- Mới nhất ở trên cùng (chèn ngay sau header).
- Entry **đảo/thay** quyết định cũ → mở đầu bằng:
  `> 🔄 **Supersede:** thay quyết định "[đề mục] ([ngày])" — [lý do].`
  Không sửa/xoá entry cũ; tuỳ chọn thêm `> ⤴ Đã bị thay bởi [ngày].` ở entry cũ.

## Hành xử
- **Chỉ làm đúng cái được yêu cầu.** Đụng logic khác → **hỏi trước**, không tự sửa rồi báo.
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi yêu cầu rõ).
- **Góp ý thẳng** về thiết kế bất hợp lý — TRƯỚC khi làm. Quyết định cuối là của user.
- **Không biết thì hỏi, không đoán.**

## Thiết kế UI
- **Dialog / modal: CHỈ 3 size cố định** — chọn 1 lần lúc mở theo lượng nội dung, **không đổi size động, không nhảy/reflow loạn**:
  | Size | Rộng | Cao (trần) | Dùng khi |
  |---|---|---|---|
  | **Nhỏ (S)** | ~30vw (tối thiểu 380px) | ≤ 45vh | xác nhận, 1–5 dòng, ít log |
  | **Vừa (M)** | ~50vw (tối thiểu 560px) | ≤ 70vh | form, nội dung/log vừa |
  | **Lớn (L)** | ~72vw (tối thiểu 820px) | ≤ 85vh | log dài, nhiều nội dung, bảng |
- Trần chung mọi lúc: **≤ 94vw / ≤ 90vh** (màn nhỏ), luôn **canh giữa**.
- Nội dung tràn → **cuộn TRONG dialog** (`overflow:auto`), KHÔNG để dialog tự phình theo nội dung.
- **Trạng thái layout do user chỉnh** (kéo resize panel, vị trí, size đã chọn) phải **được lưu và khôi phục y nguyên** khi mở lại — không reset.

<!-- ── Luật riêng của <PROJECT> (thêm dưới đây) ────────────────── -->
