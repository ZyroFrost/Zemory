---
id: Rule_18
aka: 02-18
name: follow-standard
version: 4
kind: content
---
# Rule_Gate_18_FollowStandard Sửa hoặc tạo bất cứ gì phải đúng chuẩn đã chốt

- Luật cứng. Phạm vi: mọi thứ trong repo (backend · frontend · deliverable · sources · tasks · data · scripts · docs · config · test).
- Trước và trong khi tạo · đổi · dời file hoặc viết code ⇒ đối chiếu `03_STRUCTURE` (slot · routing · convention; với app thêm luật UI §5/§9) + `01_CONSTITUTION` (bất biến) + `02_RULES`.
- Tuyệt đối không sửa sai chuẩn: không đặt file sai slot; không đẻ tên mới cho concern đã có tên; không hardcode màu hoặc chuỗi; không rải SQL/DAX/M inline; không làm UI phá luật §5.
- Không chắc chuẩn ở đâu ⇒ tra `03_STRUCTURE/INDEX.md` và slot liên quan (giao diện app: slot `Frontend_137_UiDictionary`) hoặc hỏi; không đoán.
- Thấy chỗ đang lệch chuẩn ⇒ nắn về chuẩn, hoặc báo nếu lớn hay khó đảo; không nhân thêm cái sai.
- Phép kiểm: cổng `conform`.
