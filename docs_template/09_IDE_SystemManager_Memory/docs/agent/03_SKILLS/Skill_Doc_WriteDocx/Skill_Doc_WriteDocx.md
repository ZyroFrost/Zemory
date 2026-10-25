---
id: Skill_Doc_WriteDocx
aka: write-docx
name: doc-write-docx
version: 6
type: process
description: Edit or produce Word files (.docx) without silently destroying their structure - tables, pictures, table of contents, styles, page setup. Use when you must change wording inside an existing .docx, swap or add a picture, resize a picture, insert a section, or hand back a .docx deliverable. Do not use when you only need to READ a document - use read-office for that. Vietnamese triggers - "sửa file word", "ghi file word", "đổi chữ trong file word", "thay ảnh trong docx", "chèn ảnh vào file word", "xuất file word", "cập nhật tài liệu word".
from: _Store/03_SKILLS/Skill_Doc_WriteDocx @v6 #ca8d4df1b063
---

# write-docx — editing .docx without breaking its structure

> Trigger: you must **EDIT / CREATE** a `.docx` (change words · swap or insert a picture · add a section). Only READING → use
> the `read-office` skill (conversion with `markitdown`). Remember: **`markitdown` is for READING only** — rebuilding a
> `.docx` from Markdown loses every table · picture · table of contents · style.

**Why a playbook of its own:** a `.docx` is **a ZIP holding XML**. The words sit in `<w:t>`, while the **structure** (tables ·
pictures · table of contents · styles · page size) sits in the XML around them ⇒ **every check based on "did the words change"
misses a broken structure** — the words in a table cell are paragraphs too, so a table can be flattened while the words stay
exactly the same.

Operating details: [`references/pagination-toc.md`](references/pagination-toc.md) (page breaks · table of contents).
**Before copying a paragraph/table shell, touching a field, or writing a check, read
[`references/edit-traps.md`](references/edit-traps.md)** — 7 traps that broke real files.

1. **Do NOT open a handed-out file in another editor and save it.** Measured for real: a document with **8 tables**, opened in
   a desktop editor other than Word and Ctrl+S → **8 tables became 0**, every cell flattened into a plain paragraph; plus
   the `<w:sdt>` layer wrapping the table of contents stripped, `styleId` turned into numbers, the attribute order of `<w:pgSz>` swapped, a few
   empty parts dropped. **Not one character of text changed** — a text diff looks "identical". To look at it, open it and
   **close it, do NOT save**. A file held by an editor (`PermissionError` on write) → **wait, do not kill the editor
   holding the file**. Saved by mistake → **count the tables + pictures again** before concluding "no harm".
2. **Edit with a script on the XML, RUN by RUN.** A paragraph is made of several `<w:r>` with different formatting — replacing
   the whole paragraph loses bold/italic. Changing words → replace **the `<w:t>` content of exactly the run** to change, keeping
   `<w:rPr>`. Adding a paragraph → **copy the `<w:p>` shell of an existing paragraph with the same role** and change the words, never invent a
   new style. An anchor must match **exactly once**; 0 or ≥2 ⇒ **STOP**, do not replace at random.
3. **A picture = THREE layers that must match**, one missing and the file is broken:
   1. `word/media/<name>.png` — the picture bytes;
   2. `word/_rels/document.xml.rels` — one `<Relationship Id="rIdN" … Target="media/<name>.png"/>`;
   3. `word/document.xml` — a `<w:drawing>` block pointing at exactly `r:embed="rIdN"`, with a `<wp:docPr id>` **given a new number**.

   Swapping a picture while keeping the entry name needs only the bytes replaced — but **the height must be recomputed** (item 4).
4. **Picture size** — Word sizes by **EMU**, not by pixel. Replacing the bytes with a picture of a different ratio while keeping
   `cx/cy` ⇒ **the picture is squashed**. Wider than the text width ⇒ **it overflows the margin**. Wider than `px_w/96` inch ⇒
   **BLURRED** (scaled past its original size) — so `cx = min(text width, px_w/96 × 914400)`.

   ```python
   # text width = (pgSz@w − pgMar@left − pgMar@right) × 635 EMU · READ BY attribute NAME (editors swap the order)
   cx = (attr("pgSz", "w") - attr("pgMar", "left") - attr("pgMar", "right")) * 635
   cy = round(cx * px_h / px_w)           # height by the picture's ORIGINAL RATIO
   ```

   **Read attributes by NAME, not by position** (different editors swap the order of `pgSz`). Edit **both**
   `<wp:extent>` and `<a:ext>`, and edit **per `<w:drawing>` BLOCK** — several pictures declare the same `cx/cy`,
   a global string replace changes other pictures too.
5. **The regex trap:** `<w:t xml:space="preserve"/>` is a **self-closing** tag (an empty cell) — `<w:t(?:\s[^>]*)?>` wrongly
   matches it as an opening tag and then **swallows XML** up to the next `</w:t>`, making the "did the words change" check report a false
   difference. Use `<w:t(?:\s[^>]*(?<!/))?>(.*?)</w:t>` — `(?<!/)` blocks the self-closing tag. Written looser
   (`<w:t[^>]*>`) it also matches `<w:tbl>` · `<w:tc>` · `<w:tr>`.
