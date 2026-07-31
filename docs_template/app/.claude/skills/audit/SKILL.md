---
name: audit
description: Run a full review of the project across every dimension, verifying each finding against real files before reporting it. Use only when the user explicitly asks for a thorough audit, or before a major milestone such as a release or a large batch of changes. This is not a quick check. Vietnamese triggers - "audit toàn diện", "soi hết", "kiểm tra toàn bộ", "rà lại hết", "review tổng thể".
---

# audit — soi toàn diện

> Kích hoạt: user nói **"audit toàn diện" / "soi hết"** · trước mốc lớn (release · commit gộp) · sau
> một đợt đổi nhiều file. Đây KHÔNG phải kiểm vặt: cụm từ đó có nghĩa là chạy đủ **6 mặt** dưới.

**Luật 1 — gate xanh KHÔNG phải bằng chứng.** Nó chỉ chứng minh *những gì test soi thì đúng*, không
chứng minh nó đang soi thứ đang chạy. Đã dính thật: cả bộ test UI neo vào bản đã bị thay, gate 100%
xanh trong khi bề mặt đang chạy có **0 test**. Nên mặt ④ luôn phải hỏi: *test đang đọc FILE NÀO?*

**Luật 2 — VERIFY từng finding rồi mới ghi.** Đã có đợt loại 5 nghi vấn vì đo lại thì sai, và 2 đợt
checker báo oan (48 rồi 13 mục). Một finding sai làm hỏng lòng tin vào cả bảng.

**Luật 3 — mọi con số phải ĐO.** Không suy luận, không nhớ lại. Không đo được thì ghi "chưa đo".

**Luật 4 — hỏi ngược mỗi check: *"cái gì làm nó ĐỎ?"*** Trả lời không được ⇒ check đó không thể nổ,
và một check không nổ được còn tệ hơn không có (nó phát ra lời bảo đảm trong khi chưa hề nhìn).

### 6 mặt — chạy đủ
1. **Gate & lint** — `npm run check` (hoặc lệnh gate của repo). **TẮT daemon/tiến trình nền trước**,
   nếu không test nặng tranh RAM rồi đỏ lung tung ở chỗ không liên quan.
2. **Chuẩn & docs** — `zemory conform` · `zemory validate` · độ dài docs vs ngưỡng (`zemory archive`
   nếu quá) · TODO còn mục nào đã xong mà chưa đóng không.
3. **Kiến trúc** — export không ai gọi · **NGUỒN TRÙNG** (cùng một sự thật nằm ở ≥2 nơi ⇒ chắc chắn
   sẽ lệch) · file/thư mục ngoài chuẩn · thao tác ghi vào file nguồn có nguyên tử không.
4. **FE ↔ BE** — mọi endpoint có người gọi & ngược lại · i18n đủ cả hai chiều · CSS/id chết ·
   **neo test có trỏ vào file đang chạy không**.
5. **Dữ liệu thật** — `integrity_check` · độ phủ (index/vector/digest) · hàng mồ côi · kích thước.
6. **Bề mặt sống** — gọi endpoint THẬT (mã trả về + thời gian) · mở app **nhìn tận mắt**. Suy luận
   từ code không thay được việc nhìn: đã có lần endpoint xanh, gate xanh, mà UI vẫn sai.

**Đầu ra:** bảng finding, mỗi mục ghi *đo được gì · ảnh hưởng · sửa ở đâu*, phân `blocking`/`advisory`.
Vào `05_TODO` + `06_CHANGES`. **Nghi vấn đã loại cũng ghi, kèm lý do loại** — để lần sau khỏi đào lại.

**Cấm:** cắt bớt mặt nào cho nhanh; ghi finding chưa verify; báo "sạch" khi mới chạy mỗi gate.
