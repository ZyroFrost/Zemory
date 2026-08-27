<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan 18: Bề mặt kiểm toàn diện — 6 mặt KHÔNG đủ, và vì sao biết chắc

> Chốt 2026-08-11 (user yêu cầu đối chiếu). Spec này trả lời **audit phải phủ những gì** cho một
> repo lớn, và **cổng máy nào đã có / còn nợ** ở từng mặt. Cách CHẠY nằm ở `.claude/skills/audit/`;
> ở đây chỉ có thiết kế + căn cứ. Khung kỷ luật: HP điều 12 (đo trung thực, gate trước khi bật)
> · `02_RULES §Guardrail lớp ①` (luật bất khả đảo phải có chốt máy).

## 1. Cách kiểm chứng "đủ hay chưa" — soi ngược từ sự cố THẬT

Không đánh giá bộ mặt kiểm bằng cảm giác đầy đủ. Phép thử dùng ở đây: **liệt kê mọi lần repo này
thực sự hỏng, rồi hỏi mặt nào lẽ ra phải bắt được.** Kết quả thẳng thừng:

| sự cố thật | mặt nào lẽ ra bắt được | có trong 6 mặt cũ? |
|---|---|---|
| Chìa lộ vĩnh viễn trong lịch sử đã push (2026-08-04) | bí mật & phát tán | ❌ |
| Kho + chìa bị kênh backup máy cuốn lên mây dạng trần (05/08) | bí mật & phát tán | ❌ |
| Model weight 294,6 MB lọt commit ⇒ nghẽn cả push (giới hạn 100 MB) | phụ thuộc & license | ❌ |
| **Kho hỏng HAI LẦN** vì hai tiến trình cùng ghi (03/08 · 04/08) | toàn vẹn & đồng thời | ⚠ mặt 5 chỉ soi dữ liệu *lành* |
| Daemon chết cứng, soi **sai hướng 3 tuần** vì thiếu chẩn đoán | vận hành nền | ❌ |
| Hai job dài chết giữa chừng (10/08) | vận hành nền | ❌ |
| Guardrail thủng **18/28 đường xoá** (đo lần đầu 11/08) | guardrail | ❌ |
| Bundle đồng bộ **không chở vector**; kênh Drive kẹt 3 ngày im lặng (11/08) | phục hồi & đồng bộ | ❌ |

⇒ **Mọi sự cố nặng nhất đều nằm ngoài tầm nhìn của 6 mặt.** Đó không phải xui: 6 mặt cũ soi
*phần mềm có đúng không*, còn tám ca trên đều thuộc *phần mềm có SỐNG SÓT không** — mất mát,
lộ lọt, chết lặng, không mang đi được.

## 2. Bốn mặt thêm (7–10) — mỗi mặt trả lời một câu 6 mặt cũ không hỏi

- **⑦ Bí mật & phát tán** — *"có gì đang rời khỏi vòng kiểm soát không?"* Điểm dễ sót nhất là
  **LỊCH SỬ git**, không phải cây hiện tại: xoá file ở HEAD không gỡ được thứ đã push. Và "đường ra
  ngoài" rộng hơn `git push` — thư mục đồng bộ đám mây, kênh *backup máy* của trình đồng bộ (thứ
  người dùng không chủ động bật), và máy đích lúc deploy.
- **⑧ Phụ thuộc & license** — *"thứ ta không tự viết có mang theo ràng buộc gì, và người khác dựng
  lại được không?"* Phép thử quyết định là **dựng từ clone SẠCH**: cái chạy được trên máy đang có
  sẵn đồ thì chưa chứng minh được gì.
- **⑨ Toàn vẹn & đồng thời** — *"ai đang ghi, và mất rồi có lấy lại được không?"* Hai vế đều từng
  vỡ: hai kẻ ghi làm hỏng kho hai lần; còn vế phục hồi thì **chưa ai thử** cho tới 11/08 — và đúng
  lần thử đầu tiên phát hiện kênh mang đi vứt sạch lớp chỉ mục đắt nhất.
- **⑩ Vận hành nền & guardrail** — *"nó còn sống không, và nếu chết ta có biết không?"* Cộng thêm:
  **cổng chặn có thật sự chặn không** — thứ chỉ đo được bằng cách chạy ma trận, không đọc code ra.

## 3. Hai luật đi kèm

- **Luật 7 (thêm vào skill): mọi cổng phải đo bằng CẢ ca ÂM.** Chỉ chạy ca *phải chặn* thì không
  phát hiện được **chặn nhầm**, mà chặn nhầm dẫn thẳng tới *gate nhiễu ⇒ gate bị bỏ qua* — tự phá
  thứ mình đang xây. Bảng 28 ca ngày 11/08 có giá trị **chính nhờ 6 ca phải-cho-qua**.
- **Chốt máy là LƯỚI ĐỠ, không phải người quyết** (`02_RULES §Guardrail`, user chốt 11/08). Hệ quả
  cho audit: *"guard không kêu"* KHÔNG được ghi vào báo cáo như bằng chứng an toàn.

