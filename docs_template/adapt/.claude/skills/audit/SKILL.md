---
name: audit
description: Run a full review of the project across every dimension, verifying each finding against real files before reporting it. Use only when the user explicitly asks for a thorough audit, or before a major milestone such as a release or a large batch of changes. This is not a quick check. Vietnamese triggers - "audit toàn diện", "soi hết", "kiểm tra toàn bộ", "rà lại hết", "review tổng thể".
---

# audit — soi toàn diện

> Kích hoạt: user nói **"audit toàn diện" / "soi hết"** · trước mốc lớn (release · commit gộp) · sau
> một đợt đổi nhiều file. Đây KHÔNG phải kiểm vặt: cụm từ đó có nghĩa là chạy đủ **11 mặt** dưới.

**Luật 1 — gate xanh KHÔNG phải bằng chứng.** Nó chỉ chứng minh *những gì test soi thì đúng*, không
chứng minh nó đang soi thứ đang chạy. Đã dính thật: cả bộ test UI neo vào bản đã bị thay, gate 100%
xanh trong khi bề mặt đang chạy có **0 test**. Nên mặt ④ luôn phải hỏi: *test đang đọc FILE NÀO?*

**Luật 2 — VERIFY từng finding rồi mới ghi.** Đã có đợt loại 5 nghi vấn vì đo lại thì sai, và 2 đợt
checker báo oan (48 rồi 13 mục). Một finding sai làm hỏng lòng tin vào cả bảng.

**Luật 3 — mọi con số phải ĐO.** Không suy luận, không nhớ lại. Không đo được thì ghi "chưa đo".

**Luật 4 — hỏi ngược mỗi check: *"cái gì làm nó ĐỎ?"*** Trả lời không được ⇒ check đó không thể nổ,
và một check không nổ được còn tệ hơn không có (nó phát ra lời bảo đảm trong khi chưa hề nhìn).

