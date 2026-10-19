# Model Power BI — cấu trúc measure và bảng

> Phần của `Skill_PBI_Base`. Áp cho mọi loại report đọc DW (`Classic` · `White` · `Red`); `Legacy` chỉ đọc. Khuôn gốc của cụm:
> khoá `template_report` trong giá trị cụm. Máy canh: `pbi_gate.py` — cổng `measure-folder` · `measure-dup` · `dw-only-tables` ·
> `field-ref` (skill `pbi-pbip`).

## 1. Một bảng chứa toàn bộ measure — `#Measure`

- Không rải measure sang bảng dữ liệu. `#Measure` không mang dữ liệu: chỉ một cột `.Dummy` để bảng tồn tại; tiền tố `#` đẩy nó
  lên đầu danh sách bảng.
- Bảng chép từ khuôn mang tên khác (vd lỗi gõ `#Mesure`) ⇒ đổi thành `#Measure` trong cùng lượt — đây là tên mình đặt, không
  phải tên của bên ngoài.
- Đổi tên một bảng là sửa đủ bốn chỗ: `tables/<tên>.tmdl` (dòng `table` và `partition`) · `model.tmdl` (`ref table`) ·
  `cultures/*.tmdl` (mọi khoá `ConceptualEntity` — chỗ hay sót nhất) · `<Tên>.Report/definition` (mọi `Entity` · `queryRef` ·
  `metadata`). TMDL viết tên có hoặc không có nháy (`table '#Measure'` = `table #Measure`) ⇒ tìm-thay phải khớp cả hai dạng,
  đếm lại sau khi đổi.

## 2. Thư mục hiển thị mang chữ cái, chữ khớp thứ tự trang

```
#Measure
├── .Dummy
├── A. Calculation        measure dùng chung — nhiều trang gọi
├── B. <tên trang 1>      measure riêng của trang 1
├── C. <tên trang 2>
└── <chữ thứ N+1>. <tên trang N>
```

- `A` là dùng chung; từ `B` là riêng một trang, theo đúng thứ tự trang đang hiện, tên thư mục trùng tên trang. Chữ cái chứ
  không phải số: Power BI xếp tên thư mục theo chữ, số vỡ thứ tự từ trang thứ 10.
- Thư mục của mọi trang phải có, kể cả trang chưa có measure riêng. Power BI không hiện thư mục rỗng ⇒ đặt một measure ẩn giữ chỗ:
  ```
  /// Keeps the folder of page N.
  measure '~Placeholder <PageKey>' = BLANK()
      isHidden
      displayFolder: <Letter>. <Page name>
  ```
- Không dồn chữ cho liền: chữ là địa chỉ của trang. Trang bị xoá ⇒ measure của nó về `A. Calculation`. Đổi thứ tự trang ⇒ đặt
  lại chữ cái trong cùng lượt.
- Máy làm: `mix_builder.py --measure-folders` của repo; máy canh: cổng `measure-folder`.

## 3. Tên measure

| Tiền tố | Trả về | Ví dụ |
|---|---|---|
| `#` | con số để tính | `#Total Revenue` · `#AVG Revenue` · `#Units Sold` |
| `%` | phần trăm để hiển thị | `%MoM Revenue Change` · `%MoM Revenue with symbol` |
| `~` | thứ điều khiển hiển thị, không đọc như số | `~Red` · `~Sparkline Revenue Area` · `~NoDataCheck` · `~URL_Logo` |

- Ranh giới `%` và `~`: đem giá trị đó khoe cho người đọc được không? Không được (mã màu, SVG, URL, cờ rỗng) ⇒ `~`. Tiền tố nói
  kiểu trả về, không nói nghiệp vụ; ca lai giữ cả họ tên đứng cạnh nhau và ghi là ngoại lệ có chủ ý.
- Tiền tố dính liền tên, không dấu cách sau nó (`% Var LYTD` sai: dấu cách xếp trước mọi chữ, kéo nó ra khỏi họ).
- Khuôn: `<tiền tố><Chỉ số> [<biến thể>]` · `<tiền tố>MoM <Chỉ số> <biến thể>`. Từ cách nhau bằng dấu cách, viết hoa chữ đầu mỗi
  từ nghiệp vụ; viết tắt giữ HOA (`AVG` · `MoM` · `URL` và viết tắt nghiệp vụ trong khoá `acronyms` của giá trị cụm). Biến thể
  đứng sau chỉ số và dùng lại cụm có sẵn (`Change` · `with symbol` · `Arrow Color` · `with full row` · `of <X>`).
