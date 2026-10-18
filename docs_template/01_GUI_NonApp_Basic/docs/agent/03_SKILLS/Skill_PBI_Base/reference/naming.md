# Tên và chỗ đặt report Power BI

> Phần của `Skill_PBI_Base`. Áp cho mọi report của repo phòng ban; loại nào được miễn gì thì ghi ngay tại luật đó.
> Máy canh: `pbi_gate.py` — cổng `file-name` · `storage-mode` · `dw-model` (skill `pbi-pbip`).

## 1. Hai tầng tên — thư mục cho máy, file là tên trên Service

| Tầng | Khuôn | Ví dụ |
|---|---|---|
| Thư mục | `<MÃ>_<số><IP\|DR>_<ChứcNăng>[<Bậc>]_<Loại>` | `ABC_02DR_StoreReportAM_Mix` · `ABC_03IP_IncomeStatementOM_Main` |
| File = tên item trên Service | `<MÃ>_<số>_<CHỨC-NĂNG>[-<Bậc>]_<Live\|Scheduled>` | `ABC_02_STORE-REPORT-AM_Live` · `ABC_03_INCOME-STATEMENT-OM_Scheduled` |
| Workspace | `<MÃ> - <tên phòng bằng tiếng bản địa>` | `ABC - Kinh Doanh` |

- Thứ tự cố định: mã chủ → số → chức năng → bậc → cách nạp. Chỉ ASCII, không khoảng trắng, ở cả hai tầng.
- Thư mục: `<ChứcNăng>` PascalCase, `<Bậc>` dính cuối chức năng, mã cách nạp dính số (`02DR`), cuối là `_<Loại>`.
- File: `_` ngăn các phần; chức năng IN HOA, chữ trong nó nối bằng `-`; bậc là chữ cuối của chức năng (`STORE-REPORT-AM`).
  Đổi thư mục → file: tách PascalCase, in hoa, nối `-` (`StoreReport` → `STORE-REPORT`, `B2CSales` → `B2C-SALES`) — máy làm:
  `file_function()` của `pbi_gate.py`.
- Cách nạp — danh sách đóng, một cặp mã ↔ hậu tố:

  | Thư mục | File | Nghĩa |
  |---|---|---|
  | `IP` | `Scheduled` | Import — dữ liệu nằm trong model trên Service, làm mới theo lịch; DW sập vẫn xem được lần làm mới cuối. Bản nối thẳng một model trên Service cũng là `IP` |
  | `DR` | `Live` | DirectQuery — đọc thẳng DW lúc xem |

- `<Bậc>` — danh sách đóng `AM` (quản lý vùng) · `OM` (quản lý vận hành); bỏ trống là report chung. Không có token `All`.
- `<Loại>` — danh sách đóng `Legacy` · `Classic` · `Mix` · `Main`; nghĩa và bộ luật riêng của từng loại: skill `pbi-pbip` §0.
- Loại thiết kế chỉ nằm ở thư mục, không nằm ở tên file ⇒ các biến thể cùng cách nạp trùng tên file và publish đè đúng một
  item. Report quan trọng giữ thêm bản `Scheduled` dự phòng: cùng số, khác hậu tố ⇒ hai item trên web.
- Cấm trong tên: dấu cách · dấu tiếng Việt · en dash · `(%)` · mọi hậu tố phiên bản (`- Copy` · `_BK<ngày>` · `_TEST` · `1`).
  Phiên bản là việc của git.
- Workspace: không chữ "Phòng" trong tên, không token tiếng Anh (mã đã là chữ ASCII). Mô tả workspace viết theo phòng, không theo
  danh sách report; câu đầu: *"Phòng <tên bản địa> (<tên tiếng Anh> · <MÃ>) — <phạm vi việc>. Các báo cáo trong workspace này do
  phòng <tên bản địa> làm chủ."* Tên tiếng Anh của phòng do phòng chốt, không đoán.
- Tên trên Service đổi được sau khi publish và không phải tên thư mục. Tên cũ trên Service ghi ở cột *Tên trên Service* của
  `reports/README.md` để dò ngược.

## 2. Số là định danh của một report trên web, không phải thứ tự

- Mọi biến thể của cùng một report mang cùng số. Gán rồi thì không đánh lại, dù lượt xem đổi; report mới lấy số kế tiếp.
- Số lấy theo lượt xem thật của workspace đó, nhiều nhất là `01`:
  ```
  Workspace -> dòng REPORT (không phải dòng semantic model) -> "..." -> View usage metrics report
            -> gạt "New usage report" = On -> trang "Report list" -> cột Views
  ```
  - Bản usage report cũ (90 ngày) chỉ phủ một report — không dùng để đánh số được.
  - Dòng `0` lượt trùng tên với report thật là bản App sinh thêm — không đếm thành report riêng.
  - Cửa sổ 30 ngày làm report chỉ mở cuối tháng/quý bị đánh giá thấp. Xếp theo `Views` (log server), không theo
    `Report Page Views` (đo từ trình duyệt, bị chặn quảng cáo ăn mất).
  - Hoà lượt xem ⇒ tách bằng số ngày có người mở; vẫn hoà ⇒ phòng chủ chọn và ghi rõ là quy ước.
  - Cần: giấy phép Pro/PPU · vai trò Admin/Member/Contributor (Viewer không đủ) · quyền sửa report đó. `My workspace` không có.

