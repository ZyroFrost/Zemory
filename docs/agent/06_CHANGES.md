<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-24d] — chốt phiên: user gạch 6 mục cuối · sổ 1.658 dòng → 101 · kế hoạch 2.4.0

**User gạch nốt 6 mục** (mỗi mục lý do ghi trong archive): Cowork cắt-quá-tay (*"đã giải quyết
rồi"*) · đường tải Cowork (*"chạy nhiều máy bình thường"*) · F2 RAG data chính (*"repo khác,
không liên quan"*) · Graph Phase D + seam `resolved` (graph đã hấp thụ đủ CALM 21/07 + Graphify
21/08; hai đuôi điều-kiện chưa bao giờ kích hoạt, spec vẫn ở `plan/13`) · reranker đa ngữ (trần
15/108 câu, giá 43–59 s). **Gật:** cổng "bundle đã rời khỏi máy" — làm phiên sau.

**Sổ sau hai ngày dọn: 1.658 dòng · 89 mục (23/08) → 101 dòng · 7 mục (24/08).** 20 section lịch
sử không còn mục mở dời archive NGUYÊN VĂN; khối BÀN GIAO 24/08 mới thay khối cũ. 7 mục còn lại:
bàn-giao-4-bước · menu recall (cổng "không biết") · áp-chuẩn-8-repo · cổng bundle (đã gật) ·
biển cấm separator · model-routing (ý user, giữ nguyên trạng thái) · cặp #12+#13 (2.5).

**Kế hoạch phiên sau (user chốt *"giữ quyết định này sang session sau bắt đầu chạy toàn bộ"*):**
① push **2.4.0** → ② áp chuẩn 8 repo MỘT LẦN → ③ cổng bundle-rời-máy → ④ #13 ingest curated
rồi #12 memory promotion. Gate lượt cuối trước chốt: **777/777 · 0 fail · 0 skipped** ·
`conform` ✓ · `validate` 0 vượt trần · daemon `--no-window` pid 22572, 4 công tắc BẬT.

## [2026-08-24c] — trả nốt 4 việc user gật + tổng dọn sổ: 89 mục → 13

**① Guard nhánh XOÁ quét theo SEGMENT** (user gật 21/08, nằm quên 3 ngày). `rm build.log && echo
"check prod.env"` từng bị CHẶN OAN — quét cả dòng thì người ta thôi viết lệnh tự-kiểm. Nay cùng
khuôn nhánh git; hành vi thật 6/6 (oan QUA · xoá secret thật vẫn CHẶN); ca ÂM mới trong
`guard-delete` (9/9), **đột biến bỏ lọc segment ⇒ đỏ**; ship cowork chép lại + manifest 343→350.
⚠ Trả giá dọc đường: bản sinh đầu **VỠ SYNTAX** (escape trong template literal — `\n` thiếu một
lớp) ⇒ guard chặn TẤT; lộ ngay vì `rm build.log` cũng CHẶN. Escape qua công cụ trung gian: lần n+2.

**② `policy.json` ship cowork có cổng NỘI DUNG** (user gật 21/08): so `secret_names`/`secret_allow`
với bộ sinh (export `SECRET_DEFAULTS`), KHÔNG so cả file — cowork khác `protected_write` có chủ
đích. 8/8 · **đột biến bỏ `*.env` ⇒ đỏ** · có ca tự kiểm bộ-mẫu-khác-rỗng.

**③ Cổng quét LỊCH SỬ git** — nợ cuối của `plan/18` (⑦). HEAD sạch không cứu được thứ ĐÃ PUSH
(chìa lộ 04/08 đúng kiểu đó). Hai phép trên toàn lịch sử (6.099 object, ~120 ms): tên khớp mẫu
secret phải nằm trong ALLOWLIST tường minh (1 vết đã biết: `share/share.key`, chìa đã xoay) ·
blob >50 MB ⇒ đỏ. Tự kiểm >1000 object; **đột biến bỏ allowlist ⇒ đỏ** (vết cũ tự làm chứng).

