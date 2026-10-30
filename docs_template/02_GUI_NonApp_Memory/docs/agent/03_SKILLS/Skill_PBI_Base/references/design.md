# Thiết kế report Power BI — màu, tương tác, bố cục

> Phần của `Skill_PBI_Base`. Áp đủ cho `Red` và `White`; `Classic` giữ thiết kế cũ (thấy chỗ trái chuẩn thì BÁO, không nắn);
> `Legacy` không đụng. Luật ở đây nói theo VAI; giá trị thật (mã màu · thông số khung · số đo trên trang gốc · logo) nằm ở tổng
> quản: bảng giá trị thiết kế (khoá `design_values`), theme (`theme_file`), thư viện icon (`icons_dir`), khuôn gốc
> (`template_report`) trong giá trị cụm. Thao tác JSON: skill `pbi-pbip`. Máy canh: các cổng `pbi_gate.py` nêu ở từng mục.

## 1. Màu

### 1.1 Bảng màu là danh sách đóng

- Hai bảng, hai vai: màu KHUNG và TRẠNG THÁI (nhấn · chữ · nền · đường kẻ · tăng/giảm) và dãy màu DỮ LIỆU (`dataColors` của theme).
  Màu nhấn của khung không làm màu chuỗi dữ liệu.
- Vai của bảng khung: nhấn chính (tiêu đề, viền khối, dải nút; cũng là màu chiều GIẢM) · nhấn đậm · cấp 2 của phân cấp dòng ·
  trỏ chuột · chiều TĂNG (bản chữ trên nền trắng + bản sáng cho nhãn % đè lên cột đậm) · CHỮ trên nền sáng · ba xám (đường kẻ,
  nền phụ, viền — không bao giờ dùng cho chữ) · nền trang · nền khối trắng.
- Cần một màu ngoài hai bảng ⇒ hỏi, không tự pha. Màu tự thêm sống mãi trong một file và không ai biết là cố ý hay lỡ tay.
- Nạp theme, không gõ mã màu vào từng visual. Ngoại lệ có chủ ý: màu hệ thống (chữ, xám, tăng/giảm, header matrix) ghi thẳng mã;
  muốn chart này khác màu chart kia ⇒ ghi ở `objects.dataPoint` của visual (theme gán theo thứ tự chuỗi nên chart nào cũng lấy ô 1)
  và ghi lại vì sao.
- Máy kiểm: mọi mã màu trong `<Tên>.Report/definition` thuộc hai bảng (trừ chính file theme); cổng `theme-standard` ·
  `chart-palette`.

### 1.2 Dãy màu dữ liệu ghi bằng tham chiếu theme

- `ThemeDataColor` với `ColorId` = 2 + vị trí ô (`0` = background · `1` = foreground · `2` = `dataColors[0]` …) và `Percent` = 0.
  `Percent` khác 0 theo CẢ HAI chiều đều sinh màu ngoài bảng; chiều âm (làm tối) nguy hơn vì trông vẫn "đúng tông".
- Bê visual từ khuôn demo hay mang `ColorId` trỏ ra ngoài bảng ngắn hơn cộng `Percent` khác 0 ⇒ chữ xám lợt mà JSON vẫn hợp lệ.
- Máy kiểm: `grep -ro '"ColorId": [0-9]*'` ⇒ chỉ `0..1` hoặc ô dữ liệu có thật; `grep -ro '"Percent": [-0-9.]*'` ⇒ chỉ `0`.
- Thứ tự áp: thẻ thứ *i* của hàng card → ô *i* (quay vòng); chart: chuỗi chính lấy ô theo thứ tự, chart sau trong cùng tab nối tiếp
  (hai chart cạnh nhau không trùng); kỳ so (LY · LM · LMTD · LW · Target) màu xám kỳ so, kỳ so thứ hai xám đậm hơn; chart chia theo
  nhóm cố định gán màu theo danh sách giá trị cố định của nhóm, không theo thứ tự xuất hiện (bộ lọc làm mất một chuỗi thì các chuỗi
  còn lại không đổi màu); `(Blank)` màu xám kỳ so.
- Chart MỘT chuỗi: màu ở mục `dataPoint` KHÔNG selector — gắn `selector.metadata` thì Desktop lờ đi và vẽ ô 1.
- Combo chart không tô được từng cột (`showAllDataPoints` không tác dụng) ⇒ muốn mỗi cột một màu thì dùng `columnChart` thuần.
- Máy làm: `mix_palette.py` (skill `pbi-white`); máy canh: `chart-palette` · `chart-fill-shape` · `compare-grey`.

