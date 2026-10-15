---
id: Skill_Doc_WriteDocx
aka: write-docx
name: doc-write-docx
version: 2
description: Edit or produce Word files (.docx) without silently destroying their structure - tables, pictures, table of contents, styles, page setup. Use when you must change wording inside an existing .docx, swap or add a picture, resize a picture, insert a section, or hand back a .docx deliverable. Do not use when you only need to READ a document - use read-office for that. Vietnamese triggers - "sửa file word", "ghi file word", "đổi chữ trong file word", "thay ảnh trong docx", "chèn ảnh vào file word", "xuất file word", "cập nhật tài liệu word".
---

# write-docx — sửa .docx mà không phá cấu trúc

> Kích hoạt: cần **SỬA / TẠO** `.docx` (đổi chữ · thay hoặc chèn ảnh · thêm mục). Chỉ ĐỌC → dùng
> skill `read-office` (chuyển đổi bằng `markitdown`). Nhớ: **`markitdown` chỉ để ĐỌC** — dựng lại
> `.docx` từ Markdown là mất sạch bảng · ảnh · mục lục · style.

**Vì sao cần playbook riêng:** `.docx` là **ZIP chứa XML**. Chữ nằm ở `<w:t>`, còn **cấu trúc** (bảng ·
ảnh · mục lục · style · khổ trang) nằm ở XML quanh nó ⇒ **mọi phép kiểm dựa trên "chữ có đổi không"
đều KHÔNG thấy cấu trúc bị phá** — chữ trong ô bảng cũng là đoạn văn, nên bảng bị bẻ phẳng mà chữ vẫn
y nguyên.

Chi tiết thao tác: [`references/pagination-toc.md`](references/pagination-toc.md) (ngắt trang · mục lục).
**Trước khi sao vỏ đoạn/bảng, đụng field, hay viết chốt kiểm, đọc
[`references/edit-traps.md`](references/edit-traps.md)** — 7 bẫy đã làm hỏng file thật.

1. **KHÔNG mở file giao đi bằng editor khác rồi lưu lại.** Đo thật: một tài liệu **8 bảng**, mở bằng
   một editor desktop khác Word rồi Ctrl+S → **8 bảng thành 0**, mọi ô bị bẻ thành đoạn thường; kèm
   bóc lớp `<w:sdt>` bọc mục lục, đổi `styleId` thành số, đảo thứ tự thuộc tính `<w:pgSz>`, bỏ vài
   part rỗng. **Chữ không đổi một ký tự** — nhìn diff văn bản thấy "y nguyên". Cần xem thì mở rồi
   **đóng, KHÔNG lưu**. File đang bị editor giữ (`PermissionError` khi ghi) → **chờ, đừng kill editor
   đang giữ file**. Lỡ lưu rồi thì **đếm lại số bảng + số ảnh** trước khi kết luận "không sao".
2. **Sửa bằng script trên XML, theo từng RUN.** Một đoạn gồm nhiều `<w:r>` định dạng khác nhau — thay
   cả đoạn là mất đậm/nghiêng. Đổi chữ → thay **nội dung `<w:t>` của đúng run** cần đổi, giữ
   `<w:rPr>`. Thêm đoạn mới → **sao vỏ `<w:p>` của đoạn cùng vai đã có** rồi đổi chữ, đừng đẻ style
   mới. Neo phải khớp **đúng 1 lần**; 0 hoặc ≥2 thì **DỪNG**, đừng thay bừa.
3. **Ảnh = BA tầng phải khớp**, thiếu một là file hỏng:
   1. `word/media/<tên>.png` — byte ảnh;
   2. `word/_rels/document.xml.rels` — một `<Relationship Id="rIdN" … Target="media/<tên>.png"/>`;
   3. `word/document.xml` — khối `<w:drawing>` trỏ đúng `r:embed="rIdN"`, với `<wp:docPr id>` **cấp số mới**.

   Đổi ảnh mà giữ nguyên tên entry thì chỉ cần thay byte — nhưng **phải tính lại chiều cao** (mục 4).
