<!-- zemory template · playbook CHUNG mọi project — BẢN HỆ NON-APP (grill · chốt phiên · reconcile + pull/fill/upload). Ship nguyên từ template. RULES/STRUCTURE nêu NORM+trigger rồi DẪN CHIẾU tới đây; KHÔNG nhét luật riêng vào đây. grill/chốt-phiên GIỮ KHỚP bản app. -->
# <PROJECT> — Kho skill (playbook thao tác — hệ NON-APP)

> **KHO SKILL** — chứa NHIỀU skill; mỗi `## <tên>` là MỘT skill (playbook thao tác tự-chứa). File này **CHỈ chứa skill** — KHÔNG nhét luật / norm / mô tả cấu trúc vào đây (luật → `01_CONSTITUTION`/`02_RULES` · chuẩn cấu trúc → `03_STRUCTURE`). RULES/STRUCTURE chỉ nêu NORM + trigger rồi **DẪN CHIẾU** tới skill tương ứng.
> **HAI KHUÔN — chọn theo độ dài:**
> - **NGẮN → inline:** 1 section `## <tên>` ngay trong file này. Vd: `grill` · `chốt phiên` · `reconcile` · `pull` · `fill` · `upload`.
> - **DÀI / có resources → KHÔNG chép vào đây:** vendor **nguyên bản** repo gốc vào `external/skills/<tên-repo>/` (giữ đúng tên + LICENSE), ở đây chỉ để **1 DÒNG INDEX** trỏ tới.
> - **⚠ GUARDRAIL:** file này **KHÔNG BAO GIỜ phình**. Nội dung dài ra thì thuộc **skill gốc** (`external/skills/`) hoặc **chuẩn** (`03_STRUCTURE`).
> **Kích hoạt:** trigger ở RULES/STRUCTURE bắn, hoặc user gọi tên skill. Đọc SAU `01_CONSTITUTION` · `02_RULES` · `03_STRUCTURE`.

## Cách dùng skill (LUẬT chung — vendored `external/skills/`)
Skill vendored là **kho THAM KHẢO**, KHÔNG auto-apply. Quy trình BẮT BUỘC mỗi khi làm việc mà skill phủ (dataviz cho report/dashboard, review chất lượng, chọn palette/theme trình bày…):
1. **ĐỌC skill liên quan trước**; nếu nó không phủ vấn đề → nói RÕ "skill không có match", đừng bịa.
2. **RÚT KHUYẾN NGHỊ**, phân 3 loại: ✅ nên theo · ⚠ đang KẸT / sai / anti-pattern · ◻ nên chuẩn hoá.
3. **TRÌNH user (recommend) — KHÔNG tự đổi.** Áp/đổi vẫn theo `02_RULES §Hành xử`; **user chốt mới làm**.

Nói gọn: **skill khuyến nghị, user quyết, agent thực thi sau khi được duyệt.**

### Kho skill vendored (`external/skills/` — dùng chung, đọc on-demand)
| skill | dùng khi | đường dẫn | license |
|---|---|---|---|
| *(chưa có — thêm khi vendor skill đầu tiên)* | | | |

### Tool ngoài — gọi qua CLI, KHÔNG vendor source
> Khác bảng trên: đây là **công cụ** (package public), không phải skill-repo. Cài như dependency,
> agent gọi bằng lệnh. Nguyên tắc: code của người khác thì **gọi/extend**, KHÔNG dán source vào repo.

| tool | dùng khi | cài | license | skill |
|---|---|---|---|---|
| `markitdown` (Microsoft) | đọc nội dung file Office/PDF nhị phân (`.xlsx .xls .docx .pptx .pdf`) | `pip install "markitdown[xlsx,xls,docx,pptx,pdf]"` | MIT | §đọc file Office qua Markdown |

**Skill inline hiện có:** `grill` · `chốt phiên / ghi sổ` · `reconcile` · `pull` · `fill` · `upload` · `đọc file Office qua Markdown` · `ghi file Word (.docx)` · `soi chuẩn` · `audit toàn diện`.

## grill
> Kích hoạt (tự động): `02_RULES §Hành xử` bắn khi yêu cầu chưa đủ để thực thi đúng. User gõ "grill" = ép chạy thủ công cùng cơ chế.

**Mục tiêu:** làm rõ yêu cầu TRƯỚC khi thực thi — KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn.

**Điều kiện kích hoạt (bất kỳ):** yêu cầu đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · tồn tại giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược.