### 1.3 Màu chữ — hai lựa chọn, không có xám

- Nền sáng ⇒ màu CHỮ của bảng; nền tối ⇒ trắng. Ba xám là màu đường kẻ, viền, nền — dùng cho chữ là chữ chìm. Màu nhấn chính
  dùng được cho tiêu đề.
- Áp cho mọi chỗ có chữ: giá trị và nhãn card · tiêu đề hàng/cột bảng · nhãn trục · chú giải · hộp văn bản.
- Chữ ghi thẳng mã màu; buộc dùng `ThemeDataColor` thì `ColorId` trong bảng và `Percent` = 0.
- Trong theme: `foreground` · `foregroundNeutralSecondary` · `neutral` · `textClasses.label.color` mang màu chữ;
  `foregroundNeutralTertiary` giữ xám vì Power BI dùng nó cho đường lưới.

### 1.4 Tăng / giảm

- Tăng · giảm · trung tính là ba màu của bảng; chiều giảm dùng lại màu nhấn chính, không thêm đỏ thứ tư.
- `good`/`bad`/`neutral` của theme không tô chữ. Card hiện một measure trả về CHUỖI (`"+2.30% ↑"`) phải nối `value.fontColor`:
  ```
  ① measure trả mã màu (nên dùng — đọc chính chuỗi đang hiện, màu không lệch dấu với số):
       measure '<tên> Color' = VAR t = [<measure hiển thị>]
           RETURN IF(ISBLANK(t), <chữ>, IF(LEFT(t,1) = "-", <giảm>, <tăng>))
       gắn vào value.fontColor -> solid.color.expr.Measure
  ② Conditional Cases theo một measure SỐ: value.fontColor -> solid.color.expr.Conditional.Cases[] (khi cần hơn hai mức)
  ```
  Khuôn ① so `LEFT(t,1) = "-"` ⇒ measure hiển thị tự thêm `+` cho số dương.
- Máy canh: `pct-color`.

### 1.5 Ba tầng nền

```
dải nút (cột điều hướng)          nhấn đậm — để icon trắng nổi lên
ô nền của nút  +  nền nội dung    CÙNG một mã (xám viền)
khối nội dung                     trắng, viền nhấn chính
```
"Nền nút" là ô sáng của nút, không phải dải đậm sau nút; nền trang giữ màu dải. Không tin tên shape (`WhiteBG…` có thể không trắng)
— mở ra đo.

### 1.6 Highlight theo mục đích, không chép màu bản cũ

1. Truy vì sao bản cũ tô màu: chạy từ cột dữ liệu TĨNH ⇒ mục đích cấu trúc (cấp bậc dòng, nhóm); chạy từ ngưỡng hay phép so sánh
   ⇒ mục đích hiệu năng. Truy bằng dữ liệu (cột màu thường là cột DAX tính từ một cột đánh dấu tĩnh), không đoán.
2. Cấu trúc ⇒ cấp 1 màu nhấn chính, cấp 2 màu "cấp 2 phân cấp dòng" của bảng; hiệu năng ⇒ cặp tăng/giảm.
3. Không chép mã màu bản cũ: bản cũ chọn màu cho nền của nó.

- Matrix không in đậm theo điều kiện — chỉ tô màu chữ và nền ⇒ phân cấp dòng phải bằng màu. Tô màu theo dòng: `values.fontColor`
  → measure trả mã màu, selector `{"data":[{"dataViewWildcard":{"matchingOption":1}}],"metadata":"<queryRef cột số>"}`, một mục
  cho MỖI cột số. Tô NỀN theo điều kiện chưa có tiền lệ — không làm khi chưa thử được.

### 1.7 Matrix — một kiểu cho mọi bảng

Header cột nền header matrix, chữ trắng đậm `10D` · cột tên hàng màu chữ trên trắng · hàng xen kẽ hai nền (heat-map `FillRule`
giữ) · total/subtotal đậm trên nền nhạt · cột % theo FORMAT measure, tô tăng/giảm theo chính measure đó (measure khai
`pct_neutral` thì không) · chỉ kẻ ngang · tiêu đề giống chart: hiện, trái, Segoe UI Semibold `12D`, màu chữ, không nền; không hiện
tên kỹ thuật `Table_…`. Máy làm: `mix_palette.py --matrices`; máy canh: `matrix-style` · `title-style`. Chi tiết: skill `pbi-white` §4l.

