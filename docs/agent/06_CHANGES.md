<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-23c] — corpus 68→108 nhãn · cổng lớp GỘP: trượt vì CẤU TRÚC, không vì corpus nhỏ

**Corpus recall 68 → 108 nhãn** (`tool_result` 8→25 · `tool_use` 14→26 · `keyword` 12→23; `prose` giữ
34). Lấy mẫu theo đúng công thức đã ghi: rải **bước id** trên toàn dải (KHÔNG lấy đuôi mới nhất — lấy
đuôi thì corpus đo mấy phiên gần đây, đúng lỗi bản `keyword` đầu tiên dồn 14/14 câu vào một phiên),
mỗi phiên một câu, ≤4 câu/project, tin trước 18/08 (dùng được cả trên kho song song), bỏ boilerplate
+ bỏ tin chứa secret. Lớp `keyword` sinh bằng 3 token có tần số tài liệu 2–400 + lane AND trả 1–60,
**có ca tự kiểm** (token lấy từ chính tin đó phải cho AND ≥1). **Đã loại có chủ đích:** token là mã
task/mảnh uuid (`bkn18008e`…) — không ai gõ thứ đó để tìm, nhãn như thế đo lối dùng KHÔNG CÓ THẬT.
Kiểm: 108/108 giải được · 0 trùng · 10 project. ⚠ **Mọi số bench cũ là corpus 68 — KHÔNG so trực tiếp
với 108.** Mốc nền mới (gộp BẬT): hybrid `@10` **32%** · MRR **0,214**.

**Cổng cho công tắc GỘP near-dup (HP điều 15: cắt một lớp phải qua đúng cổng như thêm).** Bộ đo riêng,
cả hai thước THEO LỚP + 18 ca âm, tự kiểm khớp bench chính thức (32% · 0,214 — hai đường code khác
nhau). Kết quả gộp BẬT→TẮT: **nghiêm cả BỐN lớp đều LÊN** (tổng +12 câu, MRR 0,214→0,252) nhưng
**tương đương tụt 3 chỗ** (keyword `@10` −1 câu · tool_result −2 câu · tool_use MRR −0,036); ca âm
không đổi một số nào.

🔴 **Phán quyết: TRƯỢT — và corpus lớn hơn 59% cho biết vì sao.** Ba mức tụt **không biến mất** khi
thêm nhãn ⇒ **cấu trúc, không phải nhiễu**. Đúng cơ chế `plan/17 §1.2` đã ghi lúc BẬT gộp: gộp bị
thước nghiêm phạt nặng nhất **về bản chất** (nó gom bản trùng nên đại diện cụm thường không phải đúng
uuid được đánh dấu). ⇒ cổng *"không lớp nào tụt ở CẢ HAI thước"* là **bất khả thi về nguyên tắc** cho
công tắc này: nó đổi thước này lấy thước kia. **Giữ gộp BẬT** (§1.2b đã chốt *tương đương cầm lái*, và
dưới thước đó BẬT thắng 71 vs 69 · 0,435 vs 0,425).

**Tự nhận:** lượt đầu tôi trình *"+11 điểm @10, lãi rõ nhất của cả đợt"* — đó là đọc **một mình thước
nghiêm**, đúng thứ §1.2b cảnh báo là ra quyết định sai. Phần lãi ở nghiêm chính là artefact mà thước
tương đương sinh ra để sửa.

## [2026-08-23b] — TEST FULL BGE-M3: KHÔNG TRÁO · thước TƯƠNG ĐƯƠNG không so được xuyên kho

**Hoàn tất bước ③ plan 19** (4 ô bench × 3 lane + 18 ca âm mỗi ô, + 2 probe đa-truy-vấn; 4,6 giờ máy
tĩnh, daemon tắt). Trước đó bù dữ liệu: `scan` kho song song +10.063 tin, rồi nhúng để **PARITY** —
đo bằng khoá bền `(session_id, uuid)`: chỉ-bge **49** · chỉ-gemma **166** trên 252,5k khoá, giữ nguyên
trước và sau bench.

