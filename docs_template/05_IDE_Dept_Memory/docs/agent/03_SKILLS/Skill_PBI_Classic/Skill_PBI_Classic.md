---
id: Skill_PBI_Classic
name: pbi-classic
version: 2
description: Build the CLASSIC copy of a Power BI report - keep the OLD design exactly, move only the model onto the warehouse: map tables to Dim_*/Fact_*, port measures, rebind visuals, then MEASURE how far the numbers match the old one. Use whenever an old dashboard moves onto the warehouse, the old report serves as the warehouse's test, or the question is what the warehouse still lacks. Not for a new design. Vietnamese triggers - "bản classic", "tái tạo dashboard cũ", "đổi model sang DW", "so số với bản cũ", "kho còn thiếu gì".
from: _Store/03_SKILLS/Skill_PBI_Classic @v2 #aab4b566fdde
---

# Bản `Classic` — giữ nguyên thiết kế CŨ, chỉ đổi lớp model sang kho

> 🔴 **`Classic` = thiết kế CŨ chạy trên nền dữ liệu MỚI.** Tên này là thuật ngữ đã dùng trong estate
> (`ABC_IncomeStatementClassic`) — **đừng đọc ra thành "bản mới"**. Bản thiết kế mới là một artifact
> KHÁC, sống song song và không đè nhau; lẫn hai cái là mất mốc so sánh duy nhất.
>
> File này nói **CÁCH DỰNG BẢN CLASSIC**. Thao tác file `.pbip` (bookmark · nút · icon · lưới) ở skill
> **`pbi-pbip`**; luật THIẾT KẾ ở chuẩn thiết kế của vùng (`design_standard` trong giá trị vùng).
> Khác `pbi-pbip` ở chỗ: `pbi-pbip` sửa một report ĐANG là của mình, file này **chuyển một report của người
> khác sang nền dữ liệu khác mà không được đổi hình hài nó**.

## 0. Vì sao làm kiểu này — đọc trước khi bàn phương án

Bản cũ là **mốc so sánh DUY NHẤT**. Giữ nguyên thiết kế rồi chỉ thay lớp dữ liệu thì mọi ô lệch đều
quy về đúng một nguyên nhân: **kho**. Đổi thiết kế cùng lúc là tự bỏ mốc đó, và sau đó không ai
chứng minh được số sai vì kho hay vì mình vẽ lại.

⇒ **Đầu ra có giá trị nhất KHÔNG phải cái report** — mà là **danh sách kho còn thiếu**, lộ ra do
report đòi mà kho không đáp được.

## 1. Ba điều KHÔNG làm

- **KHÔNG đổi thiết kế.** Toạ độ · cỡ chữ · bố cục · thứ tự trang giữ nguyên. Thấy chỗ xấu thì **BÁO**
  (`chuẩn phòng ban §2e`). Lưới 5 và bảng màu của chuẩn **không áp** cho bản mô phỏng.
- **KHÔNG bịa số.** Chỗ kho chưa đáp được thì để **trống có ghi chú**, không thay bằng ước lượng.
  *Bản cũ đã trả giá đúng chỗ này: `[COGs_PnL] = TotalSale × 0.39` — một tỷ lệ ước mang cái tên nghe
  như thật, và có người đi tìm chi phí trong đó.*
- 🔴 **KHÔNG ép kho về hình dạng bảng cũ.** Viết `CASE WHEN`/`UNION ALL` để nặn `Fact_*` thành đúng
  khung bảng cũ thì **phép kiểm mất nghĩa**. Nguyên văn *"m chỉnh sửa linh tinh rồi
  việc check DW có tác dụng gì"*. Phải **kéo thẳng bảng gốc** rồi join qua khoá.
- 🔴 **KHÔNG "chuẩn hoá" chữ NGƯỜI ĐỌC THẤY.** Bản `Classic` chạy **hai tầng tên**:
  **trong model** (bảng · cột · measure · thư mục) theo **chuẩn mới**; **nhãn trên visual, tiêu đề, nhãn
  slicer** giữ **nguyên văn bản cũ**. Xung đột ⇒ **UI THẮNG** — đổi nhãn cho "đúng chuẩn" là làm bản mô
  phỏng khác bản cũ ở đúng chỗ người dùng nhìn. Bảng đối chiếu bốn loại file `Legacy`/`Classic`/`Mix`/`Main`:
  skill `pbi-pbip` §0.

