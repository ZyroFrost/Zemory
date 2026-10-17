---
id: Skill_PBI_Pbip
name: pbi-pbip
version: 1
aka: pbip
description: Edit a Power BI .pbip/PBIR report by writing its JSON directly - pages, visuals, bookmarks, buttons, icons, the coordinate grid - without breaking the file; the model diagram standard and the static gate. Use whenever a .pbip report is built or changed, a tab or bookmark is added, an icon or the grid is fixed, or Desktop reports issues. Vietnamese triggers - "sửa report", "sửa pbix", "dựng dashboard", "thêm tab", "gắn bookmark", "đổi icon", "căn lưới", "mở Desktop kiểm".
installs: [scripts/pbi_gate.py, scripts/pbi_diagram.py, scripts/diagram_order.js, scripts/package.json]
from: _Store/03_SKILLS/Skill_PBI_Pbip @v1 #d50e33465998
---

# Sửa `.pbip` mà không làm vỡ file

> File này nói **CÁCH THAO TÁC**. Luật **THIẾT KẾ** (bảng màu · lưới 5 · màu icon · nút phải là
> `image` · slicer tắt header) ở chuẩn thiết kế của vùng (`design_standard` trong giá trị vùng),
> icon ở kho icon của vùng (`icons_dir`). Đụng thiết kế → mở file kia trước.

## 0. BỐN LOẠI FILE PBI — luật khác nhau, đừng áp nhầm

Tên thư mục khai loại (`chuẩn phòng ban §2b` · tên file chốt lại):
```
thư mục   <PHÒNG>_<số><IP|DR>_<ChứcNăng>[<Bậc>]_<Loại>       ABC_02DR_StoreReportAM_Mix · ABC_03IP_IncomeStatementOM_Main
file      <PHÒNG>_<số>_<CHỨC-NĂNG>[-<Bậc>]_<Live|Scheduled>  ABC_02_STORE-REPORT-AM_Live  (= tên trên Service, chỉ ASCII)
IP = Import (kể cả bản nối thẳng model trên Service, như Legacy) -> Scheduled · DR = DirectQuery -> Live
Loại ∈ {Legacy · Classic · Mix · Main}   Bậc ∈ {AM · OM} TUỲ CHỌN - chỉ khi report phân theo chức danh, KHÔNG có 'All'
```
Các biến thể thiết kế (Legacy/Classic/Mix/Main) **cùng cách nạp** chung một tên file ⇒ publish đè đúng một item.
Report quan trọng giữ **hai bản song song khác cách nạp** — bản `Live` và bản `Scheduled` dự phòng (kho sập vẫn xem được
số của lần làm mới gần nhất): cùng số, khác hậu tố ⇒ hai item trên web. Thư mục viết `Bậc` dính cuối tên chức năng
(`StoreReportAM`); file: `_` ngăn các phần, chức năng IN HOA nối chữ bằng `-`, bậc là chữ cuối của chức năng (`STORE-REPORT-AM`, bậc là 1 phần của tên). Cổng `file-name` kiểm hai
khuôn và tên file suy đúng từ thư mục; cổng `storage-mode` kiểm `IP`/`DR` khớp cách nạp thật của model. Script tìm file
theo **đuôi** (`*.Report`), không ghi cứng tên.
> 🔄 Thay bản đầu 05/10 `<PHÒNG>-<số>-<CHỨC_NĂNG>[-<Bậc>]-<Live|Scheduled>` (viết ngược dấu ngăn), khuôn file 04/10 `<PHÒNG>-<số>-<ChứcNăng>[<Bậc>]-<Live|Refresh>` và 28/09 `<PHÒNG>-<số><IP|DR>-<ChứcNăng>[<Bậc>]`
> (27/09: `<PHÒNG>-<số>-<ChứcNăng>[<Bậc>]-<Tên tiếng Việt>`).
**Đọc token đó TRƯỚC khi sửa bất cứ thứ gì** — bốn loại bốn bộ luật, áp nhầm là hỏng đúng thứ đang cần giữ.

🔴 **Mỗi loại có SKILL RIÊNG — file này chỉ nói THAO TÁC chung, không nói luật của từng loại.**
Xác định loại xong thì **mở skill của nó** rồi mới làm:

| | `Legacy` | `Classic` | `Mix` | `Main` |
|---|---|---|---|---|
| Là gì | file GỐC của hệ cũ, copy về | kho DW + thiết kế **CŨ** — bản mô phỏng để ĐO kho | kho DW + header/màu **Main** + bố cục **Legacy** | kho DW + thiết kế **MỚI** — bản chính thức |
| Model đọc | nguồn cũ | DW | DW | DW |
| Được sửa | **KHÔNG** — chỉ đọc và `diff` | model theo chuẩn · UI giữ bản cũ | khung theo chuẩn · vị trí khối theo bản cũ | mọi thứ theo chuẩn |
| Xung đột chuẩn ↔ bản cũ | — | **UI thắng** | **chuẩn thắng** | không có bản cũ |
| Nghiệm thu | `md5` khớp bản gốc | **đối chiếu SỐ với hệ cũ, quét FULL** | bộ cổng tĩnh + mở Desktop nhìn | bộ kiểm chuẩn + mở Desktop nhìn |
| Skill | `pbi-legacy/` | `pbi-classic/` | `pbi-mix/` | `pbi-main/` |

