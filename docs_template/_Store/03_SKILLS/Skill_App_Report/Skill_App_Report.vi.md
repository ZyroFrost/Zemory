---
version: 16
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
- **Hàng card đứng riêng một dòng** (v10): không chart,
  donut hay bảng nào đứng cạnh nó trong cùng một hàng của lưới - chart của cùng chỉ số đặt ở hàng dưới. [rp-cards-apart]
- **Hàng card nằm trên một hàng có cùng số panel thì thẳng mép với chúng** (v15): mỗi card rộng bằng panel bên dưới, lệch tối đa
  2 px, kể cả khi panel nới ra cho bảng - card đi theo bề rộng panel (px bố cục: khung có zoom làm thu số đo khung chữ nhật, không
  thu bề rộng được đặt). [rp-cards-aligned]
- **Card cao vừa nội dung của nó** (v10): không bị kéo cao theo khối đứng cạnh - tối đa 1,6 lần
  các dòng chữ cộng padding, đo trên phần card vẽ ra (v11: `.card-body` của card Sneat giãn theo card). [rp-card-fit]
- **Card quá nhiều cho một dòng thì chia trên dưới thành các dòng đều nhau** (v11): card giữ đúng cỡ và thiết kế - không
  bao giờ bị ép hẹp dưới 140 px để giữ một dòng; các dòng dài đều nhau (8 → 4 + 4, 15 → 8 + 7, 7 → 4 + 3) và không card nào
  đứng một mình một dòng. [rp-cards-wrap]
- **Thẻ chỉ số mang nền tô màu theo tông của nó** (v12): mọi thẻ trong
  hàng thẻ mang `data-tone` (thẻ *i* → ô màu *i* của theme) và được tô bằng màu pastel của tông đó - màu ô ở độ đậm thấp
  (`--tone-bg`), số màu chữ thường, icon màu ô đậm - ở cả hai theme. Không bao giờ là kính trơn của khung, không trắng, không
  hiện tông bằng vạch hay viền một bên; khung giữ nền của thẻ có `data-tone`. Khoá bởi `Rule_Gate_98_FigureCardTone` (hook chặn
  style gỡ nền). [rp-card-tone]
- **Con số không bao giờ làm tròn về 0 kèm đơn vị** (v10: Group Size 1,75 hiện "0 k"): giá trị nhỏ hơn đơn vị thì
  hiện bằng đơn vị nhỏ hơn hoặc số đầy đủ; không bao giờ có `0 k` · `0 tr` · `0 tỷ`. [rp-figure-scale]
- **Tiêu đề card vừa card;** dài thì rút gọn (bỏ vế phụ, nghĩa đủ ghi vào bảng giải thích của trang), không thu nhỏ chữ riêng
  một card — tiêu đề một hàng cùng cỡ, con số cũng vậy. [rp-card-label]
- Màu số trên card theo thứ tự màu của theme (card *i* → màu *i*).

- **Số của card không bao giờ tràn mép** (v13): số là chữ (tên nhà hàng) thì nhỏ lại theo bề ngang card, vẫn dài thì
  "…"; card một nhà hàng hiện tên ngắn, tên đủ ở tooltip, không lặp ở dòng dưới. [rp-card-no-overflow]

## 3. Màu và nhãn của chart

- **Chart nào cũng đánh dấu chuỗi và lấy màu theo thứ tự màu theme,** nối tiếp trong một màn; **hai chart cùng màn không
  trùng màu chính.** Chuỗi so sánh (LY · LM · LMTD · chỉ tiêu) là các bậc xám. [rp-chart-colour]
- **Nhãn số không có khung nền; mọi nhãn % in đậm.** Chart nào cũng hiện số (`app-sneat-glass` [chart-labels]). [rp-label]

- **Mỗi điểm dữ liệu khi trỏ vào đều cho biết nó là gì** (một cột, một đoạn cột chồng, một chấm, một lát), kèm giá trị,
  như Power BI - qua tooltip của khung (`data-tip`, nhiều dòng bằng `\n`), không dùng `title` của trình duyệt.
  [rp-tooltip]

