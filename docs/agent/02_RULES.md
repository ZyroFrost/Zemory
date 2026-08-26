<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — Quy tắc làm việc

> AI đọc file này SAU `01_CONSTITUTION.md` (hiến pháp — bất biến riêng của zemory, tối cao). Tuân thủ tuyệt đối.
> Điều hướng mở phiên (đọc gì, thứ tự nào): `AGENTS.md` ở root. Quy trình thao tác chi tiết nằm ở **`.claude/skills/<tên>/SKILL.md`** (sổ đăng ký: [`04_SKILLS.md`](04_SKILLS.md)); RULES/STRUCTURE chỉ nêu NORM + trigger rồi dẫn chiếu. Backlog: `05_TODO.md`. Changelog: `06_CHANGES.md`.

## Cấu trúc repo — xem `03_STRUCTURE.md`
**Chuẩn cấu trúc folder ĐẦY ĐỦ** (cây từng-dòng + routing "sửa gì → vào đâu" + convention) nằm ở **[`03_STRUCTURE.md`](03_STRUCTURE.md)** — **đọc TRƯỚC khi sửa/tạo folder**; cần sửa gì → `03 §4` trỏ THẲNG slot (KHÔNG grep cả repo — HP điều 1). Nắn repo về chuẩn → skill **`.claude/skills/reconcile/`**.

- **`03_STRUCTURE` là INDEX phải KHỚP code (luật làm việc):** mọi thay đổi cấu trúc (thêm/đổi/dời slot, thêm routing) phải cập nhật `03_STRUCTURE` trong CÙNG thay đổi đó — index lệch code = tra sai. *(Nội dung chuẩn — BẮT BUỘC=4, 1 tên/concern, tracked-vs-gitignore… — nằm ở `03`, KHÔNG lặp ở đây.)*
- **SỬA BẤT CỨ GÌ (backend · frontend · docs · config · test) → PHẢI đúng CHUẨN ĐÃ CHỐT (luật cứng).** Trước/trong khi tạo·đổi·dời file hoặc viết code: đối chiếu `03_STRUCTURE` (slot · routing · convention · UI §5/§9) + `01_CONSTITUTION` (bất biến) + `02_RULES`. **TUYỆT ĐỐI không sửa SAI chuẩn** (đặt file sai slot, đẻ tên mới cho concern đã có tên, hardcode màu/chuỗi, UI phá luật §5…). Không chắc chuẩn ở đâu → tra `03 §4`/§9 hoặc HỎI, đừng đoán. Thấy chỗ ĐANG lệch chuẩn → nắn về chuẩn (hoặc BÁO nếu lớn/khó đảo), KHÔNG nhân thêm cái sai lên.

## Luật khi VIẾT (BẮT BUỘC — luật cứng)

> Những luật này nổ **lúc viết code**, không phải lúc tạo folder — và `zemory conform` **không kiểm được**
> cái nào trong số chúng. Không biết = vi phạm âm thầm, không gate nào kêu. Vì vậy chúng ở đây (luôn nạp),
> chứ không ở `03_STRUCTURE` (tra khi cần). Nguyên văn, dời từ `03 §5` ngày 2026-07-29 — `03` KHÔNG còn giữ bản sao.

