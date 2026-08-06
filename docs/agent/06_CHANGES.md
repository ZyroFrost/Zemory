<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

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

## [2026-08-05e] — `archive` từng nói "dưới ngưỡng" cho một file VƯỢT ngưỡng — đã tách hai lý do

**Bug thật, và nó đã dẫn một cuộc điều tra đi sai đường.** `archiveChanges()` trả về **cùng một
shape** `{moved: 0}` cho **hai tình huống khác hẳn nhau**: ① file còn dưới ngưỡng (bình thường,
không có gì để làm) · ② file **ĐÃ vượt ngưỡng** nhưng không nhận ra heading nào (`DATED_HEAD =
/^## \[[^\]]+\]/` — heading sai khuôn, thiếu ngoặc vuông). Người gọi in **"nothing to do (under
threshold)"** cho cả hai ⇒ bên SasinFlow 05/08, file **947 dòng / ngưỡng 400** mà lệnh vẫn bảo
"dưới ngưỡng", nên agent bên đó đi tìm nhầm chỗ.

**Sửa:** thêm `skipped: "short" | "no-entries"` vào `ArchiveResult`, tách đúng hai nhánh trong
`archiveChanges`; `cmdArchive` nói thẳng khi rơi vào ca ②: *"= N lines (OVER threshold) but no dated
entry was recognised"* + chỉ ngay cách chữa (heading phải là `## [YYYY-MM-DD] — tiêu đề`).

*(Bản vá do một phiên agent khác làm trên repo này, user cho phép vì chỉ đụng phần THÔNG BÁO. Phiên
này kiểm lại và nhận về: đọc diff · xác minh tiền đề trên repo SasinFlow (nay 154 dòng/ngưỡng 400,
đã nắn xong) · **thêm test khoá** `archive tells OVER-threshold-but-unrecognised apart from
under-threshold` · **đột biến hoá**: ép nhánh `no-entries` trả `short` ⇒ test **ĐỎ 1**, khôi phục ⇒
**xanh 5/5**. Không có test thì bản vá này y hệt bản cũ dưới mắt gate.)*

**Bài học đúng họ với "fail-open giấu lỗi" của `[2026-08-05]`:** một hàm trả về *cùng một câu trả
lời* cho hai nguyên nhân khác nhau thì người gọi **không thể** nói đúng — và câu sai đó nghe hợp lý
nên không ai nghi. Chỗ cần soi tiếp: những `return { ok: false }` / `moved: 0` khác trong repo.

## [2026-08-05d] — DUYỆT MUỘN: ba lane web đã chạy thật từ 30–31/07 (user gật 05/08)

> Ba mục treo `[~]` "đã làm, chờ duyệt" trong `05_TODO` từ 30–31/07. Code đã chạy thật và đo thật
> lúc đó; nay user duyệt nên ghi sổ + dọn khỏi backlog. **Ngày làm** ghi trong từng mục.

**① `claude-web` — ba lỗi THẬT (30/07).** Chẩn đoán CŨ *"mất trắng chat trong Project vì thiếu
`projectConvsExpr`"* đã bị **chính phép đo bác bỏ**: danh sách phẳng của claude.ai đã chứa cả chat
trong Project (`projectIdsMissingFromLoose: []`) — khác ChatGPT. Tài khoản thật sự chỉ có 2 hội
thoại, nên "2 phiên · 6 tin" là số ĐÚNG. Ba lỗi thật đã sửa: **`o[0]` làm org** (account có 2 org,
máy này tình cờ đúng → nay chọn theo caps `chat`, không có thì báo lỗi rõ chứ không im lặng dùng org
rỗng) · **khoá resume hardcode `chatgpt-`** trong khi adapter ghi `claudeweb-<uuid>` ⇒ resume chết
lặng, **mỗi lần chạy kéo lại toàn bộ tài khoản** (nay `Platform.sessionPrefix`, test so parity với
id thật) · **`project_root` là uuid thô** (payload chi tiết có `project_uuid` nhưng `project: null`;
nay map uuid→tên + sidecar `_projects.json` dùng chung với ChatGPT — đo thật `019f68e1-…` →
`VU-Project`).

