<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-29i] — Xoay chìa share + gỡ khỏi git (user chốt)

Gate **341/341** · `conform` ✓ · `validate` ✓. Xoay chìa được **kiểm bằng round-trip thật**, không phải bằng niềm tin.

- **Chìa mới sinh bằng hàm CỦA REPO,** `writeMemoryShareKey()` (`zemory memory share-key --force`) — 32 byte
  random → base64, `mode 0600`. Bản đầu tôi tự bịa `randomBytes(48).toString('base64')`; sai vì repo đã có
  bộ sinh chuẩn, tự viết lại là đẻ nhánh thứ hai cho một việc đã có một cách làm.
- **`share/share.key` ra khỏi git**: `git rm --cached` + gỡ dòng ngoại lệ `!share/share.key` (thêm `98bc126`,
  2026-07-01, lúc repo còn dự tính để private). File **vẫn trên đĩa** để export/import ở máy này chạy bình thường.
- **Kiểm thật, không suy luận:** xuất một bundle bằng chìa MỚI rồi nhập lại **vào DB nháp** (không đụng DB
  thật — `memory import` không có cờ `--db` nên gọi thẳng thư viện): chìa mới **giải mã được**, chìa cũ
  **bị từ chối** (`unable to authenticate data`). Chìa cũ giữ tạm ở `~/.zemory/share.key.OLD-2026-07-29`.
  *(Lần thử đầu vô nghĩa: CLI chặn ở bước "sẽ đè DB" nên chưa hề tới bước giải mã — báo "đúng như mong đợi"
  lúc đó là tự lừa mình.)*
- **KHÔNG viết lại lịch sử git.** Chìa cũ nằm trong lịch sử **đã push** của repo PUBLIC ⇒ coi như **lộ vĩnh
  viễn**. Nhưng `git log --all -- 'share/*.enc'` **rỗng** ⇒ chưa `.enc` nào từng vào git, tức chìa cũ **không
  mở được gì đang công khai**. Force-push viết lại lịch sử public để xoá một chìa đã vô dụng là cái giá
  không đáng — xoay chìa đã đủ.
- **0 bundle phải mã hoá lại**: `find . -name '*.enc'` rỗng trên máy này.
- `share/README.md` viết lại lần hai; `05_TODO` đổi mục này từ *"chìa đang bị commit"* thành **việc của user:
  phát chìa mới qua Drive/password manager**. Máy nào còn chìa cũ sẽ không import được bundle mới.
- Đính chính kèm: `05_TODO` khai `zemory docs search` — **không phải lệnh** (`docs` chỉ có `ls`; tìm docs là
  `plan search`). Đúng cái nhầm đã làm bộ kiểm ở `[2026-07-29f]` xanh giả; nay sửa ở nguồn.

## [2026-07-29h] — Suýt push hạ tầng nội bộ công ty lên repo PUBLIC — lỗi của tôi · và 2 cửa data-vào-git có tuổi

Gate 336 → **341** · `conform` ✓. Bắt được lúc soi diff **TRƯỚC** khi push; **chưa có gì rời máy**.

- **Lỗi của tôi, commit `b6d57d9` hôm nay.** Lúc dọn row index (`[2026-07-29d]`) tôi dump nội dung row ra
  `.md` làm lưới lùi và để dump đó trong `attic/` — **cây git của repo này**. Nhưng `global_memory.db` index
  docs của **MỌI project trên máy**, nên dump mang docs của `PWB/PowerBi_SasinFlow_Maintain` · `SasinFlow` ·
  `Sharepoint_NAS`: **7 IP server nội bộ** (dải riêng `192.168.x` + `172.16–31.x`), tên linked-server, tên
  máy chủ ETL, và **4 tên biến môi trường loại `*_USER`/`*_PASSWORD`** của các login BI. Là **tên** biến chứ
  không phải giá trị, nhưng ghép lại là **bản đồ hạ tầng BI của công ty**. `gh repo view` → **PUBLIC**. Push
  là không đảo được.
  *(Số/tên cụ thể CỐ Ý không ghi ở đây — xem đoạn cuối entry này.)*
- **Sửa:** viết lại 4 commit chưa push (chỉ `b6d57d9` chứa dump) ⇒ dump **chưa từng tồn tại** trong lịch sử;
  thư mục dời ra `~/.zemory/rescue/` — **ngoài mọi cây git**, cạnh cái DB nó vốn thuộc về. Nhánh lùi
  `backup-truoc-khi-go` giữ bản cũ tới khi push xong.