⚠ **Hai ô "xung đột" ngược nhau, và đó là chỗ hay áp nhầm nhất:** `Classic` sinh ra để ĐO kho nên
chữ người đọc thấy phải y bản cũ; `Mix` sinh ra để khoác khung mới nên gặp mâu thuẫn thì theo chuẩn.

⚠ **Một khác biệt hay quên: bảng màu 15 mã và lưới 5 KHÔNG áp cho `Classic`** (nó mô phỏng bố cục cũ —
thấy chỗ xấu thì BÁO, đừng nắn), nhưng **CÓ áp cho `Mix`** (lưới 5 là một trong bốn vế định nghĩa nó).

### `Legacy` — chỉ đọc
Giữ nguyên byte; nó là **mốc duy nhất** chứng minh bản `Classic` không lệch. Cần đọc phần model thì chuyển
`.pbix` → `.pbip` trên **một bản sao**, không đụng bản gốc. Tắt hết phiên Desktop trước khi chuyển (§1).

### `Classic` — HAI TẦNG TÊN, chỗ hay áp nhầm nhất
- 🔴 **Trong model theo CHUẨN MỚI:** tên bảng · cột · measure · thư mục measure — thứ chỉ người dựng nhìn thấy.
  Áp đủ `chuẩn phòng ban §2c`: một bảng `#Measure`, thư mục mang chữ cái theo trang (`A.` dùng chung, 27/09), tiền tố `#/%/~`, bảng rời `Parameter_*`.
- 🔴 **Chữ NGƯỜI ĐỌC THẤY theo BẢN CŨ:** nhãn dòng/cột trên visual, tiêu đề, nhãn slicer — giữ nguyên văn bản cũ,
  kể cả khi trông "không chuẩn". Xung đột giữa hai tầng ⇒ **UI THẮNG**.
  *Ca thật `repo phòng ban` 19/09: ba dòng `MCP = COL+COGs+SEMI` · `PROFIT = SALE - MCP` · `Thực hiện Ebitda` — tên thô
  trong DB là `MCP`/`Thực hiện EBITDA`/`StoreEbitda`. Đổi theo DB là làm bản mô phỏng khác bản cũ ở đúng ba dòng
  người dùng nhìn thấy ⇒ GIỮ nhãn cũ.*
- ⚠ **Bảng màu 15 mã và lưới 5 KHÔNG áp** cho loại này — nó mô phỏng bố cục cũ. Thấy chỗ xấu thì **BÁO**, đừng nắn.
- Quy trình dựng + bộ kiểm tĩnh + ba con số phải báo: skill **`pbi-classic`**.

### `Mix` — kho DW + khung nhận diện `Main` + bố cục `Legacy`
Luật và quy trình: skill **`pbi-mix`**.

### `Main` — áp đủ chuẩn, không ngoại lệ
`§2c` cấu trúc measure · `§2c③b` hai vùng tiêu đề · `§2d` bảng màu, theme, khoảng cách, lưới 5 ·
`§2e` khung có sẵn chỉ thay dữ liệu. Không có "bản cũ" nào để viện dẫn: đây là thiết kế mới.

🔬 **Luật chung cho cả bốn, không loại nào được miễn:** mọi measure nằm trong `#Measure` · bảng rời mang tiền tố
`Parameter_` · **đổi tên bất cứ thứ gì trong model thì cổng nghiệm thu là chạy DAX THẬT trên engine** —
`TMSCHEMA_MEASURES` phải `State = 1` toàn bộ và `EVALUATE ROW(...)` từng measure không lỗi. Đọc file KHÔNG
chứng minh được gì (`§2c⑥`).

## 1. Quy trình — không bỏ bước nào

```
1. TẮT Desktop     đang mở = nó giữ bản cũ, lưu đè lên bản vừa sửa
2. sửa JSON
3. MỞ lại Desktop  <- BƯỚC CUỐI. Mở rồi thì KHÔNG sửa file nữa
4. ĐỌC hộp thoại "Your report has issues that could not be resolved"
5. chụp PrintWindow, NHÌN tận mắt
```

🔴 **Mở lại Desktop là BƯỚC CUỐI — mở rồi mà còn sửa file là mất việc.** Desktop giữ bản cũ trong bộ
nhớ; người dùng bấm Save *hoặc* Refresh là nó ghi đè nguyên lượt sửa của bạn. Cần sửa tiếp ⇒ **tắt lại từ
bước 1**. *(Giá đã trả 2026-09-10: mất trọn một commit — 4 chart phải vá lại.)*
🔴 **Sau MỖI lần người dùng tự Save trong Desktop, phải dò lại MẶC ĐỊNH TRANG**: Desktop ghi *trạng thái
đang xem* thành mặc định ⇒ trang mở ra sai tab, có khi **cả 3 vạch đỏ cùng hiện**. Nắn bằng cách **áp
trạng thái của chính bookmark tab 1** làm mặc định, đừng khai tay. Nó cũng ghi `activePageName` =
trang đang xem ⇒ kiểm `pages/pages.json`.

