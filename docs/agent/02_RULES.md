<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — Quy tắc làm việc

> AI đọc file này SAU `01_CONSTITUTION.md` (hiến pháp — bất biến riêng của zemory, tối cao). Tuân thủ tuyệt đối.
> Điều hướng mở phiên (đọc gì, thứ tự nào): `AGENTS.md` ở root. Quy trình chi tiết (sửa docs · reconcile cấu trúc · grill…) nằm TRONG chính bộ docs này, KHÔNG ở AGENTS. Backlog: `04_TODO.md`. Changelog: `05_CHANGES.md`.

## Cấu trúc repo — xem `03_STRUCTURE.md`
**Chuẩn cấu trúc folder ĐẦY ĐỦ** (cây từng-dòng + routing "sửa gì → vào đâu" + convention) nằm ở **`03_STRUCTURE.md`** — **đọc file đó TRƯỚC khi sửa/tạo folder**.

Tóm tắt bất biến (chi tiết ở 03):
- **BẮT BUỘC = 4:** `backend/(code)` · `frontend/` · `docs/` · `AGENTS.md`. TẤT CẢ folder khác `[opt]` — tạo KHI CÓ concern.
- **INDEX điều hướng:** cần sửa gì → `03 §4` trỏ THẲNG slot → **KHÔNG grep cả repo** (nhanh + tiết kiệm token, HP điều 1).
- **`03_STRUCTURE` là INDEX/menu tra nhanh — phải khớp cấu trúc thực tế.** Mọi thay đổi cấu trúc code (thêm slot/concern mới, đổi tên, dời tầng, thêm dòng routing) phải cập nhật `03_STRUCTURE` trong CÙNG thay đổi đó. Index lệch code → tra sai; cập nhật index là một phần bắt buộc của thay đổi cấu trúc, không để nợ.
- **1 TÊN / concern** (chuẩn RIÊNG); chỉ framework ép cứng mới đổi (Next `pages/`, Django `models/`).
- **Nguồn = git tracked; output / runtime / secret = GITIGNORE.**
- Nắn app về chuẩn → `03_STRUCTURE.md` §8 (recipe reconcile).

