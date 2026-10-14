<!-- zemory template · luật làm việc CHUNG mọi project — BẢN HỆ NON-APP (dự án là SẢN PHẨM/TÀI SẢN: agent đọc·dò·kéo·điền·xuất file; KHÔNG phát triển app ⇒ 0 luật UI). Ship nguyên từ template, KHÔNG thêm luật riêng vào đây (luật riêng → 01_CONSTITUTION.md). Phần luật CHUNG giữ khớp bản app. -->
# <PROJECT> — Quy tắc làm việc (hệ NON-APP)

> AI đọc file này SAU `01_CONSTITUTION.md` (hiến pháp — bất biến riêng của project, tối cao). Tuân thủ tuyệt đối.
> Điều hướng mở phiên (đọc gì, thứ tự nào): `AGENTS.md` ở root. Quy trình thao tác chi tiết nằm ở **`.claude/skills/<tên>/SKILL.md`** (sổ đăng ký: [`04_SKILLS.md`](04_SKILLS.md)); RULES/STRUCTURE chỉ nêu NORM + trigger rồi dẫn chiếu. Backlog: `05_TODO.md`. Changelog: `06_CHANGES.md`.
> **Đây là hệ NON-APP** (BI/report · data · docs-only · design). Dự án không có UI-app mình phát triển → **KHÔNG có luật thiết kế UI** ở đây; agent chỉ đọc/dò/kéo/điền/xuất FILE (kể cả mở `.pbix`). Chuẩn cấu trúc = `03_STRUCTURE.md` (deliverable · tasks · data · automation).

## Lõi — luật không có chốt máy (bắt đọc)
<!-- zemory:core:start · luật KHÔNG có hook/test nào chặn — phần DUY NHẤT của file bị bắt đọc (read-first) và được chèn lại sau khi nén context; luật có chốt máy rồi thì dời ra khỏi đây -->
> Luật ở các mục sau mang dấu `<!-- gate: … -->`: hook chặn hoặc cổng đỏ khi vi phạm. Luật trong mục này không có lưới đỡ
> nào — chỉ người đọc giữ được. Mỗi luật: điều kiện → hành vi; số `02-N` không bao giờ đánh lại.

- `02-3` **Hiện từng bước, không chạy im lặng.** ① Trước mỗi cụm hành động nói một dòng: đang làm gì, vì sao
  · ② mỗi khẳng định kèm nguồn đo · ③ số đo lệch dự đoán ⇒ báo ngay, không dồn về tổng kết · ④ việc chạy nền lâu
  ⇒ báo đang chờ gì.
- `02-4` **File tạm có đường chết.** Thứ tạo ra để làm việc mà không phải sản phẩm (script dò · dữ liệu đo ·
  model tải về · ảnh chụp · bản sao thử) nằm trong thư mục nháp của phiên, không nằm trong repo. Đo xong và chắc
  không dùng lại ⇒ dọn trong phiên; thứ giữ lại phải nhỏ và nói rõ giữ vì gì.
- `02-6` **Văn bản chuyển đi một lần thì in trong câu trả lời, không tạo file.** Bản bàn giao · memo · báo cáo ·
  prompt hoặc ghi chú gửi sang repo/phòng khác: in nguyên khối trong câu trả lời, không ghi vào `tasks/`, không đính
  kèm file. Dài tới mức khó đọc trong chat ⇒ hỏi có lưu thành file không. Phép thử: repo chỉ giữ thứ nó chạy hoặc
  thứ định nghĩa việc nó chạy (spec · model · script · cấu hình · sổ).
- `02-7` **Chỉ làm đúng việc được giao.** Đụng thứ ngoài yêu cầu ⇒ hỏi trước; không sửa rồi báo sau.
- `02-8` **Yêu cầu chưa rõ ⇒ làm rõ trước khi làm** — tự kích, không chờ lời gọi. Kích khi: đa nghĩa · thuật ngữ
  nhiều cách hiểu · thiếu dữ kiện · phạm vi chưa xác định · giả định ngầm · hai yêu cầu mâu thuẫn · trước thao tác
  khó đảo; chỉ áp khi đầu vào chưa đủ để làm đúng. Dừng, đọc những gì đọc được, hỏi mỗi lần một câu kèm đề xuất, đủ
  rõ mới làm; không tự chọn cách hiểu rộng nhất. Lời gọi "grill" ép chạy thủ công. Quy trình:
  `.claude/skills/grill/SKILL.md`.