- **Bài học đúng chỗ:** cái sai không phải "quên gitignore" mà là **dump dữ liệu của project khác vào repo
  của mình**. Lưới lùi của một thao tác DB phải nằm cạnh DB, không nằm trong repo.
- **User nhắc luật, và luật đó lộ ra 2 cửa CÓ TUỔI (không phải của phiên này):**
  - `share/share.key` vào git từ **`98bc126` (2026-07-01)** — commit đó tự đặt tên *"code only; memory syncs
    via Drive, never in git"* trong khi chính nó commit chìa.
  - `.gitignore` có **`!share/global_memory.zemory.enc`** từ **`f59b2ac` (2026-07-10)**, trong commit tên
    *"close all audit findings (privacy leak, git bundle…)"* — tức một đợt vá audit lại **mở** cửa. LFS đã
    cắm sẵn trong `.gitattributes`. Chưa `.enc` nào vào git (`git log --all -- 'share/*.enc'` rỗng), nhưng
    ghép với chìa nằm cạnh thì **một lần export nhầm + `git add -A` = toàn bộ bộ nhớ lên public kèm chìa giải mã**.
  - Đã **gỡ whitelist** (mọi `*.enc` bị chặn, kiểm bằng `git check-ignore`), viết lại `share/README.md` (nó
    đang khai "tracked by Git LFS" và "keep the repo private" — cả hai đã sai).
- **Gate mới `no-data-in-git`** (5 test) khoá luật *git chứa SOURCE, không chứa DATA*: 10 đường data phải bị
  `git check-ignore` chặn · `.gitignore` **không** được có dòng `!` cho `.db`/`.enc`/`.sqlite` · 0 file data
  đang track · 0 dump project khác trong cây git · và ratchet cuối **quét IP nội bộ + tên biến mật khẩu
  trong mọi file được track** (bắt được bất kể lọt vào bằng đường nào).
- **Gate đó bắt ngay chính commit này.** Bản đầu của entry trên tôi ghi **nguyên văn** 7 IP và 4 tên biến
  để "mô tả sự cố" — tức **tái tạo đúng cái rò rỉ đang đi vá**, lần này bằng một file `docs/` chắc chắn được
  commit. Audit trước-push báo 7 chuỗi, gate `no-data-in-git` đỏ 1/5. Đã viết lại thành mô tả theo LOẠI
  (dải IP riêng · số lượng · loại biến), đủ để hiểu chuyện mà không mang dữ kiện đi xa hơn. **Luật rút ra:
  changelog kể sự cố rò rỉ thì mô tả LOẠI, không chép GIÁ TRỊ** — trinh sát không cần bản gốc, chỉ cần bản
  bạn tự chép lại.
- **CÒN NGUY, chờ user:** chìa `share/share.key` vẫn trong git và **đã nằm trong lịch sử đã push** ⇒ phải coi
  là **đã lộ**. Việc cần làm (đã có ở `05_TODO`): xoay chìa mới · `git rm --cached` · gitignore · đưa chìa
  qua kênh khác. Xoá khỏi HEAD KHÔNG xoá khỏi lịch sử. Chưa tự làm vì nó chặn pull đa máy cho tới khi chìa
  mới được phát.

## [2026-07-29g] — `03_STRUCTURE` thành TỪ ĐIỂN TRA, không đọc mỗi phiên · `conform` vào gate

Gate 329 → **336** · `validate` ✓ · 7/7 đột biến bị bắt. Tầng luật **96,4 → 56,1 KB (−42%)**.

**Ý user, không phải ý tôi:** tôi đề xuất *tách* `03_STRUCTURE` thành 2 file; user bác — *"03 là structure
slot và index toàn app, ko thể cắt được… chỉ tìm và đọc đúng khi thêm slot, sửa slot, hoặc tra index mới
đúng logic"*. **User đúng và phương án đó tốt hơn**: sửa LUẬT ĐỌC chứ không cắt file ⇒ không đánh số lại,
không hỏng **47 chỗ trích `§N`** ở tầng sống, không thêm tier, không sửa parity template.

- **Bằng chứng vòng lặp chạy thật** (thử trên repo nháp): tạo `backend/src/db` + `frontend/js` → `conform`
  bắt cả hai `[off-standard-dir]` **kèm câu chỉ đường "→ đổi tên về đúng slot (03_STRUCTURE §3)"**. Agent
  không cần nhớ chuẩn; máy nêu, agent mở đúng mục.