**② Hết hạn xác thực giữa lúc quét → HỎI + mở cửa sổ (30/07).** Trước: `need-login` là ngõ cụt, in
*"a browser window is open at …"* **kể cả khi không mở cửa sổ nào**, và hết hạn giữa run thì mọi hội
thoại còn lại đếm thành `failed` — log trông y như bị rate-limit. Nay `awaitLogin()` mở cửa sổ TRƯỚC
rồi mới hỏi; giữa run cứ 3 lần fail liên tiếp thì kiểm lại auth, mất phiên thì lưu phần đã kéo →
hỏi → đăng nhập xong **chạy tiếp tại chỗ**. Không TTY (daemon/pipe) ⇒ mở cửa sổ + `need-login` +
exit 1, **không treo** chờ câu trả lời không ai gõ được.

**③ UI: nút Quét kéo được web (30/07).** Gốc: cả hai nút POST `/memory-scan` → `scan()` = **chỉ đọc
đĩa**; UI **chưa bao giờ** có đường quét web, nên bản sửa CLI trước đó đúng mà nằm sai bề mặt. Theo
thiết kế user chốt (*gộp vào nút sẵn có + công tắc, nhớ qua phiên* — không đẻ nút mới):
`getScanWeb()` mặc định **TẮT** · `/memory-scan?web=1` · `/memory-scan-web?platform=` · `/set-scan-web`.
Server chạy **không tương tác** (giữ HTTP mở chờ người đăng nhập = treo daemon) nên nó chỉ MỞ cửa sổ
rồi trả `need-login`, chỗ HỎI nằm ở dialog UI. **Scheduler nền KHÔNG kéo web** (test khoá) — 10 phút
một lần tự mở trình duyệt là hành vi không ai xin. Đo bề mặt sống: `POST /memory-scan` trả
`web: [{chatgpt: need-login}, {claude: done · skipped 2}]`, cửa sổ đăng nhập mở thật (pid 7440).

**④ Lane `claude-cowork` (31/07).** Làm đúng thiết kế: **lane phụ của `PLATFORMS.claude`**
(`Platform.sub`) — chung cửa sổ, chung cổng 9223, chung phiên đăng nhập, KHÔNG đẻ `PLATFORMS` thứ
ba. Adapter `adapters/cowork.ts` (`source=claude-cowork`, `coworkweb-<cse_id>`). Đo thật: phiên
*Claude-swap setup* → **63 tin** vào bộ nhớ, nội dung/vai/thời gian đúng. **Bẫy đã trả giá:**
`resume_token` KHÔNG phải con trỏ trang — truyền lại là endpoint chuyển sang **long-poll không bao
giờ trả về** (lần đầu treo 25 phút, CPU chỉ 10 giây, không lỗi không log) ⇒ nay gọi MỘT lần. Kèm sửa
lớp dưới: `Cdp.evaluate` **có hạn giờ 90s** rồi ném — trước đó một expr treo là treo cả tiến trình,
lỗi này mọi nền đều dính. Tiêu đề phải dập từ DANH SÁCH (`GET /…/<id>` không trả `title`).

**Còn lại của lane web, chuyển sang việc của USER (không phải nợ code):** phiên `chatgpt-web` trên
máy này đã hết hạn ⇒ lane 30.913 tin đứng cho tới khi user đăng nhập lại một lần trong cửa sổ đó
(claude.ai không cần — cookie profile còn sống). Và quyết định **KHÔNG lấy cookie từ trình duyệt
chính** giữ nguyên (App-Bound Encryption + guard; vượt được chỉ bằng cách tiêm vào tiến trình kiểu
malware, phá điều 7) — cookie đã tự dùng lại trong profile riêng `data/browser/<nền>`.

## [2026-08-05c] — PUSH release **1.1.0** (user chốt số) · luật mới "push = lên version" · gỡ model 294 MB khỏi lịch sử chưa push