**Quy trình:**
1. **Dừng** — chưa làm.
2. **Đọc trước, hỏi sau:** cái nào đọc docs/deliverable/data ra được thì ĐỌC, đừng hỏi. Chỉ hỏi phần input từ user còn thiếu để thực thi đúng.
3. **Hỏi mỗi lần MỘT câu** — kèm ĐỀ XUẤT của mình + diễn giải lại để xác nhận đúng ý.
4. **Đi hết mọi nhánh còn mơ hồ** cho tới khi đủ dữ kiện.
5. **Chốt đủ rõ MỚI làm.**

## chốt phiên / ghi sổ
> Kích hoạt (luật cứng, `02_RULES §Chốt phiên`): user nói "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt.** Ghi theo tóm tắt = mất chi tiết, và cái mất luôn là cái phiên sau cần nhất.

**Global Memory là NGUỒN THẬT của phiên — trí nhớ trong context thì KHÔNG.** Khi context bị tóm tắt/trim, chi tiết phiên vẫn còn NGUYÊN trong episodic memory (DB); cái bạn "nhớ" trong context đã bị lược. Đây là GỐC của "đổi session là sót/lệch". Nên **mọi lần ghi docs / audit / báo cáo — nhất là khi ĐỔI SESSION — BẮT BUỘC dò Global Memory + đối chiếu deliverable/pipeline/file THẬT để verify TRƯỚC khi khẳng định bất cứ điều gì.**

**Bước 0 — DÒ GLOBAL MEMORY + VERIFY (bắt buộc, KHÔNG skip, làm TRƯỚC Bước 1):**
1. `zemory memory digest <session>` + `zemory memory search "<chủ đề phiên>" [--all]` → dựng lại ĐẦY ĐỦ việc/đổi/quyết định/lỗi của phiên, kể cả đoạn đã trôi khỏi context.
2. **Verify từng mục sắp ghi với NGUỒN THẬT** = GM (điều đã thực sự làm/nói/quyết) + deliverable/measure/pipeline/file THẬT (đọc lại chỗ liên quan). Chỉ mục SỐNG SÓT verify mới được ghi; claim chưa verify = KHÔNG ghi.
3. **Áp CẢ cho audit / báo cáo lỗi:** mỗi finding phải đối chiếu file THẬT + GM trước khi gọi là "lỗi thật". Bẫy điển hình: tên file cũ trong entry changelog CŨ là **BẢN GHI LỊCH SỬ**, KHÔNG phải link gãy cần sửa; số liệu trong report cũ có thể là snapshot đúng-tại-thời-điểm. KHÔNG tin kết quả subagent chưa tự kiểm lại.

**Bước 1 — ĐỌC LẠI ĐỦ 3 nguồn TRƯỚC khi ghi:**
1. **FULL phiên hiện tại** (dùng `zemory memory digest`/`search` moi lại đoạn đã trôi): đã LÀM gì · đã ĐỔI gì · QUYẾT ĐỊNH gì · còn DỞ gì · phát hiện LỖI gì chưa sửa.
2. **FULL `docs/plan/*`** — mọi file, để biết việc vừa làm có đụng/lệch spec/dictionary nào không.
3. **FULL `docs/agent/*`** — `01`→`06`, để biết chỗ nào phải cập nhật và không ghi trùng.

**Bước 2 — định tuyến từng thứ về đúng file, KHÔNG BỎ SÓT:**

| Thứ phát sinh trong phiên | Ghi vào |
|---|---|
| Việc đã xong / deliverable-measure-pipeline đã sửa | `06_CHANGES.md` (sau khi user OK) **và xoá khỏi** `05_TODO.md` |
| Việc còn dở · việc phát sinh · việc phiên sau làm | `05_TODO.md` — nêu rõ `[~]`, **đã tới đâu, bước kế tiếp là gì** |
| Thiết kế / quyết định thay đổi (gồm định nghĩa metric) | `docs/plan/NN_*.md` / `docs/dictionary.md` (+ supersede ở changelog nếu đảo quyết định cũ) |
| Luật / bất biến riêng phát sinh | **ĐỀ XUẤT** vào `05_TODO.md` chờ user chốt — KHÔNG tự sửa `01_CONSTITUTION.md` |

**Chuẩn "không bỏ sót":** mọi việc đã làm phải tìm được ở CHANGES **hoặc** TODO. Chẩn đoán sai / đường cụt **cũng phải ghi** (để phiên sau khỏi đâm lại).