- **Nhưng `conform` KHÔNG tự chạy ở đâu cả** — không trong `npm run check`, không trong hook nào. Bỏ 03 khỏi
  bộ đọc trong lúc đó = không còn ai canh chuẩn. Đã nối `conform --gate` vào `npm run check`.
- **`conform` kiểm 6 thứ, §5 khai 48 luật.** Phân loại: ~38 luật nổ *lúc tạo/đặt tên folder* (tra-khi-cần
  đúng, và `off-standard-dir`/`empty-slot-dir` bắt được hậu quả) · **~10 luật nổ lúc VIẾT CODE mà `conform`
  mù hoàn toàn**: SQL-1-cách · secret · `share/` bundle · setting UI · panel resize · dialog 16:9 · test ·
  version · version-up · backup deploy 2 chiều. Không biết = vi phạm **âm thầm**, không gate nào kêu ⇒ dời
  **nguyên văn** sang `02_RULES §Luật khi VIẾT` (luôn nạp), **xoá khỏi `03`** — một nguồn duy nhất (điều 3).
  Bản nonapp dời 4 luật cùng loại (`Secret/connection` · `SQL/DAX/M` · `Nhị phân nặng` LFS · `Data thật vs mẫu`).
- **`AGENTS.md` (repo + 2 template, byte-identical trừ tiêu đề):** `03_STRUCTURE` ra khỏi danh sách "ĐỌC HẾT",
  thay bằng item riêng khai nó là **từ điển slot + index để TRA** kèm **trigger**: tạo/đổi tên/dời folder ·
  thêm/sửa slot · tra index · `conform` báo lệch.
- **Bắt được lỗi nhân lúc thử: project vừa `init` xong đã ĐỎ.** `04_SKILLS` mẫu trích *"điều 13"* trong khi
  `01_CONSTITUTION` mẫu chỉ có 1 điều placeholder *"(chưa chốt)"* ⇒ `dangling-ref`, **cả hai template**. Nặng
  hơn bình thường vì `BOOTSTRAP` Cowork bảo agent của sếp chạy đúng luồng `init` → `conform`: việc đầu tiên
  sếp thấy là một dấu ✗ không do sếp gây ra. Vá 4 chỗ (nêu nguyên tắc bằng chữ). Nay `init` → `conform --gate`
  **exit 0** cho cả app và non-app.
- **Gate mới `read-set-contract`** (7 test) khoá hợp đồng đọc: 03 không được trở lại danh sách đọc · trigger
  phải có mặt · `conform` phải nằm trong gate kèm `--gate` · 10 luật phải ở `02_RULES` và **không** còn ở
  `03` · `03` phải để lại con trỏ · template **không** được trích số điều. Đột biến: nhét 03 trở lại, gỡ
  conform khỏi gate, gỡ `--gate`, lén copy luật về 03, xoá mục §Luật khi VIẾT, template trích lại "điều 13",
  bỏ con trỏ — **7/7 đỏ đúng**.
- `bootstrap-manifest` tự bắt số dòng lệch sau khi sửa docs (21→22 · 70→82 · 133→130) — đúng việc nó sinh ra để làm.

**Đo lại theo tầng** (bộ nổi tiếng chỉ có tầng luật, không có backlog/changelog/plan — nên chỉ tầng ① so được):

| | tầng ① luật | vs Cursor 500 dòng |
|---|---|---|
| trước | 686 dòng · 96,4 KB | 1,37× thô · 2,82× token |
| **nay** | **374 dòng · 56,1 KB** | **0,75×** thô · **1,64×** token |

Bộ đọc mỗi phiên: **279,4 → 239,2 KB**. `03_STRUCTURE` (322 dòng · 41,7 KB) ra ngoài, tra bằng `plan search`.

## [2026-07-29f] — Kiểm archive: file không mất gì, nhưng INDEX đang chỉ sai đường — và bộ kiểm đầu của tôi tự xanh giả

Gate 322 → **329** · `conform` ✓ · `validate` ✓ · 6/6 đột biến bị bắt. Bộ đọc 284,1 → **279,4 KB**.

> 🔄 **Supersede `[2026-07-29e]`:** câu *"3 plan chết mất khả năng tìm bằng docs search"* là SAI.

