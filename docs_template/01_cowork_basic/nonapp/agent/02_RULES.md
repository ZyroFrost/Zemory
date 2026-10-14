<!-- zemory template · luật làm việc CHUNG mọi project — BẢN HỆ NON-APP (dự án là SẢN PHẨM/TÀI SẢN:
     agent đọc·dò·kéo·điền·xuất file; KHÔNG phát triển app ⇒ 0 luật UI). Ship nguyên từ template.
     KHÔNG thêm luật riêng vào đây (luật riêng → 01_CONSTITUTION.md).
     File này LUÔN được nạp ⇒ chỉ chứa thứ cần ở MỌI lượt. Quy trình thao tác → .claude/skills/. -->
# <PROJECT> — Quy tắc làm việc (hệ NON-APP)

> Đọc SAU `01_CONSTITUTION.md` (bất biến riêng của dự án, tối cao). Tuân thủ tuyệt đối.
> Điều hướng nạp (đọc gì, lúc nào) → `AGENTS.md` ở root. Quy trình thao tác → `.claude/skills/`.
- `02-38` **Sổ việc `05_TODO`.** ① **Cửa vào:** không tự thêm mục `05_TODO` · luật · cổng kiểm · bộ đếm · bộ đo ·
  advisory. Thấy cần ⇒ hỏi một câu kèm đề xuất trong phiên; được chấp thuận mới ghi, vào đúng file. Đề xuất không
  "đậu" vào sổ chờ duyệt. Ngưỡng: thực sự quan trọng — trước khi thêm trả lời đủ: gỡ bớt được gì · gộp vào cái có
  sẵn được không · không có nó thì hỏng gì, đo được không; không trả lời được câu cuối ⇒ không làm. Không áp cho việc
  được giao · sửa thứ đang hỏng · nghĩa vụ luật sẵn có bắt buộc. ② **Cửa ra:** một mục xong ⇒ đóng ngay: đo lại ·
  ghi `06_CHANGES` · xoá khỏi `05_TODO`; không đợi chốt phiên. <!-- gate: guard -->

## Lõi — luật không có chốt máy (bắt đọc)
<!-- zemory:core:start · luật KHÔNG có hook/test nào chặn — phần DUY NHẤT của file bị bắt đọc (read-first) và được chèn lại sau khi nén context; luật có chốt máy rồi thì dời ra khỏi đây -->
> Luật ở các mục sau mang dấu `<!-- gate: … -->`: hook chặn hoặc cổng đỏ khi vi phạm. Luật trong mục này không có lưới đỡ
> nào — chỉ người đọc giữ được. Mỗi luật: điều kiện → hành vi; số `02-N` không bao giờ đánh lại.

- `02-1` **Xong = có đường sang máy thứ hai, đã đo.** Thứ vừa dựng (lớp lưu · chỉ mục · bí mật · tài sản giao
  đi) phải khai được đường sang máy khác, và đường đó phải được đo. Chưa khai hoặc chưa đo ⇒ việc còn dở, kể cả khi
  cổng xanh. Quy trình: `.claude/skills/sync-path/SKILL.md`. <!-- gate-todo: nhắc mở sync-path khi thêm lớp lưu hoặc chỉ mục -->
- `02-2` **Văn bản đưa người đọc theo bộ luật văn phong.** Báo cáo · email · tài liệu giao đi viết cho người
  nhận, không mang giọng harness (mệnh lệnh · viết hoa nhấn giọng · thuật ngữ nội bộ). Luật:
  `.claude/skills/write-style/SKILL.md`. <!-- gate-todo: nhắc mở write-style khi soạn file giao đi -->
- `02-3` **Hiện từng bước, không chạy im lặng.** ① Trước mỗi cụm hành động nói một dòng: đang làm gì, vì sao
  · ② mỗi khẳng định kèm nguồn đo · ③ số đo lệch dự đoán ⇒ báo ngay, không dồn về tổng kết · ④ việc chạy nền lâu
  ⇒ báo đang chờ gì.
