<!-- zemory template · luật làm việc CHUNG mọi project — BẢN HỆ NON-APP (dự án là SẢN PHẨM/TÀI SẢN: agent đọc·dò·kéo·điền·xuất file; KHÔNG phát triển app ⇒ 0 luật UI). Ship nguyên từ template, KHÔNG thêm luật riêng vào đây (luật riêng → 01_CONSTITUTION.md). Phần luật CHUNG giữ khớp bản app. -->
# <PROJECT> — Quy tắc làm việc (hệ NON-APP)

> AI đọc file này SAU `01_CONSTITUTION.md` (hiến pháp — bất biến riêng của project, tối cao). Tuân thủ tuyệt đối.
> Điều hướng mở phiên (đọc gì, thứ tự nào): `AGENTS.md` ở root. Quy trình thao tác chi tiết nằm ở **`.claude/skills/<tên>/SKILL.md`** (sổ đăng ký: [`04_SKILLS.md`](04_SKILLS.md)); RULES/STRUCTURE chỉ nêu NORM + trigger rồi dẫn chiếu. Backlog: `05_TODO.md`. Changelog: `06_CHANGES.md`.
> **Đây là hệ NON-APP** (BI/report · data · docs-only · design). Dự án không có UI-app mình phát triển → **KHÔNG có luật thiết kế UI** ở đây; agent chỉ đọc/dò/kéo/điền/xuất FILE (kể cả mở `.pbix`). Chuẩn cấu trúc = `03_STRUCTURE.md` (deliverable · tasks · data · automation).

## Cấu trúc repo — xem [`03_STRUCTURE.md`](03_STRUCTURE.md)
**Định nghĩa metric/cột → `03_STRUCTURE` §7 (từ điển dữ liệu, NGUỒN SỰ THẬT).** KHÔNG tạo `docs/dictionary.md` — một dự án MỘT từ điển; tách ra hai file là chắc chắn lệch, mà lệch định nghĩa metric thì **số liệu sai**, không phải tài liệu sai. Công thức thực tế khác mô tả ⇒ BÁO, không tự sửa bên nào.

**Chuẩn cấu trúc folder ĐẦY ĐỦ** (cây từng-dòng + routing "cần gì → vào đâu" + convention) nằm ở **[`03_STRUCTURE.md`](03_STRUCTURE.md)** — **đọc TRƯỚC khi sửa/tạo folder**; cần gì → routing của `03` trỏ THẲNG slot (KHÔNG grep cả repo). Nắn repo về chuẩn → skill **`.claude/skills/reconcile/`**.

- **`03_STRUCTURE` là INDEX phải KHỚP repo (luật làm việc):** mọi thay đổi cấu trúc (thêm/đổi/dời slot, thêm routing) phải cập nhật `03_STRUCTURE` trong CÙNG thay đổi đó — index lệch thực tế = tra sai. *(Nội dung chuẩn — 3 vai trò bắt buộc, 1 tên/concern, tracked-vs-gitignore, adhoc≠task… — nằm ở `03`, KHÔNG lặp ở đây.)*
- **SỬA/TẠO BẤT CỨ GÌ (deliverable · sources · tasks · data · scripts · docs · config) → PHẢI đúng CHUẨN ĐÃ CHỐT (luật cứng).** Trước/trong khi tạo·đổi·dời file: đối chiếu `03_STRUCTURE` (slot · routing · convention) + `01_CONSTITUTION` (bất biến) + `02_RULES`. **TUYỆT ĐỐI không đặt file sai slot, không đẻ tên mới cho concern đã có tên, không rải SQL/DAX/M inline.** Không chắc chuẩn ở đâu → tra routing `03` hoặc HỎI, đừng đoán. Thấy chỗ ĐANG lệch chuẩn → nắn về chuẩn (hoặc BÁO nếu lớn/khó đảo), KHÔNG nhân thêm cái sai lên.

## Luật khi VIẾT (BẮT BUỘC — luật cứng)

> Những luật này nổ **lúc viết code**, không phải lúc tạo folder — và `zemory conform` **không kiểm được**
> cái nào trong số chúng. Không biết = vi phạm âm thầm, không gate nào kêu. Vì vậy chúng ở đây (luôn nạp),
> chứ không ở `03_STRUCTURE` (tra khi cần). `03` KHÔNG còn giữ bản sao — một nguồn duy nhất.

