<!-- zemory template · luật làm việc CHUNG mọi project (CẢ app lẫn non-app — chốt 2026-07-16, không tách profile) — ship nguyên từ template, KHÔNG thêm luật riêng vào đây (luật riêng của app → 01_CONSTITUTION.md) -->
# <PROJECT> — Quy tắc làm việc

> AI đọc file này SAU `01_CONSTITUTION.md` (hiến pháp — bất biến riêng của project, tối cao). Tuân thủ tuyệt đối.
> Điều hướng mở phiên (đọc gì, thứ tự nào): `AGENTS.md` ở root. Quy trình thao tác chi tiết nằm ở **`.claude/skills/<tên>/SKILL.md`** (sổ đăng ký: [`04_SKILLS.md`](04_SKILLS.md)); RULES/STRUCTURE chỉ nêu NORM + trigger rồi dẫn chiếu. Backlog: `05_TODO.md`. Changelog: `06_CHANGES.md`.

## Cấu trúc repo — xem [`03_STRUCTURE.md`](03_STRUCTURE.md)
**Chuẩn cấu trúc folder ĐẦY ĐỦ** (cây từng-dòng + routing "sửa gì → vào đâu" + convention) nằm ở **[`03_STRUCTURE.md`](03_STRUCTURE.md)** — **đọc TRƯỚC khi sửa/tạo folder**; cần sửa gì → `03 §4` trỏ THẲNG slot (KHÔNG grep cả repo). Nắn repo về chuẩn → skill **`.claude/skills/reconcile/`**.

- **`03_STRUCTURE` là INDEX phải KHỚP code (luật làm việc):** mọi thay đổi cấu trúc (thêm/đổi/dời slot, thêm routing) phải cập nhật `03_STRUCTURE` trong CÙNG thay đổi đó — index lệch code = tra sai. *(Nội dung chuẩn — BẮT BUỘC=4, 1 tên/concern, tracked-vs-gitignore… — nằm ở `03`, KHÔNG lặp ở đây.)*
- **SỬA BẤT CỨ GÌ (backend · frontend · docs · config · test) → PHẢI đúng CHUẨN ĐÃ CHỐT (luật cứng).** Trước/trong khi tạo·đổi·dời file hoặc viết code: đối chiếu `03_STRUCTURE` (slot · routing · convention · UI §5/§9) + `01_CONSTITUTION` (bất biến) + `02_RULES`. **TUYỆT ĐỐI không sửa SAI chuẩn** (đặt file sai slot, đẻ tên mới cho concern đã có tên, hardcode màu/chuỗi, UI phá luật §5…). Không chắc chuẩn ở đâu → tra `03 §4`/§9 hoặc HỎI, đừng đoán. Thấy chỗ ĐANG lệch chuẩn → nắn về chuẩn (hoặc BÁO nếu lớn/khó đảo), KHÔNG nhân thêm cái sai lên.

## Luật khi VIẾT (BẮT BUỘC — luật cứng)

> Những luật này nổ **lúc viết code**, không phải lúc tạo folder — và `zemory conform` **không kiểm được**
> cái nào trong số chúng. Không biết = vi phạm âm thầm, không gate nào kêu. Vì vậy chúng ở đây (luôn nạp),
> chứ không ở `03_STRUCTURE` (tra khi cần). `03` KHÔNG còn giữ bản sao — một nguồn duy nhất.