- `02-4` **File tạm có đường chết.** Thứ tạo ra để làm việc mà không phải sản phẩm giao đi (bản nháp · bản thử ·
  dữ liệu trung gian · ảnh chụp · bản sao để so) có chỗ riêng và có đường dọn. Thử xong và chắc không dùng lại ⇒
  dọn trong phiên; thứ giữ lại phải nhỏ và nói rõ giữ vì gì.
- `02-5` **`.gitignore` là giấu, không phải dọn.** File nháp ghi ra thư mục nháp ngoài repo. Buộc phải ghi
  trong repo (công cụ ép đường dẫn · script cần cwd) ⇒ đặt tên `_scratch_*` và xoá trong cùng lượt (lệnh xoá đi qua
  chốt `02-10`). Thêm pattern vào `.gitignore` không tính là đã dọn: file vẫn nằm trên đĩa và vẫn lớn lên.
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
  mô tả) · ② **lịch sử quyết định** (có CLI `zemory` thì `zemory memory search --all`, lọc lời người giao việc;
  không có thì đọc `docs/agent/archive/`) · ③ **chạy thật** (mở chính bản giao · làm mới dữ liệu rồi đối chiếu số).
  Ba nguồn khớp mới kết luận; lệch ⇒ cái mới hơn thắng và ghi rõ cái cũ bị thay; không chạm được một nguồn ⇒ ghi
  "chưa xác minh được" kèm nguồn đã thử — không mặc định "chưa làm", không lấy hai nguồn còn lại làm đủ. Mục quá 7
  ngày không ai đụng = nghi ngờ. Hỏi lại một việc đã chốt là lỗi. Có CLI ⇒ máy đo `zemory todo verify` (exit ≠ 0
  khi lệch).
- `02-13` **Phép kiểm mới phải đỏ được.** Viết xong một phép kiểm (script · công thức đối chiếu · bảng so số) ⇒
  phá đúng thứ nó canh rồi chạy lại; không đỏ ⇒ sửa phép kiểm. Hai lỗ hay gặp: phép kiểm không chạy tới nhánh
  nguy hiểm; bản sao logic ở chỗ khác gánh thay. Xanh không phải bằng chứng. <!-- gate-todo: nhắc phá mã cho đỏ khi thêm file test -->
- `02-14` **Thấy điểm bất hợp lý trong thiết kế ⇒ nêu phản biện trước khi làm;** quyết định cuối thuộc người giao
  việc.
- `02-15` **Đổi hình hài · bố cục sản phẩm giao đi** (layout báo cáo · chọn biểu đồ · theme trình bày) ⇒ trình
  trước, không tự đổi; điền số theo mẫu có sẵn thì cứ làm.
- `02-16` **Skill là tham khảo cho khuyến nghị, không tự áp.** Đọc skill, rút khuyến nghị (nên theo · đang kẹt ·
  nên chuẩn hoá), trình rồi mới làm.
- `02-61` **Hook là lưới đỡ, không phải người quyết.** Hook không phải cơ chế cấm, càng không phải giấy phép. Hook
  cho qua ≠ được phép: thao tác bất khả đảo vẫn phải hỏi trước dù không bị chặn. Hook chặn ≠ hết việc: bị chặn thì
  hỏi, không tìm đường vòng; cờ `.allow-*` chỉ tạo sau khi được cho phép rõ trong phiên. Chữ là tầng quyết định,
  máy là tầng đỡ hụt.
- `02-19` **Nhị phân nặng** (`.pbix` · `.twb` · `.fig` · `.psd`) đi qua Git LFS.
- `02-20` **Dữ liệu thật vs mẫu:** nguồn/extract thật ở `data/` (gitignore, theo máy); mẫu nhỏ đủ mở sản phẩm ở
  `fixtures/` (tracked).
