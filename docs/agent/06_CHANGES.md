<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-29b] — Luật "entry ngắn" + 2 cổng kiểm trong `validate`

Gate 303 → **312** · `conform` ✓. Trần dài dòng thành LUẬT, không còn là lời hứa của agent.

- **`02_RULES §Changelog`** (repo + 2 template): entry ≤ **~30 dòng**, chỉ cần *đổi gì · vì sao · số đo*;
  chi tiết thiết kế → `docs/plan/`. Căn cứ: đo 76 entry thật — p50 **19** · p75 28 · p90 40 · max 53, nên
  30 nằm giữa p75–p90, không siết entry bình thường. Lý do tồn tại: ở `keep`≈180 dòng thì **4** entry
  50 dòng chiếm trọn vùng active ⇒ viết dài làm chính cơ chế archive thành vô nghĩa.
- **`validate` check 1:** đếm entry vượt trần (advisory, `changes_entry_lines`). Chạy ngay bắt 3 entry của tôi.
- **`validate` check 2 — trả lời câu user hỏi *"sao mục xong không archive luôn"*:** chuẩn **đã** bắt vậy từ
  đầu (`05_TODO` dòng 1: *"xong → ghi sang `06_CHANGES.md` và xoá khỏi đây"*). 107 mục `[x]` dọn sáng nay
  **vốn là 107 lần vi phạm dồn lại** — thiếu không phải cơ chế mà là cái kiểm. Nay `validate` báo số mục `[x]`
  còn sót; trạng thái đúng là **0**.
- Cả hai **advisory**, không chặn: siết cứng độ dài văn xuôi sẽ cản việc thật, mà `validate` vốn chạy ở mỗi chốt phiên.

### Đột biến hoá 5/6 — cái sống sót là code chết, không phải test yếu
Phá 6 chỗ: off-by-one `>`/`>=` · bỏ entry cuối · bỏ fence (×2) · `closedItems` đếm cả mục mở → **bắt hết**.
Sống sót: *"bỏ chuẩn hoá CRLF"* — vì hai hàm này **không neo vào cuối dòng, không dùng byte offset**, nên
`\r` sót lại chẳng đổi kết quả. Kết luận: guard đó là **code chết** ⇒ **gỡ nó**, giữ test CRLF làm neo hành vi.
*(Khác `parseChangelog` — hàm đó cắt theo offset và từng parse ra 0 entry với file Windows, nên vẫn cần.)*

### Ba lỗi tự gây trong lúc làm, tự bắt
Test "entry vừa đúng trần" đỏ vì tôi quên `\n` cuối đẻ thêm một phần tử rỗng (31 ≠ 30) — **test sai, code đúng**.
Rồi `sed` nhét một CR thật vào comment làm `tsc` đứt chuỗi. Rồi comment viết tiếng Việt, vi phạm
`02_RULES §Ngôn ngữ` (comment code = tiếng Anh) — đã viết lại.

---

## [2026-07-29] — Hạ ngưỡng archive 500 → 300 · con trỏ tầng ấm vào `AGENTS.md`

Gate **303/303** · `conform` ✓ · `validate` ✓. *(Entry viết ngắn có chủ đích — xem mục cuối.)*

- **Con trỏ tầng ấm** (điều kiện tiên quyết): `AGENTS.md` (repo + cả 2 template, byte-identical, 21 dòng)
  thêm một mục — lịch sử cũ ở `docs/agent/archive/`, **vẫn tra được** qua `changelog search`/`plan search`,
  và *"không thấy trong `05_TODO`/`06_CHANGES` KHÔNG có nghĩa là chưa từng có"*. Không có dòng này thì
  cắt sâu = agent kết luận "chưa làm" trong khi lịch sử nằm cách một câu lệnh.
- **Ngưỡng 500 → 300 / keep 180**, ở `DEFAULT_CONFIG` **và** `docs/.harness.json` — áp cho **mọi project**,
  không riêng template nào (ngưỡng là config, không thuộc template). Khớp luôn con số 300 của luật tự-dọn Cowork.