```
Nhị phân nặng        .pbix/.twb/.fig/.psd → Git LFS (track file, LFS lo dung lượng); như share/*.enc
Data thật vs mẫu     nguồn/extract THẬT → data/ (gitignore, theo máy) · mẫu nhỏ mở được deliverable → fixtures/ (tracked)
Secret/connection    config/*.example.* tracked (trỏ TÊN env) · connection thật → .env / *.local.* (gitignore). KHÔNG commit secret
Bề mặt CHẾT THEO nền  **Mọi bề mặt phụ thuộc một tiến trình chạy nền (launcher đang chờ · pipeline nhiều bước · job theo lịch · cửa sổ tool đang mở) PHẢI phát hiện nền chết và CHẾT THEO — hoặc báo lỗi THẤY ĐƯỢC. TUYỆT ĐỐI không để lại vỏ rỗng trông như đang chạy.** Vỏ rỗng là kiểu hỏng TỆ NHẤT — nó không báo lỗi, nó **NÓI DỐI**: người dùng thấy "đang chạy…" rồi chờ hàng giờ trong khi KHÔNG có gì đang chạy, và không có cách nào phân biệt với chạy-thật. Áp cụ thể ở đây: stage pipeline chết giữa chừng phải trả **mã thoát ≠ 0** và nói rõ chặng nào · cổng readiness thất bại thì **DỪNG chuỗi**, không chạy tiếp rồi xuất file thiếu số · file deliverable ghi dở phải bị coi là LỖI, không để lại bản cụt trông như đã xong
Separator của INDEX   ⛔ ĐỪNG "dọn cho đẹp": chỉ mục docs lưu đường theo separator của OS (`docs\agent\05_TODO.md`), KHÔNG posix — và mọi chỗ TRA cũng ghép bằng `join`. Từng có đợt chuẩn hoá sang `/`, hậu quả đo được: `plan ls` IM LẶNG báo "index rỗng" dù chỉ mục đủ, và `reindex` lần sau đẻ doc row TRÙNG. Muốn đổi = một MIGRATION riêng (đổi index cũ + mọi chỗ tra trong CÙNG một bước)
SQL/DAX/M            gom queries/ hoặc measures/, đặt tên — KHÔNG rải inline (đối xứng store/queries của app)
```
## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- **Văn phong harness = KỸ THUẬT / QUY PHẠM, KHÔNG văn nói.** Hiến pháp, rules, structure và plan viết dạng đặc tả: câu mệnh lệnh ngắn gọn, thuật ngữ chính xác, nêu điều kiện → hành vi. Không dùng khẩu ngữ, câu cảm thán, ví dụ hội thoại, hay lối kể chuyện phiếm.
- **CLI / script output** (nếu có tool/script phụ): **English HOẶC i18n đủ 2 dict** — **0 chuỗi hardcode**. **Thuật ngữ kỹ thuật / chuyên ngành nặng GIỮ NGUYÊN, KHÔNG dịch** (tên công nghệ, API, metric, viết tắt — dịch ra làm sai nghĩa).
- **code · comment (script/pipeline/measure): TIẾNG ANH TOÀN BỘ** — comment · docstring · tên biến/hàm · log/thông điệp kỹ thuật · commit message. Một file một ngôn ngữ. **Ba thứ KHÔNG phải comment — KHÔNG dịch:** ① **chuỗi RENDER ra tài liệu / bề mặt người đọc** (desc·note của bảng/cột sinh vào `docs/`, nhãn report) theo luật của docs ở trên, không theo luật code · ② **tên do người khác đặt** (tên cột Excel · trường API · tên file nguồn — vd `"Kich thuoc khu dat"`) giữ NGUYÊN từng ký tự dù trông như "mất dấu": đổi là loader không tìm thấy · ③ **thuật ngữ chuyên ngành** giữ nguyên. Comment bản địa cũ: sửa khi **đang đụng file đó**, KHÔNG mở chiến dịch dịch hàng loạt (đo một repo BI: 20.203 token comment dịch hết tiết kiệm ~4.000 token/lần đọc toàn repo).
- **CHỮ TRONG SẢN PHẨM GIAO ĐI PHẢI ĐẦY ĐỦ VÀ ĐÚNG — ba ràng buộc, áp lúc VIẾT.**
  Người đọc nhận sản phẩm, không nhận quy trình; một lỗi chữ thì không cổng nào kêu.
  · **① Có dấu, đúng chính tả.** Văn bản tiếng Việt phải CÓ DẤU và không mang mojibake (UTF-8 bị
    đọc thành Latin-1: `Ã¡` · `â€` · `ï»¿`).
  · **② Chú thích ĐỦ.** Mỗi bảng có tiêu đề cột · mỗi hình/biểu đồ có chú thích · **mỗi số có đơn
    vị + kỳ**. Số trần không đơn vị là số không kiểm được.
  · **③ Một thuật ngữ MỘT tên** xuyên suốt mọi trang giao đi (đối chiếu từ điển của project nếu có);
    cùng một thứ gọi hai tên là bắt người đọc tự đoán.
  *(Cách đo + bẫy báo oan nằm ở `.claude/skills/audit/`.)*
## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `01_CONSTITUTION.md` | hiến pháp — bất biến riêng của project | CHỈ user chốt; agent đề xuất qua TODO |
| `04_SKILLS.md` | **sổ ĐĂNG KÝ** skill: một dòng mỗi skill + luật dùng. Playbook nằm ở `.claude/skills/<tên>/SKILL.md` | khi thêm/bớt một skill |
| `05_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `06_CHANGES.md` | changelog | mỗi lần sửa deliverable/pipeline/measure; **chỉ ghi sau khi xác nhận OK** (viết tay đúng format `## [YYYY-MM-DD] — tiêu đề`) |
- **Quy trình thao tác = MỘT file skill, đăng ký HAI chỗ.** Việc lặp lại đóng thành `.claude/skills/<tên-tiếng-anh>/SKILL.md` (frontmatter `name` + `description` — `description` là thứ DUY NHẤT quyết định skill có được gọi ra hay không), rồi thêm **một dòng vào `04_SKILLS` §2 và một dòng vào bảng trigger `AGENTS.md`**. Thiếu một trong hai = skill mồ côi, phiên sau không tìm ra. **KHÔNG nhét playbook trở lại `04_SKILLS`** — nó là sổ đăng ký, có trần 60 dòng và gate canh.
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế. **Định nghĩa metric/cột KHÔNG ở đây** → `03_STRUCTURE` §7 (một dự án một từ điển; KHÔNG tạo `docs/dictionary.md`) |