6. **Do not rebuild the file with `head + "".join(every <w:p>) + tail`** — that **drops everything sitting
   BETWEEN paragraphs** (tables, the `<w:sdt>` layer wrapping the table of contents, bookmarks). To use it, MEASURE first that nothing remains between
   paragraphs (walk with `xml.find(p, pos)`, the total skipped must be 0); safer:
   `xml.replace(<old paragraph>, <new paragraph>, 1)`.
7. **Check after EVERY edit — all of it, no step skipped:**

   | Check | Red when |
   |---|---|
   | count of `<w:tbl>` | differs from the previous copy |
   | count of pictures + order | differs from the previous copy |
   | every `r:embed` has a `<Relationship>` | one cannot be looked up |
   | a rel points at a real file | points at nothing |
   | a picture with a rel that nobody uses | an orphan picture remains |
   | `<wp:docPr id>` | a duplicate id |
   | bookmarks: `w:name` · `w:id` · start==end | a duplicate name/id, or counts off |
   | EACH table-of-contents line has the right field shape | the `fldChar` total balances while a line is still wrong |
   | `<w:instrText>` holds `TOC` | the table of contents disappeared |
   | picture width ≤ text width | overflows the margin |
   | display ratio against pixel ratio | off ⇒ the picture is squashed |
   | text against the previous copy | differs where NOT meant to edit |
   | reopens (`read-office`) | cannot be converted |
8. **The table of contents is a FIELD, not words** — edited outside Word it does not recompute itself. When done, **remind to
   open the file and press `F9`**; never type page numbers into the table of contents by hand.
9. **Page breaks for the reading copy** (the reader sees PAGES, not XML): `<w:keepNext/>` for headings +
   the paragraph right above a picture/table · `<w:keepLines/>` against splitting a paragraph · `<w:pageBreakBefore/>` for Heading 1 —
   **but NOT forced for every section**: a section shorter than a page with a forced break leaves half a page blank (measured for real:
   forcing all 11 sections ⇒ 15 pages, 7 pages more than 1/3 blank, one page 94% white). Insert **right after `<w:pStyle>`**
   (the schema requires the order `keepNext → keepLines → pageBreakBefore`). **Spacing:** a paragraph with an
   empty `<w:spacing />` sticks to the paragraph above — check EVERY heading.
10. **Measure the real pages, do not guess — rendering works without Word:** `x2t.exe` in
    `<ProgramFiles>/ONLYOFFICE/DesktopEditors/converter/` takes XML params (`m_nFormatTo=513` = PDF, with
    `m_sAllFontsPath`/`m_sFontDir` pointing at `AllFonts.js` — without fonts it fails with a JS error, no file). Then
    `pdfminer` measures the lowest `y0` of the **body** text (the **footer area must be excluded**, or every page
    comes out 0% blank). Procedure: force all → drop the break on sections leaving more than 1/3 blank → add back as many as possible;
    **exempt only the cover page** — exempting the last page too makes the measurement pick the worse copy (measured: 12 pages, last page 97% full,
    losing to 13 pages, last page 76% blank; `references/edit-traps.md` §5). **A machine where neither Word nor ONLYOFFICE runs uses WPS COM:**
    `KWPS.Application` → `Documents.Open(<path>, false, true)` (read-only) → `ComputeStatistics(2)` = the PAGE
    COUNT, `(0)` = the word count, then `Close(0)`. Measured: this is the ONLY way still working when `x2t` lacks
    `AllFonts.js` (JS error, no PDF) **and** `Word.Application` throws a COMException — do not conclude
    "the page count cannot be measured" before trying it. Pages cannot be rendered ⇒ **do not promise "every section fits neatly on
    1 page"**.
11. **An automatic table of contents** needs **both**: `<w:updateFields w:val="true"/>` in `settings.xml` (inserted before
    `<w:footnotePr>`), and self-built table-of-contents content (a bookmark at each Heading 1 + paragraphs with style `toc 1` +
    `PAGEREF`). **Leave the page numbers EMPTY** — writing numbers without rendering is making them up; the viewer fills them when opened.
12. **THE TRAP: one field spread over SEVERAL paragraphs** — `begin`+`separate` in this paragraph, `end` in another. Replacing
    one paragraph leaves an orphan `end` ⇒ **the file no longer opens** (the converter reports an odd error). The check after each
    touch of a field: `begin == separate == end`, **and a per-line check** (a balanced total is not enough), every
    `w:anchor`/`PAGEREF` points at a real bookmark.

## Forbidden

- Opening a handed-out file in another editor and saving it.
- Editing the original when only asked to READ.
- Overwriting an existing file without reading it.
- Rebuilding a `.docx` from Markdown ("to be quick" = losing every table, picture, table of contents, style).
- Reporting "done" before the whole check table has run.