**④ `/memory-status` lạnh — CHỨNG MINH XONG, không cần reboot**: đuổi kho khỏi page cache bằng
cách đọc ~9 GB file khác, đo lượt lạnh THẬT **17,66 s** mà `/ping` song song **0,024–0,114 s**
(trước vá: ping bị chặn 13,5 s). Event loop không còn bị bảng số khoá.

**⑤ Tổng dọn sổ theo lệnh user** (*"làm rồi đóng hết, cũ/đổi hướng thì bỏ"*): 24 mục đóng thêm —
5 bẫy báo oan CHÉP VÀO skill `audit` mặt ⑪ rồi đóng (thêm 2 vế thiếu: miễn backtick cho mojibake ·
miễn `write-docx/reference`) · 4 việc trên · 15 mục cũ/trùng/tầm-nhìn-không-ai-cần (mỗi mục ghi lý
do trong archive). **Sổ: 89 mục (23/08) → 13 mục · 1.658 → 462 dòng**; 13 mục còn lại đều có chủ:
2 menu recall · áp-chuẩn-8-repo · 4 chờ user/điều kiện · 2 `[~]` chờ ngoài · biển cấm · 3 ý user.

## [2026-08-24b] — thi hành 12 quyết định của user: đóng 11 mục · ô "cách nói khác" · `--no-window` · graph thấy import động

**User gạch 12 câu treo trong một lượt** — mỗi câu là một mục sổ đã đóng/cập nhật:
① **áp chuẩn 8 repo: MỘT LẦN, SAU khi repo này xong + 2.4 đã push** (rồi tự nhận qua chấm than
`[2026-08-23f]`; gộp mục "báo repo sinh lại guard") · ③ **kho `bgem3.db` GIỮ làm backup, không
xài/không embed** — đo: mtime đứng 22/08, 0 code trỏ tới = file chết; luật bản-lùi thành moot ·
④⑥ **ba luật ĐO vào `02_RULES §Hành xử`** (riêng repo này): probe sao chép tham số thước ·
N-thử-cùng-hướng ⇒ nghi thước · số đo khớp thời-gian-công-việc · ⑦ guard 650ms giữ nguyên, đuôi
v1.2.0 chết ⇒ đóng · ⑧ `/session-raw` bỏ · ⑨ 9 entry SasinFlow đóng (FILE WINS) · ⑪ không gộp
hiến pháp (70 trích dẫn) · ⑫ graph (a) — **đã có đủ từ trước** (validate link gãy · conform
dangling-ref · fitness orphan) ⇒ không build gì.

**⑤ Ô "cách nói khác" trên màn Recall — LÀM, kèm hướng dẫn tại chỗ (điều kiện user đặt).**
Chỉ hiện khi chip **Tìm sâu** bật (`also` đi đường sâu — lộ thường trực thì lượt tìm thường bỗng
chậm 20s không hiểu vì sao); placeholder là VÍ DỤ cụ thể; title nói thẳng số đo hai chiều
(`@10` 50→71% nếu cụ thể · MRR 0,407→0,189 nếu mơ hồ — tệ hơn không gõ). i18n đủ 2 dict.
Nghiệm thu sống: `/memory-search?deep=1&also=…` trả 12 hit, có hit trúng `cli-write.lock`.

**⑩ `zemory ui --no-window`** — dựng daemon + serve, KHÔNG tự bật cửa sổ. Chỉ tắt 3 lượt mở
TỰ ĐỘNG; nút Open trên tray giữ nguyên (đó là người bấm). Nghiệm thu: daemon sống, **0 cửa sổ**.
Sự cố gốc: 3 cửa sổ rỗng đêm 06/08 + mỗi lần agent restart daemon là một cửa sổ nhảy vào mặt user.

**Audit lại đợt build (user dặn) — bắt 1 ĐỎ thật:** `isolated_pct` **31,1%/trần 30%**. Hai gốc,
sửa KHÔNG nới trần: ① `JS_IMPORT_RE` mù import ĐỘNG (`await import()` ⇒ orphan GIẢ — thêm nhánh
`import\s*\(`, +10 cạnh) · ② 2 test tự chế mkdtemp+rmSync → dùng `tempDir` chung. **31,1% → 29,5%**.
doctor/validate/cloudguard sạch với `version.json` trên Drive (ngoài repo).

