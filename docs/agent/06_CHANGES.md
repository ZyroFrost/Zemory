<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-07d] — RELEASE 1.2.0 · Vét TRỌN harness theo marker (đóng ADAPT v2) · corpus recall CHIA LỚP · 3 lượt audit

> 🏷 **1.2.0 (user chốt số, push 2026-08-07)** — minor vì có tính năng mới: `zemory hook guard`
> (chốt chặn lớp ①) · chuẩn ADAPT v2 (harness đặt được ở bất kỳ đâu trong repo) · chuẩn NON-APP
> mở rộng (1-case-1-folder + data 3 chặng) · corpus recall chia lớp. Gộp 20 commit của ngày.
> Trước khi đẩy: `typecheck` · `lint` · `conform --gate` · `todo verify` · `validate` đều exit 0;
> `no-data-in-git` 5/5; `git ls-files` không có `data/` · `share.key` · `.env` · `*.db` · `*.enc`;
> `docs/hooks/` chỉ track 4 file (policy chứa MẪU secret, không có giá trị thật), 0 flag `.allow-*`.

**Vét trọn nhóm LỆNH + bề mặt** (các cổng đã theo marker ở `[2026-08-07c]`; đây là phần đuôi):
`reindex` · `archive` · `todo verify` · `plan ls` · và **UI** (`listHarnessFiles`/`readDoc`).
Mỗi cái hỏng một kiểu riêng trên repo đặt harness ở `harness/`: reindex nhận chỉ mục RỖNG mà
không báo lỗi · todo verify báo 0 mục = **cổng không bao giờ đỏ được** · archive ĐẺ cây docs
thứ hai (ghi vào thư mục của team) · UI hiện cây file rỗng rồi mời chạy `init/sync` — đúng
lệnh sẽ scaffold vào `docs/` của team. Nghiệm thu trên clone repo tham chiếu: reindex 9 plan +
6 harness doc + 117 section + 17 changelog (trước: 0 hết) · todo verify thấy 63 mục.
⇒ **10/10 điểm ép của spec đã đóng; hai literal còn lại là CỐ Ý** (fallback nếp cũ trong
`core/config`, tham số mặc định `readStandardSpec` — ghi đè được).

**Corpus recall CHIA LỚP 34 → 56 câu** (`prose` · `tool_use` · `tool_result`) + bench in bảng
theo lớp. Cơ sở: đo thành phần kho 213.241 tin — `tool_use` 28,7% (không vector, không trigram
⇒ chỉ FTS word) · `tool_result` 28,3% (CÓ vector, đang ăn ~40% công embed) · hội thoại 42,9%.
Corpus cũ toàn `prose` nên có nhân lên 200 câu vẫn mù với 57% kho. Kèm `coverage` theo lớp
(cột `n` in `2/14` khi thiếu nhãn; lớp mất sạch nhãn vẫn có hàng riêng) — nếu không, tỉ lệ
tính trên 2 câu trông y hệt tỉ lệ tính trên 14 câu.

**3 lượt audit, 6 mặt.** Lượt 2 ra bug thật: `conform` còn 3 literal ⇒ **XANH GIẢ** trên repo
adapt — sửa xong nó bắt ngay 2 dangling-ref THẬT của repo đó. Lượt 3 không còn bug chức năng,
chỉ ra: thang marker chưa có test (đã thêm 6 ca, đột biến đỏ 2/6) · guard thêm **~650 ms/tool
call** (số đo, chờ user quyết có thu hẹp matcher) · **còn mù 5 file test nặng model** (embed ·
rerank · vectors · memory-search · digest) — chạy sau khi embed xong, ghi ra để không đọc
"audit xanh" thành "đã soi hết".
- **Bug do chính đợt vét gây ra, bề mặt thật mới bắt được:** tôi "chuẩn hoá" đường index sang
  posix, nhưng index lưu theo separator OS (23 doc row dạng `docs\agent\…`) ⇒ lần reindex sau
  sẽ đẻ hàng TRÙNG, và `plan ls` im lặng báo "index rỗng" dù chỉ mục đủ. **115/115 test xanh
  không bắt được — chỉ gọi bề mặt thật mới bắt.** Chuyển index sang posix là MIGRATION riêng.

## [2026-08-07c] — ADAPT v2 trọn bộ · guardrail lớp ① vào template + dogfood · NON-APP hấp thụ mẫu case-folder

