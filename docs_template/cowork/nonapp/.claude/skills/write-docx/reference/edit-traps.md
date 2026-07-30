# Bẫy khi sửa `.docx` bằng script — thứ ĐÃ làm hỏng file thật

Mở file này **trước khi** sao vỏ đoạn/bảng, đụng vào field, hay viết chốt kiểm.
Mỗi mục dưới đây là một lần hỏng thật, không phải lo xa.

## 1. Sao vỏ đoạn thì BÊ THEO BOOKMARK

Sao `<w:p>` của một tiêu đề để làm tiêu đề mới ⇒ **bookmark của tiêu đề cũ đi theo**:
trùng `w:name` **và** trùng `w:id`. Word không báo lỗi, nhưng liên kết mục lục của tiêu đề
cũ nhảy tới chỗ sai (chỗ nào có bookmark trước thì thắng).

**Sao xong phải gỡ ngay** `bookmarkStart`/`bookmarkEnd` cũ rồi mới gắn cái mới. Chốt:

```python
names = re.findall(r'<w:bookmarkStart[^>]*w:name="([^"]+)"', xml)
ids   = re.findall(r'<w:bookmarkStart[^>]*w:id="(\d+)"', xml)
assert not [k for k, v in Counter(names).items() if v > 1], "bookmark trung ten"
assert not [k for k, v in Counter(ids).items()   if v > 1], "bookmark trung id"
assert len(names) == xml.count("<w:bookmarkEnd")           , "start != end"
```

## 2. `replace(x, y, 1)` xoá NHẦM khi hai đoạn giống nhau TỪNG KÝ TỰ

Các run kỹ thuật thường **y hệt nhau**, ví dụ hai lần
`<w:r><w:fldChar w:fldCharType="end"/></w:r>` trong cùng một đoạn. `re.search` tìm đúng cái
thứ hai, nhưng `str.replace(..., 1)` xoá **cái thứ nhất** — vì nó khớp theo NỘI DUNG, không
theo vị trí đã tìm.

Hỏng thật: xoá nhầm `end` đóng `PAGEREF` (bên trong hyperlink) thay vì `end` đóng field `TOC`
(bên ngoài) ⇒ `fldChar` lệch ⇒ **file không mở được nữa**, và trình đọc báo một lỗi lạ
(`IndexError: pop from empty list`) chứ không nói "sai field".

**Cách đúng — cắt theo VỊ TRÍ, đừng replace:**

```python
m = PATTERN.search(para)                      # da biet vi tri
out = para[:m.start()] + para[m.end():]       # cat dung cho do
```

## 3. Field trải nhiều đoạn ⇒ kiểm PER-ĐOẠN, không chỉ kiểm tổng

`begin == separate == end` trên toàn file **không đủ**: thiếu một `end` ở đoạn này mà thừa một
`end` ở đoạn kia thì tổng vẫn cân, file vẫn hỏng. Với mục lục, cấu trúc đúng là:

- **mọi** dòng: `[begin, separate, end]` **BÊN TRONG** `<w:hyperlink>` (đóng `PAGEREF`)
- dòng **ĐẦU**: thêm `begin, separate` ở **ngoài** hyperlink (mở field `TOC`)
- dòng **CUỐI**: thêm `end` ở **ngoài** (đóng field `TOC`)

Chốt lại đúng hình đó cho từng dòng — đó là phép kiểm bắt được lỗi ở mục 2, còn phép kiểm
tổng thì không.

## 4. Đừng GHIM số trong chốt kiểm — hãy ĐẾM lúc khởi động

Chốt `if len(tables) != 8: raise` là đúng cho tới khi tài liệu có thêm bảng thứ 9 — rồi script
tự dừng và báo "số bảng đổi", trong khi thật ra **chốt của bạn mới là cái cũ**. Đếm lúc mở file
rồi so với chính nó:

```python
N_TBL = len(re.findall(r"<w:tbl>", xml_ban_dau))   # dem, KHONG ghim
...
assert len(re.findall(r"<w:tbl>", xml_moi)) == N_TBL
```

## 5. Đổi nội dung là ĐỔI PHÂN TRANG — phải đo lại

Thêm một câu cũng dồn cả tài liệu xuống. Sau **mỗi** lần đổi nội dung: render lại và đo
(xem `pagination-toc.md`), rồi mới chốt "xong".

Và **tiêu chí đo đừng miễn trang cuối**: đo thật cho thấy có cấu hình **12 trang mà trang cuối
đầy 97%**, trong khi cấu hình **13 trang để trang cuối trống 76%**. Miễn trang cuối là không
nhìn thấy giá phải trả, nên chọn ra bản xấu hơn. Chỉ miễn **trang bìa**.

## 6. Nhân bản BẢNG: lấy hàng tiêu đề + MỘT hàng mẫu

Đừng viết `<w:tbl>` từ đầu (dễ thiếu `tblPr`/`tblGrid` ⇒ bảng không có viền, sai độ rộng).
Lấy một bảng đã có, giữ **hàng tiêu đề** + **một hàng dữ liệu làm khuôn**, rồi lặp khuôn đó
cho từng hàng mới và thay chữ trong từng ô.

Thay chữ trong ô: đặt nội dung vào `<w:t>` **đầu tiên**, các `<w:t>` còn lại làm rỗng — không
thì chữ cũ của ô sót lại phía sau.

## 7. File đang bị editor giữ

Ghi vào file đang mở ⇒ `PermissionError` (Windows). **Đừng kill editor của người dùng** — có
thể họ đang có sửa chưa lưu. Chờ mở khoá rồi áp, và script phải **đọc lại file TẠI LÚC ÁP**
(người dùng có thể đã lưu gì đó trong lúc chờ), kèm chốt "cấu trúc còn nguyên" trước khi ghi.