Sổ sau lượt: **50 mục mở · 747 dòng** (đầu phiên 23/08: 89 mục · 1.658 dòng).

## [2026-08-24] — đóng ca "717 cửa sổ phụ" · trigram nhận lại tool_result (v22) · dọn 40% sổ

**① Ca "717 cửa sổ phụ" — mục THỐI.** Git nói: audit 12/08 tối đo thiếu 717; `73420e4` (13/08)
thêm `vector_ship_chunk` ⇒ vá NGAY HÔM SAU, không ai đóng mục — nằm 11 ngày. Gốc là một trong bốn
lần đi sai `plan/08 §8.0`: *"bỏ 7.381 cửa sổ phụ vì chỉ 2,6%"* — agent tự thêm ràng buộc user không đặt.

**Đường này CHƯA có cổng nào canh** (đo: 0 file test nhắc `vector_ship_chunk`) — một đường đã hỏng
im lặng một lần, được vá, rồi bỏ đó. Nay có `vecship-chunks` (2 ca, **vòng khép kín thật**: nhúng →
`shipVectorsInto` → `receiveVectorsFrom` → đếm `vec_map` hai đầu), kèm ca fail-open cho bundle đời
cũ. **Đột biến** (trả `maps=[]` về hành vi 12/08) ⇒ **đỏ**. Đây cũng là một lượt **diễn tập phục
hồi** — nợ nặng nhất của `plan/18` mặt ⑨, lần cuối 12/08.

⚠ **Tự nhận — lượt đầu XANH GIẢ:** `skipIfBusy(t)` thiếu `await` ⇒ mọi ca thoát ngay (26 ms
"pass"). Lộ vì 26 ms không thể nhúng ONNX (chạy tay 20,4 s); sửa xong ca thật 17–20 s. Lần thứ
hai trong hai ngày — cả hai đều bắt bằng đối chiếu thời-gian-chạy với công việc phải tốn.

**Kèm: `plan/08 §8b` nói NGƯỢC code** (*"cửa sổ phụ KHÔNG chở"* — sai từ 13/08) — đã gắn dấu
bãi bỏ, ghi số thật: **4.459 tin dài · 8.906 cửa sổ phụ**.

**② Trigram nhận lại `tool_result` (migration v22, đảo v17).** Số + lý do ở `[2026-08-23e]` phần
migration; áp lên kho thật: `schema v22` · **2.042 → 2.313 MB** · mẫu 20 tin `tool_result` thì
**20/20** tìm được bằng trigram (trước: 0). Ba cổng cũ canh hành vi v17 đỏ đúng lúc ⇒ nắn neo theo
bản viết lại, **giữ nguyên bất biến UPDATE**; `fts-trigram-scope` 12/12.

**③ Dọn sổ + chẩn đoán:** `archive` chỉ nhặt MỤC, mà **72% file (1.003/1.386 dòng) KHÔNG phải
mục** — bàn giao cũ, báo cáo audit. Dời **22 section 0-mục-mở** (560 dòng) sang `archive/` nguyên
văn (giữ bàn giao hiện hành + `NGUỒN ĐỒNG BỘ GM`). Kết quả **1.658 → 822 dòng · 89 → 61 mục**,
**0 mục mở bị nuốt** (đếm trước/sau).

## [2026-08-23f] — chấm than update CẤP MÁY: tem phiên bản trên kênh chung + `zemory selfupdate`

**Lỗ:** `syncCheck` (21/08) so repo với bản zemory **đang cài trên MÁY NÀY** — nên máy A pull+build
thì repo trên máy A được chip vàng nhắc, còn **máy B mù hoàn toàn**. Đo: grep
`github|ls-remote|git fetch|releases/latest` trong `backend/src/` ⇒ **0 hit**, chưa từng có ai đo vế
"máy này cũ hơn máy khác". Đúng triệu chứng sổ đã ghi: *"Repo CÙNG máy làm được NGAY; máy kia chờ push."*

**Đi qua DRIVE, không hỏi GitHub** (user chốt): kênh chung đã được hiến pháp phê (điều 16) và **mọi
máy đã poll nó 30′/lần** qua autosync ⇒ **0 lớp mạng mới, 0 đồng hồ mới** (điều 1). Hỏi GitHub thì
đụng điều 7 (local-only) + thêm phụ thuộc mạng/rate-limit để đổi lấy đúng một con số.
`<Drive>/version.json` chỉ chứa SỐ HIỆU, không dữ liệu người dùng ⇒ không mã hoá.

