---
name: read-office
description: Read the contents of Office and PDF files (.xlsx .xls .docx .pptx .pdf) efficiently, choosing the cheapest conversion for the job instead of dumping raw XML into context. Use when you need to open, inspect, extract, or summarise a spreadsheet, document, slide deck or PDF. Do not use for files that are already text (.csv .md .json .txt) - read those directly. Vietnamese triggers - "đọc file excel", "xem bảng tính", "mở file word", "đọc pdf", "trong file này có gì", "lấy số từ file".
---

# read-office — đọc file Office/PDF

> Kích hoạt: cần ĐỌC nội dung một file Office/PDF (bảng số, báo cáo, tài liệu) trong khi agent chỉ
> có công cụ đọc text. KHÔNG áp cho file vốn đã là text (`.csv` · `.md` · `.json` · `.txt`) — đọc thẳng.

**Vấn đề:** `.xlsx`/`.docx`/`.pptx` là ZIP nhị phân — đọc trực tiếp không ra nội dung. Hai đường sai
thường gặp: ① coi file như text rồi nạp XML thô vào context; ② mỗi lần gặp file lại viết một script
`openpyxl`/`python-docx` riêng (đắt công, mỗi lần một kiểu).

**Tool:** `markitdown` (Microsoft · MIT · Python) — convert Office/PDF/HTML/ảnh → Markdown. Là
**dependency ngoài gọi qua CLI**, KHÔNG dán source vào repo (HP điều 2).
- Cài: `pip install "markitdown[xlsx,xls,docx,pptx,pdf]"` *(bản đã đo: 0.1.6)*
- Dùng: `python -m markitdown <file>` (ra stdout) · `python -m markitdown <file> -o out.md` (ghi file)
- Sheet Excel ra `## <tên sheet>` + bảng Markdown ⇒ giữ được ranh giới nhiều sheet.

**ĐO THẬT** (2026-07-25 · file mẫu `.xlsx` 18 KB · 3 sheet · 308 dòng · ~token = ký tự ÷ 4):

| cách đọc | ~token | ghi chú |
|---|--:|---|
| unzip → XML thô | 30.119 | đường duy nhất nếu coi file là text |
| **MarkItDown → Markdown** | **5.395** | **rẻ hơn XML 5,6×**; giữ tên sheet + cấu trúc bảng |
| CSV từng sheet (tự script) | 4.193 | rẻ hơn Markdown ~22% nhưng MẤT ranh giới nhiều sheet |

**Chọn theo việc — KHÔNG mặc định "Markdown luôn rẻ nhất" (số đo bác điều đó):**
- Cần HIỂU tài liệu (nhiều sheet · chữ lẫn số · `.docx`/`.pptx`/`.pdf`) → **MarkItDown**.
- Chỉ cần MỘT bảng số thuần để tính toán → CSV/`openpyxl` rẻ hơn.
- File lớn: convert ra FILE rồi đọc **đúng phần cần** (`grep`/N dòng đầu) — đừng nạp cả bản
  convert vào context (progressive disclosure, HP điều 8).
- Bảng ngàn dòng: token tăng theo số dòng, không theo dung lượng file ⇒ ước lượng trước khi nạp.