**Phép kiểm MẶC ĐỊNH TRANG — chạy cho từng trang, không chỉ cho bookmark:**
```
đúng 1 vạch đỏ hiện · đúng 1 nhãn kiểu đang-mở · đúng 1 khối nội dung
mọi lớp phủ (User_Guide · Filter · Glossary · nhóm nút trạng-thái-bật) đều isHidden = true
```
⚠ **Luật "tắt Desktop trước khi sửa" KHÔNG đủ** — nó chặn chiều *agent ghi đè Desktop*, còn chiều
*Desktop ghi đè thiết kế* thì không ai canh. Hai lần trả giá trong một phiên (2026-09-10): panel
`User Guide` đang mở lúc Save ⇒ nhóm của nó thành `isHidden = None` ⇒ **ai mở báo cáo cũng bị panel
che ngay**; và dải tab loạn hẳn — cả 3 vạch đỏ cùng hiện, hàng card ẩn, nội dung lại là của tab 2.

🔴 **"JSON hợp lệ" không chứng minh gì** — khoá bịa và giá trị không tồn tại đều đúng cú pháp.
Hộp thoại issues mới là cổng thật: nó gọi đúng **tên thuộc tính sai** và **đúng file** chứa nó.
⚠ Đừng thay bước 4 bằng đếm cửa sổ — app luôn có thêm một cửa sổ phụ tên `Microsoft Power BI Desktop`.

## 1b. MODEL ĐỌC KHO — DirectQuery, đúng chuỗi gateway, chạy được trên web

```
bảng lấy từ SQL kho      mode: directQuery     (Import chỉ cho bảng KHÔNG có trong kho:
                                                #Measure · Parameter_* DATATABLE · bảng tính)
chuỗi server             Sql.Database("<warehouse_server>", "<warehouse_db>", ...)
                         <- gateway so KHỚP CHỮ chuỗi server; viết khác (tên máy, thiếu cổng) = web báo lỗi nguồn
nguồn hệ cũ              0 chỗ: mọi nguồn khai ở `legacy_sources`
```
- 🔴 *"thực tế không ai làm file Import"* (24/09): Import ngốn RAM máy và phải bấm refresh tay. Cổng
  `dw-model` báo đỏ bảng đọc SQL mà `mode: import`, sai chuỗi server, hay còn chuỗi nguồn hệ cũ.
- 🔴 **DAX phải chạy được trên web**: DirectQuery trên Service chặn kết quả trung gian **> 1.000.000 dòng**.
  `SUMX(SUMMARIZE(Fact_Sale, TransactionID, …))` qua được Desktop nhưng gãy trên web ⇒ viết lại bằng cột
  của kho (`#Discount Amount = SUM(Fact_Sale[NetDiscount])`, TransactionID là duy nhất). Cổng tĩnh không đo
  được ⇒ publish thử rồi mở từng trang.
- ⚠ `.pbi/cache.abf` cũ **che** việc đổi chế độ: dấu hiệu là bảng DQ trả số cũ hơn kho ⇒ đổi tên cache rồi mở lại.
- 🔴 **Không bản sao thử** *(`chuẩn phòng ban §2` "KHÔNG BẢN NHÁP" — thay luật cũ "bản sao đặt ở `data/_sbx_*`")*: sửa
  thẳng file thật, mốc an toàn là git. Công cụ nào buộc phải có bản sao thì hỏi người dùng trước và đặt ở thư mục NGẮN ở gốc ổ ngoài mọi
  repo, xoá khi xong — ⚠ không dùng `%TEMP%`: vượt MAX_PATH, `tar`/Desktop cắt file **lặng lẽ** (bản trích thiếu visual mà không báo lỗi).
- ⚠ **Quét tham chiếu visual TRƯỚC khi xoá một bảng** (`Entity` trong mọi `visual.json` + filter trang) —
  xoá `Fact_PromotionActualItem` chưa quét đã làm hỏng một trang báo cáo.
- ⚠ Desktop nào đang giữ file mà bị bấm Save là **đè mất** mọi sửa trên đĩa — kiểm tiến trình trước khi sửa.

🔴 **Cột tính (calculated column) trên bảng DirectQuery chỉ nhận hàm dịch được sang SQL**:
`CONTAINSROW` (cũng là `x IN <biến bảng>`), `ISERROR`, `FIND` đều bị chặn — cột vào trạng thái lỗi (`State = 5`),
cột phụ thuộc nó `State = 7`, visual trống mà cổng tĩnh không thấy. `IN {"a","b"}` với danh sách chữ cố định thì
được. **Logic phân tích chuỗi đưa vào câu SQL của partition** (bọc câu cũ thành bảng con + `CROSS APPLY` + `CASE`),
cột trong model đổi thành cột dữ liệu `sourceColumn`, giữ `lineageTag`. Ca thật: `Dim_ProfitLossLine[LineLevel]`
của `ABC_02` Classic/Mix. Kiểm: `SELECT [ExplicitName],[State],[ErrorMessage] FROM $SYSTEM.TMSCHEMA_COLUMNS WHERE [State] <> 1`.