## 1b. 🔴 XOÁ SẠCH MODEL CŨ TRƯỚC KHI DỰNG — không phải dọn sau

Áp cho **mọi bậc đọc kho**: `Classic` · `Mix` · `Main`. Bậc `Legacy` thì không — nó *là* bản hệ cũ.

```
SAI:  đổi nguồn từng bảng -> bảng nào không ai dùng thì ĐỂ LẠI
ĐÚNG: XOÁ HẾT bảng đọc hệ cũ -> rồi mới kéo bảng kho về
```

**Phép kiểm #7 ở §4 (*"model còn đọc nguồn hệ cũ"*) là MỤC TIÊU CỦA CẢ LƯỢT, không phải một
mục trong danh sách.** Một bảng còn trỏ một nguồn khai ở `legacy_sources` là bản mô phỏng
**chưa rời hệ cũ**, nên nó không chứng minh được điều nó sinh ra để chứng minh.

🔴 **"Không visual nào dùng" KHÔNG phải lý do giữ lại.** Đó đúng là câu biện minh đã xảy ra thật
(một report Classic): 6 bảng hệ cũ + 2 bảng SharePoint được giữ với lý do
0 visual, model vẫn load xanh, Desktop không kêu gì — và người dùng phải tự phát hiện khi mở danh sách
bảng ra nhìn. **Máy không bắt được, chỉ mắt người bắt được** ⇒ phải là luật, không phải thói quen.

**Xoá một bảng là xoá SÁU chỗ** — thiếu một chỗ thì Desktop không mở được:
```
tables/<Tên>.tmdl            quan hệ trong relationships.tmdl
LocalDateTable mồ côi        measure chỉ dùng bảng đó
mục trong cultures/*.tmdl    tên trong annotation PBI_QueryOrder của model.tmdl
```

**Nghiệm thu, chạy trước khi mở Desktop:**
```
grep -lE '<mọi mục của legacy_sources, nối bằng |>' tables/*.tmdl   ->  PHẢI RỖNG
```
⚠ Báo oan hay gặp: tên bảng giữ chứa tên bảng đã xoá như chuỗi con (`DimStore` nằm trong
`DimStore <Tên công ty>`, và `DimStore_<ten_cong_ty>` trong lược đồ ngôn ngữ). Khớp theo **ranh giới từ**, đừng
khớp chuỗi con.

🔴 **Classic KHÔNG nhận luật chỉnh UI nào** *("classic là giữ nguyên thiết kế, ko có chuẩn chỉnh UI nào áp lên Classic hết" — tiêu đề Classic bị đổi font / viết hoa theo luật Mix rồi phải trả lại)*: font, cỡ, canh lề, viết hoa tiêu đề, bề rộng cột, màu, bố cục… giữ như bản cũ. Classic chỉ đổi lớp DỮ LIỆU (model → kho, measure, khoá nối). Cổng: mọi luật thiết kế Mix/Main (`title-font` · `title-case` · `row-wrap` · `header-wrap` · `narrow-table` …) bỏ qua `_Classic` / `_Legacy`.

🔴 **Bảng và đường nối CHỈ theo kho** *(chuẩn kho sửa lại 13/10)*: mọi `Dim_/Fact_/Bridge_/Agg_` của model là
bảng kho CÙNG TÊN (không bảng DAX tự dựng, không bảng ghép tay); mọi relationship đi đúng khoá ngoại kho có. Kho thiếu bảng / khoá
⇒ xin kho thêm, KHÔNG tự dựng tạm. Áp cho Classic · Mix · Main. Cổng `dw-only-tables` (lớp static + dw).

⚠ **Desktop tự sinh `LocalDateTable` mỗi lần refresh** (auto date/time). Với `Import` thì vô hại,
nhưng **`DirectQuery` không cho** ⇒ tắt auto date/time trước khi chuyển bậc.

## 2. Quy trình — sáu bước

