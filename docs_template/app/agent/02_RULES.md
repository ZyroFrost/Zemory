<!-- zemory template · luật làm việc CHUNG mọi project (CẢ app lẫn non-app — chốt 2026-07-16, không tách profile) — ship nguyên từ template, KHÔNG thêm luật riêng vào đây (luật riêng của app → 01_CONSTITUTION.md) -->
# <PROJECT> — Quy tắc làm việc

> AI đọc file này SAU `01_CONSTITUTION.md` (hiến pháp — bất biến riêng của project, tối cao). Tuân thủ tuyệt đối.
> Điều hướng mở phiên (đọc gì, thứ tự nào): `AGENTS.md` ở root. Playbook thao tác chi tiết (grill · chốt phiên · reconcile) → [`04_SKILLS.md`](04_SKILLS.md); RULES/STRUCTURE chỉ nêu NORM + trigger rồi dẫn chiếu. Backlog: `05_TODO.md`. Changelog: `06_CHANGES.md`.

## Cấu trúc repo — xem [`03_STRUCTURE.md`](03_STRUCTURE.md)
**Chuẩn cấu trúc folder ĐẦY ĐỦ** (cây từng-dòng + routing "sửa gì → vào đâu" + convention) nằm ở **[`03_STRUCTURE.md`](03_STRUCTURE.md)** — **đọc TRƯỚC khi sửa/tạo folder**; cần sửa gì → `03 §4` trỏ THẲNG slot (KHÔNG grep cả repo). Nắn repo về chuẩn → skill **[`04_SKILLS §reconcile`](04_SKILLS.md)**.

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
Backup deploy 2 CHIỀU  KHÔNG chỉ push 1 chiều. Máy đích có backup lần trước → verify khớp attic/ local TRƯỚC khi đè (lệch = có sửa tay ngoài luồng, điều tra trước); deploy xong kéo bản-vừa-thay về attic/ local. Cùng nguyên lý additive-merge của memory sync/share.ts
```
## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- **Văn phong harness = KỸ THUẬT / QUY PHẠM, KHÔNG văn nói.** Hiến pháp, rules, structure và plan viết dạng đặc tả: câu mệnh lệnh ngắn gọn, thuật ngữ chính xác, nêu điều kiện → hành vi. Không dùng khẩu ngữ, câu cảm thán, ví dụ hội thoại, hay lối kể chuyện phiếm.
- **UI · CLI output**: **English HOẶC i18n đủ 2 dict** (song ngữ, đổi qua nút setting) — **0 chuỗi hardcode** (mọi chuỗi người-dùng-thấy đi qua i18n, có cả 2 bản). **Thuật ngữ kỹ thuật / chuyên ngành nặng GIỮ NGUYÊN, KHÔNG dịch** (tên công nghệ, API, viết tắt kỹ thuật — dịch ra làm sai nghĩa). Chi tiết cổng chất lượng i18n → `03_STRUCTURE §9.D` (nguồn duy nhất, không lặp).
- **code · comment công khai**: **TIẾNG ANH** — không nhét ngôn ngữ bản địa vào code/comment người khác đọc.

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `01_CONSTITUTION.md` | hiến pháp — bất biến riêng của project | CHỈ user chốt; agent đề xuất qua TODO |
| `04_SKILLS.md` | kho skill — playbook thao tác (grill · chốt phiên · reconcile); CHỈ chứa skill | khi thêm/đổi một skill |
| `05_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `06_CHANGES.md` | changelog | mỗi lần sửa code; **chỉ ghi sau khi xác nhận OK** (viết tay đúng format `## [YYYY-MM-DD] — tiêu đề`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế |

- **Docs = FILE là nguồn (FILE WINS):** viết/sửa `.md` trực tiếp BÁM CHUẨN (đúng file, đúng vai trò, changelog đúng format `## [YYYY-MM-DD] — tiêu đề`); **xong là xong** — file là nguồn, KHÔNG cần chạy gì thêm. Muốn `plan search`/`changelog search` tươi thì chạy `zemory reindex` (đọc `.md` → dựng lại search index, **KHÔNG ghi ngược file**). Các lệnh ghi DB→md kiểu cũ (render/set/add) **đã gỡ hoàn toàn** — docs chỉ sửa bằng tay.
- **Đồng bộ bắt buộc — constitution ↔ rules ↔ todo ↔ change ↔ plan luôn khớp:** mỗi thay đổi → TODO phản ánh việc, CHANGES ghi log (sau khi OK), plan cập nhật nếu đổi thiết kế. Không để lệch nhau (đây là khớp NỘI DUNG giữa các FILE, không phải chạy sync).
- **Mỗi file harness làm ĐÚNG MỘT việc — KHÔNG lặp nội dung file khác.** `01` hiến pháp (bất biến kiến trúc) · `02` luật làm việc · `03` chuẩn cấu trúc folder · `04` kho skill (playbook) · `05` backlog · `06` changelog. Một nội dung chỉ sống ở ĐÚNG MỘT nhà; file khác cần thì **DẪN CHIẾU** (link + số hiệu), KHÔNG chép lại. Đọc hết 6 file KHÔNG được thấy nội dung trùng — trùng lặp / lạc chỗ = agent đọc bị loạn.
- **Plan (`docs/plan/`) — chỉ chứa SPECS:** KHÔNG todo (→ `05_TODO`), KHÔNG luật (bất biến/luật riêng của app → ĐỀ XUẤT vào `01_CONSTITUTION`, plan chỉ dẫn chiếu điều khoản). Chuẩn đặt tên `NN_tên.md` (`00`=overview): xem `03_STRUCTURE §5`.
- **Tra log sâu:** việc/lỗi/quyết định ở phiên khác → `zemory memory search "<q>" [--all]` (recall on-demand, tự tiết kiệm token; đừng tra bừa).

## Chốt phiên / ghi sổ (BẮT BUỘC — luật cứng)
**Kích hoạt khi user nói:** "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt** — quy trình đầy đủ (đọc lại 3 nguồn: FULL phiên hiện tại + FULL `docs/plan/*` + FULL `docs/agent/*` → định tuyến từng thứ về đúng file → chuẩn "không bỏ sót" → bước cuối `zemory validate`) ở skill **[`04_SKILLS §chốt phiên`](04_SKILLS.md)**. Bất biến: mọi việc đã làm phải tìm được ở `06_CHANGES` **hoặc** `05_TODO` (kể cả chẩn đoán sai / đường cụt); đổi thiết kế → `docs/plan/*`; luật riêng → ĐỀ XUẤT `05_TODO` chờ user chốt. Không tự `git push` (§Git).

- **Global Memory là NGUỒN của phiên (BẮT BUỘC verify):** episodic sống sót qua context-trim, còn trí nhớ trong context thì bị lược → khi ĐỔI SESSION / ghi docs / audit / báo cáo, PHẢI dò Global Memory (`zemory memory search`/`digest <session>`) + đối chiếu code THẬT để **verify TỪNG mục TRƯỚC khi ghi hay khẳng định** — không ghi/báo theo trí nhớ tóm tắt hay kết quả subagent chưa kiểm. Đây là chốt chặn "đổi session là sót/lệch". Chi tiết: `04_SKILLS §chốt phiên` Bước 0.

## Changelog — supersede
- Mới nhất ở trên cùng (chèn ngay sau header).
- Entry **đảo/thay** quyết định cũ → mở đầu bằng:
  `> 🔄 **Supersede:** thay quyết định "[đề mục] ([ngày])" — [lý do].`
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

## Hành xử
- **Chỉ làm đúng cái được yêu cầu.** Đụng logic khác → **hỏi trước**, không tự sửa rồi báo.
- **Yêu cầu không rõ ràng phải được làm rõ trước khi thực thi — cơ chế TỰ ĐỘNG, KHÔNG chờ user gọi "grill".** Kích hoạt khi: yêu cầu đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược. → Chạy skill **[`04_SKILLS §grill`](04_SKILLS.md)** (dừng · cái nào đọc code/docs ra được thì đọc · hỏi mỗi lần MỘT câu kèm đề xuất · chốt đủ rõ mới build). KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn; chỉ áp cho input user chưa đủ để thực thi đúng. (User gõ "grill" = ép chạy thủ công.)
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi yêu cầu rõ).
- **Thao tác xóa phải được user xác nhận trước.** Xóa file, code, hàm, lệnh, chức năng, nội dung docs hoặc folder được coi là bất khả đảo ngược: nêu đối tượng và lý do, chờ chấp thuận rồi mới thực hiện; không tự xóa rồi báo sau. Thành phần dư thừa hoặc không còn dùng: đề xuất, không tự xóa. Bổ sung/mở rộng không cần xác nhận; xóa/thu hẹp luôn cần.
- **MỘT PHÉP ĐO CHƯA ĐƯỢC KIỂM CHÉO THÌ CHƯA PHẢI SỰ THẬT (luật cứng).** Trước khi ① báo cáo một con số · ② kết luận "đã xong / chưa xong" · ③ xoá bất cứ thứ gì — phải đo lại bằng **đường thứ hai, khác cơ chế** với đường thứ nhất. Chạy đúng một lệnh rồi tin luôn là nguồn của gần như MỌI lần báo sai. Bốn dạng thường gặp: công cụ trả rỗng vì **hỏng lặng** (cờ sai ⇒ âm tính giả ⇒ kết luận "sạch") · **báo oan** do phép so lỏng (so chuỗi không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai bản chất** (một khoá phụ trỏ hụt ⇒ tưởng dữ liệu mồ côi, suýt xoá thứ đang sống) · **sổ nói khác code** (mục đã xong vẫn ghi "chưa làm"). Kiểm chéo = đổi công cụ (grep ↔ script đọc byte), đổi hướng (đếm xuôi ↔ đếm ngược), hoặc gọi bề mặt thật (DB ↔ API).
- **Test mới phải chứng minh mình ĐỎ ĐƯỢC.** Viết xong một test, hãy **phá code mà nó canh** rồi chạy lại: không đỏ ⇒ test đó chưa soi gì, phải sửa test chứ không phải mừng vì xanh. Hai lỗ điển hình: test chưa bao giờ chạy tới nhánh nguy hiểm, và test bị **bản sao logic ở nơi khác gánh thay**. Xanh KHÔNG phải bằng chứng (xem `04_SKILLS §audit toàn diện` luật 1).
- **Nêu phản biện thiết kế trước khi thực thi** nếu phát hiện điểm bất hợp lý; quyết định cuối thuộc về user.
- **MỌI thiết kế UI/UX phải TRÌNH DUYỆT trước — KHÔNG tự ý (luật cứng).** Bất kỳ quyết định *thiết kế* giao diện — layout/kích thước/khung/màu/theme/hình dạng component/thêm-bớt phần tử UI/đổi style/cách sắp xếp — agent **KHÔNG tự chọn theo phán đoán riêng**: nêu ĐỀ XUẤT cụ thể (hoặc bản nháp/ảnh) → chờ user gật rồi mới làm. Sửa *bug/kỹ thuật* (căn lệch, tràn, lỗi) thì cứ sửa; nhưng đụng tới *hình hài thiết kế* là phải hỏi. User giao một hướng nhưng còn để hở chi tiết thiết kế → trình phương án cho phần hở, đừng tự quyết. (Đi cặp với "Chỉ làm đúng cái được yêu cầu".)
- **Skill là THAM KHẢO cho khuyến nghị, KHÔNG auto-apply.** Trước khi thiết kế/nắn UI (hay việc skill phủ) → ĐỌC skill → rút khuyến nghị (nên theo / đang kẹt / nên chuẩn hoá) → TRÌNH user; đổi vẫn theo luật "thiết kế UI phải duyệt trước". User có ý tưởng UI mới cũng check skill gợi ý lại. Quy trình đầy đủ: `04_SKILLS §Cách dùng skill`.

> *(Luật THIẾT KẾ/UI cụ thể — Dialog 3-size, ESC mọi dialog, token-first… — KHÔNG ở đây: RULES là luật LÀM VIỆC chung. Convention thiết kế ở `03_STRUCTURE §5`. Ở đây CHỈ là luật hành xử "phải hỏi trước".)*
