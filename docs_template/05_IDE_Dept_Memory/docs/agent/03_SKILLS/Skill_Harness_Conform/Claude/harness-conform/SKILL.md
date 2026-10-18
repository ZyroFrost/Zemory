---
id: Skill_Harness_Conform
aka: conform
name: harness-conform
version: 9
type: process
description: Measure how closely the project folder follows the declared standard - machine scores, agent judges. Run before closing a session, after restructuring, when taking over an unfamiliar folder, or periodically. Not needed after every small edit. Vietnamese triggers - "soi chuẩn", "kiểm chuẩn", "có đúng chuẩn không", "check cấu trúc", "dự án này có bám chuẩn không".
from: _Store/03_SKILLS/Skill_Harness_Conform @v9 #41d0ebb8686c
---

# conform — soi độ bám chuẩn

> Kích hoạt: trước khi **chốt phiên** · sau khi **nắn cấu trúc / thêm slot** · khi nhận **repo lạ**
> · định kỳ. Không cần chạy sau mỗi lần sửa code vặt.
>
> **Máy chấm trước, agent phán sau.** Máy chỉ biết "thư mục này không khớp slot nào"; **chỉ agent mới
> biết nó *nên* về slot nào, hay đây là concern thật cần thêm vào chuẩn**.

**Nguyên tắc:** lớp
dẫn xuất (graph · index · taxonomy) do MÁY dựng tất định. **Agent KHÔNG ghi vào lớp dẫn xuất** — muốn
nó có gì thì KHAI vào chuẩn hoặc sửa NGUỒN (docs · code) rồi để máy dựng lại. Agent là người **KIỂM**,
không phải người sinh.

**Vì sao đừng tự đi soi bằng mắt, và đừng nạp cả graph vào ngữ cảnh:** đọc cả cây thư mục rồi tự đối
chiếu là **đốt ngữ cảnh** — tốn gấp hàng chục lần bảng lệch và vẫn sót. Đo được: payload graph của một
repo cỡ vừa ≈ **56.000 token**, chỉ rẻ hơn đọc cả repo ~4,8×. Nạp định kỳ là đốt quota. Máy chấm
trước, agent chỉ đọc **bảng lệch** (~vài trăm token).

**Quy trình:**
1. **Chạy máy chấm** → bảng lệch.
   - Có CLI `zemory`: `zemory conform`. `--json` cho máy đọc, `--gate` cho CI (exit 1 khi có mục
     `blocking`).
   - Bộ không có CLI: `python .claude/skills/harness-structure/scripts/check_structure.py .` — exit `0` =
     không có mục phải sửa · exit `1` = có ít nhất một mục.
2. **Đọc từng mục theo mức:** `blocking` / `PHẢI SỬA` = lệch chuẩn thật, phải xử · `advisory` /
   `xem xét` = đáng xem, máy không phán được, **agent tự quyết**.
3. **Phán phần NGỮ NGHĨA máy không hiểu được** — một thư mục "không khớp slot nào" có ba khả năng:
   đặt sai chỗ · là concern THẬT mà chuẩn chưa khai · là rác cần xoá.
4. **Sửa NGUỒN**, không sửa lớp dẫn xuất / báo cáo:
   - đặt sai chỗ → `git mv` về đúng slot (giữ history) + sửa import; cần dời nhiều thì đề xuất qua
     skill `reconcile`
   - là concern THẬT mà chuẩn chưa khai → **đề xuất thêm slot lên HS** (`<Area>_<NNN>_<Name>` trong `02_STRUCTURE/_Slot/`, số nối cuối) — đây là **đổi chuẩn**:
     dò slot có sẵn trước (`Rule_Gate_85_ProposeChecked`), gửi đề xuất cho phiên zemory (`Rule_Gate_83_HarnessFromStore`)
   - folder rỗng / rác → **đề xuất xoá, chờ xác nhận** trước khi xoá, không tự xoá
   - đừng chỉnh script chấm cho hết kêu
5. **Chạy lại** máy chấm → xác nhận hết lệch. Đã sửa → `05_CHANGES`; phần còn lệch → **báo, hỏi trước
   khi ghi vào `04_TODO`** (`Rule_Gate_38_TodoDoor`).

**Ranh giới với `zemory validate`:** `validate` hỏi *"bộ docs harness có đúng khuôn không"* (link,
độ dài changelog, tầng folder). `soi chuẩn`/`conform` hỏi *"code + docs + thư mục có bám chuẩn đã KHAI
không"*. Hai việc khác nhau — đừng gộp, đừng thay thế nhau.

**Cấm:**
- Tự thêm node/cạnh "cho đầy đủ"; thêm slot vào chuẩn "cho đầy đủ" khi chưa có file thật nào thuộc
  về nó.
- Coi báo cáo là chân lý mà không mở file / code thật ra đối chiếu.
- Xoá folder/file chỉ vì báo cáo nói vậy mà chưa hỏi.
