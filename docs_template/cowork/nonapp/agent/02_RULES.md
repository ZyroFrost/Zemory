<!-- zemory template · luật làm việc CHUNG mọi project — BẢN HỆ NON-APP (dự án là SẢN PHẨM/TÀI SẢN:
     agent đọc·dò·kéo·điền·xuất file; KHÔNG phát triển app ⇒ 0 luật UI). Ship nguyên từ template.
     KHÔNG thêm luật riêng vào đây (luật riêng → 01_CONSTITUTION.md).
     File này LUÔN được nạp ⇒ chỉ chứa thứ cần ở MỌI lượt. Quy trình thao tác → .claude/skills/. -->
# <PROJECT> — Quy tắc làm việc (hệ NON-APP)

> Đọc SAU `01_CONSTITUTION.md` (bất biến riêng của dự án, tối cao). Tuân thủ tuyệt đối.
> Điều hướng nạp (đọc gì, lúc nào) → `AGENTS.md` ở root. Quy trình thao tác → `.claude/skills/`.

## Cấu trúc thư mục
**Cần đặt · tạo · dời bất cứ file nào → mở `.claude/skills/structure/` TRƯỚC.** Ở đó có cây thư mục, bảng tra "cần gì → để đâu", và quy ước đặt tên. Không chắc để đâu → tra bảng đó hoặc HỎI, **đừng đoán**. Thấy chỗ đang lệch chuẩn → nắn về chuẩn (lớn/khó đảo thì BÁO), KHÔNG nhân cái sai lên.
**Định nghĩa metric/cột** → `03_STRUCTURE` §2 (từ điển dữ liệu, nguồn sự thật). **KHÔNG tạo `docs/dictionary.md`** — một dự án một từ điển.

## Luật khi VIẾT (BẮT BUỘC — luật cứng)

> Năm luật này nổ **lúc viết**, không phải lúc tạo thư mục, và **không cổng kiểm nào bắt được**.
> Không biết = vi phạm âm thầm. Vì vậy chúng nằm ở đây (luôn nạp), không ở skill (tra khi cần).

```
Nhị phân nặng     .pbix/.twb/.fig/.psd → Git LFS (track file, LFS lo dung lượng)
Data thật vs mẫu  nguồn/extract THẬT → data/ (gitignore, theo máy) · mẫu nhỏ mở được sản phẩm → fixtures/ (tracked)
Secret/connection config/*.example.* tracked (trỏ TÊN env) · connection thật → .env / *.local.* (gitignore). KHÔNG commit secret
SQL/DAX/M         gom queries/ hoặc measures/, đặt tên — KHÔNG rải inline
ĐẦU VÀO CHỈ ĐỌC   data/<task>/01_raw/ là bản GỐC người ta gửi / kéo từ nguồn — **KHÔNG sửa, KHÔNG ghi đè, KHÔNG xoá**.
                  Trung gian (02_processing/) xoá thoải mái, dựng lại được; bản giao đi (03_output/) giữ để đối chiếu.
                  Ba chặng có BA VÒNG ĐỜI khác nhau, đó là lý do chúng tách — và vì sao chỉ 01_raw bất khả đảo:
                  trung gian mất thì chạy lại, đầu vào mất là mất luôn, đi xin lại người gửi.
```

## Chốt MÁY — `hooks/` (BẮT BUỘC nối nếu môi trường cho phép)

> 🔄 **Đảo quyết định cũ** (*"bộ cowork CỐ Ý không mang chốt máy vì không bảo đảm có CLI"*).
> Lý do đảo: bộ này **phụ thuộc hoàn toàn vào luật chữ**, mà chữ thì agent **quên được** — và
> đã quên. Kiểm lại rào cũ thì nó chỉ đúng một nửa: `guard.cjs` dùng **thuần `node:fs` + `node:path`**,
> **không cần CLI zemory lúc chạy** (CLI chỉ để SINH ra nó). Nên bộ này nay **ship sẵn bản đã sinh**.

`hooks/guard.cjs` + `hooks/policy.json` đã nằm sẵn trong bộ. **Nối vào cơ chế chặn-lệnh-trước-khi-chạy
của host** (Claude Code: `.claude/settings.json` → `PreToolUse` → `node hooks/guard.cjs`).
Host không có cơ chế đó ⇒ file nằm im, **vô hại**, và ăn ngay ngày host có.

