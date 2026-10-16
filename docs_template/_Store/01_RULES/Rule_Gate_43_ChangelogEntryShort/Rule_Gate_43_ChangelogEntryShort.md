---
id: Rule_43
aka: 02-43
name: changelog-entry-short
version: 3
kind: content
---
# Rule_Gate_43_ChangelogEntryShort Entry changelog ngắn, trần ~30 dòng

- Mỗi entry `06_CHANGES` dài tối đa ~30 dòng. Đây là luật, không phải gợi ý.
- Một entry chỉ chứa ba thứ: đổi gì · vì sao · số đo.
- Chi tiết thiết kế ⇒ ghi ở `docs/plan/NN_*`. Tường thuật quá trình ⇒ bỏ.
- Lý do: vùng active giữ ~180 dòng (`changes_keep`); bốn entry 50 dòng đã chiếm trọn vùng đó, tức viết dài làm cơ chế archive thành vô nghĩa. Đo trên 76 entry thật: trung vị (p50) 19 dòng, nên trần 30 là rộng rãi với một entry bình thường.
- Phép kiểm: `zemory validate` báo entry vượt trần (advisory).

## Ví dụ

- Tình huống: một phiên vừa xong đợt sửa lớn, muốn kể lại toàn bộ quá trình dò lỗi trong sổ thay đổi.
- ✗ Sai: một entry 60 dòng kể từng bước thử, từng giả thuyết sai.
- ✓ Đúng: entry dưới ~30 dòng gồm đổi gì · vì sao · số đo; chi tiết thiết kế đưa sang plan, phần kể chuyện bỏ.