```
SQL — 1 CÁCH         mặc định store/queries.* (gom, đặt tên, gọi theo tên); resources/sql/ CHỈ khi cố ý tách file .sql. KHÔNG rải inline
Secret               config/ + .env.example chỉ trỏ TÊN env (password_env); pass THẬT ở .env/vault → data/secrets/. KHÔNG commit
Sync bundle qua git   ngoại lệ CÓ CHỦ ĐÍCH của luật data/=gitignore: bundle MÃ HÓA cần đi qua git để đồng bộ xuyên máy (git-lfs) → TRACKED ở root share/ (đã mã hóa, không phải plaintext secret) — không nhét vào data/ (data/ không sync qua git)
Setting UI kéo-thả   default ship → frontend/config/ (tracked); bản user chỉnh runtime → data/settings/ (gitignore)
Panel resize (LUẬT)  **MỌI vùng có ≥2 panel kề nhau PHẢI có thanh kéo (resize handle) chỉnh được kích thước — KHÔNG có ngoại lệ** (user chốt 2026-07-22, "làm ơn thêm vào luật chung, tui ko nhắc nữa"). Ràng buộc: **① Tự do THẬT** — seam phải điều khiển một biến layout THẬT (kéo là đổi), CẤM seam "trang trí" (cột `2fr`/`1fr` cứng = kéo không đổi gì = SAI). **② Bố cục 2D → kéo cả 2 chiều** (2 panel cạnh nhau = seam DỌC chỉnh bề ngang; 2 panel trên-dưới = seam NGANG chỉnh chiều cao; lưới 2×2 = có cả hai). Không được chỉ cho co 1 chiều. **③ MỘT engine dùng chung** — mọi seam đi qua CÙNG một cơ chế (1 hàm init + 1 kiểu handle + biến/clamp data-driven), KHÔNG mỗi chỗ một nhánh `if(type===…)` hardcode (đó là nguồn "vá chỗ này lủng chỗ kia"). Thêm seam mới = khai báo dữ liệu, KHÔNG chép logic. **④ Lưu + khôi phục** y nguyên qua phiên (server config, như dialog). **⑤ Dựng lại (double-click) về mặc định.** Ngưỡng min/max theo nội dung tối thiểu mỗi panel, KHÔNG số ma rải rác
Dialog / modal       CHỈ 3 size S/M/L, cả 3 CÙNG MỘT TỈ LỆ CHUẨN MÀN HÌNH **16:9** (khung landscape cân đối như màn, KHÔNG phải hộp dài-thòng đứng). **Mỗi size = một % của KHUNG APP theo CẢ HAI CHIỀU** (16:9), công thức `width: min(Pvw, calc(Pvh*16/9))` + `aspect-ratio:16/9` ⇒ đúng P% trên màn 16:9, nhỏ hơn (không tràn) trên màn lệch tỉ lệ: **S 40% · M 60% · L 90%** (user chốt 2026-07-21; Settings = L). 3 size = 3 SCALE cùng tỉ lệ; S không đủ → chọn M/L, **vẫn đúng 16:9, KHÔNG bóp méo**. **KHUNG KHÔNG BAO GIỜ NHẢY theo nội dung** (đổi tab Settings mà khung phình/co = SAI); tràn → cuộn TRONG dialog (`overflow:auto` ở thân, thân là grid/flex child phải `min-height:0` mới cuộn). KHÔNG cố-định-Nvh (đẻ hộp cao méo), KHÔNG random/đổi-động/reflow loạn. Trạng thái layout user chỉnh (resize/vị-trí/size) phải LƯU + khôi phục y nguyên. Token/size ở frontend/styles/. **ESC LUÔN đóng dialog trên cùng** (mọi overlay/popup phải đăng ký 1 global keydown; ESC đóng MỘT lớp/lần theo thứ tự visually-topmost) + bấm nền (backdrop) cũng đóng — TRỪ dialog đang chạy tác vụ bất-khả-huỷ (vd sync đang chạy) thì chặn cả ESC lẫn backdrop cho tới khi xong
Test                 KHÔNG bắt buộc — chạy chính app = phép kiểm thử; folder test chỉ cho lõi logic dễ sai ngầm (search/migration/privacy). FE: e2e/story co-locate hoặc frontend/test
Version              git=source(tag/branch) · dist+Releases=build · data/snapshots=data · migrations=schema · 06_CHANGES=log. KHÔNG folder versions/ chép tay. **Bump RELEASE-BASED (như SasinFlow): số version chỉ tăng khi RELEASE/deploy 1 bản, KHÔNG bump per-commit/per-feature; USER quyết số (semver M.m.p — minor=tính năng, patch=fix deploy); mọi việc giữa 2 release GOM vào version kế; nguồn số = `package.json`(Node)/`__version__`(Py) — 1 chỗ; release-notes = `06_CHANGES`**
2 KIỂU version-up     ① TỰ ĐỘNG (app tự check+tải+apply) → backend/src/update/ (phối attic/+dist/+migrations/). ② THỦ CÔNG (chốt bản X, up máy đích/VM) → git tag → dist/ build → backend/scripts/deploy.* → backup bản đang chạy về attic/ TRƯỚC khi đè → rollback nếu hỏng. Dùng hạ tầng có sẵn, KHÔNG concern mới
Bề mặt CHẾT THEO nền  **Mọi bề mặt phụ thuộc một tiến trình nền (cửa sổ app · tab · panel · CLI chờ) PHẢI phát hiện nền chết và CHẾT THEO — hoặc báo lỗi THẤY ĐƯỢC. TUYỆT ĐỐI không để lại vỏ rỗng trông như đang sống** (user chốt 2026-08-10 sau ca daemon chết mà cửa sổ vẫn mở: mọi nút bấm gửi request vào chỗ trống, vòng xoay "đang sync…" quay MÃI, user đọc thành "kẹt" và chờ hàng giờ trong khi KHÔNG có gì đang chạy). Vỏ rỗng là kiểu hỏng TỆ NHẤT — nó không báo lỗi, nó NÓI DỐI, và người dùng không có cách nào phân biệt với đang-chạy-thật. Cách làm: nhịp tim định kỳ tới nền; chịu lỗi có chủ đích (chỉ đếm SAU khi đã thấy nền sống ít nhất một lần, và phải trượt LIÊN TIẾP N nhịp mới kết luận — nền bận một nhịp ≠ nền chết); hết N nhịp thì đóng/ báo. Đối xứng với luật fail-open (HP điều 9): lớp phụ hỏng thì rơi về lớp dưới **và nói ra**, không giả vờ vẫn chạy
Separator của INDEX   ⛔ ĐỪNG "dọn cho đẹp": chỉ mục docs lưu đường theo separator của OS (`docs\agent\05_TODO.md`), KHÔNG posix — đo 2026-08-24: **51/51 doc row dùng `\`**, và mọi chỗ TRA cũng ghép bằng `join`. Đợt vét 07/08 từng chuẩn hoá sang `/`, hậu quả đo được: `plan ls` IM LẶNG báo "index rỗng" dù chỉ mục đủ, và `reindex` lần sau đẻ doc row TRÙNG. Muốn đổi = một MIGRATION riêng (đổi index cũ + mọi chỗ tra trong CÙNG một bước), không phải việc dọn dẹp lẻ
Backup deploy 2 CHIỀU  KHÔNG chỉ push 1 chiều. Máy đích có backup lần trước → verify khớp attic/ local TRƯỚC khi đè (lệch = có sửa tay ngoài luồng, điều tra trước); deploy xong kéo bản-vừa-thay về attic/ local. Cùng nguyên lý additive-merge của memory sync/share.ts
```
## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- **Văn phong harness = KỸ THUẬT / QUY PHẠM, KHÔNG văn nói.** Hiến pháp, rules, structure và plan viết dạng đặc tả: câu mệnh lệnh ngắn gọn, thuật ngữ chính xác, nêu điều kiện → hành vi. Không dùng khẩu ngữ, câu cảm thán, ví dụ hội thoại, hay lối kể chuyện phiếm.
- **UI · CLI output**: **English HOẶC i18n đủ 2 dict** (song ngữ, đổi qua nút setting) — **0 chuỗi hardcode** (mọi chuỗi người-dùng-thấy đi qua i18n, có cả 2 bản). **Thuật ngữ kỹ thuật / chuyên ngành nặng GIỮ NGUYÊN, KHÔNG dịch** (vd Recall · Hybrid · FTS5 · vector · embed · token — dịch ra làm sai nghĩa). Chi tiết cổng chất lượng i18n → `03_STRUCTURE §9.D` (nguồn duy nhất, không lặp).
- **code · comment công khai**: **TIẾNG ANH** — không nhét tiếng Việt vào code/comment người khác đọc.
- **CHỮ NGƯỜI DÙNG ĐỌC PHẢI ĐẦY ĐỦ VÀ ĐÚNG — bốn ràng buộc, áp lúc VIẾT (user chốt 2026-08-21).**
  Luật đứng ở đây vì chín mặt của `audit` đều soi MÁY; không mặt nào soi thứ **người đọc nhận**, và
  một lỗi chữ thì không gate nào kêu — nó chỉ hiện ra trước mặt người dùng.
  · **① Có dấu, đúng chính tả.** Docs tiếng Việt phải CÓ DẤU (vế trên) và không mang mojibake
    (UTF-8 bị đọc thành Latin-1: `Ã¡` · `â€` · `ï»¿`). Chữ ASCII-không-dấu CHỈ hợp lệ khi buộc phải
    vậy (vd file chốt của hook in ra console không chắc encoding) — và phải nói rõ lý do tại chỗ.
  · **② Nhãn ĐỦ, máy đọc được.** Mọi phần tử tương tác (nút · ô nhập · select · link) phải có nhãn
    mà **công cụ đọc được**: nội dung chữ, hoặc `aria-label`/`title`/`placeholder`; ảnh có `alt`.
    Nút icon trơn không nhãn là **thiếu**, không phải "gọn".
  · **③ Song ngữ ĐỦ HAI ĐẦU.** Vế "0 chuỗi hardcode" ở trên áp cho **cả chữ nằm thẳng trong
    HTML/markup**, không riêng chuỗi trong code: text node và cả `title`/`placeholder`/hint phải
    có móc i18n tương ứng, mọi khoá phải tồn tại ở **cả hai** dict. Chữ một ngôn ngữ nằm trong
    markup mà thiếu móc = người dùng đổi ngôn ngữ xong **vẫn thấy tiếng cũ**, và không lỗi nào nổ.
  · **④ UI phải KHỚP CODE, và kiểm bằng GRAPH chứ không bằng mắt.** Bề mặt gọi tới đâu thì chỗ đó
    phải có thật, và ngược lại: cạnh seam `api` của graph đối chiếu route FE gọi với route BE thật
    ⇒ ① FE gọi route không tồn tại = UI gãy · ② endpoint không ai gọi = bề mặt chết. Đây là phép
    KIỂM ĐƯỢC BẰNG MÁY, nên không có lý do để nó chỉ nằm trong đầu ai đó.
  *(Cách đo + **bẫy báo oan** của từng phép — danh sách từ không dấu, láy đôi, `\b` ASCII, nhãn ở
  thẻ con, khoá i18n truyền qua biến, route ghép động — nằm ở `.claude/skills/audit/` mặt ⑪:
  luật nói PHẢI ĐÚNG GÌ, skill nói ĐO THẾ NÀO cho khỏi báo oan.)*

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `01_CONSTITUTION.md` | hiến pháp — bất biến riêng của zemory | CHỈ user chốt; agent HỎI trong phiên (§Sổ việc) |
| `04_SKILLS.md` | **sổ ĐĂNG KÝ** skill: một dòng mỗi skill + luật dùng. Playbook nằm ở `.claude/skills/<tên>/SKILL.md` | khi thêm/bớt một skill |
| `05_TODO.md` | backlog | **chỉ việc USER đã gật** — luật vào/ra ở §Sổ việc `05_TODO` bên dưới |
| `06_CHANGES.md` | changelog | mỗi lần sửa code; **chỉ ghi sau khi user xác nhận OK** (viết tay đúng format `## [YYYY-MM-DD] — tiêu đề`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế |

- **Docs = FILE là nguồn (FILE WINS):** viết/sửa `.md` trực tiếp BÁM CHUẨN (đúng file, đúng vai trò, changelog đúng format `## [YYYY-MM-DD] — tiêu đề`); **xong là xong** — file là nguồn, KHÔNG cần chạy gì thêm. Muốn `plan search`/`changelog search` tươi thì chạy `zemory reindex` (đọc `.md` → dựng lại search index, **KHÔNG ghi ngược file**). Các lệnh ghi DB→md kiểu cũ (render/set/add) **đã gỡ hoàn toàn** — docs chỉ sửa bằng tay. *(HP điều 3 — sửa đổi 2026-07-16)*
- **Đồng bộ bắt buộc — constitution ↔ rules ↔ todo ↔ change ↔ plan luôn khớp:** mỗi thay đổi → TODO phản ánh việc, CHANGES ghi log (sau khi OK), plan cập nhật nếu đổi thiết kế. Không để lệch nhau (đây là khớp NỘI DUNG giữa các FILE, không phải chạy sync).
- **Mỗi file harness làm ĐÚNG MỘT việc — KHÔNG lặp nội dung file khác.** `01` hiến pháp (bất biến kiến trúc) · `02` luật làm việc · `03` chuẩn cấu trúc folder · `04` sổ đăng ký skill (playbook → `.claude/skills/`) · `05` backlog · `06` changelog. Một nội dung chỉ sống ở ĐÚNG MỘT nhà; file khác cần thì **DẪN CHIẾU** (link + số hiệu), KHÔNG chép lại. Đọc hết 6 file KHÔNG được thấy nội dung trùng — trùng lặp / lạc chỗ = agent đọc bị loạn.
- **Plan (`docs/plan/`) — chỉ chứa SPECS:** KHÔNG todo (→ `05_TODO`, qua cửa vào ở §Sổ việc), KHÔNG luật (bất biến/luật riêng → **HỎI user**; plan chỉ dẫn chiếu điều khoản). Chuẩn đặt tên `NN_tên.md` (`00`=overview): xem `03_STRUCTURE §5`.
- ### SỔ VIỆC `05_TODO` — LUẬT DUY NHẤT, phủ cả cửa VÀO lẫn cửa RA (luật cứng)
  > Mọi luật về sổ việc sống Ở ĐÂY. File khác cần thì **dẫn chiếu** mục này, KHÔNG chép lại và
  > KHÔNG đặt thêm luật riêng cho sổ ở chỗ khác — đó chính là cách bộ luật tự đá nhau.

  **① CỬA VÀO — agent KHÔNG tự thêm mục. Phải HỎI, và phải ĐÁNG.** *(user chốt 2026-08-23)*
  Agent không tự phát sinh: mục `05_TODO` mới · luật/điều khoản mới · cổng test · bộ đếm · bộ đo ·
  lớp cảnh báo · mục advisory. Thấy cần ⇒ **hỏi MỘT câu kèm đề xuất ngay trong phiên**; user gật
  thì mới ghi, gật vào đâu ghi vào đó (`01` luật · `02` luật làm việc · `05` việc).
  - **Đề xuất KHÔNG được "đậu" vào sổ chờ duyệt.** Đây là vế bị **BÃI BỎ** — xem 🔄 bên dưới.
  - **Ngưỡng: THỰC SỰ QUAN TRỌNG.** Lắc nhắc thì bỏ qua — không ghi sổ, không dựng cổng, không
    thêm dòng cảnh báo. Sổ và bộ gác là **tài sản chung có giá**: mỗi dòng thêm vào là thứ MỌI
    phiên sau phải đọc *và* phải soát lại.
  - **Thêm một lớp là thêm một chỗ hỏng.** Bộ đo không làm hệ tốt lên, nó chỉ nói hệ đang thế nào.
    Ba ca thật của repo này đều sinh từ một lượt *"thêm cho chắc"*: `archive` nuốt cờ lạ rồi chạy
    thật · guard đọc TÊN FILE thành lệnh push nên chặn luôn chính lệnh đi soi cờ · bộ dò mojibake
    báo oan trên đúng file dạy về mojibake. **Bộ gác tự bẫy chính mình.**
  - **Trước khi thêm bất cứ thứ gì, trả lời đủ ba câu:** ① **gỡ bớt** được cái gì không · ② **gộp**
    vào cổng/luật đã có được không · ③ **không có nó thì hỏng cái gì**, đo được không.
    Không trả lời được ③ ⇒ **KHÔNG LÀM**. (Hướng đúng là TỐI ƯU, không phải BỒI ĐẮP — HP điều 1.)
  - **KHÔNG áp cho:** việc user giao · sửa thứ đang hỏng · nghĩa vụ mà luật SẴN CÓ đã bắt buộc
    (vd HP điều 12 đòi gate trước khi bật mặc định). Ba ca đó cứ làm, không phải xin.

  **② CỬA RA — XONG MỘT VIỆC LÀ ĐÓNG NGAY, không đợi chốt phiên.** Ngay khi một mục xong, làm đủ
  ba bước **trong cùng lượt đó**: ① **ĐO LẠI** theo §Hành xử *"SOÁT SỔ = ĐO LẠI"* (mã · Global
  Memory · chạy thật) — *"tôi vừa làm nên tôi biết"* **KHÔNG** phải bằng chứng, và đây đúng chỗ hay
  sai nhất: phần lớn ca hỏng là GIỮA PHIÊN, ngay sau khi vừa xong một việc · ② ghi sang
  `06_CHANGES` · ③ **xoá mục khỏi `05_TODO`** (hoặc `zemory archive` dời sang `archive/`).
  *(Chốt phiên vẫn chạy `archive` như lưới vét cuối — `.claude/skills/session-close/` Bước 3 —
  nhưng lưới đó để hứng phần đã dồn, KHÔNG phải chỗ để dồn.)*

  **Số đo — vì sao cả hai cửa đều cần luật:** cửa ra đo 2026-07-29 **107 mục đã xong chiếm 46%**
  một file luôn-nạp; soát 2026-08-05 **11/58 mục sai (~19%)**. Cửa vào đo 2026-08-23: **89 mục còn
  mở · 1.658 dòng · 104 file test**, trong đó **18 mục "ĐỀ XUẤT" chờ user** — loại này **không bao
  giờ đóng được bằng cửa ra**, vì chúng không phải việc chưa làm, chúng là câu hỏi chưa ai trả lời.
  Có cửa ra mà không có cửa vào thì sổ chỉ có một chiều: phình.

  > 🔄 **BÃI BỎ vế *"agent ghi ĐỀ XUẤT vào `05_TODO` chờ user duyệt"*** (từng nằm ở
  > `01_CONSTITUTION §Sửa đổi hiến pháp`, §Chốt phiên bên dưới, và skill `audit`/`session-close`).
  > Vế đó **chính là cỗ máy** đẻ ra 18 mục treo: nó dạy agent *đậu* thay vì *hỏi*, mà đậu thì không
  > có đường ra. Nay: **hỏi trong phiên, user gật mới ghi.** Không gật ⇒ không tồn tại dòng nào.
- **Tra log sâu:** việc/lỗi/quyết định ở phiên khác → `zemory memory search "<q>" [--all]` (recall on-demand; đừng tra bừa).

## Chốt phiên / ghi sổ (BẮT BUỘC — luật cứng)
**Kích hoạt khi user nói:** "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt** — quy trình đầy đủ (đọc lại 3 nguồn: FULL phiên hiện tại + FULL `docs/plan/*` + FULL `docs/agent/*` → định tuyến từng thứ về đúng file → chuẩn "không bỏ sót" → bước cuối `zemory validate`) ở skill **`.claude/skills/session-close/`**. Bất biến: mọi việc đã làm phải tìm được ở `06_CHANGES` **hoặc** `05_TODO`; đổi thiết kế → `docs/plan/*`. **Chẩn đoán sai · đường cụt · luật riêng phát sinh: NÓI trong báo cáo phiên, KHÔNG tự ghi thành mục** — muốn vào sổ thì hỏi (§Sổ việc `05_TODO`, cửa vào). Không tự `git push` (§Git).

- **Global Memory là NGUỒN của phiên (BẮT BUỘC verify):** episodic sống sót qua context-trim, còn trí nhớ trong context thì bị lược → khi ĐỔI SESSION / ghi docs / audit / báo cáo, PHẢI dò Global Memory (`zemory memory search`/`digest <session>`) + đối chiếu code THẬT để **verify TỪNG mục TRƯỚC khi ghi hay khẳng định** — không ghi/báo theo trí nhớ tóm tắt hay kết quả subagent chưa kiểm. Đây là chốt chặn "đổi session là sót/lệch". Chi tiết: `.claude/skills/session-close/` Bước 0.

- **Soát/ghi `05_TODO` · `06_CHANGES` · `plan/` lúc chốt phiên → áp luật §Hành xử *"SOÁT SỔ = ĐO LẠI"*** (luật đó áp **MỌI LÚC**, không riêng lúc chốt).

## Changelog — supersede
- Mới nhất ở trên cùng (chèn ngay sau header).
- Entry **đảo/thay** quyết định cũ → mở đầu bằng: `> 🔄 **Supersede:** thay [YYYY-MM-DDx] — "[đề mục]" — [lý do].` **Phải nêu ĐÚNG khoá ngày của entry bị thay** (`2026-07-29l`, y như heading của nó): đó là thứ DUY NHẤT máy nối được, và nối rồi thì ai tra trúng entry CŨ mới thấy nhãn “⚠ ĐÃ BỊ THAY”. Viết trống ngày ⇒ quyết định đã chết vẫn hiện ra như đang sống. Ngày trần khi hôm đó có nhiều entry (`29e`/`29f`) ⇒ **bỏ qua, không đoán**. Không sửa/xoá entry cũ; tuỳ chọn thêm `> ⤴ Đã bị thay bởi [ngày].` ở entry cũ.
- **Entry NGẮN — trần ~30 dòng (luật, không phải gợi ý).** Một entry chỉ cần ba thứ: **đổi gì · vì sao · số đo**. Chi tiết thiết kế → `docs/plan/NN_*`; tường thuật quá trình → bỏ. Lý do là số học: ở `changes_keep` ~180 dòng thì **bốn** entry 50 dòng chiếm trọn vùng active, tức viết dài làm chính cơ chế archive thành vô nghĩa. `zemory validate` báo entry vượt trần (advisory) — đo trên 76 entry thật: p50 19 dòng, nên 30 là rộng rãi với một entry bình thường.

## Phạm vi project (BẮT BUỘC — luật cứng)
- **CHỈ làm việc trong project folder đang mở.** TUYỆT ĐỐI KHÔNG ghi/sửa/chạy lệnh đụng vào project khác (kể cả lệnh `zemory` trỏ root khác, `cd` sang repo khác, sửa file bên đó) khi user CHƯA cho phép rõ ràng trong phiên — **kể cả với ý định "giúp"/"cứu dữ liệu"/"tiện tay sửa luôn"**.
- Thấy cần đụng project khác → **DỪNG, HỎI TRƯỚC**: nêu rõ định làm gì, ở đâu, vì sao; user gật mới làm. Project khác có thể đang có agent/phiên khác làm việc — đụng chéo gây xung đột dữ liệu.
- Đọc-tham-khảo (read-only) project khác để trả lời câu hỏi thì được; **mọi thao tác GHI là cấm mặc định**.
- **Vế ngược — bạn đang ĐỨNG TRONG repo tham khảo:** mở một repo khác chỉ để **xem/copy chuẩn** (vd `zemory` — nơi chứa bộ chuẩn gốc) thì **CHỈ ĐỌC**. Lệnh `zemory` **GHI theo cwd**: chạy `init`/`sync`/`reindex`/`archive`/`memory scan` khi đang đứng ở repo đó = **ghi vào repo đó + DB của nó**, không phải vào project bạn. Lấy chuẩn = **đọc `docs_template/`** (bản mẫu TRẮNG — KHÔNG phải `docs/`, đó là docs RIÊNG của repo chuẩn như zemory) **rồi chạy lệnh Ở REPO CỦA BẠN**.

## Git (BẮT BUỘC — luật cứng)
- **KHÔNG `git push` khi user CHƯA cho phép.** Git remote là **nguồn BACKUP CUỐI CÙNG** của project — đẩy lên là ra ngoài, không gỡ lại được (gỡ = force-push, càng phá). Xong việc → build + test + **BÁO CÁO rồi DỪNG**; user bảo "push"/"lên git" mới đẩy.
- **MỖI LẦN PUSH = MỘT LẦN LÊN VERSION — và SỐ do USER chốt (user chốt 2026-08-05).** Push là mốc phát hành (khớp luật Version release-based ở §Luật khi VIẾT): trước khi đẩy, agent ① kiểm file sạch (gate/lint những gì chạy được, `git status` không lọt data/secret) + rà `05_TODO` còn gì phải đóng, ② **HỎI user số version** (đề xuất theo semver: minor=tính năng, patch=fix — nhưng quyền chốt là của user), ③ bump `package.json` + commit + push trong cùng một mốc. KHÔNG push với số cũ, KHÔNG tự quyết số.
- **Ghi sổ ≠ publish:** user bảo ghi changelog / commit / "xong rồi" **KHÔNG phải** là cho phép push. Đừng suy diễn.
- Commit cục bộ (đảo được) thì thoải mái theo phong cách repo; **push mới là cửa cần phép**.
- Sửa code chạy trên máy này **không cần push** — build là bản mới sống ngay.
- KHÔNG `--force`, KHÔNG rewrite lịch sử đã push, KHÔNG `reset --hard`/`clean` lên việc chưa commit của user nếu chưa hỏi.

## Guardrail lớp ① — luật bất khả đảo phải có CHỐT MÁY (áp chuẩn 2026-08-07, hấp thụ từ OpenRCA plan 08 §4b)
- Luật mà vi phạm là **KHÔNG đảo được** (secret vào commit · ghi vào đường cấm · `git push` chưa xin) **không được chỉ có chữ gác** — chữ là tầng quan sát, phát hiện SAU, không ngăn được lúc xảy ra (bằng chứng: secret lên GitHub 04/08 bên repo tham chiếu dù hiến pháp bên đó ĐÃ có chữ cấm).
- **`zemory hook guard`** sinh bộ chốt vào `<nhà harness>/hooks/` từ marker (`protected` / `secretNames`): `policy.json` · `guard.cjs` (PreToolUse, chặn TRƯỚC khi chạm đĩa/mạng) · `precommit-guard.cjs` (chặn secret vào staging). **User duyệt rồi tự nối vào runtime — tool không tự cắm.** Flag `.allow-*` = user duyệt **MỘT VIỆC**: guard cho qua rồi **đóng dấu** `ZEMORY-USED <vân tay lệnh> <thời điểm>` vào chính file flag — **KHÔNG xoá ngay**, vì hook `PreToolUse` chỉ nói *cho qua* chứ không biết lệnh có thật sự chạy (một tầng khác của host chặn lại là flag mất oan — đo 2026-08-20 lúc push 2.0.0). Trong **90 giây**, ĐÚNG lệnh đó thử lại được; xin việc KHÁC hoặc quá hạn ⇒ **thu hồi**, phải xin lại. *(Câu cũ "dùng một lần tự xoá" sai hành vi thật và đã làm một agent tưởng có lỗ, suýt ghi lỗ ma vào chuẩn dùng chung — sửa 2026-08-26.)* Nhóm secret KHÔNG có flag. `zemory doctor` nhắc khi repo khai `protected` mà chưa sinh chốt.
- Ship trong template app/nonapp/adapt (`02_RULES §Guardrail lớp ①` của từng bộ) — và **từ 2026-08-10 ship cả cho cowork**.
  > 🔄 **Đảo vế cũ** *"bộ cowork CỐ Ý không mang — không bảo đảm có CLI lẫn hook PreToolUse"*. Vế đó chỉ đúng MỘT NỬA: đo lại thì `guard.cjs` dùng **thuần `node:fs`+`node:path`**, CLI chỉ cần lúc SINH chứ không cần lúc CHẠY ⇒ ship **bản đã sinh sẵn** là hết phụ thuộc CLI. Chỉ còn phụ thuộc hook của host, mà thiếu hook thì file nằm im **vô hại** và ăn ngay ngày host có — tốt hơn hẳn không ship gì. Lý do đảo (user chốt): bộ cowork **phụ thuộc hoàn toàn vào luật chữ**, mà chữ thì **agent quên được**. Bộ cowork nhận `hooks/guard.cjs` + `policy.json` với `protected_write = data/*/01_raw · docs/agent`.
- **VAI CỦA HOOK: LƯỚI ĐỠ, KHÔNG PHẢI NGƯỜI QUYẾT (user chốt 2026-08-11).** Mọi hook guardrail
  tồn tại để **đỡ lúc agent đọc sót hoặc quên luật** — nó KHÔNG phải cơ chế cấm xoá, và **càng
  không phải giấy phép**. **Quyền quyết định xoá luôn thuộc USER: phải hỏi và được đồng ý TRƯỚC,
  bất kể hook có chặn hay không.** Hai hệ quả phải nhớ, vì cả hai đều là cách hiểu sai tự nhiên:
  · **Hook cho qua ≠ được phép.** Lưới chỉ bắt được thứ nó biết trước — đo 2026-08-11: xoá **một
  file thường** cố ý CHO QUA để gate khỏi thành nhiễu, nhưng nó vẫn là thao tác bất khả đảo và
  vẫn phải hỏi user. Lấy "guard không kêu" làm bằng chứng được phép là **đọc ngược ý nghĩa của gate**.
  · **Hook chặn ≠ hết việc.** Bị chặn thì đi HỎI USER, không phải đi tìm đường vòng hay tự tạo flag;
  flag `.allow-*` chỉ được tạo SAU khi user nói rõ trong phiên.
  Cùng doctrine với `§Hành xử` (*"thao tác xoá phải được user xác nhận trước"*): **chữ là tầng
  QUYẾT ĐỊNH, máy là tầng ĐỠ HỤT** — bỏ một tầng thì tầng kia không gánh thay được.
- **`protected_write` nhận GLOB, không chỉ tiền tố** (2026-08-10): `data/*/01_raw` diễn đạt được "đầu vào gốc của MỌI case" — thứ tiền tố không nói nổi vì tên case không biết trước. Thiếu nó thì hoặc liệt kê tay từng case (không ai bảo trì nổi), hoặc chặn cả `data` (chặn luôn chỗ agent ghi suốt ⇒ gate bị bỏ qua).

## Hành xử
- **HIỆN SUY NGHĨ TỪNG BƯỚC — CẤM CHẠY IM LẶNG (user chốt 2026-08-12, luật cứng).** Mỗi phiên
  mới, mọi bước phải để lộ *đang làm gì · vì sao · dựa trên số nào*, ngay khi làm chứ không phải
  dồn vào bản tổng kết cuối. Không được chạy một chuỗi dài rồi mới ngoi lên báo kết quả.
  **Vì sao thành luật:** thứ nguy hiểm nhất không phải làm sai, mà là **làm sai trong im lặng** —
  user mất khả năng chặn giữa chừng, và khi phát hiện thì đã trôi qua hàng chục bước. Đúng ba ca
  đã trả giá trong phiên 2026-08-12: lỗi bỏ đói autosync câm **2 giờ 34 phút** vì log không tới
  đĩa · lệnh clone-sạch in ra *"DỰNG ĐƯỢC"* trong khi nó vừa chết (mã thoát bị `| tail` nuốt) ·
  chở hụt 75% vector với `rejected=0`, không một dòng nào báo. Cả ba đều là **im lặng**, không
  phải lỗi khó.
  **Hệ quả bắt buộc:** ① nói TRƯỚC mỗi cụm hành động, một dòng là đủ · ② mỗi khẳng định đi kèm
  nguồn đo được · ③ đo xong mà số lệch với dự đoán thì **nói ngay**, không đợi tới cuối · ④ việc
  chạy nền lâu phải báo đang chờ gì, không im tới lúc xong.
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
  Ở repo này việc canh đã là CODE: `scratchTick` trong scheduler quét thư mục nháp mỗi 6 giờ,
  dọn phiên quá 7 ngày hoặc khi tổng vượt 2 GB (cũ nhất trước). Bốn ràng buộc an toàn có gate
  riêng: chỉ nhận đúng khuôn `<project>/<session>/scratchpad` · không đụng phiên đang chạy ·
  không đụng thư mục vừa ghi trong 6 giờ · fail-open.
- **🔴 `.gitignore` là GIẤU, KHÔNG phải DỌN — và rác nằm TRONG repo phải chết trong cùng lượt.**
  *(luật thêm 2026-08-24 từ số đo thực địa; đi cặp với bullet FILE TẠM ngay trên.)*
  · **File nháp ghi vào thư mục nháp NGOÀI repo.** Buộc phải ghi trong repo (công cụ ép đường dẫn,
    script cần cwd) ⇒ đặt tên `_scratch_*` và **xoá trong CÙNG LƯỢT**, không để dành tới lúc chốt phiên.
  · **Thêm pattern vào `.gitignore` KHÔNG tính là đã dọn.** Nó chỉ làm file tàng hình với `git status`;
    file vẫn nằm nguyên trên đĩa và vẫn lớn lên. Muốn dọn thì phải XOÁ.
  **Vì sao thành luật — đo một repo, một lượt quét:** 5 file nháp `.tmp_*` ở gốc còn sót từ phiên ba
  ngày trước · `data/extract/` phình **3.096 MB**, trong đó một **venv Python 201 MB / 13.830 file** bị
  bulk-copy vào và một `.rar` **1,34 GB** trùng nội dung với chính folder đã giải nén cạnh nó. Dọn được
  **1,56 GB / ~13.850 file, không mất gì**. Toàn bộ chỗ đó nằm dưới đường đã gitignore — tức nó vô hình
  với mọi cổng, và cũng vô hình với chính người tạo ra nó.
- **Chỉ làm đúng cái được yêu cầu.** Đụng logic/khác → **hỏi trước**, không tự sửa rồi báo.
- **Yêu cầu không rõ ràng phải được làm rõ trước khi thực thi — cơ chế TỰ ĐỘNG, KHÔNG chờ user gọi "grill".** Kích hoạt khi: yêu cầu đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược. → Chạy skill **`.claude/skills/grill/`** (dừng · cái nào đọc code/docs ra được thì đọc · hỏi mỗi lần MỘT câu kèm đề xuất · chốt đủ rõ mới build). KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn; chỉ áp cho input user chưa đủ để thực thi đúng. (User gõ "grill" = ép chạy thủ công.)
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi user yêu cầu rõ).
- **Thao tác xóa phải được user xác nhận trước.** Xóa file, code, hàm, lệnh, chức năng, nội dung docs hoặc folder được coi là bất khả đảo ngược: nêu đối tượng và lý do, chờ chấp thuận rồi mới thực hiện; không tự xóa rồi báo sau. Thành phần dư thừa hoặc không còn dùng: đề xuất, không tự xóa. Bổ sung/mở rộng không cần xác nhận; xóa/thu hẹp luôn cần.
- **CHƯA XÁC MINH THÌ CHƯA PHẢI SỰ THẬT — KHÔNG BỊA, KHÔNG SUY DIỄN (luật cứng).** Áp cho **mọi khẳng định**, không riêng con số: trạng thái hệ thống · nguyên nhân · "cái gì đang xảy ra" · "đã xong chưa". Mỗi khẳng định phải truy được về **nguồn kiểm được** (đọc file · chạy lệnh · gọi bề mặt thật · tra tài liệu ngoài). **Tra không ra ⇒ nói thẳng "không biết / chưa xác minh được"** và nêu đã thử đường nào — cấm lấp bằng suy đoán nghe hợp lý, vì *nghe hợp lý* chính là thứ làm nó lọt. Ba lần trả giá 2026-07-29: đoán cửa sổ "minimize" (thật ra user bấm X) rồi tự bung lên · đoán cú click đã ăn (thật ra `SetForegroundWindow` bị từ chối, click rơi sang app khác) · đoán chỗ hỏng của `parseChangelog` trước khi đọc code (sai một nửa).
  Trước khi ① báo cáo một con số · ② kết luận "đã xong / chưa xong" · ③ xoá bất cứ thứ gì — còn phải đo lại bằng **đường thứ hai, khác cơ chế** với đường thứ nhất. Chạy đúng một lệnh rồi tin luôn là nguồn của gần như MỌI lần báo sai. Bốn dạng đã trả giá thật: công cụ trả rỗng vì **hỏng lặng** (`grep -qP` cho âm tính giả ⇒ kết luận "sạch") · **báo oan** do phép so lỏng (`LIKE` không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai bản chất** (`message_id` chết ⇒ tưởng mồ côi, suýt xoá 87 ảnh đang sống) · **sổ nói khác code** (mục đã xong vẫn ghi "chưa làm"). Kiểm chéo = đổi công cụ (grep ↔ script đọc byte), đổi hướng (đếm xuôi ↔ đếm ngược), hoặc gọi bề mặt thật (DB ↔ HTTP).
- **BA LUẬT ĐO — riêng repo này, sinh từ ba lần trả giá thật (user chốt 2026-08-24):**
  · **① Probe tự dựng phải SAO CHÉP THAM SỐ của thước chính thức.** Dựng probe thiếu `all: true`
    (bench luôn có) đã đẻ **3 kết luận sai** trong một phiên (`TOOL_DEMOTE` · `vecMix` · gộp-trùng).
    Vế "đừng đo bằng bề mặt hẹp hơn" sẵn có KHÔNG chặn được ca này — probe trông giống hệt thước,
    chỉ lệch một tham số mặc định.
  · **② N phép thử cùng thất bại theo CÙNG MỘT HƯỚNG ⇒ nghi cái THƯỚC, không nghi N thiết kế.**
    Đã chạy **tám** giả thuyết, diễn giải tám lần như tám vấn đề kỹ thuật riêng, trước khi hỏi
    thước có đếm đúng không (hoá ra thước nhãn-đơn-uuid phạt oan — sinh ra thước tương đương).
  · **③ Số đo phải khớp THỜI GIAN CÔNG VIỆC đáng lẽ phải tốn.** Test nhúng ONNX mà xong trong
    26 ms là XANH GIẢ, không phải nhanh — đã bắt được hai lần trong hai ngày (kho `.db` rỗng làm
    lệnh chết vì lý do khác · `skipIfBusy` thiếu `await` làm mọi ca thoát ngay). Trước khi tin
    một con số đẹp bất thường, đối chiếu nó với chi phí vật lý của việc đó.
- **📋 SOÁT SỔ = ĐO LẠI TỪNG MỤC, KHÔNG ĐỌC RỒI CHÉP LẠI (luật cứng — user chốt 2026-08-05 sau khi lỗi này TÁI DIỄN SUỐT MỘT THÁNG).**
  **ÁP MỌI LÚC — KHÔNG chờ chốt phiên.** Kích hoạt ngay khi user nói *"check todo"* · *"còn gì chưa làm"* · *"liệt kê ra"* · *"soát lại"* · *"plan/change tới đâu rồi"*, hay khi agent tự mở sổ giữa chừng. Phần lớn ca hỏng là GIỮA PHIÊN, ngay sau khi vừa xong một việc — đúng lúc dễ tưởng mình đang nhớ rõ nhất.
  - **Vì sao:** mỗi mục trong `05_TODO` là một **KHẲNG ĐỊNH VỀ TRẠNG THÁI** ("chưa làm", "chờ duyệt", "còn N tin") — mà khẳng định thì phải **truy được về nguồn kiểm được** (luật ngay trên). File `.md` là nguồn của *nội dung* (FILE WINS), **KHÔNG phải nguồn của sự thật hệ thống**. Đọc sổ rồi báo lại y nguyên = báo cáo chưa xác minh, dù chữ nằm trong file của chính mình.
  - **TRƯỚC khi liệt kê / báo cáo / hỏi user về bất kỳ mục nào — BA NGUỒN, CHẠY ĐỦ CẢ BA (user chốt 2026-08-06). KHÔNG chọn nguồn theo "loại mục".** Ba nguồn trả lời BA câu KHÁC nhau, không nguồn nào thay được nguồn nào:
    · **① MÃ — *"code hiện đang thế nào"***: grep / đếm / đọc đúng dòng. **Cấm suy từ mô tả.**
    · **② GLOBAL MEMORY — *"đã từng quyết / làm gì"***: `zemory memory search --all`, **lọc riêng LỜI USER** (quyết định đến từ user, không từ agent). Quyết định hay nằm ở phiên khác, thậm chí **REPO KHÁC** (luật secret chốt bên SasinFlow rồi mà zemory vẫn hỏi lại).
    · **③ CHẠY THẬT — *"lúc chạy nó ra cái gì"***: gọi endpoint thật · truy vấn nguồn sống · mở app nhìn tận mắt · đọc log/chẩn đoán của tiến trình ĐANG chạy. **Mã có mặt KHÔNG bảo đảm nó chạy đúng** (mã đúng mà cấu hình/dữ liệu sai là im lặng); **GM chỉ nói về quá khứ**, không nói hiện tại.
    **CHỈ KHI CẢ BA KHỚP mới được kết luận.** Lệch nhau ⇒ **cái MỚI HƠN thắng**, và phải ghi rõ cái cũ đã bị thay — **lời nói của user CÓ HẠN DÙNG**: một quyết định cũ có thể bị chính việc làm sau đó supersede. Không chạm được nguồn nào (app không mở được, mất mạng, chưa có quyền…) ⇒ ghi **"chưa xác minh được"** kèm nguồn đã thử — **KHÔNG** mặc định là "chưa làm", và **KHÔNG** lấy hai nguồn còn lại làm đủ.
    > ⚠ **Vì sao phải nói "đủ cả ba" thay vì liệt kê điều kiện:** bản cũ viết `① kiểm được bằng code ⇒ … · ② là quyết định/bàn giao ⇒ …` — đọc ra **bảng phân nhánh theo loại mục**, nên agent phân loại xong là rẽ một nhánh rồi dừng. Hậu quả thật (SasinFlow, **cùng một ngày, sai theo hai hướng ngược nhau**): mục *EMS* chỉ chạy ① nên bỏ sót "đã sửa 17/07 rồi 31/07 báo lại" + một bản DB **chết từ 2025-07-07 vẫn nằm trong bản quét**; mục *Realtime MID* chỉ chạy ② nên tin câu user 15/07 *"mid ko quan tâm"* rồi **gỡ mất một mục mà mã đã làm từ lâu** (`mid_late`/`mid_over` có sẵn trong registry + chuông). Cả hai đều lọt qua bản cũ mà không vi phạm chữ nào.
  - **Mục quá 7 ngày không ai đụng = NGHI NGỜ, không phải sự thật.** Đo 2026-08-05: soát 58 mục thì **11 sai (~19%)** — có mục đã build xong vẫn mang dấu `[ ]`, có mục agent tự bịa vì thấy triệu chứng rồi phán nguyên nhân (compact bundle: code + test đã có sẵn).
  - **Hỏi lại user một việc đã chốt là LỖI, không phải cẩn thận.** Nó bắt user trả lời hai lần cho cùng một câu và làm hỏng lòng tin vào cả bản danh sách.
  - **Máy phải canh, đừng dựa agent nhớ** (cùng doctrine `structure-sync`/`conform`): xem *"gate chống TODO thối"* trong `05_TODO` — chưa có gate thì luật này chỉ là lời hứa, mà lời hứa đã hỏng suốt một tháng.
- **Test mới phải chứng minh mình ĐỎ ĐƯỢC.** Viết xong một test, hãy **phá code mà nó canh** rồi chạy lại: không đỏ ⇒ test đó chưa soi gì, phải sửa test chứ không phải mừng vì xanh. Hai lỗ đã bắt được đúng bằng cách này: một test chưa bao giờ chạy tới nhánh nguy hiểm, một test bị **bản sao logic ở nơi khác gánh thay**. Xanh KHÔNG phải bằng chứng (xem `.claude/skills/audit/` luật 1).
- **Nêu phản biện thiết kế trước khi thực thi** nếu phát hiện điểm bất hợp lý; quyết định cuối thuộc về user.
- **MỌI thiết kế UI/UX phải TRÌNH DUYỆT trước — KHÔNG tự ý (luật cứng).** Bất kỳ quyết định *thiết kế* giao diện — layout/kích thước/khung/màu/theme/hình dạng component/thêm-bớt phần tử UI/đổi style/cách sắp xếp — agent **KHÔNG tự chọn theo phán đoán riêng**: nêu ĐỀ XUẤT cụ thể (hoặc bản nháp/ảnh) → chờ user gật rồi mới làm. Sửa *bug/kỹ thuật* (căn lệch, tràn, lỗi) thì cứ sửa; nhưng đụng tới *hình hài thiết kế* là phải hỏi. User giao một hướng nhưng còn để hở chi tiết thiết kế → trình phương án cho phần hở, đừng tự quyết. (Sinh từ nhiều vòng phải sửa lại UI phiên 07-20/21; đi cặp với "Chỉ làm đúng cái được yêu cầu".)
- **Skill là THAM KHẢO cho khuyến nghị, KHÔNG auto-apply.** Trước khi thiết kế/nắn UI (hay việc skill phủ) → ĐỌC skill → rút khuyến nghị (nên theo / đang kẹt / nên chuẩn hoá) → TRÌNH user; đổi vẫn theo luật "thiết kế UI phải duyệt trước". User có ý tưởng UI mới cũng check skill gợi ý lại. Quy trình đầy đủ: `04_SKILLS` §1.

> *(Luật THIẾT KẾ/UI cụ thể — Dialog 3-size, ESC mọi dialog, token-first… — KHÔNG ở đây: RULES là luật LÀM VIỆC chung. Convention thiết kế ở `03_STRUCTURE §5`. Ở đây CHỈ là luật hành xử "phải hỏi trước".)*
