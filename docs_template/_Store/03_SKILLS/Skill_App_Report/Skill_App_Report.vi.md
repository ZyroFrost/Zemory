---
version: 5
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
- **Tiêu đề card vừa card;** dài thì rút gọn (bỏ vế phụ, nghĩa đủ ghi vào bảng giải thích của trang), không thu nhỏ chữ riêng
  một card — tiêu đề một hàng cùng cỡ, con số cũng vậy. [rp-card-label]
- Màu số trên card theo thứ tự màu của theme (card *i* → màu *i*).

## 3. Màu và nhãn của chart

- **Chart nào cũng đánh dấu chuỗi và lấy màu theo thứ tự màu theme,** nối tiếp trong một màn; **hai chart cùng màn không
  trùng màu chính.** Chuỗi so sánh (LY · LM · LMTD · chỉ tiêu) là các bậc xám. [rp-chart-colour]
- **Nhãn số không có khung nền; mọi nhãn % in đậm.** Chart nào cũng hiện số (`app-sneat-glass` [chart-labels]). [rp-label]

## 4. Bảng

- **Mọi bảng một kiểu:** header đậm có nền, dòng xen màu, dòng tổng đậm, chỉ kẻ ngang; cột % tô theo chính chỉ số đó (§1);
  heat map (màu theo cường độ) được giữ. Tên cột là chữ người đọc, không để tên field (`chi_tieu`, `StoreName2`). [rp-table-style]
- **Bảng không dùng cho ít thông tin:** một dòng ⇒ card nhiều giá trị; một chiều ≤ 6 giá trị (không có trường cột) ⇒ chart,
  chỉ số khác đơn vị để trong tooltip. Bảng chi tiết (mỗi dòng một bản ghi) được miễn. [rp-table-few]
- **Không gì cuộn ngang trong khung, không bảng nào tràn ra ngoài panel** (bề rộng cột đo lúc vẽ lần đầu, nên header được xuống dòng; điện thoại cho bảng dữ liệu cuộn ngang trong khung, app-base M5). Bảng trải theo kỳ chỉ hiện các kỳ gần nhất (cửa sổ đi theo bộ lọc trang); cột rộng
  vừa số dài nhất, tổng vừa khung; vẫn không vừa thì đổi sang triệu một chữ số lẻ. Cuộn dọc là bình thường. [rp-no-side-scroll]
- **Bảng cuộn dọc nhiều** (1,5 lần khung) là khối duy nhất của màn (tab riêng). [rp-scroll-alone]

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
  chỉ chiếm chỗ. Trang khai điều đó (iews={false} trên khung chung của hệ), khung khi đó không vẽ nút. [rp-no-view-switch]

## 8. Dựng lại một report

- **Mọi trang và mọi visual của report đang thay đều có mặt**, đúng thứ tự. Visual bỏ có chủ đích, hoặc đang chờ nguồn DW
  chưa có, khai trong danh sách đối chiếu của bảng kèm lý do; test của repo so danh sách đó với visual của report (cả hai chiều).
- **Số khớp report:** mỗi measure dựng lại từ công thức và đối chiếu với chính số của report, từng phần; chỗ lệch có chủ đích
  (một phần report để trống) khai kèm lý do.
- Những gì chủ report đã chỉnh giữ nguyên như chủ để lại; bố cục đã chốt chỉ đổi khi được duyệt
  (`Rule_Keys_62_DesignChangeApproval`).

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
| `data-rp-dims` · `data-rp-rows` · `data-rp-detail` · `data-rp-total` | bảng · dòng tổng | [rp-table-few] [rp-table-style] |
| `data-rp-glossary` (`data-rp-common`) · `data-rp-term` | bảng giải thích · mỗi dòng | [rp-glossary] |

Card dùng bốn vai chữ của `app-sneat-glass` (`kpi-title` · `kpi-main` · `kpi-percentage` · `kpi-secondary`).

## 10. Kiểm

- Bài kiểm trình duyệt của repo nhập `scripts/report_layout_check.mjs`, chạy mọi mục `RULES` trên mọi trang báo cáo (mọi màn và
  tab), ở khổ desktop và điện thoại, cả hai theme. Chạy `SELF_TEST` trước: trang tốt qua mọi luật, trang lỗi trượt từng luật,
  nên luật nào cũng đã được chứng minh đỏ. Thêm luật ở đây thì thêm mục ở đó trong cùng lần sửa.
- Máy chưa đo (xét khi trình trang): chiều rộng chart theo số nhóm, donut nằm trong hàng, tab chỉ thêm vì quá tải, màu theo nghĩa.

## Implements · Thi hành luật
- `Rule_Keys_62_DesignChangeApproval` — a report layout is approved before it is built or changed · bố cục báo cáo được duyệt trước khi dựng hay đổi
