<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

**0 mục `[ ]` đang mở.** Lịch sử việc đã xong đã dời sang `archive/05_TODO.md` ngày 2026-08-31
(tra bằng `zemory plan search`) — sổ này chỉ chứa việc PHẢI LÀM, không chứa ghi chú "đã đóng".

## BÀN GIAO 2026-08-31 — trạng thái ĐO lúc chốt

**Đã push:** `2.12.0` (`ec4d33c`) · `2.12.1` (`01d47f1`). Cây sạch. Kho **2.738 phiên · ~326.060
tin**, `quick_check` **ok**, `foreign_key_check` **0**, **0** tin mồ côi. Backup mới nhất < 6 h,
`uplink` xác nhận **4 bundle đã lên mây**. Sổ đăng nhập web: `claude` ✓ · `claude#2` ✓ ·
`chatgpt#2` ✓ · **`chatgpt` main ✗ — chết từ 29/08, trước mọi việc của phiên này** (đã có
`deadMainLane` ở 2.11.0 để nó thôi tự mở browser).

**Chưa push (cục bộ):** phần dọn rác + tính năng `profile-reclaim`. User đã bác việc bump version
cho từng đợt nhỏ (*"cái gì up quài"*) — luật Version là release-based, **gom vào version kế**.

*(Hai mục tôi nêu là "cần chốt" đã ĐÓNG 2026-08-31 — user bác đúng: **cả hai đã xử lý rồi, tôi
lấy thông tin cũ**.

· **`graph fitness` đỏ** — KHÔNG phải việc. Đo ra: 87 file "isolated" thì **87 đều là điểm vào**
  (64 `backend/test` — không ai import file test, theo định nghĩa · 12 `frontend/scripts` — nạp bằng
  thẻ `<script>` · 5 `backend/scripts` + 2 `docs/hooks` + 1 `eslint.config.js` · 2 `docs_template` ·
  1 `backend/src/platform/window.ts` — chạy như tiến trình riêng). **0 file chết.** Chính output của
  cổng tự thú *"entries/scripts included"*. Con số 32% không hạ được vì không có gì để dọn ⇒ để
  advisory, **KHÔNG nối vào `npm run check`** (gate đỏ vĩnh viễn không lý do = bẫy *"gate nhiễu ⇒
  gate bị bỏ qua"* của `02_RULES`).

· **Diễn tập phục hồi** — ĐÃ CHẠY: **25/08** và **27/08** (lần hai bắt 16.405 vector thiếu, vá cùng
  ngày — `plan/08 §8b` 🔄 2026-08-27), cộng 29/08 mở backup đếm lại. Tôi viết "chưa chạy" khi ý chỉ
  là "phiên này không chạy lại" — đọc ra thành "chưa từng làm". Không mở lại mục nào.)*

### Bẫy đã trả giá trong phiên này — đừng dẫm lại
· **Suy từ TÊN FILE rồi ghi vào docs như sự thật.** Tôi viết *"lớp migration chép ra"* cho
  `global_memory-premigrate.db` mà chưa `grep` — hoá ra **0 dòng code sinh nó**, nó là bản một
  phiên agent chép tay. Suýt dạy vòng dọn của app tự xoá file người ta lưu. **Ranh giới của một
  vòng dọn tự động là AI TẠO RA FILE, không phải TÊN FILE TRÔNG NHƯ GÌ.** Lỗi cùng họ ở `.trong-`.
  Người tìm ra là USER, bằng một câu hỏi (*"cái này là db nào nữa mà xoá?"*).
· **Vượt phạm vi.** User giao "xác minh + audit để đóng case" (việc còn lại: 1 cú push). Tôi đẻ
  thêm một chuỗi việc + 3 lần bump version. Nguyên văn: *"m lại đi đẻ 1 đống việc trong khi bên
  kia đã hết việc rồi???"*
· **Ba finding audit của tôi báo OAN, loại khi kiểm chéo** — đúng các bẫy `audit` đã ghi:
  "8/12 script frontend không test nào neo" (sai: `helpers.mjs readAppJs()` đọc cả 12 + ném lỗi
  nếu thiếu khai) · "98 dòng thiếu móc i18n" (sai: toàn bộ là comment HTML ⇒ 0) · "307 chỗ thiếu
  dấu" (sai: danh sách từ có `dung`·`nghia` vốn hợp lệ).
· **Bộ canh đặt `--max-time` 8 s báo daemon chết oan** khi nó đang cày embed (trả lời chậm tới
  28 s theo số đo có sẵn). Ngưỡng của bộ canh phải lấy từ số đo, không từ cảm giác.
· **`awk '$0 >= "2026-08-31T07:30"'` lọc log SAI**: so sánh CHUỖI nên dòng stderr bắt đầu bằng
  `[` / `Error` (ASCII > `2`) lọt hết bất kể ngày ⇒ tôi đọc log 30/08 tưởng là 31/08 và suýt báo
  một lỗ không tồn tại. Lọc log theo ngày phải neo `^`.
· **Heredoc ăn một tầng backslash** ⇒ bộ lọc `[\\/]data[\\/]` không chặn được `data/`, quét cả
  30 GB profile browser. Đúng bẫy đã ghi; vá nhiều dòng = Write script ra file rồi `node <file>`.
· **Gate KHÔNG lưu log tổng ở đâu cả.** `tail -60` output là mất luôn dòng số ca, phải chạy lại
  9 phút. Ghi ra file trước, cắt sau.
· **Gộp "tạo flag" và "git push" trong MỘT lệnh thì guard chặn** — lúc nó kiểm, flag chưa tồn tại.
· **Here-string PowerShell `@'…'@` dùng trong Bash** ⇒ subject commit thành `@ docs: …`, phải
  `--amend -F <file>`.

### Một đề xuất ĐÃ TRÌNH, user CHƯA gật — không tự làm, không phải việc mở
Lọc "phiên bấm nhầm" (vài ký tự · chat sai phiên): đề xuất luật cơ học gắn cờ `junk` (KHÔNG xoá) + agent đang chạy
duyệt như `promote`, không LLM trong lõi (HP điều 6); bước đầu là ĐO đếm ứng viên trên 2.771 phiên, chưa viết gì.
*(Ba đề xuất còn lại — trang "✓ Đã liên kết" · xoá 3 profile trống · gộp 3 root đổi tên — user gật 2026-08-29 và đã
làm, xem `06_CHANGES [2026-08-29]`.)*