```
SQL — 1 CÁCH         mặc định store/queries.* (gom, đặt tên, gọi theo tên); resources/sql/ CHỈ khi cố ý tách file .sql. KHÔNG rải inline
Secret               config/ + .env.example chỉ trỏ TÊN env (password_env); pass THẬT ở .env/vault → data/secrets/. KHÔNG commit
Sync bundle qua git   ngoại lệ CÓ CHỦ ĐÍCH của luật data/=gitignore: bundle MÃ HÓA cần đi qua git để đồng bộ xuyên máy (git-lfs) → TRACKED ở root share/ (đã mã hóa, không phải plaintext secret) — không nhét vào data/ (data/ không sync qua git)
Setting UI kéo-thả   default ship → frontend/config/ (tracked); bản user chỉnh runtime → data/settings/ (gitignore)
Panel resize (LUẬT)  **MỌI vùng có ≥2 panel kề nhau PHẢI có thanh kéo (resize handle) chỉnh được kích thước — KHÔNG có ngoại lệ.** Ràng buộc: **① Tự do THẬT** — seam phải điều khiển một biến layout THẬT (kéo là đổi), CẤM seam "trang trí" (cột `2fr`/`1fr` cứng = kéo không đổi gì = SAI). **② Bố cục 2D → kéo cả 2 chiều** (2 panel cạnh nhau = seam DỌC chỉnh bề ngang; 2 panel trên-dưới = seam NGANG chỉnh chiều cao; lưới 2×2 = có cả hai). Không được chỉ cho co 1 chiều. **③ MỘT engine dùng chung** — mọi seam đi qua CÙNG một cơ chế (1 hàm init + 1 kiểu handle + biến/clamp data-driven), KHÔNG mỗi chỗ một nhánh `if(type===…)` hardcode. Thêm seam mới = khai báo dữ liệu, KHÔNG chép logic. **④ Lưu + khôi phục** y nguyên qua phiên. **⑤ Dựng lại (double-click) về mặc định.** Ngưỡng min/max theo nội dung tối thiểu mỗi panel, KHÔNG số ma rải rác
Dialog / modal       CHỈ 3 size S/M/L, cả 3 CÙNG MỘT TỈ LỆ CHUẨN MÀN HÌNH **16:9** (khung landscape cân đối như màn, KHÔNG phải hộp dài-thòng đứng). **Mỗi size = một % của KHUNG APP theo CẢ HAI CHIỀU** (16:9), công thức `width: min(Pvw, calc(Pvh*16/9))` + `aspect-ratio:16/9` ⇒ đúng P% trên màn 16:9, nhỏ hơn (không tràn) trên màn lệch tỉ lệ: **S 40% · M 60% · L 90%**. 3 size = 3 SCALE cùng tỉ lệ; S không đủ → chọn M/L, **vẫn đúng 16:9, KHÔNG bóp méo**. **KHUNG KHÔNG BAO GIỜ NHẢY theo nội dung** (đổi tab Settings mà khung phình/co = SAI); thân là grid/flex child phải `min-height:0` mới cuộn. KHÔNG cố-định-Nvh (đẻ hộp cao méo), KHÔNG random/đổi-động/reflow loạn. Tràn → cuộn TRONG dialog (overflow:auto), KHÔNG phình theo nội dung. Trạng thái layout user chỉnh (resize/vị-trí/size) phải LƯU + khôi phục y nguyên. Token/size ở frontend/styles/. **ESC LUÔN đóng dialog trên cùng** (mọi overlay/popup phải đăng ký 1 global keydown; ESC đóng MỘT lớp/lần theo thứ tự visually-topmost) + bấm nền (backdrop) cũng đóng — TRỪ dialog đang chạy tác vụ bất-khả-huỷ thì chặn cả ESC lẫn backdrop cho tới khi xong
Test                 KHÔNG bắt buộc — chạy chính app = phép kiểm thử; folder test chỉ cho lõi logic dễ sai ngầm (search/migration/privacy). FE: e2e/story co-locate hoặc frontend/test
Version              git=source(tag/branch) · dist+Releases=build · data/snapshots=data · migrations=schema · 06_CHANGES=log. KHÔNG folder versions/ chép tay. **Bump RELEASE-BASED: số version chỉ tăng khi RELEASE/deploy 1 bản, KHÔNG per-commit/per-feature; USER quyết số (semver M.m.p — minor=tính năng, patch=fix deploy); mọi việc giữa 2 release GOM vào version kế; nguồn số = manifest 1 chỗ (package.json/__version__/…); release-notes = 06_CHANGES**
2 KIỂU version-up     ① TỰ ĐỘNG (app tự check+tải+apply) → backend/src/update/ (phối attic/+dist/+migrations/). ② THỦ CÔNG (chốt bản X, up máy đích/VM) → git tag → dist/ build → backend/scripts/deploy.* → backup bản đang chạy về attic/ TRƯỚC khi đè → rollback nếu hỏng. Dùng hạ tầng có sẵn, KHÔNG concern mới
Bề mặt CHẾT THEO nền  **Mọi bề mặt phụ thuộc một tiến trình nền (cửa sổ app · tab · panel · CLI đang chờ · job theo lịch) PHẢI phát hiện nền chết và CHẾT THEO — hoặc báo lỗi THẤY ĐƯỢC. TUYỆT ĐỐI không để lại vỏ rỗng trông như đang sống.** Đã trả giá thật: tiến trình nền chết mà cửa sổ vẫn mở ⇒ mọi nút bấm gửi request vào chỗ trống, vòng xoay "đang chạy…" quay MÃI, người dùng đọc thành "kẹt" rồi chờ hàng giờ trong khi KHÔNG có gì đang chạy. Vỏ rỗng là kiểu hỏng TỆ NHẤT — nó không báo lỗi, nó **NÓI DỐI**, và người dùng không có cách nào phân biệt với đang-chạy-thật. Cách làm: nhịp tim định kỳ tới nền; chịu lỗi CÓ CHỦ ĐÍCH (chỉ đếm SAU khi đã thấy nền sống ít nhất một lần, và phải trượt LIÊN TIẾP N nhịp mới kết luận — nền bận một nhịp ≠ nền chết); hết N nhịp thì đóng/báo. Đối xứng với luật fail-open: lớp phụ hỏng thì rơi về lớp dưới **và NÓI RA**, không giả vờ vẫn chạy
Backup deploy 2 CHIỀU  KHÔNG chỉ push 1 chiều. Máy đích có backup lần trước → verify khớp attic/ local TRƯỚC khi đè (lệch = có sửa tay ngoài luồng, điều tra trước); deploy xong kéo bản-vừa-thay về attic/ local. Cùng nguyên lý additive-merge của memory sync/share.ts
```
## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- **Văn phong harness = KỸ THUẬT / QUY PHẠM, KHÔNG văn nói.** Hiến pháp, rules, structure và plan viết dạng đặc tả: câu mệnh lệnh ngắn gọn, thuật ngữ chính xác, nêu điều kiện → hành vi. Không dùng khẩu ngữ, câu cảm thán, ví dụ hội thoại, hay lối kể chuyện phiếm.
- **UI · CLI output**: **English HOẶC i18n đủ 2 dict** (song ngữ, đổi qua nút setting) — **0 chuỗi hardcode** (mọi chuỗi người-dùng-thấy đi qua i18n, có cả 2 bản). **Thuật ngữ kỹ thuật / chuyên ngành nặng GIỮ NGUYÊN, KHÔNG dịch** (tên công nghệ, API, viết tắt kỹ thuật — dịch ra làm sai nghĩa). Chi tiết cổng chất lượng i18n → `03_STRUCTURE §9.D` (nguồn duy nhất, không lặp).
- **code · comment công khai**: **TIẾNG ANH** — không nhét ngôn ngữ bản địa vào code/comment người khác đọc.
- **CHỮ NGƯỜI DÙNG ĐỌC PHẢI ĐẦY ĐỦ VÀ ĐÚNG — bốn ràng buộc, áp lúc VIẾT.**
  Luật đứng ở đây vì các mặt của `audit` đều soi MÁY; không mặt nào soi thứ **người đọc nhận**, và
  một lỗi chữ thì không gate nào kêu — nó chỉ hiện ra trước mặt người dùng.
  · **① Có dấu, đúng chính tả.** Docs tiếng Việt phải CÓ DẤU và không mang mojibake (UTF-8 bị đọc
    thành Latin-1: `Ã¡` · `â€` · `ï»¿`). Chữ ASCII-không-dấu CHỈ hợp lệ khi buộc phải vậy (vd file
    in ra console không chắc encoding) — và phải nói rõ lý do tại chỗ.
  · **② Nhãn ĐỦ, máy đọc được.** Mọi phần tử tương tác (nút · ô nhập · select · link) phải có nhãn
    mà **công cụ đọc được**: nội dung chữ, hoặc `aria-label`/`title`/`placeholder`; ảnh có `alt`.
    Nút icon trơn không nhãn là **thiếu**, không phải "gọn".
  · **③ Song ngữ ĐỦ HAI ĐẦU.** Vế "0 chuỗi hardcode" áp cho **cả chữ nằm thẳng trong HTML/markup**,
    không riêng chuỗi trong code: text node và cả `title`/`placeholder`/hint phải có móc i18n
    tương ứng, mọi khoá phải tồn tại ở **cả hai** dict. Chữ nằm trong markup mà thiếu móc = người
    dùng đổi ngôn ngữ xong **vẫn thấy tiếng cũ**, và không lỗi nào nổ.
  · **④ UI phải KHỚP CODE, kiểm bằng GRAPH chứ không bằng mắt.** Bề mặt gọi tới đâu thì chỗ đó phải
    có thật, và ngược lại: cạnh seam `api` đối chiếu route FE gọi với route BE thật ⇒ ① FE gọi
    route không tồn tại = UI gãy · ② endpoint không ai gọi = bề mặt chết.
  *(Cách đo + **bẫy báo oan** từng phép nằm ở `.claude/skills/audit/`: luật nói PHẢI ĐÚNG GÌ, skill
  nói ĐO THẾ NÀO cho khỏi báo oan.)*
## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `01_CONSTITUTION.md` | hiến pháp — bất biến riêng của project | CHỈ user chốt; agent đề xuất qua TODO |
| `04_SKILLS.md` | **sổ ĐĂNG KÝ** skill: một dòng mỗi skill + luật dùng. Playbook nằm ở `.claude/skills/<tên>/SKILL.md` | khi thêm/bớt một skill |
| `05_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `06_CHANGES.md` | changelog | mỗi lần sửa code; **chỉ ghi sau khi xác nhận OK** (viết tay đúng format `## [YYYY-MM-DD] — tiêu đề`) |
- **Quy trình thao tác = MỘT file skill, đăng ký HAI chỗ.** Việc lặp lại đóng thành `.claude/skills/<tên-tiếng-anh>/SKILL.md` (frontmatter `name` + `description` — `description` là thứ DUY NHẤT quyết định skill có được gọi ra hay không), rồi thêm **một dòng vào `04_SKILLS` §2 và một dòng vào bảng trigger `AGENTS.md`**. Thiếu một trong hai = skill mồ côi, phiên sau không tìm ra. **KHÔNG nhét playbook trở lại `04_SKILLS`** — nó là sổ đăng ký, có trần 60 dòng và gate canh.
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế |

- **Docs = FILE là nguồn (FILE WINS):** viết/sửa `.md` trực tiếp BÁM CHUẨN (đúng file, đúng vai trò, changelog đúng format `## [YYYY-MM-DD] — tiêu đề`); **xong là xong** — file là nguồn, KHÔNG cần chạy gì thêm. Muốn `plan search`/`changelog search` tươi thì chạy `zemory reindex` (đọc `.md` → dựng lại search index, **KHÔNG ghi ngược file**). Các lệnh ghi DB→md kiểu cũ (render/set/add) **đã gỡ hoàn toàn** — docs chỉ sửa bằng tay.
- **Đồng bộ bắt buộc — constitution ↔ rules ↔ todo ↔ change ↔ plan luôn khớp:** mỗi thay đổi → TODO phản ánh việc, CHANGES ghi log (sau khi OK), plan cập nhật nếu đổi thiết kế. Không để lệch nhau (đây là khớp NỘI DUNG giữa các FILE, không phải chạy sync).
- **Mỗi file harness làm ĐÚNG MỘT việc — KHÔNG lặp nội dung file khác.** `01` hiến pháp (bất biến kiến trúc) · `02` luật làm việc · `03` chuẩn cấu trúc folder · `04` sổ đăng ký skill (playbook → `.claude/skills/`) · `05` backlog · `06` changelog. Một nội dung chỉ sống ở ĐÚNG MỘT nhà; file khác cần thì **DẪN CHIẾU** (link + số hiệu), KHÔNG chép lại. Đọc hết 6 file KHÔNG được thấy nội dung trùng — trùng lặp / lạc chỗ = agent đọc bị loạn.
- **Plan (`docs/plan/`) — chỉ chứa SPECS:** KHÔNG todo (→ `05_TODO`), KHÔNG luật (bất biến/luật riêng của app → ĐỀ XUẤT vào `01_CONSTITUTION`, plan chỉ dẫn chiếu điều khoản). Chuẩn đặt tên `NN_tên.md` (`00`=overview): xem `03_STRUCTURE §5`.
- **XONG MỘT VIỆC LÀ ĐÓNG NGAY — KHÔNG đợi chốt phiên (luật cứng).** Ngay khi một mục `05_TODO` xong,
  làm đủ ba bước **trong cùng lượt đó**: ① **ĐO LẠI** nó theo §Hành xử *"SOÁT SỔ = ĐO LẠI"* — *"tôi
  vừa làm nên tôi biết"* **KHÔNG** phải bằng chứng, và đây đúng chỗ hay sai nhất: phần lớn ca hỏng là
  GIỮA PHIÊN, ngay sau khi vừa xong một việc · ② ghi sang `06_CHANGES` · ③ **xoá mục khỏi
  `05_TODO`** (hoặc `zemory archive` dời sang `archive/`).
  **Vì sao không đợi tới chốt phiên:** một mục đã xong là **đặt sai chỗ kể từ giây nó xong**, mà
  `05_TODO` được nạp MỌI phiên — đo thật: **107 mục đã xong chiếm 46%** một file luôn-nạp.
  **Vì sao không tin trí nhớ:** soát 58 mục thì **11 sai (~19%)** — có mục đã làm xong vẫn mang dấu
  `[ ]`, có mục bị bịa nguyên nhân chỉ vì thấy triệu chứng.
  *(Chốt phiên vẫn chạy `archive` như lưới vét cuối — `.claude/skills/session-close/` — nhưng lưới
  đó là để hứng phần đã dồn, KHÔNG phải chỗ để dồn.)*
