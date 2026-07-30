---
name: write-docx
description: Edit or produce Word files (.docx) without silently destroying their structure - tables, pictures, table of contents, styles, page setup. Use when you must change wording inside an existing .docx, swap or add a picture, resize a picture, insert a section, or hand back a .docx deliverable. Do not use when you only need to READ a document - use read-office for that. Vietnamese triggers - "sửa file word", "ghi file word", "đổi chữ trong file word", "thay ảnh trong docx", "chèn ảnh vào file word", "xuất file word", "cập nhật tài liệu word".
---

# write-docx — sửa file Word mà không phá cấu trúc

> Chỉ ĐỌC thôi thì dùng `read-office` — nó chuyển đổi bằng `markitdown`. Skill này dùng khi phải GHI,
> và nhớ: **`markitdown` chỉ để ĐỌC** — dựng lại `.docx` từ Markdown là mất sạch bảng · ảnh · mục lục · style.

## Vấn đề

`.docx` là **ZIP chứa XML**. Chữ nằm trong `<w:t>`, còn **cấu trúc** — bảng · ảnh · mục lục ·
style · khổ trang — nằm ở XML quanh nó. Hệ quả: **mọi phép kiểm dựa trên "chữ có đổi không" đều
KHÔNG thấy cấu trúc bị phá.** Chữ trong ô bảng cũng là đoạn văn, nên bảng bị bẻ phẳng mà chữ vẫn y nguyên.

## Luật 1 — KHÔNG mở file giao đi bằng editor khác rồi lưu lại

Đo thật: một tài liệu có **8 bảng**, mở bằng một editor desktop khác Word rồi Ctrl+S →
**8 bảng thành 0**, mọi ô bị bẻ thành đoạn thường. Kèm theo: bóc lớp `<w:sdt>` bọc mục lục,
đổi `styleId` thành số, **đảo thứ tự thuộc tính** trong `<w:pgSz>`, bỏ vài part rỗng.
**Chữ không đổi một ký tự** — nên nhìn diff văn bản thì thấy "y nguyên".

- Cần xem thì mở rồi **đóng, KHÔNG lưu**.
- File đang bị editor giữ (`PermissionError` khi ghi) → **đừng kill editor của user**. Chờ đóng.
- Đã lưu rồi thì phải **đếm lại số bảng và số ảnh** trước khi kết luận "không sao".

## Luật 2 — sửa bằng script trên XML, theo từng RUN

Một đoạn có thể gồm nhiều `<w:r>` (run) với định dạng khác nhau. Thay cả đoạn = mất đậm/nghiêng.

- Đổi chữ → thay **nội dung `<w:t>` của đúng run** cần đổi, giữ `<w:rPr>`.
- Thêm đoạn mới → **sao vỏ `<w:p>` của đoạn cùng vai đã có** rồi đổi chữ. Đừng tự đẻ style mới.
- Chỉ thay khi neo khớp **đúng 1 lần**; khớp 0 hoặc ≥2 thì **DỪNG**, đừng thay bừa.

## Ảnh: ba tầng phải khớp nhau

Thêm hoặc đổi một ảnh là sửa **cả ba**, thiếu một tầng là file hỏng:

1. `word/media/<tên>.png` — byte ảnh
2. `word/_rels/document.xml.rels` — một `<Relationship Id="rIdN" … Target="media/<tên>.png"/>`
3. `word/document.xml` — khối `<w:drawing>` trỏ `r:embed="rIdN"`, với `<wp:docPr id>` **cấp số mới**

Đổi ảnh mà giữ nguyên tên entry thì chỉ cần thay byte — nhưng **phải tính lại chiều cao** (dưới).

## Kích thước ảnh: đọc khổ chữ, đừng ghim số

Word đặt kích thước hiển thị bằng **EMU**, không theo pixel ảnh. Thay byte ảnh có tỷ lệ khác mà
giữ nguyên `cx/cy` ⇒ **ảnh bị bóp dẹt**. Rộng hơn khổ chữ ⇒ **tràn lề**.

```python
# kho chu (twip) = pgSz@w − pgMar@left − pgMar@right · 1 twip = 635 EMU
# ĐỌC THEO TÊN thuộc tính, KHÔNG theo vị trí — editor khác nhau đảo thứ tự trong <w:pgSz>
cx = (attr("pgSz", "w") - attr("pgMar", "left") - attr("pgMar", "right")) * 635
cy = round(cx * px_h / px_w)           # cao theo TỶ LỆ GỐC của ảnh
```

Sửa **cả hai** chỗ khai kích thước trong khối ảnh: `<wp:extent>` và `<a:ext>`. Nhiều ảnh khai
cùng `cx/cy` ⇒ **sửa theo KHỐI `<w:drawing>`**, thay chuỗi toàn cục là đổi lây ảnh khác.