- `02-25` **SQL · DAX · M gom vào `queries/` hoặc `measures/`, đặt tên** — không viết rải tại chỗ.
- `02-66` **Tên thư mục · tên skill · `name:` trong frontmatter: tiếng Anh, chữ thường, nối bằng `-`.**
- `02-27` **Văn phong harness là đặc tả kỹ thuật.** Hiến pháp · luật · cấu trúc · plan · skill viết câu mệnh lệnh
  ngắn, thuật ngữ chính xác, theo khuôn điều kiện → hành vi → phép kiểm. Không khẩu ngữ · cảm thán · hội thoại · kể
  chuyện. Không trích lời người giao việc, không ghi ngày chốt — lời gốc, bối cảnh, sự cố nằm ở `06_CHANGES` và
  Global Memory.
- `02-29` **Mã và comment trong `scripts/` viết tiếng Anh:** comment · docstring · tên biến/hàm · log; một file
  một ngôn ngữ. Không dịch ba thứ: ① chuỗi render ra tài liệu (desc·note sinh vào `docs/`) · ② tên do bên khác đặt
  (cột Excel · trường API · tên file nguồn — giữ từng ký tự, dù trông như Việt mất dấu) · ③ thuật ngữ chuyên ngành.
  Comment cũ: sửa khi đang đụng file đó, không dịch hàng loạt.
- `02-31` **Chữ trong sản phẩm giao đi phải đủ và đúng.** ① Có dấu, đúng chính tả; không có tiếng Việt mất dấu ở
  bất cứ file nào (plan · docs · chú thích script · tên test · chuỗi sinh máy): chỉ tiếng Anh hoặc tiếng Việt có dấu
  — ngại encoding thì viết tiếng Anh; không mojibake (`Ã¡` · `â€` · `ï»¿`). ② Chú thích đủ: bảng có tiêu đề cột ·
  hình có chú thích · mỗi số có đơn vị và kỳ. ③ Một thuật ngữ một tên xuyên suốt sản phẩm giao đi (đối chiếu từ
  điển dự án nếu có). Cách đo: skill `audit`.
- `02-33` **Docs: file `.md` là nguồn.** Sửa trực tiếp, đúng file, đúng vai trò; không cần chạy gì thêm.
- `02-34` **Các file harness luôn khớp nội dung:** mỗi thay đổi ⇒ `05_TODO` phản ánh việc · `06_CHANGES` ghi sau
  khi được xác nhận · `03` cập nhật khi đụng cấu trúc/định nghĩa · `04` cập nhật khi thêm/bớt skill · plan cập nhật
  khi đổi thiết kế. Sổ nói khác thực tế là dạng sai không cổng nào bắt.
- `02-35` **Mỗi file harness một việc, không lặp nội dung file khác:** `01` hiến pháp · `02` luật làm việc · `03`
  chỗ để file + từ điển · `04` sổ đăng ký skill · `05` backlog · `06` changelog · `.claude/skills/` quy trình. Một
  nội dung sống ở một nhà; nơi khác dẫn chiếu.
- `02-36` **`docs/plan/` chỉ chứa spec:** không todo (→ `05_TODO`, qua cửa vào `02-38`), không luật (⇒ hỏi).
- `02-37` **Plan gọn.** Plan là văn bản người viết để bàn và chốt thiết kế: giữ hướng đã chốt và điểm còn mở;
  lịch sử sang `06_CHANGES`; đổi hướng thì sửa tại chỗ, lý do ghi ở `06_CHANGES`. Không khối máy sinh nào trong
  `docs/plan` (mục lục · catalog · bảng tra do build sinh ⇒ file cạnh nguồn, plan trỏ link); sơ đồ và bảng cấu trúc
  vẽ tay khi bàn thiết kế là phần chính của plan — luật này không bao giờ là lý do xoá sơ đồ hay né không vẽ. Mỗi
  mục `05_TODO` gắn `→ plan/NN §mục`. Trần: một spec ~1.000 dòng · cả `docs/plan` ~5.000 dòng.