🔴 **Cổng §4 TRƯỢT ⇒ KHÔNG tráo.** Thước nghiêm, gộp TẮT: gemma `@10` **46%**/0,292 vs bge 40%/0,267.
Theo lớp bge **đổi chỗ mạnh**: thắng `keyword` 50→67% · `tool_result` 25→38% · `tool_use` MRR
0,050→0,149, nhưng **`prose` 59→38%** và MRR 0,418→0,263 — mà prose là 34/68 nhãn. Kèm giá: bge
**1,8× chậm** đường tìm thường ngày (3.247 vs 1.743 ms), rerank 59,2 vs 43,5 s.

🔬 **Phát hiện phương pháp, giá trị hơn cả kết luận tráo: thước TƯƠNG ĐƯƠNG KHÔNG so được xuyên kho.**
Nó chấm bằng cosine ≥0,85 trên vector **của chính kho đó** — một ngưỡng cố định áp lên hai không gian
khác nhau. Bằng chứng sạch: ở gộp TẮT, lane `fts` hai kho trả **cùng tài liệu** (nghiêm trùng khít
13/22/26/37) nhưng tương đương chấm **43% vs 34%**. ⇒ phép so hợp lệ duy nhất giữa hai model là
**thước NGHIÊM**. Hệ quả cho `plan/17 §1.2b`: *"tương đương cầm lái"* đúng TRONG một kho, sai khi so
hai kho.

**T5 (đa-truy-vấn) không bật mặc định:** cả hai kho tụt ở nghiêm (gemma MRR 0,291→0,241 · bge
0,267→0,217), chỉ `@40` tương đương tăng (+6 · +7). Probe **tự kiểm khớp bench** (bge trùng từng số).
Không tái lập được *"+21 điểm prose"* của §1.1b — biến thể của tôi viết **mù** (corpus cố ý không chở
nội dung tin) ⇒ khẳng định lại §1.1b: lớp phương sai cao, **chất lượng biến thể quyết định dấu**.

**Ca âm: 0/18 chặn · 40,0 kết quả · điểm đầu 0,0289–0,0292 ở CẢ 4 ô** — không kho nào tự tin sai hơn.
Đây là lỗ lớn nhất còn lại của recall, **độc lập model lẫn lớp gộp**.
**Kho song song GIỮ vô thời hạn** (user chốt) — hồ sơ để mở lại nếu lối dùng đổi sang nhiều từ khoá.

## [2026-08-23] — 2.3.0 · đóng 5 lỗ TRÔI CHUẨN zemory↔template + cổng máy canh chúng

**Gốc chung: chuẩn sống ở 5 bản sao, không cơ chế nào giữ khớp** — đúng thứ mặt ③ của chính skill
`audit` gọi là *"NGUỒN TRÙNG: cùng một sự thật ở ≥2 nơi ⇒ chắc chắn sẽ lệch"*.

**Bác chẩn đoán "git sai / GitHub thiếu":** 0 file trên đĩa mà git không theo · 0 file
`skip-worktree` · không submodule · **998 = 998** file tracked hai bên · `docs_template` 109 = 109 ·
`.gitignore` loại 8 mục đều có chủ đích. Git chở đúng thứ nó được giao; **thứ cũ nằm trên đĩa**.

**Năm lỗ đã vá** (phạm vi user chốt: `app`+`nonapp`+`adapt`, KHÔNG cowork): ① `audit` **7→11 mặt** —
thiếu đúng 4 mặt của `plan/18`, mà `plan/18` biện minh chúng bằng **mọi lần repo này thực sự hỏng**
và **cả 8 ca đều rơi vào 4 mặt đó** · ② `audit` **+3 luật** (đo hai đường · đột biến hoá · ca âm) ·
③ skill **`sync-path`** ship 3 bộ + đăng ký `04_SKILLS` + hàng trigger · ④ luật cứng **`Bề mặt CHẾT
THEO nền`** vào cả 3 bộ (trước **không bộ nào** có) · ⑤ luật **`Tên file = TIẾNG ANH ASCII`** ship 5
bộ — chính lỗ đẻ ra tên plan tiếng Việt ở repo khác. Kèm 2 câu tự mâu thuẫn: zemory *"6 mặt"* vs
tiêu đề 11 · cowork *"ba mặt"* vs *"Bốn mặt"*.

**Phụ thuộc TRÍ NHỚ, không phải cổng:** mặt ⑪ thêm 22/08 ship đủ 4 bộ (lượt đó cố ý làm), cụm 4 mặt
thêm **11/08 chưa bao giờ đi**; `template-parity` cũ chỉ canh byte `guard.cjs` + `pull/fill/upload`.