### 1.8 Icon trên thẻ KPI

Vuông, neo góc phải trên cách mép trên và phải của nền thẻ 5 px, cạnh = 60 % của (cao thẻ − 10) làm tròn xuống lưới 5; hộp số dừng
trước icon 5 px; màu = ô theme của số trên thẻ; icon lấy từ thư viện của cụm; một icon nói đúng một chỉ số. Máy làm:
`card_icons.py render | place`; máy canh: `card-icon`. Chi tiết: skill `pbi-white` §4m.

## 2. Visual và tương tác

### 2.1 Chữ trong một shape — hai chỗ đặt

`objects.text` (chữ trong thân shape) và `visualContainerObjects.title` (dải title của container) là hai object khác nhau. Đường
title phải bật `background` và tô màu, nếu không chữ nằm trên dải trong suốt. Sửa một shape thì mở ra xem nó đang dùng đường nào.

### 2.2 Nút bấm được

- `visualLink` nằm ở `visual.visualContainerObjects.visualLink`; đặt ở `visual.visualLink` thì Power BI vẫn mở file, không báo gì,
  bấm không chạy. `shape` và `image` đều mang được `visualLink` đúng chỗ.
- Mọi `visualLink` kiểu `Bookmark` trỏ tới bookmark có thật. Vạch và viền trang trí có `z` thấp hơn lớp nút.
- Máy canh: `visual-link` (chặn cả lúc mở Desktop).

### 2.3 Bookmark chụp toàn trang

- Visual không có tên trong bookmark giữ nguyên trạng thái đang có ⇒ khai thiếu một cái là nó sống qua mọi lần chuyển tab.
- Khai cả từng visual lá (`visualContainers`) lẫn từng nhóm (`visualContainerGroups`, cây cha-con); khai nhóm không thay được khai lá.
- Bảng lọc và các slicer trong nó cũng nằm trong ảnh chụp (thường là đóng).
- Dựng từ TOÀN BỘ visual của trang (trạng thái mặc định theo `isHidden` của nó cộng mọi nhóm cha), rồi đè vài ngoại lệ của tab.
- Máy kiểm: số mục `visualContainers` = số visual lá của trang; mọi nhóm có mặt. Thao tác và các cổng `bm-*`: skill `pbi-pbip` §3.

### 2.4 Slicer

- `objects.header.show = false` khai tường minh (không khai là BẬT) và `visualContainerObjects.title.show = false`; nhãn bộ lọc là
  hộp chữ rời. Máy canh: `slicer-style`.
- Không slicer nào hiện `(Blank)`: lọc theo cờ có sẵn trên dim (vd cờ dòng hiển thị) ở ĐÚNG các slicer cần — không bỏ chọn
  `(Blank)` (bấm Clear là quay lại), không đặt cờ ở cấp report (làm rỗng visual khác). Phép kiểm trên DW cho mọi cột nuôi slicer:
  `SUM(CASE WHEN <cột> IS NULL OR LTRIM(RTRIM(<cột>))='' THEN 1 ELSE 0 END)` = 0 sau bộ lọc cấp report. Máy canh: `slicer-blank`.

### 2.5 Nhãn trục thời gian và cột khoá

- Trục kỳ hiện `MM/YYYY`, không hiện mã kỳ (`202601`). Cột nhãn nằm trong dim ngày, sắp theo cột mã:
  `PeriodLabel = Text.PadStart(Text.From([Month]),2,"0") & "/" & Text.From([Year])`, `sortByColumn: YearMonth` (thiếu là trục sắp
  theo chữ: `01/2026` trước `12/2025`).
- Cột khoá không làm nhãn cho người đọc ở `Category` · `Rows` · `Columns` · `Series` · `Legend`: `YearMonth` · `DateKey` · mã dòng
  · mã/ID cửa hàng · mã đơn vị · khoá dẫn xuất · cột thứ tự. `displayName` cũng không mang mã (`Kỳ`, không `Kỳ (YYYYMM)`).
