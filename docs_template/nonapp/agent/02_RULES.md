<!-- zemory template · luật làm việc CHUNG mọi project — BẢN HỆ NON-APP (dự án là SẢN PHẨM/TÀI SẢN: agent đọc·dò·kéo·điền·xuất file; KHÔNG phát triển app ⇒ 0 luật UI). Ship nguyên từ template, KHÔNG thêm luật riêng vào đây (luật riêng → 01_CONSTITUTION.md). Phần luật CHUNG giữ khớp bản app. -->
# <PROJECT> — Quy tắc làm việc (hệ NON-APP)

> AI đọc file này SAU `01_CONSTITUTION.md` (hiến pháp — bất biến riêng của project, tối cao). Tuân thủ tuyệt đối.
> Điều hướng mở phiên (đọc gì, thứ tự nào): `AGENTS.md` ở root. Playbook thao tác chi tiết (grill · chốt phiên · reconcile · pull/fill/upload) → [`04_SKILLS.md`](04_SKILLS.md); RULES/STRUCTURE chỉ nêu NORM + trigger rồi dẫn chiếu. Backlog: `05_TODO.md`. Changelog: `06_CHANGES.md`.
> **Đây là hệ NON-APP** (BI/report · data · docs-only · design). Dự án không có UI-app mình phát triển → **KHÔNG có luật thiết kế UI** ở đây; agent chỉ đọc/dò/kéo/điền/xuất FILE (kể cả mở `.pbix`). Chuẩn cấu trúc = `03_STRUCTURE.md` (deliverable · tasks · data · automation).

## Cấu trúc repo — xem [`03_STRUCTURE.md`](03_STRUCTURE.md)
**Chuẩn cấu trúc folder ĐẦY ĐỦ** (cây từng-dòng + routing "cần gì → vào đâu" + convention) nằm ở **[`03_STRUCTURE.md`](03_STRUCTURE.md)** — **đọc TRƯỚC khi sửa/tạo folder**; cần gì → routing của `03` trỏ THẲNG slot (KHÔNG grep cả repo). Nắn repo về chuẩn → skill **[`04_SKILLS §reconcile`](04_SKILLS.md)**.

- **`03_STRUCTURE` là INDEX phải KHỚP repo (luật làm việc):** mọi thay đổi cấu trúc (thêm/đổi/dời slot, thêm routing) phải cập nhật `03_STRUCTURE` trong CÙNG thay đổi đó — index lệch thực tế = tra sai. *(Nội dung chuẩn — 3 vai trò bắt buộc, 1 tên/concern, tracked-vs-gitignore, adhoc≠task… — nằm ở `03`, KHÔNG lặp ở đây.)*
- **SỬA/TẠO BẤT CỨ GÌ (deliverable · sources · tasks · data · scripts · docs · config) → PHẢI đúng CHUẨN ĐÃ CHỐT (luật cứng).** Trước/trong khi tạo·đổi·dời file: đối chiếu `03_STRUCTURE` (slot · routing · convention) + `01_CONSTITUTION` (bất biến) + `02_RULES`. **TUYỆT ĐỐI không đặt file sai slot, không đẻ tên mới cho concern đã có tên, không rải SQL/DAX/M inline.** Không chắc chuẩn ở đâu → tra routing `03` hoặc HỎI, đừng đoán. Thấy chỗ ĐANG lệch chuẩn → nắn về chuẩn (hoặc BÁO nếu lớn/khó đảo), KHÔNG nhân thêm cái sai lên.

## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- **Văn phong harness = KỸ THUẬT / QUY PHẠM, KHÔNG văn nói.** Hiến pháp, rules, structure và plan viết dạng đặc tả: câu mệnh lệnh ngắn gọn, thuật ngữ chính xác, nêu điều kiện → hành vi. Không dùng khẩu ngữ, câu cảm thán, ví dụ hội thoại, hay lối kể chuyện phiếm.
- **CLI / script output** (nếu có tool/script phụ): **English HOẶC i18n đủ 2 dict** — **0 chuỗi hardcode**. **Thuật ngữ kỹ thuật / chuyên ngành nặng GIỮ NGUYÊN, KHÔNG dịch** (tên công nghệ, API, metric, viết tắt — dịch ra làm sai nghĩa).
- **code · comment công khai** (script/pipeline/measure): **TIẾNG ANH** — không nhét ngôn ngữ bản địa vào code/comment người khác đọc.

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `01_CONSTITUTION.md` | hiến pháp — bất biến riêng của project | CHỈ user chốt; agent đề xuất qua TODO |
| `04_SKILLS.md` | kho skill — playbook thao tác (grill · chốt phiên · reconcile · pull/fill/upload); CHỈ chứa skill | khi thêm/đổi một skill |
| `05_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `06_CHANGES.md` | changelog | mỗi lần sửa deliverable/pipeline/measure; **chỉ ghi sau khi xác nhận OK** (viết tay đúng format `## [YYYY-MM-DD] — tiêu đề`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế · **`docs/dictionary.md`** (BI/data NÊN có: định nghĩa metric/cột) |