```
CHAN ghi     data/*/01_raw   dau vao GOC moi case — mat la mat luon, phai xin lai nguoi gui
             docs/agent      hien phap + luat
CHAN xoa     xoa DE QUY (rm -r · Remove-Item -Recurse · del /S) — mot lenh quet ca cay
             xoa cham file secret (.env · *.key · *.pem …)
CHO QUA      02_processing/ · 03_output/ · file tam — agent ghi suot o day
Vuot mot lan flag hooks/.allow-* (user duyet trong phien; guard tu xoa sau khi dung)
```

**Chốt chặn ≠ chốt chặt.** Danh sách trên cố ý KHÔNG chặn xoá một file thường: gate nhiễu là
gate bị bỏ qua, và lúc đó nó tệ hơn không có gate. Sửa luật = sửa thẳng `hooks/policy.json`
(bộ này không có lệnh sinh lại).

**Bộ chặn này là LƯỚI ĐỠ, không phải người quyết.** Nó có mặt để đỡ những lúc bạn đọc sót hoặc
quên luật — nó **không** phải cơ chế cấm xoá, và **càng không** phải giấy phép. Quyền quyết định
xoá luôn thuộc **người dùng**: hỏi và được đồng ý TRƯỚC, dù bộ chặn có kêu hay không.
- **Nó im ≠ bạn được phép.** Nó chỉ bắt được những kiểu đã liệt kê ở trên; xoá một file thường
  cố ý cho qua, nhưng đó vẫn là việc không lấy lại được, vẫn phải hỏi.
- **Nó chặn ≠ hết việc.** Bị chặn thì đi HỎI người dùng, đừng tìm đường vòng và đừng tự tạo file
  cho phép.

**Không nối được chốt máy thì luật chữ ở §Hành xử vẫn áp nguyên** — *xoá là bất khả đảo, phải hỏi trước*.

## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`) và thân `SKILL.md`**: tiếng Việt có dấu.
- **Tên thư mục · tên skill · `name:` trong frontmatter**: **tiếng Anh**, chữ thường, nối bằng `-`.
- **Văn phong harness = KỸ THUẬT / QUY PHẠM.** Câu mệnh lệnh ngắn, thuật ngữ chính xác, nêu điều kiện → hành vi. Không khẩu ngữ, không kể chuyện, không ví dụ hội thoại.
- **code · comment trong `scripts/`**: **TIẾNG ANH**. Thuật ngữ chuyên ngành GIỮ NGUYÊN, không dịch.
- **CHỮ TRONG SẢN PHẨM GIAO ĐI PHẢI ĐẦY ĐỦ VÀ ĐÚNG — ba ràng buộc, áp lúc VIẾT.**
  Người đọc nhận sản phẩm, không nhận quy trình; một lỗi chữ thì không cổng nào kêu.
  · **① Có dấu, đúng chính tả.** Văn bản tiếng Việt phải CÓ DẤU và không mang mojibake (UTF-8 bị
    đọc thành Latin-1: `Ã¡` · `â€` · `ï»¿`).
  · **② Chú thích ĐỦ.** Mỗi bảng có tiêu đề cột · mỗi hình/biểu đồ có chú thích · **mỗi số có đơn
    vị + kỳ**. Số trần không đơn vị là số không kiểm được.
  · **③ Một thuật ngữ MỘT tên** xuyên suốt mọi trang giao đi (đối chiếu từ điển của project nếu có);
    cùng một thứ gọi hai tên là bắt người đọc tự đoán.
  *(Cách đo + bẫy báo oan nằm ở `.claude/skills/audit/`.)*
## Tài liệu
- **Docs = FILE là nguồn (FILE WINS):** sửa `.md` trực tiếp, bám chuẩn; **xong là xong**.
- **Mỗi file harness làm ĐÚNG MỘT việc — KHÔNG lặp nội dung file khác.** `01` hiến pháp · `02` luật làm việc · `03` chỗ-để-file + từ điển · `04` sổ đăng ký skill · `05` backlog · `06` changelog · `.claude/skills/` quy trình. Một nội dung sống ở ĐÚNG MỘT nhà; nơi khác cần thì **DẪN CHIẾU**, không chép lại.
- **Đồng bộ bắt buộc — `01` ↔ `02` ↔ `03` ↔ `04` ↔ `05` ↔ `06` ↔ `plan/` luôn KHỚP nhau.** Mỗi thay đổi: `05_TODO` phản ánh việc, `06_CHANGES` ghi log (sau khi user OK), `03` cập nhật nếu đụng cấu trúc/định nghĩa, `04` cập nhật nếu thêm/bớt skill, `plan/` cập nhật nếu đổi thiết kế. Sổ nói khác thực tế là dạng sai khó phát hiện nhất — không cổng nào bắt được.
- **`docs/plan/` chỉ chứa SPECS** — KHÔNG todo (→ `05_TODO`), KHÔNG luật (→ đề xuất vào `01_CONSTITUTION`).