- **Docs = FILE là nguồn (FILE WINS):** viết/sửa `.md` trực tiếp BÁM CHUẨN (đúng file, đúng vai trò, changelog đúng format `## [YYYY-MM-DD] — tiêu đề`); **xong là xong** — file là nguồn, KHÔNG cần chạy gì thêm. Muốn `plan search`/`changelog search` tươi thì chạy `zemory reindex` (đọc `.md` → dựng lại search index, **KHÔNG ghi ngược file**).
- **Đồng bộ bắt buộc — constitution ↔ rules ↔ todo ↔ change ↔ plan luôn khớp:** mỗi thay đổi → TODO phản ánh việc, CHANGES ghi log (sau khi OK), plan cập nhật nếu đổi thiết kế. Không để lệch nhau (đây là khớp NỘI DUNG giữa các FILE, không phải chạy sync).
- **Mỗi file harness làm ĐÚNG MỘT việc — KHÔNG lặp nội dung file khác.** `01` hiến pháp · `02` luật làm việc · `03` chuẩn cấu trúc folder · `04` sổ đăng ký skill (playbook → `.claude/skills/`) · `05` backlog · `06` changelog. Một nội dung chỉ sống ở ĐÚNG MỘT nhà; file khác cần thì **DẪN CHIẾU** (link + số hiệu), KHÔNG chép lại. Đọc hết 6 file KHÔNG được thấy nội dung trùng. **§7 của `03` là nhà DUY NHẤT của từ điển dữ liệu.**
- **Plan (`docs/plan/`) — chỉ chứa SPECS:** KHÔNG todo (→ `05_TODO`), KHÔNG luật (bất biến/luật riêng → ĐỀ XUẤT vào `01_CONSTITUTION`, plan chỉ dẫn chiếu điều khoản). Chuẩn đặt tên `NN_tên.md` (`00`=overview): xem `03_STRUCTURE`.
- ### SỔ VIỆC `05_TODO` — LUẬT DUY NHẤT, phủ cả cửa VÀO lẫn cửa RA (luật cứng)
  > Mọi luật về sổ việc sống Ở ĐÂY. File khác cần thì **dẫn chiếu** mục này, KHÔNG chép lại và
  > KHÔNG đặt thêm luật riêng cho sổ ở chỗ khác — đó chính là cách bộ luật tự đá nhau.

  **① CỬA VÀO — agent KHÔNG tự thêm mục. Phải HỎI, và phải ĐÁNG.**
  Agent không tự phát sinh: mục `05_TODO` mới · luật/điều khoản mới · cổng test · bộ đếm · bộ đo ·
  lớp cảnh báo · mục advisory. Thấy cần ⇒ **hỏi MỘT câu kèm đề xuất ngay trong phiên**; user gật
  thì mới ghi, gật vào đâu ghi vào đó (`01` bất biến · `02` luật làm việc · `05` việc).
  - **Đề xuất KHÔNG được "đậu" vào sổ chờ duyệt.** Vế cũ *"ghi ĐỀ XUẤT vào `05_TODO` chờ user
    duyệt"* đã **BÃI BỎ** — nó dạy agent *đậu* thay vì *hỏi*, mà mục đậu thì **không bao giờ đóng
    được**: nó không phải việc chưa làm, nó là câu hỏi chưa ai trả lời. Đó là cách sổ phình.
  - **Ngưỡng: THỰC SỰ QUAN TRỌNG.** Lắc nhắc thì bỏ qua — không ghi sổ, không dựng cổng, không
    thêm dòng cảnh báo. Sổ và bộ gác là **tài sản chung có giá**: mỗi dòng thêm vào là thứ MỌI
    phiên sau phải đọc *và* phải soát lại.
  - **Thêm một lớp là thêm một chỗ hỏng.** Bộ đo không làm hệ tốt lên, nó chỉ nói hệ đang thế nào.
    Kiểu hỏng hay gặp nhất là **bộ gác tự bẫy chính mình**: cổng nhận cờ lạ rồi chạy thật · bộ dò
    khớp nhầm chính chuỗi nó đi tìm · phép đo báo oan trên đúng file định nghĩa ra nó. Cả ba đều
    sinh từ một lượt *"thêm cho chắc"*.
  - **Trước khi thêm bất cứ thứ gì, trả lời đủ ba câu:** ① **gỡ bớt** được cái gì không · ② **gộp**
    vào cổng/luật đã có được không · ③ **không có nó thì hỏng cái gì**, đo được không.
    Không trả lời được ③ ⇒ **KHÔNG LÀM**. Hướng đúng là TỐI ƯU, không phải BỒI ĐẮP.
  - **KHÔNG áp cho:** việc user giao · sửa thứ đang hỏng · nghĩa vụ mà luật SẴN CÓ đã bắt buộc.
    Ba ca đó cứ làm, không phải xin.

  **② CỬA RA — XONG MỘT VIỆC LÀ ĐÓNG NGAY, không đợi chốt phiên.** Ngay khi một mục `05_TODO` xong,
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

- **Global Memory là NGUỒN của phiên (BẮT BUỘC verify):** episodic sống sót qua context-trim, còn trí nhớ trong context thì bị lược → khi ĐỔI SESSION / ghi docs / audit / báo cáo, PHẢI dò Global Memory (`zemory memory search`/`digest <session>`) + đối chiếu deliverable/pipeline/measure THẬT để **verify TỪNG mục TRƯỚC khi ghi hay khẳng định** — không ghi/báo theo trí nhớ tóm tắt hay kết quả subagent chưa kiểm. Đây là chốt chặn "đổi session là sót/lệch". Chi tiết: `.claude/skills/session-close/` Bước 0.

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
- **Vế ngược — bạn đang ĐỨNG TRONG repo tham khảo:** mở một repo khác chỉ để **xem/copy chuẩn** thì **CHỈ ĐỌC**. Lệnh `zemory` **GHI theo cwd**: chạy `init`/`sync`/`reindex`/`archive`/`memory scan` khi đang đứng ở repo đó = **ghi vào repo đó + DB của nó**, không phải vào project bạn. Lấy chuẩn = **đọc `docs_template/`** (bản mẫu TRẮNG — KHÔNG phải `docs/`, đó là docs RIÊNG của repo nguồn-chuẩn đó) **rồi chạy lệnh Ở REPO CỦA BẠN**.

