---
version: 12
lang: vi
---

# app-report — trang báo cáo của app

> Skill CHỨC NĂNG dùng chung cho mọi app có trang báo cáo, kiểu nào cũng vậy (`app-sneat-glass`, `app-glass` …), đứng cạnh
> `app-cross-filter` (các visual lọc lẫn nhau). Luật ở đây là luật đọc của chuẩn Power BI White (`pbi-white` §4–§5r, đã
> chốt với chủ report qua nhiều lượt), viết lại cho trang web; cơ chế riêng của file Power BI (bookmark, khoá JSON, Desktop
> tự sửa file khi Save, lưới toạ độ 5 px) vẫn ở `pbi-white`. Mỗi luật có phép kiểm trong `scripts/report_layout_check.mjs`
> (tên trong ngoặc vuông), bài kiểm trình duyệt của repo chạy trên mọi trang báo cáo; markup mà phép kiểm đọc ở §9.

## 1. Phần trăm

- **Mọi % ghi rõ so với gì** — kỳ (MoM · WoW · QoQ · YoY · LMTD) hoặc mẫu (vs chỉ tiêu · của tổng …) — ngay trong chữ của
  nó, hoặc với tỷ trọng thì trong tiêu đề visual. `55,7%` trơn là sai. Trang lọc tháng đang chạy so lũy kế tháng với cùng số
  ngày của tháng trước (LMTD), không so nửa tháng với cả tháng. [rp-pct-period]
- **Mọi % phải khai** chiều hoặc tỷ trọng: `up` (tăng là tốt) · `down` (tăng là xấu: huỷ, chi phí, hoàn tiền) · `share` (một
  phần của tổng, không tốt xấu). Chưa khai ⇒ đỏ. [rp-pct-declared]
- **Chỉ hai màu, theo chiều đã khai:** tốt xanh, xấu đỏ (chỉ số `down` tăng thì đỏ); tỷ lệ đạt chỉ tiêu lấy ngưỡng 1; tỷ
  trọng không tô màu. Không có dải vàng "gần đạt", không % xám cố định. [rp-pct-color]
- **Card mà con số chính đã là tỷ lệ** (% chỉ tiêu, % biên lợi nhuận) ghi thay đổi bằng điểm %: `+2,5 pp MoM`, không ghi %
  lần nữa. [rp-pct-pp]

## 2. Card

- **Hàng card chỉ chứa card** — không chart, không bảng — **ít nhất bốn**, card nào cũng có dòng %. Trang chỉ tự có 1–3 card
  mới thì bỏ cả hàng; card mang sang từ report đang thay thì giữ và bổ sung cho đủ bốn bằng chỉ số trang đã đọc. [rp-cards]
- **Hàng card đứng riêng một dòng** (v10, user 08/11: "nó không được nằm trong chỗ card, nó phải nằm riêng ra"): không chart,
  donut hay bảng nào đứng cạnh nó trong cùng một hàng của lưới - chart của cùng chỉ số đặt ở hàng dưới. [rp-cards-apart]
- **Card cao vừa nội dung của nó** (v10, user 08/11: "card dài sọc"): không bị kéo cao theo khối đứng cạnh - tối đa 1,6 lần
  các dòng chữ cộng padding, đo trên phần card vẽ ra (v11: `.card-body` của card Sneat giãn theo card). [rp-card-fit]
