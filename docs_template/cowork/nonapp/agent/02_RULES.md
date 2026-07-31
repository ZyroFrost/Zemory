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

> Bốn luật này nổ **lúc viết**, không phải lúc tạo thư mục, và **không cổng kiểm nào bắt được**.
> Không biết = vi phạm âm thầm. Vì vậy chúng nằm ở đây (luôn nạp), không ở skill (tra khi cần).

```
Nhị phân nặng     .pbix/.twb/.fig/.psd → Git LFS (track file, LFS lo dung lượng)
Data thật vs mẫu  nguồn/extract THẬT → data/ (gitignore, theo máy) · mẫu nhỏ mở được sản phẩm → fixtures/ (tracked)
Secret/connection config/*.example.* tracked (trỏ TÊN env) · connection thật → .env / *.local.* (gitignore). KHÔNG commit secret
SQL/DAX/M         gom queries/ hoặc measures/, đặt tên — KHÔNG rải inline
```

## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`) và thân `SKILL.md`**: tiếng Việt có dấu.
- **Tên thư mục · tên skill · `name:` trong frontmatter**: **tiếng Anh**, chữ thường, nối bằng `-`.
- **Văn phong harness = KỸ THUẬT / QUY PHẠM.** Câu mệnh lệnh ngắn, thuật ngữ chính xác, nêu điều kiện → hành vi. Không khẩu ngữ, không kể chuyện, không ví dụ hội thoại.
- **code · comment trong `scripts/`**: **TIẾNG ANH**. Thuật ngữ chuyên ngành GIỮ NGUYÊN, không dịch.

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
- **Chỉ làm đúng cái được yêu cầu.** Đụng thứ khác → **hỏi trước**, không tự sửa rồi báo.
- **Yêu cầu không rõ phải được làm rõ TRƯỚC khi thực thi — cơ chế TỰ ĐỘNG, không chờ user gọi.** Kích hoạt khi: đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược. → Mở `.claude/skills/grill/`. KHÔNG tự chọn cách hiểu rộng nhất.
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi yêu cầu rõ).
- **Thao tác XOÁ phải được user xác nhận trước.** Xoá file, sản phẩm, script, nội dung docs hay thư mục đều coi là bất khả đảo: nêu đối tượng + lý do, chờ chấp thuận rồi mới làm. Thứ dư thừa: **đề xuất, không tự xoá**. Bổ sung/mở rộng không cần xác nhận; **xoá/thu hẹp luôn cần**.
- **CHƯA XÁC MINH THÌ CHƯA PHẢI SỰ THẬT — KHÔNG BỊA, KHÔNG SUY DIỄN (luật cứng).** Áp cho **mọi khẳng định**, không riêng con số: trạng thái hệ thống · nguyên nhân · "cái gì đang xảy ra" · "đã xong chưa". Mỗi khẳng định phải truy được về **nguồn kiểm được** (đọc file · chạy lệnh · gọi bề mặt thật · tra tài liệu ngoài). **Tra không ra ⇒ nói thẳng "không biết / chưa xác minh được"** và nêu đã thử đường nào — cấm lấp bằng suy đoán nghe hợp lý, vì *nghe hợp lý* chính là thứ làm nó lọt.
  Trước khi ① báo một con số · ② kết luận "xong / chưa xong" · ③ xoá bất cứ thứ gì — phải đo lại bằng **đường thứ hai, khác cơ chế**. Bốn dạng sai thường gặp: công cụ trả rỗng vì **hỏng lặng** (cờ sai ⇒ tưởng "sạch") · **báo oan** do so lỏng (không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai bản chất** (khoá phụ trỏ hụt ⇒ tưởng dữ liệu mồ côi, suýt xoá thứ đang sống) · **sổ nói khác thực tế**. Kiểm chéo = đổi công cụ, đổi hướng đếm, hoặc gọi bề mặt thật.
- **Phép kiểm mới phải chứng minh mình ĐỎ ĐƯỢC.** Viết xong một phép kiểm (script, công thức đối chiếu, bảng so số) → **phá đúng thứ nó canh** rồi chạy lại: không đỏ ⇒ nó chưa soi gì, phải sửa phép kiểm chứ không phải mừng vì xanh. Hai lỗ điển hình: phép kiểm chưa bao giờ chạy tới nhánh nguy hiểm, và **bản sao logic ở nơi khác gánh thay**. Xanh KHÔNG phải bằng chứng.
- **Nêu phản biện thiết kế trước khi thực thi** nếu thấy điểm bất hợp lý; quyết định cuối thuộc về user.
- **Đổi HÌNH HÀI / BỐ CỤC sản phẩm giao đi** (layout báo cáo, chọn biểu đồ, theme trình bày) = quyết định TRÌNH BÀY → **trình user trước, KHÔNG tự đổi**. Điền số theo mẫu có sẵn thì cứ làm.
- **Skill là THAM KHẢO để khuyến nghị, KHÔNG auto-apply.** Đọc skill → rút khuyến nghị (nên theo / đang kẹt / nên chuẩn hoá) → **TRÌNH user**; user chốt mới làm.