- **Chart có legend theo một trường thì vẽ chồng theo legend** (v13): cột hay thanh chia
  theo giá trị của legend, màu của report, mỗi phần đủ rộng (6 % bề dài) mang số của nó, tổng ở cuối thanh hay đầu cột.
  [rp-stacked-labels] Các chart chồng theo cùng một trường mang màu cố định của trường đó ở mọi chart của trang (mỗi giá trị một
  màu, như xếp loại A/B/C/D) - hai chart như vậy trùng màu là đúng; chart một chuỗi vẫn lấy màu chính riêng.
- **Số của chart đường không đè nhau** (v13): không hai nhãn số nào của một hình giao nhau; nhãn
  mang màu chuỗi của nó. [rp-labels-apart]
- **Tooltip mỗi dòng một thông tin, "Trường: Giá trị"** (v13): `Tháng: T3` · `Xếp loại: C` · `Số NH: 15` · `Tỷ lệ: 36%`,
  số viết đủ (244.008.536.989), không cắt thành tỷ / tr / k; % và điểm giữ dạng. [rp-tip-field-value]
- **Màu trên một con số nói mức của nó, không bao giờ để trang trí** (v13, như tô màu có điều kiện của Power BI): một thang mức cho cả app, tốt tới xấu - xanh · vàng ·
  cam · đỏ; xếp loại A/B/C/D theo cùng thang; sọc xen kẽ của bảng không bao giờ đè ô tô theo giá trị; không màu tím hay info cho một
  mức. [rp-value-colour]
- **% so chỉ tiêu tô theo giá trị thật** (v13): < 40 % đỏ · 40 tới < 70 % cam · 70 tới < 100 % vàng · từ 100 % xanh - bốn màu, không bao giờ hai.
  [rp-target-graded]

## 4. Bảng

- **Mọi bảng một kiểu:** header đậm có nền, dòng xen màu, dòng tổng đậm, chỉ kẻ ngang; cột % tô theo chính chỉ số đó (§1);
  heat map (màu theo cường độ) được giữ. Tên cột là chữ người đọc, không để tên field (`chi_tieu`, `StoreName2`). [rp-table-style]
- **Bảng không dùng cho ít thông tin:** một dòng ⇒ card nhiều giá trị; một chiều ≤ 6 giá trị (không có trường cột) ⇒ chart,
  chỉ số khác đơn vị để trong tooltip (v11) - kể cả
  khi report đang thay vẽ nó thành bảng, và kể cả khi nó có nhiều measure. Bảng chi tiết (mỗi dòng một bản ghi) được miễn;
  bảng ít nhóm không bao giờ được khai là bảng chi tiết. [rp-table-few]
- **Không gì cuộn ngang trong khung, không bảng nào tràn ra ngoài panel** (bề rộng cột đo lúc vẽ lần đầu, nên header được xuống dòng; điện thoại cho bảng dữ liệu cuộn ngang trong khung, app-base M5). Bảng trải theo kỳ chỉ hiện các kỳ gần nhất (cửa sổ đi theo bộ lọc trang); cột rộng
  vừa số dài nhất, tổng vừa khung; vẫn không vừa thì đổi sang triệu một chữ số lẻ. Cuộn dọc là bình thường. Hộp cuộn ngang riêng của
  bảng (`table-boxed` của app-sneat-glass) không phải là cuộn khi bảng vừa nó: chỉ bảng rộng hơn panel, hay hộp có nội dung tràn, mới
  phạm luật này (v13). [rp-no-side-scroll]
- **Số trong bảng theo định dạng số của từng người** (v9): Cài đặt > Số của khung chung (đơn vị, số lẻ, làm tròn, dấu phân cách, số âm), lưu trên
  `<html data-num-format>`. Ô số nói nó là gì (`data-rp-num` = `money` · `count` · `pct`) và giá trị gốc (`data-rp-raw`), và
  hiện đúng định dạng đó (`fmtNum` của khung); số âm tô đỏ mang `text-danger`. Chart và card KPI giữ cách hiện riêng. [rp-num-format]
- **Bảng hiện tối đa mười dòng**, phần còn lại cuộn trong khung của chính nó, và vẫn nằm chung trang với các hình khác (v7);
  mười dòng theo chiều cao thật - dòng hai hàng chữ cao hơn - không phải chiều cao cố định. [rp-table-rows-cap]