- **Chạy thật:** `06_CHANGES` **573 → 162 dòng** (54,5 → 12,0 KB), 15 entry xuống tầng ấm.
  `05_TODO` 267 < 300 → không đụng. Kiểm chéo: `changelog search "byte NUL"` vẫn tìm ra entry **vừa bị cắt**.
- **Tổng mỗi phiên: 111.000 → ~89.900 token (−19%)** trong ngày.

### Số đo bác một phát biểu — ghi lại để không lặp
User cho rằng non-app "làm việc linh tinh nên không có plan dài". Đo 3 repo thật:
**PBI_SasinFlow_Rebuild có 114,7 KB plan (10 file) = 63% plan của zemory**; Maintain 64,8 KB; SasinHarvest 21,3 KB.
Tổng mỗi repo 29–55k token. Nên vế "nhẹ hơn zemory" đúng, còn vế "không có plan dài" **không đúng** với
repo non-app đã chạy một thời gian. Với Cowork mới dựng thì plan = 0, đúng như user nói.

### Tự siết văn phong changelog
Ngày hôm nay tôi viết 7 entry, cộng lại **+11,8 KB** — ăn mất **21%** phần `05_TODO` vừa cắt được. Và ở
keep=180 dòng thì chỉ còn **4 entry** trụ lại vùng active, vì entry của tôi dày 30–50 dòng mỗi cái.
Không có cơ chế nào trị được chuyện này ngoài việc viết ngắn hơn: **giữ số đo và nguyên nhân, bỏ phần kể lể.**

---

## [2026-07-28q] — Harness docs vào index · và bịt lỗ phình ngữ cảnh của luồng Cowork

Gate **303/303** · `conform` ✓ · `validate` ✓.

### `05_TODO` chưa từng được index
`reindex` xưa nay chỉ nạp `docs/plan/*` và `06_CHANGES` — nên `05_TODO`, file **to nhất trong
`docs/agent`**, chỉ grep được chứ không search được, và `archive/05_TODO.md` càng không. Nay nạp toàn bộ
`docs/agent/*.md` (`kind="agent"`) + `archive/*.md` (`kind="agent-archive"`); `06_CHANGES` **cố ý loại**
vì đã có lane changelog riêng, nạp cả hai là index trùng.
Đo sau khi vá: *"16 plan doc(s) · **6 harness doc(s)** · 180 section(s) · 18 changelog + 56 archived"*;
`plan search "chờ nhúng vector"` nay trả đúng hit từ `docs/agent/05_TODO.md`.

### Lỗ nghiêm trọng trong luồng Cowork — user chỉ ra, và đúng
Bộ chuẩn Cowork dựng ra bắt **đọc hết `docs/`** mỗi phiên, mà hai file sổ thì **lớn dần mãi** —
trong khi Cowork **không có công cụ dòng lệnh nào để cắt** (sandbox không chạm terminal máy thật,
nên `zemory archive` vô hiệu). Tức thứ vừa ship có một đường phình **không phanh**.

Đo mức độ: bản trắng chỉ 57,6 KB (~14k token) — vô hại. Nhưng theo nhịp đo được trên chính repo này
(**3,3 entry/ngày · 9,5 KB/ngày**) thì sau một năm là **~3,5 MB ≈ 875k token**, tức **tràn** cả cửa sổ
1M. Ngay ở nhịp nhẹ hơn nhiều (1 entry/ngày, ~1,5 KB) vẫn là ~137k token/năm nạp lại mỗi phiên.