4. **Kích thước ảnh** — Word đặt theo **EMU**, không theo pixel. Thay byte ảnh có tỷ lệ khác mà giữ
   nguyên `cx/cy` ⇒ **ảnh bị bóp dẹt**. Rộng hơn khổ chữ ⇒ **tràn lề**. Rộng hơn `px_w/96` inch ⇒
   **MỜ** (phóng quá kích thước gốc) — nên `cx = min(khổ chữ, px_w/96 × 914400)`.

   ```python
   # kho chu = (pgSz@w − pgMar@left − pgMar@right) × 635 EMU · ĐỌC THEO TÊN thuộc tính (editor đảo thứ tự)
   cx = (attr("pgSz", "w") - attr("pgMar", "left") - attr("pgMar", "right")) * 635
   cy = round(cx * px_h / px_w)           # cao theo TỶ LỆ GỐC của ảnh
   ```

   **Đọc thuộc tính theo TÊN, không theo vị trí** (editor khác nhau đảo thứ tự `pgSz`). Sửa **cả**
   `<wp:extent>` lẫn `<a:ext>`, và sửa **theo KHỐI `<w:drawing>`** — nhiều ảnh khai cùng `cx/cy`,
   thay chuỗi toàn cục là đổi lây ảnh khác.
5. **Bẫy regex:** `<w:t xml:space="preserve"/>` là thẻ **tự đóng** (ô rỗng) — `<w:t(?:\s[^>]*)?>` khớp
   nhầm nó thành thẻ mở rồi **nuốt XML** tới `</w:t>` kế tiếp, làm phép đo "chữ có đổi không" báo lệch
   giả. Dùng `<w:t(?:\s[^>]*(?<!/))?>(.*?)</w:t>` — `(?<!/)` chặn thẻ tự đóng. Viết lỏng hơn
   (`<w:t[^>]*>`) còn khớp cả `<w:tbl>` · `<w:tc>` · `<w:tr>`.
6. **Đừng dựng lại file bằng `head + "".join(mọi <w:p>) + tail`** — cách đó **đánh rơi mọi thứ nằm
   GIỮA các đoạn** (bảng, lớp `<w:sdt>` bọc mục lục, bookmark). Muốn dùng thì phải ĐO trước là giữa các
   đoạn không còn gì (đi tuần tự `xml.find(p, pos)`, tổng phần bị bỏ qua phải bằng 0); an toàn hơn:
   `xml.replace(<đoạn cũ>, <đoạn mới>, 1)`.
7. **Kiểm sau MỖI lần sửa — đủ, không bỏ bước:**

   | Kiểm | Đỏ khi |
   |---|---|
   | số `<w:tbl>` | khác bản trước |
   | số ảnh + thứ tự | khác bản trước |
   | mọi `r:embed` có `<Relationship>` | có cái không tra ra |
   | rel trỏ tới file có thật | trỏ vào hư không |
   | ảnh có rel mà không ai dùng | còn ảnh mồ vàng |
   | `<wp:docPr id>` | có id trùng |
   | bookmark: `w:name` · `w:id` · start==end | trùng tên/id, hoặc lệch số |
   | TỪNG dòng mục lục đúng hình field | tổng `fldChar` cân mà per-dòng vẫn sai |
   | `<w:instrText>` chứa `TOC` | mục lục biến mất |
   | chiều rộng ảnh ≤ khổ chữ | tràn lề |
   | tỷ lệ hiển thị so tỷ lệ pixel | lệch ⇒ ảnh bị dẹt |
   | chữ so với bản trước | khác ở chỗ KHÔNG cố ý sửa |
   | mở lại được (`read-office`) | không convert nổi |
