---
name: session-close
description: Close out a work session correctly - route everything that happened into the right file so the next session can pick up where this one stopped. Use when the user asks to write things down, log progress, wrap up, or says the context is running out or they are switching sessions. Vietnamese triggers - "note lại", "docs lại", "ghi sổ", "chốt phiên", "sắp hết context", "đổi session", "mở phiên mới", "tổng kết lại".
---

# session-close — chốt phiên / ghi sổ

> **Luật cứng** (`02_RULES §Chốt phiên`). **TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt** — ghi theo tóm tắt là mất chi tiết, và cái mất luôn là cái phiên sau cần nhất.

## Bước 1 — ĐỌC LẠI trước khi ghi

1. **Toàn bộ phiên hiện tại**: đã LÀM gì · đã ĐỔI gì · QUYẾT ĐỊNH gì · còn DỞ gì · phát hiện LỖI gì chưa sửa.
2. **`docs/plan/*`** — để biết việc vừa làm có đụng/lệch spec nào không.
3. **`docs/agent/*`** — để biết chỗ nào phải cập nhật và không ghi trùng.

> 🖥️ **Chỉ khi có `zemory` CLI:** đoạn đã trôi khỏi ngữ cảnh vẫn còn trong Global Memory —
> `zemory memory digest <session>` + `zemory memory search "<chủ đề>" [--all]` để dựng lại đầy đủ,
> rồi **verify từng mục với nguồn thật** trước khi ghi. Không có CLI thì đọc lại phiên hiện tại là nguồn duy nhất — càng phải ghi sớm, đừng để trôi.

## Bước 2 — định tuyến, KHÔNG BỎ SÓT

| Thứ phát sinh trong phiên | Ghi vào |
|---|---|
| Việc đã xong / sản phẩm đã sửa | `06_CHANGES.md` (**sau khi user OK**) và **xoá khỏi** `05_TODO.md` |
| Việc còn dở · việc phát sinh · việc phiên sau làm | `05_TODO.md` — nêu rõ **đã tới đâu, bước kế tiếp là gì** |
| Thiết kế / quyết định thay đổi | `docs/plan/NN_*.md` · `03_STRUCTURE` §2 nếu là định nghĩa metric |
| Luật riêng phát sinh | **ĐỀ XUẤT** vào `05_TODO.md` chờ user chốt — **KHÔNG tự sửa `01_CONSTITUTION.md`** |

**Chuẩn "không bỏ sót":** mọi việc đã làm phải tìm được ở `06_CHANGES` **hoặc** `05_TODO`. **Chẩn đoán sai và đường cụt cũng phải ghi** — để phiên sau khỏi đâm lại.

## Bước 3 — format changelog

- Mới nhất ở **trên cùng**, ngay sau header. Format: `## [YYYY-MM-DD] — tiêu đề`
- Entry **đảo/thay** quyết định cũ → mở đầu bằng:
  `> 🔄 **Supersede:** thay quyết định "[đề mục] ([ngày])" — [lý do].`
  **Không sửa/xoá entry cũ.**
- **Entry NGẮN — trần ~30 dòng (luật, không phải gợi ý).** Một entry chỉ cần ba thứ: **đổi gì · vì sao · số đo**. Chi tiết thiết kế → `docs/plan/`; tường thuật quá trình → bỏ.
  *Lý do là số học: vùng active chỉ ~180 dòng, bốn entry 50 dòng là chiếm trọn, tức viết dài làm chính cơ chế archive thành vô nghĩa.*

## Bước 4 — TỰ DỌN (bắt buộc, không có công cụ nào làm hộ)

Hai file sổ **lớn dần mãi**, mà chuẩn bắt đọc `05_TODO` ở đầu mỗi phiên. Không dọn thì mỗi phiên phải nạp lại toàn bộ lịch sử — càng dùng lâu càng tốn, tới lúc không còn chỗ cho việc thật.

Hai file, **hai luật khác nhau** — đừng áp chung một ngưỡng. Đích đến: `docs/agent/archive/<tên file>.md` (tạo nếu chưa có).

- **`05_TODO.md` — KHÔNG chờ ngưỡng nào.** Mục vừa xong đã sang `06_CHANGES` ở Bước 2, nên ở đây chỉ dọn mục **đã huỷ / hoãn vô hạn** + ghi chú cũ; mục còn mở giữ **toàn bộ**. Một mục đã đóng là đặt sai chỗ **kể từ giây nó xong**, không liên quan file dài hay ngắn — gác bằng ngưỡng là lý do sổ phình mà vẫn "chưa tới hạn dọn". File vẫn to vì quá nhiều việc đang mở ⇒ **BÁO user cắt phạm vi**, KHÔNG tự xoá việc.
- **`06_CHANGES.md` — trần theo KÍCH THƯỚC, không phải số dòng.** Đếm bằng `wc -c`; vượt **40.000 ký tự** (~10k token) thì chuyển các entry **cũ nhất** đi, giữ lại ~**25.000 ký tự** mới nhất. *Vì sao không đếm dòng: dòng ở sổ dày mỏng rất khác nhau (đo 2026-07-31: 20–34 token/dòng) nên "300 dòng" có thể là 6k hay 10k token — đếm dòng là đo sai thứ.*

**Chép nguyên văn, KHÔNG tóm tắt** — archive là để tra lại, không phải để nén. Báo user đã chuyển bao nhiêu.

## Bước cuối

Báo cáo user. **Không tự `git push`.**