- `02-48` **Tiêu đề phiên** theo khuôn `<Repo>_<Model>_<d-m-yyyy>` (`<Model>` = model đang chạy; chủ đề chèn trước
  ngày; phiên thứ 2, 3 trong ngày thêm `_<số>` sau ngày; ngày không đệm số 0). Tiêu đề do người giao việc đặt, agent
  không tự đổi; phiên chưa có tiêu đề = chưa dùng. Tiêu đề phiên của chính mình lệch khuôn ⇒ nhắc một lần.
- `02-49` **Nhắn agent ở phiên khác** (khi môi trường cho phép): chỉ nhắn phiên đang chạy có tiêu đề chuẩn, ngày
  trong tiêu đề mới nhất của repo đó; phiên chưa có tiêu đề ⇒ không nhắn. Tiêu đề không phải địa chỉ gửi: có
  `zemory` thì tra `zemory peers` (★ = phiên được nhắn); không tra được ⇒ không gửi, báo lại. Trả lời tin đến bằng
  đúng địa chỉ `from` của tin.
- `02-52` **Commit cục bộ (đảo được) theo phong cách repo, không cần xin;** push mới là cửa cần phép (`02-50`).
<!-- zemory:core:end -->

## Hành xử
- `02-10` **Thao tác XOÁ phải được user xác nhận trước.** Xoá file, sản phẩm, script, nội dung docs hay thư mục đều coi là bất khả đảo: nêu đối tượng + lý do, chờ chấp thuận rồi mới làm. Thứ dư thừa: **đề xuất, không tự xoá**. Bổ sung/mở rộng không cần xác nhận; **xoá/thu hẹp luôn cần**. **Chốt máy:** guard chặn mọi lệnh xoá file trong repo (`rm` · `del` · `Remove-Item` · `git rm` · xoá trong script) và mọi lần sửa làm MẤT một số luật trong `01`/`02`, khi chưa có cờ `.allow-delete`; thư mục tạm được miễn; bãi bỏ một luật thì giữ số. <!-- gate: guard -->

## Cấu trúc thư mục
**Cần đặt · tạo · dời bất cứ file nào → mở `.claude/skills/structure/` TRƯỚC.** Ở đó có cây thư mục, bảng tra "cần gì → để đâu", và quy ước đặt tên. Không chắc để đâu → tra bảng đó hoặc HỎI, **đừng đoán**. Thấy chỗ đang lệch chuẩn → nắn về chuẩn (lớn/khó đảo thì BÁO), KHÔNG nhân cái sai lên.
**Định nghĩa metric/cột** → `03_STRUCTURE` §2 (từ điển dữ liệu, nguồn sự thật). **KHÔNG tạo `docs/dictionary.md`** — một dự án một từ điển.

## Luật khi VIẾT (BẮT BUỘC — luật cứng)

> Luật nổ lúc VIẾT. Dòng mang dấu `<!-- gate: … -->` có chốt máy; luật lúc-viết chưa có chốt nằm ở §Lõi.