**Vá:** archive **không cần công cụ** — nó chỉ là chuyển đoạn cũ từ file này sang file kia, agent làm
được bằng thao tác file. Thêm luật **tự dọn cuối phiên** vào BOOTSTRAP, đặt ở **hai chỗ**: một mục
giải thích *vì sao* (để agent không bỏ qua), và trong chính đoạn dán vào ô **Instructions** của project —
chỗ duy nhất áp cho **mọi phiên sau**, chứ BOOTSTRAP chỉ chạy một lần.
Ngưỡng **300 dòng**: `06_CHANGES` chuyển entry cũ nhất giữ ~200 dòng mới; `05_TODO` chuyển mục `[x]`,
giữ toàn bộ mục mở. Chép **nguyên văn, cấm tóm tắt** — archive để tra lại, không phải để nén.

Luật này nằm **hoàn toàn trong `docs_template/cowork/`**, không đụng hai template gốc (user đã chốt:
app và non-app giữ nguyên "đọc full docs").

---

## [2026-07-28p] — Archive thôi là "cất kho": 56 entry cũ nay tra lại được

Gate 298 → **303** · `conform` ✓ · `validate` ✓. Áp cho **engine**, tức mọi project dùng zemory.

### Spec hứa một năng lực mà code không có
`plan/02 §3` viết từ lâu: *"Changelog search giữ cả active lẫn archived để quyết định cũ vẫn recall được."*
Đo thật: `changelog search "compress"` → **no matches**, trong khi `grep` thấy từ đó **có** trong
`docs/agent/archive/06_CHANGES.md`. Truy DB: index chỉ **12 dòng**, `archived=1` = **0**. Toàn bộ
**56 entry** archive (07-10 → 07-27f) không tồn tại với search.

*Kiểm chéo trước khi kết luận:* phép thử đầu tôi tìm `LeanCTX` và cũng ra rỗng — nhưng `grep` cho thấy
từ đó **không** có trong archive, tức phép thử vô hiệu. Đổi sang `compress` (có trong archive, không có
trong bản active) mới tách được "không index" khỏi "không có từ".

**Gốc:** mọi lần reseed đều `DELETE FROM changelog WHERE project_root=?` — xoá cả project rồi nạp lại
từ file **đã cắt**. Nên `archive` và `reindex` (chạy thường xuyên) đều xoá sạch tầng archived như một
tác dụng phụ không ai thấy.

### Vá: hai tầng, mỗi tầng tự dọn phần của mình
`importChangelog` nhận cờ `archived`; `replace` nay chỉ xoá **đúng tầng đang nạp** (`AND archived=?`),
nên nạp lại bản active không thể đụng tới tầng archived nữa. `reindex` nạp thêm `archive/06_CHANGES.md`
với `archived=1`; `archiveChanges` sau khi cắt thì index luôn phần vừa chuyển đi, không chờ `reindex`.

**Đo sau khi vá:** `reindex` → *"17 changelog entr(ies) + 56 archived"*; DB tách sạch hai tầng
(`archived=0`: 17 entry 07-27g→07-28o · `archived=1`: 56 entry 07-10→07-27f);
`changelog search "compress"` nay trả về đúng entry `[2026-07-11]` chỉ nằm trong archive.

### Vì sao đây KHÔNG phải đổi điều 3
File archive là **file nguồn** — nằm trong git, `reindex` dựng lại được — chỉ khác là nó ở ngoài vùng
đọc mỗi phiên. Index một file nguồn chính là hành vi dẫn xuất bình thường. Điều bị bác là phương án
*"cắt thẳng nội dung vào DB rồi bỏ file"*: cái đó lật ngược chiều nguồn, và `reindex` (`replace` —
comment trong code ghi rõ *"so the index mirrors the file exactly (FILE WINS)"*) sẽ xoá sạch ngay lần chạy kế.

**Mô hình 3 tầng sau khi vá:** nóng = `docs/agent/*.md` (đọc mỗi phiên) · **ấm = `archive/*.md`
(không đọc, nhưng DÒ ĐƯỢC)** · lạnh = lịch sử git (không mất, phải `git log -p`). Tầng ấm phình cũng
không tốn token vì không ai đọc nó; đo nhịp: **3,3 entry/ngày ≈ 3,5 MB/năm**, so với DB đã 947 MB.