## 1c. 🔴 CHUẨN SƠ ĐỒ MODEL — xếp như đi dây server

Áp cho **mọi report, mọi bậc** (Legacy chuyển `.pbip` · Classic · Mix · Main). Mẫu: `ABC_02DR_StoreReportAM_Mix`.
**Công cụ:** `python scripts/pbi_diagram.py <thư mục report>` (thêm `--dry` để xem trước) — đọc model, tự phân loại,
tự xếp theo đúng các luật dưới, ghi `diagramLayout.json` (một tab "All tables"). Chọn tầng riêng của từng report ở
`config/pbi-diagram.json`. Cổng `diagram` của `pbi_gate.py` canh.

> *"line nối sắp xếp dạng giống dây điện, bó lại xong rồi tẻ ra ở chỗ gần, bó nhưng không đè chồng mà sát nhau, và
> không được bị bảng nào đè lên hết, nối dạng chuẩn người ta nối dây đi server infra"*

**Cách Power BI vẽ dây (đo 27/09):** dây ra từ **cạnh** của thẻ quay về phía thẻ kia, chạy ở độ cao đó, rồi rẽ vào thẻ
đích. Thẻ nào đứng trên đường đi là dây chui dưới thẻ. File chỉ lưu vị trí thẻ, **không lưu dây** ⇒ mọi luật về dây
đạt được bằng cách xếp thẻ.

```
                      cột 1 ............................. cột 9   cột 10
tầng trên   fact, CANH ĐÁY  (thẻ dài vươn lên; bảng lẻ lấp khoảng trống phía trên thẻ ngắn)    #Measure
            ─────────────── máng dây 180 px ───────────────                                     (một cột riêng,
tầng giữa   dim, CANH GIỮA  (dim ngắn ở giữa, dim dài ra hai rìa)                               dài hết sơ đồ)
            fact nhỏ nhét dưới dim nhỏ không có dây đi xuống
            ─────────────── máng dây 180 px ───────────────
tầng dưới   fact, CANH ĐỈNH (thẻ dài kéo xuống; bảng tra cứu ngay dưới fact của nó;
            bảng lẻ lấp khoảng trống dưới thẻ ngắn)
```

1. **Thẻ dài đủ hiện hết cột**: cao = 80 + 26 × (số cột + số measure), làm tròn lên lưới 20 — đáy/đỉnh thẳng tuyệt đối
   (làm tròn vị trí mà không làm tròn chiều cao là mép so le tới 19 px). Rộng 234.
2. **Tối đa 13 cột** cho bảng có nối *(9 → 13 ngày 29/09, người dùng chọn nới trần thay vì cắt bảng: model StoreReport có 13 fact bán hàng — agg giờ, tiền điện, hai bảng giá vốn dùng chung với agg tháng)* *("dài quá không zoom xem hết màn được"; 8 → 9 ngày 28/09 khi bảng agg L4L thành fact bán
   hàng thứ 9)*. `#Measure` luôn dài nhất ⇒ **cột cuối
   riêng, dài hết sơ đồ** — đúng cấu trúc bản gốc của người dùng.
3. **Ba tầng, canh theo máng:** fact trên canh đáy, dim canh giữa, fact dưới canh đỉnh ⇒ hai máng dây luôn trống dù thẻ
   cao thấp khác nhau. Chỉ có HAI hàng fact (ngay trên/dưới dim): hàng fact thứ ba buộc dây xuyên qua hàng giữa.
3b. **Máng trên 320 px** (tính tới dim CAO NHẤT), máng dưới 180 px. Dim giữ **chiều cao riêng**, canh giữa.
   ⚠ *Đã thử và bỏ (27/09):* kéo mọi dim giữa cao bằng nhau ⇒ đoạn dây rẽ ngang dồn về một độ cao, chồng lên nhau
   ("dây vẫn loạn"); máng trên 180 px ⇒ dây của 8 dim bị ép. Bản "Thử 3 tầng" (máng 320) là bản người dùng khen.
4. **Trong một tầng:** thứ tự ít dây cắt nhau nhất (ELK Layered nếu có `scripts/node_modules/elkjs` — `cd scripts && npm
   install`; không có thì barycenter), rồi **thẻ cao nhất ra hai rìa**, thẻ ngắn vào giữa — thẻ dài ở rìa không chắn dây
   của ai.
5. **Quá 8 fact cho một hàng:** fact chỉ nối dim trung tâm + một dim nhỏ không có dây đi xuống được **nhét dưới dim nhỏ
   đó**, các fact nhét đặt so le để dây ngang sang dim trung tâm không cắt nhau (Mix: `Fact_PromotionTarget`,
   `Fact_PromotionMetricTarget`).
