---
id: Skill_PBI_Mix
name: pbi-mix
version: 5
description: Build the MIX copy of a Power BI report - warehouse model, the Main header and colours, the Legacy layout and navigation, the 5 px grid over the whole file. Use whenever an old dashboard keeps the reading habits of its users but gets the new identity frame. Not for a number-matching copy (pbi-classic) nor a new design (pbi-main). Vietnamese triggers - "bản mix", "giữ bố cục cũ nhưng header mới", "trộn hai bản", "header neo khi cuộn".
installs: [scripts/mix_palette.py, scripts/card_icons.py, scripts/matrix_fit.py]
---

# Bản `Mix` — bố cục CŨ, khung nhận diện MỚI, chạy trên kho

> 🔴 **`Mix` = giá trị thứ tư của token LOẠI THIẾT KẾ (`chuẩn phòng ban §2b`).**
> Bốn vế: **kho DW** + **header/màu theo `Main`** + **bố cục & điều hướng theo `Legacy`** + **lưới 5
> toàn file**. Ba loại kia: `Legacy` không đụng · `Classic` giữ NGUYÊN thiết kế cũ để đo số ·
> `Main` thiết kế mới hoàn toàn. `Mix` là bản duy nhất **cố ý trộn** ⇒ cũng là bản duy nhất có hai
> bộ luật kéo ngược nhau.

## 0a. 🔴 CÁI NGƯỜI DÙNG ĐÃ CHỈNH THÌ KHÔNG ĐƯỢC ĐỤNG

> *"cái nào t đã save thì giữ nguyên, chỉ fix cái t nói, cấm m tự ý fix cái t đã đổi"*

- **Chỉ sửa đúng thứ người dùng nêu tên.** Không "tiện tay chuẩn hoá" những thứ xung quanh.
- Quét hàng loạt (`đổi hết title`, `đặt lại hết toạ độ`) **rất dễ đè lên bản người dùng vừa chỉnh** —
  trước khi quét, hỏi: *người dùng có vừa động vào nhóm này không?*
- 🔴 **CẤM `Stop-Process -Force` một phiên Desktop.** Chỉ `CloseMainWindow()`. Không thoát được
  (đang bật hộp thoại hỏi lưu) thì **DỪNG và báo người dùng** — hộp thoại đó chính là bằng chứng
  **có thay đổi chưa lưu**. Đã trả giá: force-kill làm mất bản sửa legend người dùng đang làm dở,
  rồi người dùng tưởng agent tự ý sửa ngược thiết kế.

## 0. Ranh giới: cái nào theo bản nào

🔴 **HAI KHUÔN THAM CHIẾU, ĐỪNG TRỘN**:

| Hỏi gì | Mở file nào |
|---|---|
| **Tab hoạt động thế nào** — bookmark lật trạng thái, nút `_On`/`_Off`, vạch đỏ | **`Main`** (`ABC_03IP_IncomeStatementOM_Main`) |
| **Đặt tên · cấu trúc nhóm selection · tên bookmark** | **`Ori`** (khuôn gốc của vùng, `template_report`) |

Lấy nhầm nguồn là ra bản không giống bản nào — `Main` có tab thật nhưng tên nhóm theo nghiệp vụ của
nó; `Ori` có chuẩn tên chặt nhưng **không** có tab.

| Mặt | Theo |
|---|---|
| Nguồn dữ liệu | **DW** |
| Dải header, logo, bảng màu, theme | **`Main`** — dải `1280x50`, logo `150x50`, `§2d` |
| Vị trí khối nội dung, thứ tự trang, cách chia trang | **`Legacy`** — người đọc đã quen |
| Lưới toạ độ | **lưới 5 toàn file**, áp cả cho khối chép từ Legacy |
| Cột nav trái | **BỎ**, nút chức năng dồn lên header |

