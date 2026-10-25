---
version: 4
lang: vi
---
# DocsVisual_073_DocsVisual docs_visual — bản xem trực quan cho người

- Vai trò:
  - Bản XEM TRỰC QUAN cho NGƯỜI mở nhìn (agent không đọc): `.html` tự chứa có tương tác · `.drawio`/`.svg` vẽ tay — sơ đồ flow / kiến trúc / lineage / lưới trạng thái / timeline của hệ hoặc plan (non-app: vd luồng nạp DW, lưới bảng).
  - Nằm NGOÀI cây `docs/` → luật đọc mọi file `docs/` không chạm (0 token).
  - File `.md` THẮNG về sự kiện: visual chỉ trình bày; fact chỉ nằm trong visual thì vô hình với `plan search`.
  - Mặc định vẽ `mermaid` TRONG `.md`; `docs_visual/` CHỈ khi không mô tả bằng chữ được.
  - Sinh từ data → script ở `scripts/` + render ra `exports/`; không commit bản render.
- Được chứa / không chứa: Mỗi file PHẢI self-contained (CSS/JS/SVG inline · không CDN/build) và có một `.md` chủ trỏ tới bằng link markdown + tóm tắt 1–3 dòng.