```
1. COPY bản cũ ra ngoài vùng mirror   _Legacy là Syncthing RECEIVEONLY:
                                      sửa tại chỗ sẽ bị revert, luôn copy ra trước
2. Save As .pbip                      .pbix thì DAX bị nén XPress9, agent mù (chuẩn phòng ban 2b)
3. MỞ model cũ                        liệt kê: bảng · nguồn · measure · cột tính · binding
4. THAY bảng                          xoá sạch bảng cũ -> kéo THẲNG bảng gốc của kho:
                                      Source{[Schema="dbo",Item="<Bảng>"]}[Data]
5. PORT measure                       DAX thường trên bảng kho, giữ ĐÚNG tên cũ nếu còn dùng
6. NỐI lại binding                    mọi visual.json trỏ về tên bảng/cột mới
```

📌 **Số của một lượt thật (2026-09-15, `Store Dashboard Income Statement`)** để biết khối lượng:
11 bảng cũ → **6 bảng kho** + 3 quan hệ · **53 measure → 92** · **319 binding** trên ~100 file visual.

🔴 **Report MỎNG (thin, nối live model khác) có measure CẤP REPORT** trong `definition/reportExtensions.json`; visual trỏ tới chúng
bằng `SourceRef` có **`"Schema": "extension"`**. Chuyển các measure đó vào model của bản Classic thì **gỡ luôn khoá `Schema`** ở mọi tham
chiếu (cả trang tooltip ẩn). Giữ lại ⇒ refresh xong visual báo *"Something's wrong with one or more fields"*, và nút **Fix this XOÁ
trường** thay vì nối lại *(04 IP Classic 17/10: mất 3 cột của "Revenue Yesterday of Store" + tooltip "Same Store SG LM")*. Cổng
`extension-ref`.

🔴 **Bước 3 phải ra một FILE bằng chứng**, không giữ trong đầu: bảng cũ đọc nguồn nào · measure nào
tính gì · cột nào là cột tính tại chỗ. Không có file này thì bước 6 không biết nối về đâu, và cuối
lượt không trả lời được câu *"cái gì chưa port"*.

## 3. Ba cột cờ của lớp TRÌNH BÀY — nằm trong model của report, KHÔNG vào kho

🔴 **Phép thử: *"thứ này có nằm trong Excel / server nguồn để kéo về không?"*** Không ⇒ nó là **logic
trình bày**, dựng ở Power Query của report, **không được đưa vào kho**.

Ví dụ đã chạy thật: cờ chọn dòng hiển thị · cờ "dòng này có trong danh mục cũ" · màu dòng port từ cột
`Row_Color` của bảng cũ. Cả ba là lựa chọn trình bày **của một báo cáo**, không phải sự thật nghiệp vụ.

⚠ **Ca kinh điển — DÒNG TỔNG HỢP.** Hệ cũ hay có mấy dòng kiểu `MCP` · `PROFIT` · `EBITDA` nằm lẫn
trong danh mục dòng. Dò ra chúng **không tồn tại ở nguồn gốc nào** (mã thật của ERP chỉ tới một mức
nào đó) ⇒ chúng là **measure, không phải dòng dữ liệu**. Cho chúng vào kho là làm bẩn dim dùng chung
của mọi phòng. Dựng ở Power Query của report, mang đúng mã cũ để binding không gãy.

## 4. Bộ kiểm TĨNH — chạy TRƯỚC khi mở Desktop

> 🔴 **Luật model đọc kho (DirectQuery · chuỗi server gateway `<warehouse_server>` · 0 nguồn hệ cũ ·
> DAX chạy được trên web) ở `pbip §1b`** — cổng `dw-model` + `file-name` của `scripts/pbi_gate.py` chạy cho
> mọi bản Classic/Mix/Main.

Mỗi lỗi Desktop từng bắt đều đẻ ra một phép kiểm ở đây, để lần sau bắt **trước** khi mở:

| # | Kiểm gì | Sinh ra từ |
|--:|---|---|
| 1 | **tên measure trùng nhau khi BỎ QUA HOA/THƯỜNG** | `%COGS of Revenue` đụng `%Cogs of Revenue` |
| 2 | tên cột trùng trong một bảng | — |
| 3 | DAX trỏ cột không tồn tại | dùng giá trị của cột này làm tên cột kia |
| 4 | `formatString` có nháy mà **không escape kiểu TMDL** | `"TRUE";"TRUE";"FALSE"` làm vỡ file |
| 5 | binding của report không khớp model | nối lại hàng trăm tham chiếu |
| 6 | `cultures` trỏ đối tượng không tồn tại | — |
| 7 | model còn đọc nguồn hệ cũ | **mục tiêu của cả lượt** |
| 8 | JSON hợp lệ | — |