## Chốt phiên / ghi sổ (BẮT BUỘC — luật cứng)
**Kích hoạt khi user nói:** "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.
→ Mở `.claude/skills/session-close/`. **TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt.**
Bất biến: mọi việc đã làm phải tìm được ở `06_CHANGES` **hoặc** `05_TODO` — kể cả chẩn đoán sai và đường cụt.

## Phạm vi (BẮT BUỘC — luật cứng)
- **CHỈ làm việc trong thư mục đang mở.** TUYỆT ĐỐI KHÔNG ghi/sửa/chạy lệnh đụng thư mục dự án khác khi user CHƯA cho phép rõ ràng trong phiên — **kể cả với ý định "giúp" hay "tiện tay sửa luôn"**.
- Cần đụng chỗ khác → **DỪNG, HỎI TRƯỚC**: nêu rõ định làm gì, ở đâu, vì sao. Nơi khác có thể đang có phiên khác làm việc.
- Đọc-tham-khảo (read-only) thì được; **mọi thao tác GHI là cấm mặc định**.

> 🖥️ **Chỉ khi có `zemory` CLI** (Claude Code trên máy thật — Cowork bỏ qua mục này):
> Lệnh `zemory` **GHI theo cwd**. Đứng ở repo tham khảo mà chạy `init`/`sync`/`reindex`/`archive`/`memory scan` = ghi vào repo ĐÓ. Lấy chuẩn = đọc `docs_template/`, rồi chạy lệnh **ở thư mục của bạn**.
> Tra việc ở phiên khác: `zemory memory search "<q>" [--all]` — recall on-demand, đừng tra bừa.

## Git (BẮT BUỘC — luật cứng, áp bất cứ khi nào thư mục làm việc là git repo)
- **KHÔNG `git push` khi user CHƯA cho phép.** Remote là bản sao lưu cuối cùng của dự án — đẩy lên là ra ngoài, **không gỡ lại được** (gỡ = force-push, càng phá). Xong việc → **BÁO CÁO rồi DỪNG**; user bảo "push" / "lên git" mới đẩy.
- **Ghi sổ ≠ publish.** User bảo ghi changelog, commit, hay nói "xong rồi" **KHÔNG phải** là cho phép push. Đừng suy diễn.
- Commit cục bộ (đảo được) thì thoải mái theo phong cách repo; **push mới là cửa cần phép**.
- KHÔNG `--force`, KHÔNG rewrite lịch sử đã push, KHÔNG `reset --hard`/`clean` lên việc chưa commit của user nếu chưa hỏi.