Hệ quả: ngưỡng archive thành cái núm vô hại — hạ xuống 200 dòng cũng không mất gì, chỉ đổi từ
"đọc sẵn" sang "tra khi cần". *(Ngưỡng vẫn để 500 như user chốt; chưa đổi.)*

### Đột biến hoá 4/4
Phá 4 chỗ đòi đỏ, gồm **chính con bug cũ** (`replace` xoá cả project) · luôn ghi `archived=0` ·
luôn ghi `archived=1` · không ghi `body` vào index. Cả 4 đều bị bắt.

**Còn hụt, ghi để không tưởng là đã xong:** `05_TODO` **chưa từng được index** — `reindex` chỉ nạp
`docs/plan/*` và `06_CHANGES`. Nên `archive/05_TODO.md` hiện chỉ **grep** được, chưa **search** được.

---

## [2026-07-28o] — Trả `AGENTS.md` về "đọc HẾT docs/" — luật 3 file chỉ thuộc luồng Cowork

> 🔄 **Supersede:** thay phần **"đọc theo tầng"** của entry `[2026-07-28n]` (cùng ngày) — user chốt:
> *"luật đọc 3 file chỉ áp dụng với cowork thôi, hệ non app với app vẫn đọc full docs, không đổi"*.
> Phần **archive `05_TODO`** của entry đó GIỮ NGUYÊN, không đụng.

Gate **298/298** · `conform` ✓ · `validate` ✓.

**Tôi áp quá phạm vi.** Số đo về chi phí ngữ cảnh (111k token nếu đọc đủ `docs/`) là thật, và mẫu
"lớp mỏng + lớp theo điều kiện" của 5/6 chuẩn ngoài cũng thật — nhưng nó **không tự động thành lý do
đổi luật đọc của app/non-app**. Đó là quyết định của chủ repo, và chủ repo giữ nguyên.

Đã trả về nguyên trạng: `AGENTS.md` ở repo + **cả hai template** quay lại
*"ĐỌC HẾT `docs/` — KHÔNG bỏ sót: toàn bộ `docs/agent/*` và toàn bộ `docs/plan/*`"* (20 dòng, hai
template byte-identical). `02_RULES` chưa từng bị đụng. `docs_template/cowork/README.md` §5 cũng trả về.

**Luật rút gọn còn sống đúng một chỗ:** `BOOTSTRAP.md §1d`, và đã ghi rõ nó là **luật của riêng lần
dựng** — vì lúc đó `05_TODO`/`06_CHANGES` còn trống nên đọc trước cũng vô ích, còn `03_STRUCTURE`
thì tới giai đoạn 3a mới dùng. Kèm cảnh báo tại chỗ: *"từ phiên sau đọc theo đúng `AGENTS.md` của dự
án — tức đọc HẾT `docs/`; đừng bê thứ tự rút gọn ở đây thành thói quen thường trực."*

Manifest trong BOOTSTRAP theo đó về lại `AGENTS.md` = 20 dòng; gate xác nhận.

---

## [2026-07-28n] — Đọc theo TẦNG thay vì đọc hết · archive cho `05_TODO` (−46%)

Gate 292 → **298** · `conform` ✓ · `validate` ✓. User chốt cả hai hướng.

### Đối chiếu 6 chuẩn ngoài: zemory là bộ duy nhất bắt nạp hết
Claude Code (`paths:` trong `.claude/rules/`) · Cursor (`globs` + `alwaysApply`) · Kiro (3 chế độ
nạp) · Agent Skills (lũy tiến 3 nấc) · auto-memory (chỉ 200 dòng đầu của `MEMORY.md`) — **5/6 bộ
đều tách một lớp MỎNG luôn nạp khỏi một lớp DÀY nạp theo điều kiện.** Chỉ Gemini CLI và zemory nạp hết.
Ngưỡng họ khuyến nghị đều nhỏ: Claude <200 dòng/file · Cursor <200 từ cho phần luôn-nạp · Kiro <80 dòng.