6. **Bảng tra cứu** (một-phía, chỉ một fact dùng): ngay dưới fact ở tầng dưới / ngay trên fact ở tầng trên, trong 13 cột.
7. **Bảng lẻ** (không quan hệ — `Parameter_*`): lấp khoảng trống TRONG lưới (trên thẻ ngắn tầng trên, dưới thẻ ngắn tầng
   dưới), không đứng xa khu chính. Khu nối chính nằm trên cùng, sát gốc.
8. ⚠ **Model view vẽ dây CHẬM**: model DirectQuery nạp xong ~2 phút mới có dây. Đừng kết luận "mất quan hệ" sớm — kiểm
   DMV `TMSCHEMA_RELATIONSHIPS`.
9. ⚠ **Quan hệ nhiều-nhiều viết tay:** không repo nào có bản Desktop ghi để chép khuôn ⇒ đi bảng cầu bằng `TREATAS` trong
   measure (`pbi-mix` §5p), kho vẫn giữ bảng cầu nguyên vẹn.
10. **Đã thử và bỏ (27/09):** mọi dim một hàng + mọi fact một hàng (dây chui dưới dim) · cột sống dim bên trái (dây gọn
    nhưng quá rộng) · `pbi-model-layout` (fact một cột dọc — quá cao) · ELK dọc (quá cao) · ELK nguyên bản (dây chéo, thẻ
    vuông cùng cỡ). Thuật toán "Arrange Tables" của SSMS không công bố mã.

- Desktop phải đóng khi chạy công cụ; mở lại rồi chờ dây. File là CRLF, thụt 2 dấu cách.
- Cổng `diagram`: thiếu node · chồng nhau · lệch lưới 20 px · quá 13 cột · `#Measure` không đứng riêng cột cuối hoặc không
  dài hết sơ đồ. Bản Mix báo đỏ; bậc khác cảnh báo cho tới khi được nắn.

## 2. Bố cục & toạ độ

```
<Tên>.Report/definition/
  report.json               filterConfig cấp report · resourcePackages (khai TỪNG ảnh)
  pages/pages.json          pageOrder · activePageName
  pages/<pageId>/page.json  displayName · width · height
  pages/<pageId>/visuals/<visualName>/visual.json
  bookmarks/<id>.bookmark.json + bookmarks.json
<Tên>.SemanticModel/definition/tables/*.tmdl
```

🔴 `position` là toạ độ **TƯƠNG ĐỐI so với nhóm cha** — muốn biết chỗ thật phải cộng dồn cả chuỗi cha.
**Nhóm** = một `visual.json` có `visualGroup: {displayName, groupMode}`; `groupMode` chỉ nhận
`ScaleMode` hoặc `ScrollMode`.

## 3. Bookmark — ảnh chụp TOÀN TRANG, và là một HỆ

```
explorationState.sections.<pageId>.visualContainers       TỪNG visual LÁ
explorationState.sections.<pageId>.visualContainerGroups  TỪNG nhóm, cây cha-con qua "children"
options.targetVisualNames   [] = cả trang · [id,...] = KHOANH VÙNG
options.suppressData        true = chỉ hiển thị, không dùng bộ lọc
```

🔴 Visual **không có tên** trong bookmark thì **giữ nguyên trạng thái đang có** — gốc của "các tab dính nhau".
🔴 Khai `isHidden` cho **nhóm** không thay được khai từng **visual lá**; phải khai cả hai.
🔴 `activeSection` trỏ sang trang khác thì bookmark **đổi trang** — gốc của "bấm tab bị nhảy trang".
🔴 **Sửa một bookmark là phải dò lại TOÀN BỘ rồi đồng bộ.** Ảnh chụp `*_Main` của khung mẫu là trạng
thái CŨ — đổi bố cục xong phải sinh lại, không thì nút Refresh dựng lại bố cục đã chết.

**Cây chuẩn** (khuôn khuôn gốc của vùng (`template_report`) — 5 trang × 6 trạng thái):

| Bookmark | Panel | Nội dung / tab |
|---|---|---|
| `<Page>_Main` (= nút Refresh) | **đóng hết** | **GIỮ NGUYÊN tab đang xem** · chỉ đưa bộ lọc về mặc định · **có** data |
| `<Page>_Open<Panel>` | chỉ panel đó mở | **không đụng** · `suppressData: true` |
| `<Page>_CloseHidden` | đóng hết | **không đụng** |
| `<Page>_ClearFilter` | giữ Filter mở | khoanh đúng slicer, **có** data |
| `<Page>_Tab<N>` | *(nằm trong ảnh chụp)* | **CHỤP CẢ TRANG** — `targetVisualNames: []` |

**Khoanh vùng để trạng thái CỘNG chứ không NHÂN**: 3 tab × 5 panel mà không khoanh vùng thì thành
16 bookmark; khoanh vùng thì 6 nền + 3 tab = 9.