## 4. Cổng máy: đã có gì · còn nợ gì

| mặt | cổng đã có | còn nợ (việc, ghi ở `05_TODO`) |
|---|---|---|
| ⑦ | `no-data-in-git` (5 ca) · `precommit-guard` · cảnh báo cloud · `git-history-secrets` (2 ca, 2026-08-24: quét `rev-list --objects --all` + chặn blob >50 MB, mỗi phép có tự-kiểm chống đo mù) | — |
| ⑧ | `license-gate` (3 ca, trong `npm run check`) · `npm run check:clone` (dựng từ clone sạch, chạy riêng — cần mạng) *(cả hai 2026-08-15)* | — |
| ⑨ | khoá ghi CLI + ca test "phải bị từ chối" · `integrity_check` · `uplinkguard` (bundle đã rời máy chưa — 2026-08-24) · **diễn tập phục hồi CHẠY THẬT 2026-08-25** (§4b) · **lần hai 2026-08-27** — lại bắt được lỗ (16.405 vector, 3 gốc, vá cùng ngày — `plan/08 §8b` 🔄 2026-08-27); hai lần chạy, hai lần ra lỗ ⇒ đây là phép đo đắt nhất nhưng đáng nhất của mặt này | biến diễn tập thành ĐỊNH KỲ (hai lần đều bằng tay); kèm **cổng RAM cho gate** đã ship 2026-08-27 (`gate-cage.ps1` Job Object 4 GB — gate từng tràn 16 GB làm chết phiên hai lần) |
| ⑩ | nhịp tim daemon · bề mặt chết theo nền · `guard-delete` (6 ca) · `guard-tool-matrix` (26 ca, TRONG gate chính — 2026-08-24) | — |

**Nguyên tắc xếp thứ tự nợ:** ưu tiên mặt nào có sự cố THẬT mà vẫn chưa có cổng — ⑧ đã trả xong
2026-08-15; nợ nặng nhất còn lại là vế *diễn tập phục hồi định kỳ* của ⑨.

### 4b. Diễn tập phục hồi ĐẦU TIÊN — chạy 2026-08-25, và nó bắt được một lỗ thật

**Cách chạy (0 code mới, chỉ lệnh sẵn có):** `memory import <kênh>/global_memory.enc --merge
--db <kho TẠM>` — đúng kịch bản *"máy mới nhận bàn giao"* của HP điều 16. Kho thật KHÔNG đụng;
đường kho do chính lệnh in ra để kiểm chứng. Kiểm khoá `global_memory.sync.lock` trước khi đọc
(không có ⇒ không ai đang ghi).

**Kết quả — đường lùi CÒN SỐNG:** 7 phút 42 giây dựng được **2.340 phiên · 300.421 tin** từ gói
1.639 MB; kho tạm 2.063 MB; `EXIT=0`.

🔴 **Nhưng nó lộ ra lỗ CHỞ VECTOR — vi phạm HP điều 16.** Kho dựng từ kênh có **NHIỀU tin hơn**
kho thật (300.421 vs 295.543 — gồm dữ liệu máy kia) mà **ÍT vector hơn ~22.000** (259.401 vs
281.380) ⇒ máy mới sẽ phải nhúng lại **27.035 tin (~12 giờ)**, đúng thứ điều 16 cấm.

**Truy nguyên, có đối chiếu chéo:** lấy 300 tin `prose` **của chính máy này** (`SS01-IT-12`) thiếu
vector trong bản-từ-kênh, tra ngược kho thật ⇒ **300/300 CÓ vector tại chỗ**. Vậy không phải "máy
kia chưa nhúng kịp" mà là **vector có rồi nhưng không đi theo gói**.
**Cơ chế:** `shipVectorsInto(…, sinceMessageId)` chọn vector theo `messages.id > watermark` — tức
vector đi KÉ theo đợt tin mới. Nhúng lại chạy SAU (scheduler 30 phút), lúc đó id của tin đã nằm
dưới watermark ⇒ vector sinh sau **không bao giờ được chở**. Cùng họ với lỗi "cửa sổ phụ bị bỏ"
mà `plan/08 §8b` đã ghi: mất mà **không hiện ra trong "còn phải nhúng"** của máy gửi.

*Bài học cho chính mặt ⑨: `uplinkguard` trả lời "gói đã rời máy chưa", `backup-staleness` trả lời
"bản sao lưu có tươi không" — KHÔNG cổng nào trả lời "dựng lại thì có ĐỦ không". Chỉ có dựng thật
mới thấy.*

## 5. Phi-mục-tiêu

- KHÔNG biến audit thành nghi lễ chạy-cho-đủ: mặt nào không đo được thì ghi **"chưa đo"**, không
  ghi "sạch" (HP điều 12).
- KHÔNG thêm mặt chỉ vì nghe hợp lý — mỗi mặt phải chỉ ra được **một sự cố thật hoặc một rủi ro
  đo được** mà các mặt sẵn có không nhìn tới. Đó là tiêu chuẩn đã dùng để chọn đúng bốn mặt này.
