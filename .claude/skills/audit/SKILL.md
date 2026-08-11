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

**Luật 5 — ĐO HAI ĐƯỜNG, khác cơ chế.** Một phép đo chưa kiểm chéo thì chưa phải sự thật (`02_RULES`).
Bốn dạng đã trả giá: công cụ **hỏng lặng** trả rỗng (cờ sai ⇒ âm tính giả ⇒ tưởng "sạch") · **báo oan**
do so lỏng (không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai bản chất** (khoá phụ trỏ hụt ⇒
tưởng mồ côi, suýt xoá dữ liệu sống) · **sổ nói khác code**. Kiểm chéo = đổi công cụ · đổi hướng đếm ·
hoặc gọi bề mặt thật (DB ↔ API).

**Luật 6 — ĐỘT BIẾN HOÁ trước khi tin bộ test.** Phá từng chỗ code mà test canh, đòi nó phải ĐỎ. Đo
2026-07-28: **2/4 đột biến sống sót** — một test chưa bao giờ chạy tới nhánh nguy hiểm, một test bị
**bản sao logic ở nơi khác gánh thay**. Cả hai đều xanh suốt và không soi gì cả.

**Luật 7 — MỌI CỔNG PHẢI ĐO BẰNG CẢ CA ÂM.** Chỉ chạy ca *phải chặn* thì không biết cổng có **chặn
nhầm** không, mà chặn nhầm là đường ngắn nhất tới "gate nhiễu ⇒ gate bị bỏ qua" — tự tay phá thứ
mình đang xây. Đo 2026-08-11 trên guardrail: bảng 28 ca có ý nghĩa **chính nhờ 6 ca *phải cho qua***;
thiếu chúng thì siết tay đã hỏng cổng mà vẫn tưởng đang làm tốt.

### 10 mặt — chạy đủ
*(6 mặt đầu là bản gốc; **mặt 7–10 thêm 2026-08-11** sau khi đối chiếu 6 mặt với những lần repo
thật sự hỏng — xem `docs/plan/18_audit_coverage.md`. Phát hiện: **mọi sự cố nặng nhất đều rơi vào
vùng 6 mặt không nhìn tới**.)*
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
7. **Bí mật & phát tán** — secret trong cây **VÀ trong LỊCH SỬ git** (không chỉ HEAD: chìa lộ rồi
   thì lộ vĩnh viễn) · file lớn/binary lọt git · **đường ra ngoài** (thư mục đồng bộ đám mây · kênh
   backup máy · máy đích lúc deploy) · quyền file khoá. Không mặt nào cũ nhìn tới đây, trong khi
   đây là chỗ mất mát **không đảo được**.
8. **Phụ thuộc & license** — dependency/model mới có license tương thích không (bất biến kiến trúc
   bắt rà, mà chưa cổng nào kiểm) · lockfile khớp · dependency chết · **dựng lại từ CLONE SẠCH có
   chạy không** (thứ chỉ chạy được trên máy đang có sẵn đồ thì chưa gọi là dựng được).
9. **Toàn vẹn & đồng thời** — write-gate còn **TỪ CHỐI THẬT** không (khoá đúng mà người gọi bỏ qua
   lời từ chối thì vẫn thủng) · có kẻ ghi thứ hai nào đang mở kho không · giao dịch có nguyên tử ·
   **THỬ PHỤC HỒI THẬT** một bản sao lưu ra chỗ tạm rồi đếm — "dữ liệu lành" KHÁC "dựng lại được",
   và kênh mang đi có thể lặng lẽ vứt mất lớp đắt nhất. Kèm: chạy skill `sync-path/`.
10. **Vận hành nền & guardrail** — tiến trình nền còn sống không · có nhịp tim/log đủ để truy khi nó
   chết cứng không · bề mặt có **chết theo nền** không (vỏ rỗng là kiểu hỏng tệ nhất: nó nói dối) ·
   **chạy ma trận guardrail** (ca phải chặn + ca phải cho qua — luật 7).

**Đầu ra:** bảng finding, mỗi mục ghi *đo được gì · ảnh hưởng · sửa ở đâu*, phân `blocking`/`advisory`.
Vào `05_TODO` + `06_CHANGES`. **Nghi vấn đã loại cũng ghi, kèm lý do loại** — để lần sau khỏi đào lại.

**Cấm:** cắt bớt mặt nào cho nhanh; ghi finding chưa verify; báo "sạch" khi mới chạy mỗi gate.