**Bước cuối:** `zemory validate` (xanh mới coi là chốt xong) → BÁO CÁO user. Không tự `git push` (`02_RULES §Git`).

## reconcile
> Kích hoạt (`03_STRUCTURE §6`): flow HIẾM, chỉ khi dọn repo chưa theo chuẩn. `zemory validate`/`structure` chỉ **CHỈ RA** chỗ lệch (advisory) — **agent tự nắn, zemory KHÔNG auto-move**. **Đập cấu trúc lớn / khó đảo → HỎI user TRƯỚC** (`02_RULES §Hành xử`, §Git).

**A. Docs lệch** (doc trùng / thừa / lạc chỗ):
1. Soi file `.md` trùng/thừa trong `docs/`; **đọc file** TRƯỚC khi quyết.
2. Gộp todo lạc → `05_TODO`. Bỏ bản trùng/obsolete: **xoá thẳng file `.md`** (file wins) — **HỎI user trước nếu doc còn nội dung thật**; sau khi xoá, `zemory reindex`.
3. Gom mọi doc plan về `docs/plan/`, đặt tên `NN_tên.md` (`00_overview` → `01_` …); plan chỉ chứa specs, todo tách về `05_TODO`.

**B. Cấu trúc folder lệch** (chưa theo khung non-app):
1. `zemory validate` — xem thiếu deliverable / đặt sai (advisory).
2. Nắn theo routing `03_STRUCTURE §3`, **GIỮ git history — `git mv`, KHÔNG copy rồi xoá**:
   - sản phẩm giao đi → `reports/`|`models/`|`content/`|`design/`. Định nghĩa nguồn → `sources/` · DAX → `measures/` · SQL/M gọi-tên → `queries/`.
   - việc định kỳ → `tasks/NN_<tên>/`; data thật → `data/<task>/` (gitignore). File lẻ 1-lần → `data/adhoc/`. Template điền → `templates/`.
   - raw kéo về / extract → `data/extract/` (gitignore). Render ra → `exports/` (gitignore). Secret → `.env`/`config/*.local.*` (gitignore).
   - **Bắt buộc chỉ 3 vai trò:** `docs` · `AGENTS.md` · ≥1 deliverable. KHÔNG ép `backend/`+`frontend/` (non-app không có code-app).
3. Sau move: sửa path trong scripts/sources/connection cho khớp → verify bằng cách MỞ deliverable / chạy refresh thử.
4. Xong → cập nhật `README` + ghi entry `06_CHANGES.md` (sau khi user OK).

**Recipe end-to-end:** `zemory init --non-app` (nếu chưa có harness) → `zemory structure` (xem ĐÍCH) + `zemory validate` (xem lệch đâu) → đọc `03_STRUCTURE §2` (cây) + §3 (routing) → làm **A** rồi **B** → verify (mở deliverable / refresh) → cập nhật README + changelog (sau khi user OK). Việc lớn / khó đảo: HỎI user trước.

## pull  (KÉO nguồn tự động)
> Kích hoạt: cần đưa data mới từ nguồn (SQL/VM/web/API) về để làm deliverable. `03_STRUCTURE §5`.
> Trong **pipeline đánh số**: cổng **`00_ready.py`** kiểm nguồn sẵn sàng (exit 0/1) TRƯỚC, rồi **`01_pull.py`** kéo. Launcher `<tên> auto` tự chạy gate → pull nếu đủ; hoặc `<tên> pull` chạy thẳng stage 01.

1. Đọc **`sources/`** (định nghĩa M/connection/SQL) + credential từ **`.env`/`config/`** — **KHÔNG nhập password vào zemory**; nếu nguồn là web thì mượn phiên đã login trên trang thật.
2. Kéo raw về **`data/extract/`** (gitignore) — đặt tên theo nguồn + ngày. Pace/backoff nếu API có rate-limit; **resume-safe** (kéo tiếp được sau khi đứt).
3. **KHÔNG commit** file kéo về (PII/nặng). Ghi lại lần kéo (nguồn · phạm vi · số dòng) vào task/`05_TODO` để truy được.
4. Lỗi nguồn → BÁO, đừng bịa số; thiếu quyền → HỎI user.

## fill  (ĐIỀN template tự động)
> Kích hoạt: có template trống + đã có số → xuất bản deliverable/exports. `03_STRUCTURE §5`.