- **Cách cho bảng vừa panel** (v15, cách giữ rp-no-side-scroll): bảng rộng hơn panel ở lề của kit thì dùng lề ô hẹp; đo cả hàng
  một lần, bảng được nới tới cỡ cần chỉ khi mọi panel của hàng vẫn vừa (donut/chart giữ 15rem), không thì giữ tỉ lệ của report;
  tiêu đề xuống dòng giữa các từ, không bẻ giữa một từ; ma trận có trường cột hơn 24 giá trị (80 cửa hàng làm cột) lật lại, các
  giá trị đó thành dòng, màu đi theo ô; bảng report vẽ rộng từ 60 % trang trở lên đứng riêng một hàng.
- **Không cột trống** (v15): ma trận không hiện cột mà mọi số đều trống, như Power BI không hiện mục không có dữ liệu (như dòng
  trống). [rp-blank-cols]
- **Tiêu đề không là tên trường** (v15): kiểu CamelCase (`StoreName2`, `ShortName`) hay có số bản sao (`Vị Trí1`) thì đọc tên
  của trường trên trang. [rp-header-words]
- **Câu chữ không là ô bảng** (v15): measure chữ không có trường (kết luận, nhận xét) là khối chữ xuống dòng trong panel.
  [rp-sentences] Measure chữ viết ra một số (số đếm, % theo công tắc) thì hiện như số đó, theo định dạng của người xem.
- **Số sắp theo giá trị** (v16): số viết kèm đơn vị (`2,8 tỷ`, `15 tr`, `3k`) không phải số với bộ sắp đọc chữ; ô mang giá trị
  của nó (`data-sort-value`, chữ số trơn, không dấu phân cách). Dòng tổng đứng ngoài phần thân được sắp (`tfoot`): luôn ở cuối.
  [rp-sort-value] Bấm tiêu đề thì cột được sắp và không panel nào đổi bề ngang: panel chỉ nới cho bảng phần bảng tràn ra ngoài
  khung, không bao giờ lấy bề rộng của chính bảng đã giãn theo panel (nó lớn dần sau mỗi lần đổi cỡ). [SORT_PROBE]

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

- **Board không để ô trống** (v13): chart ngắn chồng một cột cạnh chart cao, danh sách dài (Top 10) đứng nửa hàng và
  cao bằng hai ô; mọi cột của một hàng chạm tới đáy hàng. [rp-no-hole]
- **Chart lấp tới đáy panel** (v16): panel bị kéo cao theo ô cao hơn cùng hàng (một bảng) thì vùng vẽ giãn theo - cột đứng trên
  đáy panel, đường trải hết chiều cao; chiều cao riêng của vùng vẽ là sàn, không phải cỡ cố định. [rp-plot-fills]
- **Thanh xếp hạng chừa chỗ cho tên** (v13): cột tên 30 tới 40 % bề ngang thanh, tối đa hai dòng (tên đủ ở tooltip), không
  bao giờ thanh dài cạnh tên sáu dòng. [rp-rank-name]
- **Chart nào cũng phóng to riêng được** (v13, như focus mode của Power BI): một nút (`.rp-focus-btn`) trên mỗi chart và
  donut, cao bằng một chip legend và cùng hàng; bấm thì chart chiếm thân trang, hình khác ẩn, thanh trang giữ; bấm lại hay Esc thì
  trang về như cũ. [rp-focus]
- **Trang giữ nguyên cỡ** (v15): không bao giờ thu nhỏ cho vừa màn hình (không transform scale trên trang hay một khối của nó);
  trang cao hơn màn hình thì cuộn. Từng trang một tab hay mọi trang nối nhau là cách xem; không cách nào thu nhỏ. [rp-no-page-scale]
- **Danh sách báo cáo của phòng ban là các dòng rộng bằng trang** (v13): mỗi card báo cáo của trang
  danh mục là một dòng rộng bằng trang, các trang của nó trải đều bề ngang đó - không bao giờ card trong cột hẹp. [rp-catalog-rows]

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
- **Trang báo cáo chỉ có một kiểu xem: không có nút danh sách / thẻ** trên thanh - báo cáo đọc một cách, nút
  chỉ chiếm chỗ. Trang khai điều đó (`views={false}` trên khung chung của hệ), khung khi đó không vẽ nút. [rp-no-view-switch]

## 8. Dựng lại một report

- **Report đang thay là bản Power BI White** (v11):
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
  thẻ đứng yên (v7). [rp-card-pages-even] [rp-card-status]