**Luật 5 — ĐO HAI ĐƯỜNG, khác cơ chế.** Một phép đo chưa kiểm chéo thì chưa phải sự thật
(`02_RULES §Hành xử`). Bốn dạng đã trả giá: công cụ **hỏng lặng** trả rỗng (cờ sai ⇒ âm tính giả ⇒
tưởng "sạch") · **báo oan** do so lỏng (không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai
bản chất** (khoá phụ trỏ hụt ⇒ tưởng mồ côi, suýt xoá dữ liệu đang sống) · **sổ nói khác code**.
Kiểm chéo = đổi công cụ · đổi hướng đếm · hoặc gọi bề mặt thật (kho ↔ API).

**Luật 6 — ĐỘT BIẾN HOÁ trước khi tin bộ test.** Phá từng chỗ code mà test canh, đòi nó phải ĐỎ. Đo
thật: **2/4 đột biến SỐNG SÓT** — một test chưa bao giờ chạy tới nhánh nguy hiểm, một test bị **bản
sao logic ở nơi khác gánh thay**. Cả hai đều xanh suốt và không soi gì cả.

**Luật 7 — MỌI CỔNG PHẢI ĐO BẰNG CẢ CA ÂM.** Chỉ chạy ca *phải chặn* thì không biết cổng có **chặn
NHẦM** không, mà chặn nhầm là đường ngắn nhất tới *"gate nhiễu ⇒ gate bị bỏ qua"* — tự tay phá thứ
mình đang xây. Đo thật trên guardrail: bảng 28 ca có giá trị **chính nhờ 6 ca *phải cho qua***;
thiếu chúng thì siết tay đã hỏng cổng mà vẫn tưởng đang làm tốt.

### 11 mặt — chạy đủ
*(6 mặt đầu là bản gốc. **Mặt 7–10** thêm sau khi soi ngược **mọi sự cố THẬT** của một repo rồi hỏi
*"mặt nào lẽ ra bắt được"* — phát hiện: **mọi sự cố nặng nhất đều rơi vào vùng 6 mặt cũ không nhìn
tới**, vì 6 mặt đó soi *"phần mềm có ĐÚNG không"*, còn chúng thuộc *"phần mềm có SỐNG SÓT không"*:
mất mát · lộ lọt · chết lặng · không mang đi được. **Mặt 11** thêm vì chín mặt trước đều soi MÁY,
không mặt nào soi thứ **NGƯỜI ĐỌC** nhận.)*
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
7. **Bí mật & phát tán** — secret trong cây **VÀ trong LỊCH SỬ git** (không chỉ HEAD: khoá lộ rồi thì
   lộ **vĩnh viễn**, xoá ở HEAD không gỡ được thứ đã đẩy đi) · file lớn/binary lọt git · **đường ra
   ngoài** rộng hơn `git push`: thư mục đồng bộ đám mây · kênh *backup máy* của trình đồng bộ (thứ
   người dùng KHÔNG chủ động bật) · máy đích lúc deploy · quyền file khoá. Đây là chỗ mất mát
   **KHÔNG đảo được** — sai một lần là xong.
8. **Phụ thuộc & license** — dependency/model mới có license tương thích không · lockfile khớp ·
   dependency chết · **dựng lại từ CLONE SẠCH có chạy không** (thứ chỉ chạy được trên máy đang có sẵn
   đồ thì chưa gọi là dựng được). Quét **CẢ CÂY**, không chỉ dependency trực tiếp — license xấu ở
   tầng sâu vẫn đi kèm sản phẩm. Bẫy đo: `OR` và `AND` trong biểu thức license **không cùng nghĩa**
   (`OR` = một vế hợp lệ là đủ · `AND` = phải hợp lệ MỌI vế), tách bằng cùng một mẫu là bỏ sót.
9. **Toàn vẹn & đồng thời** — khoá ghi còn **TỪ CHỐI THẬT** không (khoá đúng mà người gọi bỏ qua lời
   từ chối thì vẫn thủng) · có kẻ ghi thứ hai nào đang mở kho không · giao dịch có nguyên tử ·
   **THỬ PHỤC HỒI THẬT** một bản sao lưu ra chỗ tạm rồi ĐẾM — *"dữ liệu lành"* KHÁC *"dựng lại
   được"*, và kênh mang đi có thể lặng lẽ vứt mất lớp đắt nhất mà không cổng nào đỏ.
   Kèm: chạy skill `sync-path/`.
10. **Vận hành nền & guardrail** — tiến trình nền còn sống không · có nhịp tim/log đủ để truy khi nó
   chết cứng không · bề mặt có **CHẾT THEO nền** không (vỏ rỗng là kiểu hỏng tệ nhất: nó không báo
   lỗi, nó **NÓI DỐI**, và người dùng không có cách phân biệt với đang-chạy-thật) · **chạy ma trận
   guardrail** — cổng chặn có thật sự chặn không, thứ chỉ đo được bằng cách CHẠY, không đọc code ra
   (ca phải chặn **+ ca phải cho qua**, luật 7).

11. **CHỮ & BỀ MẶT NGƯỜI ĐỌC** — NORM ở `02_RULES §Ngôn ngữ` (*"chữ người dùng đọc phải đầy đủ và
   đúng"*). Đo: **thiếu dấu** · **chính tả** (từ lặp · mojibake) · **nhãn** (phần tử tương tác có
   nhãn máy đọc được, ảnh có `alt`) · **song ngữ HAI ĐẦU** (chuỗi trong code *và* chữ nằm thẳng
   trong markup + `title`/`placeholder`; khoá đủ cả hai dict) · **UI ↔ code** (đối chiếu route bề
   mặt gọi với route thật — dùng cạnh seam `api` của graph, không dùng mắt).
   ⚠ **Bốn phép này BÁO OAN nếu làm ngây thơ:** danh sách từ-không-dấu chỉ được gồm từ mà bản không
   dấu KHÔNG hợp lệ (`khong` `duoc`…; `minh`/`nhanh`/`song` vốn không dấu) · dò từ lặp phải dùng
   `\p{L}` (`\b` của JS là ASCII) và **trừ láy đôi** ("song song") · mẫu mojibake `Â.`/`Ã.` trúng
   cả chữ Việt hợp lệ (ĐÂY · NGÃ) · nhãn thường nằm ở thẻ CON hoặc `<label>` bọc ngoài · chữ trong
   markup CÓ móc i18n là đúng (bản dịch đè lúc chạy) · route ghép ĐỘNG và endpoint do CLI gọi qua
   HTTP đều trông như "chết".

**Đầu ra:** bảng finding, mỗi mục ghi *đo được gì · ảnh hưởng · sửa ở đâu*, phân `blocking`/`advisory`.
Vào `05_TODO` + `06_CHANGES`. **Nghi vấn đã loại cũng ghi, kèm lý do loại** — để lần sau khỏi đào lại.

**Cấm:** cắt bớt mặt nào cho nhanh; ghi finding chưa verify; báo "sạch" khi mới chạy mỗi gate.