1. Lấy file mẫu từ **`templates/`** (bản TRỐNG) — KHÔNG sửa template gốc; làm việc trên bản sao.
2. Đổ số từ **`data/`** / **`measures/`** / **`queries/`** vào đúng ô/sheet theo **`docs/dictionary.md`** (định nghĩa metric = nguồn sự thật — chống mỗi lần điền một kiểu).
3. Xuất ra **deliverable** (`reports/…` nếu là bản chính giao đi) hoặc **`exports/`** (bản render). Giữ tên file theo convention của task (`<ngày>_..._REPORT.xlsx`).
4. **Đổi HÌNH HÀI/bố cục** report (thêm/bớt cột, đổi chart, layout) = quyết định TRÌNH BÀY → **trình user trước** (`02_RULES §Hành xử`); điền số theo mẫu có sẵn thì cứ làm.

## upload  (ĐẨY / PUBLISH tự động)
> Kích hoạt: deliverable đã xong → đưa lên đích (workspace BI · Drive · SharePoint). `03_STRUCTURE §5`.

1. Chạy **`scripts/`** publish (pbi-tools / PowerShell / API) — đích + credential lấy từ **`config/`**/`.env`, KHÔNG hardcode.
2. **Xác nhận đích + phạm vi TRƯỚC khi đẩy** (đẩy đè bản đang chạy = khó đảo — như `git push`, phải được user cho phép nếu là môi trường thật/production).
3. Sau khi đẩy: verify ở đích (mở lại / kiểm số) + ghi lần publish vào `06_CHANGES` (sau khi user OK).
4. Giữ bản trước khi đè về **`attic/`** để rollback (đối xứng "backup deploy 2 chiều" của app).
## đọc file Office qua Markdown (xlsx · xls · docx · pptx · pdf)
> Kích hoạt: cần ĐỌC nội dung một file Office/PDF (bảng số, báo cáo, tài liệu) trong khi agent chỉ
> có công cụ đọc text. KHÔNG áp cho file vốn đã là text (`.csv` · `.md` · `.json` · `.txt`) — đọc thẳng.

**Vấn đề:** `.xlsx`/`.docx`/`.pptx` là ZIP nhị phân — đọc trực tiếp không ra nội dung. Hai đường sai
thường gặp: ① coi file như text rồi nạp XML thô vào context; ② mỗi lần gặp file lại viết một script
`openpyxl`/`python-docx` riêng (đắt công, mỗi lần một kiểu).

**Tool:** `markitdown` (Microsoft · MIT · Python) — convert Office/PDF/HTML/ảnh → Markdown. Là
**dependency ngoài gọi qua CLI**, KHÔNG dán source vào repo.
- Cài: `pip install "markitdown[xlsx,xls,docx,pptx,pdf]"`
- Dùng: `python -m markitdown <file>` (ra stdout) · `python -m markitdown <file> -o out.md` (ghi file)
- Sheet Excel ra `## <tên sheet>` + bảng Markdown ⇒ giữ được ranh giới nhiều sheet.

**Số đo tham chiếu** (file `.xlsx` 18 KB · 3 sheet · 308 dòng · ~token = ký tự ÷ 4):

| cách đọc | ~token | ghi chú |
|---|--:|---|
| unzip → XML thô | 30.119 | đường duy nhất nếu coi file là text |
| **MarkItDown → Markdown** | **5.395** | **rẻ hơn XML 5,6×**; giữ tên sheet + cấu trúc bảng |
| CSV từng sheet (tự script) | 4.193 | rẻ hơn Markdown ~22% nhưng MẤT ranh giới nhiều sheet |

**Chọn theo việc — KHÔNG mặc định "Markdown luôn rẻ nhất" (số đo bác điều đó):**
- Cần HIỂU tài liệu (nhiều sheet · chữ lẫn số · `.docx`/`.pptx`/`.pdf`) → **MarkItDown**.
- Chỉ cần MỘT bảng số thuần để tính toán → CSV/`openpyxl` rẻ hơn.
- File lớn: convert ra FILE rồi đọc **đúng phần cần** (`grep`/N dòng đầu) — đừng nạp cả bản
  convert vào context (progressive disclosure).