- Model Import: thêm cột là phải nạp lại dữ liệu; trước đó chart trỏ cột mới rỗng — trạng thái đúng của bước giữa.
- Sửa thì quét CẢ report, không chỉ trang đang mở. Kiểm: `grep -c '"queryRef": "<dim ngày>.YearMonth"'` trên mọi
  `visual.json` ⇒ 0, tương tự cho mọi cột khoá ở trên. Trục tuần khai `sortDefinition` theo cột tuần: cổng `axis-sort`.

### 2.6 Thư viện icon

- Một thư mục PHẲNG ở tổng quản (`icons_dir`); xuất xứ ghi ở `README.md` của thư viện (bảng icon → bộ gốc), không ghi bằng thư mục.
  Report dùng icon nào thì chép vào `StaticResources` của report đó; thư viện là bản gốc, report không trỏ thẳng vào.
- Tên `<tên>[_<số>][_red|_white].png`: chữ thường ASCII, nhiều từ nối `-`, biến thể đánh số nối `_`, màu là hậu tố cuối.
- Thêm icon: ① tìm trong thư viện trước · ② đặt tên theo nội dung, không theo tên tải về · ③ mẫu khác = số mới, không ghi đè ruột
  một tên đã có (report đã khai tên đó sẽ âm thầm đổi hình) · ④ đủ ba bản màu (gốc đen · `_red` màu nhấn · `_white`), bản thiếu
  sinh từ bản có bằng cách thay kênh RGB, giữ alpha; nghiệm thu: ba bản cùng số điểm ảnh đục.
- Độ dày nét đồng đều ≈ 17 px trên ảnh 512, đo `2 × (px đục) / (px viền)`. Nguồn khuyên dùng: bộ outline giấy phép MIT không buộc
  ghi công (vd Tabler) — hạ `stroke-width` rồi đo lại (mặc định 2/24 ra ≈ 43 px). Render nền trong suốt bằng trình duyệt headless.
- Không đưa vào: màu ngoài bảng · bản trùng (so HÌNH: kênh alpha, co 128×128, nhị phân hoá, băm) · tên có khoảng trắng, ngoặc,
  chữ hoa. Icon từ bộ chưa xác minh giấy phép ⇒ hỏi trước khi lên bản giao ra ngoài.
- Ảnh dùng trong report phải có file thật và khai trong `report.json › resourcePackages`: cổng `images`.

### 2.7 Màu icon theo nền nó đứng

- Nút chưa bật nằm trên dải đậm ⇒ icon `_white`; nút đang bật đổi nền ô sang sáng ⇒ icon gốc đen. Không dùng `_red` trên dải đậm.
- Dấu "đang mở" có hai lớp: icon và mảng nền sáng dưới icon — đổi trang là đổi cả hai. Kiểm: mỗi trang đúng một mảng nền hiện,
  cùng `y` với ô có icon đen; `BT_Page_*_Off` dùng ảnh `_white`, `BT_Page_*_On` không dùng `_white` hay `_red`. Cổng `on-off-pair` canh cặp `_On`/`_Off`:
  đúng một cái hiện, cùng toạ độ, `_On` nằm trên.

## 3. Bố cục

### 3.1 Lưới 5

```
LỀ VỚI VIỀN          5   visual cách mép nền hoặc khung chứa nó
KHE GIỮA HAI KHỐI    5
ĐÈ LÊN VIỀN          0   cấm
NÚT KỀ NHAU         60   mép đầu → mép đầu (nút 50×50 ⇒ hở 10)
LƯỚI                 5   mọi x · y · width · height của mọi object chia hết cho 5
CHIA Ô MỘT HÀNG          rộng một ô = (rộng vùng nội dung − 5 × (N − 1)) / N
```
- Đè lên viền ⇒ hạ khối 5 VÀ giảm cao 5 (mép dưới giữ nguyên); chỉ đẩy xuống là đè khối kế.
- Lề 5 do NHÓM giữ: con lấp đầy nhóm cha (`position` tương đối bắt đầu từ 0) — con thụt thêm 5 là người xem thấy 10.
- Đổi lề hay khe ⇒ chia lại bề ngang ô, không chỉ dời vị trí; mép phải hàng ô trùng mép phải khối dưới.
- Kéo tay trong Desktop sinh số thập phân ⇒ nắn về số nguyên chia hết cho 5. Khung chép từ khuôn cũng nắn.
- Ngoại lệ có chủ của khuôn (vd vạch gạch chân tab) ghi trong bảng giá trị thiết kế; gặp thì để nguyên.
- Máy canh: `grid5` · `equal-split` · `bg-inset` · `page-margin`.

