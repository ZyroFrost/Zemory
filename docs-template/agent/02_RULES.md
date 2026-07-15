<!-- zemory template · luật làm việc CHUNG mọi project — ship nguyên từ template, KHÔNG thêm luật riêng vào đây (luật riêng của app → 01_CONSTITUTION.md) -->
# <PROJECT> — Quy tắc làm việc

> AI đọc file này SAU `01_CONSTITUTION.md` (hiến pháp — bất biến riêng của project, tối cao). Tuân thủ tuyệt đối.
> Mở phiên + mọi hướng dẫn quy trình: xem `AGENTS.md` ở root. Backlog: `04_TODO.md`. Changelog: `05_CHANGES.md`.

## Cấu trúc repo — xem [`03_STRUCTURE.md`](03_STRUCTURE.md)
**Chuẩn cấu trúc folder ĐẦY ĐỦ** (cây từng-dòng + routing "sửa gì → vào đâu" + convention) nằm ở **[`03_STRUCTURE.md`](03_STRUCTURE.md)** — **đọc file đó TRƯỚC khi sửa/tạo folder**.

Tóm tắt bất biến (chi tiết ở 03):
- **BẮT BUỘC = 4:** `backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`. TẤT CẢ folder khác `[opt]` — tạo KHI CÓ concern.
- **INDEX điều hướng:** cần sửa gì → `03 §4` trỏ THẲNG slot → **KHÔNG grep cả repo** (nhanh + tiết kiệm token).
- **1 TÊN / concern** (chuẩn RIÊNG); chỉ framework ép cứng mới đổi (Next `pages/`, Django `models/`).
- **Nguồn = git tracked; output / runtime / secret = GITIGNORE.**
- Nắn app về chuẩn → `AGENTS.md` (recipe reconcile).

## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- **UI · CLI output · code · comment công khai**: **TIẾNG ANH** — TUYỆT ĐỐI không nhét tiếng Việt vào giao diện / output lệnh hiển thị cho người dùng.

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `01_CONSTITUTION.md` | hiến pháp — bất biến riêng của project | CHỈ user chốt; agent đề xuất qua TODO |
| `04_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `05_CHANGES.md` | changelog | mỗi lần sửa code; **chỉ ghi sau khi xác nhận OK** (`zemory changelog add`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế |

- **Đồng bộ bắt buộc — constitution ↔ rules ↔ todo ↔ change ↔ plan luôn khớp:** mỗi thay đổi → TODO phản ánh việc, CHANGES ghi log (sau khi OK), plan cập nhật nếu đổi thiết kế. Không để lệch nhau.
- **Plan phải đánh số:** mỗi file trong `docs/plan/` đặt tên `NN_tên.md` (`00_`, `01_`, …) theo thứ tự; gom mọi mô tả plan rải rác (folder `planning`, doc plan lạc chỗ) về `docs/plan/`.
- **Plan KHÔNG chứa luật:** bất biến/luật riêng của app phát sinh khi thiết kế → đề xuất đưa vào `01_CONSTITUTION.md` (user chốt), plan chỉ dẫn chiếu điều khoản.
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
- **Dialog / modal: CHỈ 3 size cố định (S/M/L)** — chọn 1 lần lúc mở theo **lượng nội dung + mục đích** (xác nhận / form / log-bảng), **KHÔNG random size, không đổi size động, không nhảy/reflow loạn**:
  | Size | Rộng | Cao (trần) | Dùng khi |
  |---|---|---|---|
  | **Nhỏ (S)** | ~30vw (tối thiểu 380px) | ≤ 45vh | xác nhận, 1–5 dòng, ít log |
  | **Vừa (M)** | ~50vw (tối thiểu 560px) | ≤ 70vh | form, nội dung/log vừa |
  | **Lớn (L)** | ~72vw (tối thiểu 820px) | ≤ 85vh | log dài, nhiều nội dung, bảng |
- Trần chung mọi lúc: **≤ 94vw / ≤ 90vh** (màn nhỏ), luôn **canh giữa**.
- Nội dung tràn → **cuộn TRONG dialog** (`overflow:auto`), KHÔNG để dialog tự phình theo nội dung.
- **Trạng thái layout do user chỉnh** (kéo resize panel, vị trí, size đã chọn) phải **được lưu và khôi phục y nguyên** khi mở lại — không reset.