- Bảng ngàn dòng: token tăng theo số DÒNG, không theo dung lượng file ⇒ ước lượng trước khi nạp.
## ghi file Word (.docx) — sửa mà không phá cấu trúc
> Kích hoạt: cần **SỬA / TẠO** `.docx` (đổi chữ · thay hoặc chèn ảnh · thêm mục). Chỉ ĐỌC → dùng §đọc file Office qua Markdown.

**Vì sao cần playbook riêng:** `.docx` là ZIP + XML. Chữ nằm ở `<w:t>`, còn **cấu trúc** (bảng · ảnh · mục lục · style · khổ trang) nằm ở XML quanh nó ⇒ **mọi phép kiểm dựa trên "chữ có đổi không" đều KHÔNG thấy cấu trúc bị phá** — chữ trong ô bảng cũng là đoạn văn.

1. **KHÔNG mở file giao đi bằng editor khác rồi lưu lại.** Đo thật: một tài liệu **8 bảng**, mở bằng một editor desktop khác Word rồi Ctrl+S → **8 bảng thành 0**, mọi ô bị bẻ thành đoạn thường; kèm bóc lớp `<w:sdt>` bọc mục lục, đổi `styleId` thành số, đảo thứ tự thuộc tính `<w:pgSz>`. **Chữ không đổi một ký tự** — nhìn diff văn bản thấy "y nguyên". Cần xem thì mở rồi **đóng, KHÔNG lưu**. File đang bị editor giữ (`PermissionError` khi ghi) → **chờ, đừng kill editor của user**. Lỡ lưu rồi thì **đếm lại số bảng + số ảnh** trước khi kết luận "không sao".
2. **Sửa bằng script trên XML, theo từng RUN.** Một đoạn gồm nhiều `<w:r>` định dạng khác nhau — thay cả đoạn là mất đậm/nghiêng. Thêm đoạn mới → **sao vỏ `<w:p>` của đoạn cùng vai đã có**, đừng đẻ style mới. Neo phải khớp **đúng 1 lần**; 0 hoặc ≥2 thì **DỪNG**.
3. **Ảnh = BA tầng phải khớp**, thiếu một là file hỏng: `word/media/<tên>` + `<Relationship … Target="media/<tên>">` trong `document.xml.rels` + khối `<w:drawing>` trỏ đúng `r:embed`, với `<wp:docPr id>` **cấp số mới**.
4. **Kích thước ảnh** — Word đặt theo **EMU**, không theo pixel: khổ chữ `= (pgSz@w − pgMar@left − pgMar@right) × 635`, cao `= rộng × tỷ lệ gốc của ảnh`. **Đọc thuộc tính theo TÊN, không theo vị trí** (editor khác nhau đảo thứ tự `pgSz`). Sửa **cả** `<wp:extent>` lẫn `<a:ext>`, và sửa **theo KHỐI `<w:drawing>`** — nhiều ảnh khai cùng `cx/cy`, thay chuỗi toàn cục là đổi lây ảnh khác.
5. **Bẫy regex:** `<w:t xml:space="preserve"/>` là thẻ **tự đóng** (ô rỗng) — `<w:t(?:\s[^>]*)?>` khớp nhầm nó thành thẻ mở rồi **nuốt XML** tới `</w:t>` kế tiếp, làm phép đo "chữ có đổi không" báo lệch giả. Dùng `<w:t(?:\s[^>]*(?<!/))?>`. Viết lỏng hơn (`<w:t[^>]*>`) còn khớp cả `<w:tbl>` · `<w:tc>` · `<w:tr>`.
6. **Đừng dựng lại file bằng `head + "".join(mọi <w:p>) + tail`** — cách đó **đánh rơi mọi thứ nằm GIỮA các đoạn** (bảng, lớp `<w:sdt>` bọc mục lục, bookmark). Muốn dùng thì phải ĐO trước là giữa các đoạn không còn gì; an toàn hơn: `xml.replace(<đoạn cũ>, <đoạn mới>, 1)`.
7. **Kiểm sau MỖI lần sửa — đủ, không bỏ bước:** số `<w:tbl>` · số ảnh + thứ tự · mọi `r:embed` tra ra rel · rel trỏ file có thật · không ảnh mồ vàng · không `docPr` trùng · `<w:instrText>` còn `TOC` · rộng ảnh ≤ khổ chữ · tỷ lệ hiển thị == tỷ lệ pixel · chữ chỉ khác đúng chỗ cố ý sửa · mở lại được.
8. **Mục lục là FIELD** — sửa ngoài Word thì không tự tính lại. Xong việc phải **nhắc user mở file bấm `F9`**; đừng gõ tay số trang.
9. **Ngắt trang cho bản đọc:** `<w:keepNext/>` cho tiêu đề + đoạn ngay trên ảnh/bảng · `<w:keepLines/>` chống xé đoạn · `<w:pageBreakBefore/>` cho Heading 1 — **nhưng KHÔNG ép cho mọi mục**: mục ngắn hơn một trang thì ép break là bỏ trắng nửa trang (đo thật: ép hết 11 mục ⇒ 15 trang, 7 trang trống >1/3, có trang 94% trắng). Chen **ngay sau `<w:pStyle>`** (schema bắt thứ tự `keepNext → keepLines → pageBreakBefore`).
10. **Đo trang thật, đừng đoán — không có Word vẫn render được:** `x2t.exe` trong `<ProgramFiles>/ONLYOFFICE/DesktopEditors/converter/` nhận params XML (`m_nFormatTo=513` = PDF, kèm `m_sAllFontsPath`/`m_sFontDir` trỏ `AllFonts.js` — thiếu font là nó lỗi JS, không ra file). Rồi `pdfminer` đo `y0` thấp nhất của chữ **thân bài** (phải **loại vùng footer**, không thì trang nào cũng ra 0% trống). Quy trình: ép hết → bỏ break ở mục gây trống >1/3 → thêm ngược lại tối đa; **miễn trang bìa và trang cuối**.
11. **Mục lục tự động** cần **cả hai**: `<w:updateFields w:val="true"/>` trong `settings.xml` (chen trước `<w:footnotePr>`), và nội dung mục lục tự dựng (bookmark ở mỗi Heading 1 + đoạn style `toc 1` + `PAGEREF`). **Số trang để TRỐNG** — không render được thì ghi số là bịa; viewer tự điền khi mở.
12. **BẪY: một field trải trên NHIỀU đoạn** — `begin`+`separate` ở đoạn này, `end` ở đoạn khác. Thay một đoạn là còn `end` mồ côi ⇒ **file không mở được nữa** (converter báo lỗi lạ). Chốt sau mỗi lần đụng field: `begin == separate == end`, mọi `w:anchor`/`PAGEREF` trỏ tới bookmark có thật.

