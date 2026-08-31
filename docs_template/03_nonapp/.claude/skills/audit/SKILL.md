---
name: audit
description: Run a full review of the project across every dimension, verifying each finding against real files before reporting it. Use only when the user explicitly asks for a thorough audit, or before a major milestone such as a release or a large batch of changes. This is not a quick check. Vietnamese triggers - "audit toàn diện", "soi hết", "kiểm tra toàn bộ", "rà lại hết", "review tổng thể".
---

# audit — soi toàn diện

> Kích hoạt: user nói **"audit toàn diện" / "soi hết"** · trước mốc lớn (release · commit gộp) · sau
> một đợt đổi nhiều file. Đây KHÔNG phải kiểm vặt: cụm từ đó có nghĩa là chạy đủ **10 mặt** dưới.
>
> **Vì sao bản NON-APP khác bản APP:** dự án non-app không phát triển app — không endpoint, không
> FE↔BE, không bộ test code. Bê nguyên bản app sang là bắt một dự án BI chạy `npm run check` và soi
> `FE ↔ BE`, tức **cổng không bao giờ nổ được** (luật 4: còn tệ hơn không có). Nhưng **bốn mặt SỐNG
> SÓT giữ trọn** — non-app vẫn có connection string, vẫn có pipeline theo lịch, vẫn giao văn bản cho
> người đọc.

**Luật 1 — cổng xanh KHÔNG phải bằng chứng.** Nó chỉ chứng minh *những gì phép kiểm soi thì đúng*,
không chứng minh nó đang soi thứ đang chạy. Ca kinh điển ở dự án non-app: script chạy **exit 0** mà
file ra **rỗng** — cổng xanh, sản phẩm hỏng. Nên luôn hỏi: *phép kiểm này đang đọc FILE NÀO?*

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

### 10 mặt — chạy đủ
*(5 mặt đầu soi *"việc có ĐÚNG không"*. **Mặt 6–9** thêm sau khi soi ngược **mọi sự cố THẬT** của một
repo rồi hỏi *"mặt nào lẽ ra bắt được"* — phát hiện: **mọi sự cố nặng nhất đều rơi vào vùng các mặt
cũ không nhìn tới**, vì chúng thuộc loại khác hẳn: *"việc có SỐNG SÓT không"* — mất mát · lộ lọt ·
chết lặng · không mang đi được. **Mặt 10** thêm vì chín mặt trước đều soi MÁY, không mặt nào soi thứ
**NGƯỜI ĐỌC** nhận — mà ở dự án non-app thì *sản phẩm giao đi CHÍNH LÀ chữ người đọc*, nên nó là mặt
nặng nhất, không phải mặt phụ.)*
1. **Cổng của dự án** — chạy đủ cổng repo có: `zemory conform` · `zemory validate` · script kiểm cấu
   trúc · **cổng readiness của launcher** (`<tên> auto` phải trả mã thoát ≠ 0 khi thiếu điều kiện).
   Repo **không có cổng nào chạy được** thì đó CHÍNH LÀ finding đầu tiên, không phải lý do bỏ mặt này.
2. **Chuẩn & docs** — `zemory conform` · `zemory validate` · độ dài docs vs ngưỡng (`zemory archive`
   nếu quá) · TODO còn mục nào đã xong mà chưa đóng không.
3. **Cấu trúc & NGUỒN TRÙNG** — file/thư mục ngoài chuẩn · script/query không ai gọi · **định nghĩa
   metric nằm ở ≥2 nơi** (từ điển `03_STRUCTURE §7` là nhà DUY NHẤT — có `docs/dictionary.md` lạc,
   hay công thức chép vào nhiều measure không) · số pipeline có **mirror đúng 3 nơi**
   (`tasks/NN_` ↔ `pipelines/NN_` ↔ `data/NN_`) · ghi vào file nguồn có nguyên tử không.
4. **Dữ liệu & 3 chặng** — có ai GHI vào `01_raw/` không (nó **CHỈ ĐỌC**) · file trung gian có mang
   tiền tố số stage không · deliverable cuối có nằm `03_output/` với tên nghiệp vụ không · `data/adhoc/`
   có bị dùng cho việc **định kỳ** không (nó chỉ dành cho file lẻ throwaway) · kích thước · bản rác.
5. **Sản phẩm giao đi — MỞ RA NHÌN** — mở đúng file deliverable (`.xlsx`/`.pbix`/`.docx`) **bằng
   mắt**: số có đổ vào đúng ô, sheet/trang không rỗng, kỳ báo cáo đúng, công thức không `#REF!`. Suy
   luận từ script KHÔNG thay được việc mở file: script exit 0 mà file ra rỗng là ca thật.
6. **Bí mật & phát tán** — secret trong cây **VÀ trong LỊCH SỬ git** (không chỉ HEAD: khoá lộ rồi thì
   lộ **vĩnh viễn**, xoá ở HEAD không gỡ được thứ đã đẩy đi) · file lớn/binary lọt git · **đường ra
   ngoài** rộng hơn `git push`: thư mục đồng bộ đám mây · kênh *backup máy* của trình đồng bộ (thứ
   người dùng KHÔNG chủ động bật) · máy đích lúc deploy · quyền file khoá. Đây là chỗ mất mát
   **KHÔNG đảo được** — sai một lần là xong.