**ADAPT v2** (user chốt; thi hành spec `harness/plan/08_adapt_standard.md` của repo OpenRCA, đọc
read-only — spec là nguồn chi tiết, entry này chỉ ghi số đo). 10 commit `673ecbb..b03ede5` sửa đủ
10 điểm-ép: bỏ `renameSync` dời `plan/` của repo · marker thang 3 bậc + con trỏ `{home}` ·
`harnessPaths()`/`readMarker()` MỖI sự thật MỘT hàm (thay 147 literal/37 file + 5 bản parse marker
— cả 5 từng cùng ngã trên marker có BOM) · `validate` nhánh adapt · `foreign-undeclared-dir` chỉ
chặn folder chứa code (hết 4 blocking oan) · bộ file bắt buộc + `graph-standard` đọc theo marker ·
entry BA trạng thái (nối gián tiếp qua `@AGENTS.md` tính là nối) · `zemory hook guard` sinh chốt
lớp ① từ marker. **Nghiệm thu trên clone repo tham chiếu: doctor not-connected→connected · conform
2 lỗi chặn→sạch · validate `structure[adapt]: 10+6` · số điều hiến pháp đọc được: **0 → 8**.**
Nếp cũ `docs/` không gãy.

**Guardrail lớp ① thành chuẩn + dogfood:** `02_RULES §Guardrail` vào template app/nonapp/adapt
(cowork CỐ Ý không — không bảo đảm CLI/hook) · doctor nhắc khi khai `protected` mà chưa có chốt ·
zemory tự đeo (`docs/hooks/` + PreToolUse project-scoped, user duyệt). Đeo thật lộ 2 lỗ sửa ngay:
pipe PS chèn BOM ⇒ guard fail-open thành TẮT CẢ LUẬT (nay tự lột BOM) · `*.key` thiếu trong
`key_read_block` ⇒ Read `share.key` đi qua êm (nay chặn — plan/16 §4: cấm commit thì cấm đọc).

**NON-APP hấp thụ từ PBI_SasinFlow_Maintain** (user chốt; §4b bên đó tự ghi đường thăng cấp):
1-CASE-1-FOLDER (`NN_` định kỳ + không-số theo yêu cầu; spec.md sổ sống; 3 ngoại lệ) · data 3 chặng
`01_raw/02_processing/03_output` + phép thử "xoá đi dựng lại được không" · skill `case/` port tổng
quát. Scaffold trắng: 20 file, conform sạch. **Kèm:** gate bắt byte NUL sẵn có trong `graph-seam.ts`
(grep coi file là nhị phân) — sửa bằng escape · audit 6 mặt ra 1 finding thật đã sửa (fallback
`harnessPathsAt` chép tay bộ mặc định) · 75/75 test vùng đụng, conform/todo-verify exit 0.

## [2026-08-07b] — Ô chỉnh ngưỡng context · cạnh `api` BE↔FE v1 · todo-verify vá 2 lỗi của chính nó · sự cố cửa sổ smoke

**Ô chỉnh ngưỡng nhắc context (user chốt "làm đi"):** hàng mới pane ⚙→⚡ (input 50–99%), `/automation`
phơi `contextWarnPercent`, đổi gửi qua `/set-context-warn`, server kẹp và TRẢ SỐ THẬT về ô (smoke: gõ
120 → lưu 99); i18n đủ 2 dict — gate "cấm khẳng định tiết kiệm token" bắt đúng một chuỗi EN, đổi chữ
thay vì nới gate. renderAuto không đè ô đang focus (không nuốt số đang gõ).

**Cạnh `api` BE↔FE v1 (user chốt — hấp thụ Grapuco, spec graduate `plan/13 §4`):** FE↔BE nói chuyện
qua HTTP nên import-graph có **0 cạnh** giữa hai bờ. `graph-seam.ts` khớp chuỗi route
(`fetch/zGet/zPost('/x')` ↔ BE chứa nguyên văn `"/x"`), nhãn **inferred·textual** (điều 13 — trần của
match chuỗi, `resolved` chỉ có khi repo có typed contract), gộp mức file (`routes[]`+`count`, mỗi cặp
một eid). Ba bề mặt: `/code-graph` (UI tự có lọc + nét đứt) · `graph export`/`edge` · `graph impact`.
**Đo thật: `ui.ts` ← 10 file FE kèm từng route** — trả lời đúng "sửa handler thì màn nào gãy".
Test 5/5 + đột biến đỏ 4/4 (fixture + chạy trên chính repo).