- **Tra log sâu:** việc/lỗi/quyết định ở phiên khác → `zemory memory search "<q>" [--all]` (recall on-demand, tự tiết kiệm token; đừng tra bừa).

## Chốt phiên / ghi sổ (BẮT BUỘC — luật cứng)
**Kích hoạt khi user nói:** "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt** — quy trình đầy đủ (đọc lại 3 nguồn: FULL phiên hiện tại + FULL `docs/plan/*` + FULL `docs/agent/*` → định tuyến từng thứ về đúng file → chuẩn "không bỏ sót" → bước cuối `zemory validate`) ở skill **`.claude/skills/session-close/`**. Bất biến: mọi việc đã làm phải tìm được ở `06_CHANGES` **hoặc** `05_TODO` (kể cả chẩn đoán sai / đường cụt); đổi thiết kế → `docs/plan/*`; luật riêng → ĐỀ XUẤT `05_TODO` chờ user chốt. Không tự `git push` (§Git). **Tự dọn cuối phiên (bắt buộc):** ghi sổ xong thì chạy `zemory archive` — mục `[x]` đã xong rời `05_TODO` **ngay, không chờ ngưỡng** (một mục đã đóng là đặt sai chỗ kể từ giây nó xong), còn `06_CHANGES` cắt theo trần khai trong `docs/.harness.json`. Chép NGUYÊN VĂN sang `docs/agent/archive/`, KHÔNG tóm tắt — archive là để TRA LẠI. Bỏ bước này thì `05_TODO` (file LUÔN được nạp) phình dần cho tới khi mỗi phiên phải trả tiền cho toàn bộ lịch sử.