## Hành xử
- **HIỆN SUY NGHĨ TỪNG BƯỚC — CẤM CHẠY IM LẶNG (luật cứng).** Mọi bước phải để lộ *đang làm gì · vì sao · dựa trên số nào*, **ngay khi làm**, không dồn vào bản tổng kết cuối. Không được chạy một chuỗi dài rồi mới ngoi lên báo kết quả. **Vì sao:** thứ nguy hiểm nhất không phải làm sai, mà là **làm sai trong im lặng** — người dùng mất khả năng chặn giữa chừng, và khi phát hiện thì đã trôi qua hàng chục bước. Hệ quả bắt buộc: ① nói TRƯỚC mỗi cụm hành động, một dòng là đủ · ② mỗi khẳng định đi kèm nguồn đo được · ③ số đo lệch với dự đoán thì **nói ngay**, không đợi tới cuối · ④ việc chạy lâu phải báo đang chờ gì.
- **FILE TẠM PHẢI CÓ ĐƯỜNG CHẾT — không thứ gì được phình vô hạn.** Mọi thứ bạn tạo ra để LÀM VIỆC mà không phải sản phẩm giao đi (bản nháp, bản thử, dữ liệu trung gian, ảnh chụp, bản sao để so) phải có chỗ riêng và có đường dọn. Xong một phép thử mà biết chắc không dùng lại ⇒ **dọn ngay trong phiên**; thứ đáng giữ thì giữ nhưng phải NHỎ và nói rõ giữ vì gì. Rác không nằm trong sản phẩm nên không ai thấy nó lớn lên — cho tới lúc thư mục dự án hết dùng được.
- **Chỉ làm đúng cái được yêu cầu.** Đụng thứ khác → **hỏi trước**, không tự sửa rồi báo.
- **Yêu cầu không rõ phải được làm rõ TRƯỚC khi thực thi — cơ chế TỰ ĐỘNG, không chờ user gọi.** Kích hoạt khi: đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược. → Mở `.claude/skills/grill/`. KHÔNG tự chọn cách hiểu rộng nhất.
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi yêu cầu rõ).
- **Thao tác XOÁ phải được user xác nhận trước.** Xoá file, sản phẩm, script, nội dung docs hay thư mục đều coi là bất khả đảo: nêu đối tượng + lý do, chờ chấp thuận rồi mới làm. Thứ dư thừa: **đề xuất, không tự xoá**. Bổ sung/mở rộng không cần xác nhận; **xoá/thu hẹp luôn cần**.
- **CHƯA XÁC MINH THÌ CHƯA PHẢI SỰ THẬT — KHÔNG BỊA, KHÔNG SUY DIỄN (luật cứng).** Áp cho **mọi khẳng định**, không riêng con số: trạng thái hệ thống · nguyên nhân · "cái gì đang xảy ra" · "đã xong chưa". Mỗi khẳng định phải truy được về **nguồn kiểm được** (đọc file · chạy lệnh · gọi bề mặt thật · tra tài liệu ngoài). **Tra không ra ⇒ nói thẳng "không biết / chưa xác minh được"** và nêu đã thử đường nào — cấm lấp bằng suy đoán nghe hợp lý, vì *nghe hợp lý* chính là thứ làm nó lọt.
  Trước khi ① báo một con số · ② kết luận "xong / chưa xong" · ③ xoá bất cứ thứ gì — phải đo lại bằng **đường thứ hai, khác cơ chế**. Bốn dạng sai thường gặp: công cụ trả rỗng vì **hỏng lặng** (cờ sai ⇒ tưởng "sạch") · **báo oan** do so lỏng (không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai bản chất** (khoá phụ trỏ hụt ⇒ tưởng dữ liệu mồ côi, suýt xoá thứ đang sống) · **sổ nói khác thực tế**. Kiểm chéo = đổi công cụ, đổi hướng đếm, hoặc gọi bề mặt thật.
- **📋 SOÁT SỔ = ĐO LẠI TỪNG MỤC, KHÔNG ĐỌC RỒI CHÉP LẠI (luật cứng).**
  **ÁP MỌI LÚC — KHÔNG chờ chốt phiên.** Kích hoạt ngay khi user nói *"check todo"* · *"còn gì chưa làm"* · *"liệt kê ra"* · *"soát lại"* · *"plan/change tới đâu rồi"*, hay khi agent tự mở sổ giữa chừng. Phần lớn ca hỏng là GIỮA PHIÊN, ngay sau khi vừa xong một việc — đúng lúc dễ tưởng mình đang nhớ rõ nhất.
  - **Vì sao:** mỗi mục trong `05_TODO` là một **KHẲNG ĐỊNH VỀ TRẠNG THÁI** ("chưa làm", "chờ duyệt", "còn N mục") — mà khẳng định thì phải **truy được về nguồn kiểm được** (luật ngay trên). File `.md` là nguồn của *nội dung* (FILE WINS), **KHÔNG phải nguồn của sự thật hệ thống**. Đọc sổ rồi báo lại y nguyên = báo cáo chưa xác minh, dù chữ nằm trong file của chính mình.
  - **TRƯỚC khi liệt kê / báo cáo / hỏi user về bất kỳ mục nào — BA NGUỒN, CHẠY ĐỦ CẢ BA. KHÔNG chọn nguồn theo "loại mục".** Ba nguồn trả lời BA câu KHÁC nhau, không nguồn nào thay được nguồn nào:
    · **① NGUỒN — *"file/số liệu hiện đang thế nào"***: mở đúng file, đếm đúng dòng/cột, chạy lại truy vấn. **Cấm suy từ mô tả.**
    · **② LỊCH SỬ QUYẾT ĐỊNH — *"đã từng quyết / làm gì"***: có `zemory` CLI thì `zemory memory search --all` (**lọc riêng LỜI USER** — quyết định đến từ user, không từ agent); không có thì đọc `docs/agent/archive/`. Quyết định hay nằm ở phiên khác, thậm chí **REPO KHÁC**.
    · **③ CHẠY THẬT — *"khi mở ra nó ra cái gì"***: mở chính bản giao (báo cáo · mô hình · bản xuất) nhìn tận mắt · làm mới dữ liệu rồi đối chiếu số. **Công thức/cấu hình có mặt KHÔNG bảo đảm số ra đúng** — nguồn đổi mà bản giao chưa làm mới thì sai LẶNG; còn lịch sử thì chỉ nói về quá khứ, không nói hiện tại.
    **CHỈ KHI CẢ BA KHỚP mới được kết luận.** Lệch nhau ⇒ **cái MỚI HƠN thắng**, và phải ghi rõ cái cũ đã bị thay — **lời nói của user CÓ HẠN DÙNG**: một quyết định cũ có thể bị chính việc làm sau đó supersede. Không chạm được nguồn nào (không mở được, mất mạng, chưa có quyền…) ⇒ ghi **"chưa xác minh được"** kèm nguồn đã thử — **KHÔNG** mặc định là "chưa làm", và **KHÔNG** lấy hai nguồn còn lại làm đủ.
    > ⚠ **Vì sao phải nói "đủ cả ba" thay vì liệt kê điều kiện:** bản cũ của chính luật này viết theo kiểu *"kiểm được bằng X ⇒ làm thế này · là quyết định ⇒ làm thế kia"* — đọc ra thành **bảng phân nhánh theo loại mục**, nên agent phân loại xong là rẽ MỘT nhánh rồi dừng. Đã trả giá thật, và trong cùng một ngày nó sai theo **hai hướng ngược nhau**: một mục chỉ chạy ① nên bỏ sót việc đã được sửa hai lần cùng một nguồn dữ liệu đã chết vẫn nằm trong bản quét; một mục khác chỉ chạy ② nên tin một câu user nói từ lâu rồi **gỡ mất một mục mà thực tế đã làm xong**. Cả hai đều lọt qua bản cũ **mà không vi phạm chữ nào**.
  - **Mục quá 7 ngày không ai đụng = NGHI NGỜ, không phải sự thật.** Đo trên một repo thật: soát 58 mục thì **11 sai (~19%)** — có mục đã làm xong vẫn mang dấu `[ ]`, có mục agent tự bịa vì thấy triệu chứng rồi phán nguyên nhân.
  - **Hỏi lại user một việc đã chốt là LỖI, không phải cẩn thận.** Nó bắt user trả lời hai lần cho cùng một câu và làm hỏng lòng tin vào cả bản danh sách.
  - **Máy phải canh, đừng dựa agent nhớ** (cùng doctrine `structure-sync`/`conform`): `zemory todo verify` đo lại từng mục bằng nguồn kiểm được (tên file/ký hiệu/bề mặt mà mục nêu có thật không · phép đo mục tự nêu có còn đúng không · nguồn đã đổi SAU khi dòng sổ được viết chưa) rồi in bảng LỆCH; exit khác 0 khi có lệch nên nối được vào cổng kiểm. Luật không có máy canh thì chỉ là lời hứa.
- **Phép kiểm mới phải chứng minh mình ĐỎ ĐƯỢC.** Viết xong một phép kiểm (script, công thức đối chiếu, bảng so số) → **phá đúng thứ nó canh** rồi chạy lại: không đỏ ⇒ nó chưa soi gì, phải sửa phép kiểm chứ không phải mừng vì xanh. Hai lỗ điển hình: phép kiểm chưa bao giờ chạy tới nhánh nguy hiểm, và **bản sao logic ở nơi khác gánh thay**. Xanh KHÔNG phải bằng chứng.
- **Nêu phản biện thiết kế trước khi thực thi** nếu thấy điểm bất hợp lý; quyết định cuối thuộc về user.
- **Đổi HÌNH HÀI / BỐ CỤC sản phẩm giao đi** (layout báo cáo, chọn biểu đồ, theme trình bày) = quyết định TRÌNH BÀY → **trình user trước, KHÔNG tự đổi**. Điền số theo mẫu có sẵn thì cứ làm.
- **Skill là THAM KHẢO để khuyến nghị, KHÔNG auto-apply.** Đọc skill → rút khuyến nghị (nên theo / đang kẹt / nên chuẩn hoá) → **TRÌNH user**; user chốt mới làm.