🔴 **NÚT `Refresh` KHÔNG ĐƯỢC ĐỔI TAB/TRANG ĐANG XEM** *(sửa chính dòng
`<Page>_Main` ở bảng trên, bản cũ ghi "về mặc định")*. Chuẩn UI phổ biến: Refresh nạp lại dữ liệu,
**không** dời chỗ người dùng đang đứng. ⇒ Bookmark của Refresh phải **khoanh vùng BỎ** dải tab · khối
nội dung · hàng card; chỉ ôm slicer và các lớp phủ. *(Đo sau khi vá: scope 81 visual, loại 41.)*
⚠ **Vì sao khuôn gốc không sai mà vẫn dẫn đi sai:** Khuôn gốc trỏ Refresh vào
`<Page>_Main` đúng ở cả 5/5 trang — **nhưng khuôn KHÔNG có tab**, nên "reset cả trang" ở đó chẳng có
tab nào để nhảy. Thêm tab vào trong trang là sinh tác dụng phụ mà khuôn chưa từng phải tính.
⚠ **`Refresh` và `Clear All Filters` nay CÙNG một hành động, cố ý** — panel lọc là lớp phủ nên bấm
`Clear` thì panel *bắt buộc* đang mở, bấm `Refresh` thì *bắt buộc* đang đóng. Một hành động hai lối
vào là bình thường, không phải trùng lặp cần dẹp.
⚠ **Nút bookmark KHÔNG nạp lại được dữ liệu** — refresh thật là lịch trên Service hoặc nút Refresh
trên ribbon Desktop. Đừng viết User Guide hứa quá.

🔴 **BOOKMARK TAB LÀ ẢNH CHỤP TOÀN TRANG (`targetVisualNames: []`), KHÔNG khoanh vùng** — kèm
`suppressData: true` để không đụng bộ lọc. Đây là **vế NGƯỢC** với "khoanh vùng cho trạng thái CỘNG"
ngay trên: khoanh vùng dùng cho *panel*, còn *tab* thì phải chụp cả trang. *Ca thật 2026-09-09: 3
bookmark tab khoanh 37 visual ⇒ panel `Glossary` không nằm trong ảnh chụp nên mở ở tab nào là **theo
sang mọi tab**, che kín vùng nội dung.*

🔴 **KHAI ĐỦ CẢ TẦNG NHÓM LỒNG GIỮA, không chỉ nhóm cha + visual lá.** Với **mọi** nhóm bị ẩn, **MỌI
hậu duệ** — lá **và** nhóm con — phải có mặt trong `visualContainerGroups` **và** trong
`targetVisualNames`. *Ca thật: hàng card của `MCP Report` gồm 12 lá **+ 4 nhóm con**; bookmark khai đủ
nhóm cha và đủ 12/12 lá nhưng bỏ 4 nhóm con ⇒ chúng giữ trạng thái đang hiện và **kéo cả cụm card hiện
theo** ở tab 2 và 3.*

🔴 **NHÂN BẢN BOOKMARK SANG TRANG KHÁC PHẢI TRỎ LẠI KHỐI ĐIỀU HƯỚNG — cả icon LẪN mảng nền.**
```
trong bookmark của trang X:  BT_Page_X_On hiện · mọi BT_Page_*_On khác ẨN
                             mọi BT_Page_*_Off khác HIỆN
                             khai ĐỦ mọi shape mang nền · hiện đúng MỘT · cùng ý với icon _On
```
*Ca thật: **10/21** bookmark của `ABC_IncomeStatement` khai sáng icon của trang 1 trong khi chúng
thuộc hai trang khác ⇒ mở Glossary/Guide/Filter ở đó là **vạch sáng nhảy về trang 1**. Ba bookmark
`_Main` thì đúng, nên mở file lên nhìn không thấy sai.*
⚠ **Vế MẢNG NỀN là chỗ bảng kiểm cũ hụt** — vá xong phần icon mà người dùng vẫn báo lỗi (*"có table check
rồi mà vẫn lỗi"*): trang 1·2 mỗi trang có **hai** shape nền (`WhiteBG_Page` + `WhiteBackground` sót
lại), **10/22** bookmark khai `1/2` và khai đúng cái SAI ⇒ vệt sáng **tụt xuống ô icon kế tiếp**, có
lúc **hai ô cùng sáng**. Dứt điểm bằng cách **xoá shape thừa** cho mỗi trang còn đúng một.