## Ngôn ngữ (BẮT BUỘC)
- **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- **Văn phong harness = KỸ THUẬT / QUY PHẠM, KHÔNG văn nói.** Hiến pháp, rules, structure và plan viết dạng đặc tả: câu mệnh lệnh ngắn gọn, thuật ngữ chính xác, nêu điều kiện → hành vi. Không dùng khẩu ngữ, câu cảm thán, ví dụ hội thoại, hay lối kể chuyện phiếm.
- **UI · CLI output · code · comment công khai**: **TIẾNG ANH** — TUYỆT ĐỐI không nhét tiếng Việt vào giao diện / output lệnh hiển thị cho người dùng.

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `01_CONSTITUTION.md` | hiến pháp — bất biến riêng của zemory | CHỈ user chốt; agent đề xuất qua TODO |
| `04_TODO.md` | backlog | phát sinh việc / đổi ưu tiên; xong → chuyển sang CHANGES |
| `05_CHANGES.md` | changelog | mỗi lần sửa code; **chỉ ghi sau khi user xác nhận OK** (viết tay đúng format hoặc `zemory changelog add`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế |

- **Docs = FILE là nguồn (FILE WINS):** viết/sửa `.md` trực tiếp BÁM CHUẨN (đúng file, đúng vai trò, changelog đúng format `## [YYYY-MM-DD] — tiêu đề`); **xong là xong** — file là nguồn, KHÔNG cần chạy gì thêm. Lệnh `plan set`/`changelog add` là **tiện ích tùy chọn** (ghi DB rồi tự render lại file; Windows/PowerShell: nội dung có dấu phải truyền qua `--file`, KHÔNG pipe `echo` — hỏng UTF-8). `docs render` (db → md) chỉ dùng **phục hồi có chủ đích** — nó ĐÈ file. *(HP điều 3 — sửa đổi 2026-07-16)*
- **Đồng bộ bắt buộc — constitution ↔ rules ↔ todo ↔ change ↔ plan luôn khớp:** mỗi thay đổi → TODO phản ánh việc, CHANGES ghi log (sau khi OK), plan cập nhật nếu đổi thiết kế. Không để lệch nhau (đây là khớp NỘI DUNG giữa các FILE, không phải chạy sync).
- **Plan phải đánh số:** mỗi file trong `docs/plan/` đặt tên `NN_tên.md` (`00_overview`, `01_`, …) theo thứ tự; gom mọi mô tả plan rải rác (folder `planning`, doc plan lạc chỗ) về `docs/plan/`.
- **Plan KHÔNG chứa luật:** bất biến/luật riêng phát sinh khi thiết kế → đề xuất đưa vào `01_CONSTITUTION.md` (user chốt), plan chỉ dẫn chiếu điều khoản.
- **Tra log sâu:** việc/lỗi/quyết định ở phiên khác → `zemory brain search "<q>" [--all]` (recall on-demand; đừng tra bừa).

## Chốt phiên / ghi sổ (BẮT BUỘC — luật cứng)
**Kích hoạt khi user nói:** "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt.** Ghi theo tóm tắt = mất chi tiết, và cái mất luôn là cái phiên sau cần nhất. Trước khi ghi, ĐỌC LẠI ĐỦ 3 nguồn:
1. **FULL phiên hiện tại** — đọc lại từ ĐẦU hội thoại, kể cả đoạn đã bị tóm tắt/trôi khỏi context (dùng `zemory brain digest <session>` / `brain search` để moi lại). Rút ra: đã LÀM gì · đã ĐỔI gì · QUYẾT ĐỊNH gì · còn DỞ gì · phát hiện LỖI gì chưa sửa.
2. **FULL `docs/plan/*`** — mọi file, để biết việc vừa làm có đụng/lệch spec nào không.
3. **FULL `docs/agent/*`** — `01_CONSTITUTION` · `02_RULES` · `03_STRUCTURE` · `04_TODO` · `05_CHANGES`, để biết chỗ nào phải cập nhật và không ghi trùng cái đã có.

**Rồi mới ghi — định tuyến từng thứ về đúng file, KHÔNG BỎ SÓT:**

| Thứ phát sinh trong phiên | Ghi vào |
|---|---|
| Việc đã xong / đã sửa code | `05_CHANGES.md` (sau khi user OK) **và xoá khỏi** `04_TODO.md` |
| Việc còn dở · việc phát sinh · việc phiên sau làm | `04_TODO.md` — nêu rõ trạng thái `[~]`, **đã tới đâu, bước kế tiếp là gì** |
| Thiết kế / quyết định thay đổi | `docs/plan/NN_*.md` (+ supersede ở changelog nếu đảo quyết định cũ) |
| Luật / bất biến riêng phát sinh | **ĐỀ XUẤT** vào `04_TODO.md` chờ user chốt — KHÔNG tự sửa `01_CONSTITUTION.md` |

**Chuẩn "không bỏ sót":** mọi việc đã làm trong phiên phải tìm được ở CHANGES **hoặc** TODO — không việc nào chỉ nằm trong đầu rồi mất theo phiên. Chẩn đoán sai / đường cụt / thứ đã thử mà không xong **cũng phải ghi** (để phiên sau khỏi đâm lại chỗ đó).

**Bước cuối:** `zemory validate` (đọc file trực tiếp — xanh mới coi là chốt xong) → BÁO CÁO user. Không tự `git push` (§Git).

## Changelog — supersede
- Mới nhất ở trên cùng (chèn ngay sau header).
- Entry **đảo/thay** quyết định cũ → mở đầu bằng: `> 🔄 **Supersede:** thay quyết định "[đề mục] ([ngày])" — [lý do].` Không sửa/xoá entry cũ; tuỳ chọn thêm `> ⤴ Đã bị thay bởi [ngày].` ở entry cũ.

## Phạm vi project (BẮT BUỘC — luật cứng)
- **CHỈ làm việc trong project folder đang mở.** TUYỆT ĐỐI KHÔNG ghi/sửa/chạy lệnh đụng vào project khác (kể cả lệnh `zemory` trỏ root khác, `cd` sang repo khác, sửa file bên đó) khi user CHƯA cho phép rõ ràng trong phiên — **kể cả với ý định "giúp"/"cứu dữ liệu"/"tiện tay sửa luôn"**.
- Thấy cần đụng project khác → **DỪNG, HỎI TRƯỚC**: nêu rõ định làm gì, ở đâu, vì sao; user gật mới làm. Project khác có thể đang có agent/phiên khác làm việc — đụng chéo gây xung đột dữ liệu.
- Đọc-tham-khảo (read-only) project khác để trả lời câu hỏi thì được; **mọi thao tác GHI là cấm mặc định**.
- **Vế ngược — bạn đang ĐỨNG TRONG repo tham khảo:** mở một repo khác chỉ để **xem/copy chuẩn** (vd `zemory` — nơi chứa bộ chuẩn gốc) thì **CHỈ ĐỌC**. Lệnh `zemory` **GHI theo cwd**: chạy `init`/`sync`/`docs render`/`plan set`/`changelog` khi đang đứng ở repo đó = **ghi vào repo đó + DB của nó**, không phải vào project bạn. Lấy chuẩn = **đọc `docs_template/`** (bản mẫu TRẮNG — KHÔNG phải `docs/`, đó là docs RIÊNG của repo chuẩn như zemory) **rồi chạy lệnh Ở REPO CỦA BẠN**.

## Git (BẮT BUỘC — luật cứng)
- **KHÔNG `git push` khi user CHƯA cho phép.** Git remote là **nguồn BACKUP CUỐI CÙNG** của project — đẩy lên là ra ngoài, không gỡ lại được (gỡ = force-push, càng phá). Xong việc → build + test + **BÁO CÁO rồi DỪNG**; user bảo "push"/"lên git" mới đẩy.
- **Ghi sổ ≠ publish:** user bảo ghi changelog / commit / "xong rồi" **KHÔNG phải** là cho phép push. Đừng suy diễn.
- Commit cục bộ (đảo được) thì thoải mái theo phong cách repo; **push mới là cửa cần phép**.
- Sửa code chạy trên máy này **không cần push** — build là bản mới sống ngay.
- KHÔNG `--force`, KHÔNG rewrite lịch sử đã push, KHÔNG `reset --hard`/`clean` lên việc chưa commit của user nếu chưa hỏi.

## Hành xử
- **Chỉ làm đúng cái được yêu cầu.** Đụng logic/khác → **hỏi trước**, không tự sửa rồi báo.
- **Yêu cầu không rõ ràng phải được làm rõ trước khi thực thi — cơ chế TỰ ĐỘNG, KHÔNG chờ user gọi "grill".** Điều kiện kích hoạt: yêu cầu đa nghĩa; thuật ngữ có nhiều cách hiểu; thiếu dữ kiện; phạm vi không xác định; tồn tại giả định ngầm chưa nêu; hai yêu cầu mâu thuẫn; hoặc trước thao tác khó đảo ngược. Quy trình (grill): dừng, hỏi mỗi lần MỘT câu — kèm đề xuất của mình, diễn giải lại để xác nhận — đi hết các nhánh còn mơ hồ cho tới khi đủ dữ kiện; KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn. Cái nào đọc code/docs ra được thì ĐỌC, đừng hỏi; chốt đủ rõ MỚI build. Chỉ áp cho input từ user chưa đủ để thực thi đúng, không áp cho kiến thức chung. (User gõ "grill" = ép chạy thủ công cùng cơ chế này.)
- **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi user yêu cầu rõ).
- **Thao tác xóa phải được user xác nhận trước.** Xóa file, code, hàm, lệnh, chức năng, nội dung docs hoặc folder được coi là bất khả đảo ngược: nêu đối tượng và lý do, chờ chấp thuận rồi mới thực hiện; không tự xóa rồi báo sau. Thành phần dư thừa hoặc không còn dùng: đề xuất, không tự xóa. Bổ sung/mở rộng không cần xác nhận; xóa/thu hẹp luôn cần.
- **Nêu phản biện thiết kế trước khi thực thi** nếu phát hiện điểm bất hợp lý; quyết định cuối thuộc về user.

## Thiết kế UI
- **Dialog / modal: CHỈ 3 size cố định (S/M/L)** — chọn 1 lần lúc mở theo **lượng nội dung + mục đích** (xác nhận / form / log-bảng), **KHÔNG random size, không đổi size động, không nhảy/reflow loạn**:
  | Size | Rộng | Cao (trần) | Dùng khi |
  |---|---|---|---|
  | **Nhỏ (S)** | ~30vw (tối thiểu 380px) | ≤ 45vh | xác nhận, 1–5 dòng, ít log |
  | **Vừa (M)** | ~50vw (tối thiểu 560px) | ≤ 70vh | form, nội dung/log vừa |
  | **Lớn (L)** | ~72vw (tối thiểu 820px) | ≤ 85vh | log dài, nhiều nội dung, bảng |
- Trần chung mọi lúc: **≤ 94vw / ≤ 90vh** (màn nhỏ), luôn **canh giữa**.
- Nội dung tràn → **cuộn TRONG dialog** (`overflow:auto`), KHÔNG để dialog tự phình theo nội dung.
- **Trạng thái layout do user chỉnh** (kéo resize panel, vị trí, size đã chọn) phải **được lưu và khôi phục y nguyên** khi mở lại — không reset.