Đo trên repo này: `docs/` = **443.571 byte ≈ 111.000 token** nếu đọc đủ; riêng `docs/agent/` ≈ 65.000.

### `AGENTS.md`: lớp nền 3 file, phần còn lại tra khi cần
Luôn đọc `01_CONSTITUTION` (được làm gì) → `02_RULES` (cư xử thế nào) → `04_SKILLS` (làm ra sao).
Tra khi cần: `03_STRUCTURE` **bắt buộc mở trước khi tạo/đổi/dời file** · `05_TODO` trước khi nhận
việc mới · `06_CHANGES` khi cần tra quyết định cũ · `plan/NN_*` mở đúng file theo số hiệu.
**Ngoại lệ giữ nguyên: chốt phiên / audit vẫn đọc HẾT** — bỏ sót lúc ghi sổ là ghi sai sổ.
`02_RULES` không đổi: nó vốn đã uỷ quyền thứ tự đọc cho `AGENTS.md` (§đầu file).

*Rủi ro đã nêu trước khi làm:* bỏ `03_STRUCTURE` khỏi lớp đầu thì agent có thể đặt file sai chỗ.
Chặn bằng cách viết luật "BẮT BUỘC mở TRƯỚC khi tạo/đổi tên/dời bất kỳ file hay thư mục nào"
ngay trong mục tra-khi-cần, cộng luật sẵn có ở `02_RULES §Cấu trúc repo`.

### `zemory archive` nay trim cả `05_TODO` — theo MỤC, không theo dòng
**Thiết kế đầu của tôi bị chính số đo bác:** định cắt theo SECTION đã đóng — đo ra chỉ 3/19 section,
**18/442 dòng (4%)**, vì section thật luôn trộn việc xong với việc mở. Cắt theo **MỤC** thì khác hẳn:
107 mục `[x]` = **49,6 KB = 46% file**. Đã đổi sang cấp mục.

**Ngưỡng kép, và đây là lý do:** `05_TODO` trung bình **241 byte/dòng** còn `06_CHANGES` chỉ 103 —
đếm dòng đo hụt hơn 2 lần, trong khi thứ đang trả tiền là ngữ cảnh, tức BYTE. Nên trigger là
`todo_lines` (500, user chốt) **hoặc** `todo_bytes` (60.000), cái nào chạm trước. `changes_lines` 400 → 500.

**Chạy thật:** `05_TODO` **441 → 267 dòng · 123,5 → 66,8 KB (−46%, ~14.200 token/phiên)**.
Kiểm chéo: 0 mục `[x]` còn sót · 40 mục mở còn nguyên · byte active + archive khớp bản gốc.
`06_CHANGES` 418 dòng < 500 nên không đụng — đúng.

### Đột biến hoá bắt được một lỗ trong chính bộ test
6 test mới; phá 5 chỗ đòi đỏ → **1 sống sót**: *"ghi đè archive thay vì nối thêm"*. Test "chạy 2 lần"
không chạm nhánh đó vì lần hai không còn mục nào để cắt nên hàm return sớm. Thêm ca **archive đợt
thứ hai** (làm thêm việc → xong → archive lại) thì bắt được: nếu ghi đè, toàn bộ lịch sử đợt một
biến mất. Sau khi vá: **5/5 đột biến bị bắt**.

*Ghi chú:* `05_TODO` sau khi cắt vẫn 66,8 KB > ngưỡng 60 KB, nhưng không còn mục `[x]` nào ⇒ lần
`archive` sau là no-op. Phần dư là văn bản tường thuật phiên (khối `>`), không phải mục — muốn cắt
tiếp thì phải quyết chỗ ở cho nó (`06_CHANGES`?), chưa làm. Archive cũng vừa đẻ một `.md.bak` nữa —
đúng mục đang treo ở `05_TODO` về việc cho archive tự dọn.

---