- `02-9` **Thêm chức năng = mở rộng, không ghi đè** cái cũ, trừ khi yêu cầu nói rõ.
- `02-11` **Chưa xác minh thì chưa phải sự thật.** Mọi khẳng định (con số · trạng thái · nguyên nhân · "đã
  xong") truy được về nguồn kiểm được: đọc file · chạy lệnh · gọi bề mặt thật · tra tài liệu ngoài. Tra không ra ⇒
  nói "không biết / chưa xác minh được" kèm các đường đã thử; không lấp bằng suy đoán nghe hợp lý. Trước khi báo
  một con số, kết luận xong/chưa xong, hoặc xoá thứ gì ⇒ đo lại bằng đường thứ hai khác cơ chế (đổi công cụ · đổi
  hướng đếm · gọi bề mặt thật). Bốn dạng sai phải soát: công cụ hỏng lặng trả rỗng · phép so lỏng báo oan · tiêu
  chí nghe hợp lý mà sai bản chất · sổ nói khác thực tế.
- `02-12` **Soát sổ = đo lại từng mục.** Áp mọi lúc, không chờ chốt phiên: khi được hỏi còn gì chưa làm · soát
  sổ · plan/changelog tới đâu, và khi tự mở sổ. Mỗi mục `05_TODO` là một khẳng định trạng thái; file là nguồn của
  nội dung, không phải của sự thật hệ thống. Trước khi liệt kê · báo cáo · hỏi về một mục, chạy đủ BA nguồn —
  không chọn nguồn theo loại mục: ① **nguồn** (mở đúng file · đếm đúng dòng/cột · chạy lại truy vấn; không suy từ
  mô tả) · ② **Global Memory** (`zemory memory search --all`, lọc lời người giao việc — quyết định có thể nằm ở
  phiên hoặc repo khác) · ③ **chạy thật** (mở chính bản giao · làm mới dữ liệu rồi đối chiếu số). Ba nguồn khớp mới
  kết luận; lệch ⇒ cái mới hơn thắng và ghi rõ cái cũ bị thay; không chạm được một nguồn ⇒ ghi "chưa xác minh được"
  kèm nguồn đã thử — không mặc định "chưa làm", không lấy hai nguồn còn lại làm đủ. Mục quá 7 ngày không ai đụng =
  nghi ngờ. Hỏi lại một việc đã chốt là lỗi. Máy đo: `zemory todo verify` (exit ≠ 0 khi lệch, nối được vào cổng).
- `02-14` **Thấy điểm bất hợp lý trong thiết kế ⇒ nêu phản biện trước khi làm;** quyết định cuối thuộc người giao
  việc.
- `02-15` **Đổi hình hài · bố cục sản phẩm giao đi** (layout báo cáo/dashboard · chọn biểu đồ · theme trình bày)
  ⇒ trình trước, không tự đổi. Cần ý tưởng biểu đồ ⇒ tham khảo skill `dataviz` rồi trình, không tự áp.
- `02-16` **Skill là tham khảo cho khuyến nghị, không tự áp.** Trước việc skill phủ (dataviz cho báo cáo · review
  chất lượng · …) ⇒ đọc skill, rút khuyến nghị (nên theo · đang kẹt · nên chuẩn hoá), trình rồi mới làm. Quy trình:
  `04_SKILLS` §1.
- `02-61` **Hook là lưới đỡ, không phải người quyết.** Hook không phải cơ chế cấm, càng không phải giấy phép. Hook
  cho qua ≠ được phép: thao tác bất khả đảo vẫn phải hỏi trước dù không bị chặn. Hook chặn ≠ hết việc: bị chặn thì
  hỏi, không tìm đường vòng; cờ `.allow-*` chỉ tạo sau khi được cho phép rõ trong phiên. Chữ là tầng quyết định,
  máy là tầng đỡ hụt.
- `02-60` **`protected` chỉ trỏ vào thứ chỉ đọc** (đầu vào gốc `data/*/01_raw` · hiến pháp · két bí mật), không
  trỏ vào sản phẩm repo đang xây: cổng kêu ở mọi lượt sửa thường ngày sẽ bị bỏ qua. Chống sửa nhầm sản phẩm bằng git.
- `02-19` **Nhị phân nặng** (`.pbix` · `.twb` · `.fig` · `.psd`) đi qua Git LFS (như `share/*.enc`).
- `02-22` **Bề mặt phụ thuộc tiến trình nền phải chết theo nền.** Launcher đang chờ · pipeline nhiều bước · job
  theo lịch · cửa sổ tool: nền chết ⇒ dừng theo hoặc báo lỗi thấy được; không để vỏ rỗng trông như đang chạy. Stage
  chết giữa chừng ⇒ mã thoát ≠ 0, nêu chặng; cổng readiness hỏng ⇒ dừng chuỗi, không xuất file thiếu số;
  deliverable ghi dở ⇒ coi là lỗi.
- `02-23` **Separator của chỉ mục docs giữ theo OS** (`docs\agent\05_TODO.md`); mọi chỗ tra ghép bằng `join`.
  Không chuẩn hoá sang `/` cho đẹp — hậu quả đã đo: `plan ls` báo chỉ mục rỗng, `reindex` đẻ bản ghi trùng. Muốn đổi
  ⇒ một migration riêng đổi chỉ mục cũ và mọi chỗ tra trong cùng bước.
- `02-27` **Văn phong harness là đặc tả kỹ thuật.** Hiến pháp · luật · cấu trúc · plan · skill viết câu mệnh lệnh
  ngắn, thuật ngữ chính xác, theo khuôn điều kiện → hành vi → phép kiểm. Không khẩu ngữ · cảm thán · hội thoại · kể
  chuyện. Không trích lời người giao việc, không ghi ngày chốt — lời gốc, bối cảnh, sự cố nằm ở `06_CHANGES` và
  Global Memory.
- `02-28` **Output CLI · script phụ: tiếng Anh hoặc i18n đủ hai bộ từ điển, 0 chuỗi hardcode.** Thuật ngữ kỹ
  thuật, chuyên ngành giữ nguyên, không dịch (tên công nghệ · API · metric · viết tắt).
- `02-29` **Mã và comment (script · pipeline · measure) viết tiếng Anh:** comment · docstring · tên biến/hàm · log
  kỹ thuật; một file một ngôn ngữ. Commit message: tiếng Anh hoặc tiếng Việt có dấu. Không dịch ba thứ: ① chuỗi
  render cho người đọc (desc·note của bảng/cột sinh vào `docs/`, nhãn report) · ② tên do bên khác đặt (cột Excel ·
  trường API · tên file nguồn — giữ từng ký tự, dù trông như Việt mất dấu) · ③ thuật ngữ chuyên ngành. Comment cũ:
  sửa khi đang đụng file đó, không mở đợt dịch hàng loạt.
- `02-31` **Chữ trong sản phẩm giao đi phải đủ và đúng.** ① Có dấu, đúng chính tả; không có tiếng Việt mất dấu ở
  bất cứ file nào (plan · docs · chú thích script · tên test · chuỗi sinh máy): chỉ tiếng Anh hoặc tiếng Việt có dấu
  — ngại encoding thì viết tiếng Anh; không mojibake (`Ã¡` · `â€` · `ï»¿`). ② Chú thích đủ: bảng có tiêu đề cột ·
  hình có chú thích · mỗi số có đơn vị và kỳ. ③ Một thuật ngữ một tên xuyên suốt sản phẩm giao đi (đối chiếu từ
  điển dự án nếu có). Cách đo: skill `audit`.
- `02-32` **Quy trình lặp lại = một skill, đăng ký hai chỗ:** `.claude/skills/<tên-tiếng-anh>/SKILL.md`
  (frontmatter `name` + `description` — `description` quyết định skill có được gọi), cộng một dòng ở `04_SKILLS` §2
  và một dòng ở bảng trigger `AGENTS.md`. Thiếu một chỗ ⇒ skill mồ côi. Playbook không quay lại `04_SKILLS`.
- `02-33` **Docs: file `.md` là nguồn.** Sửa trực tiếp, đúng file, đúng vai trò, changelog đúng khuôn
  `## [YYYY-MM-DD] — tiêu đề`; không cần chạy gì thêm. Muốn `plan search` · `changelog search` tươi ⇒
  `zemory reindex` (dựng lại chỉ mục tìm kiếm, không ghi ngược file).
- `02-34` **Các file harness luôn khớp nội dung:** mỗi thay đổi ⇒ `05_TODO` phản ánh việc, `06_CHANGES` ghi sau khi
  được xác nhận, plan cập nhật khi đổi thiết kế.
- `02-35` **Mỗi file harness một việc, không lặp nội dung file khác:** `01` hiến pháp · `02` luật làm việc · `03`
  chuẩn cấu trúc · `04` sổ đăng ký skill (playbook ở `.claude/skills/`) · `05` backlog · `06` changelog. Một nội
  dung sống ở một nhà; nơi khác dẫn chiếu (link + số hiệu). `03 §7` là nhà duy nhất của từ điển dữ liệu.
- `02-39` **Việc · lỗi · quyết định ở phiên khác ⇒ `zemory memory search "<q>" [--all]`;** tra đúng câu hỏi, không
  tra bừa.
- `02-40` **Global Memory là nguồn của phiên.** Khi đổi phiên · ghi docs · audit · báo cáo ⇒ dò Global Memory
  (`zemory memory search` · `digest <session>`) và đối chiếu thứ thật để xác minh từng mục trước khi ghi hay khẳng
  định; không ghi theo bản tóm tắt hay kết quả subagent chưa kiểm. Chi tiết: `.claude/skills/session-close/SKILL.md`
  Bước 0.
- `02-52` **Commit cục bộ (đảo được) theo phong cách repo, không cần xin;** push mới là cửa cần phép (`02-50`).
<!-- zemory:core:end -->

## Hành xử
- `02-10` **Thao tác xóa phải được user xác nhận trước.** Xóa file, deliverable, measure, script, nội dung docs hoặc folder được coi là bất khả đảo ngược: nêu đối tượng và lý do, chờ chấp thuận rồi mới thực hiện; không tự xóa rồi báo sau. Thành phần dư thừa hoặc không còn dùng: đề xuất, không tự xóa. Bổ sung/mở rộng không cần xác nhận; xóa/thu hẹp luôn cần. **Chốt máy:** guard chặn mọi lệnh xoá file trong repo (`rm` · `del` · `Remove-Item` · `git rm` · xoá trong script) và mọi lần sửa làm MẤT một số luật trong `01`/`02`, khi chưa có cờ `.allow-delete`; thư mục tạm được miễn; bãi bỏ một luật thì giữ số. <!-- gate: guard -->
- `02-5` **`.gitignore` là giấu, không phải dọn.** File nháp ghi ra thư mục nháp ngoài repo. Buộc phải ghi
  trong repo (công cụ ép đường dẫn · script cần cwd) ⇒ đặt tên `_scratch_*` và xoá trong cùng lượt (lệnh xoá đi qua
  chốt `02-10`). Thêm pattern vào `.gitignore` không tính là đã dọn: file vẫn nằm trên đĩa và vẫn lớn lên. <!-- gate: hook:precommit-guard -->
- `02-1` **Xong = có đường sang máy thứ hai, đã đo.** Thứ vừa dựng (lớp lưu · chỉ mục · bí mật · tài sản giao
  đi) phải khai được đường sang máy khác, và đường đó phải được đo. Chưa khai hoặc chưa đo ⇒ việc còn dở, kể cả khi
  cổng xanh. Quy trình: `.claude/skills/sync-path/SKILL.md`. <!-- gate: guard -->
- `02-2` **Văn bản đưa người đọc theo bộ luật văn phong.** Báo cáo · email · tài liệu giao đi viết cho người
  nhận, không mang giọng harness (mệnh lệnh · viết hoa nhấn giọng · thuật ngữ nội bộ). Luật:
  `.claude/skills/write-style/SKILL.md`. <!-- gate: guard -->
- `02-13` **Test mới phải đỏ được.** Viết xong một test ⇒ phá đoạn mã nó canh rồi chạy lại; không đỏ ⇒ sửa test.
  Hai lỗ hay gặp: test không chạy tới nhánh nguy hiểm; bản sao logic ở chỗ khác gánh thay. Xanh không phải bằng
  chứng (skill `audit` luật 1). <!-- gate: guard -->

## Cấu trúc repo — xem [`03_STRUCTURE.md`](03_STRUCTURE.md)
**Định nghĩa metric/cột → `03_STRUCTURE` §7 (từ điển dữ liệu, NGUỒN SỰ THẬT).** KHÔNG tạo `docs/dictionary.md` — một dự án MỘT từ điển; tách ra hai file là chắc chắn lệch, mà lệch định nghĩa metric thì **số liệu sai**, không phải tài liệu sai. Công thức thực tế khác mô tả ⇒ BÁO, không tự sửa bên nào.

**Chuẩn cấu trúc folder ĐẦY ĐỦ** (cây từng-dòng + routing "cần gì → vào đâu" + convention) nằm ở **[`03_STRUCTURE.md`](03_STRUCTURE.md)** — **đọc TRƯỚC khi sửa/tạo folder**; cần gì → routing của `03` trỏ THẲNG slot (KHÔNG grep cả repo). Nắn repo về chuẩn → skill **`.claude/skills/reconcile/`**.

- `02-17` **`03_STRUCTURE` là INDEX phải KHỚP repo (luật làm việc):** mọi thay đổi cấu trúc (thêm/đổi/dời slot, thêm routing) phải cập nhật `03_STRUCTURE` trong CÙNG thay đổi đó — index lệch thực tế = tra sai. *(Nội dung chuẩn — 3 vai trò bắt buộc, 1 tên/concern, tracked-vs-gitignore, adhoc≠task… — nằm ở `03`, KHÔNG lặp ở đây.)* <!-- gate: conform -->
- `02-18` **SỬA/TẠO BẤT CỨ GÌ (deliverable · sources · tasks · data · scripts · docs · config) → PHẢI đúng CHUẨN ĐÃ CHỐT (luật cứng).** Trước/trong khi tạo·đổi·dời file: đối chiếu `03_STRUCTURE` (slot · routing · convention) + `01_CONSTITUTION` (bất biến) + `02_RULES`. **TUYỆT ĐỐI không đặt file sai slot, không đẻ tên mới cho concern đã có tên, không rải SQL/DAX/M inline.** Không chắc chuẩn ở đâu → tra routing `03` hoặc HỎI, đừng đoán. Thấy chỗ ĐANG lệch chuẩn → nắn về chuẩn (hoặc BÁO nếu lớn/khó đảo), KHÔNG nhân thêm cái sai lên. <!-- gate: conform -->

## Luật khi VIẾT (BẮT BUỘC — luật cứng)

> Luật nổ lúc VIẾT, không lúc tạo folder, và `zemory conform` không kiểm được chúng; `03_STRUCTURE` không giữ bản sao.
> Dòng mang dấu `<!-- gate: … -->` có chốt máy; luật lúc-viết chưa có chốt nằm ở §Lõi.

```
02-20 Data thật vs mẫu     nguồn/extract THẬT → data/ (gitignore, theo máy) · mẫu nhỏ mở được deliverable → fixtures/ (tracked) <!-- gate: guard -->
02-21 Secret/connection    config/*.example.* tracked (trỏ TÊN env) · connection thật → .env / *.local.* (gitignore). KHÔNG commit secret <!-- gate: guard -->
02-25 SQL/DAX/M            gom queries/ hoặc measures/, đặt tên — KHÔNG rải inline (đối xứng store/queries của app) <!-- gate: guard -->
```
- `02-24` **EOL: khoá bằng máy trước.** Repo phải có `.gitattributes` với `* text=auto eol=lf`, đặt TRƯỚC các dòng
  LFS (dòng sau đè dòng trước). Chưa khoá ⇒ sửa file có sẵn giữ nguyên kiểu xuống dòng của nó (đọc dạng byte, CRLF
  ghi lại CRLF) và sửa theo từng đoạn, không đọc-cả-file-rồi-ghi-lại (đổi cả file sang LF, làm rơi phần phiên khác
  vừa chèn). File máy ghép từ file khác (archive ← `05_TODO`/`06_CHANGES`) lấy EOL của file nguồn; khi đang lệch,
  lượt ghi đầu tiên đảo cả file một lần — đó là giá trả một lần, không phải lỗi tool: chuyển dứt điểm trong một
  commit riêng có nhãn, chứng minh bằng `git diff --ignore-cr-at-eol` rỗng. Không nắn ngược, không dựng cổng "EOL
  không được đổi" — mặt này đã có máy canh (test của `archive`). <!-- gate: guard -->
## Ngôn ngữ (có chốt máy)
- `02-26` **Docs (`docs/agent` · `docs/plan`) viết tiếng Việt có dấu.** <!-- gate: guard -->
- `02-30` **Định danh và tên file: ASCII tiếng Anh; trong mã chỉ chú thích được viết tiếng Việt.** Phủ: biến ·
  hằng · hàm · lớp · kiểu · tham số · khoá config/JSON · tên test · tên file · tên thư mục · tên nhánh git. Cấm cả
  dạng có dấu lẫn Việt mất dấu ghép lại. Miễn trừ: ba thứ ở `02-29` (dữ liệu, không phải định danh). Máy soi:
  `node .claude/skills/audit/scripts/lang-scan.mjs .` <!-- gate: guard -->

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `01_CONSTITUTION.md` | hiến pháp — bất biến riêng của project | CHỈ user chốt; agent HỎI trong phiên (`02-38`) |
| `04_SKILLS.md` | **sổ ĐĂNG KÝ** skill: một dòng mỗi skill + luật dùng. Playbook nằm ở `.claude/skills/<tên>/SKILL.md` | khi thêm/bớt một skill |
| `05_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `06_CHANGES.md` | changelog | mỗi lần sửa deliverable/pipeline/measure; **chỉ ghi sau khi xác nhận OK** (viết tay đúng format `## [YYYY-MM-DD] — tiêu đề`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế. **Định nghĩa metric/cột KHÔNG ở đây** → `03_STRUCTURE` §7 (một dự án một từ điển; KHÔNG tạo `docs/dictionary.md`) |

- `02-37` **PLAN PHẢI GỌN — spec được tra theo vùng và đọc trọn mỗi lần sửa.** Plan chỉ giữ **hướng ĐÃ CHỐT hiện tại + điểm còn mở**; lịch sử ("làm ngày nào", "trước đây là X") là việc của `06_CHANGES`. Đổi hướng ⇒ sửa TẠI CHỖ thành hướng mới, lý do ghi ở CHANGES. **Plan là văn bản NGƯỜI viết để bàn và chốt thiết kế — không máy sinh nào ghi vào `docs/plan`, kể cả MỘT KHỐI trong file**: mục lục · catalog · bảng tra do build sinh ⇒ ghi ra file cạnh nguồn sinh ra nó, plan chỉ trỏ link. **Sơ đồ cây thư mục · bảng cấu trúc · khối mũi tên kiến trúc · `mermaid` do agent hoặc người viết thẳng khi bàn thiết kế là PHẦN CHÍNH của plan — giữ, cứ vẽ tay, KHÔNG cần script**; luật chỉ cấm ĐẦU RA của script build nằm trong plan, không bao giờ là lý do xoá sơ đồ hay né không vẽ. `zemory validate` báo LỖI khi gặp dấu khối máy sinh (`<!-- AUTOGEN` · `AUTOGEN:` · tiêu đề "SINH TỰ ĐỘNG" · "MÁY SINH … ĐỪNG SỬA TAY"). Mỗi mục `05_TODO` gắn `→ plan/NN §mục` để dẫn đường. Trần: một spec ~1.000 dòng · cả `docs/plan` ~5.000 dòng — `zemory validate` cảnh báo khi vượt. <!-- gate: validate -->
- `02-36` **Plan chỉ chứa spec:** không todo (→ `05_TODO`, qua cửa vào `02-38`), không luật (bất biến hay luật
  riêng ⇒ hỏi; được chấp thuận thì ghi vào đúng file theo `02-38`, plan chỉ dẫn chiếu). Đặt tên `NN_tên.md`, `00` =
  tổng quan (`03_STRUCTURE`). <!-- gate: validate -->
- `02-38` **Sổ việc `05_TODO` — luật duy nhất cho cửa vào và cửa ra;** file khác dẫn chiếu mục này, không đặt luật
  sổ riêng. ① **Cửa vào:** không tự thêm mục `05_TODO` · luật · cổng · bộ đếm · bộ đo · lớp cảnh báo · mục advisory.
  Thấy cần ⇒ hỏi một câu kèm đề xuất trong phiên; được chấp thuận mới ghi, vào đúng file (`01` · `02` · `05`). Đề
  xuất không "đậu" vào sổ chờ duyệt. Ngưỡng: thực sự quan trọng — trước khi thêm trả lời đủ: gỡ bớt được gì · gộp
  vào cái có sẵn được không · không có nó thì hỏng gì, đo được không; không trả lời được câu cuối ⇒ không làm. Không
  áp cho việc được giao · sửa thứ đang hỏng · nghĩa vụ luật sẵn có bắt buộc. ② **Cửa ra:** một mục xong ⇒ trong
  cùng lượt: đo lại theo `02-12` · ghi `06_CHANGES` · xoá khỏi `05_TODO` (hoặc `zemory archive`). Dấu máy dời:
  `- [x]` · `- ✅` · `N. [x]` · tiêu đề `## [x]` (cả khối khi không còn `[ ]`/`[~]`); `✅` trên mục đánh số/tiêu đề,
  hoặc khối còn việc mở, thì `archive` chỉ báo — agent tự xử lý; viết "xong" kiểu khác (gạch ngang · chữ XONG) thì
  máy không thấy. `archive` lúc chốt phiên là lưới vét cuối, không phải chỗ để dồn. <!-- gate: guard -->

## Chốt phiên / ghi sổ (BẮT BUỘC — luật cứng)
**Kích hoạt khi user nói:** "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt** — quy trình đầy đủ (đọc lại 3 nguồn: FULL phiên hiện tại + FULL `docs/plan/*` + FULL `docs/agent/*` → định tuyến từng thứ về đúng file → chuẩn "không bỏ sót" → bước cuối `zemory validate`) ở skill **`.claude/skills/session-close/`**. Bất biến: mọi việc đã làm phải tìm được ở `06_CHANGES` **hoặc** `05_TODO` (kể cả chẩn đoán sai / đường cụt); đổi thiết kế → `docs/plan/*`; luật riêng → HỎI trong phiên, không đậu vào `05_TODO` (`02-38`). Không tự `git push` (§Git). **Tự dọn cuối phiên (bắt buộc):** ghi sổ xong thì chạy `zemory archive` — mục `[x]` đã xong rời `05_TODO` **ngay, không chờ ngưỡng** (một mục đã đóng là đặt sai chỗ kể từ giây nó xong), còn `06_CHANGES` cắt theo trần khai trong `docs/.harness.json`. Chép NGUYÊN VĂN sang `docs/agent/archive/`, KHÔNG tóm tắt — archive là để TRA LẠI. Bỏ bước này thì `05_TODO` (file LUÔN được nạp) phình dần cho tới khi mỗi phiên phải trả tiền cho toàn bộ lịch sử.

## Changelog — supersede
- `02-41` **Changelog: entry mới nhất ở trên cùng,** chèn ngay sau header. <!-- gate: validate -->
- `02-42` **Entry đảo/thay quyết định cũ mở đầu bằng**
  `> 🔄 **Supersede:** thay [YYYY-MM-DDx] — "[đề mục]" — [lý do].`, nêu đúng khoá ngày của entry bị thay (máy nối bằng
  khoá đó để gắn nhãn "ĐÃ BỊ THAY" cho entry cũ). Ngày có nhiều entry mà không rõ khoá ⇒ bỏ qua, không đoán. Không
  sửa/xoá entry cũ; tuỳ chọn thêm `> ⤴ Đã bị thay bởi [ngày].` ở entry cũ. <!-- gate: validate -->
- `02-43` **Entry NGẮN — trần ~30 dòng (luật, không phải gợi ý).** Một entry chỉ cần ba thứ: **đổi gì · vì sao · số đo**. Chi tiết thiết kế → `docs/plan/NN_*`; tường thuật quá trình → bỏ. Lý do là số học: ở `changes_keep` ~180 dòng thì **bốn** entry 50 dòng chiếm trọn vùng active, tức viết dài làm chính cơ chế archive thành vô nghĩa. `zemory validate` báo entry vượt trần (advisory) — đo trên 76 entry thật: p50 19 dòng, nên 30 là rộng rãi với một entry bình thường. <!-- gate: validate -->

## Phạm vi project (BẮT BUỘC — luật cứng)
- `02-44` **CHỈ làm việc trong project folder đang mở.** TUYỆT ĐỐI KHÔNG ghi/sửa/chạy lệnh đụng vào project khác (kể cả lệnh `zemory` trỏ root khác, `cd` sang repo khác, sửa file bên đó) khi user CHƯA cho phép rõ ràng trong phiên — **kể cả với ý định "giúp"/"cứu dữ liệu"/"tiện tay sửa luôn"**. <!-- gate: guard -->
- `02-45` Thấy cần đụng project khác → **DỪNG, HỎI TRƯỚC**: nêu rõ định làm gì, ở đâu, vì sao; user gật mới làm. Project khác có thể đang có agent/phiên khác làm việc — đụng chéo gây xung đột dữ liệu. <!-- gate: guard -->
- `02-46` Đọc-tham-khảo (read-only) project khác để trả lời câu hỏi thì được; **mọi thao tác GHI là cấm mặc định**. <!-- gate: guard -->
- `02-47` **Đứng trong repo tham khảo thì chỉ đọc.** Lệnh `zemory` ghi theo cwd (`init` · `sync` · `reindex` ·
  `archive` · `memory scan`): chạy ở repo khác là ghi vào repo đó và DB của nó. Lấy chuẩn ⇒ đọc `docs_template/`
  (không phải `docs/` riêng của repo nguồn) rồi chạy lệnh ở repo của mình. <!-- gate: guard -->
- `02-48` **Tiêu đề phiên (user chốt 2026-10-07):** khuôn `<Repo>_<Model>_<d-m-yyyy>` — `<Repo>` = tên thư mục repo HIỆN TẠI đúng hoa thường; `<Model>` = model đang chạy phiên (`Claude`, `Codex`, …); ngày = ngày mở phiên, không đệm số 0 (`Zemory_Claude_7-10-2026`); chủ đề chèn TRƯỚC ngày (`<Repo>_<Model>_<ChuDe>_<d-m-yyyy>`); phiên thứ 2, 3 trong ngày thêm đuôi `_<số>` SAU ngày (`…_7-10-2026_2`). **User** đặt tiêu đề (đổi tên phiên bình thường là đủ; `/rename` đổi thêm tên nhắn tin). Phiên chưa có tiêu đề = **chưa dùng**. Bộ kiểm: `zemory peers --all --check` chấm MỌI phiên trên máy, kể cả phiên đã đóng (khuôn lệch · ngày lệch quá 1 ngày so với ngày mở phiên); `zemory peers --fix` in kế hoạch đặt lại, `--apply` mới ghi — **chỉ chạy khi user bảo**: phiên user đặt tên riêng chưa theo khuôn là quyết định của user. Agent thấy tiêu đề phiên của CHÍNH mình lệch khuôn thì nhắc user MỘT lần. <!-- gate: hook:rule-reminders -->
- `02-49` **Nhắn agent ở repo khác (user chốt 2026-10-07):** chỉ nhắn phiên đang chạy có **tiêu đề chuẩn** `<Repo>_<Model>_<d-m-yyyy>` (tiêu đề user đặt cho phiên). Repo có nhiều phiên ⇒ chọn phiên có **ngày trong tiêu đề mới nhất**; bằng ngày ⇒ phiên hoạt động gần nhất. Phiên **chưa có tiêu đề** (`Untitled` — Claude Code tự mở khi bật lại máy, chưa dùng) ⇒ **CẤM** nhắn. ⚠ Tiêu đề KHÔNG phải địa chỉ gửi: `ListAgents` chỉ in tên nhắn tin tự sinh (`dept-biz-b2`), nên trước MỖI lần gửi chạy **`zemory peers`** (bảng repo → địa chỉ → tiêu đề, ★ = phiên được nhắn) rồi gửi tới địa chỉ có ★; repo không có ★ ⇒ KHÔNG gửi, báo user đặt tiêu đề. Trả lời tin đến ⇒ dùng đúng địa chỉ `from` (`uds:…`). Chốt máy: hook cấp user `zemory hook send-guard` chặn gửi tới phiên không có ★ và chỉ ra địa chỉ đúng. *(Đo 07/10: 10 phiên sống, 9 mang tên nhắn tin tự sinh dù user đã đặt tiêu đề; 3 phiên chưa từng dùng.)* <!-- gate: hook:send-guard -->

## Git (BẮT BUỘC — luật cứng)
- `02-50` **KHÔNG `git push` khi user CHƯA cho phép.** Git remote là **nguồn BACKUP CUỐI CÙNG** của project — đẩy lên là ra ngoài, không gỡ lại được (gỡ = force-push, càng phá). Xong việc → **BÁO CÁO rồi DỪNG**; user bảo "push"/"lên git" mới đẩy. <!-- gate: guard -->
- `02-51` **Ghi sổ ≠ publish:** user bảo ghi changelog / commit / "xong rồi" **KHÔNG phải** là cho phép push. Đừng suy diễn. <!-- gate: guard -->
- `02-53` KHÔNG `--force`, KHÔNG rewrite lịch sử đã push, KHÔNG `reset --hard`/`clean` lên việc chưa commit của user nếu chưa hỏi. <!-- gate: guard -->

## Guardrail lớp ① — luật bất khả đảo phải có CHỐT MÁY (BẮT BUỘC khi repo có đường cấm)
- `02-54` Luật mà vi phạm là **KHÔNG đảo được** (secret vào commit · ghi vào đường cấm · `git push` chưa xin) **không được chỉ có chữ gác** — chữ là tầng quan sát, phát hiện SAU, không ngăn được lúc xảy ra. <!-- gate: gates -->
- `02-55` **`zemory hook guard`** sinh bộ chốt vào `<nhà harness>/hooks/`: `policy.json` (luật — sinh từ khoá `protected` / `secretNames` trong `.harness.json`) · `guard.cjs` (PreToolUse — chặn TRƯỚC khi hành động chạm đĩa/mạng) · `precommit-guard.cjs` (chặn secret vào staging, phủ cả người). Lệnh **tự cắm** guard vào runtime (`.claude/settings.json` › PreToolUse, matcher đủ `Write|Edit|MultiEdit|NotebookEdit|Read|Bash|PowerShell`; giữ nguyên hook khác của repo) — guard là CHUẨN, không phải tuỳ chọn (user chốt 2026-10-07); `zemory doctor` báo ĐỎ khi chưa cắm hoặc matcher thiếu công cụ. Pre-commit cũng **tự cắm**: chưa có `pre-commit` thì lệnh tạo hook gọi `precommit-guard.cjs` (theo `core.hooksPath` nếu khai); repo đã có pre-commit riêng thì để yên và báo — thêm dòng gọi guard bằng tay. `zemory gates --all` (và chip **Cổng repo** trên UI) đo mọi repo có THẬT SỰ chạy guard · pre-commit · đủ hàng §Cổng cho hiến pháp. <!-- gate: guard -->
- `02-56` **Flag `.allow-*` = user duyệt MỘT VIỆC.** Guard cho qua rồi **đóng dấu** `ZEMORY-USED <vân tay lệnh> <thời điểm>` vào chính file flag — **không xoá ngay**: hook `PreToolUse` chỉ nói *cho qua*, nó KHÔNG biết lệnh có thật sự chạy hay không, nên một tầng khác của host chặn lại là flag mất oan. Trong **90 giây**, ĐÚNG lệnh đó được thử lại; xin việc KHÁC hoặc quá hạn ⇒ flag bị **thu hồi**, phải xin lại. Agent chỉ được tạo flag SAU khi user nói rõ trong phiên. **Nhóm secret KHÔNG có flag.** <!-- gate: guard -->
- `02-57` Khai đường cấm ghi của repo qua khoá `protected: ["..."]` trong `.harness.json`; `zemory doctor` nhắc khi đã khai mà chưa sinh chốt. <!-- gate: doctor -->
- `02-58` **Làm việc NGOÀI project cũng có chốt máy** (2026-10-06): guard chặn ① ghi ra đường **TUYỆT ĐỐI** ngoài repo (Write/Edit · `>`/`>>` · `cp`/`mv`/`robocopy` · `mkdir`/`New-Item`/`Set-Content`/`Out-File`/`tee`/`touch` · trình thông dịch có lệnh ghi) — miễn thư mục tạm của OS (scratchpad) · `~/.claude` · `/dev/null` · `/tmp` · `NUL` · các đường khai ở khoá marker `allowedRoots`; tên 8.3 và `/d/…` của Git Bash được quy về một cách viết trước khi so · ② SQL bắt máy chủ ghi file (`BACKUP … TO DISK` · `RESTORE … FROM DISK`/`WITH MOVE` · `CREATE DATABASE … FILENAME`) · ③ SQL đổi cấu hình máy chủ (`sp_configure`/`RECONFIGURE` · linked server · `CREATE/DROP/ALTER DATABASE`), và khi marker khai `allowedSqlServers` thì mọi máy chủ ngoài danh sách (`sqlcmd -S` · `-ServerInstance` · `Server=`/`Data Source=`) · ④ (2026-10-07) lệnh chạy trên **MÁY KHÁC** (`ssh` · `Invoke-Command -ComputerName`/`-Session` · `Enter-PSSession` · `psexec` · `winrs`) mà payload tạo · xoá · đổi thứ gì — thư mục/file · task Scheduler (`Register-`/`Unregister-ScheduledTask` · `schtasks /create`) · dịch vụ (`sc create` · `Set-Service`) · registry · gói cài · SQL ②③ — và `scp`/`rsync` chép LÊN máy khác; lệnh chỉ đọc (`Get-*` · `ls` · `SELECT`) cho qua. ②③ chỉ soi khi lệnh là `sqlcmd`/`osql`/`bcp`/`Invoke-Sqlcmd` hoặc trình thông dịch — `grep`/`git log` chỉ NHẮC chữ thì cho qua. Một cờ chung `.allow-outside`. **Giới hạn:** đường/SQL dựng lúc chạy, nằm trong biến hay trong file script (`sqlcmd -i x.sql` · `python job.py` · script nằm sẵn trên máy kia `ssh <máy> powershell -File x.ps1`), và đường tương đối sau khi `cd` ra ngoài thì guard KHÔNG thấy — luật chữ §Phạm vi project vẫn là tầng quyết định. <!-- gate: guard -->
- `02-59` **Đọc trước khi ghi — có chốt máy.** `02-59_read-first.cjs` (guard gọi) chặn mọi thao tác ghi (Write/Edit ·
  lệnh shell có ghi) tới khi phiên đã đọc bằng công cụ Read đủ phần bắt đọc khai ở `policy.json › read_first`:
  `02_RULES` §Lõi · ở `01_CONSTITUTION` khối ĐỌC KỸ, các điều khối đó liệt kê và `## Mục đích` · cả `05_TODO`. File
  thiếu ranh giới mục ⇒ đòi cả file; file khai mà không tồn tại thì bỏ qua. `grep`/`head`/`Get-Content` không tính.
  Chốt so theo nội dung từng dòng: dòng đã thấy (Read, hoặc tự ghi bằng Edit/Write) không phải đọc lại; file đổi
  ngoài Edit/Write chỉ đòi đúng các dòng đã đổi, câu chặn ghi số dòng. Đòi thêm theo việc: ghi vào `tasks/<case>/` ⇒
  `spec.md` · `mail_form.md` của case · tạo thư mục mới ⇒ `03_STRUCTURE` · đụng `frontend/` (bộ APP) ⇒ skill
  `app-design` · chạy script gửi mail ⇒ skill `write-style` (soi nội dung script được chạy, thêm một bước sang script
  nó gọi). Nén context không bắt đọc lại — hook `SessionStart` chèn lại nguyên văn lõi. Lệnh đọc Global Memory và dò
  phiên (`zemory memory …` · `peers` · `graph`) không bị chặn. Không có cờ vượt. Khai thêm file bắt đọc: khoá marker
  `readFirst`. Giới hạn: host không ghi transcript ⇒ cho qua (fail-open); phần "đòi theo việc" chỉ phủ chỗ máy đoán
  tất định được — luật chữ vẫn là tầng quyết định. <!-- gate: read-first -->

## Dựng chốt máy cho luật
- `02-73` **Viết hoặc nhận một luật ⇒ phân loại rồi dựng chốt máy; chữ chỉ là tầng cuối.** Hỏi: lúc vi phạm, máy nhìn thấy gì?
  · **① Hành động trên tool** — xoá · push · ghi ngoài repo · SQL vào máy chủ · sửa đường cấm · lệnh git huỷ việc ⇒ nhánh guard
    PreToolUse soi `tool_name` + lệnh/đường dẫn; việc được phép một lần ⇒ cờ `.allow-*` (`02-56`).
  · **② Nội dung đang ghi** — EOL · tên file/định danh · chính tả/ngôn ngữ · câu trích lời · mục mới trong sổ · SQL viết tại chỗ ⇒
    hook PreToolUse trên Write/Edit, chỉ soi phần THÊM (dòng đã có không tính) · file vào git ⇒ pre-commit · khuôn của file
    docs ⇒ `zemory validate` · cây thư mục ⇒ `zemory conform` · bất biến của mã ⇒ test trong cổng `npm run check`.
  · **③ Phán đoán · lời nói** — hỏi khi chưa rõ · chưa xác minh · trình thiết kế trước · hiện từng bước ⇒ không có lời gọi tool
    để móc: vào `## Lõi`. Có cửa nhận ra được (lời nhắn khớp từ khoá · ghi vào `frontend/` · chạy script gửi mail) ⇒ thêm câu
    nhắc (UserPromptSubmit) hoặc đòi đọc skill (trigger của `read-first`).
  Mỗi chốt: một file `<số luật>_<tên>.cjs` trong `<nhà harness>/hooks/` · câu chặn nêu số luật và nguyên văn luật · có ca DƯƠNG,
  ca ÂM (thứ trông giống mà phải cho qua) và phá mã cho test đỏ (`02-13`) · chính hook lỗi thì cho qua (fail-open). Luật
  riêng của repo ⇒ cổng của repo: lệnh khai ở khoá marker `repoGates` (pre-commit chạy) hoặc test trong cổng. Có chốt rồi ⇒
  dời luật ra khỏi `## Lõi`, gắn `<!-- gate: … -->`. Kiểm: `zemory gates` (luật thiếu dấu · luật lõi mang dấu · lõi vượt trần). <!-- gate: gates -->

## Cổng cho hiến pháp (BẮT BUỘC — luật cứng)

> User chốt 2026-10-07: *"tụi agent quên luật quá nhiều rồi, phải có hook chặn hết hạn chế quên"*. Mỗi điều trong `01_CONSTITUTION`
> phải có MỘT dòng ở bảng dưới: hook/test nào CHẶN nó, hoặc vì sao nó chỉ là chữ. Repo có HP riêng ⇒ agent của repo TỰ dựng hook
> cho điều nào kiểm được bằng máy (guard nhánh mới · test gate · `doctor` · `validate`), rồi ghi tên vào đây. `zemory validate`
> báo điều nào chưa có dòng. Bảng nằm Ở ĐÂY chứ không trong hiến pháp vì chỉ user sửa hiến pháp.
> Loại: **CHẶN** = máy chặn/đỏ gate · **NHẮC** = hook chỉ nhắc đúng lúc (luật cần phán đoán) · **CHỮ** = không có vai máy (nói vì sao).
> **Luật KHÔNG viết hook được ⇒ ĐƯA LÊN ĐẦU, kể cả hiến pháp** (user chốt 2026-10-07: *"các luật nào mà ko viết hook dc thì đưa lên
> đầu để nó ko đọc lướt… kể cả hiến pháp luôn"*). Luật có chốt máy thì có lưới đỡ; luật chỉ có chữ thì chỉ người đọc giữ được, nên nó
> là thứ KHÔNG được đọc lướt. `zemory gates --write-top` sinh khối **ĐỌC KỸ** ở đầu `01_CONSTITUTION` và đầu `02_RULES`, liệt kê
> điều loại CHỮ · điều ghi "CHƯA có" · điều chưa có hàng trong bảng; **số điều KHÔNG đổi** (chỗ khác đang gọi "điều N"). Mục
> `## Lõi` (luật chưa có chốt máy; luật `02-N` ngoài lõi mang dấu `<!-- gate: … -->`) đứng ĐẦU `02_RULES`; `zemory gates` đỏ khi lệch. Sửa bảng xong ⇒ chạy lại lệnh; `zemory validate` và
> `zemory gates` báo khi khối thiếu, cũ, hoặc không nằm ở đầu.

| # | Điều (tóm) | Loại | Cổng / lý do |
|---|---|---|---|
| _ | _(mỗi điều của `01_CONSTITUTION` một dòng — agent repo tự điền và dựng hook)_ | _ | _ |

<!-- zemory-standard: 2026-10-14 -->