**Cấm:** mở file giao đi bằng editor khác rồi lưu · sửa file gốc khi chỉ được yêu cầu ĐỌC · ghi đè file chưa đọc · dựng lại `.docx` từ Markdown ("cho nhanh" = mất sạch bảng, ảnh, mục lục, style) · báo "xong" khi chưa chạy hết bảng kiểm.

## soi chuẩn (kiểm độ bám chuẩn — máy chấm, agent phán)
> Kích hoạt: trước khi **chốt phiên** · sau khi **nắn cấu trúc / thêm slot** · khi nhận **repo lạ**
> · định kỳ. Không cần chạy sau mỗi lần sửa code vặt.

**Nguyên tắc (bất biến — xem `01_CONSTITUTION`, điều "MÁY dựng lớp dẫn xuất · AGENT sửa NGUỒN"):** lớp dẫn xuất (graph · index · taxonomy) do MÁY
dựng tất định. **Agent KHÔNG ghi vào lớp dẫn xuất** — muốn nó có gì thì KHAI vào chuẩn hoặc sửa
NGUỒN (docs · code) rồi để máy dựng lại. Agent là người **KIỂM**, không phải người sinh.

**Vì sao đừng nạp cả graph vào ngữ cảnh:** đo thật — payload graph của một repo cỡ vừa ≈ **56.000
token**, chỉ rẻ hơn đọc cả repo ~4,8×. Nạp định kỳ là đốt quota. Máy chấm trước, agent chỉ đọc
**bảng lệch** (~vài trăm token).

**Quy trình:**
1. `zemory conform` → bảng lệch. `--json` cho máy đọc, `--gate` cho CI (exit 1 khi có mục `blocking`).
2. Đọc từng mục: `blocking` = lệch chuẩn thật, phải xử · `advisory` = đáng xem, tự quyết.
3. **Phán phần NGỮ NGHĨA máy không hiểu được** — máy chỉ biết "thư mục này không khớp slot nào";
   chỉ agent mới biết *nó nên về slot nào*, hay *đây là concern thật cần thêm vào chuẩn*.