**Luật mới `02_RULES §Git` (user chốt):** mỗi push = một lần lên version, SỐ do user chốt (hỏi
trước khi đẩy); trước push phải kiểm file sạch + rà `05_TODO`. Đợt này user chọn **1.1.0**.

**Hai chướng ngại thật trên đường push, đều là di sản máy cũ:**
- `~/.gitconfig` ghim credential github.com vào `gh.exe` **không tồn tại** (kèm dòng rỗng loại luôn
  GCM) ⇒ mọi push chết từ vòng xác thực. Gỡ 2 entry chết → GCM tự lo.
- Commit chốt phiên 04/08 mang theo **model weight q8 294,6 MB** (`attic/zemory-lab/models/…`) —
  vi phạm HP điều 2, GitHub chặn cứng (>100 MB). Xử: `filter-branch` gỡ `attic/zemory-lab` khỏi
  **2 commit CHƯA push** (hợp luật — chỉ cấm rewrite lịch sử đã push), tag an toàn
  `pre-lfs-fix-20260805` giữ bản cũ, `.gitignore` chặn `attic/zemory-lab/` vĩnh viễn. Tác dụng
  phụ đã kiểm: reset cuối của filter-branch rút 5 file tracked khỏi đĩa — **toàn bộ là bản sao
  của `data\models`** (đối chiếu True), không mất gì; `lab.db` cũ 1,18 GB (untracked) còn nguyên.

**Kết quả:** `77582dc..e423a8f main → main`, remote khớp HEAD. Gate trước push: typecheck · lint
· 0 file data/secret trong diff · TODO 0 mục `[x]` sót.

## [2026-08-05b] — Nối lại 8 repo sau đổi máy · secret về folder repo · gợi ý HP vào template · audit 6 mặt

**Nối lại app sau đổi máy.** Sổ đăng ký chỉ còn 2 project ⇒ đăng ký + ghim lại **8/8 repo** có
`.harness.json` trên máy (dò cả ổ, không đoán). Lịch sử phiên kẹt ở đường máy cũ ⇒ gộp qua
`/merge-project` (giữ `cwd`, ghim `project_pinned`): Zemory 42 · SasinFlow 32 · PBI_Maintain 13 ·
còn lại 9 phiên. Bản đảo ngược: `zemory-lab/premerge-undo*.json`. *(Lưới "ĐÃ LIÊN KẾT" lấy GIAO
"có phiên máy này ∩ khớp sổ" chứ không đọc sổ làm nguồn — `Harness AI` 0 phiên nên không hiện,
user chốt kệ.)*

**Secret dời về folder repo, ổ C chỉ còn `location.json`** (con trỏ, không chứa bí mật). Registry
→ `<data>/projects.json` (`projects.ts`, có đường lùi đọc bản cũ); dọn `~/.zemory`: xoá bản model
trùng **282,7 MB** (rác của bug cache rerank), vật chứng cứu 29/07 dời vào `data\rescue`. Ràng
buộc thật không đổi: **cấm git · cấm nguồn online · cấm đẩy VM** (`.gitignore` + gate canh, đã
kiểm `git ls-files` 0 lọt). `plan/16 §2` supersede câu "không phải trong repo".

**Luật secret KHÔNG vào `02_RULES`** (user chốt lại) — thành **§Điều khoản GỢI Ý** trong template
`01_CONSTITUTION` (app=nonapp=adapt, parity 52/52): 8 điều rút từ hiến pháp SasinFlow đã trả giá
thật (secret "ngoài git ≠ ngoài repo" · một bề mặt+bộ lọc · đọc version đang chạy · docs khớp code
· từ điển định danh · UI không tên kỹ thuật · bố cục bất biến · làm liền đừng backlog). User sẽ
gọi các repo áp chuẩn lại.