- **Docs = FILE là nguồn (FILE WINS):** viết/sửa `.md` trực tiếp BÁM CHUẨN (đúng file, đúng vai trò, changelog đúng format `## [YYYY-MM-DD] — tiêu đề`); **xong là xong** — file là nguồn, KHÔNG cần chạy gì thêm. Muốn `plan search`/`changelog search` tươi thì chạy `zemory reindex` (đọc `.md` → dựng lại search index, **KHÔNG ghi ngược file**).
- **Đồng bộ bắt buộc — constitution ↔ rules ↔ todo ↔ change ↔ plan luôn khớp:** mỗi thay đổi → TODO phản ánh việc, CHANGES ghi log (sau khi OK), plan cập nhật nếu đổi thiết kế. Không để lệch nhau (đây là khớp NỘI DUNG giữa các FILE, không phải chạy sync).
- **Mỗi file harness làm ĐÚNG MỘT việc — KHÔNG lặp nội dung file khác.** `01` hiến pháp · `02` luật làm việc · `03` chuẩn cấu trúc folder · `04` kho skill (playbook) · `05` backlog · `06` changelog. Một nội dung chỉ sống ở ĐÚNG MỘT nhà; file khác cần thì **DẪN CHIẾU** (link + số hiệu), KHÔNG chép lại. Đọc hết 6 file KHÔNG được thấy nội dung trùng.
- **Plan (`docs/plan/`) — chỉ chứa SPECS:** KHÔNG todo (→ `05_TODO`), KHÔNG luật (bất biến/luật riêng → ĐỀ XUẤT vào `01_CONSTITUTION`, plan chỉ dẫn chiếu điều khoản). Chuẩn đặt tên `NN_tên.md` (`00`=overview): xem `03_STRUCTURE`.
- **Tra log sâu:** việc/lỗi/quyết định ở phiên khác → `zemory memory search "<q>" [--all]` (recall on-demand, tự tiết kiệm token; đừng tra bừa).

## Chốt phiên / ghi sổ (BẮT BUỘC — luật cứng)
**Kích hoạt khi user nói:** "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt** — quy trình đầy đủ (đọc lại 3 nguồn: FULL phiên hiện tại + FULL `docs/plan/*` + FULL `docs/agent/*` → định tuyến từng thứ về đúng file → chuẩn "không bỏ sót" → bước cuối `zemory validate`) ở skill **[`04_SKILLS §chốt phiên`](04_SKILLS.md)**. Bất biến: mọi việc đã làm phải tìm được ở `06_CHANGES` **hoặc** `05_TODO` (kể cả chẩn đoán sai / đường cụt); đổi thiết kế → `docs/plan/*`; luật riêng → ĐỀ XUẤT `05_TODO` chờ user chốt. Không tự `git push` (§Git).

- **Global Memory là NGUỒN của phiên (BẮT BUỘC verify):** episodic sống sót qua context-trim, còn trí nhớ trong context thì bị lược → khi ĐỔI SESSION / ghi docs / audit / báo cáo, PHẢI dò Global Memory (`zemory memory search`/`digest <session>`) + đối chiếu deliverable/pipeline/measure THẬT để **verify TỪNG mục TRƯỚC khi ghi hay khẳng định** — không ghi/báo theo trí nhớ tóm tắt hay kết quả subagent chưa kiểm. Đây là chốt chặn "đổi session là sót/lệch". Chi tiết: `04_SKILLS §chốt phiên` Bước 0.

## Changelog — supersede
- Mới nhất ở trên cùng (chèn ngay sau header).
- Entry **đảo/thay** quyết định cũ → mở đầu bằng:
  `> 🔄 **Supersede:** thay quyết định "[đề mục] ([ngày])" — [lý do].`
  Không sửa/xoá entry cũ; tuỳ chọn thêm `> ⤴ Đã bị thay bởi [ngày].` ở entry cũ.

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

## Hành xử
- **Chỉ làm đúng cái được yêu cầu.** Đụng thứ khác → **hỏi trước**, không tự sửa rồi báo.
- **Yêu cầu không rõ ràng phải được làm rõ trước khi thực thi — cơ chế TỰ ĐỘNG, KHÔNG chờ user gọi "grill".** Kích hoạt khi: yêu cầu đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược. → Chạy skill **[`04_SKILLS §grill`](04_SKILLS.md)** (dừng · cái nào đọc được thì đọc · hỏi mỗi lần MỘT câu kèm đề xuất · chốt đủ rõ mới làm). KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn. (User gõ "grill" = ép chạy thủ công.)
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi yêu cầu rõ).
- **Thao tác xóa phải được user xác nhận trước.** Xóa file, deliverable, measure, script, nội dung docs hoặc folder được coi là bất khả đảo ngược: nêu đối tượng và lý do, chờ chấp thuận rồi mới thực hiện; không tự xóa rồi báo sau. Thành phần dư thừa hoặc không còn dùng: đề xuất, không tự xóa. Bổ sung/mở rộng không cần xác nhận; xóa/thu hẹp luôn cần.
- **Nêu phản biện thiết kế trước khi thực thi** nếu phát hiện điểm bất hợp lý; quyết định cuối thuộc về user.
- **Đổi HÌNH HÀI / BỐ CỤC deliverable** (layout report/dashboard, chọn chart, theme trình bày) = quyết định TRÌNH BÀY → **trình user trước, KHÔNG tự đổi** (đi cặp với "chỉ làm đúng cái được yêu cầu"). *(Đây KHÔNG phải luật UI-app; chỉ là "đừng tự nắn hình hài sản phẩm giao đi".)* Cần ý tưởng biểu đồ → tham khảo skill `dataviz` rồi TRÌNH, không auto-apply.
- **Skill là THAM KHẢO cho khuyến nghị, KHÔNG auto-apply.** Trước khi làm việc mà skill phủ (dataviz cho report · review chất lượng · …) → ĐỌC skill → rút khuyến nghị (nên theo / đang kẹt / nên chuẩn hoá) → TRÌNH user; user chốt mới làm. Quy trình đầy đủ: `04_SKILLS §Cách dùng skill`.