- **Kiểm mất mát ở tầng FILE: sạch.** Đối chiếu với git: changelog 68 → 113 entry, **0 entry biến mất**;
  4 entry rời file active hôm nay **đều** có trong `archive/06_CHANGES.md`; **151/151** dòng cắt khỏi
  `05_TODO` đều nằm trong `archive/05_TODO.md`; 3 plan trong `attic/dead-plans` **giống hệt byte** bản cũ.
- **Lỗi thật nằm ở INDEX, và do chính đợt dời hôm nay gây ra.** `reindex` chỉ NẠP file nó thấy, **chưa bao
  giờ dọn row của file đã biến mất** ⇒ sau khi `git mv` 3 plan sang `attic/`, `plan search "quota-safe"` vẫn
  trả hit trỏ `docs\plan\03_….md` — đường dẫn không còn tồn tại. **Hit chết còn tệ hơn không có hit**: nó
  đẩy người đọc tới một file không có ở đó. Thêm `pruneMissingDocs()` — xoá doc+section khi `.md` mất, gọi
  cuối `reindex`. Hai guard, mỗi guard một test: **root không tồn tại thì KHÔNG dọn** (ổ cắm rời chưa mount
  ⇒ dọn là xoá sạch index của project còn sống) và **chỉ dọn project được chỉ định**.
- **Plan chết giữ lại quyền tra cứu.** `reindex` nạp thêm `attic/dead-plans/*.md` thành tầng
  `kind=plan-archive` — đúng thoả thuận đã áp cho changelog và backlog: **ra khỏi bộ đọc, KHÔNG ra khỏi
  tầm tìm**. Chỉ đúng thư mục đó, không phải cả `attic/` (attic còn giữ source đã nghỉ, cockpit HTML, bản
  cứu index — không thứ nào thuộc kết quả tìm docs).
- **Bộ kiểm ĐẦU TIÊN của tôi tự cho xanh giả.** Nó gọi `docs search` — **không phải lệnh** (`docs` chỉ có
  `ls`; tìm docs là `plan search`) — nên CLI in bảng help, mà regex `/#\d+/` của tôi lại khớp vào chính
  bảng help ⇒ **3 probe báo ✓ trong khi chưa tra gì cả**. Bản kiểm mới bắt buộc dòng kết quả đúng dạng
  `#<id> [<path>]` **và** path phải thuộc tầng đang kiểm, nên lệnh sai không thể đọc thành thành công.
  Đúng loại bẫy `02_RULES` đã cảnh báo — lần này nó nằm trong công cụ đo, không nằm trong code.
- Kết quả kiểm lại: **8/8 probe truy xuất qua lệnh thật** (3 tầng changelog · TODO active/archive · plan
  sống/chết) · **0 hit** trỏ vào đường dẫn đã dời · 3/3 file archive còn đủ nội dung khi đọc trực tiếp.

## [2026-07-29e] — `.bak` ra khỏi docs · backlog lọc xong 43,6 KB · 3 plan chết rời bộ đọc

Gate 320 → **322** · `conform` ✓ · `validate` ✓. Bộ đọc mỗi phiên **362,1 → 292,6 KB (−19,2%)**.

- **`.bak` không được đọng trong `docs/`.** `writeFileAtomic` đổi `backup?: boolean` (ghi `<file>.bak`
  ngay cạnh đích) thành **`backupDir?: string`**; `archive` trỏ vào `attic/harness-bak/`. Lý do: đích của
  hai lần archive là `docs/agent/`, **đúng thư mục luật bắt agent "ĐỌC HẾT"** — nên `.bak` ở đó vừa tốn
  ngữ cảnh vừa trông y như rác lọt, và đã bị hiểu nhầm là rác **hai lần**. Xoá 2 file đang đọng
  (`05_TODO.md.bak` 123 KB · `06_CHANGES.md.bak` 54,5 KB) sau khi đối chiếu: **0 dòng độc nhất** — nội dung
  có đủ ở bản live + tầng archive. Đóng mục đề xuất đã treo từ `[2026-07-28k]`.