**Cổng mới `standard-parity` (6/6)** — 5 phép neo vào 5 lỗ thật + **ca tự kiểm** (phép đếm trả 0 thì
mọi so sánh đều "bằng nhau"). Miễn là **danh sách tường minh kèm lý do**, và **hai bảng miễn do chính
cổng bắt ra ở hai lượt đầu**: `adapt` thiếu `reconcile` (hệ đó CẤM dời folder, có `adopt/` thay) ·
`nonapp` gọi `Secret` là `Secret/connection`. **4 đột biến ⇒ 4 lần ĐỎ.** Cổng đọc FILE, không import
`dist` ⇒ chạy được khi chưa build.

Kiểm trước mốc: tsc 0 · lint 0 · **685/685 test · 0 skipped** (92/101 file; trừ 7 file ONNX vì bench
đang chạy, trừ `conform-declared` vì cần build) · `conform --gate` ✓ 233 file · `validate` ✓.
⚠ **Nợ:** gate ĐẦY ĐỦ + `conform-declared` chạy sau khi bench xong rồi build.

## [2026-08-22d] — conform ĐỌC slot khai trong 03_STRUCTURE §3 (hết báo oan off-standard-dir cho APP domain-first)

*(Khoá đổi `b`→`d` lúc merge hai nhánh cùng ngày: nhánh này đã có `[2026-08-22b]` và nó đang được `05_TODO` trích. Nội dung entry KHÔNG đổi một chữ.)*

**Lỗi:** `off-standard-dir` chỉ tra `SLOT_ROLES` cứng, KHÔNG đọc `03_STRUCTURE.md §3` của chính
project — trái điều conform tự tuyên bố (HP điều 3 *file wins* · điều 13 *khai vào chuẩn rồi máy
honour*). Fix-text của nó (*"thêm slot vào chuẩn nếu là concern thật"*) thành lời nói suông: khai
vào §3 xong vẫn đỏ. Đóng mục `05_TODO "APP domain-first tên tự do chưa có đường khai"` — music_video_flow
(APP · FastAPI · đã nắn chuẩn 21/08) là ca thật đầu tiên: **16 blocking** cho `backend/app` · `api/v1` ·
`schemas` · `workspaces/*`, không mục nào lệch thật.

**Vá** (`structure-tree.ts` +73 · `conform.ts` +17): `declaredSlots(root)` parse §3 (CHỈ tree entry
`├── name/`, bỏ prose/`<placeholder>`) + `extraDirOk(dir)` exempt bốn đường — ① last-seg ∈ §3 khai ·
① top-level khai KHÔNG-phải-slot/root ⇒ freeform subtree (`workspaces/*`, như `tasks/<case>/` non-app) ·
② `backend/<pkg>/` có `__init__.py` = package root (scope depth-2) · ③ `api/vN`. Nối cả cổng blocking
`conform` lẫn cây UI (`roleFor`). Fail-open khi thiếu §3.

**Đo — KHÔNG nới luật:** music_video_flow **16 → ✓ 0**; fixture code-dir tên vô nghĩa CHƯA khai (không
pkg-root/api-version) **VẪN đỏ** (cổng còn nổ); **51/51** (conform · conform-declared[mới] · conform-foreign
· structure-sync · graph-standard), cổng parity điều 13 xanh. KHÔNG đổi `SLOT_ROLES` (không đụng repo
khác) · KHÔNG dùng ADAPT (music_video_flow là APP thuần đã nắn, không phải repo giữ cấu trúc riêng).

## [2026-08-22c] — gate đầy đủ chạy lại được · bench A/B MỘT PHẦN: lớp GỘP làm phép so lệch

**Gate ĐẦY ĐỦ `npm run check`: exit 0** — lần đầu từ 15/08 (job embed đã xong nên `clean && tsc`
không còn xoá `dist/` dưới chân ai). *Tự nhận: tôi pipe qua `tail -40` nên **mất con số ca test**;
gate vẫn PASS thật vì chuỗi `&&`, nhưng lần sau đừng pipe.* Job embed kết thúc bình thường:
log tự chốt `DỪNG: không còn tin nào để nhúng` · **257.006 vector · 0 remaining trong phạm vi**.