4. **Sửa NGUỒN**, không sửa lớp dẫn xuất:
   - đặt sai chỗ → `git mv` về đúng slot (giữ history) + sửa import
   - là concern THẬT mà chuẩn chưa khai → **đề xuất thêm slot vào `03_STRUCTURE` §3/§4** (đổi chuẩn:
     trình user duyệt trước)
   - folder rỗng → xoá (thao tác xoá phải được user xác nhận trước)
5. Chạy lại `zemory conform` → xác nhận hết lệch. Ghi việc vào `05_TODO`/`06_CHANGES`.

**Ranh giới với `zemory validate`:** `validate` hỏi *"bộ docs harness có đúng khuôn không"* (link,
độ dài changelog, tầng folder). `soi chuẩn`/`conform` hỏi *"code + docs có bám chuẩn đã KHAI không"*.
Hai việc khác nhau — đừng gộp, đừng thay thế nhau.

**Cấm:** tự thêm node/cạnh "cho đầy đủ"; coi báo cáo là chân lý mà không đối chiếu code thật; xoá
folder/file chỉ vì báo cáo nói vậy mà chưa hỏi.

## audit toàn diện (user nói "audit toàn diện" = chạy HẾT, không cắt bớt)
> Kích hoạt: user nói **"audit toàn diện" / "soi hết"** · trước mốc lớn (release · commit gộp) · sau
> một đợt đổi nhiều file. Đây KHÔNG phải kiểm vặt: cụm từ đó có nghĩa là chạy đủ **6 mặt** dưới.

**Luật 1 — gate xanh KHÔNG phải bằng chứng.** Nó chỉ chứng minh *những gì test soi thì đúng*, không
chứng minh nó đang soi thứ đang chạy. Đã dính thật: cả bộ test UI neo vào bản đã bị thay, gate 100%
xanh trong khi bề mặt đang chạy có **0 test**. Nên mặt ④ luôn phải hỏi: *test đang đọc FILE NÀO?*

**Luật 2 — VERIFY từng finding rồi mới ghi.** Đã có đợt loại 5 nghi vấn vì đo lại thì sai, và 2 đợt
checker báo oan (48 rồi 13 mục). Một finding sai làm hỏng lòng tin vào cả bảng.

**Luật 3 — mọi con số phải ĐO.** Không suy luận, không nhớ lại. Không đo được thì ghi "chưa đo".

**Luật 4 — hỏi ngược mỗi check: *"cái gì làm nó ĐỎ?"*** Trả lời không được ⇒ check đó không thể nổ,
và một check không nổ được còn tệ hơn không có (nó phát ra lời bảo đảm trong khi chưa hề nhìn).

### 6 mặt — chạy đủ
1. **Gate & lint** — `npm run check` (hoặc lệnh gate của repo). **TẮT daemon/tiến trình nền trước**,
   nếu không test nặng tranh RAM rồi đỏ lung tung ở chỗ không liên quan.
2. **Chuẩn & docs** — `zemory conform` · `zemory validate` · độ dài docs vs ngưỡng (`zemory archive`
   nếu quá) · TODO còn mục nào đã xong mà chưa đóng không.
3. **Kiến trúc** — export không ai gọi · **NGUỒN TRÙNG** (cùng một sự thật nằm ở ≥2 nơi ⇒ chắc chắn
   sẽ lệch) · file/thư mục ngoài chuẩn · thao tác ghi vào file nguồn có nguyên tử không.
4. **FE ↔ BE** — mọi endpoint có người gọi & ngược lại · i18n đủ cả hai chiều · CSS/id chết ·
   **neo test có trỏ vào file đang chạy không**.
5. **Dữ liệu thật** — `integrity_check` · độ phủ (index/vector/digest) · hàng mồ côi · kích thước.
6. **Bề mặt sống** — gọi endpoint THẬT (mã trả về + thời gian) · mở app **nhìn tận mắt**. Suy luận
   từ code không thay được việc nhìn: đã có lần endpoint xanh, gate xanh, mà UI vẫn sai.

**Đầu ra:** bảng finding, mỗi mục ghi *đo được gì · ảnh hưởng · sửa ở đâu*, phân `blocking`/`advisory`.
Vào `05_TODO` + `06_CHANGES`. **Nghi vấn đã loại cũng ghi, kèm lý do loại** — để lần sau khỏi đào lại.

**Cấm:** cắt bớt mặt nào cho nhanh; ghi finding chưa verify; báo "sạch" khi mới chạy mỗi gate.