- Chỉ nhóm `~` được mang hậu tố kỹ thuật bằng `_` (`~NoDataCheck_Online`); màu là một từ (`~Red`).
- Tên measure bằng tiếng Anh. Chữ người đọc thấy đặt bằng `displayName` ở projection của visual, tên measure giữ tiếng Anh.
- Cấm: số đuôi vô nghĩa (`… 1`) · `_` giữa từ nghiệp vụ · sai chính tả · tên tiếng Việt. Số đuôi thường mang nghĩa — đọc công
  thức trước khi đổi (`#AVG TC1` tính ở mức cửa hàng ⇒ `#AVG TC per Store`).
- Máy kiểm: tên khớp `^[#%~]\S`; sau tiền tố chỉ còn chữ, số và dấu cách; `_` chỉ hợp lệ ở nhóm `~`; tên chỉ ASCII.

## 4. Bảng report được tự thêm — và chỉ những bảng này

| Tiền tố | Là gì |
|---|---|
| `#Measure` | bảng measure (mục 1) |
| `Parameter_<Việc>` | bảng rời nuôi slicer hoặc trục: không quan hệ với `Dim_*`/`Fact_*`, measure đọc lựa chọn bằng `SELECTEDVALUE` (*disconnected table* — gồm what-if và field parameter) |
| `@<Tên>` | bảng tra metadata của model sinh từ `INFO.*` — chỉ thêm khi thật sự dùng |

- `Parameter_*` không chứa measure và không nằm trong `#Measure`. Không đặt tên theo visual đang gắn (`Slicer_*`): cùng một bảng có
  thể nuôi slicer, trục ma trận hay bộ lọc. Bỏ chúng là đổi thiết kế, không phải dọn dẹp.
- Bảng dựng bằng `DATATABLE`: tên cột thật nằm trong chuỗi `DATATABLE`. Đổi tên cột là sửa cả ba: chuỗi `DATATABLE` · dòng
  `column` · `sourceColumn`. Thiếu một chỗ thì engine giữ tên cũ và measure trỏ cột đó lỗi mà cổng tĩnh không thấy.

## 5. Model giữ đúng cấu trúc Kimball của DW

Chỉ hai thứ là sai cấu trúc:
1. **Tự tạo bảng.** Mọi `Dim_*` · `Fact_*` · `Bridge_*` · `Agg_*` trong model là chính bảng `dbo.<cùng tên>` của DW. Sai: bảng tính
   DAX mang các tiền tố đó · bảng không có trên DW · bảng tên ngoài các nhóm được phép · kỳ nằm trong tên bảng (kỳ là CỘT).
2. **Nối sai quan hệ.** Mỗi quan hệ giữa hai bảng DW trùng một khoá ngoại của DW (khoá số `…Key`). Nối bằng mã tự nhiên hay fact
   với fact là đường không có trong nguồn sự thật.

- Không phải lỗi: lọc cột · lọc dòng · câu SELECT lấy dữ liệu (kể cả JOIN/GROUP BY) để dùng trong `#Measure`/`Parameter_*` · đổi
  kiểu hiển thị. Measure là nơi tính số đo dẫn xuất.
- Thiếu bảng hoặc cột trên DW ⇒ nhắn phiên tổng quản nêu nhu cầu; tổng quản quyết chỗ và thêm theo Kimball.
- Máy canh: cổng `dw-only-tables` (vế 1 lớp tĩnh, vế 2 lớp DW đọc `sys.foreign_key_columns`), mọi loại trừ `Legacy`. Lỗi ⇒ cổng
  đỏ, không giao, không commit; không chặn mở Desktop.

## 6. `Classic`: hai tầng tên

Chỉ áp cho thư mục `…_Classic` — bản dựng lại thiết kế cũ trên DW. `Red`/`White` theo chuẩn; `Legacy` không đụng.

- Theo chuẩn mới: tên bảng · cột · measure · thư mục measure — thứ chỉ người dựng model thấy.
- Theo bản cũ: nhãn dòng/cột trên visual · tiêu đề · nhãn slicer — thứ người đọc report thấy.
- Xung đột ⇒ chữ người đọc thấy thắng: đổi nhãn cho "đúng chuẩn" là làm bản dựng lại khác bản cũ đúng chỗ người dùng nhìn.

## 7. Đổi tên trong model — cổng là engine, không phải file

Sau mọi lượt đổi tên bảng/cột/measure: mở Desktop rồi hỏi engine — `$SYSTEM.TMSCHEMA_MEASURES` phải `State = 1` toàn bộ và chạy
thử TỪNG measure bằng `EVALUATE ROW("v", [<measure>])`. Đọc file không chứng minh được gì. `.pbix` không kiểm được phần này (model
nén XPress9) — thêm một lý do dựng mới bằng `.pbip`.