8. **Mục lục là FIELD, không phải chữ** — sửa ngoài Word thì không tự tính lại. Xong việc phải **nhắc
   mở file bấm `F9`**; đừng gõ tay số trang vào mục lục.
9. **Ngắt trang cho bản đọc** (người đọc thấy TRANG, không thấy XML): `<w:keepNext/>` cho tiêu đề +
   đoạn ngay trên ảnh/bảng · `<w:keepLines/>` chống xé đoạn · `<w:pageBreakBefore/>` cho Heading 1 —
   **nhưng KHÔNG ép cho mọi mục**: mục ngắn hơn một trang thì ép break là bỏ trắng nửa trang (đo thật:
   ép hết 11 mục ⇒ 15 trang, 7 trang trống >1/3, có trang 94% trắng). Chen **ngay sau `<w:pStyle>`**
   (schema bắt thứ tự `keepNext → keepLines → pageBreakBefore`). **Khoảng cách:** đoạn có
   `<w:spacing />` rỗng sẽ dán sát đoạn trên — soát MỌI tiêu đề.
10. **Đo trang thật, đừng đoán — không có Word vẫn render được:** `x2t.exe` trong
    `<ProgramFiles>/ONLYOFFICE/DesktopEditors/converter/` nhận params XML (`m_nFormatTo=513` = PDF, kèm
    `m_sAllFontsPath`/`m_sFontDir` trỏ `AllFonts.js` — thiếu font là nó lỗi JS, không ra file). Rồi
    `pdfminer` đo `y0` thấp nhất của chữ **thân bài** (phải **loại vùng footer**, không thì trang nào
    cũng ra 0% trống). Quy trình: ép hết → bỏ break ở mục gây trống >1/3 → thêm ngược lại tối đa;
    **chỉ miễn trang bìa** — miễn cả trang cuối thì phép đo chọn nhầm bản xấu hơn (đo được: 12 trang, trang cuối đầy 97%,
    thua 13 trang, trang cuối trống 76%; `references/edit-traps.md` §5). **Máy không có Word/ONLYOFFICE chạy được thì dùng WPS COM:**
    `KWPS.Application` → `Documents.Open(<path>, false, true)` (read-only) → `ComputeStatistics(2)` = SỐ
    TRANG, `(0)` = số từ, rồi `Close(0)`. Đo được: đây là đường DUY NHẤT còn chạy khi `x2t` thiếu
    `AllFonts.js` (lỗi JS, không ra PDF) **và** `Word.Application` ném COMException — đừng kết luận
    "không đo được số trang" trước khi thử nó. Không render được trang ⇒ **không hứa "mục nào cũng gọn
    1 trang"**.
11. **Mục lục tự động** cần **cả hai**: `<w:updateFields w:val="true"/>` trong `settings.xml` (chen trước
    `<w:footnotePr>`), và nội dung mục lục tự dựng (bookmark ở mỗi Heading 1 + đoạn style `toc 1` +
    `PAGEREF`). **Số trang để TRỐNG** — không render được thì ghi số là bịa; viewer tự điền khi mở.
12. **BẪY: một field trải trên NHIỀU đoạn** — `begin`+`separate` ở đoạn này, `end` ở đoạn khác. Thay
    một đoạn là còn `end` mồ côi ⇒ **file không mở được nữa** (converter báo lỗi lạ). Chốt sau mỗi lần
    đụng field: `begin == separate == end`, **và chốt per-dòng** (tổng cân chưa đủ), mọi
    `w:anchor`/`PAGEREF` trỏ tới bookmark có thật.

## Cấm

- Mở file giao đi bằng editor khác rồi lưu lại.
- Sửa file gốc khi chỉ được yêu cầu ĐỌC.
- Ghi đè lên file đang có mà chưa đọc nó.
- Dựng lại `.docx` từ Markdown ("cho nhanh" = mất sạch bảng, ảnh, mục lục, style).
- Báo "đã xong" khi chưa chạy hết bảng kiểm.
