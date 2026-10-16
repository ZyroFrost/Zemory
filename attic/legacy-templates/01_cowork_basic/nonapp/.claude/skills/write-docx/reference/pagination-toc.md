# Ngắt trang và mục lục tự động — công thức đầy đủ

Đọc file này khi phải **canh trang** hoặc **dựng / sửa mục lục** trong `.docx`.
Phần tóm tắt nằm ở `SKILL.md`; đây là chi tiết thao tác.

## 1. Ngắt trang — ba thuộc tính, chen đúng chỗ

Trong `<w:pPr>`, thứ tự schema **bắt buộc**: `pStyle` → `keepNext` → `keepLines` → `pageBreakBefore`.
Chen sai thứ tự thì Word có thể bỏ qua hoặc báo lỗi cấu trúc.

| Thuộc tính | Áp vào | Được gì |
|---|---|---|
| `<w:pageBreakBefore/>` | mỗi **Heading 1** | mục lớn luôn bắt đầu ở đầu trang mới |
| `<w:keepNext/>` | Heading 2 · đoạn đứng **ngay trên** ảnh/bảng | tiêu đề không nằm cuối trang một mình; ảnh không rời khối của nó |
| `<w:keepLines/>` | các đoạn trong khối ảnh | đoạn không bị xé đôi giữa hai trang |

```python
# chen NGAY SAU <w:pStyle .../> neu co, khong chen cuoi <w:pPr>
ms = re.match(r"(<w:pStyle[^>]*/>)", ppr_inner)
ppr_inner = (ms.group(1) + need + ppr_inner[ms.end():]) if ms else (need + ppr_inner)
```

Với ảnh: đi ngược **2 đoạn có chữ** phía trên đoạn ảnh (tiêu đề + câu dẫn) rồi gắn
`keepNext` + `keepLines` cho chúng — cả khối tiêu đề · câu dẫn · ảnh sẽ cùng sang trang.

## 1b. ĐỪNG ép ngắt trang cho mọi mục — phải ĐO

"Mỗi mục bắt đầu đầu trang" và "không để trống quá 1/3 trang" **xung đột nhau** khi mục ngắn hơn
một trang: ép break là phần còn lại của trang bỏ trắng. Đo thật trên một tài liệu 11 mục: ép hết
⇒ **15 trang, 7 trang trống hơn 1/3**, có trang **94% trắng** chỉ để chứa một dòng đuôi mục trước.

Nên **đo rồi mới chọn**, đừng đoán. Không có Word/LibreOffice vẫn render được:

```
# ONLYOFFICE co san bo chuyen doi: <ProgramFiles>/ONLYOFFICE/DesktopEditors/converter/x2t.exe
# Goi bang params XML: m_sFileFrom / m_sFileTo / m_nFormatTo=513 (PDF)
#   + m_sAllFontsPath = <LocalAppData>/ONLYOFFICE/DesktopEditors/data/fonts/AllFonts.js
#   + m_sFontDir      = thu muc do        (thieu font thi x2t bao loi JS, khong ra PDF)
# Roi do bang pdfminer: y0 thap nhat cua chu THAN BAI (loai vung footer!) so voi le duoi.
```

Quy trình chọn:

1. Ép break cho **mọi** Heading 1 → render → đo phần trống đáy từng trang.
2. Còn trang trống > 1/3 ⇒ **bỏ break** của mục gây ra, ưu tiên mục giúp nhiều nhất → render lại.
3. Hết vi phạm thì chạy lượt **thêm ngược lại**: thử gắn break cho từng mục còn thiếu, nhận nếu
   không đẻ vi phạm mới ⇒ giữ được **nhiều nhất** số mục đầu trang.
4. **Miễn trừ trang bìa và trang cuối** — nội dung hết ở lưng trang là tất yếu, không ngắt trang
   nào chữa được.

