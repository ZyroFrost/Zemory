<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-11b] — Bàn giao máy mới: `--full` là đường DUY NHẤT chở vector; bảng kênh git-vs-Drive

> 🔄 **Supersede:** thay [2026-08-11] — "khối NGUỒN ĐỒNG BỘ GLOBAL MEMORY" — khối đó chỉ ghi đường
> **lean/merge** nên đọc ra thành *"máy kia sync là chạy được"*, trong khi lean **không chở
> vector**: máy kia có đủ tin mà recall rơi về FTS. User bắt đúng chỗ (*"ko up embed 768 thì máy
> kia chạy sao"*).

**Đo bằng code, không đoán:** `share.ts:169` khai `ROWS_TABLES` = `schema_version · sessions ·
messages · known_stores` — `mergeMemoryBundle` **chỉ đọc bốn bảng đó**, nên gửi bundle `--full`
mà bên kia MERGE thì lớp dẫn xuất (≈87% dung lượng file) vẫn bị vứt. Đường duy nhất chở được
vector là **`import`**: `share.ts:508-512` đổi tên file giải mã **vào thẳng chỗ DB**, bản cũ lùi
thành `.bak-<mốc>` ⇒ **THAY, không phải THÊM** (máy đích có tin riêng phải `sync` đẩy lên trước).

**Thêm vào `05_TODO §NGUỒN ĐỒNG BỘ`:** bảng so hai đường lean/full · bốn thứ máy mới cần (mã ·
kho+chỉ mục · chìa · **model 4,4 GB**) · và **bảng KÊNH**: mã/docs/hooks đi **git**, kho đi
**Drive `.enc`**, chìa **mang tay**, model **tự tải** (HP điều 2), `dist/` không đi đâu cả.
Nhấn một điểm dễ sót: model cần cả lúc **TRUY VẤN** (phải nhúng câu hỏi mới so được với vector),
nên thiếu model thì kho có đủ vector vẫn rơi về FTS.

**Kiểm data không lộ:** cổng `no-data-in-git` **5/5**, và đã soát chiều ngược — mọi file cần để
dựng lại đều tracked (`package-lock` · `tsconfig` · `.gitattributes` · bộ `hooks/`), không thứ
nào cần mà bị ignore nhầm.

## [2026-08-11] — Nhúng lớp tool QUA CỔNG · vá lỗ manifest cowork · 3 mục sổ nói khác code

**Phép thử nhúng lớp tool: cổng QUA.** A/B cùng mã, cùng ngày, 68 nhãn — đối chứng chạy trên kho
thật thay vì so chéo với con số 10/08: `tool_use` **0% → 14%@10** · `keyword` 42% → **50%** ·
`prose` 50% → 50% (không tụt) · tổng nghiêm 35% → **40%**. ⚠ Mức nhảy của thước *tương đương*
(53→66%) **không phải toàn bộ là hệ tốt lên** — thước đó cần vector mới chấm được "gần trùng",
nên tin tool trước đây không thể được tính. Bằng chứng đáng tin là thước nghiêm **+3 nhãn**.
⇒ Đã phóng job embed kho thật (`Edit,Write,Bash,PowerShell,Artifact` = 45.059 tin, ~12–16 giờ),
tách tiến trình bằng `.vbs` nên **không chết theo phiên agent** như hai job ngày 10/08.

> 🔄 **Supersede mốc bằng chứng của `05_TODO`** (*"24.073 tin · 7/14 nhãn · 14/14 cần 28.705"*).
> Đo bằng DB: đã là **26.479 · 12/14**, và **14/14 là BẤT KHẢ THI** với phạm vi 4 tool — một nhãn
> nằm ở tool `Artifact`, ngoài danh sách ⇒ trần thật **13/14** (nay đã thêm `Artifact`, 21 tin).
> Neo đếm đúng: trong `vec_chunks_rowids` thì **`rowid`** là id tin, cột `id` bỏ trống.

**Bộ cowork: chốt máy ship rồi nhưng ĐƯỜNG TẢI không lấy được.** Gate `bootstrap-manifest` đỏ —
`[2026-08-10d]` khai "cowork nhận `hooks/`" chỉ đúng cho lối chép từ đĩa; MANIFEST **không khai
hai file đó** nên lối tải web (lối chính của Cowork thật) dựng ra bộ **không có chốt máy**. Kèm
3 số dòng lạc hậu — chính thứ làm `check_install.py` báo ✗ oan trên máy người dùng. Đã khai 2
hàng + vá số, nghiệm thu bằng bản cài dựng thật: **26/26, exit 0**; gate 8/8 · `guard-gen` 7.
**Xoá `docs_template/cowork.7z`** (user duyệt) — đúng hai quyết định cũ (*"KHÔNG commit, nó là
bản render"* 31/07 · *"chốt xoá"* 02/08) mà file vẫn tracked tới `d9cf711`, lại còn lạc hậu.

**Ba mục sổ nói khác code, đóng bằng bằng chứng:** đếm bundle ra 0 (đã vá `1cbe86c`, test khoá
`recall-lane-defaults.test.mjs:88`) · 3 comment sai đường kho (grep ra 0) · `autosync` "đang TẮT"
(đo config **và** `/automation` — đều `true`).

**Thêm `05_TODO §NGUỒN ĐỒNG BỘ GLOBAL MEMORY`** cho máy mới pull về (đường kho · con trỏ · thư mục
Drive · series · chìa TRƯỚC sync) — kèm cảnh báo **bundle lean KHÔNG chở vector**, máy kia tự embed.

## [2026-08-10d] — Guard: chặn XOÁ · dogfood pre-commit · SHIP chốt máy cho cowork (đảo quyết định)

> 🔄 **Supersede [2026-08-07] §Guardrail** ở vế *"bộ cowork CỐ Ý không mang chốt máy"*. Lý do đảo
> (user chốt): cowork **phụ thuộc hoàn toàn vào luật chữ, mà chữ thì agent QUÊN được**. Kiểm lại
> rào cũ thì nó **đúng một nửa**: `guard.cjs` dùng thuần `node:fs`+`node:path`, CLI chỉ cần lúc
> SINH chứ không cần lúc CHẠY ⇒ **ship bản đã sinh** là hết phụ thuộc CLI. Thiếu hook thì file
> nằm im vô hại và ăn ngay ngày host có — hơn hẳn không ship gì.

**Ba lỗ do agent repo khác báo — kiểm lại từng cái, 3 đúng / 2 bác.**

**① Guard không chặn xoá — ĐÚNG.** `checkBash` 1.2.0 có 5 nhánh, không nhánh nào về xoá; thử thật
`rm -rf` · `Remove-Item -Recurse` · `del /S` đều **rc=0, lọt sạch** — trong khi `02_RULES §Hành xử`
gọi xoá là bất khả đảo. Luật có chữ, không có chốt. Nay thêm nhánh **HẸP**: chặn xoá đệ quy (flag
`.allow-delete` một lần) + chặn xoá trúng `protected`/secret; **cho qua** xoá một file thường —
*chốt chặn ≠ chốt chặt*, gate nhiễu là gate bị bỏ qua. Thử **6/6** đúng thiết kế.

**② zemory dogfood nửa vời — ĐÚNG.** `.git/hooks/pre-commit` không tồn tại và `protected_write`
rỗng ⇒ chặn secret **chỉ phủ đường agent, không phủ người gõ tay**. Nay khai `protected` +
`secretNames` vào `.harness.json`, sinh lại policy, cắm pre-commit. Thử trên repo git tạm: **3/3**.

**③ cowork thiếu — ĐÚNG MỘT PHẦN, hai claim BÁC được bằng bằng chứng:**
· *Guardrail* — không phải sót, `02_RULES:84` ghi rõ "CỐ Ý không mang" (nay đã đảo, xem trên).
· *skill `case/`* — **không chép**: hai bộ khác MÔ HÌNH, nonapp theo **vụ việc** (`tasks/<case>/`),
cowork theo **nhịp định kỳ** (`tasks/NN_<cadence>/` + `SCHEDULE.md`). Ép vào sẽ đẻ hai cách đặt
tên đá nhau — là quyết định thiết kế, chờ user.
· *3 chặng data* — **thiếu thật**, đã thêm vào `conventions.md` + `check_structure.py`, kèm luật
**ĐẦU VÀO CHỈ ĐỌC** (`01_raw/` bất khả đảo; trung gian xoá thoải mái, dựng lại được).

**Kèm: `protected_write` nay nhận GLOB** (áp cả app/nonapp/adapt) — `data/*/01_raw` là thứ tiền tố
**không nói nổi** vì tên case không biết trước. Bộ cowork nhận `hooks/` ship sẵn, thử cây giả
**8/8**: chặn `01_raw` MỌI case · chặn `docs/agent` · chặn xoá đệ quy; cho qua `02_processing` ·
`03_output` · file tạm.

## [2026-08-10c] — Daemon chết KHÔNG LỜI TRĂNG TRỐI: tìm ra nguyên nhân gốc sau 3 tuần

> 🔄 **Bác giả thuyết chủ đạo treo từ 2026-07-21** (*"nghi crash NATIVE — segfault
> better-sqlite3/onnxruntime bỏ qua handler JS"*). Soi ba tuần **sai hướng**.

**Nguyên nhân thật là lỗi thiết kế của chính repo:** `autostart.ts` dùng `start "" /b`. Cờ `/b`
**KHÔNG tách tiến trình** — daemon chạy TRONG CÙNG console với file khởi động nên bị buộc vào vòng
đời console đó; console đóng ⇒ `CTRL_CLOSE_EVENT` rồi `TerminateProcess` ⇒ **giết cứng, không
handler nào kịp chạy**.

**Vì sao hộp đen im lặng — và đó là BẰNG CHỨNG, không phải hộp đen hỏng:** `process.on("exit")` ghi
MỌI lối thoát bình thường. Bốn nguồn cùng im (không `shutting down` · không `process exit code=` ·
không `report.*.json` · Windows không có `Application Error` cho `node.exe`) ⇒ **loại trừ** hết
đường đi qua Node, còn đúng một khả năng: bị kết thúc cứng từ ngoài.

**Sửa 3 lớp, mỗi lớp thử thật:** ① gốc — autostart sang `.vbs` (`WshShell.Run(cmd,0,False)`),
đo: daemon sinh ra **MỒ CÔI** (cha đã thoát), `/ping` sống · ② triệu chứng — cửa sổ có nhịp tim,
daemon chết thì **cửa sổ chết theo** (giết server giả ⇒ cửa sổ thoát sau **20,2 s**); kèm luật
`02_RULES §Bề mặt CHẾT THEO nền` · ③ chẩn đoán — `daemonHeartbeat()` ghi mốc mỗi 30 s, thứ DUY NHẤT
còn lại khi bị giết cứng.

**Ca chết thứ hai trong ngày KHÔNG phải bug** — user tự tắt máy 02:18, khớp sự kiện Windows `1074`.
⚠ Ca còn lại khớp giả thuyết rất sát nhưng **chưa bắt tận tay**; nhịp tim là thứ chốt ở lần sau.
🔎 Hệ quả: **daemon do agent khởi động từ shell của nó cũng dính đúng lỗi này** (con của `bash.exe`)
— đó là lý do **hai job embed chết giữa chừng 10/08**.

## [2026-08-10b] — Đa-truy-vấn: CHẤT LƯỢNG biến thể quyết định DẤU · sửa mô tả tool MCP · biến thể tự sinh THẤT BẠI

> 🔄 **Supersede số của [2026-08-09]** — *"ba lối nói cho `prose@40` 68 → 94%"*. Đo lại trên đường
> ống hôm nay (đã đổi nhiều: `vecMix` · gộp trùng · hình phạt tool hai mức · `W_OR` 0,3): ba lối
> nói chỉ ra **59%**. Con số 94% hết hạn, đừng dùng lại làm mốc.

**Đo trên 34 nhãn `prose`, tham số khớp `recallbench.ts:241` (`all:true`, rerank off):**

| cấu hình | @1 | @3 | @10 | @40 | MRR |
|---|---:|---:|---:|---:|---:|
| 1 truy vấn (nền) | **35%** | 44% | 50% | 65% | 0,407 |
| q + biến thể **CỤ THỂ** | 32% | **47%** | **71%** | **79%** | **0,432** |
| q + biến thể **MƠ HỒ** | 15% | 15% | 35% | 50% | **0,189** |
| q + cả hai | 21% | 32% | 50% | 59% | 0,300 |

**Kết luận không phải "gửi mấy cái" mà là "gửi cái NHƯ THẾ NÀO".** Cùng một số lượng: biến thể
diễn đạt kỹ, giữ nguyên độ cụ thể ⇒ `@10` **+21 điểm**; biến thể ngắn/mơ hồ ⇒ MRR rơi xuống **dưới
một nửa mức không dùng gì**. Đây là lớp có **PHƯƠNG SAI CAO**, không phải lớp "bật là lợi".

**Ba nguồn sinh biến thể, đã đo đủ cả ba — chỉ một nguồn dùng được:**
· luật tất định (3 từ hiếm) → MRR 0,407 → **0,215**, hại nặng · LLM nhỏ trong lõi (Qwen3-0,6B,
09/08) → 0,458 → 0,334, hại · **agent/người viết → 0,407 → 0,432, THẮNG**. Tức đúng thứ tự ưu
tiên điều 6: bậc ① và ③ đều thua, **bậc ② thắng** — nay có thêm bằng chứng thứ hai.

**Đã sửa mô tả tool MCP `memory_search`** theo đúng số mới: khuyên gửi **MỘT** biến thể, bắt buộc
*"cụ thể ngang câu gốc — viết không nổi thì đừng gửi"*, và nêu thẳng con số phạt (0,189 vs 0,407).
Mô tả cũ khuyên 2–3 biến thể dựa trên mốc 94% nay đã hết hạn ⇒ nó đang dạy sai mọi agent nối vào.

**Hệ quả thiết kế** (chi tiết `05_TODO` + `plan/17 §1.1b`): ô "cách nói khác" trên UI KHÔNG còn là
thắng lợi hiển nhiên — gõ câu mơ hồ vào là tệ hơn không gõ, nên nó không thể là một ô trống.

## [2026-08-10] — Rerank ĐÓNG bằng số · RM3 + luồng từ-hiếm TRƯỢT CỔNG · tìm ra cơ chế chôn `tool_use`

**Rerank: đo dứt điểm rồi TẮT.** Bench 68 nhãn, kho thật: thua **mọi** cột nghiêm (`@1` 25→18% ·
`@10` 35→28% · MRR 0,288→**0,204**) và chậm **11,6×** (1.165 → 13.499 ms). Đã tắt qua
`/set-rerank?on=0`. ⚠ **Đính chính báo cáo giữa phiên của tôi:** dưới thước **tương đương** rerank
gần như HOÀ (0,413 vs 0,402) — nó không phá recall mà *xáo giữa các tin tương đương*, thước
nghiêm phạt nặng chuyện đó. Phán quyết đúng là **"không đáng 11,6× thời gian"**, không phải "làm hỏng".

**Hai lớp mới TRƯỢT CỔNG — giữ code, mặc định TẮT** (`ZEMORY_RM3=1` / `ZEMORY_RARE=1`).
RM3 nhích đỉnh (MRR 0,288→0,294) nhưng **tụt chính `@40` — thứ nó sinh ra để cứu** (47→44%) và
phá nặng FTS-thuần (0,191→0,154), tức đường nhanh của app. Luồng từ-hiếm cũng trượt (0,277).
Bảng đầy đủ + vì sao: `plan/17 §3d`.

**Phát hiện đáng giá nhất — `tool_use` 0% là lỗi KIẾN TRÚC GỘP, không phải thiếu vector.** Luồng
từ-hiếm CÓ đáp án **7/14** ở pool 60 (nhiều câu hạng 1–2) mà đường ống trả **0/14**; nâng
`W_RARE` 0,45→3 cứu 3/14 vào top-40. RRF **thưởng đồng thuận nhiều luồng** nên thứ chỉ có mặt ở
MỘT luồng thì hạng 1 cũng bị vùi — quan hệ đơn điệu: `prose` 3 luồng **50%@10** · `tool_result`
2 luồng **25%** · `tool_use` 1 luồng **0%**. ⇒ Giá trị của job embed là **cấp luồng thứ hai**,
không phải "khớp ngữ nghĩa" như `plan/17 §3.2` nói; phạm vi đúng theo nhãn là
`Edit,Write,Bash,PowerShell` (44.747 tin ≈ 15,7 giờ). Chi tiết + cổng nghiệm thu: `plan/17 §3c`.

**⚠ LỖI PHƯƠNG PHÁP CỦA TÔI — rút lại 3 kết luận.** Probe tự dựng **thiếu `all: true`** trong khi
`recallbench.ts:240` luôn có; 14 đáp án nằm rải **12 project** nên probe lọc mất gần hết. Ba thí
nghiệm chạy trên nó (`TOOL_DEMOTE` 0,7/0,9/1,0 · `vecMix` · gộp-trùng) **vô giá trị, đã bỏ**. Bench
vẫn đứng vì có `all:true`. Đúng luật `02_RULES` cấm: *đo bằng bề mặt hẹp hơn bề mặt chịu ảnh hưởng*.

## [2026-08-09e] — Đồng bộ sổ↔code (5 mục thối) · UI nói SAI thực tế · reindex · bug đếm bundle

**5 mục sổ nói khác code, sửa bằng bằng chứng dòng code** (đổi `[ ]`→`✅`, KHÔNG xoá dòng):
`W_OR` sổ ghi "cần hạ 0,6→0,25" mà code đã 0,3 (`search.ts:101`) · write-gate khoá TƯƠI/MỒ CÔI đã
làm (`commands/memory.ts:225-256`) · ca test tầng LỆNH đã có · "chưa có cơ chế cổng không-biết" —
SAI, có từ `search.ts:389` · `tool_result` "về 0%" — đã lên 63→75%. Cộng dấu `[~]` rebuild 768
lạc hậu. **Lỗ của chính gate:** `todo verify` xanh nhưng chỉ tra được **28/79 mục**, cả 5 chỗ
lệch đều nằm ngoài vùng nó với tới.

**UI nói SAI với người dùng — 6 chuỗi, cả hai từ điển VI+EN.** Mô tả Bộ nhớ ghi
`~/.zemory/global_memory.db` (sai từ khi kho dời vào repo — HP điều 14) · mô tả Vector và tooltip
`hint.dims` ghi **256d** trong khi kho chạy **768d/fp32** từ 08/08 ⇒ **màn hình tự mâu thuẫn**: ô số
hiện 768d, phần mô tả nói 256d. Kèm 2 dòng **help CLI** cũng còn đường cũ (đã `npx tsc`), 5 chỗ
trong `docs/plan` (00 ×2 · 02 ×2 · 04) và `plan/05 §5` (gạch dòng "256d là mặc định thật").

**⚠ Chính bản vá UI đó làm CHẾT TOÀN BỘ giao diện.** Dấu nháy đơn trong câu tiếng Anh tôi thêm
(`the model's native size`) **đóng sớm chuỗi** ở từ điển toàn nháy đơn ⇒ `chrome.js` lỗi cú pháp ⇒
`zboot` không định nghĩa ⇒ `boot.js:5` chết ⇒ mọi thẻ đứng ở placeholder tĩnh (badge `v1.0.0`
chính là placeholder chưa bị `/ping` ghi đè). **Tôi CÓ chạy `node --check` — nhưng TRƯỚC lần sửa
cuối, nên nó chứng nhận cho bản không phải bản ship.** Chốt chặn mới chạy SAU khi sửa xong: parse
cả 12 file + **nạp 12 script theo đúng thứ tự `app.html` trong DOM giả** rồi xác nhận
`zboot`/`renderHarness`/`renderMem` tồn tại (bắt được cả lỗi thứ tự nạp mà `--check` mù), và
nghiệm thu trên bản daemon **phục vụ qua HTTP** chứ không phải file trên đĩa.

**`zemory reindex`** — chỉ mục thiếu phần sửa hôm nay (changelog 394→395, section 1080→1111).
⚠ Đính chính: tôi từng báo "mù ba tuần" dựa vào `doc.rendered_at`=16/07 — **suy luận sai**, đó là
cột đời cũ của đường render DB→md đã gỡ, `reindex` không ghi vào nó.

**Bug MỚI, chưa sửa** (chi tiết `05_TODO §Phát sinh 09/10-08`): `ui.ts:256` đếm bundle bằng hậu tố
**đời cũ** `.zemory.enc` ⇒ máy đã lên định dạng series **vĩnh viễn hiện 0 bundle**; chỉ sai HIỂN THỊ.
