# Số đo & bẫy đã trả giá — bản `White`

> Tách khỏi `SKILL.md` để thân skill dưới trần 120 dòng. Mọi con số ở đây **đo được**, không suy đoán.

## 1. `cardVisual` — khuôn đầy đủ

🔴 **Icon là `ResourcePackageItem` trỏ PNG cục bộ, KHÔNG phải measure.**
*(đính chính 2026-09-22: sổ cũ ghi `imageUrl` trỏ measure họ `~URL_*`; đo trên chính khuôn gốc
khuôn gốc của vùng (`template_report`) thì sai — đi theo sổ là đẻ ra 6 measure vô dụng.)*

```json
"image": [{ "properties": {
  "show":      { "expr": { "Literal": { "Value": "true" }}},
  "image":     { "image": {
      "name": { "expr": { "Literal": { "Value": "'revenue.png'" }}},
      "url":  { "expr": { "ResourcePackageItem": {
                  "PackageName": "RegisteredResources",
                  "PackageType": 1, "ItemName": "revenue.png" }}}}},
  "padding":   { "expr": { "Literal": { "Value": "10L" }}},
  "size":      { "expr": { "Literal": { "Value": "40L" }}},
  "position":  { "expr": { "Literal": { "Value": "'Right'" }}},
  "imageType": { "expr": { "Literal": { "Value": "'imageUrl'" }}}}}]
```

- Khuôn gốc: `size 57 · padding 15` cho card `265x120`. Card nhỏ hơn thì thu theo tỷ lệ —
  card `150x90` → `size 40 · padding 10`.
- Icon **được phép rỗng**: khuôn gốc có card để `name`/`url` = `''`.

🔴 **`card` cũ và `cardVisual` KHÁC schema truy vấn — đây là chỗ vỡ file:**

```
card        visual.query.queryState.Values.projections[]
cardVisual  visual.query.queryState.Data.projections[]
```

⚠ **Đừng phủ ảnh rời lên `card` cũ** để giả làm icon: ra ảnh nhỏ, lệch, và nhãn phải dựng bằng shape
rời vì `card` cũ vẽ *số trên — nhãn dưới*. Đã bị người dùng bác hai lượt.

📌 **Khuôn PBIR lấy ở đâu:** tìm một `cardVisual` **đang render** trong estate mà chép — bản `Red`
của `ABC_IncomeStatement` có sẵn. **Đừng dịch từ `.pbix`** (xem §3).

## 2. Desktop tự sửa file khi Save — dò lại ba thứ sau MỖI lượt người dùng bấm Save

Đo thật trên một lượt Save của một trang:

| Nó làm gì | Đo được | Hậu quả |
|---|---|---|
| Ghi **trạng thái đang xem** thành mặc định trang | **16 visual** đổi ẩn/hiện chỉ trên 1 trang | ẩn mất pie + thẻ KPI; bày ra 6 nhãn vốn ẩn |
| **Dọn resource không ai tham chiếu** | mất `tab_transparent_hit_area.png` | mọi nút trong suốt hết bấm được |
| Giữ thẻ lọc nhưng **xoá GIÁ TRỊ** | `Dim_Store.BusinessUnit` mất `'Southern'` | **đổi số toàn báo cáo**, không ai báo |

**Cách dò đúng:** so từng file với `git show HEAD:<path>` rồi so **TẬP HỢP**, đừng đọc `git diff`
tuyến tính — danh sách `resourcePackages` bị **sắp xếp lại** khi Desktop ghi, nên diff trông như xoá
hàng loạt trong khi thực ra chỉ mất đúng một mục. Đọc tuyến tính một lần suýt kết luận sai rằng
theme `theme của vùng (`theme_file`)` đã bị gỡ.

⚠ `glob` trên Windows trả đường dẫn **dấu chéo ngược**; `git show HEAD:<path>` cần **dấu chéo xuôi**.
Quên đổi thì mọi lượt `git show` trượt và phép so ra "81 visual mới" — một kết luận sai hoàn toàn.

## 3. Bẫy kỹ thuật khác

- 🔴 **PBIR và `Report/Layout` của `.pbix` là HAI schema khác nhau.** `.pbix` dùng
  `config.singleVisual` + `vcObjects`; PBIR dùng `visual.visualType` + `visualContainerObjects`.
  Chuyển tay giữa hai bên là vỡ file.
- 🔴 **`$schema` phải trùng phiên bản file đang khai**, không tự chọn. Đếm trước khi ghi — một file
  thật đang dùng `visualContainer/2.10.0` (524 file) và `bookmark/2.1.0` (22 file); ghi
  `bookmark/1.1.0` vào là lệch cả file.
- 🔴 **Desktop báo *"Unable to open document — Power BI Desktop ran out of memory loading the data
  model"* KHÔNG phải lỗi file.** Đo RAM trước khi kết luận: một ca thật còn `0,5 GB / 15,7 GB` vì
  VS Code giữ `5,6 GB` qua **40 tiến trình** cộng hai phiên Desktop khác đang mở. Đóng bớt rồi mở
  lại — đừng đi sửa một file đang đúng.
  *Cách đọc hộp thoại khi title cửa sổ rỗng:* `EnumWindows` lọc theo PID rồi `GetWindowText`; chụp
  riêng HWND của hộp thoại bằng `PrintWindow` cờ `2`. UIA không đọc được hộp thoại này.
- ~~`shape` mang `visualLink` KHÔNG bấm được — phủ PNG trong suốt~~ 🔴 **SAI, đã bỏ 2026-09-24** (thân
  skill §5): `shape` mang `visualLink` bấm được bình thường, đo trên `Red` (`BG_UserGuide`). Nút im lặng là
  do đặt link SAI CHỖ (`visual.visualLink` thay vì `visual.visualContainerObjects.visualLink`). PNG trong
  suốt còn sót chính là "ô vuông tím" trên nút — thấy thì xoá.
- ⚠ **Kiểm link chết:** mọi `visualLink` kiểu `Bookmark` phải trỏ tới một file bookmark **có thật**.
  Ca thật: một shape trỏ `Bookmark4d6d02e51a4ace4c9e61` — bookmark đó không tồn tại.
- ⚠ **Ghi file giữ đúng EOL đang có trên đĩa** (`Rule_Gate_24_EolKeep`). PBIR do Desktop ghi là **CRLF**,
  dù repo lưu LF qua `.gitattributes`.

## 4. Công thức chia tab

```
vùng nội dung = 720 - 50 (header) - 5 - 30 (dải tab) - 5 - chiều cao hàng card
hàng card 90  =>  còn 530
số tab một trang = ceil((chiều cao trang hiện tại - 50) / 660)
```

Số đo một report AM thật: 9 trang cao `1085`–`3295` ⇒ **≈26 tab**. Đừng ước bằng cảm giác.