## 3. Đổi tên là đổi sáu chỗ trong file và hai item trên Service

- Trong file: `<Tên>.pbip` · `<Tên>.Report/` · `<Tên>.SemanticModel/` · `<Tên>.pbix` · `displayName` trong hai `.platform` ·
  `artifacts` trong `.pbip` · `byPath` trong `definition.pbir`. Thiếu một chỗ ⇒ Desktop mở ra lỗi.
- Trên Service: đổi tên item TRƯỚC lần publish kế — cả Report lẫn Semantic model (hai item riêng). Desktop khớp theo tên; tên
  khác thì publish đẻ item thứ hai, còn app, lịch làm mới và link vẫn trỏ bản cũ. Lịch làm mới nằm trên Semantic model; publish
  thay thế giữ lịch, thông tin đăng nhập và mã dataset — xoá rồi publish mới thì mất hết.
- Tắt Power BI Desktop trước khi đổi tên thư mục: nó giữ khoá file (`git mv` báo `Permission denied`).

## 4. Một report một thư mục — mọi file của report nằm trong đó

- `reports/<tên thư mục>/` chứa bộ ba `.pbip` (`.pbip` · `.Report/` · `.SemanticModel/`) hoặc file `.pbix`; không để phẳng trong
  `reports/`.
- Thư viện measure sẽ dán vào model · theme · ảnh của report nằm trong thư mục của report đó. Slot `measures/` của repo không
  dùng cho measure của Power BI.
- Dùng chữ "report": trong Power BI, *Dashboard* là object khác (một trang ghim tile, chỉ có trên Service).

| File | Về đâu | Dấu hiệu |
|---|---|---|
| thuộc report — measure sẽ dán vào model, theme, ảnh | `reports/<tên>/` | là bộ phận của một report đang dựng hoặc bảo trì |
| thuộc case — findings, script sửa ĐỀ XUẤT (kể cả `.dax`/`.sql`), số đo một lần | `tasks/<case>/` | là bằng chứng hoặc đề xuất của một vấn đề |

- `.sql` · `.dax` là câu thực thi ⇒ `tasks/<case>/`, không bao giờ ở `data/`, kể cả khi pipeline sinh ra theo kỳ. Phép thử: file
  này được CHẠY hay được GỬI ĐI? Chạy ⇒ `tasks/`; gửi ⇒ `data/<case>/03_output/`. Script sinh ra mang dữ liệu người ⇒ đặt đúng ở
  `tasks/` rồi gitignore riêng file đó; pipeline dựng lại được bất cứ lúc nào.

## 5. Định dạng file

- Dựng mới ⇒ `.pbip`: measure nằm ở `.tmdl` văn bản thuần, sửa và diff được. `.pbix` nén phần model bằng XPress9 — không thư
  viện chuẩn nào giải được, agent không đọc được DAX và git chỉ thấy một khối nhị phân.
- `.SemanticModel/.pbi/cache.abf` là cache nhị phân ⇒ gitignore. Desktop tự sinh `.gitignore` khi lưu — kiểm lại khi có file thật.

## 6. Loại đọc DW bỏ hẳn hệ cũ — xoá trước, dựng sau

Áp cho `Classic` · `Mix` · `Main` (`Legacy` miễn — nó là bản hệ cũ).

- Trình tự: xoá hết bảng đọc hệ cũ → rồi mới kéo bảng DW về. Không đổi nguồn từng bảng rồi để lại bảng thừa.
- "Không visual nào dùng" không phải lý do giữ một bảng hệ cũ: report khai đọc DW mà còn bảng trỏ nguồn cũ thì tên nói dối nội
  dung. Model vẫn nạp được, Desktop không kêu — nên đây là luật, không chờ cổng.
- Xoá một bảng là xoá sáu chỗ: `tables/<Tên>.tmdl` · quan hệ trong `relationships.tmdl` · `LocalDateTable` mồ côi · measure chỉ
  dùng bảng đó · mục trong `cultures/*.tmdl` · tên trong `PBI_QueryOrder` của `model.tmdl`. Quét tham chiếu visual (`Entity`
  trong mọi `visual.json` + filter trang) trước khi xoá.
- Nghiệm thu trước khi mở Desktop: quét `tables/*.tmdl` tìm chuỗi nguồn hệ cũ (khoá `legacy_sources` trong giá trị cụm), khớp
  theo ranh giới từ ⇒ phải rỗng.
