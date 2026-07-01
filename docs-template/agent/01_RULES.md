<!-- zemory template · luật GENERIC; project thêm luật riêng vào cuối -->
# <PROJECT> — Quy tắc làm việc

> AI đọc file này trước khi làm. Tuân thủ tuyệt đối.
> Mở phiên + mọi hướng dẫn quy trình: xem `AGENTS.md` ở root. Backlog: `02_TODO.md`. Changelog: `03_CHANGES.md`.

## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- **UI · CLI output · code · comment công khai**: **TIẾNG ANH** — TUYỆT ĐỐI không nhét tiếng Việt vào giao diện / output lệnh hiển thị cho người dùng.

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `02_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `03_CHANGES.md` | changelog | mỗi lần sửa code; **chỉ ghi sau khi xác nhận OK** (`zemory changelog add`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế |

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

<!-- ── Luật riêng của <PROJECT> (thêm dưới đây) ────────────────── -->