- **Global Memory là NGUỒN của phiên (BẮT BUỘC verify):** episodic sống sót qua context-trim, còn trí nhớ trong context thì bị lược → khi ĐỔI SESSION / ghi docs / audit / báo cáo, PHẢI dò Global Memory (`zemory memory search`/`digest <session>`) + đối chiếu code THẬT để **verify TỪNG mục TRƯỚC khi ghi hay khẳng định** — không ghi/báo theo trí nhớ tóm tắt hay kết quả subagent chưa kiểm. Đây là chốt chặn "đổi session là sót/lệch". Chi tiết: `.claude/skills/session-close/` Bước 0.

## Changelog — supersede
- Mới nhất ở trên cùng (chèn ngay sau header).
- Entry **đảo/thay** quyết định cũ → mở đầu bằng:
  `> 🔄 **Supersede:** thay [YYYY-MM-DDx] — "[đề mục]" — [lý do].` **Phải nêu ĐÚNG khoá ngày của entry bị thay** (`2026-07-29l`, y như heading của nó): đó là thứ DUY NHẤT máy nối được, và nối rồi thì ai tra trúng entry CŨ mới thấy nhãn “⚠ ĐÃ BỊ THAY”. Viết trống ngày ⇒ quyết định đã chết vẫn hiện ra như đang sống. Ngày trần khi hôm đó có nhiều entry (`29e`/`29f`) ⇒ **bỏ qua, không đoán**.
  Không sửa/xoá entry cũ; tuỳ chọn thêm `> ⤴ Đã bị thay bởi [ngày].` ở entry cũ.
- **Entry NGẮN — trần ~30 dòng (luật, không phải gợi ý).** Một entry chỉ cần ba thứ: **đổi gì · vì sao · số đo**. Chi tiết thiết kế → `docs/plan/NN_*`; tường thuật quá trình → bỏ. Lý do là số học: ở `changes_keep` ~180 dòng thì **bốn** entry 50 dòng chiếm trọn vùng active, tức viết dài làm chính cơ chế archive thành vô nghĩa. `zemory validate` báo entry vượt trần (advisory) — đo trên 76 entry thật: p50 19 dòng, nên 30 là rộng rãi với một entry bình thường.

## Phạm vi project (BẮT BUỘC — luật cứng)
- **CHỈ làm việc trong project folder đang mở.** TUYỆT ĐỐI KHÔNG ghi/sửa/chạy lệnh đụng vào project khác (kể cả lệnh `zemory` trỏ root khác, `cd` sang repo khác, sửa file bên đó) khi user CHƯA cho phép rõ ràng trong phiên — **kể cả với ý định "giúp"/"cứu dữ liệu"/"tiện tay sửa luôn"**.
- Thấy cần đụng project khác → **DỪNG, HỎI TRƯỚC**: nêu rõ định làm gì, ở đâu, vì sao; user gật mới làm. Project khác có thể đang có agent/phiên khác làm việc — đụng chéo gây xung đột dữ liệu.
- Đọc-tham-khảo (read-only) project khác để trả lời câu hỏi thì được; **mọi thao tác GHI là cấm mặc định**.
- **Vế ngược — bạn đang ĐỨNG TRONG repo tham khảo:** mở một repo khác chỉ để **xem/copy chuẩn** (vd repo nguồn chứa bộ chuẩn gốc) thì **CHỈ ĐỌC**. Lệnh `zemory` **GHI theo cwd**: chạy `init`/`sync`/`reindex`/`archive`/`memory scan` khi đang đứng ở repo đó = **ghi vào repo đó + DB của nó**, không phải vào project bạn. Lấy chuẩn = **đọc `docs_template/`** (bản mẫu TRẮNG — KHÔNG phải `docs/`, đó là docs RIÊNG của repo nguồn-chuẩn đó) **rồi chạy lệnh Ở REPO CỦA BẠN**.

## Git (BẮT BUỘC — luật cứng)
- **KHÔNG `git push` khi user CHƯA cho phép.** Git remote là **nguồn BACKUP CUỐI CÙNG** của project — đẩy lên là ra ngoài, không gỡ lại được (gỡ = force-push, càng phá). Xong việc → build + test + **BÁO CÁO rồi DỪNG**; user bảo "push"/"lên git" mới đẩy.
- **Ghi sổ ≠ publish:** user bảo ghi changelog / commit / "xong rồi" **KHÔNG phải** là cho phép push. Đừng suy diễn.
- Commit cục bộ (đảo được) thì thoải mái theo phong cách repo; **push mới là cửa cần phép**.
- Sửa code chạy trên máy này **không cần push** — build là bản mới sống ngay.
- KHÔNG `--force`, KHÔNG rewrite lịch sử đã push, KHÔNG `reset --hard`/`clean` lên việc chưa commit của user nếu chưa hỏi.