- **Backlog: luật "xong là ra" chạy đúng cơ chế nhưng vô dụng.** `archiveTodo` chỉ khớp `- [x]`, mà
  `05_TODO` có **0 dòng** như vậy — việc xong ở đây được ghi bằng **heading tự khai xong** (`✅`/`XONG`/
  `ĐÃ HOÀN TẤT`) và **bullet trần**, nên bộ lọc không thấy gì. Đo: 17,5% file nằm dưới heading loại đó,
  cộng một khối **98 dòng / 34,9 KB** thuật lại VÒNG 1–11 đợt UI refactor — 53% file, mà chỉ chứa 3 `[ ]`
  + 2 `[~]` việc thật. Cắt tay **151 dòng / 43,6 KB** sang `archive/05_TODO.md`, chọn bằng **phép trừ dòng
  so với bản commit** chứ không nhặt tay. `05_TODO`: **269 → 118 dòng · 65,9 → 22,3 KB (−66%)**.
  Kiểm không mất mục: 41 mục mở của bản cũ → **37 khớp nguyên văn**, 3 chỉ đổi câu chữ (kiểm bằng grep),
  1 đã làm xong trong phiên này (`.bak`). Số mục mở **41 → 48** vì các đoạn văn "CÒN TREO"/"CHỜ USER CHỐT"
  vốn là việc thật nhưng viết dạng prose, nay thành `[ ]` đếm được.
- **3 plan chết rời `docs/plan/`** → `attic/dead-plans/` (`git mv`, giữ lịch sử): `03_subscription_quota_safe_compression`
  (DROPPED 2026-06-25, 22,4 KB) · `10_token_savings_dashboard` (GỠ HẲN schema v11) · `11_db_size_optimization`
  (HOÀN TẤT, plan 12 thay). Cả ba **tự khai chết ngay trong header**. Vá 2 chỗ còn trích dẫn: `plan/04`
  (khai "bổ sung cho plan 03") và `plan/12` (trích số đo dbstat của plan 11 — số đã nằm sẵn trong plan 12
  nên không cần mở lại file).
  > 🔄 **Supersede (cùng ngày, `[2026-07-29f]`):** entry này từng ghi *"attic/ không được reindex quét ⇒ 3
  > file mất khả năng tìm"* — **SAI cả hai nửa**. Kiểm thật cho thấy chúng **vẫn tìm được** nhưng trỏ vào
  > `docs\plan\…` **đã không còn tồn tại**. Đã sửa ở entry sau.
- **Vì sao KHÔNG dựng `docs/plan/archive/`:** sẽ phải thêm tier mới + sửa `reindex` + sửa `AGENTS.md` cho
  một thứ đã chết. `attic/` là lớp đã khai cho vật liệu bị thay thế (source compression, 19 file cockpit)
  — plan chết về đúng chỗ với code nó đặc tả.

## [2026-07-29d] — Một thư mục, HAI khoá index: chữ ổ đĩa chẻ đôi bộ nhớ của chính repo này

Gate 313 → **320** · `conform` ✓ · `validate` ✓ · 3/3 đột biến bị bắt.

- **Bệnh.** `findProjectRoot` trả `resolve(process.cwd())`, mà trên Windows chữ ổ đĩa trong `cwd()` phụ
  thuộc lúc gõ `cd d:\` hay `cd D:\` ⇒ **cùng một thư mục sinh hai `project_root`**. Đo trên DB thật:
  docs của repo này bị chẻ **24 row `D:\Zyro\Tool\Zemory`** vs **15 row trùng cũ `d:\Zyro\Tool\Zemory`**,
  bảng `changelog` thêm 7 row nữa. Tìm kiếm phạm vi-project chỉ thấy nửa nào khớp chữ của lúc đó.
- **Chữa tận gốc.** `normalizeRoot()` viết hoa chữ ổ đĩa (drive letter Windows vốn không phân biệt
  hoa-thường; phần còn lại của đường dẫn KHÔNG đụng vì tên folder có nghĩa và OS khác phân biệt hoa-thường).
  Chặn ở **cả hai đầu**: nơi sinh root (`findProjectRoot`, `currentProjectRoot`) và nơi **ghi** vào index
  (`importDoc`, `importChangelog`) — cộng 3 cửa nhận root từ ngoài (`checks` rootArg, `status` rootArg,
  MCP `args.project`). Ghi đã chuẩn thì không caller nào đầu độc lại được index.
- **Dọn 120 row chết** (cứu trước, xoá sau — mỗi bước có bản hoàn nguyên JSON trong `attic/`):
  36 doc/296 section thuộc **6 root thư mục đã biến mất** · 15 doc trùng dưới root không chuẩn ·
  5 doc **mồ côi** (file `.md` đã đổi tên: `04_TODO`→`05_TODO`, `00_build_plan`→`00_overview`) ·
  64 changelog entry chết. Còn lại **7 root, tất cả chuẩn và còn sống**, 0 section mồ côi, FTS integrity ✓.
- **Cứu được lịch sử tháng 6.** 33 entry `2026-06-17..06-30` (32,4 KB) **chỉ còn trong index** — không có
  trong `06_CHANGES.md` lẫn `archive/`, vì bản sống bắt đầu từ `2026-07-10`. Đã trả về tầng archive
  (nguồn là `.md`, index dựng lại từ đó) ⇒ `changelog search "Khởi tạo repo"` nay ra `[2026-06-17]`.
  Archive: 71 → **104 entry**, liền mạch `06-17 .. 07-28`.
- **Bẫy đã dính, ghi lại để khỏi dính lần nữa:** bản cứu đầu tiên báo "36 file" nhưng trên đĩa chỉ có
  **31** — slug thư mục của hai root chỉ khác chữ `D`/`d` nên Windows coi là **một** folder và 5 file bị
  **ghi đè**. Đúng cái bệnh đang đi chữa, tái hiện ngay trong công cụ chữa nó. Slug nay mang hash của
  root gốc. Bài học: đếm chéo file-trên-đĩa vs row-trong-DB, đừng tin con số script tự báo.
- **Còn hở (chưa sửa):** `PBI_SasinFlow_Maintain` có 6 changelog entry `date=NULL` là `##` heading của
  `plan/01_legacy_topology.md` bị parse nhầm thành entry — root còn sống nên lần dọn này không đụng.