**Bất biến khoá bằng cổng: TEM CHỈ ĐI LÊN.** Máy còn chạy bản cũ mà ghi đè tem sẽ **kéo lùi cảnh báo
của mọi máy khác**, và bệnh đó im lặng (ai cũng thấy "đã mới nhất") — cùng doctrine ADDITIVE điều 11.

**Nối vào ĐÚNG 4 bề mặt đã có** (`syncCheck.appUpdate`): `sync --check` · hook nhắc 1 lần/phiên
(nói TRƯỚC lời nhắc harness — áp chuẩn bằng bản cũ là chép lại cái cũ) · `/harness-updates` ·
chip vàng ở rail (i18n đủ 2 dict).

**`zemory selfupdate`** — một lệnh thay bốn, hai chốt: ① **cây bẩn ⇒ DỪNG** + liệt kê file ·
② `git pull --ff-only` (nhánh rẽ thì dừng). **KHÔNG tự chạy** (user chốt) — tự pull vào cây
người khác đụng `§Phạm vi project`.

**Gộp nguồn trùng nhân tiện:** `appVersion()` ở `core/config.ts` thay 2 chỗ đọc rời
`package.json` (`cli.ts` cố ý giữ bản riêng — lối tắt hook chạy trước mọi import tĩnh).

**Nghiệm thu:** `channel-version` **6/6** (ca ÂM · fail-open · bẫy so-chuỗi 2.10-vs-2.9);
**đột biến bỏ chỉ-đi-lên ⇒ ĐỎ**. Chạy thật: tem lên kênh (`{2.3.0, SS01-IT-12}`), `sync --check`
im đúng; `/harness-updates` trả `appUpdate` + 8 repo cũ; `selfupdate` cây bẩn/cờ lạ đều exit 1.

## [2026-08-23e] — vá 2 lệnh HEAVY-WRITE nuốt cờ lạ · `doctor` thôi chấm ✓ cho backup quá hạn

**① `memory embed|scan|digest` nhận cờ lạ rồi CHẠY THẬT.** Đã dính hai lần 22/08: `memory embed
--help` khởi động job nhúng (giữ `cli-write.lock` hàng giờ, bỏ đói backup) · `memory scan --help`
quét + nạp thật. Cùng bề mặt còn có `--rebuild` (XOÁ nguyên chỉ mục véc-tơ) ⇒ không có đường
"xem thử" an toàn nào. **Vá:** bảng cờ hợp lệ cho ba lệnh, cờ lạ ⇒ usage + `exit 1`. Chốt đặt
**TRƯỚC write-gate** có chủ đích — từ chối phải xảy ra khi chưa ghi byte nào và **chưa giữ khoá**.
Nghiệm thu thật: `embed --help` · `scan --help` nay in usage, `exit 1`, **không để lại lock**.

**② `doctor` chấm ✓ khi backup đã 27,9 giờ tuổi** — ngưỡng đỏ là 2× chu kỳ nên trọn một ngày không
backup vẫn hiện ✓, đúng kiểu "bề mặt nói dối". Nay **ba mức**: ✓ trong chu kỳ · ○ quá 1 chu kỳ
(thấy được, KHÔNG đỏ — gate đỏ triền miên là gate bị bỏ qua) · ✗ quá 2. Thêm dòng riêng cho ca
**daemon TẮT**: lúc đó backup không "chậm", nó **không tồn tại** (đồng hồ `backupTick` nằm trong
daemon). Đã kiểm CẢ HAI nhánh bằng bề mặt thật.

**Cổng:** `heavy-write-flags` 4/4 · `backup-staleness` 6/6; **đột biến ⇒ 3 đỏ**. ⚠ Lượt đột biến
đầu bắt được ca CLI của tôi **XANH GIẢ** (kho `.db` rỗng làm lệnh chết vì lý do khác, không phải vì
cờ bị từ chối) — đã sửa phép đo: nay dựng kho thật trước và đòi thấy đúng chuỗi `unknown flag`.