7. **Phụ thuộc & dựng lại** — gói/thư viện mà script dùng có license tương thích không · file khai
   phụ thuộc (`requirements`/lock) có khớp thứ đang cài không · gói khai mà không ai import ·
   **dựng lại từ CLONE SẠCH có chạy không** (thứ chỉ chạy được trên máy đang có sẵn đồ thì chưa gọi
   là dựng được — và ở non-app còn phải hỏi: máy trắng có driver/ODBC/font để mở nguồn không).
   Quét **CẢ CÂY**, không chỉ phụ thuộc trực tiếp. Bẫy đo: `OR` và `AND` trong biểu thức license
   **không cùng nghĩa** (`OR` = một vế hợp lệ là đủ · `AND` = phải hợp lệ MỌI vế).
8. **Toàn vẹn & phục hồi** — hai lượt pipeline chạy cùng lúc có tranh cùng file không (không có khoá
   thì lượt sau ghi đè lượt trước, im lặng) · ghi deliverable có **nguyên tử** không (ghi file tạm
   rồi đổi tên — TUYỆT ĐỐI không để lại bản ghi dở trông như đã xong) · **THỬ PHỤC HỒI THẬT**: dựng
   lại một deliverable từ `01_raw` (hoặc từ bản sao lưu) ra **chỗ tạm** rồi **ĐẾM** — *"dữ liệu còn
   đó"* KHÁC *"dựng lại được"*, và kênh mang đi có thể lặng lẽ vứt mất lớp đắt nhất mà không cổng nào
   đỏ. Kèm: chạy skill `sync-path/`.
9. **Vận hành nền & guardrail** — tiến trình nền còn sống không · có nhịp tim/log đủ để truy khi nó
   chết cứng không · bề mặt có **CHẾT THEO nền** không (vỏ rỗng là kiểu hỏng tệ nhất: nó không báo
   lỗi, nó **NÓI DỐI**, và người dùng không có cách phân biệt với đang-chạy-thật) · **chạy ma trận
   guardrail** — cổng chặn có thật sự chặn không, thứ chỉ đo được bằng cách CHẠY, không đọc code ra
   (ca phải chặn **+ ca phải cho qua**, luật 7).

10. **CHỮ & BỀ MẶT NGƯỜI ĐỌC — mặt NẶNG NHẤT ở dự án non-app** (sản phẩm giao đi chính là chữ người
   đọc, không phải phụ kiện của một app). NORM ở `02_RULES §Ngôn ngữ`. Đo: **thiếu dấu** · **chính
   tả** (từ lặp · mojibake) · **nhãn trong sản phẩm** (cột · biểu đồ · ảnh có tiêu đề và **ĐƠN VỊ**
   rõ; số có kỳ/mốc thời gian kèm) · **thuật ngữ NHẤT QUÁN** (cùng một metric không mang hai tên
   khác nhau giữa các report — đối chiếu từ điển `03_STRUCTURE §7`, đó là nhà duy nhất của định
   nghĩa) · **chữ trong file giao đi** (tên sheet · tiêu đề trang · chú thích) — chỗ này người ngoài
   đọc, nên một lỗi chữ ở đây đắt hơn mọi lỗi trong repo.
   ⚠ **Các phép này BÁO OAN nếu làm ngây thơ:** danh sách từ-không-dấu chỉ được gồm từ mà bản không
   dấu KHÔNG hợp lệ (`khong` `duoc`…; `minh`/`nhanh`/`song` vốn không dấu) · dò từ lặp phải dùng
   `\p{L}` (`\b` của JS là ASCII) và **trừ láy đôi** ("song song") · mẫu mojibake `Â.`/`Ã.` trúng
   cả chữ Việt hợp lệ (ĐÂY · NGÃ) — mẫu đúng là `[ÃÂ][-¿]` · `â€` · `ï»¿` · `U+FFFD`, **và
   phải miễn chuỗi nằm trong backtick**, vì chính tài liệu nêu mẫu mojibake sẽ tự trúng (đo
   2026-08-23: 6/245 file trúng, kiểm tay **0 thật**) · và **tên do người ta đặt thì KHÔNG phải
   lỗi**: tên cột/sheet của nguồn, tên file vendor, thuật ngữ nghiệp vụ viết hoa lạ — soi chữ trong
   phần MÌNH viết, đừng soi chữ mình chỉ đi ngang qua.

**Đầu ra:** bảng finding, mỗi mục ghi *đo được gì · ảnh hưởng · sửa ở đâu*, phân `blocking`/`advisory`.
Vào `05_TODO` + `06_CHANGES`. **Nghi vấn đã loại cũng ghi, kèm lý do loại** — để lần sau khỏi đào lại.

**Cấm:** cắt bớt mặt nào cho nhanh; ghi finding chưa verify; báo "sạch" khi mới chạy mỗi gate.