- Fixture `changelog-archive-index` từng dùng root giả `/proj/<random>`; `resolve()` biến nó thành
  `D:\proj\...` trên Windows ⇒ ghi một khoá, tra một khoá. Nay dùng temp dir thật, như production.

## [2026-07-29c] — Mục xong ra khỏi backlog NGAY, không chờ ngưỡng · và test của tôi vừa ghi vào DB thật

Gate 312 → **313** · `conform` ✓ · `validate` ✓.

- **`archiveTodo` bỏ hẳn ngưỡng.** Header `05_TODO` vốn đã bắt *"xong → ghi sang `06_CHANGES.md` và xoá
  khỏi đây"* ⇒ mục đóng là **sai chỗ ngay khi đóng**, dung lượng file không liên quan. Ngưỡng là dụng cụ
  sai cho một luật ĐÚNG/SAI, và chính nó để 107 mục dồn tới 46% file. Dấu hiệu lộ ra từ trước: ngưỡng
  byte vẫn nổ mà **không có gì để chuyển**. Gỡ `todo_lines`/`todo_bytes` khỏi config (đã thành key chết).
- **Index ngay tại chỗ archive** (`importDoc` cả 2 tầng) — trước đó phải chờ ai đó nhớ chạy `reindex`,
  mà "chờ ai đó nhớ" đúng là thứ cả mạch việc này đang gỡ.
- Docblock cũ vẫn tả ngưỡng ⇒ **đã viết lại**; để nguyên là tái phạm bệnh "spec hứa thứ code không làm".

### Test của tôi ghi vào DB SẢN XUẤT — 20 doc + 48 section row
Script sửa test fail giữa đường nên **không ghi được** phần thay `scratch()`; hệ quả là 5 lời gọi
`archiveTodo(s.ctx)` **thiếu `dbPath`**, rơi vào mặc định `currentMemoryDb()` = **DB thật**. Đã dọn sạch
(doc 20→0 · section 48→0), rows của repo còn nguyên (`agent` 5 · `agent-archive` 1 · `plan` 17 · `todo` 1).

*Kiểm chéo cứu một kết luận sai:* phép đếm đầu trả **0 row cho repo này** — nghe như tôi vừa xoá nhầm dữ
liệu thật. Đếm lại bằng `GROUP BY project_root` thì rows còn đủ ⇒ **query sai, không phải mất dữ liệu**.

**Chặn tái phạm bằng code, không bằng cẩn thận hơn:** `dbPath` của `archiveTodo` nay **bắt buộc** — bỏ
giá trị mặc định, thêm guard `throw` nếu thiếu. TypeScript không cứu được caller `.mjs` (thiếu tham số
tới dưới dạng `undefined`), nên phải chặn ở runtime: **nổ to còn hơn âm thầm ghi vào production.**
Kiểm sau khi vá: chạy full gate xong, row tạm còn **0**.

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