🔴 **Phép thứ 9 — LỆCH KIỂU giữa hai cột đem so sánh — TÁM PHÉP TRÊN KHÔNG BẮT ĐƯỢC**, vì cả hai cột
đều tồn tại. Ca thật: `Dim_Date[MonthNumber]` là **text** (`"01".."12"`) còn `ParameterDate[Month]`
của kho là **số** ⇒ 4 measure vỡ với *"DAX comparison operations do not support comparing values of
type Text"*. **Chỉ lộ khi chạy DAX thật:** mở Desktop rồi nối
`Provider=MSOLAP;Data Source=localhost:<cổng msmdsrv>`, chạy `EVALUATE ROW("v",[measure])` cho từng
measure — cái nào ném lỗi là lộ ngay.

⚠ **Bẫy cùng họ, ÂM THẦM hơn: giá trị đổi mà kiểu KHÔNG đổi.** `Quarter` bản cũ là `"Q1".."Q4"`, kho
trả `"1".."4"` — không lỗi gì cả, chỉ **đổi chữ trên slicer**. Chỉ lộ khi đọc `VALUES(...)` ra so.
Vá bằng cột dẫn xuất (`QuarterLabel = "Q" & Quarter`), **không sửa chữ người đọc thấy**.

## 5. Ba con số phải báo — định nghĩa TRƯỚC khi làm

```
ĐỘ PHỦ MEASURE   số measure port được / tổng measure cũ     (port được = chạy ra số, không lỗi)
ĐỘ PHỦ FIELD     số field visual nối được / tổng field cũ
ĐỘ KHỚP SỐ       số ô khớp bản cũ / tổng ô đối chiếu
```

- 🔴 **"Port được" ≠ "đúng số".** Một measure chạy ra số vẫn có thể sai; **độ khớp số là cổng riêng**.
- 🔴 **Ô không đối chiếu được (vì kho thiếu nguồn) KHÔNG tính là lệch** — xếp riêng thành nhóm *"chưa
  đối chiếu được"* kèm lý do. Gộp nó vào nhóm lệch là làm hỏng chính con số cần báo.
- 🔴 **QUÉT FULL mọi kỳ × mọi đơn vị × mọi dòng** (`chuẩn phòng ban §7`), chia lô mà quét — đừng chọn
  mẫu. API dò dữ liệu **cắt ở ~1.000 dòng mà không báo** (`HP điều 9`), nên không chia lô là ra số
  thiếu trong im lặng.

**Cách đo khớp:** `FULL OUTER JOIN` hai bên cùng instance, gom theo khoá kỳ + đơn vị + dòng, đếm ô
lệch. *Lượt thật: `46.764` ô → khớp `46.760`, lệch `4` — và cả 4 đều là **hệ cũ sai**, không phải bản
mới sai.*

🔴 **Lệch KHÔNG mặc nhiên là mình sai.** Truy tới cùng rồi mới kết luận: bản cũ có thể đang đọc một
bảng **đóng băng** (nạp một lần rồi đứng yên) trong khi kho đọc nguồn live ⇒ **số của kho đúng hơn**,
và đó là một **defect của hệ cũ** phải ghi vào catalog, không phải lỗi phải vá cho khớp.

## 6. Nghiệm thu

Một **trang** xong khi: mọi visual nối được field · mọi measure chạy ra số · số khớp bản cũ, **trừ**
những ô đã khai rõ ở nhóm *"chưa đối chiếu được"*.
Cả **báo cáo** xong khi mọi trang hiện đều đạt **và** danh sách kho-còn-thiếu đã gửi sang repo sở hữu
kho (`repo quản lý vùng`) — repo đó giữ DDL, repo phòng chỉ đặt yêu cầu và nghiệm thu.

⚠ **Bản mô phỏng trông y hệt bản cũ nhưng số đến từ kho** ⇒ `spec.md` của case **và chính báo cáo**
phải nói rõ, nếu không thì rơi đúng bẫy *hai thứ khác bản chất mang cùng một tên*.