**Audit 6 mặt (đủ, theo skill):** quick_check ok · digest 1284/1284 · 0 mồ côi (sau khi xoá 3
att-link) · 8/8 endpoint 200 · đột biến test dtype ĐỎ được · **B1**: daemon code cũ tự đẻ lại
registry ở ổ C ⇒ HAI sổ song song, UI hiện 1 project — đóng cửa sổ KHÔNG giết daemon nền, phải
kill (đã) + mở lại · **A1**: 55 dòng `doc` đường cũ của 6 repo khác → nắn về đường mới · đã loại:
238 session đường cũ (lịch sử project đời trước, giữ đúng điều 11) · `/memory-status` 14,7s (nguội;
ấm 69ms). Còn treo: `PowerBi_SasinFlow` (6 phiên, tên khác 2 repo PBI) chờ user nhận dạng.

## [2026-08-05] — Máy mới chạy MỘT CHÂN suốt 2 ngày: lớp vector chết lặng · nén sâu là ngõ cụt · dựng lại 768+fp32

**Lớp vector CHẾT không dấu hiệu.** `memory search` vẫn in *"hybrid · rerank"* nhưng `bench` nói
**"embed model unavailable"** — fail-open về FTS từ lúc dựng máy. Gốc: `onnxruntime_binding.node`
*DLL initialization failed* vì máy chỉ có VC++ **14.24**, onnxruntime 1.24 cần bản VS2022. Cài
redist **14.51** → hybrid **100% (8/8)** vs FTS 0%. Bài học: **fail-open đúng thiết kế chính là
lớp giấu lỗi giỏi nhất** — dòng chữ trên màn hình không phải bằng chứng.

**Nén sâu THUA trên CPU** (5 dtype, cùng 48 chunk thật, mỗi dtype một tiến trình — s/chunk):
**fp32 1,61** · fp16 1,66 · q8 3,09 · q4f16 5,23 · q4 5,45. fp32 dùng 7,5 nhân, q4 chỉ 3,5 (4-bit
giải nén trọng số trước mỗi phép nhân). `q8` trả giá KÉP (chậm ~2× và kém chính xác) đổi lấy đĩa
— tài nguyên rẻ nhất (295 MB vs 1.178 MB). RAM đỉnh 2,1–3,5 GB.

**Dựng lại chỉ mục — đo corpus thật:** 146.679 tin → **123.086 chunk duy nhất** (dedup 19%).
fp32 1,26 s/chunk ⇒ **43 giờ** (q8 là 80). **512 và 768 tốn thời gian NHƯ NHAU** — model luôn tính
đủ 768 rồi mới cắt ⇒ chọn thẳng 768. Chạy trên **bản sao** `zemory-lab/lab.db`; tráo chỉ khi
`bench --recall` thắng mốc 41%@10 (điều 12).

**`vec_config` thêm `dtype`** — stored-dtype-authoritative ở CẢ HAI phía nạp + truy vấn; mặc định
`q8`→`fp32`; chỉ mục cũ không có cột đọc là `q8` ⇒ kho 256d hiện tại không bị trộn.

**Hai lỗi chỉ lộ khi cài cho NGƯỜI KHÁC:** ① lối tắt Desktop/Start Menu chưa bao giờ tạo được trên
máy Desktop-chuyển-hướng-OneDrive (`desktopDir()` ghim `<home>\Desktop`; hỏng Desktop kéo mất luôn
Start Menu; lỗi bị `stdio:"ignore"` nuốt) — nay đọc registry, hai lối tắt độc lập; ② cache model
rerank ghim `~/.zemory/models` trong khi embed theo thư mục relocate ⇒ tải trùng trọng số — test cũ
khoá ĐƯỜNG DẪN thay vì bất biến "chung cache", đã sửa cả hai.

**`npm install` sạch chạy lại — trị gốc:** `@nativewindow/webview` đòi `peer typescript@^6.0.2`;
TS **6.0.x nằm trong vùng eslint cho phép** (`<6.1.0`) ⇒ nâng 5.9.3→6.0.3, typecheck+lint sạch,
phòng sạch giải 190 gói exit 0. `.npmrc legacy-peer-deps` đã cân và **BỎ** (che thay vì trị).

**Cổng:** typecheck · lint · **510/510** test · `conform` ✓.