- **Card quá nhiều cho một dòng thì chia trên dưới thành các dòng đều nhau** (v11, user 08/11: "quá nhiều card thì phải chia
  hàng ra, ko dc cả nùi", "chia trên dưới làm đôi, giữ đúng size và thiết kế card"): card giữ đúng cỡ và thiết kế - không
  bao giờ bị ép hẹp dưới 140 px để giữ một dòng; các dòng dài đều nhau (8 → 4 + 4, 15 → 8 + 7, 7 → 4 + 3) và không card nào
  đứng một mình một dòng. [rp-cards-wrap]
- **Thẻ chỉ số mang nền tô màu theo tông của nó** (v12, user 09/11: "cái này là skill, nên có hook cho skill"): mọi thẻ trong
  hàng thẻ mang `data-tone` (thẻ *i* → ô màu *i* của theme) và được tô bằng màu pastel của tông đó - màu ô ở độ đậm thấp
  (`--tone-bg`), số màu chữ thường, icon màu ô đậm - ở cả hai theme. Không bao giờ là kính trơn của khung, không trắng, không
  hiện tông bằng vạch hay viền một bên; khung giữ nền của thẻ có `data-tone`. Khoá bởi `Rule_Gate_98_FigureCardTone` (hook chặn
  style gỡ nền). [rp-card-tone]
- **Con số không bao giờ làm tròn về 0 kèm đơn vị** (v10, user 08/11: Group Size 1,75 hiện "0 k"): giá trị nhỏ hơn đơn vị thì
  hiện bằng đơn vị nhỏ hơn hoặc số đầy đủ; không bao giờ có `0 k` · `0 tr` · `0 tỷ`. [rp-figure-scale]
- **Tiêu đề card vừa card;** dài thì rút gọn (bỏ vế phụ, nghĩa đủ ghi vào bảng giải thích của trang), không thu nhỏ chữ riêng
  một card — tiêu đề một hàng cùng cỡ, con số cũng vậy. [rp-card-label]
- Màu số trên card theo thứ tự màu của theme (card *i* → màu *i*).

## 3. Màu và nhãn của chart

- **Chart nào cũng đánh dấu chuỗi và lấy màu theo thứ tự màu theme,** nối tiếp trong một màn; **hai chart cùng màn không
  trùng màu chính.** Chuỗi so sánh (LY · LM · LMTD · chỉ tiêu) là các bậc xám. [rp-chart-colour]
- **Nhãn số không có khung nền; mọi nhãn % in đậm.** Chart nào cũng hiện số (`app-sneat-glass` [chart-labels]). [rp-label]

- **Mỗi điểm dữ liệu khi trỏ vào đều cho biết nó là gì** (một cột, một đoạn cột chồng, một chấm, một lát), kèm giá trị,
  như Power BI (user 05/11) - qua tooltip của khung (`data-tip`, nhiều dòng bằng `\n`), không dùng `title` của trình duyệt.
  [rp-tooltip]

## 4. Bảng

- **Mọi bảng một kiểu:** header đậm có nền, dòng xen màu, dòng tổng đậm, chỉ kẻ ngang; cột % tô theo chính chỉ số đó (§1);
  heat map (màu theo cường độ) được giữ. Tên cột là chữ người đọc, không để tên field (`chi_tieu`, `StoreName2`). [rp-table-style]
- **Bảng không dùng cho ít thông tin:** một dòng ⇒ card nhiều giá trị; một chiều ≤ 6 giá trị (không có trường cột) ⇒ chart,
  chỉ số khác đơn vị để trong tooltip (v11, user 08/11: "bảng nào nhỏ ko đáng là matrix thì dùng dạng chart khác") - kể cả
  khi report đang thay vẽ nó thành bảng, và kể cả khi nó có nhiều measure. Bảng chi tiết (mỗi dòng một bản ghi) được miễn;
  bảng ít nhóm không bao giờ được khai là bảng chi tiết. [rp-table-few]
- **Không gì cuộn ngang trong khung, không bảng nào tràn ra ngoài panel** (bề rộng cột đo lúc vẽ lần đầu, nên header được xuống dòng; điện thoại cho bảng dữ liệu cuộn ngang trong khung, app-base M5). Bảng trải theo kỳ chỉ hiện các kỳ gần nhất (cửa sổ đi theo bộ lọc trang); cột rộng
  vừa số dài nhất, tổng vừa khung; vẫn không vừa thì đổi sang triệu một chữ số lẻ. Cuộn dọc là bình thường. [rp-no-side-scroll]
- **Số trong bảng theo định dạng số của từng người** (v9, user 06/11: "setting 1 lần sẽ cho hiện ở cái báo cáo dashboard
  hết… chỉ lấy của table"): Cài đặt > Số của khung chung (đơn vị, số lẻ, làm tròn, dấu phân cách, số âm), lưu trên
  `<html data-num-format>`. Ô số nói nó là gì (`data-rp-num` = `money` · `count` · `pct`) và giá trị gốc (`data-rp-raw`), và
  hiện đúng định dạng đó (`fmtNum` của khung); số âm tô đỏ mang `text-danger`. Chart và card KPI giữ cách hiện riêng. [rp-num-format]
- **Bảng hiện tối đa mười dòng**, phần còn lại cuộn trong khung của chính nó, và vẫn nằm chung trang với các hình khác (v7, user
  06/11: "có giới hạn bao nhiêu dòng, rồi phần còn lại cho scrollbar tự động trong chính dashboard đó"). [rp-table-rows-cap]

## 5. Bố cục

- **Visual cùng loại, cùng trường** (chỉ khác bộ lọc) **xếp một hàng,** cùng chiều cao, chia đều chiều rộng. [rp-same-row]
- **Chia đều là đều tuyệt đối** — hai khối định bằng nhau không lệch vài px (325 + 330). [rp-even-split]
- **Chart rộng theo số nhóm** (khoảng 60 px một nhóm); chart ngắn đặt cạnh nhau; chart ít thông tin (một chuỗi, ít điểm, donut
  vài lát) thì nhỏ — tối đa nửa màn — và donut nằm trong một hàng, không kéo thành cột. Chart dài (≥ 28 nhóm) dùng cả chiều
  rộng và không tự cuộn.
- **Không chart cột nào trống quá 30 % chiều rộng** khi đã đủ dữ liệu (cột trải ít nhất 70 % vùng vẽ; danh sách thanh xếp hạng được miễn); màn không có lỗ. Thiếu nội dung ⇒ đề xuất thêm khối với
  chủ report, không phóng to chart. [rp-fill]
- **Top / Bottom N hiện đúng N** (phá hoà), dạng cột đứng. [rp-topn]
- **Cột của một số tiền không chúc xuống dưới trục:** vẽ số lỗ là số dương, dấu giữ ở nhãn. % được âm. [rp-no-negative-bars]
- **Đáy cột của các chart cùng hàng nằm trên một đường** (cùng chỗ cho nhãn trục). [rp-baseline]

## 6. Tab, tên, tiêu đề

- **Chỉ thêm tab vì quá tải** — nội dung không vừa một màn mà không phạm §4–§5; không tách theo chủ đề. Tab nào cũng đầy; hai
  tab thưa gộp lại dưới một chữ ngắn. Nhãn tab tối đa 10 ký tự và hiện đủ. [rp-tab-label]
- **Tên trang và tab** không mang mã phòng, không có chữ Report / Dashboard / Báo cáo; bảng chỉ một trang thì gọi là Tổng quan.
  [rp-page-name]
- **Visual nào cũng có tiêu đề,** canh trái, một cỡ trên trang; chú giải ở trên bên trái (donut thì bên cạnh). [rp-title]

## 7. Bảng giải thích

- **Mỗi trang báo cáo có bảng giải thích riêng** (sau một nút, không ghim lên trang), nêu mọi chữ người đọc thấy: tiêu đề, tên
  cột và trục, tiêu đề card. Chữ viết tắt ghi kèm nguyên văn một lần (`TC (Transaction Count): số hoá đơn`), tra theo thứ tự
  thuật ngữ của công ty → từ điển hệ cũ → tài liệu DW → chính measure — không tự đặt. Mỗi định nghĩa một dòng. Lời giải thích
  một con số nằm ở đây, không nằm trong khung trên trang. [rp-glossary]
- **Trang báo cáo chỉ có một kiểu xem: không có nút danh sách / thẻ** trên thanh (user 06/11) - báo cáo đọc một cách, nút
  chỉ chiếm chỗ. Trang khai điều đó (`views={false}` trên khung chung của hệ), khung khi đó không vẽ nút. [rp-no-view-switch]

## 8. Dựng lại một report

- **Report đang thay là bản Power BI White** (v11, user 08/11: "pbi classic là cái ban đầu… white mới là cái đã sắp lại rồi"):
  bản classic chỉ là bản nháp đầu; trang, visual và thứ tự theo White, chỉ đọc classic cho trang mà White không có. Đối
  chiếu giữ cái White hiện, theo dạng skill này quy định: hàng card bổ sung cho đủ bốn (§2), bảng nhỏ vẽ thành chart (§4).
- **Mọi trang và mọi visual của report đang thay đều có mặt**, đúng thứ tự. Visual bỏ có chủ đích, hoặc đang chờ nguồn DW
  chưa có, khai trong danh sách đối chiếu của bảng kèm lý do; test của repo so danh sách đó với visual của report (cả hai chiều).
- **Số khớp report:** mỗi measure dựng lại từ công thức và đối chiếu với chính số của report, từng phần; chỗ lệch có chủ đích
  (một phần report để trống) khai kèm lý do.
- Những gì chủ report đã chỉnh giữ nguyên như chủ để lại; bố cục đã chốt chỉ đổi khi được duyệt
  (`Rule_Keys_62_DesignChangeApproval`).

- **Thẻ report ở trang danh mục** xếp các trang của nó thành hai cột đều (`data-rp-card-pages`) và, khi đã dựng, lật được bằng một
  nút ở góc phải trên (`data-rp-card-flip`) sang trạng thái số liệu (`data-rp-card-status`): bình thường, kỳ chưa có số, đọc
  lỗi kèm lần đọc tốt gần nhất, chưa đọc; giờ cập nhật, kỳ, thời gian đọc, chu kỳ tự làm mới. Chỉ phần nội dung lật, nền kính của
  thẻ đứng yên (v7, user 06/11). [rp-card-pages-even] [rp-card-status]

## 9. Hợp đồng markup

| Thuộc tính | Gắn vào | Nghĩa |
|---|---|---|
| `data-rp-page` (`data-rp-dept`) | gốc trang | một trang báo cáo (mã phòng, cho [rp-page-name]); bắt buộc trên mọi trang có điểm dữ liệu, là phạm vi của [rp-marked] (icon dưới 40 px không tính là visual) |
| `data-rp-visual` = `chart` · `donut` · `table` · `cards` | mỗi visual | loại khối; mọi `.card` chứa svg / bảng / điểm dữ liệu phải có [rp-marked] |
| `data-rp-title` | tiêu đề visual | [rp-title] [rp-glossary] |
| `data-rp-fields` | một visual | bộ trường: cùng loại + cùng trường ⇒ một hàng [rp-same-row] |
| `data-rp-axis="column"` · `data-rp-body` | chart cột · vùng vẽ | [rp-baseline] [rp-fill] |
| `data-rp-mark` (`data-rp-compare`, `data-rp-value`) | mỗi cột / lát / điểm | dấu của chuỗi (chuỗi so sánh; giá trị) |
| `data-rp-item` · `data-rp-topn` · `data-rp-rows` | mục · visual Top N · số mục có thật | [rp-topn] |
| `data-rp-label` | nhãn số | [rp-label] |
| `data-rp-pct` = `up` · `down` · `share` | mỗi % (dòng card, nhãn, ô) | [rp-pct-*] |
| `data-tone` = một ô màu của theme | mỗi thẻ chỉ số | nền pastel của nó [rp-card-tone] |
| `data-rp-dims` · `data-rp-rows` · `data-rp-detail` · `data-rp-total` | bảng · dòng tổng | [rp-table-few] [rp-table-style] |
| `data-rp-glossary` (`data-rp-common`) · `data-rp-term` | bảng giải thích · mỗi dòng | [rp-glossary] |
| `data-rp-num` = `money` · `count` · `pct` · `data-rp-raw` | ô số của bảng · giá trị gốc | [rp-num-format] |

Card dùng bốn vai chữ của `app-sneat-glass` (`kpi-title` · `kpi-main` · `kpi-percentage` · `kpi-secondary`).

## 10. Kiểm

- Bài kiểm trình duyệt của repo nhập `scripts/report_layout_check.mjs`, chạy mọi mục `RULES` trên mọi trang báo cáo (mọi màn và
  tab), ở khổ desktop và điện thoại, cả hai theme. Chạy `SELF_TEST` trước: trang tốt qua mọi luật, trang lỗi trượt từng luật,
  nên luật nào cũng đã được chứng minh đỏ. Thêm luật ở đây thì thêm mục ở đó trong cùng lần sửa.
- Máy chưa đo (xét khi trình trang): chiều rộng chart theo số nhóm, donut nằm trong hàng, tab chỉ thêm vì quá tải, màu theo nghĩa.

## Implements · Thi hành luật
- `Rule_Gate_98_FigureCardTone` — a figure card wears the tinted fill of its tone · thẻ chỉ số mang nền tô màu theo tông
- `Rule_Keys_62_DesignChangeApproval` — a report layout is approved before it is built or changed · bố cục báo cáo được duyệt trước khi dựng hay đổi