## Guardrail lớp ① — luật bất khả đảo phải có CHỐT MÁY (BẮT BUỘC khi repo có đường cấm)
- Luật mà vi phạm là **KHÔNG đảo được** (secret vào commit · ghi vào đường cấm · `git push` chưa xin) **không được chỉ có chữ gác** — chữ là tầng quan sát, phát hiện SAU, không ngăn được lúc xảy ra.
- **`zemory hook guard`** sinh bộ chốt vào `<nhà harness>/hooks/`: `policy.json` (luật — sinh từ khoá `protected` / `secretNames` trong `.harness.json`) · `guard.cjs` (PreToolUse — chặn TRƯỚC khi hành động chạm đĩa/mạng) · `precommit-guard.cjs` (chặn secret vào staging, phủ cả người). Cách nối vào runtime lệnh in ra — **user duyệt rồi tự nối, tool không tự cắm**.
- **Flag `.allow-*` = user duyệt MỘT lần**, guard cho qua rồi tự xoá; agent chỉ được tạo flag SAU khi user nói rõ trong phiên. **Nhóm secret KHÔNG có flag.**
- Khai đường cấm ghi của repo qua khoá `protected: ["..."]` trong `.harness.json`; `zemory doctor` nhắc khi đã khai mà chưa sinh chốt.
- **VAI CỦA HOOK: LƯỚI ĐỠ, KHÔNG PHẢI NGƯỜI QUYẾT.** Chốt máy tồn tại để đỡ lúc agent **đọc sót hoặc quên** luật — nó KHÔNG phải cơ chế cấm xoá, và càng không phải giấy phép. **Quyền quyết định xoá luôn thuộc USER: hỏi và được đồng ý TRƯỚC, bất kể hook có chặn hay không.** · **Hook cho qua ≠ được phép** — lưới chỉ bắt thứ nó biết trước (xoá một file thường cố ý cho qua để gate khỏi thành nhiễu, nhưng vẫn phải hỏi). · **Hook chặn ≠ hết việc** — bị chặn thì đi HỎI USER, không đi tìm đường vòng, không tự tạo flag. Chữ là tầng QUYẾT ĐỊNH, máy là tầng ĐỠ HỤT; bỏ một tầng thì tầng kia không gánh thay được.

## Hành xử
- **HIỆN SUY NGHĨ TỪNG BƯỚC — CẤM CHẠY IM LẶNG (luật cứng).** Mọi bước phải để lộ *đang làm gì
  · vì sao · dựa trên số nào* NGAY KHI LÀM — không chạy một chuỗi dài rồi mới ngoi lên báo kết
  quả. Thứ nguy hiểm nhất không phải làm sai, mà là **làm sai trong im lặng**: user mất khả năng
  chặn giữa chừng, và khi phát hiện thì đã trôi qua hàng chục bước. Hệ quả bắt buộc: ① nói TRƯỚC
  mỗi cụm hành động, một dòng là đủ · ② mỗi khẳng định đi kèm nguồn đo được · ③ số đo lệch với
  dự đoán thì **nói ngay**, không dồn về bản tổng kết cuối · ④ việc chạy nền lâu phải báo đang
  chờ gì, không im tới lúc xong.
- **FILE TẠM PHẢI CÓ ĐƯỜNG CHẾT — không thứ gì được phình vô hạn.** Mọi thứ agent tạo ra để
  làm việc mà KHÔNG phải sản phẩm (script dò, dữ liệu đo, model tải về, ảnh chụp, bản sao thử)
  phải nằm trong **thư mục nháp của phiên**, không rải vào repo. Đo thật: một phiên làm việc
  nặng để lại **~4 GB** ở đó — model ONNX, cache model, profile trình duyệt — và không ai phát
  hiện cho tới khi đĩa đầy, vì thứ đó không nằm trong `git status` và không cổng nào soi.
  · Xong một phép đo mà biết chắc không dùng lại (model đã copy vào chỗ chính thức, cache của
    lượt dò đã kết luận) ⇒ **dọn ngay trong phiên**, đừng để dành "biết đâu cần".
  · Thứ đáng giữ (dữ liệu đo còn dùng để đối chiếu) thì giữ, nhưng phải NHỎ và nói rõ giữ vì gì.
  · **Máy canh, đừng dựa ai nhớ** (cùng doctrine `conform`/`structure-sync`): người dùng nói
    thẳng *"đợi t kiểm thì t ko nhớ và cũng lâu mới làm"*.