## Git (BẮT BUỘC — luật cứng)
- **KHÔNG `git push` khi user CHƯA cho phép.** Git remote là **nguồn BACKUP CUỐI CÙNG** của project — đẩy lên là ra ngoài, không gỡ lại được (gỡ = force-push, càng phá). Xong việc → **BÁO CÁO rồi DỪNG**; user bảo "push"/"lên git" mới đẩy.
- **Ghi sổ ≠ publish:** user bảo ghi changelog / commit / "xong rồi" **KHÔNG phải** là cho phép push. Đừng suy diễn.
- Commit cục bộ (đảo được) thì thoải mái theo phong cách repo; **push mới là cửa cần phép**.
- KHÔNG `--force`, KHÔNG rewrite lịch sử đã push, KHÔNG `reset --hard`/`clean` lên việc chưa commit của user nếu chưa hỏi.

## Guardrail lớp ① — luật bất khả đảo phải có CHỐT MÁY (BẮT BUỘC khi repo có đường cấm)
- Luật mà vi phạm là **KHÔNG đảo được** (secret vào commit · ghi vào đường cấm · `git push` chưa xin) **không được chỉ có chữ gác** — chữ là tầng quan sát, phát hiện SAU, không ngăn được lúc xảy ra.
- **`zemory hook guard`** sinh bộ chốt vào `<nhà harness>/hooks/`: `policy.json` (luật — sinh từ khoá `protected` / `secretNames` trong `.harness.json`) · `guard.cjs` (PreToolUse — chặn TRƯỚC khi hành động chạm đĩa/mạng) · `precommit-guard.cjs` (chặn secret vào staging, phủ cả người). Cách nối vào runtime lệnh in ra — **user duyệt rồi tự nối, tool không tự cắm**.
- **Flag `.allow-*` = user duyệt MỘT VIỆC.** Guard cho qua rồi **đóng dấu** `ZEMORY-USED <vân tay lệnh> <thời điểm>` vào chính file flag — **không xoá ngay**: hook `PreToolUse` chỉ nói *cho qua*, nó KHÔNG biết lệnh có thật sự chạy hay không, nên một tầng khác của host chặn lại là flag mất oan. Trong **90 giây**, ĐÚNG lệnh đó được thử lại; xin việc KHÁC hoặc quá hạn ⇒ flag bị **thu hồi**, phải xin lại. Agent chỉ được tạo flag SAU khi user nói rõ trong phiên. **Nhóm secret KHÔNG có flag.**
- Khai đường cấm ghi của repo qua khoá `protected: ["..."]` trong `.harness.json`; `zemory doctor` nhắc khi đã khai mà chưa sinh chốt.
- **Đường `protected` trỏ vào thứ CHỈ ĐỌC — ĐỪNG trỏ vào sản phẩm mà chính repo đang tạo ra.** Đúng chỗ cho nó: **đầu vào gốc** (`data/*/01_raw`) · **hiến pháp** · **két bí mật** — thứ harness/agent không có việc gì phải sửa. Trỏ vào **deliverable đang được xây** (báo cáo · model · nội dung) thì mọi lượt sửa thường ngày đều phải xin flag, và **một cổng kêu suốt là cổng sắp bị gỡ** (*gate nhiễu ⇒ gate bị bỏ qua*) — mất nhiều hơn được. Muốn chống sửa nhầm sản phẩm thì dùng **git** (đảo được), không dùng chốt lớp ① (dựng ra để gác thứ BẤT KHẢ ĐẢO).
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
- **Chỉ làm đúng cái được yêu cầu.** Đụng thứ khác → **hỏi trước**, không tự sửa rồi báo.
- **Yêu cầu không rõ ràng phải được làm rõ trước khi thực thi — cơ chế TỰ ĐỘNG, KHÔNG chờ user gọi "grill".** Kích hoạt khi: yêu cầu đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược. → Chạy skill **`.claude/skills/grill/`** (dừng · cái nào đọc được thì đọc · hỏi mỗi lần MỘT câu kèm đề xuất · chốt đủ rõ mới làm). KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn. (User gõ "grill" = ép chạy thủ công.)
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi yêu cầu rõ).
- **Thao tác xóa phải được user xác nhận trước.** Xóa file, deliverable, measure, script, nội dung docs hoặc folder được coi là bất khả đảo ngược: nêu đối tượng và lý do, chờ chấp thuận rồi mới thực hiện; không tự xóa rồi báo sau. Thành phần dư thừa hoặc không còn dùng: đề xuất, không tự xóa. Bổ sung/mở rộng không cần xác nhận; xóa/thu hẹp luôn cần.
- **CHƯA XÁC MINH THÌ CHƯA PHẢI SỰ THẬT — KHÔNG BỊA, KHÔNG SUY DIỄN (luật cứng).** Áp cho **mọi khẳng định**, không riêng con số: trạng thái hệ thống · nguyên nhân · "cái gì đang xảy ra" · "đã xong chưa". Mỗi khẳng định phải truy được về **nguồn kiểm được** (đọc file · chạy lệnh · gọi bề mặt thật · tra tài liệu ngoài). **Tra không ra ⇒ nói thẳng "không biết / chưa xác minh được"** và nêu đã thử đường nào — cấm lấp bằng suy đoán nghe hợp lý, vì *nghe hợp lý* chính là thứ làm nó lọt.
  Trước khi ① báo cáo một con số · ② kết luận "đã xong / chưa xong" · ③ xoá bất cứ thứ gì — phải đo lại bằng **đường thứ hai, khác cơ chế** với đường thứ nhất. Chạy đúng một lệnh rồi tin luôn là nguồn của gần như MỌI lần báo sai. Bốn dạng thường gặp: công cụ trả rỗng vì **hỏng lặng** (cờ sai ⇒ âm tính giả ⇒ kết luận "sạch") · **báo oan** do phép so lỏng (so chuỗi không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai bản chất** (một khoá phụ trỏ hụt ⇒ tưởng dữ liệu mồ côi, suýt xoá thứ đang sống) · **sổ nói khác code** (mục đã xong vẫn ghi "chưa làm"). Kiểm chéo = đổi công cụ (grep ↔ script đọc byte), đổi hướng (đếm xuôi ↔ đếm ngược), hoặc gọi bề mặt thật (DB ↔ API).
- **📋 SOÁT SỔ = ĐO LẠI TỪNG MỤC, KHÔNG ĐỌC RỒI CHÉP LẠI (luật cứng).**
  **ÁP MỌI LÚC — KHÔNG chờ chốt phiên.** Kích hoạt ngay khi user nói *"check todo"* · *"còn gì chưa làm"* · *"liệt kê ra"* · *"soát lại"* · *"plan/change tới đâu rồi"*, hay khi agent tự mở sổ giữa chừng. Phần lớn ca hỏng là GIỮA PHIÊN, ngay sau khi vừa xong một việc — đúng lúc dễ tưởng mình đang nhớ rõ nhất.
  - **Vì sao:** mỗi mục trong `05_TODO` là một **KHẲNG ĐỊNH VỀ TRẠNG THÁI** ("chưa làm", "chờ duyệt", "còn N mục") — mà khẳng định thì phải **truy được về nguồn kiểm được** (luật ngay trên). File `.md` là nguồn của *nội dung* (FILE WINS), **KHÔNG phải nguồn của sự thật hệ thống**. Đọc sổ rồi báo lại y nguyên = báo cáo chưa xác minh, dù chữ nằm trong file của chính mình.
  - **TRƯỚC khi liệt kê / báo cáo / hỏi user về bất kỳ mục nào — BA NGUỒN, CHẠY ĐỦ CẢ BA. KHÔNG chọn nguồn theo "loại mục".** Ba nguồn trả lời BA câu KHÁC nhau, không nguồn nào thay được nguồn nào:
    · **① NGUỒN — *"file/số liệu hiện đang thế nào"***: mở đúng file, đếm đúng dòng/cột, chạy lại truy vấn. **Cấm suy từ mô tả.**
    · **② LỊCH SỬ QUYẾT ĐỊNH — *"đã từng quyết / làm gì"***: `zemory memory search --all`, **lọc riêng LỜI USER** (quyết định đến từ user, không từ agent). Quyết định hay nằm ở phiên khác, thậm chí **REPO KHÁC**.
    · **③ CHẠY THẬT — *"khi mở ra nó ra cái gì"***: mở chính bản giao (báo cáo · mô hình · bản xuất) nhìn tận mắt · làm mới dữ liệu rồi đối chiếu số. **Công thức/cấu hình có mặt KHÔNG bảo đảm số ra đúng** — nguồn đổi mà bản giao chưa làm mới thì sai LẶNG; còn lịch sử thì chỉ nói về quá khứ, không nói hiện tại.
    **CHỈ KHI CẢ BA KHỚP mới được kết luận.** Lệch nhau ⇒ **cái MỚI HƠN thắng**, và phải ghi rõ cái cũ đã bị thay — **lời nói của user CÓ HẠN DÙNG**: một quyết định cũ có thể bị chính việc làm sau đó supersede. Không chạm được nguồn nào (không mở được, mất mạng, chưa có quyền…) ⇒ ghi **"chưa xác minh được"** kèm nguồn đã thử — **KHÔNG** mặc định là "chưa làm", và **KHÔNG** lấy hai nguồn còn lại làm đủ.
    > ⚠ **Vì sao phải nói "đủ cả ba" thay vì liệt kê điều kiện:** bản cũ của chính luật này viết theo kiểu *"kiểm được bằng X ⇒ làm thế này · là quyết định ⇒ làm thế kia"* — đọc ra thành **bảng phân nhánh theo loại mục**, nên agent phân loại xong là rẽ MỘT nhánh rồi dừng. Đã trả giá thật, và trong cùng một ngày nó sai theo **hai hướng ngược nhau**: một mục chỉ chạy ① nên bỏ sót việc đã được sửa hai lần cùng một nguồn dữ liệu đã chết vẫn nằm trong bản quét; một mục khác chỉ chạy ② nên tin một câu user nói từ lâu rồi **gỡ mất một mục mà thực tế đã làm xong**. Cả hai đều lọt qua bản cũ **mà không vi phạm chữ nào**.
  - **Mục quá 7 ngày không ai đụng = NGHI NGỜ, không phải sự thật.** Đo trên một repo thật: soát 58 mục thì **11 sai (~19%)** — có mục đã làm xong vẫn mang dấu `[ ]`, có mục agent tự bịa vì thấy triệu chứng rồi phán nguyên nhân.
  - **Hỏi lại user một việc đã chốt là LỖI, không phải cẩn thận.** Nó bắt user trả lời hai lần cho cùng một câu và làm hỏng lòng tin vào cả bản danh sách.
  - **Máy phải canh, đừng dựa agent nhớ** (cùng doctrine `structure-sync`/`conform`): `zemory todo verify` đo lại từng mục bằng nguồn kiểm được (tên file/ký hiệu/bề mặt mà mục nêu có thật không · phép đo mục tự nêu có còn đúng không · nguồn đã đổi SAU khi dòng sổ được viết chưa) rồi in bảng LỆCH; exit khác 0 khi có lệch nên nối được vào cổng kiểm. Luật không có máy canh thì chỉ là lời hứa.
- **Test mới phải chứng minh mình ĐỎ ĐƯỢC.** Viết xong một test, hãy **phá code mà nó canh** rồi chạy lại: không đỏ ⇒ test đó chưa soi gì, phải sửa test chứ không phải mừng vì xanh. Hai lỗ điển hình: test chưa bao giờ chạy tới nhánh nguy hiểm, và test bị **bản sao logic ở nơi khác gánh thay**. Xanh KHÔNG phải bằng chứng (xem `.claude/skills/audit/` luật 1).
- **Nêu phản biện thiết kế trước khi thực thi** nếu phát hiện điểm bất hợp lý; quyết định cuối thuộc về user.
- **Đổi HÌNH HÀI / BỐ CỤC deliverable** (layout report/dashboard, chọn chart, theme trình bày) = quyết định TRÌNH BÀY → **trình user trước, KHÔNG tự đổi** (đi cặp với "chỉ làm đúng cái được yêu cầu"). *(Đây KHÔNG phải luật UI-app; chỉ là "đừng tự nắn hình hài sản phẩm giao đi".)* Cần ý tưởng biểu đồ → tham khảo skill `dataviz` rồi TRÌNH, không auto-apply.
- **Skill là THAM KHẢO cho khuyến nghị, KHÔNG auto-apply.** Trước khi làm việc mà skill phủ (dataviz cho report · review chất lượng · …) → ĐỌC skill → rút khuyến nghị (nên theo / đang kẹt / nên chuẩn hoá) → TRÌNH user; user chốt mới làm. Quy trình đầy đủ: `04_SKILLS` §1.
