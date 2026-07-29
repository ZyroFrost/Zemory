<!-- L3 — tài nguyên của skill `structure`. KHÔNG nạp cùng SKILL.md; chỉ mở khi cần tra quy ước cụ thể.
     4 luật nổ-lúc-viết (LFS · data thật/mẫu · secret · SQL-DAX-M) KHÔNG ở đây — chúng ở docs/agent/02_RULES.md
     vì phải luôn được nạp. Một nội dung, một nhà. -->
# Quy ước chi tiết — chuẩn thư mục non-app

> Mở khi: đặt tên một slot mới · đánh số task/pipeline · phân vân `adhoc` hay `task` · phân vân `templates` hay `fixtures`.

## Đặt tên

```
Tên THƯỜNG        Slot folder viết thường; nhiều từ nối bằng `_` (docs_visual).
                  TÊN CÓ SẴN của người ta GIỮ NGUYÊN: file (TargetAll.xlsx ·
                  ..._REPORT.xlsx) và tên vendor/tool ép (.pbix · .Report/ ·
                  .SemanticModel/ · dbt models/).
1 TÊN / concern   sources/ (KHÔNG src|raw) · measures/ (KHÔNG dax|calc).
                  Concern đã có tên rồi thì dùng lại, đừng đẻ tên mới.
Tên tiếng Anh     Slot và tên skill: tiếng Anh, chữ thường, nối bằng `-`.
                  Nội dung bên trong file: tiếng Việt có dấu.
```

## Đánh số task và pipeline

```
tasks/ đánh số    tasks/NN_<cadence>/ — 00 tăng dần. Thường: 01_weekly · 02_monthly.
MIRROR 3 nơi      Một task lặp phải cùng số NN xuyên ba chỗ, KHÔNG lệch:
                    tasks/NN_<tên>/spec.md  ↔  pipelines/NN_<tên>/  ↔  data/NN_<tên>/
Stage phẳng       pipelines/NN_<tên>/NN_mô-tả.py
                    00 = cổng / kiểm sẵn sàng (thường KHÔNG xuất data)
                    01, 02… = các bước theo thứ tự chạy
                  Mỗi stage chạy standalone được. Logic dùng chung → common.py
                  (tên KHÔNG có số thì mới import được).
Output khớp số    File trung gian mang tiền tố số của stage sinh ra nó:
                    01_pull.py → data/…/01_pull_*.csv
                  ⚠ NGOẠI LỆ — file DELIVERABLE cuối GIỮ TÊN NGHIỆP VỤ, KHÔNG
                  prefix số (vd YYYYMMDD_<CTY>_WEEKLY_NN_REPORT.xlsx) vì đó là
                  file đem giao/nộp.
Right-size stage  Chỉ tạo stage task THẬT cần — 2–4 là bình thường. KHÔNG chẻ vụn
                  cho "đủ bộ". Script domain cũ (fast · haravan · pos…) KHÔNG bắt
                  đánh số, cùng tồn tại được.
Launcher .cmd     <tên>.cmd ở GỐC: `<tên> <stage>` dispatch · `<tên> auto` = chạy
                  cổng 00 (exit-code gate) rồi chuỗi stage nếu đủ điều kiện.
                  File .cmd THUẦN ASCII — dấu tiếng Việt làm cmd.exe vỡ parse.
```

## Phân biệt dễ nhầm

```
adhoc ≠ task          data/adhoc/ = file LẺ check một lần, vứt đi được (chỉ giữ
                      README.md làm marker). Cái gì thuộc DELIVERABLE ĐỊNH KỲ thì
                      PHẢI nằm dưới tasks/<task>/ + data/<task>/.
                      KHÔNG quăng file định kỳ vào adhoc.
templates ≠ fixtures  templates/ = file TRỐNG chờ ĐIỀN (đổ số ra deliverable).
                      fixtures/  = data MẪU nhỏ để mở deliverable khỏi cần nguồn thật.
docs_visual ≠ docs    docs_visual/ nằm NGOÀI docs/ — agent KHÔNG tự đọc. Mỗi file
                      .html/.svg phải có một .md chủ trỏ tới + tóm tắt 1–3 dòng.
```

## Nguồn sự thật

```
Từ điển dữ liệu   BI/data NÊN có docs/dictionary.md — định nghĩa metric/cột là
                  nguồn sự thật, chống mỗi báo cáo tính một kiểu.
Publish/refresh   Tự động hoá → scripts/ · bản render ra → exports/ (gitignore,
                  build lại được). Giữ bản trước khi đè vào attic/ để rollback.
```

## Ranh giới

```
KHÔNG luật UI     Dự án non-app không phát triển app ⇒ 0 luật thiết kế UI.
                  "Có dashboard trong deliverable" KHÔNG biến nó thành app: chừng
                  nào chỉ đọc/dò/kéo/điền/xuất file thì vẫn là non-app.
                  Trình bày deliverable (layout report, chọn chart) = quyết định
                  TRÌNH BÀY → trình user trước (02_RULES §Hành xử), tham khảo
                  skill dataviz nếu có. KHÔNG phải luật UI-app.
Ngoài phạm vi     App có code chạy (UI/server/CLI) → dùng chuẩn APP, không phải
                  file này. Lib/SDK · mobile · game → convention riêng.
```