🔴 **Xung đột thì KHUNG NHẬN DIỆN thắng, không phải UI cũ** — **ngược** với `Classic` (ở đó *"UI
thắng"* vì nó là bản mô phỏng để đo số). Nhầm hai luật này là dựng ra bản không giống bản nào.

## 1. 🔴 HEADER NEO ĐƯỢC HAY KHÔNG — quyết định TRƯỚC, vì nó định đoạt cả file

**Power BI KHÔNG có pin / sticky / freeze cho object trên canvas.** Đo 2026-09-22 trên PBIR của 4
report: chỉ hai khoá nghe giống mà **không phải** — `lockAspect` (khoá tỷ lệ **ảnh**) và
`pinKeyFieldsToTop` (ghim cột khoá **bên trong** một matrix). Không khoá nào ghim visual trên canvas.

⇒ **Header của khuôn gốc trông như neo chỉ vì canvas của nó đúng `720` — không có gì để cuộn.**
Canvas `> 720` thì **cả canvas cuộn**, header trôi theo.

**Hai đường, KHÔNG có đường thứ ba:** ① **giữ trang cao** — header trôi mất, bộ lọc phải chuyển sang
`Filters pane` gốc (§2), không phải dựng lại · ② **canvas 720 + chia tab** — header đứng yên, panel
tự dựng vẫn chạy, nhưng **dựng lại toàn bộ**, mỗi trang 2–5 tab.
🔴 **Chốt với người dùng TRƯỚC khi đụng file** — một report AM thật ra **≈26 tab**, chia sai là hỏng 26 lần.

## 2. Filters pane gốc — bề mặt DUY NHẤT neo được

Giữ trang cao thì bộ lọc **vẫn** neo được: `Filters pane` **không nằm trên canvas**, nó là chrome
ngoài khung báo cáo — bookmark điều khiển được, format riêng từng trang, khai màu qua theme
(`outspacePane` + `filterCard`). ⚠ `Lock filter` = **khoá sửa**, KHÔNG phải neo.
⚠ **Publish-to-web không hiện pane này.**

## 3. Cây nhóm — chép từ khuôn gốc, KHÔNG dựng phẳng

🔴 **Lỗi tốn nhất của bản Mix đầu tiên: dựng PHẲNG** — một trang có **39 object nằm thẳng cấp trang**,
trong khi khuôn gốc khuôn gốc của vùng (`template_report`) có **đúng 4 nhóm gốc** ở mọi trang.

```
Filter      0,0   1280x720   BG_Filter + Filter_Panel(850,0 370x720)
User_Guide  0,0   1280x720   BackGround + 6 nhóm callout
Background  5,0   1275x721   Title(55,0 750x70) + Button(0,10 1265x700) + BG Chart
Chart      70,80  1210x631   Card(0,0 810x120, 3 cardVisual) + Map + areaChart + Bottom
```

**Bản `Mix` áp y hệt, trừ hai chỗ:** `Background` để `0,0 1280x720` (khuôn gốc lệch `x=5` là để chừa
cột nav — Mix bỏ cột đó) · `Background > Button` chỉ còn nút chức năng trên header, không `BT_Page_*`.

🔴 **`position` là toạ độ TƯƠNG ĐỐI so với nhóm cha.** Bọc nhóm quanh visual đã đặt sẵn mà không trừ
offset là **nội dung văng ra ngoài hộp nhóm**. Ca thật: nhóm ở `y=135` giữ con ở `y=-65` ⇒ ba thẻ KPI
render ở `y=235`, **giữa vùng biểu đồ**, trong khi khung nhóm trông vẫn đúng chỗ — người dùng mô tả là
*"dashboard nhảy tán loạn"*. **Kiểm:** `x,y ≥ 0` và `x+w ≤ W(cha)` và `y+h ≤ H(cha)`.

## 3b. CÔNG THỨC KHOẢNG CÁCH HEADER — tính theo CHỮ, không để khung cứng

🔴 **Đừng để khung cố định rồi nối tên trang vào sau** — chữ ngắn để lại một mảng trống, chữ dài thì
tràn. Ca thật: khung `REVENUE` để cứng `360` trong khi chữ chỉ rộng `~111` ⇒ **thừa 249px chết** trên
8/9 trang; `ABC OPERATION` để khung `1310` **tràn cả canvas 1280**.

```
k  (đã HIỆU CHUẨN cho font ĐẬM của header, hệ số 1.271 trên bảng gốc):
     HOA .839 · thường .661 · space .356 · số .763 · '&' .991

W_chữ(t, size) = size × Σ k(ký tự)
w(khung)       = grid5( W_chữ + padding.left + padding.right )
x(khung kế)    = x(khung trước) + w(khung trước)     <- NỐI NGAY SAU, không cộng khe

grid5(x) = 5 × ceil((x − 1) / 5)       <- lên lưới 5, DUNG SAI 1px
```

**Hiệu chuẩn từ MỘT điểm đo thật của người dùng (2026-09-24):** `STORE REPORT` · `24` · đậm ·
`padding 20+20` · người dùng tự kéo khung tới **`270`** ⇒ bề ngang chữ `= 230` ⇒ `Σk = 230/24 = 9.583`,
trong khi bảng cũ cho `7.54` ⇒ **hệ số `1.271`**. Bảng cũ tính **thiếu 27%** vì header dùng **font
đậm**. Kiểm lại: `STORE REPORT → 270` ✓ (đúng số người dùng) · `Monthly Report ABC → 210, x=435`.

🔴 **Khe thở giữa hai khung nằm SẴN trong `padding.right`** — đừng cộng thêm `3 × fontSize` nữa,
cộng là tên trang trôi ra xa. Người dùng chốt: *"tên trang phải nối vào ngay phía sau"*.

🔴 **Khung tên trang KHÔNG BAO GIỜ nhỏ hơn chữ** *(header hiện `Daily &`)*: `grid5` có dung sai −1 px, nên chữ
`Daily & Hourly` rộng 160,1 px nằm trong khung 160 ⇒ Desktop xuống dòng, mất `Hourly`. Khung tên trang (không đệm) làm tròn lên
KHÔNG dung sai: `5 × ceil(chữ / 5)`. Cổng `header-text` đỏ khi khung < chữ.

🔴 **Làm tròn LÊN, không làm tròn gần nhất.** Thiếu 1px là cụt chữ (`STORE R…` · `Monthly Report`
mất chữ `ABC`); thừa 4px thì không ai thấy. Dung sai 1px để không nhảy cả một bậc vô ích.

🔴 **PHẢI CỘNG PADDING THẬT CỦA KHUNG, đừng để hằng `+20`.** Khung tên báo cáo đang có
`padding.left 20 + right 20 = 40`. Công thức cũ ghi `+20` ⇒ tính thiếu **40px** ⇒ `STORE REPORT`
(chữ rộng `181`) lọt vào khung `200`, chỗ cho chữ chỉ còn `160` ⇒ **cụt thành `STORE R…`**.
Đã trả giá 2026-09-24. Số đúng: khung `220` · tên trang `x=440`, khung `165` · nhóm `Title` `605`.

⚠ **Cổng tìm hai khung này theo CẤU TRÚC, không theo tên** (hai shape chữ trong nhóm `Title`,
xếp theo `x`) — vì với shape đang bật title thì `title.text` chính là chữ hiển thị, đổi tên báo cáo
là mất dấu. Lượt đầu cổng báo xanh oan đúng vì lý do này.

🔴 **ĐỔI CHỮ TRONG HEADER = PHẢI CHẠY LẠI CẢ HAI VẾ.** Đổi `REVENUE→STORE REPORT` mà không nới
khung và **không đẩy tên trang theo** thì chữ bị cắt còn `STORE …` và tên trang nằm đè lên.
Đã trúng 2026-09-24 — công thức **đã có sẵn ở ngay trên** mà vẫn quên áp.
⇒ Nay có **cổng `header-text`** ở §7 tự tính lại; không còn trông vào trí nhớ.

Số đã chốt cho trang 1: `STORE REPORT` (24) → khung `200` · `Monthly Report ABC` (17) → `x=420`,
khung `185` · nhóm `Title` rộng `605`.

**Căn cứ — 6 điểm đo, hai nguồn độc lập:** 5 trang khuôn gốc (`fontSize 16`, khoảng đệm đo được
`47,4 ≈ 2,96 × 16`) + bản người dùng tự chỉnh (`REVENUE`, `fontSize 24`, đệm `78,6 ≈ 3,27 × 24`) ⇒ hằng số
**3 × fontSize**. Công thức tái tạo khuôn gốc sai lệch **±12px**, bản người dùng **±7px**.

## 3c. TÊN TRANG · TÊN BOOKMARK · CÂY SELECTION — chuẩn khuôn gốc

**Tên trang** — Title Case, có khoảng trắng, **không dính chữ, không ALL CAPS**:
khuôn gốc `Sales Overview` · `Payment & Channel` · `Product Performance`.
Đã sửa: `MonthlyReport ABC→Monthly Report ABC` · `ABC OPERATION→ABC Operation` ·
`DSR SYSTEM CURRENT MONTH→DSR System Current Month`.
⚠ **Tên file đã mang hậu tố `_AM`** ⇒ **không nhắc lại "for AM" trong tên trang**.

🔴 **Tên trang phải nói trang đó LÀ GÌ**. Cấm tên chung theo phòng
hay đơn vị (`Phòng Kinh Doanh`, `ABC`, `Report`, `Dashboard`, `Page 1`): người mở file đã biết file của phòng
nào. Tên trang nói nội dung: `Tổng Quan` · `Weekly Report ABC` · `Combo 69K`. Cổng `page-name`.

**Tên bookmark** — khuôn gốc: `<PageKey>_<Action>`, 6 cái mỗi trang, gom theo trang:
`_Main` · `_OpenUserGuide` · `_OpenFilter` · `_OpenInsights` · `_CloseHidden` · `_ClearFilter`.
Bản Mix thêm tiền tố **số thứ tự trang**: `01_Monthly_OpenFilter` · `08_Operation_CloseHidden`.
🔴 **Số = vị trí THẬT của trang trong các trang hiện, không số ảo**: 15 trang thì 01…15, đúng
thứ tự `pages.json`. Thêm, xoá hay đổi thứ tự trang ⇒ **đánh số lại mọi bookmark**; trang bị xoá thì **xoá bookmark của
nó** và đôn số các trang dưới lên. Lệnh `mix_builder.py --renumber-bookmarks` (xếp luôn `bookmarks.json` theo trang);
bộ dựng tự lấy số từ vị trí trang (`key` trong spec không mang số). Cổng `bm-number`.
📌 Bắt 27/09: 11/15 trang còn mang số Legacy (`07_Hourly` ở trang 4, `23_MCP` ở trang 15) sau khi 8 trang bị xoá.
⚠ Khuôn gốc có lỗi gõ `Overview_OpenFIlter` — **đừng chép theo**.

### Cây selection — ĐÓNG GÓI và ĐẶT TÊN

🔴 **MỌI dashboard đều phải có NỀN LÀ SHAPE RIÊNG.** Không dùng `background` của chính visual —
shape rời mới sửa được. Một dashboard = **một nhóm** gồm: **nền + visual chính + mọi nút/mảnh lẻ
phục vụ nó**. Thẻ KPI cũng là dashboard: nhóm nó gồm **nền + thẻ + phần trăm**.

🔴 **Mọi tên trong Selection theo đúng một dạng: `<LoạiTínhNăng>_<Tên>`.**

| | Dạng | Ví dụ |
|---|---|---|
| **nhóm** | tên thuần của thực thể | `Revenue` · `OldStore` · `Tab1_TongQuan` |
| **lá** | `<Loại>_<Tên>` | `Card_Revenue` · `BG_Revenue` · `Pct_RevenueOfTarget` |

Bộ tiền tố đang dùng: `BG_` nền · `Card_` thẻ KPI · `Pct_` phần trăm lẻ · `Chart_` biểu đồ ·
`BT_` nút · `Text_` chữ/nhãn · `Slicer_` bộ lọc · `Logo_` · `Line_`. Cặp bật/tắt thêm hậu tố
`_On` / `_Off`, **cùng gốc tên**: `BT_Glossary_Off` ↔ `BT_Glossary_On`.

🔴 **VIẾT TẮT PHẢI CÓ NGƯỠNG**: chỉ tắt khi **từ gốc ≥ 6 ký tự** và
**rút được ≥ 3 ký tự**. Rút được ít thì viết đầy đủ.

| Tắt | Từ gốc | Rút | |
|---|---|---|---|
| `BG` | Background | 8 | ✅ |
| `BT` | Button | 4 | ✅ |
| `Pct` | Percent | 4 | ✅ |
| `TXT` | Text | **1** | ⛔ → `Text_` |
| `IMG` | Image | 2 | ⛔ → `Image_` |
| `LBL` | Label | 2 | ⛔ → `Label_` |

> *"text với txt khác nhau có 1 ký tự, viết tắt làm gì"* — đã phải sửa `TXT_ → Text_`.

⚠ **LUẬT NÀY ÁP CHO CẤU TRÚC NHÓM LỚN, không áp cho nhãn bên trong nhóm** *(người dùng làm rõ
2026-09-24)*. Chữ nằm **trong** một nhóm và là **nhãn cho người đọc** thì cứ để to, để thường:
`Year` · `Area Manager` · `FILTERS PANEL` trong `Filter_Panel`, tên báo cáo/tên trang trong `Title`.
Với chúng `title.text` **là chữ người dùng nhìn thấy** — đổi thành `Text_AreaManager` là bảng lọc
hiện ra đúng chữ đó. Cổng tự miễn theo **cấu trúc** (con của `Filter_Panel` và `Title`), không phải
danh sách cứng.

⛔ **Cấm khoảng trắng · cấm gạch ngang · cấm ALL CAPS** (viết tắt ≤3 ký tự như `TC` `TA` `GA` `GC`
thì được). Đã phải sửa cả loạt: `Tab1 - Tong Quan→Tab1_TongQuan` · `BG Title→BG_Header` ·
`FILTERS PANEL→TXT_FilterPanel` · `Old Store→OldStore` · `Area Manager→TXT_AreaManager`.

> 🔴 **Đây là luật người dùng đã nói từ đầu mà tôi không áp** — đợi bị chỉ từng chỗ mới sửa.
> Có cấu trúc rồi thì **áp cho CẢ trang ngay**, đừng đặt tên tuỳ hứng rồi chờ bị bắt.

🔴🔴 **TRƯỚC KHI ĐỔI TÊN: xem title ĐANG BẬT hay TẮT.** Trong Power BI, tên hiện ở Selection và
tiêu đề hiện trên canvas là **CÙNG MỘT trường** `visualContainerObjects.title.text`.

| `title.show` | `title.text` là gì | Đổi tên được không |
|---|---|---|
| `false` | **chỉ là nhãn Selection** | ✅ đổi thoải mái |
| `true` | **chữ ĐANG HIỆN trên màn hình** | ⛔ đổi = đổi luôn chữ người dùng nhìn thấy |

Đã trả giá 2026-09-24: đổi tên cả trang cho "đúng cấu trúc" ⇒ header hiện `TXT_ReportType` thay vì
`REVENUE`, bảng lọc hiện `TXT_Year` thay vì `Year`. **19 visual phải khôi phục.**

⚠ Bẫy phụ — **mặc định của `show` khi KHÔNG khai là khác nhau theo loại visual**:
`shape` · `image` · `textbox` ⇒ title **TẮT**; còn **chart ⇒ title BẬT**. Nên với chart, viết thêm
`"show": false` cho "gọn" là **tắt mất tiêu đề**, và xoá `show` đi là **bật lại**. Đừng dùng
`setdefault` mù trên trường này.

✅ **Muốn có CẢ tên chuẩn lẫn chữ đúng trên shape:** để chữ ở `objects.text` (như dải tab), rồi
`title.show=false` + `title.text=<Tên_Chuẩn>`.

🔴 **CHART ĐANG HIỆN TIÊU ĐỀ: GIỮ CHỮ GỐC, NHÓM MỚI MANG TÊN CHUẨN**
> *"group cần giữ chuẩn tên, bên trong file của nó tên như ban đầu là dc"*

- **Nhóm** (`visualGroup`) theo dạng tên chuẩn ở bảng trên — đây là chỗ Selection được đọc.
- **Visual lá đang hiện tiêu đề** lấy lại đúng trường `title` của bản Legacy: chữ cố định giữ
  nguyên, **tiêu đề động từ measure** (trang Monthly: `~Report Titile` · `~Lfl Titile` …) lấy biểu
  thức đã nối sang model kho từ bản `Classic` cùng id visual. Kiểu chữ vẫn theo §4g.
- **Bản Legacy TẮT tiêu đề thì Mix cũng TẮT** — trang Weekly gốc dùng tiêu đề TRỤC (`categoryAxis.titleText`,
  chữ đỏ dưới chart) làm nhãn; bật tiêu đề lên là ra hai nhãn chồng nhau.
- Đã trả giá 2026-09-24→26: 27 chart của Monthly · Weekly · Daily Sales hiện `Chart_RevenueByDay`…
  Cổng `title-original` của `scripts/pbi_gate.py` nay báo đỏ khi tiêu đề đang hiện mang tiền tố Selection.

⚠ **Nền là `shape` thì khai thẳng `outline.show=false`** — không khai là để Power BI tự quyết, và
người dùng sẽ hỏi *"ai mượn m thêm viền"*.

- **Phân tab thì mọi thứ nhảy theo tab phải nằm TRONG nhóm của tab đó.** Cái gì ở dưới đổi theo tab
  thì thuộc nhóm tab, không được nằm ngoài. *(Hàng card KHÔNG đổi theo tab ⇒ nằm ngoài nhóm tab.)*
- Tên tab = **đúng nhãn thẻ tab**.

## 3d. BOOKMARK — backend phải giống khuôn gốc, KHÔNG dùng "Selected visuals"

**`targetVisualNames` có HAI cách dùng, chọn theo việc — không phải cứ để rỗng là đúng.**
Đo trên `Main` 2026-09-24:

| Loại bookmark | `targetVisualNames` | Vì sao |
|---|---|---|
| **tab** (`_Tab1_…`) | **`[]` rỗng** ⇒ áp CẢ TRANG | đổi tab thì đóng luôn panel đang mở |
| **panel** (`_OpenFilter` · `_OpenGlossary` · `_CloseHidden`) | **danh sách id** | mở phễu **không được** thổi bay tab đang chọn |
| **lượt xem con** trong một khối (vd đổi chart trong `RevenueTrend`) | **danh sách id của đúng khối** | bấm nút **không được** đụng gì ngoài khối |

🔴🔴 **`targetVisualNames: []` mà `explorationState` KHÔNG ĐỦ visual = ăn mất visual.**
Rỗng nghĩa là *áp cả trang*, nên Power BI lấy ảnh chụp trong bookmark áp lên **mọi** visual —
cái nào không có trong ảnh chụp thì bị reset. Ca thật 2026-09-24: hai bookmark đổi chart để
`[]` nhưng chỉ liệt kê **19/75** visual ⇒ người dùng báo *"bấm đổi tab ngược lại bị mất 1 chart,
1 bookmark đang ko lưu đủ card"*.
**Luật: `[]` thì `explorationState` phải ĐỦ MỌI visual lá của trang. Không đủ thì phải khai
`targetVisualNames` là danh sách.** Cổng `bm-complete` bên §7 canh đúng việc này.

⚠ **Ẩn một nhóm thì phải khai ẩn luôn MỌI NHÓM CON bên trong**, nếu không cây nhóm nói "hiện"
trong khi danh sách lá nói "ẩn" — mâu thuẫn, và Desktop xử theo cái nào là hên xui.

⚠ Danh sách đó **có chứa cả id NHÓM**, không chỉ visual lá (đo trên `MCPReport_OpenFIlter`).

🔴 **Danh sách đích CHỈ có tác dụng khi kèm `options.applyOnlyToTargetVisuals = true`**.
Schema bookmark 2.1.0: *"Only applies changes to selected visuals when the bookmark was captured."* Thiếu cờ này
thì Power BI áp ảnh chụp lên **cả trang**, nên bấm phễu ở tab 2 là trang nhảy về tab lúc chụp. Khuôn Main cũng
thiếu cờ (0 bookmark trong mọi repo có nó) ⇒ đừng chép theo khuôn ở điểm này. Bộ dựng ghi cờ cho mọi bookmark có
danh sách; lệnh `--scope-bookmarks` vá bookmark có sẵn. Cổng `bm-scope`.

🔴 **Không slicer nào được hiện `(Blank)`** *(chuẩn thiết kế của vùng, nhắc lại 2026-09-27)*. Mọi cột
mà slicer hiện đều gắn bộ lọc cấp visual **"is not blank"**: `Not (<cột> = null)`, đúng khuôn Desktop ghi (lấy từ slicer
`IsCurrentYear` của Classic). Đo 27/09 trên kho, sau bộ lọc `BusinessUnit = Southern`: 16/23 cột nuôi slicer có
`(Blank)` — 4 cửa hàng miền Nam chưa gán Area Manager (292 ADV · 172 THĐ · 334 TL10 · 594CMT8), còn lại là dòng
trống ảo do fact mang mã không có trong dim. Không có chuỗi rỗng, chỉ null. Bộ lọc nằm trên slicer nên **không**
bỏ số của cửa hàng đó khỏi chart. Lệnh `--no-blank`, cổng `slicer-blank`.

🔴 **Slicer hiện SỐ lưu dạng CHỮ phải có cột sắp xếp số** *(ô Week hiện `27, 28, 29, 3, 30` — "bộ đếm của slicer
đang ko xếp thứ tự dc 2 số")*. Nhãn kiểu `CurrentWeek` / `27` nằm trong một cột chữ nên Power BI xếp theo chữ. Thêm cột số
ẩn tính trong SQL partition của `Dim_Date` **theo đúng điều kiện sinh ra nhãn** (nhãn đặc biệt = 0, còn lại = số tuần) rồi khai
`sortByColumn` — mỗi nhãn đúng một số, nên hợp lệ dù cột lặp qua các năm. Đã có: `IsCurrentWeek → IsCurrentWeekSort`,
`SortWeekToDate → SortWeekToDateSort` (4 model ABC, Classic + Mix chung backend). Số có số 0 đứng trước (`MonthNumber` `01`)
không cần. Cổng `slicer-sort` ở lớp engine: đọc giá trị thật của mọi cột chữ đang nuôi slicer mà chưa có `sortByColumn`;
≥ 2 giá trị là số mà thứ tự chữ ≠ thứ tự số ⇒ đỏ (thử đỏ 01/10: bắt đúng 2 cột trên, `IsCurrentMonth` không bị báo oan).

🔴 **Bảng lọc giữ NÚT REFRESH của Ori** *("filter bị mất nút refresh ban đầu từ ori")*:
ảnh `BT_ClearFilter` trong `Filter_Panel`, đặt `240,20` cỡ `40x40` (góc phải tiêu đề), icon `refresh_2_white`,
tooltip `Clear All Filters`, trỏ bookmark `<NN_Trang>_ClearFilter`. Bookmark đó **chỉ chụp Dữ liệu** của các
slicer trong bảng (`suppressDisplay` + `applyOnlyToTargetVisuals`, đích = mọi slicer của bảng) ⇒ bấm là slicer về
mặc định của trang (Year = Current Year, còn lại All), **tab không đổi, bảng lọc vẫn mở**. Trạng thái slicer ghi
theo khuôn Desktop: bộ lọc visual (`howCreated 1`) + lựa chọn của slicer là bộ lọc `Categorical` (`howCreated 0`,
không có `filter` = không chọn gì). Nút đi theo tiêu đề `FILTERS PANEL` trong mọi bookmark khác của trang.
Lệnh `mix_builder.py --clear-filter` (dựng lại trang là tự chạy); cổng `clear-filter` canh **mọi report có
bảng lọc, mọi bậc** — file của XYZ chạy cổng là thấy.

🔴 **Mọi thứ trong bảng lọc nằm TRÊN nền `BG_FilterPanel` (z = 0)** *(ô lọc đầu mất nhãn — 60 nhãn/ô/nút
trên 15 trang có z ≤ nền, z bằng nhau thì Desktop vẽ tuỳ)*. Lệnh `--panel-title` đặt nền z = 0; cổng `panel-title`.

🔴 **Tiêu đề lớn `FILTERS PANEL` phải nằm TRÊN nền bảng lọc**: bản Main đặt `y=20`,
`z` cao hơn `BG_FilterPanel`, lề trái 10. Mix để `z=0` dưới nền `z=2000` nên mở bảng lọc là mất chữ. Lệnh
`--panel-title`, cổng `panel-title`. Khuôn Weekly đã sửa nên trang dựng lại chép đúng.

🔴 **Ô chọn (slicer) theo đúng MỘT kiểu, kiểu của bản Main** *("filter không đồng bộ màu
mới, không giống màu nhau")*: nền ô `#E8E8E8`, chữ `#2D2D2D`, khung `#E8E8E8`. Màu Legacy (`#ECDBDD` hồng,
`#AC222C` đỏ, `#558563` xanh lá, `#F3CAE4` của MCP) bỏ hết. Lệnh `--slicers`, cổng `slicer-style`.
🔴 **Mọi chữ của khung là TIẾNG ANH, chỉ dữ liệu là tiếng Việt** *("fix lại chuẩn hết đi, toàn bộ tiếng anh, vì DW
đưa data xuống cũng là tiếng anh ... chỉ có nội dung bên trong là tiếng việt, cột là chuẩn tiếng anh")*: tên trang, tên tab, tiêu đề
visual, tên cột / legend, thư mục measure; giá trị dữ liệu (tên hàng, tên đội 'Sale Nhà Hàng') giữ nguyên. Tên ngắn, danh từ, không
động từ ("Bán ..."), nói đúng mục đích trang. Cổng `ui-english` (hiện kiểm tên trang + tab; tiêu đề / cột: đợt 2).
🔴 **Ô lọc TẮT cả header của slicer** *("filter lỗi ko xài dc")*: `objects.header.show false`. Bật header trong ô 40 px thì
chỉ còn dòng chữ header ("Month", "Year"), dropdown bị đẩy ra ngoài, bấm không chọn được — tên ô là việc của nhãn phía trên. Lệnh
`--slicers`, cổng `slicer-style` (thử đỏ 12/10: 14 ô DR Mix). Slicer chép từ Legacy giữ khối `header` có font/màu mà KHÔNG có `show` ⇒ mặc định BẬT, tên trường in lần hai trong ô: cổng `slicer-header`.
🔴 **Một tháng so sánh = MỘT slicer "Compare With" trên `Parameter_Date[Year Month]`** *(13/10: "filter 2 cái select year thì sao
chọn má? cái này nó là từ year tới year đúng ko")*: cặp slicer Year + Month của Legacy đọc thành "từ … đến …" ⇒ gộp làm một, giữ tháng
đang chọn; cột so sánh gọi theo nó (`Compare Month` · `% Revenue Compare` · `Change` · `% Change`, KHÔNG `Base`/`Variance`). Hai slicer
cùng cột mà mỗi ô lọc chart riêng (01 Total Bill On Month) ⇒ đặt tên theo chart (`Month A`/`Month B`), cấm hai ô cùng tên. Cổng
`compare-month` + `slicer-unique` (hai ô cùng tên hiển thị, hoặc cùng tên cột ở hai bảng, là đỏ).
🔴 **Slicer bảng lọc nối liền nhau theo bước cố định 65 px** (nhãn 20 + ô 40 + khe 5) *(13/10, 01 Product: "sao filter mới
lại bị rỗng 1 hàng")*: bỏ / gộp một slicer thì kéo các ô bên dưới lên, không để hàng trống. Cổng `filter-rows`.
🔴 **Filter "không trống" trên cột SỐ chỉ loại `null`** *(13/10)*: hai nhãn Kimball `'Unknown'`/`'Not Applicable'` là CHỮ — đặt lên cột số
(Year) là slicer chết "CONTAINSROW does not support comparing values of type Text with values of type Integer". `not_blank_filter`
đọc kiểu cột từ model; cổng `literal-type` chặn mọi giá trị filter khác kiểu cột (chữ trên số, số `5L` trên cột chữ `'05'`).
🔴 **Mọi bảng / matrix kín khung: Auto-size behaviour = Grow to fit** *("so với tổng size của chính group chứa")*:
`columnHeaders.autoSizeColumnWidth true` + `columnAdjustment 'growToFit'` (khuôn đọc từ chính Desktop) — Desktop tự giãn cột cho kín
khung với bao nhiêu cột dữ liệu đưa ra; không đặt bề rộng tay (matrix Tháng × Kênh: kho 5 kênh, kỳ này 3 kênh có số ⇒ đếm cột
trước là sai). Lệnh `mix_builder.py --grow-to-fit`, cổng `narrow-table`. Ngoại lệ: bảng đã đo trên engine bằng `matrix_fit.py` (auto-size tắt + bề rộng cho mọi measure, §5l-quinquies) — `narrow-table` · `header-wrap` bỏ qua nó, cổng `matrix-fit` lớp engine giữ.
🔴 **Đổi chữ header (tên report / tên trang) ⇒ chạy lại `--fit-header`** *('Franchise' bị cắt còn 'Fra' ở nhiều trang — đổi tên tại chỗ giữ khung của tên cũ 'NQ' 40 px)*: khung tên report = grid5(chữ + lề), tên trang nối ngay sau, nhóm Title kết thúc ở cuối tên trang, khung tên trang = chữ + 20 px (`NAME_SLACK` — Desktop chừa khoảng trong khung chữ; 14/10 khung sát chữ 100 px hiện 'Overvie', 120 px hiện đủ). Cổng `header-text` chạy trên MỌI trang (trước chỉ trang strict ⇒ lọt) và báo khi nhóm Title chạm dải tab.
🔴 **Tiêu đề cột dài ⇒ 2 dòng, công thức tự đổi** *("title quá dài ntn thì phải cắt ra 2 dòng ... mọi bảng luôn, bảng nào
title dài thì đổi công thức tự động")*: Grow to fit đặt MỌI tiêu đề trên MỘT dòng (tên mặt hàng 300 px một cột). Bảng có tiêu đề > 150 px
(`HEADER_WRAP`) ⇒ tắt auto-size, bề rộng cố định theo `pbi_gate.column_plan`: tiêu đề > 80 px = nửa chữ + 20 (2 dòng), measure ≥ 70,
cột tên hàng giữ bề rộng sẵn có (mặc định 400 — tên trong kho dài tới ~700 px, tự xuống dòng); tổng thiếu khung thì giãn đều cho kín.
Matrix có trường Columns (tiêu đề lấy từ dữ liệu) vẫn Grow to fit. Cùng lệnh `--grow-to-fit` tự chọn công thức; cổng `header-wrap`
(thử đỏ 14/10: bảng Quy Đổi E-Commerce).
🔴 **Tên hàng dài ⇒ cột tên = nửa tên dài nhất + 20, 2 dòng** *("tên sản phẩm quá dài cũng nên tách làm 2, chia đôi ra để đừng có đẩy phần cột khác quá dài")*: tên dài nhất đo từ KHO (chỉ các dòng dim mà một fact của model trỏ tới, mỗi khoá một điều kiện), cỡ chữ của rowHeaders; > 300 px (`ROW_WRAP`) ⇒ ghi `columnWidth` cho cột tên — Grow to fit vẫn giữ bề rộng đã ghi. **Mọi cột chữ vừa khít, không dư** *("cột ko dc dư chứ, phải vừa khít chữ" — cột mã 8 ký tự bị 366 px)*: = max(chữ dài nhất trong kho, tiêu đề) + 20; chỉ matrix layout **Stepped** (các cấp dồn một cột) mới dùng chung bề rộng — Tabular / Outline mỗi trường một cột. Cùng lệnh `--grow-to-fit`; cổng `row-wrap` (lớp dw) báo cả dư lẫn thiếu.
🔴 **Hai dòng = chia theo TỪ, không bao giờ 3 dòng, không cắt giữa chữ** *("'Month Numbe r' ... 2 dòng mà nhảy ra 3 dòng là ko dc ... ko có để 2 dòng mà xuống 1 có chữ")*: bề rộng 2 dòng = `pbi_gate.wrap_width` — điểm chia giữa hai từ cho dòng dài nhất ngắn nhất, không nhỏ hơn từ dài nhất (nửa chữ thô ra 3 dòng / cắt 'Numbe·r'); tên dữ liệu đo trên 30 tên dài nhất trong kho. Matrix có trường Columns: tên trường đó hiện ở ô GÓC trên cột hàng CUỐI ⇒ cột đó chứa luôn tên này; đặt nhãn đọc được (`MonthNumber` ⇒ `Month`). Cổng `header-wrap` · `row-wrap`.
🔴 **Tiêu đề visual: MỘT kiểu chữ, MỘT kiểu viết** *("bộ kiểm title phải bold đâu? lại sót nữa" + "ko có được viết in hoa rồi viết hoa đầu chữ tùm lum, 1 chuẩn duy nhất là viết hoa caption đầu")*: font **Segoe UI Semibold** 12, canh trái (không khai font = Segoe thường của theme ⇒ tiêu đề mảnh); chữ **viết hoa đầu mỗi từ**, không từ nào IN HOA trừ viết tắt nghiệp vụ (`TITLE_ACRO`: NQ · DT · B2B · POS · VAT · MTD …), từ nối tiếng Anh (by · vs · of …) viết thường; thuật ngữ `Sell In` / `Sell Out` giữ nguyên. Lệnh `mix_builder.py --title-style`. Cổng `title-font` + `title-case` (Mix/Main — KHÔNG Classic, xem pbi-classic) — **cùng tên, cùng logic với repo phòng ban** (ABC có từ 12–13/10) để khi ABC gộp chuẩn không ra hai luật trùng việc.
🔴 **Matrix lấy dữ liệu làm tiêu đề cột cũng 2 dòng** *("trang này phải theo chuẩn 2 dòng chứ? sao cột dài thòng vậy")*: trường ở Columns là tên dài (mặt hàng…) ⇒ bề rộng cột số = tên dài nhất trong kho chia 2 dòng theo từ + 20, chia đều cho các cột số dưới một tiêu đề, mỗi cột ≥ 70; tên ngắn (tháng, ngày, mã) giữ Grow to fit. `--grow-to-fit`, cổng `row-wrap` (lớp dw).
🔴 **Tiêu đề cột lấy từ dữ liệu: MỘT bề rộng chung, cân 2 dòng** *("gom 2 dòng sao cho nó 2 dòng ngang nhau để cân bằng")*: Power BI giữ MỘT bề rộng mỗi cột giá trị cho mọi phần tử (Desktop lưu `columnWidth` theo measure, không theo phần tử) ⇒ không cân được từng tên. Số của loại cột này thường ngắn (mặt hàng NQ: lớn nhất 78.303 = 59 px) nên tiêu đề nhận thêm dòng thay vì kéo cột *("size cột bị dài vô lý ... số ít thì đâu cần title dài" — chọn tối đa 3 dòng: 270 → 195 px)*. Chuẩn = `balanced_width`: bề rộng nhỏ nhất mà mọi tên vừa `MEMBER_MAX_LINES` = 4 dòng (≤ 2% được 5; 3 dòng vẫn để bề rộng quá rộng), không hẹp hơn từ dài nhất, không dưới 70; đo trên ĐÚNG các tên visual hiện (DAX `FILTER(VALUES(trường), NOT ISBLANK(measure))` qua `scripts/pbi_engine_query.ps1`). Lệnh `mix_builder.py --member-width` (report phải đang mở trong Desktop); cổng lớp dw chỉ chặn khoảng 70 … đủ cho mọi tên kho. Đừng báo con số ước lượng từ mẫu (14/10: mẫu 200 tên cho 230, tập thật 248 tên cho 265).
🔴 **Bảng chi tiết không bị bóp vì chart ít thông tin** *("3 chart ... mà cái bảng dưới lại bị bóp nhỏ? ko hợp lý, sao ko tách ra")*: trang có thẻ số + nhiều chart + một bảng chi tiết lớn ⇒ tách tab (Summary = thẻ + chart, Detail = bảng cao hết tab; `card_tabs: (0)`, nút đổi chế độ xem giữ trong khối bảng qua `switch_block`). Vùng tab cao 675.
🔴 **Field parameter: `groupByColumn` + giá trị chọn phải có thật** *("Something's wrong with one or more fields ... Parameter_PhanTichTheo" rồi bảng trống)*: cột hiển thị của bảng tham số mang `relatedColumnDetails / groupByColumn: 'Parameter Fields'` (thiếu ⇒ Missing_References); đổi tên bảng measure (`Measure` → `#Measure`) thì sửa luôn giá trị ô lọc + bookmark chọn sẵn (`'''Measure''[Số lượng]'` → `'#Measure'[…]`) — giá trị lạ chọn trúng không trường nào, ô số trống. Cổng `param-groupby` · `param-value` (thử đỏ 14/10: 7 chỗ Franchise Mix). Lỗi kỹ thuật ⇒ sửa cả Classic.
🔴 **Trang Overview luôn đứng đầu**: report có trang `Overview` thì nó là trang 1 (và trang mở). Đổi thứ tự trang ⇒ chạy `--measure-folders` + `--renumber-bookmarks`. Cổng `overview-first`.
🔴 **Tên tab viết hoa chữ đầu MỌI từ** *("ko có gì lúc Tổng quan rồi Nhân Viên tùm lum")*: `Sales Rep` · `Monthly` ·
`Items` — tab, bản chép trong bookmark, dòng Glossary và `mix_specs` cùng một chữ. Chữ hoa rộng hơn ⇒ đo lại bề rộng tab. Cổng `tab-case`.
🔴 **Một chữ thuộc về TRANG hoặc TAB, không cả hai** *(trang Overview có tab Overview — "cần quy định lại từ overview là của
trang hay tab"; chốt: Overview là TRANG)*: tab đầu mọi trang = `Summary`; tên tab không trùng tên bất kỳ trang nào (không phân biệt
hoa thường). Cổng `tab-page-name`.
🔴 **Thứ tự: trường sắp xếp phải nằm trong chính visual; chart thanh theo danh mục xếp từ lớn xuống nhỏ** *("phải xếp
từ cao xuống thấp")*: đổi measure của chart thì đổi cả `sortDefinition` — sắp theo measure không còn trong chart thì Desktop bỏ
lệnh sắp, thanh ra lộn xộn. Cổng `sort-order`.
🔴 **Doanh thu so chỉ tiêu = 3 cột ĐỨNG CẠNH, cùng bề rộng: `-VAT` · `+VAT` · `Target`** *(đã thử cột chồng "Doanh Thu + Còn
Thiếu" rồi bỏ — "1 cột ntn còn nhỏ nhìn hơn ... mỗi chart 3 cột, size phải bằng nhau"; tên cột theo nghiệp vụ, "ghi +VAT và
-VAT đi cho ngắn gọn")*: `lineClusteredColumnComboChart`, Y = `#Revenue Net` / `#Revenue With VAT` / `Target`. Target KHÔNG bao giờ chồng
lên doanh thu (cột chồng cộng hai số không cộng được). Cổng `target-stack`.
🔴 **Chart cùng hàng = cùng bề rộng cột, cùng legend** *("size ngang của cột phải đồng bộ")*: cùng `categoryAxis.innerPadding`,
cùng bật/tắt legend. Trục đã bật mà chữ màu nền (trắng) thì tắt trục. Cổng `row-uniform` · `axis-invisible`.
🔴 **Tiêu đề khối bằng textbox: lề trên/dưới = 0, cao ≥ 1,5 × cỡ chữ** *("title phải ko dc có padding ở trên ... cuối title
có 1 cục màu xám")*: lề mặc định của textbox đẩy chữ xuống ⇒ 12pt trong 25 px bị cắt nửa dưới và hiện thanh cuộn xám ở cuối ô.
Đặt `visualContainerObjects.padding` top/bottom/left/right `0D`; 12pt ≥ 24 px · 11pt ≥ 22 px. Cổng `title-padding` (textbox < 40 px).
🔴 **Legend / tên series = TÊN field, KHÔNG chú thích trong ngoặc** *("t ko mượn legend phải mở ngoặc ... việc chú thích là nút
glossary đã làm rồi")*: `Sell In (Bán NQ)` → `Sell In`. Giải nghĩa nằm ở Glossary. Cổng `legend-plain`.
🔴 **Nhãn số KHÔNG đè nhau** *("ko để nó đè số ntn")*: chart cột/thanh cần (rộng − 50) ÷ (số nhóm × số series có nhãn) ≥ 52 px
mỗi nhãn. Thiếu chỗ thì để nhãn MỘT series (số thực / số chính), series kia `showSeries false` (vẫn có cột + tooltip) — không bóp chữ,
không xoay. Cổng `label-overlap` (thử đỏ 12/10: 3 chart quý 281 px + Sell In 360 px).
🔴 **Cùng MỘT cỡ, KHÔNG thanh header, KHÔNG khung lồng** *("lỗi tùm lum, bấm vào nó bị
đè mất, rồi sai cả size box … trỏ chuột vào nó bị mất hết chữ")*: đo 01/10 Mix AM có **9 kiểu trên 77 ô** — chữ 9 / 10 / 13 /
14 / mặc định, khung nền trong suốt 93% bao quanh một ô nhỏ hơn, `visualHeader` bật (rê chuột là thanh header phủ lên chữ).
Chuẩn: `items.textSize 10D` (mặc định của Main) · `visualContainerObjects.background.show false` · `visualHeader.show false` ·
viền `#E8E8E8` 1 px · `pendingChangesIcon` tắt. Cùng lệnh `--slicers`, cùng cổng `slicer-style` (thử đỏ: 77/77 → 0).

🔴 **MỘT BỘ LỌC CHUNG, ĐỒNG BỘ THEO LOẠI KỲ** *("filter có nên làm 1 bộ chung cho mọi trang và tab ko? t
thấy mỗi trang filter riêng nó bị rối" → chọn "bộ chung + đồng bộ", phạm vi "theo loại kỳ")*:
- **Thứ tự mọi trang:** `Year` · `Month` · `Area Manager` · `District` · `StoreName` · `Channel`, rồi ô riêng của trang (Week,
  Day, Metric, chương trình, MonthNumber…). Trang không có kỳ nào thì bỏ ô đó, giữ thứ tự phần còn lại.
- **Ô vị trí** (`AreaManagerShortName` · `District` · `ShortName` · `ChannelGroup+ChannelNameStandard`) có trên **mọi trang có
  bảng lọc** — thiếu thì chép từ ô cùng trường ở Monthly, bỏ lựa chọn. Miễn có lý do: `Channel` ở MCP và Power Consumption
  (P&L, chi phí điện: không có chiều kênh). Trường tương đương được tính là có, không đồng bộ: `Dim_Store.AreaManager` (MCP),
  `ChannelType+ChannelName` (DSR).
- **Đồng bộ** = `visual.syncGroup {groupName: 'FilterSet_<Key>', fieldChanges: true, filterChanges: true}` (khuôn Desktop ghi,
  13 ô Combo/khác). `Month` **chỉ** có ở trang theo tháng (Monthly · Daily · Product · Product Mix · Operation · DSR) — KHÔNG
  thêm vào Weekly / Executive: Month mặc định `Current Month`, ép lên Weekly là Weekly chỉ còn tuần của tháng đó. Trang khuyến
  mãi / Combo / MCP giữ ô kỳ riêng (`DateKey`, `MonthNumber`, `Year`) ở cuối, không đồng bộ với Year/Month.
- 🔴 **Ô tháng: chọn `Current Month`, KHÔNG BAO GIỜ một tháng cố định · Monthly đứng NGOÀI nhóm đồng bộ** *(sau khi
  tra cách làm phổ biến)*. Slicer Power BI "dính" giá trị lúc Save: lần Save 04/10 02:20 ghi `'09'` ⇒ 6 trang Mix AM đứng ở tháng 9.
  Cột `Dim_Date.IsCurrentMonth` gắn nhãn chữ `Current Month` cho tháng có bán cuối (`MaxSale`) ⇒ chọn nhãn đó là trang tự lăn sang
  tháng mới. Trang **Monthly** theo Legacy **không chọn tháng nào** (4 chart theo tháng ra cả năm) nên **không** nằm trong
  `FilterSet_Month` — đồng bộ là nó nhận luôn một tháng của trang khác. Danh sách miễn: `pbi_gate.FILTER_UNSYNCED` (một nguồn,
  `mix_builder --filter-set` đọc lại). Cổng `filter-set`: ô tháng đồng bộ mà khác `'Current Month'` ⇒ đỏ · Monthly còn đồng bộ hoặc
  chọn sẵn ⇒ đỏ (thử âm 05/10: gài 3 ⇒ đỏ đúng 3). Ori không có "current" (một slicer khoảng ngày `Between`); slicer **Date Picker**
  (GA 08/2026, neo "Last date") là hướng thử sau — người dùng dựng mẫu trong Desktop trước, tuần thứ Sáu của ABC nó không làm được.
- 🔴 **'Current …' là kỳ MỚI NHẤT trong danh sách — nhãn và bộ lọc của ô dùng CHUNG MỘT mốc ngày.** Ô kỳ có thành viên
  'Current Month' / 'Current Year' / 'Current Week' thì không thành viên nào khác được chứa ngày sau ngày cuối của thành viên
  'Current …' (dưới chính bộ lọc cấp visual của ô). Hỏng điển hình: nhãn 'Current Month' tính theo một mốc (tháng đã đóng sổ)
  còn cột cờ lọc ô (`Flag_is_use`, `DateWithSale`…) tính theo mốc khác (tháng lớn nhất có số) ⇒ ô hiện 'Current Month' rồi
  vẫn còn tháng sau nó — vô nghĩa. Sửa: nhãn và cờ lấy từ CÙNG một biểu thức mốc (trong SQL partition hoặc cùng một cột).
  Muốn mặc định mở một kỳ khác kỳ mới nhất thì đó là quyết định trình bày, hỏi người dùng — không tách mốc. Cổng `slicer-current`
  (lớp engine): mỗi ô trên bảng ngày, đếm thành viên khác 'Current …' có `MAX(ngày)` > ngày cuối của 'Current …' ⇒ > 0 là đỏ.
  Dùng `MAX`, không `MIN`: thành viên tháng gộp nhiều năm ('10' = 10/2025 + 10/2026), ngày đầu che mất phần vượt.
- **Một hình học:** nhãn 20 + ô 40, bước 65 từ `y = 65` ⇒ tối đa **10 ô**. Bản cũ co ô theo số ô (`step − 30`): Product
  10 ô còn 34 px trong khi trang 6 ô cao 50 — đúng cái người dùng gọi là "sai cả size box".
- 🔴 **Nhãn phải đúng ô ngay dưới nó** *(ô Day của Daily nằm dưới nhãn "Area Manager")*. `--filter-set` thêm ô vị trí
  **không kèm nhãn**, rồi `panel_layout` ghép nhãn theo vị trí ⇒ nhãn cũ trượt xuống ô kế bên: Combo "Monthnumber" trên ô Area
  Manager, Power "StoreName" trên District, Promotion "DISCOUNTNAME" trên Channel (11 nhãn trên hai Mix). Cổng `panel-label`: nhãn
  phải khớp tên field của ô (hoặc tên tương đương trong `PANEL_ALIASES`: Month ~ IsCurrentMonth, Area Manager ~ AreaManagerShortName…).
  Thêm ô mới thì **thêm nhãn cùng lúc**.
- Operation từng có **hai ô Week** (`SortWeekToDate` lọc Tuần + WoW, `IsCurrentWeek` chỉ lọc WoW) ⇒ giữ `SortWeekToDate`.
- **Máy làm:** `mix_builder.py --filter-set` (thêm ô + syncGroup) → dựng lại trang (bộ dựng xếp theo `filter_rank`) hoặc
  `--panel-layout` cho trang không có spec (Monthly). **Máy canh:** cổng `filter-set` (thiếu ô · sai thứ tự · chưa đồng bộ ·
  ô khác 40 px). Thử đỏ 01/10: AM 145 / OM 180 lỗi → 0.
- ⚠ Bẫy đã trả giá khi làm: đổi chiều cao nhãn làm bộ dựng không tìm ra mẫu nhãn trên Weekly (`StopIteration`) ⇒ mọi trang
  dựng sau Weekly hỏng lặng, vì lệnh hàng loạt chỉ lọc dòng "Error". Chạy hàng loạt thì **đếm số trang dựng xong**.
`options.suppressData = true` cho mọi bookmark chỉ đổi ẩn/hiện.

🔴 **Luật cũ ghi "nhóm CHA bị ẩn thì bookmark mở con vô nghĩa" — ĐO LẠI THÌ SAI.**
`Main` làm đúng y như vậy mà vẫn chạy: nhóm `Tab2` `isHidden=true`, con nó cũng `isHidden=true`,
bookmark `MCP_Tab2` bật **con** lên và **không đụng gì tới nhóm** trong `visualContainers`.
Lý do: **nhóm có chỗ riêng trong bookmark** — xem `visualContainerGroups` ở §5b. Nhóm nào đóng/mở
thì khai ở đó; `isHidden` trong `visual.json` chỉ là trạng thái lúc lưu, không phải xiềng.

## 3e. TAB — chép khuôn "nút chuyển trang" của khuôn gốc

> Thay hẳn §5 bên dưới ở phần *cách dựng*: đã tìm được khuôn thật, không phải "tự dựng" nữa.

**Vị trí:** tab nằm **trong header**, neo **từ PHẢI qua**, sát nút ⓘ. Đo trên bản AM: nút ⓘ
(`BT_OpenGuide`) ở `x=1195` ⇒ tab cuối kết ở `1180` (khe `15`).

**Khuôn gốc — mỗi nút chuyển trang là 2 image chồng + 1 shape nền:**
```
image BT_<Tên>_Off              trạng thái thường
image BT_<Tên>_On    <- action  trạng thái đang chọn
shape tabRoundTopCorners 55x50  nền bo góc, CHỈ hiện ở tab đang chọn
   tileShape = 'tabRoundTopCorners'
   tabRoundCornerTop = 0 · tabRoundCornerTopRight = 1 · tabRoundCornerBottom = 20
   fill    = MỘT mục có màu (KHÔNG có mục thứ hai 'show:false')
   outline = show:false
   vcObjects = chỉ title + lockAspect  ->  KHÔNG có 'background'
```

🔴 **Ba thứ làm tab "chỉnh shape không dính", đã trả giá cả ba:**
1. `objects.fill` có **mục thứ hai `show:false`** ⇒ shape **vô hình**, bo góc có cũng không thấy.
2. `visualContainerObjects.background.show = true` ⇒ đang nhìn **nền hình CHỮ NHẬT của container**,
   nó **không theo hình dạng tab** — chỉnh bo góc bao nhiêu cũng vô ích.
3. Đặt cả `tabRoundCorner* = 100` **cộng** `tabCutCornerSnipSize = 999` ⇒ hai thuộc tính đánh nhau.

**Ý đồ thiết kế của người dùng (2026-09-23):** tab **đang mở** tô **trùng màu nền vùng nội dung** để tạo cảm
giác tab bao trùm phần dưới; tab **đang tắt** sáng nhẹ hơn một chút.

⚠ Nhãn chữ để trong `objects.text` của shape (canh giữa), **không** để ở `visualContainerObjects.title`
— để nó ăn theo hình tab. (`title.text` dùng cho **tên hiện trong Selection**, xem §3c.)

### 3e-bis. TAB BẢN MIX — chuẩn do người dùng tự chỉnh rồi SAVE *(2026-09-24)*

**Tab CHỈ CÓ CHỮ, tuyệt đối không chèn image.** Người dùng đã tự sửa trong Desktop rồi lưu, lấy đúng bản
đó làm chuẩn:

```
hình   tileShape='tabRoundTopCorners' · Top=25 · TopRight=20 · Bottom=0
chữ    fontSize 12 · bold · canh giữa        <- "chữ to"
ON  (đang mở) nền ThemeDataColor(0, -0.1)  ~ #E6E6E6, TRÙNG màu nền trang #E8E8E8
              chữ ThemeDataColor(1,  0)    = #2D2D2D
              y=0 · h=45 · padding.top=5   <- nhô cao hơn, như dính vào vùng nội dung
OFF (tắt)     nền ThemeDataColor(0, -0.2)  ~ #CCCCCC
              chữ ThemeDataColor(1,  0.4)  = xám đậm      <- user gọi "màu xám đậm"
              y=5 · h=40 · padding.top=0
```

🔴 **Mỗi tab là HAI shape chồng nhau `_On` / `_Off`**, cùng trỏ về **cùng một** bookmark tab; bookmark
lật cái nào hiện. Bookmark **không chụp được màu**, nên đổi màu theo trạng thái **chỉ có cách này**.

🔴 **LUẬT BẤT BIẾN: mỗi cặp `_On`/`_Off` phải có ĐÚNG MỘT cái hiện.** Cả hai cùng hiện thì người dùng
thấy **hai tab cùng bật** — đúng lỗi người dùng từng báo. Mặc định trang: **tab 1 `_On` hiện, tab 1
`_Off` ẩn, tab 2 `_On` ẩn, tab 2 `_Off` hiện.**

🔴 **`<Trang>_Main` phải TRÙNG KHÍT bookmark của tab mặc định** — nó vừa là "về trạng thái gốc của
trang" vừa là "tab 1 đang bật". Hai cái lệch nhau là bấm Reset xong tab hiện sai.

⚠ **Save trong Desktop LẬT lại cặp này.** Desktop ghi **trạng thái đang xem** thành mặc định trang;
lúc người dùng mở file mà không bấm bookmark nào thì cả 4 shape đều hiện, Save phát là **cả 4 vào file với
`isHidden` sạch**. Đã trúng thật: 4/4 shape tab về `isHidden=false`. ⇒ **Mỗi lần người dùng Save xong, kiểm
lại cặp `_On`/`_Off` trước khi làm tiếp** — đừng tin trạng thái mình ghi lượt trước còn nguyên.

🔴 `ThemeDataColor.ColorId`: `0` = `background` · `1` = `foreground` · **`2` = `dataColors[0]`**, `3` = `dataColors[1]` … `9` =
`dataColors[7]`. *(Sửa 01/10 — bản cũ ghi "`2` = nền phụ · `3` = `tableAccent`, từ `4` mới tới màu data" là SAI: đo trên file mẫu
Original, thẻ `ColorId 6` hiện `#13678A` = `dataColors[4]`; theo bản cũ phải là xanh lá `#199900`.)* `Percent` âm = đậm, dương = nhạt.

## 4. Hàng card — `cardVisual`, icon NẰM TRONG visual

- 🔴 **Icon là `ResourcePackageItem` trỏ PNG cục bộ — KHÔNG phải measure.** Sổ cũ ghi nó trỏ measure
  họ `~URL_*`; đo trên khuôn gốc thì **sai**, theo sổ là đẻ ra 6 measure vô dụng.
- 🔴 **`card` cũ và `cardVisual` KHÁC schema truy vấn** — `queryState.Values` ↔ `queryState.Data`.
- ⚠ **Đừng phủ ảnh rời lên `card` cũ** để giả làm icon: ảnh nhỏ, lệch, nhãn phải dựng bằng shape rời
  vì `card` cũ vẽ *số trên — nhãn dưới*. Đã bị người dùng bác hai lượt.
- 📌 Khuôn JSON đầy đủ + cỡ icon theo cỡ card: [`reference/measured.md`](reference/measured.md) §1.

### 4b. THIẾT KẾ THẺ — đơn giản, KHÔNG viền

```
nền thẻ   #FFFFFF        bo góc 12
viền      KHÔNG có       (border.color = #FFFFFF, không phải màu nhấn)
nền trang #E8E8E8        để thẻ nổi lên
icon      nằm TRONG card, bên TRÁI, mỗi thẻ MỘT màu
```

🔴 **Đừng tự ý đi viền màu.** Bản đầu để `border.color = #C51E24` ⇒ 6 thẻ viền đỏ, người dùng bác.

**Màu thẻ lấy từ BẢNG MÀU ĐÓNG (chuẩn thiết kế của vùng Bảng 1+2), gán theo NGHĨA chứ không theo mắt:**

| Thẻ | HEX | Căn cứ trong bảng |
|---|---|---|
| Revenue | `#3D7EBF` | chuỗi 1 — nhóm **doanh thu** |
| Target | `#C51E24` | Primary Red — màu nhấn |
| TC | `#2E9C7A` | chuỗi 3 |
| TA | `#D2792F` | chuỗi 2 |
| GC | `#5A5FA8` | chuỗi 4 — chỉ số tổng hợp |
| GA | `#136C99` | Hierarchy Blue |

⚠ **Bảng màu là DANH SÁCH ĐÓNG** — thiếu màu thì **HỎI**, cấm tự pha.

🔴 **XUNG ĐỘT CHƯA GIẢI — số trong thẻ có được tô màu không?**
Ảnh mẫu người dùng đưa có **số tô màu theo thẻ**. Nhưng `chuẩn phòng ban §2d` ghi
*"MỌI chữ trên nền sáng → `#2D2D2D`, không có ngoại lệ"*. Hiện đang **chỉ tô icon, số để `#2D2D2D`**.
Muốn tô số thì **phải sửa chuẩn ở repo quản lý vùng trước**, không phá lệ trong im lặng.

### 4c. BỘ KHOÁ `cardVisual` — chép nguyên, thiếu cụm là bố cục nhảy

Khuôn đo trên thẻ chuẩn của `Main` (`.../b3ad2f4c.../4f2c0e7c73d84cd89db3`). **Thiếu cụm `layout`
là PBI rơi về bố cục mặc định** — lúc đó chỉnh `value.bold`, chỉnh vị trí icon đều như không:

```
objects.layout   [ {style:'Cards'} ,                       <- mục THƯỜNG
                   {backgroundShow:false, rectangleRoundedCurve:25L}@default ]
objects.spacing  { verticalSpacing: 0L }@default
objects.padding  { paddingSelection: 'Narrow' }@default
objects.label    { show:true, bold:true, position:'aboveValue', fontColor }@default
objects.value    { show:true }  +  { bold, fontSize, fontColor,
                   horizontalAlignment:'left', transparency:0D,
                   textWrap:false, showBlankAs:'No Data' }@default
objects.image    { show, image{name,url:ResourcePackageItem,scaling},
                   position:'Left', size, padding, imageType:'image' }@default
accentBar · grid · divider · referenceLabel{Title,Value}   đều show:false@default

visualContainerObjects.padding   { left:10D, top:5D, bottom:5D }   <- KHÔNG phải 0 bốn phía
visualContainerObjects.visualHeader { show:false }
```

🔴 **`image.imageAreaSize` GIỚI HẠN BỀ NGANG cột ảnh — thiếu nó là icon phình chiếm hết thẻ.**
Thẻ `150×90` của bản Mix: `imageAreaSize 18L · size 8L · padding 4L`. Icon neo được vào đầu là nhờ
`position:'Left'` **cộng** `visualContainerObjects.padding.left` khác 0.

⚠ Thẻ chỉ rộng `150` ⇒ **mỗi pixel cột ảnh ăn thẳng vào nhãn**. Icon to một chút là `REVENUE` cụt
thành `REVE...`. Đổi cỡ icon thì **nhìn lại nhãn dài nhất** trước khi báo xong.

🔴 **Padding khung để 0 cả bốn phía ⇒ nội dung dán sát mép**, nhìn như icon bị thả trôi. Main dùng
`left 10 / top 5 / bottom 5`.

⚠ **`%` đi kèm value:** bản Mix đang để `%` là **một `card` cũ rời** chồng lên thẻ, không phải
reference label. Muốn nó *"kế bên value"* thì đặt toạ độ ngang hàng dải value của thẻ
(thẻ `150×90` ⇒ `%` ở `x=95 y=50 w=52 h=22`). **Chưa dùng `referenceLabelLayout.position` cho
kiểu "beside"** — trong cả 4 report của kho chỉ đọc được giá trị `'below'`, chưa có file thật nào
chứng minh tên giá trị còn lại, mà **đoán tên giá trị chính là thói quen làm vỡ file**.

### 4d. KHUÔN THẺ KPI — đo trên mẫu người dùng TỰ DỰNG *(2026-09-24)*

Người dùng tự dựng nhóm `Revenue` trong Desktop rồi lưu ⇒ **đó là khuôn, nhân bản ra 5 thẻ còn lại**.
Toạ độ con là **tương đối so với nhóm**:

```
nhóm  <Tên>                x=X y=0  w=150.47759000734754 h=105.28655400440853 z=2000
  Card_<Tên>  cardVisual   x=0 y=0  w=150.47759000734754 h=90.28655400440853  z=2000
  Pct_<...>   card (cũ)    x=5 y=70 w=100                h=25                 z=1000
  BG_<Tên>    shape        x=0 y=15 w=150                h=90.286554004408529 z=0
        tileShape='rectangleRoundedByPixel' · rectangleRoundedCurve=12L
        fill@default = ThemeDataColor(0,0)  (trắng)
```
⚠ **`Card_` và `BG_` lệch nhau 15px theo trục y** trong mẫu gốc — giữ nguyên, đừng "sửa cho thẳng".
Hàng thẻ nằm ở dải `y=15..105`, khớp với `RevenueByChannel` bên cạnh.

**Thẻ KHÔNG dùng icon nữa** — `image.show=false`, **giữ nguyên object ảnh**
để bật lại được. Thay vào đó **màu chữ của value = màu của icon cũ**:

| Thẻ | icon cũ | đo được từ PNG | dùng |
|---|---|---|---|
| Revenue | `kpi_revenue.png` | `#3878B8` | `#3D7EBF` |
| Target | `kpi_target.png` | `#C01820` | `#C51E24` |
| TC | `kpi_tc.png` | `#289878` | `#2E9C7A` |
| TA | `kpi_ta.png` | `#D07828` | `#D2792F` |
| GC | `kpi_gc.png` | `#5858A8` | `#5A5FA8` |
| GA | `kpi_ga.png` | `#106898` | `#136C99` |

Sáu màu đo được **trùng khít bảng màu đóng** ở §4b ⇒ không phải pha màu mới.
🔴 Việc này **phá lệ `chuẩn phòng ban §2d`** ("mọi chữ trên nền sáng → `#2D2D2D`") — người dùng chốt miệng
2026-09-24; **phải sửa chuẩn ở repo quản lý vùng**, xem §4b.

⚠ Thẻ chỉ có nhãn + value + `%`: **nhãn `label.fontSize=10D` bold `#2D2D2D`**, value **`18D`** bold
canh trái, `%` là **một `card` cũ RỜI** đặt dưới value — rời mới sửa được.

🔴 **CỠ SỐ CỦA THẺ = `18D`, CHUNG CHO MỌI THẺ**. Thẻ rộng `150`
nhưng cột số chỉ chứa **~90 px**, vì cột ảnh (`imageAreaSize 18L`) vẫn giữ chỗ khi ảnh đã tắt.
Đo bằng font Segoe UI đậm: ở cỡ 20, `78.54K` = 86 px (vừa) còn `139.04K` = 101 px ⇒ thẻ TA hiện
`139.0…` dù số đã rút gọn đúng 2 chữ số thập phân. Cỡ 18 ⇒ `139.04K` ≈ 91 px.
- Đổi cỡ thì đổi **cả hàng thẻ trên mọi trang**, không hạ riêng một thẻ (lệch cỡ với thẻ bên cạnh).
- `imageAreaSize` Desktop mới ghi đúng một giá trị `18L` ⇒ **đừng đoán giá trị khác** để nới cột số.
- Cổng `kpi-card` của `scripts/pbi_gate.py` báo đỏ khi `value.fontSize` khác `18D`.
- **"Card" = ô số nhỏ ở đầu trang, KHÔNG phải chart**. Luật cỡ 18 áp cho
  cả **card kiểu cũ** (`card`, tên `Card_*`, ví dụ lưới 25 ô của ABC Operation) — số của nó nằm ở
  `objects.labels.fontSize`. `Pct_*` là `card` cũ dùng làm dòng % dưới thẻ ⇒ **không** áp.

### 4d-bis. CARD TỰ TẠO 1–3 CÁI THÌ BỎ · CARD LEGACY THÌ GIỮ, THÊM CHO ĐỦ 4

> *"có mấy trang có 2-3 card thì để làm gì? bỏ luôn card đi"* — luật này **chỉ áp cho card TỰ TẠO MỚI**.

- **Card có sẵn từ Legacy thì GIỮ.** Dựng lại trên khuôn thẻ §4d, dùng đúng measure bản Classic đã nối, rồi
  **thêm card cho đủ tối thiểu 4** bằng chỉ số trang đó đang đọc. Lấy measure đã có trong model, ưu tiên cặp
  giá trị + dòng `Pct_` so kỳ như lưới ABC Operation.
- Card **tự tạo mới** (Legacy không có) mà trang chỉ có 1–3 cái ⇒ **xoá cả nhóm `Card`**, tab Tổng quan về
  `y=15 h=660`, xoá khỏi bookmark · `visualInteractions` · Glossary.
- Một card Legacy được coi là **còn** khi còn đúng id, hoặc measure của nó (hay measure bọc nó, `= [X]`) hiện
  trên một thẻ hoặc dòng `Pct_` cùng trang. Bỏ có chủ đích thì khai `dropped_visuals` (§4i).
- 📌 **Bản 26/09 áp sai**: đã xoá card Legacy của Daily Sales (3) · Executive (7) · Product Mix (3), rồi lượt cắt
  model xoá luôn `#Count Store This Month` và `%Total Cost Lt`. Dựng lại 27/09: Daily Sales 4 thẻ · Product Mix
  4 thẻ · Executive 7 thẻ, bằng mục `__cards__` của bộ dựng (§8); hai measure chép lại nguyên văn từ Classic.
- Cổng: `few-cards` (trang còn 1–3 card) + `legacy-parity` (card Legacy vắng mặt mà không khai lý do).
- 🔴 **MỌI ô số trên MỌI trang theo khuôn thẻ KPI — không còn lưới `card` kiểu cũ** *("cấu trúc card bạn cũng ko áp
  cho hết mọi trang, bộ dò ki vậy ko dò dc à")*. Đo 01/10: Operation 25 ô + Promotion Increase Sale 12 ô vẫn là `card` cũ, nền màu
  ngoài bộ (`#2BF23E`, `#730C0C`, `#34C7E1`) — cổng cũ không soi loại `card`. Nay dựng bằng `__cards__` (một tab được **nhiều hàng**:
  hàng thứ hai đặt ở `y = 110`, id nhóm theo `y`):
  - **Operation (người dùng chọn "2 hàng, Gap vào dòng %")**: hàng 1 Revenue · Target MTD · Target · FC · ADS · Sale LM; hàng 2 TC · TA ·
    GC · GA · Same Store. Mỗi chỉ số một thẻ, dòng % = so LMTD / of Target / FC vs LM / vs LY; 6 thẻ Gap tuyệt đối bỏ (đọc ở bảng
    Tháng/MoM); bảng Same Store một dòng thành thẻ. Dưới hai hàng: donut kênh + doanh thu theo ngày (dời từ tab Ngày, tab đó bỏ).
  - **Promotion Increase Sale (người dùng chọn "6 thẻ KM")**: 6 thẻ phần khuyến mãi — Sale · TC (of Sales / of TC, tỉ trọng, không tô) ·
    TA · GA · GS (vs all = KM / mọi bill − 1, measure mới ở cả 4 model) · GC (of GC). Số toàn cửa hàng bỏ khỏi hàng thẻ.
  - Cổng `card-structure`: `card` (trừ dòng `Pct_`) trên trang hiện ⇒ đỏ. Thử đỏ trên HEAD: 37 ô → 0.

### 4e. HÀNG CARD THUỘC TAB NÀO

**Hàng card là của tab "Tổng quan".** Tab "Chi tiết" **không có card** và chiếm **trọn** vùng nội
dung. ⇒ nhóm `Card` phải nằm **TRONG** nhóm `Tab1_TongQuan`, không được để ngoài.

> Luật này **thay** câu ghi ngày 23/09 *("hàng card KHÔNG đổi theo tab ⇒ nằm ngoài nhóm tab")*.

🔴 **Độ lệch 15px của thẻ LÀM HỎNG mốc trên của tab không có card.** Hộp `Card_*` ở `y=0` còn nền
`BG_*` ở `y=15`, nên hộp thẻ **nhô cao hơn phần nhìn thấy 15px** và kéo biên nhóm `Chart` lên `y=40`,
trong khi header cao `50`.

| | mốc trong `Chart` | tuyệt đối | |
|---|---|---|---|
| `Tab1_TongQuan` (có card) | `y=0` | `40..715` | ✅ 15px đầu là phần nhô **vô hình** |
| `Tab2_ChiTiet` (không card) | `y=0` | `40..715` | ⛔ **đè lên header** — |
| `Tab2_ChiTiet` đã sửa | `y=15` | `55..715` | ✅ cao `660` |

`660 = 320 + 20 + 320`, mọi số chia hết 5. **Tab nào không có hàng card thì phải tự bù 15px** —
đừng lấy mốc của tab có card áp sang.

**Mỗi thẻ đều phải có `%` bên dưới.** Chọn measure theo **DAX đã đọc**, không theo tên:

| Thẻ | `%` | DAX |
|---|---|---|
| Revenue | `%Revenue of Target` | `[#Total Sale]/[#Switch Target]` — tỉ lệ đạt |
| Target | `%Grow Sales of Target` | `[#Total Sale]/[#Switch Target] - 1` — vượt/hụt |
| TC · TA · GC · GA | `%Grow <X> vs LMTD` | `[#TM <X> Ld]/[#<X> LMTD Completed Day] - 1` |

⚠ Họ `%Grow … vs LMTD` là **họ duy nhất phủ đủ cả 4 chỉ số** — không có `%<X> of Target` cho
TC/TA/GC/GA. Đừng bịa tên measure theo quy luật; **mở `#Measure.tmdl` đọc DAX rồi mới gán.**

⚠ **Màu title của chart: `#2D2D2D`** (`chuẩn phòng ban §2d`). Bản Legacy để `#3300FF` — chép nguyên
là lệch chuẩn; 9 chart đã phải sửa lại.

### 4f. 🔴 LƯỚI CÁCH ĐỀU 5 — luật hình học của cả trang

**Mọi khe hở trên trang đều đúng `5`. Không có `10`, không có số lẻ.**

🔴 **CHIA ĐỀU LÀ BẰNG NHAU TUYỆT ĐỐI** *("nếu trên dưới chia bằng nhau thì số chia và vị trí nằm phải
giống nhau")*. Khe giữ `5`; khối nào được chia đều thì **cùng kích thước tới từng số lẻ**, kể cả khi ra ngoài lưới 5:
2 khối trên vùng tab cao 660 = `327.5 + 5 + 327.5` · 2 cột trên 1270 = `632.5 + 5 + 632.5` · 4 ô trên 1270 = `313.75 × 4`.
**Cấm làm tròn rồi dồn phần thừa cho một ô** (`325 + 5 + 330`, `315 · 315 · 315 · 310`) — đó là lệch thấy được bằng mắt.
Đo 08/10: 33 cặp `325/330` ở các report Mix của ABC, 4 hàng thẻ `315/310` + 3 cặp ở XYZ. Máy canh: luật `equal-split`; ngoại lệ
của `grid5` chỉ cho số lẻ khi khối có anh em cùng cỡ, khối liền sau nó, và những gì nằm trong nó.

```
canvas 1280 x 720 · header 0..50
vùng nội dung   x 5..1275   y 55..715      <- lề trang 5 mỗi phía
```

| Khe | Bằng |
|---|---|
| lề ngoài cùng của trang | `5` |
| từ đáy header xuống khối đầu tiên | `5` |
| giữa hai khối dashboard bất kỳ | `5` |
| **chart thụt vào trong khung `BG_` của chính nó** | **`5` mỗi phía** |
| từ rìa phải `BG_` tới nút của dashboard đó | `5` |

🔴 **Bẫy "lề 10": lồng hai lớp cùng thụt 5.** Nhóm `Chart` đã ở `x=5`, con bên trong lại để `x=5`
nữa ⇒ ra `10`. **Lớp ngoài giữ lề, lớp trong bắt đầu từ `0`.**

**Khối `BG_` + chart:** `BG_` đặt `(0, 0, w, h)`; chart đặt `(5, 5, w−10, h−10)`.
Nút của dashboard neo **góc phải trên**: `x = w − 5 − rộng_nút`, `y = 5`; hai nút cạnh nhau cách `5`.

**Bố cục trang 1 đã chốt** (toạ độ trong nhóm `Chart` ở `(5,40)`):

```
Tab1_TongQuan (0,0,1270,675)          Tab2_ChiTiet (0,15,1270,660)
  Card            (0,  0,1270,105)      RevenueByStore      (  0,  0,1270,325)
  RevenueTrend    (0,110, 720,250)      RevenueDistribution (  0,330, 560,330)
  ChannelMix    (725,110, 545,250)      ChannelByMonth      (565,330, 705,330)
  OldStore        (0,365,1270,310)
hàng thẻ: 6 x 150 khe 5  +  pie 340  =  1270
```

### 4g. TITLE VÀ LEGEND — một cỡ, đều NEO TRÁI

```
title  : fontSize 12D · alignment 'left' · fontColor '#2D2D2D'
legend : chart trục 'Top' (neo trái) · donut/pie 'RightCenter'   <- 'TopLeft' KHÔNG hợp lệ
```
⛔ **Không canh giữa.** Bản Legacy để mỗi chart một cỡ (`9` · `12` · `13` · `17`) và canh giữa —
chép nguyên là lệch. Đã phải nắn lại 9 chart.

### 4h. TÊN BÁO CÁO TRONG HEADER phải theo TÊN FILE ĐÃ CHỐT

File là `ABC_02_STORE-REPORT-AM_Live` (Store Report) mà header vẫn để `REVENUE` ⇒ sai. **Đổi tên file thì sửa luôn chữ
trong header** — nó nằm ở `visualContainerObjects.title.text` của shape `TXT_ReportType`. Header chỉ lấy phần
`<CHỨC-NĂNG>`, thay `-` bằng dấu cách (`STORE REPORT`): **không** đưa số, mã phòng, bậc hay hậu tố cách nạp
`Live`/`Scheduled` vào header (04/10, khuôn file chốt lại 05/10).

### 4i. HÀNG CARD CHỈ CHỨA CARD

Nhóm `Card` chỉ chứa **nhóm thẻ**: nền `BG_` + `cardVisual` hoặc `Card_*` + dòng `Pct_`. Chart, matrix hay bảng
chèn vào dải card là **thừa ⇒ bỏ**. Quyết định này của người dùng **thắng** luật đủ visual Legacy (§5k). Visual bỏ thì
khai theo id ở `dropped_visuals` trong `config/pbi-gate.json`, **kèm lý do**; cổng `legacy-parity` bỏ qua đúng id đó.
- Đã áp 27/09: Monthly bỏ pie `REVENUE BY CHANNEL` (doanh thu theo nhóm kênh) khỏi dải card. Sáu thẻ giãn đều
  hết bề ngang, rộng `205/210` xen kẽ, cách nhau 5. Cơ cấu kênh vẫn đọc được ở donut `ChannelMix` ngay dưới.
- Cổng `card-row`.

### 4j. MỌI % PHẢI GHI KỲ SO VÀ CÓ MÀU TĂNG/GIẢM

Một con số `55.73%` trần là sai, vì người đọc không biết nó so với gì. Thiếu một trong hai thứ dưới là sai.

1. **Kỳ so nằm trong con số hoặc trong nhãn.** Dòng `Pct_` dưới thẻ không có nhãn ⇒ đưa kỳ vào format:
   ```
   formatString: +0.00% "MoM";-0.00% "MoM";0.00% "MoM"
   ```
   **Không đổi format của measure gốc**: bảng và trục chart cũng dùng nó, đổi là mỗi ô mang thêm chữ `MoM`.
   Làm **measure bọc** riêng cho dòng `Pct_`, tên theo `chuẩn phòng ban §2c ③c`:
   `%MoM <Chỉ số> with symbol = [<measure gốc>]`. Trang tuần dùng `%WoW …`; tỉ lệ so chỉ tiêu dùng
   `%<Chỉ số> vs Target with symbol` hoặc `%<Chỉ số> of Target with symbol`.
   Trang lọc tháng đang chạy thì so **MTD với cùng số ngày tháng trước (LMTD)**, đừng so nửa tháng với cả tháng.
   Các measure `%Grow … vs LMTD` của model đã tính đúng như vậy.
   Thẻ `Card_*` kiểu cũ hiện nhãn tên measure (`%Grow GA vs LMTD`), nên kỳ đã nằm trong nhãn. Cột bảng và series
   chart cũng thế: tên cột, tên series đã nói kỳ.
2. **Màu theo chiều, BẮT BUỘC.** Tăng `#00B050`, giảm `#C51E24`. Tô bằng **màu có điều kiện trên CHÍNH measure
   đó**, hoặc measure nó bọc: `> 0` xanh, `< 0` đỏ. Tỉ lệ đạt chỉ tiêu (`%… of Target`, `%FC vs LM`) lấy ngưỡng `1`
   thay cho `0`. Cấm % một màu cố định (xám/đen). Hai mã `#009900` / `#FF6666` của khuôn Weekly cũ nằm ngoài bảng
   màu, đã nắn và đã gỡ khỏi `PALETTE` của cổng.
   - 📌 **Lỗi bắt được 27/09:** 5 dòng `Pct_` của Weekly hiện `%Grow … WoW` nhưng tô màu theo `%Revenue of Target`.
   - Áp cho **chữ**: dòng `Pct_`, số của thẻ `Card_*`, nhãn dữ liệu chart, `values.fontColor` của bảng.
   - **Chỉ hai màu:** dải vàng "gần đạt" của tỉ lệ chỉ tiêu (`#ACAC04`, `#A38600`, `#F1A1A1`) bị gỡ,
     chỉ còn ngưỡng chính (đạt `≥ 1` xanh, dưới đỏ). Nền ô bảng tô tông nhạt (`values.backColor`: `#84F49E`,
     `#EAAEB4`…) chuyển thành **màu chữ** theo cặp trên, nền bỏ. Nền dạng thang màu (`FillRule`, bản đồ nhiệt)
     không phải màu tăng/giảm ⇒ giữ. Lệnh `--pct` của bộ dựng (`PCT_TWO_COLORS` trong `mix_specs.py`).
   - **% tỉ trọng hoặc tỉ lệ chi phí** (phần của một tổng, không có chiều tốt/xấu: `%TC of Promotions`,
     `%Total Cost`) khai ở `pct_neutral` trong `config/pbi-gate.json`, kèm lý do. Nhãn vẫn phải nói tỉ lệ của gì.

Cổng: `pct-period` (dòng `Pct_` không nhãn thì format phải có chữ kỳ) · `pct-color` (màu điều kiện, đúng measure, đúng hai mã).

3. **MỌI thẻ trong hàng card đều có dòng %** *("mọi card nên có % mới đủ chứ")* — thẻ không có
   dòng `Pct_` là thẻ thiếu. Thẻ mà bản thân số đã là tỉ lệ (`% Target`, `% Margin`…) thì dòng % là **thay đổi so kỳ
   trước tính bằng ĐIỂM %**, format `+0.00 "pp MoM"` — không dùng `%` lần hai, vì `+5.00%` của một tỉ lệ đọc ra thành
   "tăng 5 phần trăm của tỉ lệ". Cùng luật màu mục 2 (> 0 xanh, < 0 đỏ).
   Số mà TĂNG là XẤU (hoàn trả, chi phí) thì dòng % **đảo màu**: tăng đỏ, giảm xanh (`mix_cards.py`: `(measure, label, 'inverse')`).

### 4k. BỘ MÀU = THEME CỦA VÙNG (`theme_file`)

> Qua 6 vòng thử trên Mix AM trong ngày 30/09: *"màu đậm nhiều quá, nóng lạnh ko cân bằng"* → *"card cũng phải đủ bộ màu"* →
> *"chart cần dùng bộ màu nhạt, còn card thì màu đậm"* → *"có bộ màu nào khác luôn để dùng cho chart"* → *"chart ko nên dùng
> các màu trùng với tông xanh lá và đỏ"* → *"màu nào trung tính hơn cho mấy cột, màu xanh lá cho đậm hơn"*.

| Chỗ | Màu | Luật |
|---|---|---|
| **Số trên thẻ** | ô màu theme theo thứ tự (= `dataColors` của theme vùng) | thẻ thứ *i* → ô *i*, quay vòng (01/10, thay bộ B) |
| **Cột chính của chart** | **đúng dãy `dataColors` của theme vùng (`theme_file`)** | mỗi chart một màu theo thứ tự, chart kế tiếp trong tab nối dãy; cột chính thứ hai cùng chart lấy màu kế tiếp (*"check Original mẫu của t đang xài màu gì, xài chính xác dãy màu đó"* — thay dãy trung tính) |
| **Kỳ so** (tên có LY · LM · LMTD · LW · PY · Last · Target) | `#A2A2A2` (= `neutral` của theme vùng), kỳ so thứ hai `#595959`; chart có **3–4 kỳ so** dùng `#A2A2A2 · #7F7F7F · #595959 · #3F3F3F` theo thứ tự (LW·LM·LY·Target cùng ra `#595959`) — chart 1–2 kỳ so giữ nguyên màu cũ (`compares_by_count`) | measure `%` không bao giờ là kỳ so, kể cả tên có chữ Target |
| **Đường % (Y2)** | hai màu đậm nhất của theme vùng | nhãn % **in đậm**, `labelPosition 'Above'`, **không** ô nền (ô nền che mất đường) |
| **Tăng / giảm** | chữ trên nền trắng (dòng % dưới thẻ, cột % matrix): `#007A36` / `#C51E24` · **nhãn % trên chart**: xanh sáng `#4ADE80` / `#C51E24` | `#00B050` bỏ (2,9:1 trên trắng). Nhãn chart đè lên cột đậm của theme vùng: `#007A36` chỉ 1,2–1,5:1 ⇒ *"màu % xanh lá nên xanh nhạt và sáng hơn"*; `#4ADE80` 3,6–8,5:1 trên cột đậm, nhưng chỉ 1,7:1 trên trắng nên KHÔNG dùng cho chữ trên nền trắng |
| Pie · chart chia theo kênh | các màu của theme vùng theo thứ tự · `(Blank)` `#A2A2A2` | = `dataColors` của theme |

- Dãy của theme vùng có thể có xanh lá và xanh ngọc đậm — dùng NGUYÊN dãy của theme (thay luật "chart cấm họ xanh lá" của chiều 30/09); nhãn % trên chart đọc được nhờ xanh sáng `#4ADE80` in đậm.
- 🔴 **Màu của dãy ghi bằng THAM CHIẾU THEME (`ThemeDataColor`), KHÔNG ghi mã HEX** *("do bạn chỉnh thủ công nên màu
  của theme ko áp dc … áp màu của theme y chang màu của ori")* — như file mẫu Original. Theme của Mix = theme vùng (`dataColors`
  + `good` · `neutral` · `bad`). Thẻ thứ *i* → ô *i* của theme; chart theo ô, nối dãy trong tab. Chỉ màu
  hệ thống (xám kỳ so, xanh/đỏ tăng giảm, header matrix) còn ghi mã. `mix_palette.colour()`; cổng `chart-palette` + kiểm thẻ chỉ
  nhận `ColorId 2..9`.
- 🔴 **MỌI chart đều mang màu của bộ, không chart nào để trống** *("mọi chart đều phải theo mã màu, bạn ko áp hết
  đủ cho chart")*. Chart của measure (không có trường chia) phải khai màu từng chuỗi — để trống thì Power BI vẽ theme 1/2 cho
  MỌI chart, hai chart cạnh nhau trùng màu. Phủ đủ: loại có chữ `Chart` **và** `treemap` · `funnel` (treemap đặt trường chia ở vai
  `Group`, không phải `Category`); measure của **mọi** bảng measure (`#Measure.` và `Measure.` của model OM). Đo 01/10 trước khi
  sửa: 2 treemap Daily còn màu Legacy (`#4FAEED`, `#AA34BC`…), 6 chart Power Consumption bị bỏ qua vì `Measure.`. Cổng
  `chart-palette` (+ `chart-coloured`: chart của measure không khai màu ⇒ đỏ).
- 🔴 **NHÃN DỮ LIỆU KHÔNG CÓ Ô NỀN — MỌI SỐ % IN ĐẬM** *("đã có luật ko tạo nền cho % phía sau rồi mà, nó làm che mất
  chart, chỉ in đậm bold số lên thôi, in đậm mọi số %")*. Luật cũ chỉ áp cho đường % trục Y2 có màu điều kiện ⇒ 10 mục nhãn còn ô
  nền (mục chung `all` của chart, nhãn chuỗi số tiền) ở Weekly · Daily · Power Consumption. Nay: **mọi** mục `labels` của mọi chart
  `enableBackground false` (bỏ `backgroundColor`); **mọi** chuỗi % (measure tên bắt đầu `%`, ở Y · Values · Y2) có nhãn thì
  `bold true`. Áp cả dòng `Pct_` dưới thẻ.
  🔴 **CHỖ ĐẶT KHOÁ — tái phạm 01/10, người dùng bắt lại:** `bold` · `enableBackground` · `labelPosition` là khoá của **cả chuỗi** ⇒ nằm ở
  mục `labels` có selector **chỉ `metadata`** (Desktop ghi: bold 37/52, enableBackground 106/124 ở dạng này). Mục theo điểm
  (`data: dataViewWildcard` + `metadata`) **chỉ chứa màu điều kiện** — để bold / nền ở đó thì Power BI BỎ QUA, nhãn mất đậm và hiện
  lại ô nền mặc định. Lỗi do chính lượt chuyển màu sang theo điểm (`b3be6525`) gây ra: 27 nhãn % / bản. Đã sửa + nhìn render
  trang Monthly (nhãn đậm, không nền). Cổng `pct-label` đỏ khi khoá tĩnh nằm trong mục theo điểm. ⚠ Cột % trong **matrix** chưa in đậm: không file Desktop nào trong estate ghi chữ
  đậm theo từng cột (đếm 01/10) ⇒ chưa có khoá để chép, KHÔNG tự chế. Cổng `label-box` · `pct-bold` (thử đỏ trên HEAD: 10 lỗi → 0).
- Mọi cặp màu đứng chung một chart đã chấm bằng `validate_palette.js` (skill `dataviz`); đổi màu thì chấm lại, không pha bằng mắt.
- **Máy làm:** `PALETTE` trong `mix_specs.py` + `python scripts/mix_palette.py --cards`. **Máy canh** *(01/10: "mấy cái skill đều phải lên
  script dò dc hết")*: `theme-standard` (theme report = theme chuẩn của kho) · `chart-palette` (ô theme / màu ngoài bộ, hai chart cùng tab
  trùng màu) · `chart-fill-shape` · `compare-grey` (kỳ so phải xám) · `pct-label` (nhãn % đậm, `Above`, không nền) · `pct-color`.
  Thử âm 01/10 trên bản sao: 5/5 lỗi cố tình gây đều bị bắt.
- 🔴 **Chart MỘT chuỗi ghi màu ở mục `dataPoint` KHÔNG selector** — gắn `selector.metadata` thì Desktop LỜ ĐI, vẽ màu 1 của
  theme, không báo gì. Đo trên file Desktop tự ghi: combo 1 cột dùng mục không selector 15 lần; từ 2 measure trên trục chính
  mới dùng `metadata`. Trả giá 30/09: 6 chart trang Product + `REVENUE & TARGET` cùng một màu. Cổng `chart-fill-shape`;
  luật trùng màu trong tab nay xét cả mục không selector (trước đó chart một chuỗi lọt qua).

### 4l. MATRIX — MỘT KIỂU CHO MỌI BẢNG

> *"matrix đang quá xấu, ko có cả header bold, màu header, rồi màu condition, cái này đều phải đưa vào luật và skill áp dụng cho mọi matrix"*
> — đo 30/09: 36 matrix của Mix AM, 2 cái header đậm, 24 cái mỗi cái một màu header, 23 cột % không có màu tăng/giảm.

| Phần | Chuẩn |
|---|---|
| Header cột | nền `#44546A`, chữ `#FFFFFF` **đậm**, cỡ `10D`; màu header riêng từng cột (Legacy) bỏ |
| Cột tên hàng | chữ `#2D2D2D` trên nền trắng |
| Giá trị | chữ `#2D2D2D`, xen kẽ hàng `#FFFFFF` / `#F4F6F8` (`backColorPrimary/Secondary`); nền phẳng từng cột bỏ, **heat-map (`FillRule`) giữ** |
| Total / subtotal | **đậm**, nền `#E3E8EE` |
| Cột % | tô theo CHÍNH measure đó: tăng `#007A36`, giảm `#C51E24`; tỉ lệ đạt chỉ tiêu ngưỡng `1`. **Nhận cột % theo FORMAT của measure**, không theo tên (`vsWTDLW` là %). Tỉ trọng / chi phí khai `pct_neutral` thì không tô |
| Lưới | chỉ kẻ ngang `#E3E3E3` 1 px, bỏ vạch dọc |
| **Tiêu đề** | **giống tiêu đề chart**: hiện, canh trái, Segoe UI Semibold `12D`, `#2D2D2D`, KHÔNG nền tiêu đề (bỏ dải hồng Legacy) — *"mấy cái matrix đang ko đúng cấu trúc title giống mấy chart kia"*. Chữ = chữ Legacy nếu có; không có thì tiêu đề người đọc theo trường của bảng (`mix_specs.MATRIX_TITLES`, 26 bảng) — CẤM hiện tên kỹ thuật `Table_…`. Spec bộ dựng để tên `None` cho các bảng này, nếu không lần dựng lại sẽ tắt tiêu đề |

- **Bản đồ nhiệt (màu mức độ)** *(bảng giờ × thứ + khung giờ × thứ)*: một tông, trắng →
  màu đầu của theme pha trắng 45% (chữ `#2D2D2D` còn 5,3:1 ở ô đậm nhất, khỏi cần màu chữ theo giá trị vì chưa có khuôn
  Desktop để chép); thang tính trên CẢ bảng; dòng tổng không tô (`dataViewWildcard matchingOption 1`). Lệnh
  `mix_palette.py --heatmap <pageId> <visualId>…`. Chart không tô (chiều cao cột đã nói mức độ).
  🔴 **Điểm màu trong `FillRule` là `{"Literal": …}` TRẦN — KHÔNG bọc `expr`** *(05/10)*: bọc `{"expr": {"Literal": …}}`
  thì vẫn VẼ đúng, nhưng Desktop **không lưu được nữa** — Save · Save As · Publish chết lặng, không báo gì
  (`NullReferenceException` ở `GetEnhancedReportDocument`). Hai bản Mix mất Save một ngày vì đúng chỗ này (`84cb1304`),
  dò ra bằng chia đôi commit trên sandbox. Cổng `fillrule-bare` chặn từ nay.
  🔴 **Thang màu Legacy CHẾT LẶNG:** đo 04/10 mỗi bản Mix có **56 mục `FillRule`** trỏ tên trường cũ (`Measure.TotalSale`,
  `Measure.Sale/DateofWeek`…) không còn trong bảng ⇒ Power BI lờ đi, không báo gì. `--heatmap` bỏ mục chết của bảng nó tô.
  Gốc (đo 3 bản): Legacy + Classic có 21 mục chết sẵn; Mix thêm **33** — bước nối lại field của Mix đổi `Input` của thang sang
  tên kho nhưng KHÔNG đổi `selector.metadata` (Classic đổi cả hai). Sửa 04/10 (*"bổ sung đủ màu lại"*):
  `mix_palette.py --repair-fillrules` — `Input` là một field của bảng ⇒ trỏ selector về nó (màu về như Legacy, 33/bản);
  `Input` không thuộc bảng ⇒ xoá (21/bản, Legacy cũng chưa từng hiện). Cổng `fillrule-dead` (thử âm: gài 1 ⇒ đỏ đúng 1).
  ⚠ Đổi tên field trên visual thì đổi CẢ `Input` lẫn `selector.metadata` của mọi `FillRule`.
- **Máy làm:** `python scripts/mix_palette.py --matrices` (chạy lại được). **Máy canh:** cổng `matrix-style` (header · xen kẽ · total · cột % · tiêu đề) + `matrix-grid` (chỉ kẻ ngang) + `topn-column` (Top/Bottom N cột đứng) — thử âm trên Mix OM chưa tô: 42 lỗi.
- 🔴 **Chart Top / Bottom N = CỘT ĐỨNG** (`clusteredColumnChart`), không cột ngang — *"mẫu này nên là chart dọc mới đủ hiện top5"*.
  `python scripts/mix_palette.py --bars-to-columns` (đổi `visualType`, giữ nguyên vai trò + định dạng; 12 chart Product · Product Mix).
  ⚠ Top 5 hiện 1 món KHÔNG phải lỗi khi tháng mới vừa bắt đầu (đo 01/10 sáng: 1 hoá đơn trong ngày) — chọn tháng trước để kiểm.
- Mọi khoá đều do Desktop ghi (`columnHeaders.backColor` 356 lần, `values.backColorSecondary` 172, `subTotals.bold` 15…).

- 🔴 **TÊN CỘT = CHỮ NGƯỜI ĐỌC, TIẾNG ANH TITLE CASE** *(chốt 13/10: "tên cột đang ko đúng chuẩn loạn xạ hết" → chọn tiếng Anh,
  cùng giọng tiêu đề visual)*: mọi trường đang hiện trên bảng / matrix / chart (displayName, không có thì tên trường) — cấm gạch dưới
  (`chi_tieu`, `ITEM_NAME`), số đuôi (`Revenue2`, `StoreName2`), chữ dính (`StoreName`, `Monthnumber`), từ ALL-CAPS không phải viết tắt
  nghiệp vụ (`PARENT3NAME`, `DISCOUNT`), `%` trơn / `%1` (phải nói % của gì: `% Revenue`, `% Ebitda`). Đặt `displayName` ở projection,
  tên measure giữ nguyên. Cổng `column-name` (Mix/Main; Classic giữ chữ Legacy). 03 Mix đã đặt: Line · Code · Cost Line · Store ·
  Actual · % Revenue · Actual LY · Growth LY · Base Month · % Revenue Base · Variance · % Variance · LYTD.
- 🔴 **BIẾN TIẾNG ANH, DỮ LIỆU ĐƯỢC TIẾNG VIỆT** *(chốt 18/10)*: tên measure là biến ⇒ tiếng Anh, không dấu tiếng Việt
  (`'Doanh Thu Thuần'` ⇒ `Net Revenue`; chữ người đọc cần đặt ở `displayName`) — cổng `measure-name` (Mix/Main). Chữ hiện ra mà là
  NỘI DUNG dữ liệu thì giữ tiếng Việt: measure đếm đúng MỘT mặt hàng (DAX lọc một `ItemID`, vd `EcomComboQty_TGVI0087`) mang tiêu
  đề là tên mặt hàng (`Mì trộn tương đen Super Cay (120gr/gói)`) — `column-name` và `glossary-cover` bỏ qua tiêu đề đó.
- 🔴 **MỖI % PHẢI ĐƯỢC KHAI: TỈ TRỌNG hay CÓ CHIỀU** *(13/10: "% đang ko có màu xanh đỏ đúng chuẩn lên xuống")*: tên `% … of Revenue /
  of Total` không nói được — `%Actual of Revenue` là tỉ trọng của một dòng P&L (cột trộn doanh thu và chi phí ⇒ không màu), `%Ebitda of
  Revenue` là biên lợi nhuận (> 0 xanh). Tỉ trọng ⇒ `pct_neutral` (pbi-gate.json), có chiều ⇒ `PALETTE['pct_threshold']` (mix_specs) —
  nhãn % trên chart chỉ được tô khi measure nằm trong danh sách này. Cổng `pct-decided` (chưa khai ⇒ đỏ; % có chiều trên Y2 thiếu luật màu nhãn ⇒ đỏ).

### 4m. ICON TRÊN THẺ KPI — neo góc phải trên, màu của số, nét 17,5 px

> *"khoảng trống bên phải của card giờ sẽ để icon, phần icon là phần khó và phải làm cho kỹ"* → sửa cùng ngày: *"chỉ offset 5 2
> cạnh trên thôi, ở dưới cách ra để icon neo lên góc phải trên, cho nó nhỏ lại tầm 40%, mục đích là phải ko chạm vào phần chữ ở hàng 3"*.

| Điều | Luật | Số đo (thẻ cao 90) |
|---|---|---|
| Khung | **hình vuông neo góc PHẢI TRÊN**, cách mép trên và mép phải của nền thẻ (`BG_`) đúng **5 px**; phía dưới để trống | cạnh = 60% của `(cao − 10)`, làm tròn XUỐNG lưới 5 ⇒ **45 px**, y 20–65 |
| Không chạm chữ | dòng % (hàng 3, `Pct_`) bắt đầu dưới đáy icon ≥ 5 px; hộp số (`Card_`, hàng 2) dừng trước icon 5 px | `Pct_` y 70 · `Card_` rộng = `x_icon − 5` |
| Màu | **màu của chính số trên thẻ** (ô theme của thẻ đó) — sinh từ bản đen của kho, giữ alpha, tên `<icon>_<hex>.png` trong `RegisteredResources` của report | thẻ 1 → ô 1 của theme · thẻ 2 → ô 2 … |
| Nét | MỌI icon cùng mốc của kho **17,0–18,0 px trên ảnh 512** (`2 × px đục / px viền`, chuẩn thiết kế của vùng §KHO ICON) | 11 icon đo 17,3–17,7 |
| Nội dung | một icon nói đúng chỉ số, outline ít nét, **Tabler (MIT)** | xem bảng dưới |

| Thẻ | Icon | | Thẻ | Icon |
|---|---|---|---|---|
| Revenue · Revenue MTD | `cash-banknote` | | GC | `users` |
| Target | `target` | | GA | `user-dollar` |
| TC | `receipt` | | Gap vs LMTD | `arrows-diff` |
| TA | `receipt-dollar` | | COGS · COGS LT | `package` · `packages` |
| ADS | `calendar-dollar` | | Stores | `building-store` |

- **Máy làm:** `python scripts/card_icons.py render` (tải SVG Tabler 3.19, Chrome headless 512 px, **dò `stroke-width` tới khi ĐO ra
  17,5 ± 0,5** — Tabler mặc định 2 ⇒ 42,7 px; 11 icon ra 0,706–0,787), ghi bản ⬛/🟥/⬜ vào kho `repo quản lý vùng/assets/icons/` + dòng
  trong `README.md`; `MIX_ROOT=<report> python scripts/card_icons.py place` (visual ảnh `Image_<Key>` trong nhóm thẻ, id cố định theo
  trang + key ⇒ chạy lại không đẻ thêm; mọi bookmark chụp thẻ thì chụp luôn icon cùng trạng thái). Thẻ mới ⇒ thêm vào `ICONS`.
- **Máy canh:** cổng `card-icon` (thiếu icon · sai khung/vị trí · ảnh chưa đăng ký · màu khác màu số · nét ngoài 17–18 px · dòng %
  chạm icon · hộp số chạy dưới icon). Thử âm: Mix OM chưa đặt ⇒ 26 lỗi; bản khung vuông cũ ⇒ 32 hộp chữ chạy dưới icon.
- Khuôn visual ảnh = khuôn Desktop ghi (`image.sourceFile` + `fit 'Fill'`, repo phòng ban `logo công ty`); cổng `card-row` và `bg-inset` miễn
  đúng `Image_<Key>` nằm cạnh `Card_<Key>`.
- ⚠ Chưa làm: lưới thẻ KIỂU CŨ (`card`, không có `BG_` riêng) ở trang Operation (25 ô) và Promotion Increase Sale (12 ô).

## 5. Dải tab — khuôn gốc KHÔNG có, nên phải tự dựng cho đúng

Khuôn gốc không có tab (canvas 720 vừa một màn) ⇒ luật lấy từ `pbip §3`, ba cái hay sai: **bookmark
tab chụp CẢ TRANG** (`targetVisualNames: []` + `suppressData: true`) · **khai đủ mọi nhóm lồng
giữa** · **mỗi tab hai shape nhãn cộng một vạch đỏ**, đổi tab lật cả ba.

~~🔴 Nhãn tab là `shape`, mà `shape` mang `visualLink` KHÔNG bấm được — phủ PNG trong suốt lên trên.~~
🔴 **LUẬT NÀY SAI, ĐÃ BỎ (2026-09-24).** `shape` mang `visualLink` **bấm được bình thường** — đo trên
`Main`: `BG_UserGuide` là `shape` và đang mang `visualLink`. Nút của tôi im lặng là vì **đặt sai chỗ**,
xem §5b. **Không cần PNG hit-area**; người dùng đã nói thẳng *"tab ko cần image chỉ text"*.

**Vùng nội dung** = `720 − 50 (header) − 5 − 30 (dải tab) − 5 − cao hàng card`; hàng card `90` ⇒ còn
**530**, khe `5` giữa hai khối. Công thức đếm tab: [`reference/measured.md`](reference/measured.md) §4.

## 5b. 🔴 BA LỖI LÀM VỠ FILE — đều do TỰ CHẾ KHOÁ, Desktop chặn mở *(2026-09-23)*

> **Gốc chung của cả ba: viết fragment PBIR theo suy luận thay vì chép từ file ĐANG CHẠY.**
> JSON vẫn hợp lệ nên **không cổng parse nào bắt được** — chỉ Desktop bắt, mà lúc đó đã mất một lượt.
> **Luật: mọi khoá phải ĐỌC ĐƯỢC từ một file thật trước khi dùng. Không thấy = không có.**

| # | Tôi viết | Đúng phải là | Desktop báo |
|---|---|---|---|
| 1 | `visualContainerObjects` ở **gốc** `visual.json` | nằm **trong `visual`** | *"additional property … in the root property"* |
| 2 | `singleVisualGroup` trong `visualContainers` | nhóm đi lối riêng: **`visualContainerGroups`** | *"additional property 'singleVisualGroup' …"* (30 lỗi một lượt) |
| 3 | `visual.visualLink` | **`visual.visualContainerObjects.visualLink`** | không báo gì — **nút im lặng không bấm được** |
| 4 | `$schema` bookmark bản **1.1.0** | **2.1.0** — đúng bản Desktop đang ghi trong chính file đó | tuỳ ca |
| 5 | thiếu cụm `objects.layout` trên `cardVisual` | phải có `layout.style='Cards'` | không báo — **`value.bold` chỉnh cũng như không** |

### 5b-bis. 🔴 "CHỈ CÓ TRONG FILE MÌNH" ≠ "MÌNH BỊA RA"

`image.imageAreaSize` và `image.fit` chỉ xuất hiện trên 6 thẻ của bản Mix, không thấy ở `Main` —
tôi kết luận là mình tự chế rồi **xoá cả hai**. Sai: **người dùng tự bóp icon trong Desktop**, và Desktop
ghi ra hai khoá đó. Xoá xong `cardVisual` hết giới hạn vùng ảnh ⇒ **icon phình chiếm hết thẻ, nhãn bị
cắt còn `REVE...`**. Người dùng đã bảo bóp nhỏ hai lượt, tôi phóng to lại một lượt.

> **Luật:** khoá lạ mà **chỉ mình file này có** thì hỏi *"ai ghi ra nó?"* trước khi xoá.
> `git log` không trả lời được (file chưa commit) ⇒ **hỏi người dùng**. Xoá một khoá đang có tác dụng
> tốn đúng bằng bịa thêm một khoá không có.
> Hệ quả thứ hai: `fit` **là khoá thật** của visual `image` (`fit='Fill'`) **và** của `cardVisual`.
> Đối chiếu phải đúng LOẠI visual, cấm chặn mù theo tên khoá.

**Khuôn bookmark 2.1.0 đúng — đo trên `Main` VÀ trên bookmark Desktop tự ghi trong bản Mix:**
```
$schema  .../definition/bookmark/2.1.0/schema.json     <- phải trùng bản Desktop đang ghi
options  { targetVisualNames: [] | [danh sách], suppressData: true }
explorationState = {
  version: "1.3",  activeSection: "<pageId>",  objects: {},
  sections: { "<pageId>": {
      visualContainers      : { <CHỈ visual LÁ> : { "singleVisual": {
                                   visualType, objects:{},
                                   display:{mode:"hidden"}     <- chỉ khi ẩn
                              } } },
      visualContainerGroups : { <CHỈ NHÓM cấp trang> : {
                                   isHidden: bool,
                                   children: { <nhóm con>: {...} }   <- LỒNG NHAU
                              } }
  } }
}
```
🔴 **Lá và nhóm KHÔNG được trộn.** Đo `MCP_Tab2_NuaDauNam`: `visualContainers` 98 mục **toàn lá, 0
nhóm**; cây `visualContainerGroups` 30 node **toàn nhóm, 0 lá**. Chỉ **nhóm cấp trang** làm khoá
ngoài cùng, nhóm con nằm trong `children`.

⚠ **Bật/tắt cả một khối thì khai ở `visualContainerGroups`**, đừng đi lật từng lá — ngắn hơn, và
không vỡ khi thêm visual vào nhóm.

⚠ **KHÔNG tắt tiến trình Power BI Desktop** — máy có thể đang refresh một
file khác, giết tiến trình là mất lượt refresh dài. Muốn đóng thì **liệt kê PID + tiêu đề cửa sổ**,
đóng **đúng PID đang giữ file mình**, xong việc **tự mở lại**.

## 5c. 🔴 HAI MỤC FORMATTING — viết nhầm mục là "chỉnh mà không thấy đổi" *(2026-09-24)*

Desktop tách mỗi cụm format làm **hai mục** trong mảng, và **chỉ một mục có tác dụng**:

```
"fill": [
  { "properties": { "show": ... } },                          <- mục THƯỜNG: chỉ bật/tắt
  { "properties": { "fillColor": ... , "transparency": ... },
    "selector": { "id": "default" } }                         <- mục CÓ selector: GIÁ TRỊ THẬT
]
```
Đo trên `12ce85014a78cb37c098` (nền header, Desktop ghi): `show` nằm mục thường, `fillColor` nằm mục
`selector.id = "default"`. **Viết màu vào mục thường ⇒ Desktop bỏ qua im lặng** — đúng cái người dùng gọi là
*"sai màu"* ở dải tab.

✅ **Cách an toàn: ghi CẢ HAI mục cùng một giá trị.** Mục nào thắng cũng ra một kết quả.

### 5d. TRẠNG THÁI BẬT CỦA NÚT — phải NHÌN THẤY được

Khuôn gốc đổi **ảnh** giữa hai trạng thái: `dictionary_3_white.png` (tắt) ↔ `dictionary_3.png` (bật).
Bộ icon bản Mix **không có biến thể "bật"** ⇒ đánh dấu bằng **khung đỏ** trên nút `_On`:

```
visualContainerObjects.border = { show:true, color:'#C51E24', width:2D, radius:6D }
```
🔴 **Cặp `_On`/`_Off` mà dùng CÙNG một ảnh thì bấm xong không thấy gì đổi** — người dùng sẽ báo
*"nút chưa có trạng thái bật"*. Đã trúng với nút Glossary.

### 5e. 🔁 DẤU HIỆU LẶP: Desktop Save là LẬT hết trạng thái mặc định

Cứ mỗi lần người dùng mở Desktop rồi Save, **mọi cặp `_On`/`_Off` và mọi visual ẩn theo lượt xem con đều
về "hiện"**. Đã trúng **hai lần** trong cùng một ngày. ⇒ Giữ một bước **đặt lại mặc định** chạy được
nhiều lần, và chạy nó **trước khi nghiệm thu**, đừng tin trạng thái mình ghi lượt trước còn nguyên.

### 5f. NÚT BẬT/TẮT — hai nút chồng nhau phải KHỚP TỪNG SỐ

```
_On và _Off:  x · y · width · height  PHẢI BẰNG NHAU
              z(_On) > z(_Off)
              rìa phải cách viền khung chứa nó đúng 5
```
🔴 **Lệch một chút là bấm trúng cái nằm dưới** ⇒ triệu chứng *"bật được mà tắt không được"*.
Ngoại lệ duy nhất: **cặp tab** `BT_Tab<số>_…` — tab đang bật **nhô cao hơn** (`y=0 h=45` so với
`y=5 h=40`), đó là thiết kế người dùng chốt. Cổng `cap On/Off` bỏ qua đúng cặp này.

🔴 **MỘT chức năng = MỘT cặp nút. Cấm hai cặp cùng làm một việc ở hai nhóm khác nhau.**
Ca thật: nút đóng phễu có **hai bản** — một trong bảng `Filter_Panel`, một ở `Header` — trùng
**đúng toạ độ tuyệt đối** `(1235,5,40,40)`. Hai lớp đè nhau, lớp nào ăn click tuỳ z của nhóm cha
⇒ bấm không tắt được. Đã xoá bản trong bảng, giữ cặp ở header.

🔴 **Ô VUÔNG TÍM GIỮA NÚT = ảnh `tab_transparent_hit_area.png` còn sót.** Di tích từ lúc tưởng sai
rằng `shape` không mang được `visualLink`. **Shape mang được** (đo trên `Main`: `BG_UserGuide`).
Thấy ô lạ trên nút ⇒ tìm `image` nằm chồng lên nó rồi **xoá**, đừng đi chỉnh màu.

### 5g. NHÃN THẺ — thẻ hẹp thì VIẾT TẮT như bản gốc

Thẻ chỉ rộng `150`, nhãn dài là **tràn mất chữ**: `TOTAL CHECK…` · `GUEST AVG (…`.
Bản gốc dùng nhãn ngắn — chép đúng:

| measure | nhãn |
|---|---|
| `#Total Sale` | `Revenue` |
| `#Switch Target` | `Target` |
| `#TC` · `#TA` · `#GC` · `#GA` | `TC` · `TA` · `GC` · `GA` |

Nhãn nằm ở `query.queryState.Data.projections[0].displayName`, **không phải** `title.text`.

🔴 **THUẬT TOÁN: nhãn ≤ rộng thẻ − 60 px, đo bằng font thật** *("card thứ 3 sao tên dài vậy, cần thuật toán để
bảo đảm tên ko quá dài tràn khỏi card")*. Đo render Product Mix: hộp `Card_` 260 px chỉ hiện 205 px chữ (`COGS incl. damaged &
packagi…` = 204,9 px Segoe UI đậm 10; nhãn đủ 210,4) ⇒ cột ảnh + lề ăn 55 px, giữ thêm 5. Rộng thẻ lấy SAU khi `card_icons` thu hộp.
Quá dài ⇒ `mix_builder.py --card-labels` bỏ vế bổ nghĩa (`incl. …` · `(…)` · `- …` · `gồm …`), nghĩa đủ để ở Glossary trang; bỏ vế
vẫn dài ⇒ in ra cho NGƯỜI đặt tên, máy không tự chế viết tắt. Cổng `card-label` (`pbi_gate.card_label` + `CARD_LABEL_SLACK`).
⚠ Luật chung: **nhãn dài hơn bề ngang thẻ thì viết tắt theo bản gốc**, đừng thu nhỏ cỡ chữ riêng
một thẻ — thu chữ làm thẻ này lệch cỡ với các thẻ còn lại. Cỡ **số** chung của mọi thẻ đã chốt ở §4d
(`18D`); muốn đổi nữa thì đổi cả hàng.

### 5h. LEGEND — NGƯỜI DÙNG SỞ HỮU, AGENT KHÔNG ĐƯỢC GHI

🔴 **`TopLeft` KHÔNG TỒN TẠI trong Power BI**. Desktop chỉ ghi `Top` · `Bottom` · `Left` · `Right` ·
`TopCenter` · `BottomCenter` · `LeftCenter` · `RightCenter` — đếm trên mọi file Legacy/Classic/Main, không file nào có
`TopLeft`; nó do agent tự chế ở `aa676ee`. Hậu quả: legend xếp dọc đè lên nhãn trục, và mỗi lần người dùng Save `Top` (đúng)
thì cổng cũ báo sai rồi agent "sửa" ngược về `TopLeft` ⇒ *"legend lưu rồi mà mở lại toàn mất"*.
**Neo trái = `Top`** cho chart trục · **donut/pie = `RightCenter`**.


> *"cái legend tui đã lưu về topleft hết mọi dashboard rồi, sao bạn cứ làm mất nó… ko đc đụng vào nữa"*

Chuẩn là **`Top`** (chart trục) / **`RightCenter`** (donut/pie), nhưng **agent CHỈ ĐƯỢC BÁO, không được ghi**. Cổng xếp legend
vào **cảnh báo**, không chặn — nếu chặn thì agent kẹt không mở được Desktop mà lại không có quyền sửa.

### 5i. CẶP NÚT PHẢI CÙNG GỐC TÊN, nếu không cổng KHÔNG thấy nó là một cặp

Khuôn gốc đặt tên lệch gốc: `BT_Glossary_Off` ↔ `BT_OpenGlossary_On`, và `BT_OpenFilter` ↔
`BT_CloseFilter_On`. Cắt hậu tố ra thì gốc **khác nhau** ⇒ cổng không ghép thành cặp ⇒ **cả hai cùng
hiện mà không ai báo**, người dùng thấy *"viền đỏ ở cả 2 nút ngoài"*. Đã đổi thành:

```
BT_Glossary_Off / BT_Glossary_On
BT_Filter_Off   / BT_Filter_On
```
⚠ **Đây là chỗ CỐ Ý lệch khuôn gốc** — khuôn gốc tự nó đặt tên không nhất quán (nó còn có lỗi gõ
`Overview_OpenFIlter`). Luật đặt tên `<Loại>_<Tên>_<On|Off>` thắng.

### 5j. 🔴 MẶC ĐỊNH TRANG: CHỈ MỘT NHÓM TAB ĐƯỢC HIỆN

Bookmark đúng **không cứu được** chuyện này — đây là trạng thái **lúc mở file**, trước khi bấm gì.
Cả hai nhóm tab cùng `isHidden=false` ⇒ nội dung hai tab vẽ chồng lên nhau thành một khối
Ẩn nhóm tab thì **ẩn luôn mọi thứ bên trong nó**, đúng cách `Main` làm.

```
Tab1_TongQuan  isHidden = false   (+ mọi con: hiện)
Tab2_ChiTiet   isHidden = true    (+ mọi con: ẩn)
```
⚠ Mỗi lần người dùng Save trong Desktop là cờ này bị lật — **chạy lại bước đặt lại mặc định trước khi
nghiệm thu**. Cổng `tab mac dinh` canh đúng việc đó.

## 5k. ĐỦ TRANG · ĐỦ VISUAL · GLOSSARY RIÊNG · KHUNG 1280x720

> *"mix cũng phải chuẩn DW mới, chính xác với legacy, nhân bản đủ mọi trang"*

- **Mọi trang của Legacy phải có trong Mix** (cùng id trang), **theo đúng thứ tự trang của Legacy**.
  Trang Mix còn thiếu thì **chép từ bản `Classic`** (cùng model kho, visual đã nối lại field) rồi dựng
  lên khung Mix. Trang ẩn (tooltip · drill-through · chiến dịch cũ) giữ nguyên như Classic.
- **Mọi visual nội dung của Legacy phải có mặt** (so theo id). Card Legacy tính theo §4d-bis (còn id, hoặc
  measure của nó còn trên thẻ cùng trang); visual bỏ có chủ đích khai `dropped_visuals` (§4i). Visual thiếu vì **kho chưa có nguồn** thì khai trang đó ở `known_gaps`
  trong `config/pbi-gate.json`, **kèm lý do** — cổng chuyển thành cảnh báo; trang không khai vẫn đỏ.
  Trang Legacy **bỏ có chủ đích** (hết hạn, §5m) khai ở `dropped_pages`, không phải `known_gaps`.
  Hiện bỏ: 3 tooltip · `Detail` · `Lucky Wheel` · `Reward On Zalo` · `Thẻ Xuân May Mắn T1/T2`.
- 🔴 **Mix nhân bản từ Mix của report KHÁC phải đổi mã theo Legacy CỦA CHÍNH NÓ** *(08/10, Mix 01 dựng từ Mix AM)*: AM và OM
  Legacy **không chung một mã visual nào**, kể cả trang giống hệt ⇒ cổng thấy 11 trang Legacy "mất". Ghép từng visual sang song sinh
  OM theo loại + bộ field + tiêu đề (vị trí phân định khi trùng; cặp lệch tên field kiểm bằng tay), thay mã trong mọi file
  `definition` + khoá của report đó trong `pbi-gate.json` (CHỈ khối của report đó — Mix AM dùng chung mã). Visual OM không có song
  sinh (chế độ xem phụ của Legacy, vd Daily "Detail") chép từ Classic cùng số rồi dựng lên khung Mix. Ca 08/10: 167 mã, 2.238 chỗ.
- **Mọi trang hiện = `1280x720`**, nội dung dài chia tab (§1 đã chốt đường "canvas 720 + tab").
- **Mỗi trang một Glossary riêng**, viết theo `write-style`, chỉ nói điều đã đọc được từ DAX/field —
  câu nào chưa kiểm được thì bỏ. Chép Glossary trang khác sang là lỗi (cổng `glossary`).
- **Tên trang Title Case, một dấu cách**: `Product MIX → Product Mix` · `Promotion  Increase Sale →
  Promotion Increase Sale`. Đổi thứ tự trang thì **đánh số lại tiền tố bookmark** theo thứ tự mới.
- Cổng: `canvas` · `legacy-parity` · `glossary` · `few-cards` — chạy `--page all` để kiểm nghiêm MỌI trang hiện.

- 🔴 **Glossary gọi tên MỌI chữ người đọc thấy trên trang** *(13/10: "cái nút grossary ở mỗi trang có cổng kiểm là phải chú
  thích đủ cho mọi từ xuất hiện trong dashboard trong trang đó chưa?")*: tiêu đề thẻ / chart / bảng, tên cột · trục · legend · tooltip,
  nhãn bảng lọc, và chữ in hoa measure in ra trong ô (`STAR` · `HORSE` · `HIGH`…). Từ thường ngày (Store, Month, Revenue… danh sách
  `GLOSSARY_COMMON`) miễn; viết tắt phải xuất hiện đúng như in. Cổng `glossary-cover` (gặp lần đầu: 01 Mix 16 trang · 02 Mix 13 · 03 Mix 5).
  **Nguồn Glossary = `scripts/mix_glossary.py`** (mọi trang của 3 Mix): sửa ở đó rồi `python scripts/mix_glossary.py --apply <report>`;
  `mix_builder` dựng lại trang cũng đọc từ đó (spec chỉ là dự phòng) — không còn sửa tay `Text_Glossary`.
- 🔴 **Viết tắt ghi NGUYÊN GỐC đã tra, một lần mỗi trang** *(13/10: "từ viết tắt phải tra ra từ nguyên gốc và viết vào chứ,
  cái này cũng phải có cổng kiểm")*: `TC (Transaction Count): số hoá đơn`, đặt ở dòng định nghĩa của mục VIẾT TẮT. Nguồn tra theo
  thứ tự: bảng thuật ngữ nghiệp vụ của vùng (`glossary_dir`) → từ điển hệ cũ (`legacy_sources`) →
  docs kho (`lineage_catalog`: COL = Cost Of Labor) → DAX của chính report. Từ điển nằm ở `pbi_gate.ACRONYM_ORIGIN`, mỗi mục
  kèm nguồn; chữ chưa có nguồn công ty (TA, GA, ADS) ghi theo chuẩn ngành F&B và báo người dùng. ⚠ Cùng chữ khác nghĩa theo phòng:
  `FC` của báo cáo Tài chính là Franchise, của báo cáo vận hành là Forecast (`#FC = SUMX(Dim_Store, [#Fore Cast Sale Month])`) — nghĩa
  theo DAX của report. Cổng `acronym-origin`: viết tắt trong Glossary / trên trang chưa ghi nguyên gốc ⇒ đỏ; chữ chưa có trong
  từ điển ⇒ đỏ, bắt tra trước.
- 🔴 **Một định nghĩa một dòng** *(14/10: "mỗi 1 định nghĩa phải xuống dòng chứ ko có dính chùm ntn")*: mỗi gạch đầu dòng
  của Glossary chứa đúng một câu dạng `X: …` / `X = …`; câu giải thích thêm đi liền sau định nghĩa của nó. Viết tắt đã nằm trong
  ngoặc thì không lồng ngoặc: `…, DSR (Daily Sales Report), …`. Cổng `glossary-one-def` (`pbi_gate.split_definitions`;
  `06:00` không tính là định nghĩa). Đợt 14/10 tách 218 dòng trên 36 trang.
- 🔴 **Chú giải nằm TRONG Glossary, không ghim khung trên trang** *(13/10: "chú giải phải nằm trong nút grossary chứ?")*:
  khung REMARKS của Product Mix (Star/Horse/Challenge/Dog) chuyển vào mục "Xếp nhóm món" của Glossary, kèm cách tính Popularity /
  Profitability đọc từ DAX; bảng Product Detail chiếm trọn tab.
- 🔴 **Từ cổng bắt được thì SỬA TÊN trước, giải thích sau**: chữ sai chính tả / dính chữ / tên trường thô (`Swith METRIX` ·
  `%GrowvsLW` · `ADS To Archive TG` · `DatePart_Lable` · `PARENT2NAME` · `AMs` · `CapChiTieu`) là lỗi `column-name`, không phải từ
  cần chú giải. Tên mới đọc từ DAX: `% Net Sale of Sale` thực ra là `(Net Sale − COGS) / doanh thu` ⇒ `% Net Margin of Revenue`;
  `Item Cost` là % ⇒ `% COGS`; `GM` là số tiền ⇒ `Margin`. Nhãn bảng lọc đổi thì đặt cùng `displayName` cho trường của slicer
  (cổng `panel-label` so nhãn với tên đó). `column-name` kiểm cả visual ẨN mặc định (nội dung tab) — trước 13/10 nó bỏ qua
  nên ~85 tên mỗi Mix lọt.

## 5l. 🔴 CHART KHÔNG ĐƯỢC TỰ CUỘN · CHART DÀI HAI CÁI MỘT TAB, XẾP TRÊN DƯỚI

> *"1 trang 4 chart là ko dc khi nó là chart dài, phải tách 1 trang 2 chart trên dưới thôi, mọi chart
> ko dc để nó có autoscroll, phải canh sao mà chart độ dài lẫn cao đều vừa khít"*

**Vì sao chart tự cuộn:** trục phân loại cho mỗi nhóm tối thiểu `preferredCategoryWidth` px — **thấp nhất
20 px, không hạ được nữa** (Desktop chỉ từng ghi `20D` · `21D` · `180D`; file Ori dùng `20D`). Khi
`số nhóm × độ rộng nhóm > phần vẽ` thì Power BI thêm thanh cuộn. Trục số liên tục (`axisType 'Scalar'`
với field số) không bao giờ cuộn — nhưng field chữ (như `WeekPeriod`) thì `Scalar` bị bỏ qua.

```
số nhóm (cận trên)   tuần 53 · ngày 31 · cửa hàng 50 · giờ 24 · tháng 12 · thứ 7 · món = Top N của filter
phần vẽ (trục ngang) = width - 80 (trục trái + lề) - 60 nếu có trục phụ Y2
phần vẽ (bar ngang)  = height - 60
cần                  = số nhóm x max(20, preferredCategoryWidth)      <= phần vẽ
```
- ⇒ **chart theo tuần / theo ngày chỉ vừa khi trải HẾT bề ngang** (`1260`): 53 × 20 = 1060 px.
- **Chart dài = ≥ 28 nhóm.** Mỗi tab **tối đa 3 khối chart dài** *(nới từ 2, theo quy tắc tối cao: "m ko thấy chart này
  có 1 cột mà chứa hết cả trang ko, 2 chart có đúng 2 cột mà chiếm hết 1 tab")*, mỗi khối **≥ 150 px**, xếp **trên dưới**; bản cũ
  ghi 2, mỗi khối `1270 × 325/330`
  (tab có hàng card: `280 + 280` dưới hàng card).
- **Không dồn 4 chart lớn một tab** (khối cao ≥ 250) kể cả chart ngắn — tách tab. ⚠ Luật này **không** cho phép
  tách ra tab THƯA: khối ít nội dung thì làm THẤP (< 250) rồi dồn chung tab — xem §5l-bis.
- **Chart dài bật `categoryAxis.concatenateLabels = true`** —
  nhãn hai tầng (số tuần + khoảng ngày) nằm một dòng, không bị ngắt chữ. Lệnh:
  `python scripts/mix_builder.py --concat-long` (bật cho mọi chart ≥ 28 nhóm); cổng `long-chart` báo khi thiếu.
- Chart ghi "Top 5" mà **không có bộ lọc Top N** là hiện toàn bộ món rồi cuộn (bản Legacy của Product Mix
  mắc lỗi này): thêm filter `TopN` **chép từ một chart Top N có thật** (khuôn ở Product `Top 5 Revenue`),
  chỉ đổi `OrderBy…Property` sang measure của chart.
- 🔴 **Top / Bottom N phải hiện ĐÚNG N** *("bottom 5 mà lại hiện full list … nói ra phải hiện 5")*. Bộ lọc
  TopN của Power BI **giữ đồng hạng**: 12 món cùng bán 1 phần ⇒ "Bottom 5 Bad Selling Product" hiện 12.
  **Cách đúng (04/10): GIỮ bộ lọc TopN, chỉ đổi measure sắp** sang `~Sort Key <measure> <Asc|Desc>` = giá trị ± hạng tên món
  (`RANKX(ALL(món), MIN(món))`) × 1E-7 ⇒ không hai món bằng khoá ⇒ đúng N. Lệnh `mix_builder.py --topn-tiebreak` (13 chart/bản).
  ⛔ **Đường cụt đã trả giá:** lọc bằng measure `TOPN(N, ALLSELECTED(món)…) = 1` (`--topn-exact`, 03/10) làm "Bottom 5 Bad
  RevenueProduct" TRẮNG — `ALLSELECTED` không thấy bộ lọc riêng của chart (loại món "Cấp 0 …") nên chọn 5 món "Cấp 0" rồi bộ lọc
  kia loại sạch. Bộ lọc TopN thì tôn trọng bộ lọc khác của chart. `ItemCode` không phá hoà được (537 mã / 1627 tên, 1681 trống).
  Cổng `topn-exact`: TopN sắp theo measure thường ⇒ đỏ · còn measure-filter `~Top/~Bottom N` ⇒ đỏ · tiêu đề hứa "Top/Bottom N"
  mà không có TopN ⇒ đỏ · N tiêu đề ≠ N bộ lọc ⇒ đỏ. Classic/Legacy miễn (giữ hành vi cũ để so số).
- 🔴 **CHART CỘT KHÔNG ĐƯỢC TREO NGƯỢC TỪ TRÊN XUỐNG** *("ko đc đảo chiều chart từ trên xuống")*. Số âm trên trục
  cột/thanh vẽ cột chĩa xuống (Bottom 5 Bad MarginProduct: lãi gộp −0,7…−13,4 triệu). Vẽ **đại lượng dương mang đúng nghĩa**: mức
  lỗ `#Margin Loss = -[#Total Profit]`, format `-#,0.00;#,0.00;0` ⇒ cột mọc lên, nhãn vẫn có dấu trừ; đảo chiều sắp của chart để
  giữ thứ tự trục; bộ lọc Bottom 5 vẫn xếp theo lãi gộp. Miễn: measure `%` (tăng trưởng âm là nghĩa của nó).
  Cổng `neg-bars` (lớp engine): mỗi chart cột/thanh × measure số tiền/số lượng ⇒ `MINX(<trục, trong đúng Top/Bottom N của chart>,
  [m])` < 0 ⇒ đỏ.
- Cổng: `axis-scroll` (ước tính trên) · `long-chart` · `tab-big-charts`. Ước tính là **cận trên an toàn**; mở
  Desktop vẫn là cổng cuối — chart nào vẫn cuộn thì báo, đừng hạ độ rộng nhóm dưới 20.
- **Trang hiện dùng `displayOption: FitToWidth`** như trang 1 (cổng `display-option`). Thanh cuộn cả trang còn
  có thể do **phóng to cửa sổ app**, không phải do canvas sai — đo `page.json` trước khi kết luận.

## 5l-bis. 🔴 TÁCH TAB ĐỂ GIẢM TẢI, KHÔNG ĐỂ CHIA THEO TÊN — MỖI TAB PHẢI KÍN

> *"tách tab để giảm tải 1 chart dồn vào trang, ko phải để tách ra theo tên cho đẹp, nên 1 tab luôn phải kín data
> và chart, chỉ chart nào cần dài mới dc nằm hẳn 1 trang, còn mọi chart nào nhỏ nhét dc thì phải nhét vào hết để
> tối ưu"* · *"ko dc tách tab khi nội dung mỗi tab quá ít, mỗi tab phải lắp đầy hết nội dung ko được để khoảng trống"*

0. 🔴🔴 **QUY TẮC TỐI CAO: TỐI ƯU KHÔNG GIAN — KHÔNG KHOẢNG TRỐNG, HẠN CHẾ TAB** *("quy hoạch tối ưu
   không gian, ko được để thừa khoảng trống" · "tab cũng hạn chế, gộp các tab lại với nhau, đéo phải là mày đc phép spam 1 đống tab rồi
   bên trong chứa có 1 tí thông tin" · "bóp hẳn chart và gộp lại với các tab đang ko chứa nhiều thông tin")*. Mọi luật bố cục khác đứng
   SAU luật này. Trả giá 01/10: để thoả "bảng cuộn riêng tab" agent đẻ thêm ~15 tab (Daily 6, Product 7, Operation 8, Delivery 6) và
   kéo một chart theo ngày cao 465 px cho kín tab. Luật nào đẩy ra tab thưa ⇒ **hỏi người dùng thứ tự ưu tiên**, không tự đẻ tab.
   **Cách đọc đúng ("cuộn nhiều và chứa đầy thông tin, thì tab riêng, còn mấy cái chart chứa ít và khoảng trống nhiều
   thì gộp lại, mâu thuẫn chỗ đéo nào")** — không có mâu thuẫn:
   - Bảng **cuộn DỌC nhiều** (≥ 1,5 lần khung — 45 cửa hàng, 250 món) = đầy thông tin ⇒ tab riêng (§5l-quater). Bảng ít dòng chỉ cuộn
     ngang (7 chỉ số × các ngày) **không** chiếm tab: dồn chung, làm thấp đúng số dòng.
   - Chart **ít thông tin** — pie / donut / treemap vài lát, chart 5–17 điểm, chart một chuỗi — **thu nhỏ và gộp** vào tab đang thưa;
     pie / donut / treemap / funnel KHÔNG tính vào trần "3 chart lớn một tab" (cổng `tab-big-charts` bỏ qua).
   - Gộp theo **chủ đề**: Daily & Hourly = Doanh thu · Giao dịch · Cơ cấu giờ (GC/GA theo ngày, theo giờ, 2 treemap, bảng khung
     giờ) · Theo thứ (giờ × thứ, kênh theo thứ, khung giờ × thứ) · Chi tiết · CH × Giờ. Đã gộp 01/10: Product Cơ cấu DT + LN ·
     Executive Lợi nhuận + TC&TA + GC&GA ⇒ Chỉ số · Operation Chỉ số vào Kênh · Promotion bảng theo ngày vào Tổng quan · Delivery
     Tổng hợp + Theo ngày · Power DT tháng vào Theo tháng (tổng: 39 → 32 tab trên 7 trang).
   - Trang gộp thì **tên trang nói đủ cả hai** ("trang Daily có kèm Hourly sao ko ghi cả 2 vào trong tên") ⇒
     `Daily & Hourly` (`mix_builder.py --rename-page`).
   🔴🔴 **CHIỀU NGANG mới là chỗ dư — chart rộng theo SỐ NHÓM, xếp CẠNH NHAU** *("rõ ràng dashboard là cột, thứ bị dư
   là chiều ngang đéo phải chiều dọc, m lại đi nhét thêm 1 chart ở dưới nữa, bóp nhỏ thêm chiều dọc rồi làm trống thêm chiều ngang" ·
   "check file ori … để coi biết cách làm")*. Đo file mẫu Ori (khuôn gốc của vùng, `template_report`, đọc `Report/Layout`):
   7 thứ trong 170 px × 3 chart cạnh nhau · 12 tháng 590–810 px · ~6 hãng 400 px · chỉ bảng chi tiết mới trải hết ⇒ **~60 px một
   nhóm** (khớp skill `dataviz`: cột ≤ 24 px, phần còn lại là khoảng thở). Công thức: `cần = 80 (+60 nếu có trục Y2) + số nhóm × 60`;
   trục **ngày** (`Dim_Date[Day]`, số) đặt **liên tục** `categoryAxis.axisType 'Scalar'` ⇒ 20 px một ngày, 31 ngày vừa nửa tab, không
   cuộn (`mix_palette.py --scalar-days`; trục phân cấp Tháng > Ngày thì giữ dạng nhóm). Chart rộng > 1,25 × cần (sàn 320 px) mà tab
   còn khối khác ⇒ SAI: đặt cạnh chart khác. Tự áp cho MỌI trang, không đợi người dùng chỉ từng tab — cổng `chart-width` liệt kê hết
   (02/10: 8 chart ngày nhóm, 12 tháng trải 1260 ở Executive / Monthly / Product Mix / Power, Top 5 625 px, Top 10 1260 px). Lưới
   2 × 2 nửa ngang không tính là 'chart lớn' (`tab-big-charts` chỉ đếm khối rộng > 640).
   🔴 **Số nhóm là số nhóm HIỆN RA, không phải cận trên của trường** *(chart "… By Month" vẽ 2 cột trong
   khối 2 ô)*: slicer `IsCurrentMonth` **đang chọn sẵn** giá trị mà lọc chart (không có tương tác `NoFilter`) ⇒ trục tháng có **1**
   nhóm, không phải 12 (`pbi_gate.month_cut`, áp cho `chart-width` + `axis-scroll`). Legacy Monthly không chọn gì ⇒ vẫn 12.
   ⚠ Dựng lại trang mà rơi tương tác `NoFilter` của Legacy là đổi số nhóm lặng lẽ: Legacy Product MIX để slicer tháng `NoFilter`
   chart By Month (cả năm), Classic + Mix mất ⇒ Classic đã trả lại (05/10); Mix người dùng chọn giữ lọc tháng, chart thu về 1 ô.
   Tên món dài (combo 40+ ký tự) mà cổng chỉ thấy số nhóm ⇒ khai `chart_width_exempt` trong `config/pbi-gate.json` kèm lý do
   (Bottom 5 Bad Selling 2 ô) — cổng chuyển thành cảnh báo.
1. **Lý do DUY NHẤT để thêm một tab là tải**: nội dung không vừa `1270 × 660` mà không vi phạm §5l (chart tự cuộn ·
   quá 2 chart dài · quá 3 khối ≥ 250). **Chia tab theo chủ đề/tên cho gọn là SAI.**
2. **Chỉ chart DÀI (§5l, ≥ 28 nhóm) hoặc bảng nhiều dòng thật sự** mới được chiếm trọn một tab. Chart nhỏ, bảng vài
   dòng, thẻ số **phải dồn chung** một tab tới khi kín.
3. **Chiều cao khối theo LƯỢNG NỘI DUNG, không theo khung**: bảng 1–3 dòng mà khung cao 300 là khoảng trống. Khối
   ít nội dung làm thấp (< 250 thì không tính là chart lớn ở cổng `tab-big-charts`) rồi xếp thêm khối khác vào.
4. **Hai tab kề nhau cùng thưa ⇒ GỘP**, kể cả khi hai tab mang hai chủ đề khác nhau. Tên tab gộp là **MỘT từ ngắn bao
   được cả hai**, không ghép hai tên bằng `&` (`Kênh bán`, không phải `Người bán & Sàn`).
5. 🔴 **Nút tab rộng ít nhất chữ + 15 px** *(`Doanh…`, `Cơ cấu…`)* — `Doanh thu` 79 px trong nút 85 bị cắt, `Tổng
   quan` 81 px trong nút 100 hiện đủ. Thu `tabw` để nhét thêm tab là sai: gộp tab thay vì bóp nút. Cổng `tab-label` đo chữ thật
   (Segoe UI đậm 12).
   🔴 **Nhãn tab tối đa 10 ký tự, tính cả dấu cách** *("tên tab ko dc quá dài, phải có luật giới
   hạn chữ… nghĩ ra từ nào ngắn hơn và bao đủ hàm ý tự nhiên hơn")*. Nút tab chữ đậm 12pt rộng 90–125px: `Người bán & Sàn`
   (15) bị cắt thành `Người bán &..`. Đo 29/09: mọi nhãn còn lại của XYZ + ABC ≤ 10. Cổng `tab-label`.
6. **Cùng một loại dữ liệu thì cùng MỘT visual**, không tách visual theo giá trị bộ lọc: ba pivot người bán giống hệt nhau
   chỉ khác bộ lọc kênh ⇒ một pivot có cấp `Kênh` ở đầu; bảng `Web` một dòng tách khỏi bảng kênh sàn ⇒ web là một dòng
   của bảng kênh. Visual thừa khai `dropped_visuals` kèm lý do. Visual nào nhìn giống visual khác thì **tiêu đề phải nói
   nó là gì** — tiêu đề cột là chữ người đọc (`Trưởng nhóm`, không phải `LeaderGroup`; `% Target`, không phải `%`).

7. 🔴 **Chart ÍT thông tin không chiếm chỗ lớn** *("mấy cái chart by day thông tin ko có gì thì ai lại để 1 cái chart
   to đùng chiếm hết chỗ thế này")*. Chart **một chuỗi** (một measure, không chia, hoặc chia theo trường không phải thời gian —
   tên chương trình bị lọc còn một giá trị vẫn là một chuỗi) cao **tối đa nửa tab, 330 px**; chỗ còn lại cho nội dung khác. Chia
   theo năm (`Dim_Date.*`, Seasonal) hoặc theo trường có danh sách cố định (nhóm kênh, AM — `pbi_gate.MULTI_SPLIT`) là nhiều chuỗi. Ca thật: Promotion `Sale of Promotion By Day` cao 465 px sau khi tách bảng ⇒
   270 px + chart Top 10 món khuyến mãi theo số lượng bên dưới. Cổng `chart-size`. ⚠ Luật "tab kín" (mục 1–3) **không** được lấp
   bằng cách kéo to chart ít thông tin — thiếu nội dung thì trình người dùng thêm khối, đừng phóng chart.

**Ca thật (XYZ `01DR_Overview_Mix`, trang Tổng Quan, 29/09):** tab `Người bán` (3 bảng, bảng dài nhất 13 dòng) và tab
`Sàn & NQ` (3 bảng 1–3 dòng) mỗi tab trống quá nửa — cả hai sinh ra vì một bản dựng trước tách tab `Chi tiết` để né
`tab-big-charts` bằng cách giữ mọi khung cao 325–660. Gộp thành `Người bán & Sàn`: 3 bảng người bán cao 410 +
3 bảng kênh cao 245 ⇒ 5 tab còn 4, cổng vẫn xanh.

🔴 **Đặt cạnh mà làm chart kia thành cột dọc trắng là SAI** *(13/10, 01 Monthly: "bạn để donut dài dọc cả 2 hàng làm
cho donut group bị trắng")*: bản 02/10 thu combo Old/New Store về 860 rồi kéo donut Channel thành cột 405 × 565 ⇒ vòng tròn
chỉ lấy bề ngang, nửa khối trắng. Donut/pie TRÒN ⇒ nằm MỘT hàng (Monthly: Trend 720 + Donut 545 cao 250, combo 1270 hàng
dưới, `chart_width_exempt`). Cổng `donut-shape`: bỏ 60 px tiêu đề + legend, phần còn lại cao hơn bề ngang ⇒ đỏ.

### 5l-ter. 🔴 CHART CÙNG KIỂU PHẢI NẰM CÙNG MỘT DÃY

> *"tự nhiên có 1 chart cũng chỉ 2 cột nằm ở trên trong khi 3 cái dưới cũng tương tự mà chia 3, nó phải nằm chung
> với nhau hết 1 dãy nếu chart tương tự nhau"*

- **Cùng loại visual + cùng bộ field** (chỉ khác bộ lọc: tổng · theo kênh · theo miền…) ⇒ **một dãy ngang**, cùng
  `y`; chart cùng chiều cao, chia đều bề ngang (`(1270 - 5 × (N - 1)) / N`, **giữ nguyên số lẻ, không làm tròn, không
  dồn thừa** — §4f).
  Bảng thì chiều cao theo số dòng (§5l-bis mục 3) — và nếu chỉ khác bộ lọc thì gộp thành một (§5l-bis mục 6).
- Cấm tách một chart ra hàng riêng chỉ vì nó là "tổng": người đọc so các chart cùng kiểu bằng mắt theo hàng ngang.
- **Ca thật (XYZ, tab `Theo tháng`, 29/09):** `Doanh Thu Tổng` (cột Doanh Thu/Target + %) nằm một hàng rộng 1270, ba
  chart NQ · E-Commerce · B2B cùng khuôn nằm hàng dưới ⇒ gộp thành **một dãy 4** (`313.75 × 4`; bản 29/09 ghi
  `315 · 315 · 315 · 310` — đã sửa 08/10 vì lệch ô cuối).

### 5l-quater. 🔴 MATRIX KHÔNG DÙNG ĐỂ HIỆN THÔNG TIN ÍT · KHỐI KHÔNG BỎ TRỐNG

> *"tại sao có 1 dòng ở dashboard vậy? nếu là 1 dòng phải dùng chart khác chứ ai đi dùng matrix"* · *"matrix ko bao giờ dc dùng
> để hiển thị thông tin ít, nếu mà chỉ chứa vài legend thì ng ta dùng chart khác"* · *"hiện ko bao nhiêu mà nằm hẳn 1 tab.... 1 là
> phải đổi chart bự hơn, 2 là bổ sung thêm các chart liên quan trực quan hơn để vào thêm"*

| Matrix / bảng đang hiện | Dùng thay |
|---|---|
| **1 dòng** (không field dòng/cột; bảng chỉ toàn measure) | thẻ số — một `cardVisual` nhiều giá trị |
| **vài nhóm** (một field dòng ≤ 6 giá trị, không field cột: 4 kênh sàn, 3 đội…) | biểu đồ — cột theo nhóm; measure khác đơn vị (số đơn vs tiền) vào tooltip |
| nhiều dòng nhưng khối còn trống phần lớn (13 dòng trong khung 660) | thu khối vừa số dòng, phần còn lại đặt **biểu đồ liên quan** (vd Doanh Thu vs Target theo người bán) |

- Bản `Classic` KHÔNG áp (giữ thiết kế cũ) — luật này cho bước dựng `Mix`: matrix bê từ Legacy phải xét lại theo bảng trên.
- Máy canh: luật `matrix-few` của `pbi_gate.py` — lớp tĩnh bắt matrix 1 dòng, lớp engine đếm giá trị thật của field dòng (≤ 6 = đỏ).
  Phần "khối bỏ trống" là phán đoán (số dòng × cỡ dòng còn tuỳ dữ liệu) — soát bằng mắt khi chụp từng tab.
- *Ca thật (XYZ 08/10, Overview Mix):* `Doanh Thu POS Nhượng Quyền` 1 dòng × 2 số trong khung 360×270 → thẻ 2 giá trị ·
  `E-Commerce Theo Kênh` + `Thực Nhận Và Hoàn Trả Theo Kênh` 4 kênh → cột theo kênh · tab `Kênh bán` hai matrix 11–13 dòng
  chiếm trọn 660 → matrix nửa trên, hai biểu đồ thanh `Doanh Thu Và Target Theo Người Bán` nửa dưới.
- **Máy kiểm được (chưa có ở cổng):** trong một tab, nhóm visual theo `visualType` + tập field của `queryState` bỏ
  bộ lọc; nhóm nào có mặt ở ≥ 2 giá trị `y` khác nhau ⇒ lỗi. Luật §5l-bis chỉ đo gần đúng (lớp engine: số dòng
  trả về × ~20 px so với chiều cao khung) — người dùng coi là luật thẩm mỹ, nên nếu dựng thì ở mức cảnh báo.

### 5l-quater. 🔴 BẢNG CUỘN NHIỀU NẰM RIÊNG MỘT TAB

> *"mấy matrix này phải tách ra 2 tab riêng ko gộp dc vì nó chứa lượng scroll nhiều, mọi cái scroll bar quá lớn đặc biệt là
> matrix đều phải tách nằm riêng 1 tab"* — Weekly tab Chi tiết: bảng cửa hàng × tuần (~40 tuần, 45 cửa hàng) và bảng món ×
> tuần dồn chung một tab.

- Bảng (`pivotTable` · `tableEx`) có nội dung **≥ 1,5 lần khung** theo bất kỳ chiều nào là **khối DUY NHẤT của tab** —
  khung `(0, 0, 1270, 660)`, bảng `(5, 5, 1260, 650)`. Luật này **thắng** §5l-bis mục 1 (tab kín): bảng cuộn nhiều được
  chiếm trọn tab dù trông thưa.
- **Đo:** ngang = công thức §5n, **KHÔNG tin bộ lọc `~Recent`** (bộ lọc measure trên matrix không cắt cột — người dùng nhìn
  Weekly 01/10: ~40 cột tuần dưới `~Recent 4 Weeks`; XYZ đo render cùng kết luận). Dọc = `40 + (số dòng + 1) × 20` so
  với chiều cao khung; số dòng theo trường hàng **cấp đầu** (pivot mở ở dạng thu gọn), bảng cận trên ở `pbi_gate.ROWS_N`
  (45 cửa hàng · 250 món · 31 ngày · 53 tuần …).
- Tách ra thì tab mới mang nhãn ngắn nói nội dung (`Cửa hàng` · `Món` · `CH × Giờ`), vẫn ≤ 10 ký tự (§5l-bis mục 5).
- Cổng `scroll-alone`. Đo 01/10 khi dựng: AM 15 chỗ / OM 19 chỗ trên 7–8 trang.

### 5l-quinquies. 🔴 LỚP ĐỌC PIXEL — khối nào còn > 30% TRỐNG khi đã đầy dữ liệu

> *"thêm 1 lớp đọc pixel … khi 1 group nó bị phần nền chiếm nhiều hơn 30% là xét bị trống"* · *"chart full tuần thì phải đếm hết
> max tuần của năm"*. Cổng tĩnh chỉ ước theo toạ độ + số nhóm; chỉ ảnh render mới thấy chart thật sự vẽ kín tới đâu.

```
python scripts/pbi_pixel.py reports/<report> --user-ok [--page <pageId>] [--tab <chữ>] [--as-of 2025-12-31]
```
- 🔴 **HỎI NGƯỜI DÙNG TRƯỚC, rồi mới chạy với `--user-ok`** *("t chưa bao giờ đồng ý mấy cái tạo file kiểm thử vớ vẩn tùm lum,
  t luôn cho file fix thẳng" · `chuẩn phòng ban §2` "KHÔNG BẢN NHÁP")*. Lớp này buộc phải có bản sao (ghim ngày, đổi trạng thái trang),
  nên bản sao nằm ở thư mục NGẮN ở gốc ổ, NGOÀI mọi repo (`D:\_pbx_<pid>` — không dùng `%TEMP%`: vượt MAX_PATH, Desktop cắt file
  lặng lẽ, `pbi-pbip`) và **tự xoá khi chạy xong** — không còn `data/_sbx_px`, không còn
  `--reuse-shots`, hook `pbi-open-gate` không miễn đường nào nữa. Cách làm: chép định nghĩa + `cache.abf` nhỏ (bỏ `*.bak`); mỗi
  trang × tab (bookmark `NN_<Trang>_Tab<số>_…`, trang không tab thì `_Main`) mở Desktop một lần, áp bookmark tab làm trạng thái mặc
  định, `FitToPage`, thêm 2 ô mốc tím ở hai góc để định vị canvas trong ảnh.
- **Quy về SỨC CHỨA bằng cách đo lúc đầy, không ngoại suy:** bản sao ghim `Dim_Date.MaxSale` = `--as-of` (mặc định
  31/12/2025) ⇒ mọi slicer "Current …" ra một kỳ đủ: tháng 31 ngày, đủ 12 tháng, đủ tuần của năm. Mọi cờ `Current/Last/5Week` của
  `Dim_Date` đều sinh từ đúng một biểu thức `MaxSale` (đo 02/10, cả hai Mix); measure lọc `< TODAY()` vẫn ra trọn kỳ cũ.
- 🔴 **Đổi chữ câu SQL ⇒ Desktop hỏi "Native Database Query – approve?"** (duyệt theo đúng chữ câu, một lần mỗi mốc ngày). Hộp
  thoại là HTML, `PrintWindow` chụp ra ĐEN; trong lúc chờ duyệt mọi visual quay chấm tải mãi và lệnh đóng cũng kẹt. Công cụ đọc
  chữ hộp thoại qua `WM_HTML_GETOBJECT` và **chỉ bấm Run khi chữ chứa đúng câu ghim của nó** — câu lạ không bao giờ tự duyệt.
- **"Đã vẽ xong"** = ba ảnh liền không ô 10×10 nào đổi (so trung bình cả canvas bị chấm tải lừa — trả giá 02/10). Đóng bằng
  `CloseMainWindow` + "Don't save" (`GateClose`), không bao giờ kill.
- **Phép đo — nở mực 25 px:** khối = nhóm có nền `BG_` + ít nhất một chart/bảng (thẻ, slicer, nút không tính). Mỗi điểm mực
  chiếm 25 px quanh nó (nửa bước ~60 px một nhóm của Ori); nền còn sót là TRỐNG. **> 30% ⇒ đỏ**, ảnh cắt tô đỏ phần trống lưu
  cạnh ảnh chụp. 🔴 **Đừng đếm nền thô:** khoảng thở giữa cột + phần dưới đường line làm MỌI chart đỏ (combo 12 tháng kín vẫn ra
  67%). Hiệu chuẩn 02/10 trên Monthly: donut dồn góc 57% · line 32% · combo 12 tháng 13%.
- **Bốn cách đo theo loại khối** (đều hiệu chuẩn trên render thật 02/10, mỗi cách sinh từ một ca báo oan):
  | Khối | Trống = | Vì sao |
  |---|---|---|
  | chart có trục (cột/đường/combo) | bề ngang không nhóm nào dùng + dải ngang không có mực | phần trên cột thấp / dưới đường line là HÌNH DẠNG số liệu (50 cửa hàng xếp giảm dần đo diện tích ra 45%) |
  | pivot ≥ 2 cấp hàng (có nút ⊞) | chỉ bề ngang không cột nào dùng | sức chứa = lúc BUNG; chiều dọc dưới hàng thu gọn là chỗ để bung (Combo: 20+ combo × 50 cửa hàng) |
  | còn lại (donut, pie, treemap, bảng 1 cấp) | nền sau nở mực **và thông ra mép khối** | lỗ kín trong mực là một phần hình vẽ — donut lý tưởng tự trống ~40% |
  | **cả tab** | vùng nội dung 1270×660 không khối nào phủ | co khung theo nội dung thì lỗ dời ra tab — vẫn là trống |
- **`B` = khối trắng trơn (> 95% nền)**: công cụ chờ tiếp tới hạn (`--max-wait`) vì chấm tải chỉ vài pixel, ảnh trông "đứng yên"
  trong khi DirectQuery nặng chưa vẽ (COGS 45 cửa hàng × 12 tháng: 99% lúc đang tải → 30% khi xong). Hết hạn vẫn trắng ⇒ báo
  `BLANK` (không có số hoặc chưa tải xong), KHÔNG gộp với lỗi bố cục.
- 🔴 **Matrix KHÔNG giãn cột theo khung** — khung rộng hơn bảng là phần bên phải trống. Sửa bằng giãn cột, không bằng thu khung
  rồi để lỗ: `mix_builder.py --fit-columns <pageId> <visualId>…` (bảng không có trường Columns, chia theo ước lượng của cổng
  `table_overflow`) · `--fit-values <pageId> <visualId> "<v1>|<v2>…"` (có trường Columns: chữ giá trị lấy ĐÚNG như trên render,
  cột tiêu đề hàng 150 = quy ước `matrix_scroll`). Khoá do Desktop ghi: `autoSizeColumnWidth=false` + `columnWidth`.
  Cổng tĩnh `narrow-table` (bảng ~300 px một mình trong khung 1260): bảng chiếm < 60% khung
  (khung ≥ 400) ⇒ đỏ. Bảng cuộn dọc nhiều mà hẹp thì **giãn cột, giữ riêng tab** (người dùng chọn thay vì gộp: gộp cạnh bảng theo ngày làm
  bảng đó mất 12 → 4–8 ngày).
- **Cổng tĩnh `tab-hole`** (*"cái 1 group lệch kì vậy"* — DeliveryAM kết thúc ở 540 cạnh khối kết thúc ở 660,
  cổng cũ không thấy): trong một tab, mọi ô 10×10 px phải có khối phủ (khe 5 px không chứa nổi ô 10). Tab có hàng thẻ cao **675**,
  khối dưới cùng phải xuống tới 675, không phải 660 — bắt được Operation tab KPI ở cả hai Mix.
- **Cổng tĩnh `tab-blank`** (`pbi_gate`): bookmark `_Tab<N>_` phải hiện ít nhất một visual nội dung của nhóm tab đó. Sinh từ lỗi
  lớp pixel bắt được 02/10: khối `__keep__` (có chuyển view con) nằm ở tab không mặc định lấy trạng thái từ `_Main` cũ — nơi
  cả tab ẩn — nên tab `Chi tiết` của Daily & Hourly mở ra TRẮNG, nút Revenue / TC&TA cũng ẩn. `mix_builder` nay lấy trạng thái
  mặc định của khối đó từ bookmark chuyển view đầu tiên của nó.
- Một lượt Mix ≈ 40 tab × 2–4 phút, chạy nền; đừng thu nhỏ cửa sổ Desktop đang chụp (`PrintWindow` không chụp cửa sổ thu nhỏ).
  Lệnh nền có trần 2 giờ ⇒ chia lượt bằng `--tab "<a>,<b>,…"`; kết quả đọc ở output của lượt chạy (bản sao + ảnh xoá khi chạy xong).
- ⚠ `mix_palette.py` từng KHÔNG idempotent: mỗi lần chạy nối thêm một mục màu % trùng (HEAD có tới 11 bản). Đã sửa 02/10 + dọn mục
  trùng; chạy lần hai phải ra `charts changed: 0`.

- 🔴 **Bảng / matrix: cột vừa số dài nhất, tổng vừa khít khung — KHÔNG cuộn ngang, chỉ cuộn dọc** *(14/10: "toàn bộ
  matrix phải tự cân chỉnh lại size cột … rộng tối đa = với số dài nhất của cột đó để nó ko nhảy xuống dòng … cột phải vừa khít
  với chiều dài tổng … chỉ cho scroll dọc thôi")*. Công cụ `scripts/matrix_fit.py` — đo trên ENGINE, không ước lượng:
  `measure <report> <plan.json ngoài repo> ["Trang,Trang"]` (Desktop đang MỞ file: dựng lại truy vấn của từng bảng theo bộ lọc
  report / trang / visual + lựa chọn slicer, kể cả nội dung tab; lấy chuỗi ĐÃ ĐỊNH DẠNG dài nhất của mỗi measure, tính cả dòng /
  cột tổng NẾU bảng hiện chúng; tiền tổng tính dư ×1,5 vì tháng còn chạy) → `apply <plan.json>` (Desktop ĐÓNG: ghi `columnWidth`
  theo từng trường + `autoSizeColumnWidth false`; chỗ trống chia đều cho các cột số để vừa khít). Không vừa ⇒ **cách A (chốt
  14/10): số ≥ 1 triệu chuyển sang triệu một số lẻ** (`columnFormatting.labelDisplayUnits 1000000D` + `labelPrecision 1L`, "111.4M").
  ⚠ Matrix có trường Columns: Power BI cho MỘT độ rộng cho mọi cột của một measure ⇒ "mỗi cột" = mỗi measure; tên cột (Yesterday)
  trải trên các measure dưới nó ⇒ chia đều. ⚠ Measure đổi theo ô Metric (`[~Selected Metric]`) KHÔNG khoá đơn vị trên cột (chọn
  TC sẽ ra 0.0M) ⇒ measure TỰ chia: `VAR v = SWITCH(...) RETURN IF([~Selected Metric] IN {"Revenue","ADS"}, DIVIDE(v,1000000), v)`
  + `formatStringDefinition = IF(... , "#,0.0""M""", "#,0")` (`~Metrix by Ty Hour`, chỉ matrix dùng). ⛔ Đã trả giá 14/10:
  (a) dấu phẩy chia nghìn `#,0.0,,` Power BI KHÔNG hiểu — in nguyên ",,M"; (b) measure có `formatStringDefinition` thì PHẢI bỏ
  `formatString` tĩnh — giữ cả hai Desktop báo "Issues were found" và không nạp model (cổng `measure-format-both`, chặn mở file);
  (c) không đặt `///` trước `formatStringDefinition`. ⚠ Độ rộng kéo tay trên MỘT giá trị (selector `data`: giờ 11, 'Mon') đè độ
  rộng theo trường ⇒ `apply` xoá chúng. ⚠ Số cột của trường Columns không phải ngày = mọi giá trị có số trong 12 tháng (giờ 0
  và 7 lúc có lúc không: 16 → 18 cột); matrix MỘT measure không hiện dòng tên measure ⇒ tên đó không tính bề rộng. Cổng
  `matrix-fit` ở lớp engine (khi file đang mở): số xuống dòng, tổng vượt khung, hay còn độ rộng kéo tay theo giá trị ⇒ đỏ.
  Thử thật 14/10 trên 01 Daily & Hourly: 7 bảng vừa khung, tab CH × Giờ 18 giờ không cuộn ngang (render pbi_pixel).
- 🔴 **Nút chuyển view đặt trên bảng KHÔNG được đè hàng tiêu đề cột** *(14/10, Daily & Hourly tab Chi tiết: "nút ở đây bị lỗi,
  bị đè lên matrix")*: nút `BT_` 90 × 30 nằm trong dòng tiêu đề của bảng (~20) ⇒ thò 10 xuống header. Giữ nguyên khung bảng và
  nút; cho bảng `visualContainerObjects.padding.top = 15D`. Cổng `button-over-table` (nút cùng nhóm, đè lên vùng bảng ⇒ lề trên ≥
  đáy nút − đỉnh bảng − 20). Lần đầu bắt: 01 Daily 4 bảng (`BT_Store*`, `BT_HourWeekday*`), 02 Daily 2 bảng.
  ⚠ Độ rộng cột người dùng kéo trong Desktop (`columnWidth`) là quyết định của người dùng — `table_overflow` đọc cả cột trường dòng (trước
  14/10 nó tự ước 113 cho cột Day Part người dùng đặt 82, báo cuộn oan).
- 🔴 **Đáy cột các chart cùng hàng nằm trên MỘT đường** *(13/10, Product Mix: "điểm đáy của mấy cái cột đang ko đều nhau so
  với các chart khác, phải nhìn đều nhau hết chứ")*: nhãn trục (tên món) xuống dòng theo tên dài nhất của từng chart ⇒ mỗi chart
  một vùng nhãn ⇒ đáy cột lệch (đo 13/10: 318 / 351 / 335 / 388 rồi 642 / 610 / 576). Sửa: (1) mọi chart cột trục chữ của một hàng
  cùng trần nhãn `categoryAxis.maxMarginFactor` đủ thấp để tên nào cũng chạm trần (Product Mix + Product: `20L`; tên dài cắt "…",
  rê chuột xem đủ) — cổng tĩnh `axis-cap`; (2) chart trục tháng nhãn một dòng không bao giờ chạm trần ⇒ thu chiều cao chart theo số
  đo (245, lề dưới 25) và khai `baseline_align` trong `pbi-gate.json` kèm số đo — chỉ lề dưới được miễn; (3) chart số âm (Bottom
  Margin = `−Margin`) có món còn lãi ⇒ cột cắm dưới vạch 0, trục giãn ⇒ vẽ cột bằng `MAX(loss, 0)` (`#Margin Loss Bar`), số thật ở
  tooltip. ĐỪNG đặt `valueAxis.start = 0` bằng tay: Power BI bỏ khoảng trống trên, nhãn cột cao nhất đè lên thân cột.
  Lớp pixel đo đáy cột (`baseline`): dòng thấp nhất còn màu cột (màu bão hoà, chữ/lưới xám không tính); các khối cùng hàng lệch
  > 3 đơn vị ⇒ đỏ. `--copy-shots <thư mục ngoài repo>` giữ ảnh để soi.

## 5n. 🔴 BẢNG PIVOT KHÔNG CUỘN NGANG — CHỈ HIỆN CÁC KỲ GẦN NHẤT

> *"trang này scroll dài thòng vì nó tính theo week mà weekly thì nhiều lắm"* → duyệt cách 1.

Bảng có **cột trải theo kỳ** (tuần 53 · ngày 31 · tháng 12 · giờ 17) × nhiều chỉ số là hàng trăm cột.
Độ rộng cột của matrix do Power BI tự co, **không có khoá ép** ⇒ cách duy nhất là **bớt số kỳ hiện cùng lúc**.

```
ngang cần ~ 150 (cột tên hàng) + số_kỳ x số_chỉ_số x 90 px      <= bề ngang bảng (1260 khi trải hết)
```
| Công cụ | Khi nào | Lệnh |
|---|---|---|
| measure `~Recent <N> <Days\|Weeks\|Months>` + bộ lọc visual `= 1` | kỳ ở cột, còn chỗ cho ≥ 1 kỳ | `python scripts/mix_builder.py --recent Weeks 4 <pageId> <visualId>…` |
| `objects.values.valuesOnRow = true` (khoá Desktop ghi 127 lần) | quá nhiều chỉ số ở cột | `--values-on-row <pageId> <visualId>…` |
| đổi `Rows` ↔ `Columns` | chiều kia ít phần tử hơn (thứ × giờ) | `--swap-rows-columns <pageId> <visualId>…` |
| miễn, khai `matrix_exempt` trong `pbi-gate.json` kèm lý do | bảng để **xuất dữ liệu** · chưa có cách gọn (chờ người dùng) | — |

- `~Recent N …` = 1 khi cột **CHỨA ít nhất một ngày nằm trong N kỳ tính lùi từ ngày có bán cuối cùng trong phạm vi
  slicer** (`ALLSELECTED(Dim_Date)` + `HasSales`) ⇒ mặc định là các kỳ mới nhất; **chọn kỳ khác ở bảng lọc là bảng dời
  theo**. 🔴 Không dùng phép "khoảng MIN–MAX ngày của ô giao cửa sổ" *(XYZ bắt 01/10, ABC đo engine)*: cột không mang năm
  (`MonthNumber` `'01'`, `Day` 5) khi bảng lọc để All trải qua mọi năm của `Dim_Date` nên luôn giao ⇒ Mix AM không lọc
  năm/tháng: công thức cũ hiện 31/31 ngày, 12/12 tháng; công thức `NOT ISEMPTY ( FILTER ( VALUES ( Dim_Date[DateKey] ), … ) )`
  hiện 12 ngày, 1 tháng. Measure có sẵn: `mix_builder.py --fix-recent`. Tuần tính **thứ Sáu → thứ Năm** (`WEEKDAY(…,15)`), không dùng bộ lọc tương đối có sẵn (tuần thứ Hai).
  Measure nằm `0. Calculation`, tiền tố `~` (điều khiển hiển thị).
- Đã áp: Weekly 2 bảng (4 tuần) · ABC Week Overview (3 tuần) · ABC Month Overview + MoM (tháng gần nhất, mỗi bảng
  trải hết bề ngang, xếp trên dưới) · ABC bảng theo ngày (12 ngày) · MCP (3 tháng × 3 chỉ số) · Promotion 2 bảng
  theo ngày (12 / 6 ngày) · Hourly bảng thứ × giờ đổi chiều. Miễn: Export Promotion · Hourly cửa hàng × giờ (chờ chốt).
- **Cuộn DỌC của bảng là bình thường** (50 cửa hàng trong khung 325). Chỉ cấm cuộn **ngang**.
- Cổng `matrix-scroll` (chặn) ước tính theo công thức trên, hiểu cả bộ lọc `~Recent`, `valuesOnRow` và `matrix_exempt`.
- 🔴 **Bảng KHÔNG có cột theo kỳ cũng không được cuộn ngang vì THIẾU MỘT CHÚT** *("quá dài thì phải
  cho scroll dài, nhưng quá ngắn thì phải cân chỉnh sao cho mất luôn scroll bar, đẩy cột, đẩy chart hoặc đẩy luôn group")*.
  Tràn ít ⇒ **nới khung, dời khối, đổi bố cục** tới khi hết thanh cuộn — cấm thu khung nhỏ hơn nội dung để nhét thêm khối.
  Chỉ bảng dài THẬT (hàng chục cột: quy đổi combo 19 cột, bảng xuất dữ liệu) mới được cuộn, khai `matrix_exempt` kèm lý do.
  - Ước bề ngang: mỗi cột rộng bằng cái lớn hơn giữa **tiêu đề** và **giá trị điển hình** (tiền `#,0` ~11 ký tự, `%` ~7),
    ~0,73 px × cỡ chữ mỗi ký tự + 14 px đệm; cột tên hàng dạng bậc thang lấy tên **cấp đầu** + 12 px mỗi cấp. Cột đã khai
    `columnWidth` thì lấy đúng số đó.
  - *Ca thật XYZ 29/09:* bảng kênh sàn 5 cột và bảng web thu còn 445 px, bảng POS 340 px để nhét 3 bảng một hàng ⇒ cả ba
    cuộn ngang, số `3,006,718,252` xuống dòng. Sửa: bảng kênh 625 px, POS 625 px (xếp lại cả tab).
  - Cổng `table-overflow` (chặn, **ước lượng**): đỏ được trên đúng 3 bảng lỗi đó, không báo oan 3 bảng người bán 410 px vẫn vừa.
- 🔴 **Sau MỖI lần Desktop Save: `python scripts/mix_builder.py --after-desktop-save`** — áp lại trạng thái
  `_Main` cho mọi trang (Save ghi tab đang xem thành mặc định, lần 26/09 lật 39 visual Weekly) và đặt
  `activePageName` về trang đầu. Cổng `default-main` · `open-page` báo khi quên.

- **Bảng Hourly cửa hàng × giờ**: không cắt được kỳ (cột là giờ trong ngày, không phải kỳ).
  Giữ đủ 17 cột giờ có bán, **cố định mỗi cột 60 px**: `columnHeaders.autoSizeColumnWidth = false` + một
  `columnWidth` cho mỗi giá trị `HourStart` (lệnh `--column-width`). 150 + 17 × 60 = 1.170 px ≤ khung 1.260 px.
  Cổng `matrix-scroll` đọc độ rộng đã khai cứng thay cho mức ước 90 px một cột.

## 5m. CẮT THỨ HẾT HẠN — trang · tooltip · model thừa

> *"đây là thiết kế mới, ko cần xài mấy cái đã hết hạn, cắt dc model dw thừa ko xài nữa"*

- Trang ẩn của **chiến dịch đã kết thúc**, **tooltip cũ**, drill-through cũ ⇒ bỏ khỏi Mix; khai ở
  `dropped_pages` trong `config/pbi-gate.json` kèm lý do (cổng `legacy-parity` bỏ qua đúng các trang đó).
- Chart nào còn `visualContainerObjects.visualTooltip.section` trỏ trang đã xoá ⇒ gỡ khối `visualTooltip`.
- **Cắt model thừa**: bảng/measure không còn visual, bộ lọc hay measure nào dùng (tính lan qua DAX). Xoá bảng
  = xoá ở `tables/` · `relationships.tmdl` · `model.tmdl` (`ref table` + `PBI_QueryOrder`) · `cultures`.
  🔴 **Quét tham chiếu theo MỌI chỗ `"Property": "<tên>"`**, không chỉ cặp `Entity`+`Property`: bộ lọc
  **Top N** gọi measure qua **bí danh** `SourceRef.Source: "m"` — bỏ sót là cắt nhầm measure đang dùng
  (đã trả giá 26/09: `#Filter Product` · `#Filter Margin Product` · `#Sale Dt`, phải chèn lại).
  🔴 **`cultures`**: xoá mục `Entities` của measure **và** mọi mục `Relationships` có `Roles…Target.Entity`
  trỏ tới mục vừa xoá — để lại là trỏ vào khoảng trống.
- **Giữ bảng nằm giữa đường quan hệ nối hai bảng đang dùng** dù không ai gọi tên nó — cắt là đổi số.
- Giữ measure `~Placeholder` của thư mục trang còn sống (`chuẩn phòng ban §2c`).

## 5o. SƠ ĐỒ MODEL — theo chuẩn `pbi-pbip` §1c

Chạy `python scripts/pbi_diagram.py reports/ABC_02DR_StoreReportAM_Mix` (hoặc `mix_builder.py --diagram`). Tầng của Mix ở
`config/pbi-diagram.json`: 8 fact khuyến mãi/chiến dịch ở trên, 8 fact bán hàng ở dưới, 8 dim ở giữa, hai fact chiến
dịch nhét dưới `Dim_PromotionMetric`/`Dim_PromotionCampaign`, `#Measure` cột cuối (tối đa 13 cột bảng, 29/09). Cổng `diagram`.

## 5p. BẢNG AGG CỦA KHO — measure nào đọc bảng nào *(repo quản lý vùng dựng 2026-09-27, chỉ áp cho Mix; Classic giữ bảng cũ để đối chiếu)*

| Measure | Bảng | Ghi chú |
|---|---|---|
| `#Sale of Promotion` | `Agg_PromotionDaily[Amount]` | ngày × cửa hàng × kênh × chương trình |
| `#TC of Promotions` | `Agg_PromotionProgramSetDaily[BillCount]` | grain theo **tổ hợp** chương trình của bill ⇒ chọn nhiều chương trình vẫn đếm mỗi bill một lần |
| `#GC of Promotions` | từ 01/09/2025 `Agg_PromotionDaily`, trước đó `Agg_PromotionProgramSetDaily` | lọc ngày bằng cột `ShiftDate` của chính bảng Agg, **không** bằng `Dim_Date` (đè slicer ngày) |
| `#Total … Treatas` | `VALUES(Agg_PromotionDaily[StoreID])` | |
| `~Quantity of Promotions` | `Agg_SaleDiscountDaily[Quantity]` | |
| `#Revenue Monthly` | `Agg_SaleDetailMonthly[LineAmount]` | **chỉ** trang lọc theo năm/tháng/cửa hàng/kênh (Executive) |

- `Dim_DiscountProgram` 1–* `Bridge_DiscountProgramSet` (theo `ProgramID`). Từ bảng cầu sang `Agg_PromotionProgramSetDaily`
  **không** dùng quan hệ nhiều-nhiều: measure chuyển danh sách `ProgramSetKey` bằng `TREATAS` khi `Dim_DiscountProgram`
  đang bị lọc (không repo nào có quan hệ nhiều-nhiều do Desktop ghi để chép khuôn; số đo trước/sau vẫn khớp 10/10).
- 🔴 **Model view trống dây ngay sau khi mở là bình thường** *(người dùng hỏi 27/09)*: Desktop vẽ dây sau khi model
  DirectQuery nạp xong (~2 phút). Kiểm DMV trước khi kết luận thiếu quan hệ — xem `pbi-pbip` §1c mục 6.
- 🔴 **`#Revenue` trên bảng tháng sai khi trang có bộ lọc dưới mức tháng.** Product Mix và Product có slicer khung giờ
  (`Fact_Sale[DatePartSale]`) và loại ngày (`Fact_SaleDetail[WeekdayType]`), Weekly đọc theo tuần ⇒ ba trang đó giữ
  `#Revenue` trên `Fact_SaleDetail`. Cổng nhận `#Revenue Monthly` thay `#Revenue` nhờ khoá `equivalent_measures`.
- 🔴 **Cột `Discount` của `Agg_SaleDiscountDaily` = `-[AmountTotal]`, không phải `-[Amount]`.** Tin repo quản lý vùng ghi `-[Amount]`
  vì nghĩ pivot đặt `Discount` ở hàng; thật ra hai pivot trang Promotion đặt nó ở **giá trị** (Legacy `Sum(DISCOUNT)`),
  còn `Amount` là mức giảm một dòng nằm trong grain ⇒ cộng `-Amount` trên bảng Agg ra sai tổng.
- `ProgramID` là `int64` ở cả dim và hai fact (bỏ `CAST … nvarchar` và bước ép text) — cùng kiểu với bảng Agg.

## 5r. TÊN TRANG KHÔNG MANG MÃ PHÒNG BAN, KHÔNG MANG CHỮ REPORT / DASHBOARD

> 30/09: *"store report rồi giờ còn monthly report, t nghĩ là trang nên rút gọn tên lại hết, mấy cái chữ report với dashboard là nó thừa"*
> ⇒ header đã ghi `STORE REPORT`: `Monthly Report → Monthly` · `Weekly Report → Weekly` · `Daily Sales Report → Daily` (trang đặt theo KỲ như Monthly · Weekly · Hourly, bỏ cả chữ Sales) ·
> `Hourly Report → Hourly` · `Executive Dashboard → Executive` · `MCP Report → MCP` · `Delivery Details Report → Delivery Details` ·
> `Monthly Sales Report By Item → Monthly Sales By Item`. Cổng `page-name` đỏ khi tên trang còn chữ `Report` / `Dashboard`.
> ⚠ Bỏ / đổi tên trang làm lệch chữ cái thư mục measure ⇒ `--measure-folders` (30/09 sửa: nhận thư mục cũ theo TÊN trang, không theo
> chữ cái; placeholder đã có thì dời, không khai lần hai).


Report đã là của phòng ⇒ tên trang **không** thêm `ABC`: `Monthly Report` · `Weekly Report` · `Daily Sales
Report` · `Operation` (không phải `... ABC`, `ABC Operation`). Tên ngắn, nói trang là gì. Đổi tên bằng
`mix_builder.py --rename-page <pageId> "<tên mới>"` — sửa cùng lúc `page.json`, chữ trên header (kèm bề ngang
khung) và thư mục measure chữ cái của trang. Cổng `page-name` báo đỏ khi tên trang còn mã phòng ban.

🔴 **Report chỉ có MỘT trang hiện ⇒ trang đó tên `Overview`, không lặp tên report.** Header đã mang tên report; tên trang
nhắc lại cùng chữ là thông tin rỗng. Đếm theo trang HIỆN (`HiddenInViewMode` không tính). Đổi bằng
`mix_builder.py --rename-page <pageId> "Overview"`, đổi `key` trong `mix_specs` thành `Overview` rồi dựng lại trang (bookmark
`01_Overview_*`, thư mục measure `B. Overview`). Tab đầu vẫn là `Summary` (`Overview` là tên TRANG, luật `tab-page-name`).
Cổng `single-page-overview` (lớp tĩnh): report một trang hiện mà tên trang khác `Overview` ⇒ đỏ.

## 5q. THƯ MỤC MEASURE MANG CHỮ CÁI, KHÔNG MANG SỐ

Power BI xếp tên thư mục theo **chữ**: `1.` `10.` `11.` `2.` … ⇒ số thứ tự trang vô dụng từ trang 10. Đổi sang chữ cái:
`A. Calculation` (dùng chung) rồi `B.` … theo **đúng thứ tự trang hiện**, tên thư mục = **tên trang** (`B. Monthly Report
ABC` … `P. MCP Report`). Trang chưa có measure giữ thư mục bằng `~Placeholder <key>` ẩn (`chuẩn phòng ban §2c`). Thư mục
của trang đã xoá (`10. Detail`) về `A. Calculation`. Đổi thứ tự trang ⇒ chạy lại `mix_builder.py --measure-folders`
(bảng thư mục cũ → trang ở `MEASURE_FOLDER_PAGE`). Cổng `measure-folder`. ✅ `chuẩn phòng ban §2c②` đã đổi sang chữ cái (repo quản lý vùng, 28/09).

## 6. Bẫy đã trả giá

- 🔴 **Desktop TỰ SỬA FILE khi Save** — ghi trạng thái đang xem thành mặc định trang (đo thật: 16
  visual đổi ẩn/hiện) · dọn resource không ai tham chiếu (mất PNG trong suốt ⇒ nút hết bấm được) ·
  giữ thẻ lọc nhưng **xoá giá trị** (`BusinessUnit` mất `'Southern'` ⇒ đổi số toàn báo cáo, lặng).
  Dò bằng cách so **TẬP HỢP** với `git show HEAD:<path>`, đừng đọc `git diff` tuyến tính.
- 🔴 **PBIR và `Report/Layout` của `.pbix` là HAI schema khác nhau** — chuyển tay là vỡ file; chép
  khuôn từ một visual PBIR **đang render**. **`$schema` phải trùng phiên bản file đang khai.**
- 🔴 **Desktop báo *"ran out of memory loading the data model"* KHÔNG phải lỗi file** — đo RAM trước
  khi kết luận, đừng đi sửa một file đang đúng.
- 🔴 **`shape` mang `visualLink` không bấm được**; mọi link phải trỏ tới bookmark **có thật**.
  ⚠ Ghi file **giữ đúng EOL đang có trên đĩa** (`Rule_Gate_24_EolKeep`) — Desktop ghi PBIR là **CRLF**.

📌 Số đo + cách đọc hộp thoại khi title rỗng: [`reference/measured.md`](reference/measured.md) §2–§3.

## 7. Nghiệm thu

> 🔴 **CHẠY LỆNH, ĐỪNG ĐỌC CHECKLIST.** Toàn bộ cổng dưới đã thành phép máy:
>
> ```
> python scripts/pbi_gate.py reports/<tên_report> --page <pageId>     # một trang
> python scripts/pbi_gate.py reports/<tên_report> --page all          # mọi trang hiện (Mix đang ở đây)
> ```
> Ra `GATE GREEN` mới được mở Desktop. `--page` là trang đã áp chuẩn đầy đủ; trang khác chỉ cảnh báo.
> **Mỗi lần người dùng phải chỉ lại một lỗi đã có luật ⇒ thêm phép kiểm vào script đó**, đừng chỉ thêm chữ
> vào file này (`HP điều 18`). Văn xuôi không tự thi hành — đó là lý do cùng một lỗi lặp nhiều lượt.


**Tám cổng tĩnh, chạy hết TRƯỚC khi mở Desktop — mọi cổng phải ra 0:**

```
grid5       mọi x·y·width·height chia hết 5, mọi object  <- QUY TẮC 0-5, áp CẢ TRANG
            (lấy từ bộ Main: mọi số phải kết bằng 0 hoặc 5)
tràn nhóm   x,y >= 0 và x+w <= W(cha) và y+h <= H(cha)
nhóm gốc    số nhóm cấp trang = đúng 4
bookmark    không trỏ vào visual đã xoá  ·  $schema đúng bản Desktop đang ghi (2.1.0)
header-text khung tên báo cáo = W_chữ + 20  ·  x(tên trang) = x(tên file) + W_chữ + 3 x size
legend      chart trục = 'Top' (neo trái), donut/pie = 'RightCenter'; 'TopLeft' KHÔNG hợp lệ.
            Không khai = mặc định 'Top'. Chỉ CẢNH BÁO, agent không sửa
grid5       mọi x·y·width·height chia hết 5 — trừ CHIA ĐỀU ra số lẻ (327.5 · 632.5 · 313.75): khối có anh em
            cùng cỡ, khối liền sau nó, và những gì nằm trong nó (§4f)
equal-split hai khối kề nhau cùng cột / cùng hàng lệch nhau <= 5 px = chia lệch (325/330) -> chia đều tuyệt đối
matrix-few  matrix 1 dòng -> thẻ số · một field dòng <= 6 giá trị, không field cột -> biểu đồ (lớp engine đếm) (§5l-quater)
axis-sort   trục WeekPeriod phải khai sortDefinition theo WeekFridayStart Ascending
            (WeekPeriod lặp lại qua các năm nên không gắn sortByColumn được; thiếu = tuần
            xếp theo doanh thu 19 16 29 38... - bắt được ở trang Weekly 2026-09-25)
bg-inset    trong nhóm dashboard: chart thụt vào BG đúng 5 mỗi phía
            khối 2 lớp kiểu Original template trang 2 (user 09/10): khung ngoài = BG + Title_ + các nhóm con (mỗi nhóm
            một BG); nhóm con = Title_ ghi tên nhóm (hoặc Card_) trên chart — chart bắt đầu 5 dưới tiêu đề, 3 cạnh còn lại 5; KHÔNG tự thêm thẻ/icon khi user chỉ xin tiêu đề
bm-orphan   bookmark không trỏ vào visual ĐÃ XOÁ
on-off-pair mỗi cặp <Tên>_On / <Tên>_Off phải có ĐÚNG MỘT cái isHidden=false
            VÀ khớp từng số x·y·w·h, VÀ z(_On) > z(_Off)   (trừ cặp tab)
bm-main     <Trang>_Main phải trùng khít bookmark tab mặc định
bm-complete targetVisualNames rỗng -> explorationState phải ĐỦ mọi visual lá
            (thiếu = bấm nút xong mất visual)
bm-structure visualContainers KHÔNG chứa id nhóm
            visualContainerGroups KHÔNG chứa id lá        <- trộn là vỡ file
visual-link trỏ tới bookmark CÓ THẬT
            nằm trong visual.visualContainerObjects  (KHÔNG phải visual.visualLink)
kpi-card    cardVisual PHẢI có objects.layout.style='Cards'
            (thiếu -> PBI rơi về bố cục mặc định, bold/vị trí icon đều vô hiệu)
images      mọi ItemName dùng đều khai trong report.json, và mọi mục khai có file thật
JSON        mọi file definition/**/*.json parse được
root-keys   visual.json chỉ được có 9 khoá gốc:
            $schema · name · position · visual · visualGroup
            parentGroupName · isHidden · howCreated · filterConfig
```

🔴 **Cổng "khoá gốc" sinh ra từ một lỗi thật (2026-09-23):** đặt `visualContainerObjects` ở **gốc**
file thay vì trong `visual` ⇒ Desktop chặn mở: *"An additional property 'visualContainerObjects' was
included in the root property"*. **JSON vẫn hợp lệ**, cổng parse không bắt được — chỉ cổng khoá gốc
bắt. Mọi khối format (`visualContainerObjects` · `objects`) nằm **TRONG `visual`**.

🔴 **Cổng THẬT vẫn là mở Desktop** — *"JSON hợp lệ không chứng minh gì"*: khoá bịa và giá trị không
tồn tại đều đúng cú pháp. Chưa mở được Desktop thì **khai thẳng là CHƯA NGHIỆM THU**. Mở Desktop là
**bước CUỐI** — mở rồi còn sửa file là mất việc (`pbip §1`).

## 8. BỘ DỰNG TRANG — `scripts/mix_builder.py` + `scripts/mix_specs.py`

> Bản trước nằm ở thư mục nháp và **mất khi hết phiên** ⇒ nay ở `scripts/`, có git.

```
python scripts/mix_builder.py <pageId> [<pageId> ...]
```
- **Khung** (header · bảng lọc · Glossary · nút · dải tab) chép từ trang **Weekly** đã chuẩn; **slicer và
  visual nội dung** của trang đích giữ nguyên id, xếp lại theo `mix_specs.py`.
- Slicer không có nhãn (nằm ở dải header bản cũ) ⇒ sinh nhãn từ tên field hiển thị, chuyển `Dropdown`.
- **Mỗi khung `BG_` ôm đúng MỘT visual** thụt 5 (cổng `bg-inset`); card (`Card_`) và nút (`BT_`) được miễn.
  Visual được đặt tên mà chưa có tiêu đề ⇒ khai `title.show=false` để tên kỹ thuật không lộ.
- Bookmark sinh lại: `Main` · `CloseHidden` · `OpenFilter` · `OpenGlossary` · mỗi tab một cái —
  tab/`Main` chụp cả trang, lớp phủ khoanh vùng. Trạng thái mặc định trang = `Main`.
- **Chạy lại được** trên trang đã dựng (khung cũ bị xoá và sinh lại). Ghi file giữ **đúng kiểu Desktop**:
  cùng EOL, **không** dấu xuống dòng cuối — thêm vào là mỗi file lệch một dòng giả.
- Spec hỗ trợ: `('__keep__', pos, groupId)` giữ NGUYÊN một nhóm có sẵn (hàng card · khối có nút chuyển
  view) · `card_tabs=(0)` tab có hàng card ở `(0,0,1270,675)` · `('__loose__', None, [...])` visual đặt thẳng
  trong tab. Bookmark khoanh vùng của khối chuyển view **được giữ** (lọc bỏ visual đã xoá); trạng thái mặc định
  của nhóm giữ lại lấy từ bookmark `_Main` **cũ**, không từ file (Desktop Save lật trạng thái trong file).
- Khung tìm trên trang Weekly **theo tên Selection**, không theo id — Weekly tự dựng lại thì id đổi.
- Sau khi dựng: `pbi_gate --page all` phải xanh rồi mới mở Desktop.
- Mục `('__cards__', (0,0,1270,105), tiles)` dựng hàng thẻ từ thẻ `Revenue` của Weekly, mỗi thẻ là
  `(key, nhãn, measure, màu số, measure dòng % hoặc None, ngưỡng màu)`. Thẻ chia đều bề ngang, id cố định theo
  trang + key nên chạy lại không sinh id mới (§4d-bis).
- Lệnh sửa theo luật 27/09, dữ liệu từng trang nằm trong `mix_specs.py`:
  ```
  python scripts/mix_builder.py --restore-measures    # chép lại measure đã cắt nhầm, nguyên văn từ Classic
  python scripts/mix_builder.py --pct                 # measure bọc có chữ kỳ + màu tăng/giảm (§4j)
  python scripts/mix_builder.py --drop-visuals        # bỏ visual không phải thẻ khỏi dải card (§4i)
  python scripts/mix_builder.py --spread-cards <pageId>   # giãn đều thẻ sau khi bỏ
  python scripts/mix_builder.py --diagram             # xếp sơ đồ model theo DIAGRAM_POS (pbip §1c)
  ```
- 🔴 **SỬA THẲNG FILE THẬT, KHÔNG chạy thử trên bản sao** *(`chuẩn phòng ban §2` "KHÔNG BẢN NHÁP" — thay luật cũ "chạy
  thử trên bản sao `data/_sbx_<tên>`", luật đó đẻ ra 11 thư mục ≈ 2,2 GB không ai duyệt)*. Mốc an toàn = git: commit trạng thái hiện
  có (gồm bản Save của người dùng, §0a) TRƯỚC khi chạy lệnh, rồi chạy thẳng `MIX_ROOT=reports/<report>`; hỏng thì
  `git` đưa về. Lệnh nào quét cả report thì chạy `--dry` (nếu có) để thấy phạm vi trước.
