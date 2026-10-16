---
id: Rule_66
aka: 02-66
name: part-names
version: 4
kind: content
---
# Rule_Gate_66_PartNames Tên linh kiện harness theo từ điển tên; tên skill theo chuẩn của host

- Linh kiện harness: `<Mã>_<Nhóm>_<NN>_<Tên>`. Mã: `Rule` (luật chung) · `Cons` (hiến pháp) · `Struc` (cụm structure,
  không số) · `Slot` (một chỗ trong cây) · `Skill`. Nhóm: `Gate` · `Keys` · `Core` (luật, hiến pháp — máy canh bằng gì) ·
  `Repo` · `Region` · `Disk` (cụm structure — phủ tới đâu) · vùng cấp 1 của đường (slot) · nhóm skill.
- `NN` là số thứ tự trong kệ: không đánh lại, bãi bỏ giữ số (linh kiện bỏ vào `Archive/`). Tên tiếng Anh, chữ liền, hoa
  chữ đầu mỗi từ; tên bắt đầu bằng số được (`01Raw`).
- Trích dẫn bằng tên đầy đủ; công cụ tra theo mã + số, nên tên cũ (sau khi lên hạng hay đổi tên) vẫn ra linh kiện hiện tại.
- Tên slot và tên cụm KHÔNG là tên folder của repo: `SLOT.md › path:` là đường thật.
- Skill trong folder nạp của host: `<nhóm>-<tên>`, chữ thường nối `-`, trùng trường `name:` (chuẩn Agent Skills).
- Phép kiểm: phép kiểm tên của kho (`partNameFindings`) và `conform` (tên tiếng Việt mất dấu ⇒ đỏ).