### 3.2 Khung trắng

- Không visual nào đứng trơ trên nền trang: mỗi visual nằm trên một khung trắng bo góc; nhiều visual nhỏ liên quan nằm chung một
  khung lớn có tên riêng. Thông số khung (bo góc, độ dày và màu viền) lấy từ bảng giá trị thiết kế, không tự chọn.
- Lề đều mọi phía và mọi khung; khung thẳng hàng: cạnh trái cùng cột trùng `x`, cạnh trên cùng hàng trùng `y`. Kiểm: số giá trị
  `x`/`y` phân biệt bằng số cột/hàng thật.

### 3.3 Nút và cột điều hướng

- Mọi dãy nút cách nhau 60 từ mép đầu sang mép đầu: ô thứ *i* ở `i × 60`; nhóm *n* nút dài `(n − 1) × 60 + 50`. Kiểm: hiệu `y`
  liên tiếp của các nút trong nhóm (bỏ mảng nền) đều 60.
- Cột điều hướng có đúng bấy nhiêu nút như số trang thật, theo `pageOrder`, từ ô đầu; bỏ một trang thì dồn các nút còn lại lên.
- Vị trí các nhóm nút cố định của khung (góc trên phải, cặp nút chức năng dưới) lấy từ trang gốc của khuôn — diff với trang gốc,
  không so với con số chép trong tài liệu.

### 3.4 Trang và dải title

- File giao đi chỉ chứa trang thật: trang mẫu của khuôn nối vào model demo và báo lỗi field mãi mãi. Xem mẫu thì mở khuôn gốc.
- Xoá trang ⇒ trong cùng lượt: bỏ nút của trang · trỏ nút còn lại vào trang thật · nút trang đang xem hiện trạng "đang chọn" · xoá
  bookmark của trang và bỏ đăng ký trong `bookmarks.json`. Chép trang ⇒ nhân bản bookmark (không thì nút nhảy về trang gốc).
- Hai vùng tiêu đề: tiêu đề 1 (cạnh logo) = chức năng của report, bỏ mã chủ, tách từ, VIẾT HOA, giống nhau trên mọi trang; tiêu đề 2
  (bên phải) = `displayName` của trang, viết dạng caption. Cỡ chữ của khuôn không đổi; tên dài bị cắt ⇒ BÁO, không hạ cỡ, không nới ô.
- Dải title chép NGUYÊN khối từ trang gốc của khuôn, kể cả `padding` (không nằm trong `position` nên cổng lưới không thấy). Kiểm: làm
  phẳng hai shape title rồi so mọi khoá giữa các trang — khoá DUY NHẤT được khác là `text` của tiêu đề 2. Máy canh: `header-text` ·
  `title-padding`.

### 3.5 Dựng trên khung có sẵn — chỉ thay dữ liệu

| Được đổi | Không được đổi |
|---|---|
| measure/field gắn vào visual | `position` — x · y · width · height |
| `displayName` của projection | `fontSize`, kiểu chữ, màu gõ trong visual |
| chuỗi chữ được yêu cầu đổi | khoảng cách · thứ tự · tầng z · nhóm |
| | thêm `visualStyles` vào theme |

- Phần tử trông "sai" thường là cố ý (card cố ý chạm sang vùng kế, cỡ tiêu đề đặt sẵn). Chữ bị cắt hay thành phần không vừa ⇒ BÁO;
  đổi hình hài là quyết định trình bày, trình trước (`Rule_Keys_62_DesignChangeApproval`).
- Đo trước khi sửa: ghi `position` gốc của mọi visual sắp chạm để đảo được.

### 3.6 Nghiệm thu bằng mắt, chốt số trên bản dựng thật

- Bê một visual từ khuôn là thừa hưởng mọi mặc định của khuôn, kể cả thứ không có dòng nào trong JSON ⇒ mở Desktop ra nhìn, không
  nghiệm thu bằng đọc JSON.
- Số bố cục chốt trên bản dựng thật: yêu cầu dạng "cách ít nhất N" ⇒ dựng cho người yêu cầu xem trước khi ghi N vào chuẩn. Số ghi vào
  bảng giá trị thiết kế kèm trang gốc đã đo.