- **Chỉ làm đúng cái được yêu cầu.** Đụng logic khác → **hỏi trước**, không tự sửa rồi báo.
- **Yêu cầu không rõ ràng phải được làm rõ trước khi thực thi — cơ chế TỰ ĐỘNG, KHÔNG chờ user gọi "grill".** Kích hoạt khi: yêu cầu đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược. → Chạy skill **`.claude/skills/grill/`** (dừng · cái nào đọc code/docs ra được thì đọc · hỏi mỗi lần MỘT câu kèm đề xuất · chốt đủ rõ mới build). KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn; chỉ áp cho input user chưa đủ để thực thi đúng. (User gõ "grill" = ép chạy thủ công.)
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi yêu cầu rõ).
- **Thao tác xóa phải được user xác nhận trước.** Xóa file, code, hàm, lệnh, chức năng, nội dung docs hoặc folder được coi là bất khả đảo ngược: nêu đối tượng và lý do, chờ chấp thuận rồi mới thực hiện; không tự xóa rồi báo sau. Thành phần dư thừa hoặc không còn dùng: đề xuất, không tự xóa. Bổ sung/mở rộng không cần xác nhận; xóa/thu hẹp luôn cần.
- **CHƯA XÁC MINH THÌ CHƯA PHẢI SỰ THẬT — KHÔNG BỊA, KHÔNG SUY DIỄN (luật cứng).** Áp cho **mọi khẳng định**, không riêng con số: trạng thái hệ thống · nguyên nhân · "cái gì đang xảy ra" · "đã xong chưa". Mỗi khẳng định phải truy được về **nguồn kiểm được** (đọc file · chạy lệnh · gọi bề mặt thật · tra tài liệu ngoài). **Tra không ra ⇒ nói thẳng "không biết / chưa xác minh được"** và nêu đã thử đường nào — cấm lấp bằng suy đoán nghe hợp lý, vì *nghe hợp lý* chính là thứ làm nó lọt.
  Trước khi ① báo cáo một con số · ② kết luận "đã xong / chưa xong" · ③ xoá bất cứ thứ gì — phải đo lại bằng **đường thứ hai, khác cơ chế** với đường thứ nhất. Chạy đúng một lệnh rồi tin luôn là nguồn của gần như MỌI lần báo sai. Bốn dạng thường gặp: công cụ trả rỗng vì **hỏng lặng** (cờ sai ⇒ âm tính giả ⇒ kết luận "sạch") · **báo oan** do phép so lỏng (so chuỗi không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai bản chất** (một khoá phụ trỏ hụt ⇒ tưởng dữ liệu mồ côi, suýt xoá thứ đang sống) · **sổ nói khác code** (mục đã xong vẫn ghi "chưa làm"). Kiểm chéo = đổi công cụ (grep ↔ script đọc byte), đổi hướng (đếm xuôi ↔ đếm ngược), hoặc gọi bề mặt thật (DB ↔ API).
- **📋 SOÁT SỔ = ĐO LẠI TỪNG MỤC, KHÔNG ĐỌC RỒI CHÉP LẠI (luật cứng).**
  **ÁP MỌI LÚC — KHÔNG chờ chốt phiên.** Kích hoạt ngay khi user nói *"check todo"* · *"còn gì chưa làm"* · *"liệt kê ra"* · *"soát lại"* · *"plan/change tới đâu rồi"*, hay khi agent tự mở sổ giữa chừng. Phần lớn ca hỏng là GIỮA PHIÊN, ngay sau khi vừa xong một việc — đúng lúc dễ tưởng mình đang nhớ rõ nhất.
  - **Vì sao:** mỗi mục trong `05_TODO` là một **KHẲNG ĐỊNH VỀ TRẠNG THÁI** ("chưa làm", "chờ duyệt", "còn N mục") — mà khẳng định thì phải **truy được về nguồn kiểm được** (luật ngay trên). File `.md` là nguồn của *nội dung* (FILE WINS), **KHÔNG phải nguồn của sự thật hệ thống**. Đọc sổ rồi báo lại y nguyên = báo cáo chưa xác minh, dù chữ nằm trong file của chính mình.
  - **TRƯỚC khi liệt kê / báo cáo / hỏi user về bất kỳ mục nào — BA NGUỒN, CHẠY ĐỦ CẢ BA. KHÔNG chọn nguồn theo "loại mục".** Ba nguồn trả lời BA câu KHÁC nhau, không nguồn nào thay được nguồn nào:
    · **① MÃ — *"code hiện đang thế nào"***: grep · đếm · đọc đúng dòng. **Cấm suy từ mô tả.**
    · **② LỊCH SỬ QUYẾT ĐỊNH — *"đã từng quyết / làm gì"***: `zemory memory search --all`, **lọc riêng LỜI USER** (quyết định đến từ user, không từ agent). Quyết định hay nằm ở phiên khác, thậm chí **REPO KHÁC**.
    · **③ CHẠY THẬT — *"lúc chạy nó ra cái gì"***: gọi bề mặt thật (endpoint · lệnh · UI) · mở app nhìn tận mắt · đọc log/chẩn đoán của tiến trình ĐANG chạy. **Mã có mặt KHÔNG bảo đảm nó chạy đúng** — mã đúng mà cấu hình/dữ liệu sai thì hỏng LẶNG; còn lịch sử thì chỉ nói về quá khứ, không nói hiện tại.
    **CHỈ KHI CẢ BA KHỚP mới được kết luận.** Lệch nhau ⇒ **cái MỚI HƠN thắng**, và phải ghi rõ cái cũ đã bị thay — **lời nói của user CÓ HẠN DÙNG**: một quyết định cũ có thể bị chính việc làm sau đó supersede. Không chạm được nguồn nào (không mở được, mất mạng, chưa có quyền…) ⇒ ghi **"chưa xác minh được"** kèm nguồn đã thử — **KHÔNG** mặc định là "chưa làm", và **KHÔNG** lấy hai nguồn còn lại làm đủ.
    > ⚠ **Vì sao phải nói "đủ cả ba" thay vì liệt kê điều kiện:** bản cũ của chính luật này viết theo kiểu *"kiểm được bằng X ⇒ làm thế này · là quyết định ⇒ làm thế kia"* — đọc ra thành **bảng phân nhánh theo loại mục**, nên agent phân loại xong là rẽ MỘT nhánh rồi dừng. Đã trả giá thật, và trong cùng một ngày nó sai theo **hai hướng ngược nhau**: một mục chỉ chạy ① nên bỏ sót việc đã được sửa hai lần cùng một nguồn dữ liệu đã chết vẫn nằm trong bản quét; một mục khác chỉ chạy ② nên tin một câu user nói từ lâu rồi **gỡ mất một mục mà thực tế đã làm xong**. Cả hai đều lọt qua bản cũ **mà không vi phạm chữ nào**.
  - **Mục quá 7 ngày không ai đụng = NGHI NGỜ, không phải sự thật.** Đo trên một repo thật: soát 58 mục thì **11 sai (~19%)** — có mục đã làm xong vẫn mang dấu `[ ]`, có mục agent tự bịa vì thấy triệu chứng rồi phán nguyên nhân.
  - **Hỏi lại user một việc đã chốt là LỖI, không phải cẩn thận.** Nó bắt user trả lời hai lần cho cùng một câu và làm hỏng lòng tin vào cả bản danh sách.
  - **Máy phải canh, đừng dựa agent nhớ** (cùng doctrine `structure-sync`/`conform`): `zemory todo verify` đo lại từng mục bằng nguồn kiểm được (tên file/ký hiệu/bề mặt mà mục nêu có thật không · phép đo mục tự nêu có còn đúng không · nguồn đã đổi SAU khi dòng sổ được viết chưa) rồi in bảng LỆCH; exit khác 0 khi có lệch nên nối được vào cổng kiểm. Luật không có máy canh thì chỉ là lời hứa.
- **Test mới phải chứng minh mình ĐỎ ĐƯỢC.** Viết xong một test, hãy **phá code mà nó canh** rồi chạy lại: không đỏ ⇒ test đó chưa soi gì, phải sửa test chứ không phải mừng vì xanh. Hai lỗ điển hình: test chưa bao giờ chạy tới nhánh nguy hiểm, và test bị **bản sao logic ở nơi khác gánh thay**. Xanh KHÔNG phải bằng chứng (xem `.claude/skills/audit/` luật 1).
- **Nêu phản biện thiết kế trước khi thực thi** nếu phát hiện điểm bất hợp lý; quyết định cuối thuộc về user.
- **MỌI thiết kế UI/UX phải TRÌNH DUYỆT trước — KHÔNG tự ý (luật cứng).** Bất kỳ quyết định *thiết kế* giao diện — layout/kích thước/khung/màu/theme/hình dạng component/thêm-bớt phần tử UI/đổi style/cách sắp xếp — agent **KHÔNG tự chọn theo phán đoán riêng**: nêu ĐỀ XUẤT cụ thể (hoặc bản nháp/ảnh) → chờ user gật rồi mới làm. Sửa *bug/kỹ thuật* (căn lệch, tràn, lỗi) thì cứ sửa; nhưng đụng tới *hình hài thiết kế* là phải hỏi. User giao một hướng nhưng còn để hở chi tiết thiết kế → trình phương án cho phần hở, đừng tự quyết. (Đi cặp với "Chỉ làm đúng cái được yêu cầu".)
- **Skill là THAM KHẢO cho khuyến nghị, KHÔNG auto-apply.** Trước khi thiết kế/nắn UI (hay việc skill phủ) → ĐỌC skill → rút khuyến nghị (nên theo / đang kẹt / nên chuẩn hoá) → TRÌNH user; đổi vẫn theo luật "thiết kế UI phải duyệt trước". User có ý tưởng UI mới cũng check skill gợi ý lại. Quy trình đầy đủ: `04_SKILLS` §1.

> *(Luật THIẾT KẾ/UI cụ thể — Dialog 3-size, ESC mọi dialog, token-first… — KHÔNG ở đây: RULES là luật LÀM VIỆC chung. Convention thiết kế ở `03_STRUCTURE §5`. Ở đây CHỈ là luật hành xử "phải hỏi trước".)*