## Bẫy regex khi đọc chữ

`<w:t xml:space="preserve"/>` là thẻ **tự đóng** (ô rỗng). Regex `<w:t(?:\s[^>]*)?>` khớp nhầm nó
thành thẻ mở rồi **nuốt XML** tới `</w:t>` kế tiếp ⇒ phép đo "chữ có đổi không" báo lệch giả.
Dùng `<w:t(?:\s[^>]*(?<!/))?>(.*?)</w:t>` — `(?<!/)` chặn thẻ tự đóng. Viết lỏng hơn
(`<w:t[^>]*>`) còn khớp cả `<w:tbl>` · `<w:tc>` · `<w:tr>`.

## Đừng dựng lại file bằng cách nối các đoạn

`head + "".join(mọi <w:p>) + tail` **đánh rơi mọi thứ nằm GIỮA các đoạn**: bảng, lớp bọc mục lục,
bookmark. Muốn dùng thì phải **đo trước** là giữa các đoạn không còn gì (đi tuần tự `xml.find(p, pos)`,
tổng phần bị bỏ qua phải bằng 0). An toàn hơn: `xml.replace(<đoạn cũ>, <đoạn mới>, 1)`.

## Trang và mục lục — bản đọc phải gọn, mục lục phải TỰ hiện

Người đọc thấy TRANG, không thấy XML. Bốn việc, chi tiết ở
[`reference/pagination-toc.md`](reference/pagination-toc.md) — mở khi phải canh trang hoặc dựng mục lục:

- **Ngắt trang:** `<w:keepNext/>` cho tiêu đề và đoạn ngay trên ảnh/bảng · `<w:keepLines/>` chống
  xé đoạn · `<w:pageBreakBefore/>` cho Heading 1 **nhưng KHÔNG ép cho mọi mục** — mục ngắn hơn
  một trang thì ép break là bỏ trắng nửa trang. **Render bằng `x2t` của ONLYOFFICE rồi ĐO** phần
  trống đáy mỗi trang; bỏ break ở mục gây trống > 1/3, xong thử thêm ngược lại. Miễn trang bìa
  và trang cuối.
- **Khoảng cách:** đoạn có `<w:spacing />` rỗng sẽ dán sát đoạn trên — soát MỌI tiêu đề.
- **Mục lục tự động:** cần **cả hai** — `<w:updateFields w:val="true"/>` trong `settings.xml`, và
  nội dung mục lục tự dựng (bookmark ở mỗi Heading 1 + đoạn style `toc 1` + `PAGEREF`).
  **Số trang để TRỐNG** — không render được thì ghi số là bịa; viewer tự điền.
- **BẪY:** một field trải trên NHIỀU đoạn (`begin` đoạn này, `end` đoạn khác). Thay một đoạn là
  còn `end` mồ côi ⇒ **file không mở được**. Chốt: `begin == separate == end`.

Không render được trang ⇒ **không hứa "mục nào cũng gọn 1 trang"**; mục dài hơn một trang phải tràn.

## Kiểm sau MỖI lần sửa — bắt buộc, không bỏ bước nào

| Kiểm | Đỏ khi |
|---|---|
| số `<w:tbl>` | khác bản trước |
| số ảnh + thứ tự | khác bản trước |
| mọi `r:embed` có `<Relationship>` | có cái không tra ra |
| rel trỏ tới file có thật | trỏ vào hư không |
| ảnh có rel mà không ai dùng | còn ảnh mồ vàng |
| `<wp:docPr id>` | có id trùng |
| `<w:instrText>` chứa `TOC` | mục lục biến mất |
| chiều rộng ảnh ≤ khổ chữ | tràn lề |
| tỷ lệ hiển thị so tỷ lệ pixel | lệch ⇒ ảnh bị dẹt |
| chữ so với bản trước | khác ở chỗ KHÔNG cố ý sửa |
| mở lại được (`read-office`) | không convert nổi |

## Mục lục là FIELD, không phải chữ

Sửa ngoài Word thì mục lục **không tự tính lại**. Xong việc phải **nói người dùng mở file bấm `F9`**.
Đừng tự gõ tay số trang vào mục lục.

## Cấm

- Mở file giao đi bằng editor khác rồi lưu lại.
- Sửa file gốc của người dùng khi chỉ được yêu cầu ĐỌC.
- Ghi đè lên file đang có mà chưa đọc nó.
- Dựng lại `.docx` từ Markdown để "cho nhanh" — mất sạch bảng, ảnh, mục lục, style.
- Báo "đã xong" khi chưa chạy hết bảng kiểm trên.