**`todo verify` tự bắt 2 lỗi của chính nó:** ① gate exit 1 mà bảng in **0 dòng** — formatter QUÊN
kind `code-moi-hon-so` (gate đỏ không nói vì sao = gate bị tắt); ② trục thời gian flag oan 2/4 mục vì
đếm cả `.md` (AGENTS/CLAUDE đổi hàng tuần vì đủ lý do) → trục ⏱ chỉ canh file CODE. 2 mục flag ĐÚNG
(daemon exit-1 · số prototype graph) được đóng dấu soát 2026-08-07. Gate về EXIT=0 sạch.

**Sự cố "app không có data" — lỗi vận hành của agent, KHÔNG mất dữ liệu:** 3 lần smoke `zemory ui`
với DB tạm đã **bật cửa sổ thật lên desktop user** (lệnh đó luôn mở window, không có chế độ ẩn) —
user mở trúng thấy kho rỗng **344 KB** (khớp từng KB với DB tạm), tưởng hỏng. Kho thật nguyên 1.216 MB,
daemon 4444 trả số đủ. **Quy tắc rút ra: KHÔNG smoke bằng `zemory ui`** — kiểm bề mặt thì curl daemon
thật (read-only); đề xuất cờ `--no-window` ghi ở TODO chờ user.

**Embed 768 (cửa sổ user): 4 lần ĐỨNG trong ngày, đều do console mark-mode** (bôi đen/copy là Windows
block lệnh in kế tiếp; ESC là chạy lại — user tự xác nhận). Trị: chạy redirect `*> embed.log` (console
không còn gì để block) + `watch.cjs` (bảng theo dõi tự cập nhật 30s, phát hiện đứng sau 4 nhịp) +
`progress.cjs` (xem một phát). Kèm chẩn explorer crash 15:59 (2×, fault module = chính explorer.exe;
RAM/GPU/wallpaper đều âm tính — đo Resource-Exhaustion + TDR 4101 + WER) — tai nạn lẻ, không phải app.

## [2026-08-07] — HP điều 15: CHẤT LƯỢNG bộ nhớ > dung lượng · bác đề xuất cắt trigram · bỏ policy graph.json · tách graph.js

**HP điều 15 (user chốt), sinh ra từ một đề xuất SAI của chính agent trong phiên này.** Tôi đề xuất
cắt tool-dump khỏi FTS trigram (~285 MB, 24% kho). User bác — *"cái t hướng tới là chất lượng… chính
bạn đề xuất giảm chiều embed 256 làm hư hết data, giờ mới tốn công embed lại cực lâu"*. Đo lại thì
user đúng và đề xuất của tôi hỏng ở gốc: **119.668 tin tool-dump chỉ có 171 tin mang vector** (embed
cố ý bỏ `tool_name IS NOT NULL`) ⇒ với 57% kho, FTS word + trigram là **hai chân tìm kiếm DUY NHẤT**,
cắt trigram là chặt một chân. Đổi lấy 285 MB trong khi ổ còn **140 GB trống**.
- **Lỗi phương pháp, không phải sơ suất số học:** tôi tính được phần TIẾT KIỆM (MB cân ngay được)
  mà không đo phần MẤT (recall — phải có corpus nhãn). Y hệt vụ **cắt 256 chiều**: đo được
  1.141→595 MB, không ai đo chất lượng, tới 05/08 mới lộ **recall@1 74% vs 91%** + **44% câu không
  bao giờ lấy về được**, chuộc bằng **43 giờ**.
- **Điều 15 chốt:** chất lượng truy hồi là đích cao nhất của mọi mô hình RAG · đề xuất tối ưu **phải
  đi theo hướng TĂNG** chất lượng · **cắt/thu hẹp phải qua ĐÚNG CỔNG như thêm mới** (điều 12: đo
  recall trên corpus có nhãn TRƯỚC) · *"đĩa rẻ và mua thêm được; một câu trả lời trượt vì recall kém
  thì không mua lại được"*. Điều 12 vốn chỉ canh cửa **BẬT lớp mới** — đây là bịt cửa **CẮT lớp cũ**.
