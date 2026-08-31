---
name: read-office
description: Read the contents of Office and PDF files (.xlsx .xls .docx .pptx .pdf) efficiently, choosing the cheapest conversion for the job instead of dumping raw XML into context. Use when you need to open, inspect, extract, or summarise a spreadsheet, document, slide deck or PDF. Do not use for files that are already text (.csv .md .json .txt) - read those directly. Vietnamese triggers - "đọc file excel", "xem bảng tính", "mở file word", "đọc pdf", "trong file này có gì", "lấy số từ file".
---

# read-office — đọc file Office / PDF

> KHÔNG áp cho file vốn đã là text (`.csv` · `.md` · `.json` · `.txt`) — đọc thẳng, rẻ hơn mọi cách dưới.

## Vấn đề

`.xlsx`/`.docx`/`.pptx` là **ZIP nhị phân** — đọc trực tiếp không ra nội dung. Hai đường sai thường gặp:

1. Coi file như text rồi nạp **XML thô** vào ngữ cảnh — đắt gấp nhiều lần.
2. Mỗi lần gặp file lại viết một script `openpyxl`/`python-docx` riêng — tốn công, mỗi lần một kiểu.

## Số đo tham chiếu

File `.xlsx` thật: 18 KB · 3 sheet · 308 dòng (~token = ký tự ÷ 4):

| Cách đọc | ~token | Ghi chú |
|---|--:|---|
| unzip → XML thô | 30.119 | đường duy nhất nếu coi file là text |
| **MarkItDown → Markdown** | **5.395** | **rẻ hơn XML 5,6×**; giữ tên sheet + cấu trúc bảng |
| CSV từng sheet (tự script) | 4.193 | rẻ hơn Markdown ~22% nhưng **MẤT ranh giới nhiều sheet** |

## Chọn theo việc — KHÔNG mặc định "Markdown luôn rẻ nhất"

Số đo trên bác bỏ điều đó.

- Cần **HIỂU tài liệu** (nhiều sheet · chữ lẫn số · `.docx`/`.pptx`/`.pdf`) → **MarkItDown**.
- Chỉ cần **MỘT bảng số thuần** để tính toán → CSV / `openpyxl` rẻ hơn.
- **File lớn** → convert ra FILE rồi đọc **đúng phần cần** (`grep` / N dòng đầu). **Đừng nạp cả bản convert vào ngữ cảnh.**
- **Bảng ngàn dòng** → token tăng theo **số DÒNG**, không theo dung lượng file. Ước lượng trước khi nạp.

## Công cụ

`markitdown` (Microsoft · MIT · Python) — convert Office/PDF/HTML/ảnh → Markdown. Là **dependency ngoài gọi qua CLI**, KHÔNG dán source vào dự án.

```
pip install "markitdown[xlsx,xls,docx,pptx,pdf]"

python -m markitdown <file>              # ra stdout
python -m markitdown <file> -o out.md    # ghi ra file (dùng cho file lớn)
```

Sheet Excel ra dạng `## <tên sheet>` + bảng Markdown ⇒ giữ được ranh giới nhiều sheet.

> Chạy trong Cowork: môi trường đã có sẵn khả năng đọc `.xlsx`/`.docx`/`.pptx`/`.pdf`. Dùng khả năng có sẵn trước; chỉ cần `markitdown` khi muốn kiểm soát chính xác lượng token nạp vào.

## Cấm

- Nạp XML thô vào ngữ cảnh.
- Nạp cả bản convert của file lớn rồi mới lọc.
- Sửa file gốc của user khi chỉ được yêu cầu ĐỌC.