Kết quả thật của quy trình này trên tài liệu nói trên: **15 → 11 trang**, 0 vi phạm giữa bài,
3/11 mục đầu trang (tìm vét: thêm bất kỳ mục nào cũng đẻ vi phạm). Con số 3 đó là **trần thật**,
không phải làm ẩu — và phải nói ra như vậy thay vì hứa "mục nào cũng một trang".

## 2. Khoảng cách tiêu đề — kiểm cả đoạn KHÔNG khai gì

Đoạn có `<w:spacing />` rỗng thì **dán sát** đoạn trên, nhìn như dính trùm. Soát **mọi**
tiêu đề, đừng chỉ soát cái nào có số. Chuẩn hoá về một giá trị, ví dụ
`<w:spacing w:after="100" w:before="280" />` (twip).

## 3. Mục lục tự động — hai việc, thiếu một là mục lục trống

### 3a. Bật cập nhật field khi mở

```xml
<!-- word/settings.xml — chen TRUOC <w:footnotePr> cho dung thu tu CT_Settings -->
<w:updateFields w:val="true"/>
```

Không có dòng này thì người đọc **phải bấm `F9` tay**, mở ra thấy mục lục trống.

### 3b. Ghi sẵn danh mục, mỗi mục một đoạn có neo

Field `TOC` chỉ có `begin → separate → end` mà **không có nội dung** ⇒ mở ra là trống.
Phải tự dựng phần nội dung:

1. Gắn bookmark vào **mỗi Heading 1** — `<w:bookmarkStart w:id="N" w:name="_TocNNN"/>` ngay
   sau `</w:pPr>`, `<w:bookmarkEnd w:id="N"/>` ngay trước `</w:p>`.
2. Mỗi mục một đoạn style `toc 1`, có tab phải + dot leader ở **đúng khổ chữ** (twip):

```xml
<w:p><w:pPr><w:pStyle w:val="<id toc 1>"/>
    <w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9026"/></w:tabs></w:pPr>
  <!-- CHI doan DAU: mo field TOC -->
  <w:r><w:fldChar w:fldCharType="begin"/></w:r>
  <w:r><w:instrText xml:space="preserve">TOC \h \o "1-1"</w:instrText></w:r>
  <w:r><w:fldChar w:fldCharType="separate"/></w:r>
  <w:hyperlink w:anchor="_Toc001" w:history="1">
    <w:r><w:rPr><w:rStyle w:val="<id Hyperlink>"/></w:rPr><w:t>1. Tên mục</w:t></w:r>
    <w:r><w:tab/></w:r>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> PAGEREF _Toc001 \h </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>   <!-- ket qua RONG, xem duoi -->
  </w:hyperlink>
  <!-- CHI doan CUOI: dong field TOC --> <w:r><w:fldChar w:fldCharType="end"/></w:r>
</w:p>
```

**Số trang: để TRỐNG, đừng ghi số.** Không render được thì không biết số thật; ghi số đoán là
bịa, và nếu viewer không cập nhật thì con số sai đó ở lại vĩnh viễn. Để rỗng + `updateFields`
⇒ viewer tự điền đúng ngay khi mở. Tên mục vẫn hiện sẵn nên mục lục không bao giờ trống trơn.

## 4. BẪY: một field trải trên NHIỀU đoạn

`begin` + `separate` có thể ở đoạn này, `end` ở **đoạn khác**. Thay đúng một đoạn ⇒ còn lại
một `end` mồ côi ⇒ `fldChar` lệch ⇒ **file không mở được nữa** (converter báo lỗi lạ, không
báo "sai field").

Chốt bắt buộc sau khi đụng vào field:

```python
c = Counter(re.findall(r'<w:fldChar w:fldCharType="(\w+)"', xml))
assert c["begin"] == c["separate"] == c["end"], c    # lech la DUNG ngay
```

Và kiểm thêm: mọi `w:anchor` + mọi `PAGEREF` phải trỏ tới một `bookmarkStart` có thật;
số `bookmarkStart` == số `bookmarkEnd`.
