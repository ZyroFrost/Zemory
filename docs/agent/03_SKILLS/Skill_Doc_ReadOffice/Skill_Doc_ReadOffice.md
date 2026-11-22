---
id: Skill_Doc_ReadOffice
aka: read-office
name: doc-read-office
version: 6
type: process
description: Read the contents of Office and PDF files (.xlsx .xls .docx .pptx .pdf) efficiently, choosing the cheapest conversion for the job instead of dumping raw XML into context. Use when you need to open, inspect, extract, or summarise a spreadsheet, document, slide deck or PDF. Do not use for files that are already text (.csv .md .json .txt) - read those directly. Vietnamese triggers - "đọc file excel", "xem bảng tính", "mở file word", "đọc pdf", "trong file này có gì", "lấy số từ file".
from: _Store/03_SKILLS/Skill_Doc_ReadOffice @v6 #ca871ba5d137
---

# read-office — reading Office / PDF files

> Trigger: the CONTENT of an Office/PDF file (a spreadsheet, a report, a document) must be READ while the agent only has text
> tools. Not for files that are already text (`.csv` · `.md` · `.json` · `.txt`) — read those directly, cheaper than any way
> below.

## The problem

`.xlsx`/`.docx`/`.pptx` are **binary ZIPs** — read directly, they show no content. Two common wrong ways:

1. Treating the file as text and loading the **raw XML** into context — many times more expensive.
2. Writing a fresh `openpyxl`/`python-docx` script each time a file shows up — effort spent, a different shape every time.

## The tool

`markitdown` (Microsoft · MIT · Python) — converts Office/PDF/HTML/images → Markdown. It is an **outside dependency called
through its CLI**, never source pasted into the project.

```
pip install "markitdown[xlsx,xls,docx,pptx,pdf]"     # the version measured: 0.1.6

python -m markitdown <file>              # to stdout
python -m markitdown <file> -o out.md    # to a file (for large files)
```

An Excel sheet comes out as `## <sheet name>` + a Markdown table ⇒ the boundaries between sheets are kept.

> An environment that can already read `.xlsx`/`.docx`/`.pptx`/`.pdf` (e.g. Cowork): use that ability first; `markitdown` is
> needed only to control exactly how many tokens are loaded.

## Reference measurements

A real `.xlsx`: 18 KB · 3 sheets · 308 rows (~tokens = characters ÷ 4):

| Way of reading | ~tokens | Note |
|---|--:|---|
| unzip → raw XML | 30,119 | the only way if the file is treated as text |
| **MarkItDown → Markdown** | **5,395** | **5.6× cheaper than XML**; keeps the sheet names + the table structure |
| CSV per sheet (own script) | 4,193 | ~22% cheaper than Markdown but **LOSES the boundaries between sheets** |

## Choose by the job — NOT "Markdown is always cheapest"

The measurements above refute that.

- Need to **UNDERSTAND the document** (several sheets · text mixed with numbers · `.docx`/`.pptx`/`.pdf`) → **MarkItDown**.
- Need only **ONE plain table of numbers** to compute → CSV / `openpyxl` is cheaper.
- **A large file** → convert to a FILE, then read **only the part needed** (`grep` / the first N lines) — progressive
  disclosure. **Never load the whole conversion into context.**
- **A table of thousands of rows** → tokens grow with the **number of ROWS**, not the file size. Estimate before loading.

## Forbidden

- Loading raw XML into context.
- Loading the whole conversion of a large file and filtering afterwards.
- Editing the original file when only asked to READ it.
