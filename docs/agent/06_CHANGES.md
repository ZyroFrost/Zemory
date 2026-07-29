<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-29j] — `memory key set/show/path`: ô NHẬP chìa · két master-password đã cân và BÁC · Drive sạch chìa cũ

Gate 341 → **351** · `conform` ✓ · `validate` ✓ · 8/8 đột biến bị bắt. Spec: `plan/16_share_key`.

- **Lỗ thật, không phải lỗ tôi tưởng.** Có `keygen` (sinh chìa MỚI) nhưng **không có đường nhập chìa
  ĐANG CÓ** ⇒ ở máy thứ hai người dùng phải tự đoán đường dẫn rồi tạo file bằng editor, và không có
  cách nào kiểm mình gõ đúng chưa. Thêm `memory key set|show|path`: `set` đọc **stdin**, `show` in
  **chỉ dấu tay** (8 hex sha256), `path` in đường chuẩn. `keygen` không đối số nay ghi thẳng đường
  chuẩn thay vì in usage rồi bỏ đi — đoán sai chỗ đặt là `resolveShareKey` không thấy, rồi sync báo
  "thiếu chìa" trong khi chìa CÓ.
- **Dấu tay là phần đáng giá nhất.** Lỗi thật của mang-chìa-bằng-tay là **gõ sai**, mà gõ sai chỉ lộ
  ra dưới dạng `unable to authenticate data` **sau khi** import xong bundle 255 MB. So dấu tay là tức thì.
- **Không in chìa, không nhận chìa qua đối số.** Phiên agent bị ingest vào chính `global_memory.db`
  ⇒ in chìa ra là nhét nó vào cái nó bảo vệ, rồi theo bundle lên Drive: mở được **một** bundle là đọc
  được chìa và mở **mọi** bundle. Đối số thì vào history của shell **và** vào transcript. Cả hai đều
  có test khoá.
- **Câu lỗi `Missing share key` chỉ kể tên 2 cờ** mà không nói chìa phải nằm đâu ⇒ viết lại thành 3
  dòng chỉ thẳng lệnh + in đường chuẩn.
- **Két master-password: cân rồi BÁC** (bản nháp `plan/16_vault` cùng ngày đã gỡ). Hai câu hỏi của chủ
  repo giết nó: ① *"máy mới clone về thì cơ sở nào nhận diện?"* — két nằm **SAU** bước đưa chìa vào nên
  không đóng góp gì cho bài đa máy; thứ thiếu là **ô nhập**, một lệnh chứ không phải một két. ②
  *"chung quy giống như có key ở gitignore thôi"* — đúng, và chính **yêu cầu bản lùi** (phục hồi được
  khi quên) kéo két về đúng mức của file gitignored, vì blob DPAPI cũng mở cho đúng user đó. Két chỉ
  thêm gánh nhớ + thêm một lỗi mới (quên là khoá cứng).
- **DPAPI-bọc chìa: cũng BÁC** — chỉ trị "file bị copy khỏi đĩa", mà đó là việc của full-disk
  encryption; đổi lấy code Windows-only + blob chết khi profile hỏng (vẫn phải gõ lại từ note). Bác vì
  **không đáng**, không phải vì không làm được: đã đo DPAPI chạy và **có xác thực thật** (lật 1 byte ở
  5/6 vị trí đều bị từ chối; chỗ duy nhất lật được là byte 10 — vùng GUID provider, và **phép thử ĐẦU
  của tôi lật đúng byte đó** rồi suýt kết luận "DPAPI không xác thực").
- **Drive: 0 file còn mở được bằng chìa cũ.** Đo từng file thay vì đoán theo ngày sửa — và hoá ra
  `autosync` đã tự dọn phần lớn: nhánh `compacting` gộp mọi delta chìa-cũ của máy này thành baseline
  **chìa-mới** rồi xoá bản cũ. Chỉ còn 1 file lộ (`DESKTOP-PFB157K.000000.enc`, 182,6 MB, chìa cũ);
  nội dung nó **đã merge** vào DB máy này (`merged_bundles`, 29/7 00:22) ⇒ xoá không mất gì. Xoá xong
  kiểm lại: 2 file còn lại đều chỉ mở bằng chìa mới.
- `share/README.md` viết lại lần ba: thư mục đó nay **rỗng ngoài README**, chìa dời sang `<DB>/share.key`.
- **Còn của user:** `zemory memory key set` ở máy thứ hai. Tới lúc đó nó còn chìa cũ nên lần sync tiếp
  theo sẽ đẩy **một** bundle chìa-cũ lên Drive.

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