- **Card tổng của report dùng measure của chart** (v13): số của chuỗi mà report vẽ từ cùng measure với một chart (điểm
  chuỗi = đường xu hướng) được tính như chart đó; card đếm nhà hàng (đạt, xếp loại D, A) giữ điểm của từng nhà; DAX của report chép
  đúng như nó, cả cách trung bình theo dòng - app không "sửa" report. Xét khi xem trang.
- **Số lệch report thì truy theo nguồn trước** (v13): lệch với Power BI thì đối chiếu từng nguồn (bảng datalake và file
  report đọc) trước khi sửa app.
- **Số bán theo ngày chỉ tính ngày đã đóng sổ** (v13): số theo ngày bán chỉ đọc ngày đã đóng sổ
  (`Dim_Date.IsSaleDayClosed = 1`), như report.
- **Mỗi visual vẽ đúng loại của nó** (v15): scatter là chấm (X, Y, Size), cột chồng 100 % là các phần của 100 % có % từng phần, pie
  chỉ có trường Legend thì mỗi giá trị legend một lát - không bao giờ cột nhóm hay panel trống cho một loại chưa dựng (visual đó
  chờ, có khai, rp-parity).

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
| `data-rp-target` = số % (như 85) | một % so chỉ tiêu | màu theo dải [rp-target-graded] |
| `data-rp-cf` = `good` · `ok` · `warn` · `bad` | giá trị tô theo mức | mỗi mức một màu [rp-value-colour] |
| `.rp-focus-btn` · `.bar-name` | nút phóng to của chart · tên của thanh xếp hạng | [rp-focus] [rp-rank-name] |
| `data-tone` = một ô màu của theme | mỗi thẻ chỉ số | nền pastel của nó [rp-card-tone] |
| `data-rp-dims` · `data-rp-rows` · `data-rp-detail` · `data-rp-total` | bảng · dòng tổng | [rp-table-few] [rp-table-style] |
| `data-rp-glossary` (`data-rp-common`) · `data-rp-term` | bảng giải thích · mỗi dòng | [rp-glossary] |
| `data-rp-num` = `money` · `count` · `pct` · `data-rp-raw` | ô số của bảng · giá trị gốc | [rp-num-format] |
| `data-rp-id` | ô hay cột mã (mã nhân viên 03163) | không phải số [rp-num-format] |

Card dùng bốn vai chữ của `app-sneat-glass` (`kpi-title` · `kpi-main` · `kpi-percentage` · `kpi-secondary`).

## 10. Kiểm

- Bài kiểm trình duyệt của repo nhập `scripts/report_layout_check.mjs`, chạy mọi mục `RULES` trên mọi trang báo cáo (mọi màn và
  tab), ở khổ desktop và điện thoại, cả hai theme. Chạy `SELF_TEST` trước: trang tốt qua mọi luật, trang lỗi trượt từng luật,
  nên luật nào cũng đã được chứng minh đỏ. Thêm luật ở đây thì thêm mục ở đó trong cùng lần sửa.
- `SORT_PROBE` (v16, bất đồng bộ) do cùng bài kiểm chạy trên mỗi trang báo cáo ở khổ desktop: bấm tiêu đề một cột số ba lần
  (tăng, giảm, bỏ) và đỏ khi cột không được sắp hoặc một panel rộng ra. Đã chứng minh đỏ trên đúng hai lỗi nó sinh ra để bắt
  (không có giá trị sắp; bề ngang lớn dần) bằng cách chạy trên trang có từng lỗi được đặt lại.
- **Bảng chưa xong khi bài kiểm này chưa xanh trên các trang của nó** (v15, `Rule_Gate_01_DoneMeansRun`): đếm đủ visual không
  phải là kiểm. Bài kiểm của repo chạy riêng một bảng (`--only <tiền tố đường dẫn>`) trong lúc dựng.
- Máy chưa đo (xét khi trình trang): chiều rộng chart theo số nhóm, donut nằm trong hàng, tab chỉ thêm vì quá tải, màu theo nghĩa.

## Implements · Thi hành luật
- `Rule_Gate_98_FigureCardTone` — a figure card wears the tinted fill of its tone · thẻ chỉ số mang nền tô màu theo tông
- `Rule_Keys_62_DesignChangeApproval` — a report layout is approved before it is built or changed · bố cục báo cáo được duyệt trước khi dựng hay đổi
