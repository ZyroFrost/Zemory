---
version: 5
lang: vi
---

# Bản `Legacy` — file gốc hệ cũ, CHỈ ĐỌC

> 🔴 **`Legacy` = hệ cũ + thiết kế cũ, bản chưa ai đụng** (`Skill_PBI_Base` `reference/naming.md`).
> Nó tồn tại vì đúng một lý do: **là mốc DUY NHẤT** chứng minh bản `Classic`/`White` không lệch thiết
> kế và không lệch số. Sửa nó là mất mốc, và mất mốc thì không có cách nào lấy lại.

## 1. Luật cứng — ba điều

1. 🔴 **KHÔNG sửa, KHÔNG lưu đè, KHÔNG mở bằng Desktop rồi bấm Save.** Desktop **ghi lại file** khi
   Save, kể cả khi bạn không cố ý đổi gì (xem §4).
2. 🔴 **KHÔNG mở trực tiếp file nằm trên OneDrive.** Desktop ghi → OneDrive đồng bộ cái ghi đó vào
   thư mục handover ⇒ **mất bản tham chiếu hệ cũ, không đảo được**. Copy về repo rồi mới mở.
3. 🔴 **Nghiệm thu của loại này là `md5` khớp bản gốc.** Không có phép đo nào khác.

## 2. Chỗ đặt file

```
reports/<MÃ PHÒNG>_<Tên>_Legacy_<Bậc>/
   <Tên>.pbix        <- bản gốc, md5 phải khớp mirror
   <Tên>.pbip + .Report/ + .SemanticModel/   <- bản đã chuyển, để ĐỌC
```

Giữ cả `.pbix` lẫn `.pbip` ở đây là **có chủ đích**: bản `.pbip` là thứ đem `diff` với bản `Classic`
để chứng minh không lệch thiết kế. `.pbix` nặng ⇒ theo `Rule_Gate_21_WhatEntersGit`, đi **Git LFS**.

## 3. Chuyển `.pbix` → `.pbip` — cách DUY NHẤT chạy được

Làm trên **một bản sao**, không đụng bản gốc.

```
1. TẮT HẾT phiên Desktop đang mở    <- bước này quyết định thành bại
2. mở đúng file cần chuyển
3. BẤM CHUỘT THẬT: File -> Save as -> Browse this device
```

⚠ **UIA vô dụng ở backstage — đừng thử lại.** `FindAll` trên cửa sổ Desktop chỉ trả về 6 pane
`ms-pbi…/reportView.html`; backstage là HTML nhúng nên cây UIA không thấy nút nào.
Đường chạy được: toạ độ lấy từ ảnh `PrintWindow` cộng `GetWindowRect`, rồi `mouse_event`.

📌 **Bản cũ của sổ từng ghi *"agent KHÔNG làm được, đã thử 5 lượt bằng 3 đường"*.** Đo đó đúng **tại
thời điểm đó** — lúc máy đang có phiên Desktop thứ hai của repo khác giành tiền cảnh. Tắt hết trước
thì ra **PBIR đầy đủ**. Gặp mô tả "không làm được" trong sổ thì kiểm lại điều kiện trước khi tin.

## 4. Đọc `.pbix` mà KHÔNG mở Desktop — ưu tiên đường này

```python
import zipfile, json
z = zipfile.ZipFile(r"<đường dẫn>\<file>.pbix")
lay = json.loads(z.read('Report/Layout').decode('utf-16-le'))   # thường là utf-16-le
for s in sorted(lay['sections'], key=lambda x: x.get('ordinal', 0)):
    cfg = json.loads(s.get('config', '{}'))
    print(s['displayName'], len(s.get('visualContainers', [])),
          'an' if cfg.get('visibility') == 1 else '')
```

- Trang ẩn mang `config.visibility == 1` — **đừng đếm vào danh sách trang chính thức**.
- Mỗi visual: `json.loads(v['config'])` → `name` · `parentGroupName` · `singleVisual` /
  `singleVisualGroup`. Toạ độ nằm **thẳng trên `v`** (`x`·`y`·`width`·`height`), không trong `config`.
- 🔴 **Đây là schema KHÁC PBIR.** `.pbix` dùng `singleVisual` + `vcObjects`; PBIR dùng
  `visual.visualType` + `visualContainerObjects`. **Không chuyển tay giữa hai bên** — muốn khuôn PBIR
  thì chép từ một visual PBIR đang render.
- ⚠ **Phần `DataModel` KHÔNG đọc được** — nén XPress9, không thư viện chuẩn nào giải. Cần DAX/measure
  thì **phải** qua `.pbip` (§3). Đây chính là lý do chuẩn bắt dựng mới bằng `.pbip`.

## 5. Bẫy khi dò thư mục hệ cũ

- ⚠ **`LastWriteTime` KHÔNG nói bản nào mới.** Cả loạt file hay mang cùng một mốc — dấu vết copy
  hàng loạt. Muốn biết bản đang chạy thì đối chiếu **ngày refresh trên Service**.
- ⚠ **Bản trùng tên rất nhiều** (`- Copy`, `_BK`, `_TEST`, `1`, `- RLS`). Đo một thư mục thật: 12
  dashboard nhưng **19 bản trùng tên**, riêng một model có 6 bản nặng 438–783 MB.
  **Chốt bản đang chạy TRƯỚC khi mổ** — mổ nhầm là tái dựng theo logic đã chết.
- ⚠ **File cloud-only**: mở một file là OneDrive kéo về. Một thư mục 113 `.pbix` mà 100 còn là
  placeholder ⇒ mở bừa là hydrate vài GB.
- ⚠ **Tên file hệ cũ chứa bẫy ký tự**: en dash `–` U+2013 (nhìn y hệt `-`), dấu tiếng Việt, `(%)`,
  và **dấu cách**. Guard từng vỡ vì tên file có dấu cách — quote đường dẫn.

## 6. Nghiệm thu

```
md5(<Tên>.pbix) == md5(bản gốc trên mirror)      -> BẮT BUỘC, không có ngoại lệ
git status trên thư mục Legacy                    -> rỗng, ngoài lần copy đầu tiên
```

Muốn chứng minh bản `Classic`/`White` không lệch thiết kế: `diff` thư mục `definition/` của bản đó với
bản `Legacy` đã chuyển `.pbip`. Lúc mới tách phải ra **0 lệch**.