- **Và chiều NGƯỢC LẠI cũng bị canh (user chốt cùng ngày):** được phép **TĂNG** (thêm chiều, đổi
  model, thêm lớp) *nếu đáng giá*, nhưng phải đo bằng **phép thử NHỎ trên BẢN SAO TRƯỚC** — mức tăng
  bao nhiêu · giá phải trả · có đáng đổi không; không đáng thì **đề xuất đường khác**. Cấm "làm hết
  rồi mới thấy sai". Khuôn mẫu đã làm ĐÚNG và phải dùng lại: `dims-test` embed MỘT lần ở 768 rồi cắt
  4 mức trên **cùng một dãy số** (Matryoshka ⇒ biến duy nhất là số chiều) → bảng `recall@1`
  62/74/85/**91%** trong ~1 giờ, rồi mới bỏ 43 giờ. **Một giờ đo cứu 43 giờ đi sai đường.**
- **KHÔNG lan sang `docs_template`:** đây là luật riêng của một app có RAG/bộ nhớ; phần lớn repo dùng
  template (BI · report · docs-only) không có lớp đó, thêm vào là nhét luật không dùng.

**Bỏ policy schema `graph.json` (user chốt: "ko xài, cũng ko phù hợp app").** Đo trước khi bỏ: hợp
đồng đó **chưa có consumer nào** — kế hoạch gốc là "Graph App" repo riêng, nhưng 18/07 đã đảo hướng
(graph thành tab trong `zemory ui`, đọc thẳng `/code-graph`). Lệnh `graph export` giữ nguyên.

**Tách `graph.js` (bước 3) — và nó lòi ra lỗi của bước 1.** `graph.js` đang ôm **125 dòng KHÔNG phải
graph** (`renderMem` · `renderDiscovered` · `renderDriveDonut` · `refreshChecks` · `loadRecentSessions`…)
vì lần cắt trước neo theo dải phân cách, mà dải "graph" trùm luôn đầu khối PHASE-2. Đã trả về đúng nhà
theo concern (gm · sources · system · shell), rồi mới chia phần graph thật: **`graph-render`** (canvas
31 KB) + **`graph-panel`** (cây/toolbar/seam 9 KB). Phủ kín kiểm bằng Counter (560 dòng → 355+80+125),
lệch một dòng là dừng không ghi. **129/129** test · smoke 12/12 script → 200 · `graph.js` cũ → 404.

**Kèm:** `todo verify` nối vào `npm run check` (gate 5 bước) · `digest v4 cleanPath` cắt văn xuôi khỏi
`paths_touched` (261/261 path bẩn xử sạch) · đo dung lượng kho bằng `dbstat` (trigram 512 MB = 42,3%).

## [2026-08-06c] — Đợt "fix nhóm B": 10 việc code · luật BA NGUỒN lan 4 bộ mẫu · tách app.js 11 file

**Nền:** soát 48 mục theo luật ĐO LẠI → 3 chỗ sổ≠code (write-gate "chưa sửa" đã sửa · plan14§7
"còn hai" đã chốt cả 5 · spec context-guard còn `[ ]`) — sửa sổ, rồi fix lần lượt:
- **`relocate` chở CẢ CỤM kho** (trước chỉ db+config+models, bỏ lại `share.key`/`secrets`/8 folder
  — lỗ điều 7 đã trả giá 05/08). Đảo sang **danh sách ĐEN** (chở hết, chừa `.bak`/`corrupt-*`/lock);
  bí mật kẹt ⇒ **HUỶ trước khi lật con trỏ**. CLI nói rõ cái gì sang/ở lại/hỏng.
- **`cloudguard.ts` + check `storage-safety`**: đọc `roots` DriveFS THẬT (schema đo trên máy, bắt
  được kênh Computers-backup — thứ regex tên đường dẫn mù) + OneDrive env + marker + hardlink.
  Bằng chứng thẩm quyền ≠ DẤU VẾT cũ (bản đầu báo oan trên chính kho thật — rác `.tmp.driveupload`).
- **`memory sync --prune-host <host>`**: dọn series máy đã bỏ (ca `SS01-IT-10` 9 file ~338MB, lặp
  mỗi lần đổi máy). Dry-run mặc định; chỉ xoá khi ① mọi bundle đã merge ② series máy này phủ đủ.
- **Ngưỡng context ra config** (`contextWarnPercent`, kẹp [50,99], mặc định vẫn 95) + `/set-context-warn`.
- **Scope áp LÚC NẠP** (plan 08 §4 điểm ③): `scan`+`scanOneFile`+`scanWeb` cùng bộ lọc; lane bị loại
  báo `skippedLanes`, không ghi `ingest_state` (bỏ lọc là nạp lại đủ); scanWeb chặn TRƯỚC khi mở browser.
- **MCP mirror graph**: `graph_impact`+`graph_neighbors` (mcp.ts từng 0 match `graph`); mơ hồ trả
  candidates, không đoán. **eid**: `graph export` nay đóng dấu (trước CHỈ payload UI có) — lộ trùng id
  **2.865 cạnh/1.288 id** (1 id gánh 157 cạnh `calls`) → băm cả symbol ⇒ 2.868/2.868 duy nhất, id
  `imports` GIỮ NGUYÊN; thêm **`graph edge <eid>…`** = phía tiêu thụ + cited-edge validity.
- **`zemory todo verify`** (gate chống TODO thối, user chốt hình dạng): 4 trục — ref chết · "nghi đã
  xong" (phủ định CÙNG CÂU) · đo lại "0 match" · **git blame dòng sổ vs git log file** (trục duy nhất
  bắt được ca write-gate: sổ nêu tên hàm CŨ, vá landing tên MỚI). Nhiễu 8 phát hiện→1/58. Exit 1 khi lệch.
- **`util/safe-path.ts`**: gộp BẤT BIẾN guard thoát-thư-mục (resolveDocPath ↔ readDoc giữ resolve riêng).
- **`touches` khớp lại lúc đọc**: digest ghi đường BỐ CỤC CŨ (`src/` trước 08/07) ⇒ giao với graph = 0;
  thêm tầng khớp-đuôi nhãn `moved` (điều 13) → 0→5 node. *(Hợp nhất 2 đường: đã xong từ trước — sổ sai.)*
- **Luật BA NGUỒN lan 4 bộ mẫu** (app·nonapp·adapt·cowork; 4 bộ CHƯA HỀ có luật SOÁT SỔ, session-close
  mang bản phân-nhánh cũ): 02_RULES + session-close ×4, nguồn ①③ nắn theo profile, manifest cowork 68→80.
- **Tách `app.js` 1.837 dòng/1 IIFE → 11 file** global-scope (core nạp đầu · boot cuối). Ba bẫy de-IIFE
  đã xử: `renderHarness()` gọi-lúc-nạp tới hàm dòng 1509 (hoisting che) → dời boot · `var scroll` đè
  `window.scroll` → `scrollEl` · thứ tự nạp khai ở app.html. 7 test re-neo qua `readAppJs()` (có guard
  drift). Smoke daemon tạm: 11×200, app.js cũ 404. Hoãn Codex/Gemini (user); clone giữ làm lối cài.
**Cổng:** typecheck · eslint 0 (src+test) · **296/296** test/32 file · đột biến đỏ 3/3 khu · embed 20884 sống.

## [2026-08-06b] — Luật SOÁT SỔ dời về §Hành xử (áp MỌI LÚC) · lan ra 5 bản skill · manifest Cowork

**User hỏi đúng chỗ luật vừa viết còn hở:** *"nó áp luôn cho giữa chừng luôn ko, ko cần chốt phiên?"*
— Tôi đặt luật trong `§Chốt phiên`, mà sự cố xảy ra **GIỮA PHIÊN** (user bảo "check todo" ngay sau
khi vừa xong một việc). Đặt vậy là **luật tự loại mình khỏi đúng tình huống sinh ra nó**.
- **Dời về `§Hành xử`** — nhà của luật LUÔN-ÁP, ngay dưới *"CHƯA XÁC MINH THÌ CHƯA PHẢI SỰ THẬT"*
  (sổ TODO chỉ là một dạng khẳng định, không có đặc quyền hơn một con số). `§Chốt phiên` giữ **1 dòng
  dẫn chiếu** — một luật một nhà, không chép hai bản rồi lệch nhau.
- **Ghi rõ trigger giữa chừng:** *"check todo" · "còn gì chưa làm" · "liệt kê ra" · "soát lại" ·
  "plan/change tới đâu"*. Kèm câu tự nhắc: **phần lớn ca hỏng là giữa phiên, ngay sau khi vừa xong một
  việc — đúng lúc dễ tưởng mình đang nhớ rõ nhất.**
- **Lỗ thứ hai, user hỏi mới lộ:** lúc chốt phiên agent đọc **skill** chứ không đọc `02_RULES`; skill
  `session-close` Bước 0 chỉ nói về mục sắp GHI VÀO docs, không nói về mục ĐANG NẰM trong TODO ⇒ luật
  mới sẽ trượt ở đúng bước cần nó. Đã thêm **Bước 0.3** vào **5/5 bản** (zemory + app · nonapp · adapt
  · cowork), mỗi bản dùng đúng phương tiện của nó (bản cowork không chắc có CLI ⇒ "tra `archive/`").
- **Gate bắt được đúng thứ nó sinh ra để bắt:** `bootstrap-manifest` đỏ vì bảng kê số dòng của bộ
  Cowork nói 57 mà file thành 59 — `check_install.py` bên máy sếp so theo số đó, lệch là mọi lần cài
  báo hỏng. Sửa manifest → **44/44 xanh**.

## [2026-08-06] — LUẬT CỨNG: soát TODO = ĐO LẠI · HP điều 14 · dọn 339,7 MB bundle máy cũ

**Lỗi hệ thống, không phải sơ suất lẻ — user chốt sau khi nó TÁI DIỄN SUỐT MỘT THÁNG.** Agent soát
`05_TODO` bằng cách ĐỌC file rồi báo lại, nên việc đã xong vẫn nằm đó và user bị hỏi lại lần hai
(*"cứ hỏi mấy cái cũ xì xa lắc quài"*). Luật `§Chốt phiên` **đã cấm từ trước** và vẫn hỏng ⇒ thêm
chữ là vô nghĩa, phải kèm cơ chế.
- **Luật mới `02_RULES §Chốt phiên`:** mỗi mục TODO là một **KHẲNG ĐỊNH VỀ TRẠNG THÁI**, mà khẳng
  định phải truy được về nguồn kiểm được. **File `.md` là nguồn của NỘI DUNG, không phải nguồn của
  SỰ THẬT HỆ THỐNG** — đọc TODO rồi báo lại y nguyên = báo cáo chưa xác minh. Ràng buộc: kiểm được
  bằng code ⇒ **phải grep/chạy/đếm** · là quyết định ⇒ **phải `memory search --all`** (quyết định
  hay nằm ở phiên khác, thậm chí **repo khác**) · mục **quá 7 ngày** không ai đụng = **NGHI NGỜ**.
  Và: **hỏi lại user một việc đã chốt là LỖI, không phải cẩn thận.**
- **Gate máy canh** vào TODO (dấu đã-đo-lần-cuối + `validate` cảnh báo + `todo verify`) — cùng
  doctrine `structure-sync`: *thứ chặn drift là code, không phải rule dễ quên.*
- **Số nền:** soát tay 58 mục ⇒ **11 sai (~19%)** — có mục đã build vẫn mang `[ ]`, có mục agent tự
  bịa vì thấy triệu chứng rồi phán nguyên nhân (compact bundle: code + test đã có từ lâu).

**HP điều 14 (user chốt):** bí mật sống TRONG cây repo — *"ngoài git" ≠ "ngoài repo"*; cấm ba cửa
**git · mọi nguồn online/đám mây (kể cả kênh BACKUP MÁY của trình đồng bộ) · đẩy sang VM**. Ngoại lệ
duy nhất `~/.zemory/location.json`. Nguồn: user chốt bên SasinFlow (HP điều 3) rồi chốt lại cho
zemory cùng ngày. *(Điều 7 chỉ nói local-only/không transmit — không nói bí mật sống Ở ĐÂU.)*

**Đóng thêm 2 mục treo lâu:** skill chung/riêng — **cấu trúc hiện tại CHÍNH LÀ câu trả lời** (giữ
`04_SKILLS` làm kho duy nhất, playbook ở `.claude/skills/`, vendor ở `external/skills/`) · 5 mục
"việc của user" (nhập chìa máy 2 · đăng nhập chatgpt-web · tài khoản Cowork · xác nhận xoá Computers
backup · nhận dạng `PowerBi_SasinFlow`) — **xoá hẳn**, đã xong từ lâu.

**Dọn Drive: 11 file/631 MB → 2 file/291,3 MB** (−339,7 MB). Xoá 9 bundle của `SS01-IT-10`, giữ
**bản chính** `SS01-IT-12.000000` (289,7 MB) + delta đang chạy. Verify TRƯỚC khi xoá, ba đường độc
lập: kho local có **898 phiên · 34.566 tin** của máy cũ (18/02/2025→03/08/2026) · `sync_state`
`drive:SS01-IT-10 → last_message_id 2.180.661` (đã merge tới bundle cuối) · `memory scope ls` xác
nhận **0 lane bị loại trừ** ⇒ baseline mới là TẬP CHA (289,7 > 264,5 MB). Danh sách file đã xoá lưu
ở `data/rescue/drive-deleted-20260806.txt`.