🔴 **CỘT NÚT ĐIỀU HƯỚNG: SỐ NÚT = SỐ TRANG THẬT, XẾP TỪ Ô ĐẦU, THỨ TỰ = `pageOrder`.**
```
n trang thật  ->  n cặp nút BT_Page_<X>_On/_Off ; cặp thứ i (theo pageOrder) ở  y = (i-1)*60
                  vạch sáng WhiteBG_Page cùng ý với nút của trang ĐANG XEM
                  nhóm Page_Button cao (n-1)*60 + 50        (1 trang => 1 nút ở y=0, nhóm cao 50)
```
Bỏ một trang (hay tách thin report một trang) ⇒ **bỏ cặp nút của trang đó, dồn các cặp còn lại lên ô
trên**, gỡ visual đã bỏ khỏi **MỌI** bookmark của trang, và co nhóm theo công thức. Ô trống phía trên
nút là **lỗi bố cục**, không được viện "giữ nguyên toạ độ": toạ độ nút là **địa chỉ theo thứ tự trang**,
trang đổi thì địa chỉ đổi theo — cùng doctrine với số thư mục measure (`chuẩn phòng ban §2c②`).
*Ca thật 2026-09-17: `ABC_IncomeStatement_AM` tách một trang, bỏ đúng 4 nút của hai trang kia nhưng để
nút MCP nguyên ô 3 (`y=120`) với hai ô trống bên trên — bị bác: "chỉ có 1 trang thì phải đẩy nút
bấm lên đầu chứ".*
**Máy kiểm:** lấy `y` các nút `_Off` trong `Page_Button`, sắp tăng, phải là `0 · 60 · 120 …` liên tục
và **số nút = số trang trong `pages.json`**; `WhiteBG_Page` cùng `y` với nút `_On` đang hiện.

🔴 **DẢI TAB CÓ HAI SHAPE NHÃN MỖI TAB — đổi tab phải lật CẢ HAI, cộng vạch đỏ.** Phân biệt bằng
`bold`: bản chỉ có `bold=true` là kiểu **đang mở**, bản có cả `false` là kiểu **không mở**.
**Phép kiểm:** mỗi bookmark tab có đúng **một** nhãn kiểu đang-mở và đúng **một** vạch đỏ hiện, hai
cái cùng `x`. *Ca thật: bỏ khai 3/12 thành phần của dải ⇒ chuyển sang tab 2 mà tab 1 **vẫn mang nhãn
đậm kiểu đang-mở**, hai tab cùng trông như đang bật.*

## 4. Bẫy im lặng — triệu chứng → nguyên nhân

| Thấy gì | Vì sao | Làm đúng |
|---|---|---|
| Desktop đòi cài custom visual, ô rỗng | `visualType` không tồn tại (`stackedColumnChart`) | cột chồng là `columnChart`; tên lạ thì đọc `Report/Layout` của một `.pbix` chạy thật, đừng đoán |
| File không mở, issues gọi tên khoá | khoá bịa (`wordWrap` trong `title`) | chỉ dùng khoá đã thấy chạy trong chính file |
| File không mở, lỗi TMDL | neo sửa vào MỘT dòng ⇒ measure trước mất thuộc tính, measure mới lãnh hai `formatString`/`lineageTag` | neo **cả khối** measure + thuộc tính của nó; `lineageTag` duy nhất toàn file |
| Ảnh không hiện | chép PNG mà quên khai | thêm `{name, path, type:"Image"}` vào `resourcePackages` |
| Một dãy cột rỗng | `Columns.showAll: true` hiện cả kỳ không có số | tắt ở **trục cột**; giữ ở **trục dòng** để dòng nào cũng hiện dù bằng 0 |
| Mọi điểm dồn một chỗ, nhãn `0.2M` | cột kỳ `int64` bị hiểu là **thang số liên tục** | `objects.categoryAxis[0].properties.axisType = 'Categorical'` |
| Dòng `Total` vô nghĩa | matrix tự cộng các dòng khác bản chất | tắt `subTotals` · `rowTotal` · `columnTotal` |
| Nhãn trục lặp lại tiêu đề khối | tắt `valueAxis.show` **không** tắt tên trục | thêm `showAxisTitle = false` |
| Visual bay ra ngoài khung | dùng toạ độ tương đối của trang khác | tính **tuyệt đối** rồi trừ offset nhóm cha |
| Chữ title lệch giữa các trang mà `position` đo ra **giống nhau** | `padding` của shape khác nhau — nó không nằm trong `position` nên **cổng lưới 5 không soi** | chép NGUYÊN khối title của trang gốc; số + phép diff: chuẩn thiết kế của vùng §Dải title |
| Trục thời gian hiện `202601` | lấy **cột khoá** (`YearMonth`) làm nhãn | cột nhãn `PeriodLabel` `MM/YYYY` + **`sortByColumn: YearMonth`**; quét CẢ report, không chỉ trang đang mở — chuẩn thiết kế của vùng §Nhãn trục thời gian |
| Vừa thêm cột vào dim, chart **rỗng** + banner *"incomplete or no data"* | model **Import**: cột mới chưa có trong bộ nhớ đệm | bấm Refresh một lần. Đây là bước giữa ĐÚNG, đừng chẩn thành lỗi rồi sửa ngược |

## 5. Hai panel bật/tắt — ai chứa gì

```
Glossary   nhãn "Thuật ngữ"  -> viết tắt · định nghĩa chỉ tiêu · CÔNG THỨC tính
User Guide nhãn "Hướng dẫn"  -> trang để làm gì · đọc khối nào ra sao · cảnh báo khi đọc số
```