```
02-21 Secret/connection config/*.example.* tracked (trỏ TÊN env) · connection thật → .env / *.local.* (gitignore). KHÔNG commit secret <!-- gate: guard -->
02-65 ĐẦU VÀO CHỈ ĐỌC   data/<task>/01_raw/ là bản GỐC người ta gửi / kéo từ nguồn — **KHÔNG sửa, KHÔNG ghi đè, KHÔNG xoá**. <!-- gate: guard -->
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
CHẶN ghi     data/*/01_raw   đầu vào GỐC mỗi case — mất là mất luôn, phải xin lại người gửi
             docs/agent      hiến pháp + luật
CHẶN xoá     mọi lệnh xoá file trong dự án (`02-10` — thư mục tạm miễn; cờ hooks/.allow-delete)
             xoá ĐỆ QUY (rm -r · Remove-Item -Recurse · del /S) — một lệnh quét cả cây
             xoá chạm file secret (.env · *.key · *.pem …)
CHẶN ngoài   ghi ra đường TUYỆT ĐỐI ngoài thư mục dự án (miễn thư mục tạm · ~/.claude · /dev/null)
             SQL bắt máy chủ ghi file (BACKUP/RESTORE … DISK) · SQL đổi cấu hình máy chủ (sp_configure, linked server, CREATE/DROP DATABASE)
             lệnh chạy trên MÁY KHÁC (ssh · Invoke-Command · psexec · winrs) mà tạo/xoá/đổi thứ gì — thư mục · task Scheduler · dịch vụ · registry; scp/rsync chép LÊN máy khác
             cờ hooks/.allow-outside · thêm chỗ được ghi / máy chủ được nhắm = allowed_roots / allowed_sql_servers trong policy.json
             giới hạn: đường hay SQL nằm trong file script hoặc dựng lúc chạy thì bộ chặn không thấy
CHO QUA      02_processing/ · 03_output/ · file tạm — agent ghi suốt ở đây
Vượt MỘT VIỆC bằng flag hooks/.allow-* (user duyệt trong phiên). Guard cho qua rồi ĐÓNG DẤU vào file flag, không xoá ngay: đúng lệnh đó được thử lại trong 90 giây; xin việc khác hoặc quá hạn thì flag bị thu hồi
```

**Chặn xoá:** mọi lệnh xoá file trong dự án cần cờ `hooks/.allow-delete` (thư mục tạm được miễn) — `02-10`. Sửa luật =
sửa thẳng `hooks/policy.json` (bộ này không có lệnh sinh lại).

Vai của bộ chặn: `02-61` (§Lõi).

**Không nối được chốt máy thì luật chữ (§Lõi · `02-10`) vẫn áp nguyên** — *xoá là bất khả đảo, phải hỏi trước*.

## Ngôn ngữ

> Có chốt máy: `02-26` · `02-30` (dưới đây). Còn lại (`02-66` · `02-27` · `02-29` · `02-31`) nằm ở §Lõi.
- `02-26` **Docs (`docs/agent` · `docs/plan`) và thân `SKILL.md` viết tiếng Việt có dấu.** Nhóm ngôn ngữ (`02-26` ·
  `02-66` · `02-27` · `02-29` · `02-30` · `02-31`) là mặc định của bộ này: người giao việc chốt bỏ hay nới vế nào thì
  ghi quyết định vào `01_CONSTITUTION` (giữ vế nào, bỏ vế nào, vì sao); agent không tự nới, không tự siết; chưa ai
  chốt ⇒ theo mặc định. Vế nên giữ kể cả khi nới hết: không viết tiếng Việt mất dấu — không muốn bỏ dấu thì viết
  tiếng Anh. <!-- gate: guard -->
- `02-30` **Định danh và tên file: ASCII tiếng Anh; trong mã chỉ chú thích được viết tiếng Việt.** Phủ: biến ·
  hằng · hàm · lớp · kiểu · tham số · khoá config/JSON · tên test · tên file · tên thư mục · tên nhánh git. Cấm cả
  dạng có dấu lẫn Việt mất dấu ghép lại. Miễn trừ: ba thứ ở `02-29` (dữ liệu, không phải định danh). Máy soi:
  `node .claude/skills/audit/scripts/lang-scan.mjs .` <!-- gate: guard -->

## Chốt phiên / ghi sổ (BẮT BUỘC — luật cứng)
**Kích hoạt khi user nói:** "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.
→ Mở `.claude/skills/session-close/`. **TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt.**
Bất biến: mọi việc ĐÃ LÀM phải tìm được ở `06_CHANGES` **hoặc** `05_TODO`. Chẩn đoán sai · đường cụt: gộp vào entry `06_CHANGES` của chính việc đó, **KHÔNG đẻ mục `05_TODO` riêng** (cửa vào ở trên).