**Kèm `plan/19 §8` nắn về khớp changelog:** bảng trạng thái còn ghi ③ *"đang dở"* · ④ *"chờ user
KÝ"* trong khi `[2026-08-23b]` đã chốt **TRƯỢT cổng ⇒ KHÔNG TRÁO**. Nay ②③ ✅ · ④ 🔴 đóng · ⑤ ⛔
không còn; thêm §8b chốt phán quyết, §5 gắn dấu không-thi-hành.

## [2026-08-23d] — GỘP luật sổ việc về MỘT nhà: `05_TODO` có cửa VÀO, không chỉ cửa ra

**Bệnh: bộ harness có cửa RA mà không có cửa VÀO.** Đo được **sáu** chỗ ra lệnh cho agent ghi vào
sổ, không chỗ nào đặt ngưỡng, không chỗ nào bắt hỏi: `01_CONSTITUTION` header + §Sửa đổi (*"ghi đề
xuất vào `05_TODO` chờ duyệt"*) · `02_RULES` §Chốt phiên (*"kể cả chẩn đoán sai / đường cụt"* +
*"luật riêng → ĐỀ XUẤT `05_TODO`"*) · §Plan (*"KHÔNG todo → `05_TODO`"*) · skill `audit`
(*"nghi vấn đã loại cũng ghi"*) · `session-close` (*"việc phát sinh"* + *"luật phát sinh → ĐỀ
XUẤT"*) · `conform` (*"ghi việc vào `05_TODO`"*). Đối lại chỉ có **một** luật chiều ra
(*"XONG LÀ ĐÓNG NGAY"*) — mà nó chỉ đóng được mục ĐÃ XONG, còn mục "ĐỀ XUẤT" thì **không bao giờ
xong được**: chúng không phải việc chưa làm, chúng là câu hỏi chưa ai trả lời.

**Số đo:** 89 mục mở · 1.658 dòng · 104 file test · **18 mục "ĐỀ XUẤT" treo** — sổ nạp MỌI phiên ⇒ chi phí ngữ cảnh thường trực (điều 1).

**Cách sửa — SỬA LÊN CÁI CŨ, KHÔNG ĐẺ MỚI** (user chốt: *"cứ đẻ mới luật sẽ đọc sót"* ·
*"gộp lại những cái nào liên quan tới nhau, ko ghi ở trước 1 luật rồi phía sau lại đá chính luật
đó, làm phí token đọc và loãng context"*). Mở rộng **chính** bullet *"XONG LÀ ĐÓNG NGAY"* sẵn có
thành **§Sổ việc `05_TODO`** — một luật phủ cả hai đầu vòng đời: **① cửa vào** (không tự thêm mục ·
ngưỡng *thực sự quan trọng* · cấm tự đẻ cổng/bộ đếm/bộ đo/advisory · ba câu ①gỡ-②gộp-③không-có-thì-
hỏng-gì) và **② cửa ra** (nguyên văn cũ, không đổi một chữ).

> 🔄 **BÃI BỎ vế *"agent ghi ĐỀ XUẤT vào `05_TODO` chờ user duyệt"*** ở cả 6 chỗ trên. Nay:
> **hỏi trong phiên, user gật mới ghi** — không gật thì không tồn tại dòng nào. Vế cũ chính là cỗ
> máy đẻ ra 18 mục treo: nó dạy agent *đậu* thay vì *hỏi*, mà đậu thì không có đường ra.

**Tự nhận — chính tôi vừa phạm đúng thứ này:** lượt đầu tôi ghi luật thành **một điều khoản hiến pháp mới, số 17**
(đẻ mới), đặt cạnh `§Sửa đổi hiến pháp` vốn ra lệnh ngược lại, cách nhau **8 dòng cùng một file**.
Đã **gỡ điều khoản đó**, hiến pháp về đúng **16 điều**; luật sống ở `02_RULES` vì đây là luật LÀM VIỆC
(hiến pháp là bất biến KIẾN TRÚC per-app) — và `02_RULES` là file **ship cho mọi repo**.
`zemory conform` bắt được tham chiếu chết tới điều khoản vừa gỡ tôi để lại trong chính entry này.