🔴 Nguồn thuật ngữ là kho thuật ngữ của vùng (`glossary_dir`). Panel chỉ **trích ra** từ mà trang đó dùng, **không** thành
bảng thứ hai — định nghĩa metric có nhà riêng ở `03_STRUCTURE §7` (HP điều 13). `.md` là gốc,
`.html`/`.pdf` cạnh nó là bản render.
🔴 **NGÔN NGỮ NHÃN: THEO BỘ NÚT ĐÃ CÓ TRONG CHÍNH FILE ĐÓ, không theo mặc định.**
*(thay câu cũ "nhãn người đọc thấy tiếng Việt")* `ABC_IncomeStatement` có
14 nút tooltip tiếng Anh, chèn một nhãn tiếng Việt vào là lệch ngay cạnh nhau. **Nút MỞ panel dùng
DANH TỪ TRƠN** (`Glossary` · `Filters Panel` · `User Guide`), chỉ nút đóng/xoá mới dùng động từ
(`Close Filter` · `Clear All Filters`). Object luôn tiếng Anh (`BT_Glossary_On/_Off`).

**User Guide — bộ callout CHUẨN, chép nguyên sang mọi PBI**:
```
nút Filter      Click this button to open the hidden filter panel
nút Refresh     Click this button to reset to default view
nút Glossary    Click this button to open the Glossary and see how each figure is calculated
nút User Guide  Click this button to open the User Guide and learn how to navigate and use the
                dashboard effectively!
tên trang       This is the page name. When you use the navigation panel to move between pages,
                the name of the selected page will appear here.
biểu đồ         You can click on any chart to filter the data
dòng đóng       Click anywhere on the blank area to close
Navigation Panel  Use the panel on the left to navigate between key sections of the dashboard.
                  Click an icon to explore each topic in detail.
Tab Panel         Switch the view inside this page - you do not leave the page.
```
### Bảng BẬT/TẮT của bộ nút — khai ĐỦ cho MỌI bookmark của trang

🔴 **Nút hai trạng thái = 1 nút MỞ + 1 NHÓM chứa (nút BẬT + mảng sáng).** Khai thiếu **nhóm bọc** thì
bấm vào nút **biến mất hẳn** thay vì đổi sang trạng thái bật.

| Thành phần | `_Main` | `_OpenGlossary` | `_OpenUserGuide` | `_OpenFilter` | `_ClearFilter` | `_CloseHidden` | `_Tab<N>` |
|---|---|---|---|---|---|---|---|
| `BT_<Panel>_Off` (nút MỞ) | hiện | **ẩn** | hiện | hiện | hiện | hiện | hiện |
| `BT_<Panel>_On` (NHÓM bọc) | ẩn | **hiện** | ẩn | ẩn | ẩn | ẩn | ẩn |
| lá trong nhóm (`BT_Open<Panel>_On` + mảng sáng) | ẩn | **hiện** | ẩn | ẩn | ẩn | ẩn | ẩn |
| panel tương ứng | ẩn | **hiện** | ẩn | ẩn | ẩn | ẩn | ẩn |
| nhóm `Filter` | ẩn | ẩn | ẩn | **hiện** | **hiện** | ẩn | ẩn |
| nút một trạng thái (`BT_OpenGuide` · `BT_OpenFilter`) | hiện ở MỌI bookmark |

**Phép kiểm, chạy được bằng script:** với mỗi bookmark của trang, `nút MỞ` và `NHÓM trạng thái BẬT`
phải **ngược nhau**, và `NHÓM BẬT` phải **bằng** trạng thái của panel tương ứng. **Không ô nào được
để KHÔNG KHAI.**
*Ca đã trả giá 2026-09-10:* nhóm `BT_Glossary_On` không khai ở **5/5** bookmark panel; mặc định trang
để nhóm `ẩn` nên hai lá bên trong dù khai `hiện` vẫn không hiện ⇒ bấm `Glossary` thì **mất luôn nút**.
⚠ **Nút nằm TRONG panel thì không phải khai riêng** — `BT_CloseFilter`/`BT_ClearFilter` đã theo nhóm
panel; khai `hiện` cho chúng khi nhóm cha ẩn là vô hại.

🔴 **Tiêu đề khối (`Navigation Panel` · `Tab Panel`) và dòng kêu-gọi cuối để `bold` + `#c51e24`**,
thân để thường; mỗi đoạn cách nhau một đoạn rỗng.
⚠ **Callout `Tab Panel` CHỈ đặt ở trang có dải tab thật.** Trang không tab mà vẫn để là vỏ rỗng.
⚠ **KHÔNG liệt kê tên trang trong Navigation Panel.** Khung mẫu ship sẵn 5 tên của bản demo
(`Sales Overview` · `Payment & Channel` · `Customer Analysis` · `Product Performance` ·
`Regional Insights`) — **không trang nào có thật**, và danh sách cứng thì đổi trang là sai ngay.

## 6. Đoạn mã dùng lại

[`reference/snippets.md`](reference/snippets.md) — toạ độ tuyệt đối · duyệt cây nhóm · dựng bookmark
đầy đủ · khuôn nút bấm được · tắt/mở Desktop · chụp `PrintWindow` · đọc `.pbix` cũ bằng `zipfile`.