## Phạm vi (BẮT BUỘC — luật cứng)
- `02-44` **CHỈ làm việc trong thư mục đang mở.** TUYỆT ĐỐI KHÔNG ghi/sửa/chạy lệnh đụng thư mục dự án khác khi user CHƯA cho phép rõ ràng trong phiên — **kể cả với ý định "giúp" hay "tiện tay sửa luôn"**. <!-- gate: guard -->
- `02-45` Cần đụng chỗ khác → **DỪNG, HỎI TRƯỚC**: nêu rõ định làm gì, ở đâu, vì sao. Nơi khác có thể đang có phiên khác làm việc. <!-- gate: guard -->
- `02-46` Đọc-tham-khảo (read-only) thì được; **mọi thao tác GHI là cấm mặc định**. <!-- gate: guard -->

> 🖥️ **Chỉ khi có `zemory` CLI** (Claude Code trên máy thật — Cowork bỏ qua mục này):
> Lệnh `zemory` **GHI theo cwd**. Đứng ở repo tham khảo mà chạy `init`/`sync`/`reindex`/`archive`/`memory scan` = ghi vào repo ĐÓ. Lấy chuẩn = đọc `docs_template/`, rồi chạy lệnh **ở thư mục của bạn**.
> Tra việc ở phiên khác: `zemory memory search "<q>" [--all]` — recall on-demand, đừng tra bừa.

## Git (BẮT BUỘC — luật cứng, áp bất cứ khi nào thư mục làm việc là git repo)
- `02-50` **KHÔNG `git push` khi user CHƯA cho phép.** Remote là bản sao lưu cuối cùng của dự án — đẩy lên là ra ngoài, **không gỡ lại được** (gỡ = force-push, càng phá). Xong việc → **BÁO CÁO rồi DỪNG**; user bảo "push" / "lên git" mới đẩy. <!-- gate: guard -->
- `02-51` **Ghi sổ ≠ publish.** User bảo ghi changelog, commit, hay nói "xong rồi" **KHÔNG phải** là cho phép push. Đừng suy diễn. <!-- gate: guard -->
- `02-53` KHÔNG `--force`, KHÔNG rewrite lịch sử đã push, KHÔNG `reset --hard`/`clean` lên việc chưa commit của user nếu chưa hỏi. <!-- gate: guard -->

## Đọc trước khi ghi (BẮT BUỘC — có chốt máy)
- `02-59` **Đọc trước khi ghi — có chốt máy.** `hooks/02-59_read-first.cjs` (guard gọi) chặn mọi thao tác ghi
  (Write/Edit · lệnh shell có ghi) tới khi phiên đã đọc bằng công cụ Read đủ phần bắt đọc khai ở
  `hooks/policy.json › read_first`: `02_RULES` §Lõi · ở `01_CONSTITUTION` khối ĐỌC KỸ (nếu có), các điều khối đó
  liệt kê và `## Mục đích` · cả `05_TODO`. File thiếu ranh giới mục ⇒ đòi cả file. `grep`/`head`/`Get-Content` không
  tính. Chốt so theo nội dung từng dòng: dòng đã thấy (Read, hoặc tự ghi bằng Edit/Write) không phải đọc lại; file
  đổi chỉ đòi đúng các dòng đã đổi, câu chặn ghi số dòng. Đòi thêm theo việc: ghi vào `tasks/<case>/` ⇒ `spec.md` ·
  `mail_form.md` của case · tạo thư mục mới ⇒ `03_STRUCTURE` · chạy script gửi mail ⇒ skill `write-style`. Nén
  context không bắt đọc lại. Lệnh đọc Global Memory và dò phiên (`zemory memory …` · `peers` · `graph`) không bị chặn.
  Không có cờ vượt. Khai thêm file bắt đọc: sửa `hooks/policy.json › read_first`. Giới hạn: host không ghi transcript
  ⇒ cho qua (fail-open); phần "đòi theo việc" chỉ phủ chỗ máy đoán tất định được — luật chữ vẫn là tầng quyết định. <!-- gate: read-first -->

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
