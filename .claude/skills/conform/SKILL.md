---
name: conform
description: Measure how closely the project folder follows the declared standard - machine scores, agent judges. Run before closing a session, after restructuring, when taking over an unfamiliar folder, or periodically. Not needed after every small edit. Vietnamese triggers - "soi chuẩn", "kiểm chuẩn", "có đúng chuẩn không", "check cấu trúc", "dự án này có bám chuẩn không".
---

# conform — soi độ bám chuẩn

> Kích hoạt: trước khi **chốt phiên** · sau khi **nắn cấu trúc / thêm slot** · khi nhận **repo lạ**
> · định kỳ. Không cần chạy sau mỗi lần sửa code vặt.

**Nguyên tắc (bất biến `01_CONSTITUTION` điều 13):** lớp dẫn xuất (graph · index · taxonomy) do MÁY
dựng tất định. **Agent KHÔNG ghi vào lớp dẫn xuất** — muốn nó có gì thì KHAI vào chuẩn hoặc sửa
NGUỒN (docs · code) rồi để máy dựng lại. Agent là người **KIỂM**, không phải người sinh.

**Vì sao đừng nạp cả graph vào ngữ cảnh:** đo thật — payload graph của một repo cỡ vừa ≈ **56.000
token**, chỉ rẻ hơn đọc cả repo ~4,8×. Nạp định kỳ là đốt quota. Máy chấm trước, agent chỉ đọc
**bảng lệch** (~vài trăm token).

**Quy trình:**
1. `zemory conform` → bảng lệch. `--json` cho máy đọc, `--gate` cho CI (exit 1 khi có mục `blocking`).
2. Đọc từng mục: `blocking` = lệch chuẩn thật, phải xử · `advisory` = đáng xem, tự quyết.
3. **Phán phần NGỮ NGHĨA máy không hiểu được** — máy chỉ biết "thư mục này không khớp slot nào";
   chỉ agent mới biết *nó nên về slot nào*, hay *đây là concern thật cần thêm vào chuẩn*.
4. **Sửa NGUỒN**, không sửa lớp dẫn xuất:
   - đặt sai chỗ → `git mv` về đúng slot (giữ history) + sửa import
   - là concern THẬT mà chuẩn chưa khai → **đề xuất thêm slot vào `03_STRUCTURE` §3/§4** (đổi chuẩn:
     trình user duyệt trước)
   - folder rỗng → xoá (thao tác xoá phải được user xác nhận trước)
5. Chạy lại `zemory conform` → xác nhận hết lệch. Ghi việc vào `05_TODO`/`06_CHANGES`.

**Ranh giới với `zemory validate`:** `validate` hỏi *"bộ docs harness có đúng khuôn không"* (link,
độ dài changelog, tầng folder). `soi chuẩn`/`conform` hỏi *"code + docs có bám chuẩn đã KHAI không"*.
Hai việc khác nhau — đừng gộp, đừng thay thế nhau.

**Cấm:** tự thêm node/cạnh "cho đầy đủ"; coi báo cáo là chân lý mà không đối chiếu code thật; xoá
folder/file chỉ vì báo cáo nói vậy mà chưa hỏi.