🔶 **Bench bước ③ — MỚI MỘT CẤU HÌNH, chưa phải test full** (user chỉ ra: thiếu rerank, thiếu
đa-truy-vấn, và kho song song còn thiếu ~9.600 tin). Số + phạm vi ở `plan/19 §4b`; **không được
đọc thành phán quyết về hệ mới**.

**Thứ đáng giá nhất lượt này là tách được BIẾN GÂY NHIỄU:** lớp gộp near-dup dùng vector với ngưỡng
cosine **cố định 0,85**, nên hai không gian vector khác nhau thì gộp khác nhau ⇒ **bench khi BẬT gộp
là so lệch**. Bằng chứng: tắt gộp thì lane FTS hai kho **trùng khít** (13/22/26/37 · MRR 0,183) —
đúng như phải vậy với cùng chỉ mục lexical; còn khi bật gộp, FTS lệch 18 vs 14 câu trong pool.

Ở điều kiện sạch (gộp TẮT): tổng 68 nhãn **gemma 46%/0,295 vs bge 43%/0,268**; theo lớp bge **đổi
chỗ mạnh** — thắng keyword (50→67%) và tool_result (25→38%), **thua rõ prose** (59→44%, MRR
0,404→0,259) mà prose là 34/68. ⇒ cổng §4 (*không lớp nào tụt*) **trượt ở cấu hình này**; chưa tráo.

🔴 **Phát hiện phụ có thể giá trị hơn cả đợt tráo — áp cho KHO ĐANG CHẠY:** lớp gộp lấy mất **~11–12
điểm `@10`** thước nghiêm (35→46) mà chỉ mua lại **+3 điểm** thước tương đương (66→69). Đây là một
CÔNG TẮC, không phải 44 giờ máy. Đổi mặc định phải qua cổng riêng + user chốt ⇒ **chưa đổi**.

## [2026-08-22b] — vá 2 cổng tự bẫy chính mình: `archive` nuốt cờ lạ · guard đọc tên file thành lệnh

Hai lỗi này **ảnh hưởng cả chuỗi repo** (cùng ship cho mọi repo dùng zemory) nên vá; các mục còn
lại trong bảng audit chỉ tác động MỘT máy nên giữ nguyên, không đụng.

**① `zemory archive` nhận MỌI cờ lạ rồi CHẠY THẬT** — hàm không nhận đối số nào, nên `--help` dời
5 entry + 6 mục và `--dry-run` in *"moved 2…"* rồi dời thật (bẫy tôi đúng hai lần trong một phiên).
Vá: cờ lạ ⇒ usage + **exit 1, không ghi byte nào**; `--dry-run` thật, chốt đặt ở **tầng hàm**
(`ArchiveOptions`, ngay sau khi ĐẾM) nên mọi người gọi đều có đường xem trước — tham số optional,
**22 lời gọi cũ không phải sửa**. Cổng: 3 ca (`--dry-run` byte-identical · **ca ÂM** không cờ vẫn
dời thật · ca **tầng CLI** chạy `dist/cli.js` trên repo tạm, đòi exit≠0 **và** file không đổi byte);
đột biến ⇒ 1 và 2 đỏ.

**② Guard đọc TÊN FILE thành lệnh push** — `\bpush\b` khớp token trong `.allow-push` (`-` là ký tự
không-phải-từ) ⇒ `git check-ignore -v docs/hooks/.allow-push` bị chặn, tức **chính lệnh để soi cờ**
cũng chết. Vá `PUSH_ARG = (?<![\w.-])push\b` ở **nguồn sinh** rồi đi trọn chuỗi: `hook guard` sinh
lại → chép bản ship cowork → manifest 338→343. Ba bước sau không phải tuỳ chọn: `template-parity`
và `bootstrap-manifest` bắt đúng bước tôi định bỏ qua. Cổng: 4 lệnh nhắc tên cờ × mọi tool phải QUA
+ **vế ngược** 5 dạng push thật phải CHẶN; đột biến ⇒ đỏ. Nghiệm thu thật: lệnh hôm qua bị chặn nay
trả `.gitignore:1:.allow-*`, push thật vẫn phải xin phép.

Cổng sau vá: **679/679 · 0 skipped** · tsc 0 · lint 0 · `conform` ✓ · `validate` ✓ · đúng 9 file đổi.
