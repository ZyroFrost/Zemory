<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — Quy tắc làm việc

> AI đọc file này SAU `01_CONSTITUTION.md` (hiến pháp — bất biến riêng của zemory, tối cao). Tuân thủ tuyệt đối.
> Điều hướng mở phiên (đọc gì, thứ tự nào): `AGENTS.md` ở root. Quy trình thao tác chi tiết nằm ở **`.claude/skills/<tên>/SKILL.md`** (sổ đăng ký: [`04_SKILLS.md`](04_SKILLS.md)); RULES/STRUCTURE chỉ nêu NORM + trigger rồi dẫn chiếu. Backlog: `05_TODO.md`. Changelog: `06_CHANGES.md`.

<!-- zemory:no-gate:start · SINH BỞI `zemory gates --write-top` từ 02_RULES §Cổng cho hiến pháp — đừng sửa tay, số điều KHÔNG đổi -->
> ⚠ **ĐỌC KỸ, KHÔNG LƯỚT — các điều hiến pháp dưới đây KHÔNG có chốt máy.** Vi phạm thì không hook/test nào kêu: chỉ người đọc giữ được chúng.
> - **Điều 4** — 1 capability = 1 slot *(chưa dựng cổng)*
> - **Điều 15** — Chất lượng bộ nhớ là tối cao *(chưa dựng cổng)*
> - **Điều 17** — Một chức năng = một lệnh *(chưa dựng cổng)*
<!-- zemory:no-gate:end -->

## Hành xử
- `02-1` **CHƯA CÓ ĐƯỜNG SANG MÁY THỨ HAI = CHƯA XONG** *(user chốt 2026-09-16)*. Mọi thứ vừa dựng — lớp
  lưu, chỉ mục, bí mật, tài sản giao đi — phải KHAI được nó sang máy khác bằng đường nào, và đường đó
  phải ĐO rồi mới gọi là xong. Không khai được = việc còn dở, bất kể cổng có xanh. Quy trình khai +
  đo: `.claude/skills/sync-path/SKILL.md`.
- `02-2` **VĂN BẢN ĐƯA NGƯỜI ĐỌC THEO VĂN PHONG ĐÃ CHỐT** *(user chốt 2026-09-16)*. Báo cáo · email · tài
  liệu giao đi viết cho NGƯỜI NHẬN, không bê giọng harness (mệnh lệnh, viết hoa nhấn giọng, thuật ngữ
  nội bộ) sang. Bộ luật văn phong: `.claude/skills/write-style/SKILL.md`.
- `02-3` **HIỆN SUY NGHĨ TỪNG BƯỚC — CẤM CHẠY IM LẶNG (user chốt 2026-08-12, luật cứng).** Mỗi phiên
  mới, mọi bước phải để lộ *đang làm gì · vì sao · dựa trên số nào*, ngay khi làm chứ không phải
  dồn vào bản tổng kết cuối. Không được chạy một chuỗi dài rồi mới ngoi lên báo kết quả.
  **Vì sao thành luật:** thứ nguy hiểm nhất không phải làm sai, mà là **làm sai trong im lặng** —
  user mất khả năng chặn giữa chừng, và khi phát hiện thì đã trôi qua hàng chục bước. Đúng ba ca
  đã trả giá trong phiên 2026-08-12: lỗi bỏ đói autosync câm **2 giờ 34 phút** vì log không tới
  đĩa · lệnh clone-sạch in ra *"DỰNG ĐƯỢC"* trong khi nó vừa chết (mã thoát bị `| tail` nuốt) ·
  chở hụt 75% vector với `rejected=0`, không một dòng nào báo. Cả ba đều là **im lặng**, không
  phải lỗi khó.
  **Hệ quả bắt buộc:** ① nói TRƯỚC mỗi cụm hành động, một dòng là đủ · ② mỗi khẳng định đi kèm
  nguồn đo được · ③ đo xong mà số lệch với dự đoán thì **nói ngay**, không đợi tới cuối · ④ việc
  chạy nền lâu phải báo đang chờ gì, không im tới lúc xong.
- `02-4` **FILE TẠM PHẢI CÓ ĐƯỜNG CHẾT — không thứ gì được phình vô hạn.** Mọi thứ agent tạo ra để
  làm việc mà KHÔNG phải sản phẩm (script dò, dữ liệu đo, model tải về, ảnh chụp, bản sao thử)
  phải nằm trong **thư mục nháp của phiên**, không rải vào repo. Đo thật: một phiên làm việc
  nặng để lại **~4 GB** ở đó — model ONNX, cache model, profile trình duyệt — và không ai phát
  hiện cho tới khi đĩa đầy, vì thứ đó không nằm trong `git status` và không cổng nào soi.
  · Xong một phép đo mà biết chắc không dùng lại (model đã copy vào chỗ chính thức, cache của
    lượt dò đã kết luận) ⇒ **dọn ngay trong phiên**, đừng để dành "biết đâu cần".
  · Thứ đáng giữ (dữ liệu đo còn dùng để đối chiếu) thì giữ, nhưng phải NHỎ và nói rõ giữ vì gì.
  · **Máy canh, đừng dựa ai nhớ** (cùng doctrine `conform`/`structure-sync`): người dùng nói
    thẳng *"đợi t kiểm thì t ko nhớ và cũng lâu mới làm"*.
  Ở repo này việc canh đã là CODE: `scratchTick` trong scheduler quét thư mục nháp mỗi 6 giờ,
  dọn phiên quá 7 ngày hoặc khi tổng vượt 2 GB (cũ nhất trước). Bốn ràng buộc an toàn có gate
  riêng: chỉ nhận đúng khuôn `<project>/<session>/scratchpad` · không đụng phiên đang chạy ·
  không đụng thư mục vừa ghi trong 6 giờ · fail-open.
- `02-5` **🔴 `.gitignore` là GIẤU, KHÔNG phải DỌN — và rác nằm TRONG repo phải chết trong cùng lượt.**
  *(luật thêm 2026-08-24 từ số đo thực địa; đi cặp với bullet FILE TẠM ngay trên.)*
  · **File nháp ghi vào thư mục nháp NGOÀI repo.** Buộc phải ghi trong repo (công cụ ép đường dẫn,
    script cần cwd) ⇒ đặt tên `_scratch_*` và **xoá trong CÙNG LƯỢT**, không để dành tới lúc chốt phiên.
  · **Thêm pattern vào `.gitignore` KHÔNG tính là đã dọn.** Nó chỉ làm file tàng hình với `git status`;
    file vẫn nằm nguyên trên đĩa và vẫn lớn lên. Muốn dọn thì phải XOÁ.
  **Vì sao thành luật — đo một repo, một lượt quét:** 5 file nháp `.tmp_*` ở gốc còn sót từ phiên ba
  ngày trước · `data/extract/` phình **3.096 MB**, trong đó một **venv Python 201 MB / 13.830 file** bị
  bulk-copy vào và một `.rar` **1,34 GB** trùng nội dung với chính folder đã giải nén cạnh nó. Dọn được
  **1,56 GB / ~13.850 file, không mất gì**. Toàn bộ chỗ đó nằm dưới đường đã gitignore — tức nó vô hình
  với mọi cổng, và cũng vô hình với chính người tạo ra nó.
- `02-7` **Chỉ làm đúng cái được yêu cầu.** Đụng logic/khác → **hỏi trước**, không tự sửa rồi báo.
- `02-67` **VIỆC CHEN NGANG XẾP HÀNG — làm TUẦN TỰ, không bỏ dở việc đang làm** *(user chốt 2026-09-18:
  "khi user có thêm việc khác chen ngang cũng phải làm tuần tự, không có ngắt trừ khi có lệnh")*.
  User nhắn thêm một việc giữa chừng **KHÔNG** phải lệnh huỷ việc đang chạy. Làm xong việc đang
  làm (hoặc tới một mốc an toàn), rồi mới sang việc mới — trừ khi user nói rõ *dừng* · *bỏ* ·
  *làm cái này trước*.
  · **Cấm gộp nhiều việc vào một lượt sửa** rồi báo chung: user hỏi một thứ mà thấy ba thứ đổi
    thì không biết thứ nào hỏng do đâu, và không chặn được giữa chừng.
  · **Cấm cắt bớt việc đang làm cho kịp việc mới** — bỏ dở nửa chừng để lại một bề mặt sai hơn
    lúc chưa đụng vào.
  · Việc mới **nhắc lại được thì nhắc**, đừng im: nói một dòng *"ghi nhận, làm sau cái đang chạy"*
    rồi làm tiếp. *(Cùng doctrine §Hành xử "HIỆN SUY NGHĨ TỪNG BƯỚC": user phải thấy hàng đợi,
    không phải đoán.)*
- `02-8` **Yêu cầu không rõ ràng phải được làm rõ trước khi thực thi — cơ chế TỰ ĐỘNG, KHÔNG chờ user gọi "grill".** Kích hoạt khi: yêu cầu đa nghĩa · thuật ngữ nhiều cách hiểu · thiếu dữ kiện · phạm vi không xác định · giả định ngầm chưa nêu · hai yêu cầu mâu thuẫn · hoặc trước thao tác khó đảo ngược. → Chạy skill **`.claude/skills/grill/`** (dừng · cái nào đọc code/docs ra được thì đọc · hỏi mỗi lần MỘT câu kèm đề xuất · chốt đủ rõ mới build). KHÔNG tự chọn cách hiểu rộng nhất, KHÔNG tự suy diễn; chỉ áp cho input user chưa đủ để thực thi đúng. (User gõ "grill" = ép chạy thủ công.)
- `02-9` **Thêm chức năng = mở rộng, KHÔNG ghi đè** cái cũ (trừ khi user yêu cầu rõ).
- `02-10` **Thao tác xóa phải được user xác nhận trước.** Xóa file, code, hàm, lệnh, chức năng, nội dung docs hoặc folder được coi là bất khả đảo ngược: nêu đối tượng và lý do, chờ chấp thuận rồi mới thực hiện; không tự xóa rồi báo sau. Thành phần dư thừa hoặc không còn dùng: đề xuất, không tự xóa. Bổ sung/mở rộng không cần xác nhận; xóa/thu hẹp luôn cần.
- `02-11` **CHƯA XÁC MINH THÌ CHƯA PHẢI SỰ THẬT — KHÔNG BỊA, KHÔNG SUY DIỄN (luật cứng).** Áp cho **mọi khẳng định**, không riêng con số: trạng thái hệ thống · nguyên nhân · "cái gì đang xảy ra" · "đã xong chưa". Mỗi khẳng định phải truy được về **nguồn kiểm được** (đọc file · chạy lệnh · gọi bề mặt thật · tra tài liệu ngoài). **Tra không ra ⇒ nói thẳng "không biết / chưa xác minh được"** và nêu đã thử đường nào — cấm lấp bằng suy đoán nghe hợp lý, vì *nghe hợp lý* chính là thứ làm nó lọt. Ba lần trả giá 2026-07-29: đoán cửa sổ "minimize" (thật ra user bấm X) rồi tự bung lên · đoán cú click đã ăn (thật ra `SetForegroundWindow` bị từ chối, click rơi sang app khác) · đoán chỗ hỏng của `parseChangelog` trước khi đọc code (sai một nửa).
  Trước khi ① báo cáo một con số · ② kết luận "đã xong / chưa xong" · ③ xoá bất cứ thứ gì — còn phải đo lại bằng **đường thứ hai, khác cơ chế** với đường thứ nhất. Chạy đúng một lệnh rồi tin luôn là nguồn của gần như MỌI lần báo sai. Bốn dạng đã trả giá thật: công cụ trả rỗng vì **hỏng lặng** (`grep -qP` cho âm tính giả ⇒ kết luận "sạch") · **báo oan** do phép so lỏng (`LIKE` không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai bản chất** (`message_id` chết ⇒ tưởng mồ côi, suýt xoá 87 ảnh đang sống) · **sổ nói khác code** (mục đã xong vẫn ghi "chưa làm"). Kiểm chéo = đổi công cụ (grep ↔ script đọc byte), đổi hướng (đếm xuôi ↔ đếm ngược), hoặc gọi bề mặt thật (DB ↔ HTTP).
- `02-68` **BA LUẬT ĐO — riêng repo này, sinh từ ba lần trả giá thật (user chốt 2026-08-24):**
  · **① Probe tự dựng phải SAO CHÉP THAM SỐ của thước chính thức.** Dựng probe thiếu `all: true`
    (bench luôn có) đã đẻ **3 kết luận sai** trong một phiên (`TOOL_DEMOTE` · `vecMix` · gộp-trùng).
    Vế "đừng đo bằng bề mặt hẹp hơn" sẵn có KHÔNG chặn được ca này — probe trông giống hệt thước,
    chỉ lệch một tham số mặc định.
  · **② N phép thử cùng thất bại theo CÙNG MỘT HƯỚNG ⇒ nghi cái THƯỚC, không nghi N thiết kế.**
    Đã chạy **tám** giả thuyết, diễn giải tám lần như tám vấn đề kỹ thuật riêng, trước khi hỏi
    thước có đếm đúng không (hoá ra thước nhãn-đơn-uuid phạt oan — sinh ra thước tương đương).
  · **③ Số đo phải khớp THỜI GIAN CÔNG VIỆC đáng lẽ phải tốn.** Test nhúng ONNX mà xong trong
    26 ms là XANH GIẢ, không phải nhanh — đã bắt được hai lần trong hai ngày (kho `.db` rỗng làm
    lệnh chết vì lý do khác · `skipIfBusy` thiếu `await` làm mọi ca thoát ngay). Trước khi tin
    một con số đẹp bất thường, đối chiếu nó với chi phí vật lý của việc đó.
- `02-12` **📋 SOÁT SỔ = ĐO LẠI TỪNG MỤC, KHÔNG ĐỌC RỒI CHÉP LẠI (luật cứng — user chốt 2026-08-05 sau khi lỗi này TÁI DIỄN SUỐT MỘT THÁNG).**
  **ÁP MỌI LÚC — KHÔNG chờ chốt phiên.** Kích hoạt ngay khi user nói *"check todo"* · *"còn gì chưa làm"* · *"liệt kê ra"* · *"soát lại"* · *"plan/change tới đâu rồi"*, hay khi agent tự mở sổ giữa chừng. Phần lớn ca hỏng là GIỮA PHIÊN, ngay sau khi vừa xong một việc — đúng lúc dễ tưởng mình đang nhớ rõ nhất.
  - **Vì sao:** mỗi mục trong `05_TODO` là một **KHẲNG ĐỊNH VỀ TRẠNG THÁI** ("chưa làm", "chờ duyệt", "còn N tin") — mà khẳng định thì phải **truy được về nguồn kiểm được** (luật ngay trên). File `.md` là nguồn của *nội dung* (FILE WINS), **KHÔNG phải nguồn của sự thật hệ thống**. Đọc sổ rồi báo lại y nguyên = báo cáo chưa xác minh, dù chữ nằm trong file của chính mình.
  - **TRƯỚC khi liệt kê / báo cáo / hỏi user về bất kỳ mục nào — BA NGUỒN, CHẠY ĐỦ CẢ BA (user chốt 2026-08-06). KHÔNG chọn nguồn theo "loại mục".** Ba nguồn trả lời BA câu KHÁC nhau, không nguồn nào thay được nguồn nào:
    · **① MÃ — *"code hiện đang thế nào"***: grep / đếm / đọc đúng dòng. **Cấm suy từ mô tả.**
    · **② GLOBAL MEMORY — *"đã từng quyết / làm gì"***: `zemory memory search --all`, **lọc riêng LỜI USER** (quyết định đến từ user, không từ agent). Quyết định hay nằm ở phiên khác, thậm chí **REPO KHÁC** (luật secret chốt bên một repo app rồi mà zemory vẫn hỏi lại).
    · **③ CHẠY THẬT — *"lúc chạy nó ra cái gì"***: gọi endpoint thật · truy vấn nguồn sống · mở app nhìn tận mắt · đọc log/chẩn đoán của tiến trình ĐANG chạy. **Mã có mặt KHÔNG bảo đảm nó chạy đúng** (mã đúng mà cấu hình/dữ liệu sai là im lặng); **GM chỉ nói về quá khứ**, không nói hiện tại.
    **CHỈ KHI CẢ BA KHỚP mới được kết luận.** Lệch nhau ⇒ **cái MỚI HƠN thắng**, và phải ghi rõ cái cũ đã bị thay — **lời nói của user CÓ HẠN DÙNG**: một quyết định cũ có thể bị chính việc làm sau đó supersede. Không chạm được nguồn nào (app không mở được, mất mạng, chưa có quyền…) ⇒ ghi **"chưa xác minh được"** kèm nguồn đã thử — **KHÔNG** mặc định là "chưa làm", và **KHÔNG** lấy hai nguồn còn lại làm đủ.
    > ⚠ **Vì sao phải nói "đủ cả ba" thay vì liệt kê điều kiện:** bản cũ viết `① kiểm được bằng code ⇒ … · ② là quyết định/bàn giao ⇒ …` — đọc ra **bảng phân nhánh theo loại mục**, nên agent phân loại xong là rẽ một nhánh rồi dừng. Hậu quả thật (một repo app, **cùng một ngày, sai theo hai hướng ngược nhau**): mục *EMS* chỉ chạy ① nên bỏ sót "đã sửa 17/07 rồi 31/07 báo lại" + một bản DB **chết từ 2025-07-07 vẫn nằm trong bản quét**; mục *Realtime MID* chỉ chạy ② nên tin câu user 15/07 *"mid ko quan tâm"* rồi **gỡ mất một mục mà mã đã làm từ lâu** (`mid_late`/`mid_over` có sẵn trong registry + chuông). Cả hai đều lọt qua bản cũ mà không vi phạm chữ nào.
  - **Mục quá 7 ngày không ai đụng = NGHI NGỜ, không phải sự thật.** Đo 2026-08-05: soát 58 mục thì **11 sai (~19%)** — có mục đã build xong vẫn mang dấu `[ ]`, có mục agent tự bịa vì thấy triệu chứng rồi phán nguyên nhân (compact bundle: code + test đã có sẵn).
  - **Hỏi lại user một việc đã chốt là LỖI, không phải cẩn thận.** Nó bắt user trả lời hai lần cho cùng một câu và làm hỏng lòng tin vào cả bản danh sách.
  - **Máy phải canh, đừng dựa agent nhớ** (cùng doctrine `structure-sync`/`conform`): xem *"gate chống TODO thối"* trong `05_TODO` — chưa có gate thì luật này chỉ là lời hứa, mà lời hứa đã hỏng suốt một tháng.
- `02-13` **Test mới phải chứng minh mình ĐỎ ĐƯỢC.** Viết xong một test, hãy **phá code mà nó canh** rồi chạy lại: không đỏ ⇒ test đó chưa soi gì, phải sửa test chứ không phải mừng vì xanh. Hai lỗ đã bắt được đúng bằng cách này: một test chưa bao giờ chạy tới nhánh nguy hiểm, một test bị **bản sao logic ở nơi khác gánh thay**. Xanh KHÔNG phải bằng chứng (xem `.claude/skills/audit/` luật 1).
- `02-14` **Nêu phản biện thiết kế trước khi thực thi** nếu phát hiện điểm bất hợp lý; quyết định cuối thuộc về user.
- `02-62` **MỌI thiết kế UI/UX phải TRÌNH DUYỆT trước — KHÔNG tự ý (luật cứng).** Bất kỳ quyết định *thiết kế* giao diện — layout/kích thước/khung/màu/theme/hình dạng component/thêm-bớt phần tử UI/đổi style/cách sắp xếp — agent **KHÔNG tự chọn theo phán đoán riêng**: nêu ĐỀ XUẤT cụ thể (hoặc bản nháp/ảnh) → chờ user gật rồi mới làm. Sửa *bug/kỹ thuật* (căn lệch, tràn, lỗi) thì cứ sửa; nhưng đụng tới *hình hài thiết kế* là phải hỏi. User giao một hướng nhưng còn để hở chi tiết thiết kế → trình phương án cho phần hở, đừng tự quyết. (Sinh từ nhiều vòng phải sửa lại UI phiên 07-20/21; đi cặp với "Chỉ làm đúng cái được yêu cầu".)
- `02-16` **Skill là THAM KHẢO cho khuyến nghị, KHÔNG auto-apply.** Trước khi thiết kế/nắn UI (hay việc skill phủ) → ĐỌC skill → rút khuyến nghị (nên theo / đang kẹt / nên chuẩn hoá) → TRÌNH user; đổi vẫn theo luật "thiết kế UI phải duyệt trước". User có ý tưởng UI mới cũng check skill gợi ý lại. Quy trình đầy đủ: `04_SKILLS` §1.

> *(Luật THIẾT KẾ/UI cụ thể — Dialog 3-size, ESC mọi dialog, token-first… — KHÔNG ở đây: RULES là luật LÀM VIỆC chung. Convention thiết kế ở `03_STRUCTURE §5`. Ở đây CHỈ là luật hành xử "phải hỏi trước".)*

## Cấu trúc repo — xem `03_STRUCTURE.md`
**Chuẩn cấu trúc folder ĐẦY ĐỦ** (cây từng-dòng + routing "sửa gì → vào đâu" + convention) nằm ở **[`03_STRUCTURE.md`](03_STRUCTURE.md)** — **đọc TRƯỚC khi sửa/tạo folder**; cần sửa gì → `03 §4` trỏ THẲNG slot (KHÔNG grep cả repo). Nắn repo về chuẩn → skill **`.claude/skills/reconcile/`**.

- `02-17` **`03_STRUCTURE` là INDEX phải KHỚP code (luật làm việc):** mọi thay đổi cấu trúc (thêm/đổi/dời slot, thêm routing) phải cập nhật `03_STRUCTURE` trong CÙNG thay đổi đó — index lệch code = tra sai. *(Nội dung chuẩn — BẮT BUỘC=4, 1 tên/concern, tracked-vs-gitignore… — nằm ở `03`, KHÔNG lặp ở đây.)*
- `02-18` **SỬA BẤT CỨ GÌ (backend · frontend · docs · config · test) → PHẢI đúng CHUẨN ĐÃ CHỐT (luật cứng).** Trước/trong khi tạo·đổi·dời file hoặc viết code: đối chiếu `03_STRUCTURE` (slot · routing · convention · UI §5/§9) + `01_CONSTITUTION` (bất biến) + `02_RULES`. **TUYỆT ĐỐI không sửa SAI chuẩn** (đặt file sai slot, đẻ tên mới cho concern đã có tên, hardcode màu/chuỗi, UI phá luật §5…). Không chắc chuẩn ở đâu → tra `03 §4`/§9 hoặc HỎI, đừng đoán. Thấy chỗ ĐANG lệch chuẩn → nắn về chuẩn (hoặc BÁO nếu lớn/khó đảo), KHÔNG nhân thêm cái sai lên.

## Luật khi VIẾT (BẮT BUỘC — luật cứng)

> Những luật này nổ **lúc viết code**, không phải lúc tạo folder — và `zemory conform` **không kiểm được**
> cái nào trong số chúng. Không biết = vi phạm âm thầm, không gate nào kêu. Vì vậy chúng ở đây (luôn nạp),
> chứ không ở `03_STRUCTURE` (tra khi cần). Nguyên văn, dời từ `03 §5` ngày 2026-07-29 — `03` KHÔNG còn giữ bản sao.

```
02-25 SQL — 1 CÁCH         mặc định store/queries.* (gom, đặt tên, gọi theo tên; domain-first ⇒ <domain>/store/queries.*); resources/sql/ CHỈ khi cố ý tách file .sql. KHÔNG rải inline. ① TRƯỚC khi viết SQL tra store/queries — có câu chuẩn thì GỌI LẠI theo tên · ② chưa có thì THÊM MỘT câu có tên vào đó, không viết tại chỗ · ③ bản thừa sẵn có phải DỌN. Code chạy dạng CHUỖI (worker eval) không import được ⇒ truyền câu có tên qua workerData. Repo có nợ cũ ⇒ cổng ratchet: số SQL viết tại chỗ chỉ được GIẢM (zemory: `sql-one-way.test`, plan/27 §2g)
02-21 Secret               config/ + .env.example chỉ trỏ TÊN env (password_env); pass THẬT ở .env/vault → data/secrets/. KHÔNG commit
02-63 Thiết kế UI (LUẬT)   **Chuẩn thiết kế FE + BE của app: `.claude/skills/app-design/SKILL.md`** — panel resize · dialog · chữ người dùng đọc · gom tiến trình. Đây là CHUẨN THIẾT KẾ, không phải điều khoản; đụng bề mặt app hay thêm tiến trình nền ⇒ MỞ nó trước, và làm theo
02-23 Separator của INDEX   ⛔ ĐỪNG "dọn cho đẹp": chỉ mục docs lưu đường theo separator của OS (`docs\agent\05_TODO.md`), KHÔNG posix — đo 2026-08-24: **51/51 doc row dùng `\`**, và mọi chỗ TRA cũng ghép bằng `join`. Đợt vét 07/08 từng chuẩn hoá sang `/`, hậu quả đo được: `plan ls` IM LẶNG báo "index rỗng" dù chỉ mục đủ, và `reindex` lần sau đẻ doc row TRÙNG. Muốn đổi = một MIGRATION riêng (đổi index cũ + mọi chỗ tra trong CÙNG một bước), không phải việc dọn dẹp lẻ
02-24 EOL của file         ⛔ ĐỌC SAO GHI VẬY: sửa file CÓ SẴN thì giữ nguyên kiểu xuống dòng của nó — đọc dạng BYTE, thấy CRLF thì ghi lại CRLF. Đọc thành text rồi ghép lại bằng LF là ÂM THẦM đổi cả file sang LF ⇒ git kêu MỌI DÒNG đều đổi, thay đổi thật chìm trong nhiễu và mất blame theo dòng. Đo 2026-09-04: 2 file bị vậy, và cùng lượt ghi-lại-cả-file đó còn LÀM RƠI phần phiên khác vừa chèn (lost update, không ai báo lỗi) ⇒ sửa theo TỪNG ĐOẠN, đừng đọc-cả-file-rồi-ghi-lại
```
## Ngôn ngữ (BẮT BUỘC)
- `02-26` **docs (`docs/agent` + `docs/plan`)**: tiếng Việt có dấu.
- `02-27` **Văn phong harness = KỸ THUẬT / QUY PHẠM, KHÔNG văn nói.** Hiến pháp, rules, structure và plan viết dạng đặc tả: câu mệnh lệnh ngắn gọn, thuật ngữ chính xác, nêu điều kiện → hành vi. Không dùng khẩu ngữ, câu cảm thán, ví dụ hội thoại, hay lối kể chuyện phiếm.
- `02-28` **UI · CLI output**: **English HOẶC i18n đủ 2 dict** (song ngữ, đổi qua nút setting) — **0 chuỗi hardcode** (mọi chuỗi người-dùng-thấy đi qua i18n, có cả 2 bản). **Thuật ngữ kỹ thuật / chuyên ngành nặng GIỮ NGUYÊN, KHÔNG dịch** (vd Recall · Hybrid · FTS5 · vector · embed · token — dịch ra làm sai nghĩa). Chi tiết cổng chất lượng i18n → `03_STRUCTURE §9.D` (nguồn duy nhất, không lặp).
- `02-29` **code · comment: TIẾNG ANH TOÀN BỘ** — comment · docstring · tên biến/hàm · log/thông điệp kỹ thuật. Một file một ngôn ngữ (đo repo thật 2026-08-29: một file trộn ba kiểu VN-không-dấu · VN-có-dấu · English). ⚠ **`commit message` KHÔNG thuộc gạch này** *(bỏ 2026-09-21, user: "t chỉ cấm ko có tiếng việt ko dấu thôi mà có bắt tiếng anh lúc nào")*: commit viết **tiếng Anh HOẶC tiếng Việt CÓ DẤU**, cấm mất dấu. **Ba thứ KHÔNG phải comment — KHÔNG dịch:** ① **chuỗi RENDER ra tài liệu / bề mặt người đọc** (desc·note sinh vào `docs/`, nhãn UI qua i18n) theo luật của docs/UI ở trên, không theo luật code · ② **tên do người khác đặt** (tên cột Excel · trường API · tên file nguồn — vd `"Kich thuoc khu dat"`) giữ NGUYÊN từng ký tự, dù trông như "Việt mất dấu": đổi là loader không tìm thấy · ③ **thuật ngữ chuyên ngành** giữ nguyên. Comment Việt cũ: sửa khi **đang đụng file đó**, KHÔNG mở chiến dịch dịch hàng loạt (đo: 20.203 token comment dịch hết tiết kiệm ~4.000 token/lần đọc toàn repo — không đáng một đợt riêng).
- `02-30` **ĐỊNH DANH · TÊN FILE = ASCII TIẾNG ANH. TRONG MÃ, THỨ DUY NHẤT ĐƯỢC PHÉP LÀ TIẾNG VIỆT CHÍNH LÀ CHÚ THÍCH** *(luật thiết kế chung MỌI app — user chốt 2026-09-12: **"mọi biến hàm, mọi thứ liên quan code ko dc ghi tiếng việt, trong code chỉ có 1 thứ có tiếng việt dc chấp nhận là chú thích"**)*. Phủ hết: tên biến · hằng · hàm · lớp · kiểu · tham số · khoá config/JSON · tên test · **tên file · tên thư mục** · tên nhánh git. Cấm **cả hai** dạng — có dấu (`chặnNhầm` · `tênFile` · `phảiChặn`) và mất dấu ghép lại (`THAN_TOI_DA` · `soLuongBanGhi`). *Vì sao là luật chứ không phải gu: định danh là thứ MÁY khớp — grep · refactor · import · đường dẫn trong lệnh shell đều gãy hoặc trượt trên chữ ngoài ASCII, mà đổi tên về sau thì đụng mọi chỗ gọi. Đo 2026-09-12: 835 thành phần đường dẫn **0 lệch**; 13.625 khai báo **9 lệch**, dồn ở một file test.* Ba miễn trừ ở vế trên giữ nguyên (tên do người khác đặt · thuật ngữ chuyên ngành · chuỗi render cho người đọc) — đó là DỮ LIỆU, không phải định danh. Máy soi: `node .claude/skills/audit/scripts/lang-scan.mjs .` (mặt ⑫ của `audit`).
- `02-31` **CHỮ NGƯỜI DÙNG ĐỌC PHẢI ĐẦY ĐỦ VÀ ĐÚNG — bốn ràng buộc, áp lúc VIẾT (user chốt 2026-08-21).**
  Luật đứng ở đây vì chín mặt của `audit` đều soi MÁY; không mặt nào soi thứ **người đọc nhận**, và
  một lỗi chữ thì không gate nào kêu — nó chỉ hiện ra trước mặt người dùng.
  · **① Có dấu, đúng chính tả — TUYỆT ĐỐI KHÔNG CÓ TIẾNG VIỆT MẤT DẤU Ở BẤT CỨ ĐÂU** *(user chốt
    2026-09-12, siết vế cũ)*. Áp cho **mọi file, không trừ file nào**: plan · docs · chú thích code ·
    docstring · tên test · chuỗi sinh máy · JSON cấu hình. Đúng **HAI** lựa chọn, không có lựa chọn
    thứ ba: **① tiếng Anh · ② tiếng Việt CÓ DẤU.** Và không mang mojibake (UTF-8 bị đọc thành
    Latin-1: `Ã¡` · `â€` · `ï»¿`).
    > 🔄 **Bãi bỏ vế cũ** *"chữ ASCII-không-dấu CHỈ hợp lệ khi buộc phải vậy (vd file chốt của hook
    > in ra console không chắc encoding) — và phải nói rõ lý do tại chỗ"*. Lối thoát đó chỉ ra thứ
    > tệ nhất trong ba đường: **sợ encoding thì viết TIẾNG ANH** — nó ASCII sẵn, an toàn y hệt, mà
    > vẫn đọc được. Việt mất dấu vừa khó đọc, vừa nhập nhằng nghĩa, vừa làm chính bộ dò chính tả
    > mù. Đo 2026-09-12: **616 dòng / 28 file** đang vi phạm, **72% dồn vào `guard.cjs` sinh máy +
    > nguồn nhúng `guard-gen.ts`** — đúng chỗ mà vế cũ bao che.
  · **②–④ — NHÃN ĐỦ · SONG NGỮ ĐỦ HAI ĐẦU · UI KHỚP CODE:** ba phép này nói về BỀ MẶT app, nên
    chúng sống ở `.claude/skills/app-design/SKILL.md` §F4/§F7 — theo chuẩn đó khi làm bề mặt.
  *(Cách đo + **bẫy báo oan** của từng phép — danh sách từ không dấu, láy đôi, `\b` ASCII, nhãn ở
  thẻ con, khoá i18n truyền qua biến, route ghép động — nằm ở `.claude/skills/audit/` mặt ⑪:
  luật nói PHẢI ĐÚNG GÌ, skill nói ĐO THẾ NÀO cho khỏi báo oan.)*
  *(Phần ĐỊNH DANH · TÊN FILE · Việt-mất-dấu · đếm khoá song ngữ do **mặt ⑫** soi — cách đo + bẫy +
  số nền ở `.claude/skills/audit/reference/lang.md`, máy chạy
  `node .claude/skills/audit/scripts/lang-scan.mjs .`.)*

## Tài liệu — quy ước cập nhật
| File | Vai trò | Khi nào cập nhật |
|---|---|---|
| `01_CONSTITUTION.md` | hiến pháp — bất biến riêng của zemory | CHỈ user chốt; agent HỎI trong phiên (§Sổ việc) |
| `04_SKILLS.md` | **sổ ĐĂNG KÝ** skill: một dòng mỗi skill + luật dùng. Playbook nằm ở `.claude/skills/<tên>/SKILL.md` | khi thêm/bớt một skill |
| `05_TODO.md` | backlog | **chỉ việc USER đã gật** — luật vào/ra ở §Sổ việc `05_TODO` bên dưới |
| `06_CHANGES.md` | changelog | mỗi lần sửa code; **chỉ ghi sau khi user xác nhận OK** (viết tay đúng format `## [YYYY-MM-DD] — tiêu đề`) |
| `docs/plan/*` | thiết kế dài hạn (specs thuần, KHÔNG todo) | khi chốt/đổi thiết kế |

- `02-33` **Docs = FILE là nguồn (FILE WINS):** viết/sửa `.md` trực tiếp BÁM CHUẨN (đúng file, đúng vai trò, changelog đúng format `## [YYYY-MM-DD] — tiêu đề`); **xong là xong** — file là nguồn, KHÔNG cần chạy gì thêm. Muốn `plan search`/`changelog search` tươi thì chạy `zemory reindex` (đọc `.md` → dựng lại search index, **KHÔNG ghi ngược file**). Các lệnh ghi DB→md kiểu cũ (render/set/add) **đã gỡ hoàn toàn** — docs chỉ sửa bằng tay. *(HP điều 3 — sửa đổi 2026-07-16)*
- `02-34` **Đồng bộ bắt buộc — constitution ↔ rules ↔ todo ↔ change ↔ plan luôn khớp:** mỗi thay đổi → TODO phản ánh việc, CHANGES ghi log (sau khi OK), plan cập nhật nếu đổi thiết kế. Không để lệch nhau (đây là khớp NỘI DUNG giữa các FILE, không phải chạy sync).
- `02-35` **Mỗi file harness làm ĐÚNG MỘT việc — KHÔNG lặp nội dung file khác.** `01` hiến pháp (bất biến kiến trúc) · `02` luật làm việc · `03` chuẩn cấu trúc folder · `04` sổ đăng ký skill (playbook → `.claude/skills/`) · `05` backlog · `06` changelog. Một nội dung chỉ sống ở ĐÚNG MỘT nhà; file khác cần thì **DẪN CHIẾU** (link + số hiệu), KHÔNG chép lại. Đọc hết 6 file KHÔNG được thấy nội dung trùng — trùng lặp / lạc chỗ = agent đọc bị loạn.
- `02-36` **Plan (`docs/plan/`) — chỉ chứa SPECS:** KHÔNG todo (→ `05_TODO`, qua cửa vào ở §Sổ việc), KHÔNG luật (bất biến/luật riêng → **HỎI user**; plan chỉ dẫn chiếu điều khoản). Chuẩn đặt tên `NN_tên.md` (`00`=overview): xem `03_STRUCTURE §5`.
- `02-37` **PLAN PHẢI GỌN — vì mọi phiên phải đọc HẾT nó** (user chốt 2026-10-08, từ một repo kho dữ liệu: plan 12.800 dòng, đọc hết rồi nén context, đọc lại không xuể). Plan chỉ giữ **hướng ĐÃ CHỐT hiện tại + điểm còn mở**; lịch sử ("làm ngày nào", "trước đây là X") là việc của `06_CHANGES`. Đổi hướng ⇒ sửa TẠI CHỖ thành hướng mới, lý do ghi ở CHANGES. **Plan là văn bản NGƯỜI viết để bàn và chốt thiết kế — không máy sinh nào ghi vào `docs/plan`, kể cả MỘT KHỐI trong file** (user chốt 2026-10-08: *"plan đúng là phải full text… plan là bàn và chốt thiết kế mà"*): mục lục · catalog · bảng tra do build sinh ⇒ ghi ra file cạnh nguồn sinh ra nó, plan chỉ trỏ link. **Sơ đồ cây thư mục · bảng cấu trúc · khối mũi tên kiến trúc · `mermaid` do agent hoặc người viết thẳng khi bàn thiết kế là PHẦN CHÍNH của plan — giữ, cứ vẽ tay, KHÔNG cần script**; luật chỉ cấm ĐẦU RA của script build nằm trong plan, không bao giờ là lý do xoá sơ đồ hay né không vẽ. `zemory validate` báo LỖI khi gặp dấu khối máy sinh (`<!-- AUTOGEN` · `AUTOGEN:` · tiêu đề "SINH TỰ ĐỘNG" · "MÁY SINH … ĐỪNG SỬA TAY"). Mỗi mục `05_TODO` gắn `→ plan/NN §mục` để dẫn đường (không thay luật đọc hết). Trần: một spec ~1.000 dòng (user chốt 2026-10-08, sau khi gọt mà không mất ý thì spec lớn nhất còn ~700) · cả `docs/plan` ~5.000 dòng — `zemory validate` cảnh báo khi vượt (khoá `thresholds.plan_spec_lines` / `plan_total_lines`).
- ### `02-38` SỔ VIỆC `05_TODO` — LUẬT DUY NHẤT, phủ cả cửa VÀO lẫn cửa RA (luật cứng)
  > Mọi luật về sổ việc sống Ở ĐÂY. File khác cần thì **dẫn chiếu** mục này, KHÔNG chép lại và
  > KHÔNG đặt thêm luật riêng cho sổ ở chỗ khác — đó chính là cách bộ luật tự đá nhau.

  **① CỬA VÀO — agent KHÔNG tự thêm mục. Phải HỎI, và phải ĐÁNG.** *(user chốt 2026-08-23)*
  Agent không tự phát sinh: mục `05_TODO` mới · luật/điều khoản mới · cổng test · bộ đếm · bộ đo ·
  lớp cảnh báo · mục advisory. Thấy cần ⇒ **hỏi MỘT câu kèm đề xuất ngay trong phiên**; user gật
  thì mới ghi, gật vào đâu ghi vào đó (`01` luật · `02` luật làm việc · `05` việc).
  - **Đề xuất KHÔNG được "đậu" vào sổ chờ duyệt.** Đây là vế bị **BÃI BỎ** — xem 🔄 bên dưới.
  - **Ngưỡng: THỰC SỰ QUAN TRỌNG.** Lắc nhắc thì bỏ qua — không ghi sổ, không dựng cổng, không
    thêm dòng cảnh báo. Sổ và bộ gác là **tài sản chung có giá**: mỗi dòng thêm vào là thứ MỌI
    phiên sau phải đọc *và* phải soát lại.
  - **Thêm một lớp là thêm một chỗ hỏng.** Bộ đo không làm hệ tốt lên, nó chỉ nói hệ đang thế nào.
    Ba ca thật của repo này đều sinh từ một lượt *"thêm cho chắc"*: `archive` nuốt cờ lạ rồi chạy
    thật · guard đọc TÊN FILE thành lệnh push nên chặn luôn chính lệnh đi soi cờ · bộ dò mojibake
    báo oan trên đúng file dạy về mojibake. **Bộ gác tự bẫy chính mình.**
  - **Trước khi thêm bất cứ thứ gì, trả lời đủ ba câu:** ① **gỡ bớt** được cái gì không · ② **gộp**
    vào cổng/luật đã có được không · ③ **không có nó thì hỏng cái gì**, đo được không.
    Không trả lời được ③ ⇒ **KHÔNG LÀM**. (Hướng đúng là TỐI ƯU, không phải BỒI ĐẮP.)
  - **KHÔNG áp cho:** việc user giao · sửa thứ đang hỏng · nghĩa vụ mà luật SẴN CÓ đã bắt buộc
    (vd HP điều 12 đòi gate trước khi bật mặc định). Ba ca đó cứ làm, không phải xin.

  **② CỬA RA — XONG MỘT VIỆC LÀ ĐÓNG NGAY, không đợi chốt phiên.** Ngay khi một mục xong, làm đủ
  ba bước **trong cùng lượt đó**: ① **ĐO LẠI** theo §Hành xử *"SOÁT SỔ = ĐO LẠI"* (mã · Global
  Memory · chạy thật) — *"tôi vừa làm nên tôi biết"* **KHÔNG** phải bằng chứng, và đây đúng chỗ hay
  sai nhất: phần lớn ca hỏng là GIỮA PHIÊN, ngay sau khi vừa xong một việc · ② ghi sang
  `06_CHANGES` · ③ **xoá mục khỏi `05_TODO`** (hoặc `zemory archive` dời sang `archive/`). Dấu máy dời: `- [x]` · `- ✅` · `N. [x]` · tiêu đề `## [x]` (cả khối, khi bên trong không còn `[ ]`/`[~]`). `✅` trên mục đánh số hay tiêu đề, và khối đóng còn việc mở, thì `archive` chỉ BÁO — agent tự xử lý.
  *(Chốt phiên vẫn chạy `archive` như lưới vét cuối — `.claude/skills/session-close/` Bước 3 —
  nhưng lưới đó để hứng phần đã dồn, KHÔNG phải chỗ để dồn.)*

  **Số đo — vì sao cả hai cửa đều cần luật:** cửa ra đo 2026-07-29 **107 mục đã xong chiếm 46%**
  một file luôn-nạp; soát 2026-08-05 **11/58 mục sai (~19%)**. Cửa vào đo 2026-08-23: **89 mục còn
  mở · 1.658 dòng · 104 file test**, trong đó **18 mục "ĐỀ XUẤT" chờ user** — loại này **không bao
  giờ đóng được bằng cửa ra**, vì chúng không phải việc chưa làm, chúng là câu hỏi chưa ai trả lời.
  Có cửa ra mà không có cửa vào thì sổ chỉ có một chiều: phình.

  > 🔄 **BÃI BỎ vế *"agent ghi ĐỀ XUẤT vào `05_TODO` chờ user duyệt"*** (từng nằm ở
  > `01_CONSTITUTION §Sửa đổi hiến pháp`, §Chốt phiên bên dưới, và skill `audit`/`session-close`).
  > Vế đó **chính là cỗ máy** đẻ ra 18 mục treo: nó dạy agent *đậu* thay vì *hỏi*, mà đậu thì không
  > có đường ra. Nay: **hỏi trong phiên, user gật mới ghi.** Không gật ⇒ không tồn tại dòng nào.
- `02-39` **Tra log sâu:** việc/lỗi/quyết định ở phiên khác → `zemory memory search "<q>" [--all]` (recall on-demand; đừng tra bừa).

## Chốt phiên / ghi sổ (BẮT BUỘC — luật cứng)
**Kích hoạt khi user nói:** "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt** — quy trình đầy đủ (đọc lại 3 nguồn: FULL phiên hiện tại + FULL `docs/plan/*` + FULL `docs/agent/*` → định tuyến từng thứ về đúng file → chuẩn "không bỏ sót" → bước cuối `zemory validate`) ở skill **`.claude/skills/session-close/`**. Bất biến: mọi việc đã làm phải tìm được ở `06_CHANGES` **hoặc** `05_TODO`; đổi thiết kế → `docs/plan/*`. **Chẩn đoán sai · đường cụt · luật riêng phát sinh: NÓI trong báo cáo phiên, KHÔNG tự ghi thành mục** — muốn vào sổ thì hỏi (§Sổ việc `05_TODO`, cửa vào). Không tự `git push` (§Git).

- `02-40` **Global Memory là NGUỒN của phiên (BẮT BUỘC verify):** episodic sống sót qua context-trim, còn trí nhớ trong context thì bị lược → khi ĐỔI SESSION / ghi docs / audit / báo cáo, PHẢI dò Global Memory (`zemory memory search`/`digest <session>`) + đối chiếu code THẬT để **verify TỪNG mục TRƯỚC khi ghi hay khẳng định** — không ghi/báo theo trí nhớ tóm tắt hay kết quả subagent chưa kiểm. Đây là chốt chặn "đổi session là sót/lệch". Chi tiết: `.claude/skills/session-close/` Bước 0.

- `02-69` **Soát/ghi `05_TODO` · `06_CHANGES` · `plan/` lúc chốt phiên → áp luật §Hành xử *"SOÁT SỔ = ĐO LẠI"*** (luật đó áp **MỌI LÚC**, không riêng lúc chốt).

## Changelog — supersede
- `02-41` Mới nhất ở trên cùng (chèn ngay sau header).
- `02-42` Entry **đảo/thay** quyết định cũ → mở đầu bằng: `> 🔄 **Supersede:** thay [YYYY-MM-DDx] — "[đề mục]" — [lý do].` **Phải nêu ĐÚNG khoá ngày của entry bị thay** (`2026-07-29l`, y như heading của nó): đó là thứ DUY NHẤT máy nối được, và nối rồi thì ai tra trúng entry CŨ mới thấy nhãn “⚠ ĐÃ BỊ THAY”. Viết trống ngày ⇒ quyết định đã chết vẫn hiện ra như đang sống. Ngày trần khi hôm đó có nhiều entry (`29e`/`29f`) ⇒ **bỏ qua, không đoán**. Không sửa/xoá entry cũ; tuỳ chọn thêm `> ⤴ Đã bị thay bởi [ngày].` ở entry cũ.
- `02-43` **Entry NGẮN — trần ~30 dòng (luật, không phải gợi ý).** Một entry chỉ cần ba thứ: **đổi gì · vì sao · số đo**. Chi tiết thiết kế → `docs/plan/NN_*`; tường thuật quá trình → bỏ. Lý do là số học: ở `changes_keep` ~180 dòng thì **bốn** entry 50 dòng chiếm trọn vùng active, tức viết dài làm chính cơ chế archive thành vô nghĩa. `zemory validate` báo entry vượt trần (advisory) — đo trên 76 entry thật: p50 19 dòng, nên 30 là rộng rãi với một entry bình thường.

## Phạm vi project (BẮT BUỘC — luật cứng)
- `02-44` **CHỈ làm việc trong project folder đang mở.** TUYỆT ĐỐI KHÔNG ghi/sửa/chạy lệnh đụng vào project khác (kể cả lệnh `zemory` trỏ root khác, `cd` sang repo khác, sửa file bên đó) khi user CHƯA cho phép rõ ràng trong phiên — **kể cả với ý định "giúp"/"cứu dữ liệu"/"tiện tay sửa luôn"**.
- `02-45` Thấy cần đụng project khác → **DỪNG, HỎI TRƯỚC**: nêu rõ định làm gì, ở đâu, vì sao; user gật mới làm. Project khác có thể đang có agent/phiên khác làm việc — đụng chéo gây xung đột dữ liệu.
- `02-46` Đọc-tham-khảo (read-only) project khác để trả lời câu hỏi thì được; **mọi thao tác GHI là cấm mặc định**.
- `02-47` **Vế ngược — bạn đang ĐỨNG TRONG repo tham khảo:** mở một repo khác chỉ để **xem/copy chuẩn** (vd `zemory` — nơi chứa bộ chuẩn gốc) thì **CHỈ ĐỌC**. Lệnh `zemory` **GHI theo cwd**: chạy `init`/`sync`/`reindex`/`archive`/`memory scan` khi đang đứng ở repo đó = **ghi vào repo đó + DB của nó**, không phải vào project bạn. Lấy chuẩn = **đọc `docs_template/`** (bản mẫu TRẮNG — KHÔNG phải `docs/`, đó là docs RIÊNG của repo chuẩn như zemory) **rồi chạy lệnh Ở REPO CỦA BẠN**.
- `02-48` **Tiêu đề phiên (user chốt 2026-10-07):** khuôn `<Repo>_<Model>_<d-m-yyyy>` — `<Repo>` = tên thư mục repo HIỆN TẠI đúng hoa thường; `<Model>` = model đang chạy phiên (`Claude`, `Codex`, …); ngày = ngày mở phiên, không đệm số 0 (`Zemory_Claude_7-10-2026`); chủ đề chèn TRƯỚC ngày (`<Repo>_<Model>_<ChuDe>_<d-m-yyyy>`); phiên thứ 2, 3 trong ngày thêm đuôi `_<số>` SAU ngày (`…_7-10-2026_2`). **User** đặt tiêu đề (đổi tên phiên bình thường là đủ; `/rename` đổi thêm tên nhắn tin). Phiên chưa có tiêu đề = **chưa dùng**. Bộ kiểm: `zemory peers --all --check` chấm MỌI phiên trên máy, kể cả phiên đã đóng (khuôn lệch · ngày lệch quá 1 ngày so với ngày mở phiên); `zemory peers --fix` in kế hoạch đặt lại, `--apply` mới ghi — **chỉ chạy khi user bảo**: phiên user đặt tên riêng chưa theo khuôn là quyết định của user. Agent thấy tiêu đề phiên của CHÍNH mình lệch khuôn thì nhắc user MỘT lần.
- `02-49` **Nhắn agent ở repo khác (user chốt 2026-10-07):** chỉ nhắn phiên đang chạy có **tiêu đề chuẩn** `<Repo>_<Model>_<d-m-yyyy>` (tiêu đề user đặt cho phiên). Repo có nhiều phiên ⇒ chọn phiên có **ngày trong tiêu đề mới nhất**; bằng ngày ⇒ phiên hoạt động gần nhất. Phiên **chưa có tiêu đề** (`Untitled` — Claude Code tự mở khi bật lại máy, chưa dùng) ⇒ **CẤM** nhắn. ⚠ Tiêu đề KHÔNG phải địa chỉ gửi: `ListAgents` chỉ in tên nhắn tin tự sinh (`dept-biz-b2`), nên trước MỖI lần gửi chạy **`zemory peers`** (bảng repo → địa chỉ → tiêu đề, ★ = phiên được nhắn) rồi gửi tới địa chỉ có ★; repo không có ★ ⇒ KHÔNG gửi, báo user đặt tiêu đề. Trả lời tin đến ⇒ dùng đúng địa chỉ `from` (`uds:…`). Chốt máy: hook cấp user `zemory hook send-guard` chặn gửi tới phiên không có ★ và chỉ ra địa chỉ đúng. *(Đo 07/10: 10 phiên sống, 9 mang tên nhắn tin tự sinh dù user đã đặt tiêu đề; 3 phiên chưa từng dùng.)*

## Git (BẮT BUỘC — luật cứng)
- `02-50` **KHÔNG `git push` khi user CHƯA cho phép.** Git remote là **nguồn BACKUP CUỐI CÙNG** của project — đẩy lên là ra ngoài, không gỡ lại được (gỡ = force-push, càng phá). Xong việc → build + test + **BÁO CÁO rồi DỪNG**; user bảo "push"/"lên git" mới đẩy. **Lệnh push phủ cả ĐỢT đang làm** *(user chốt 2026-10-14)*: user đã bảo push trong đợt này thì các bản vá kế tiếp của CÙNG đợt push luôn, KHÔNG hỏi lại từng lần — hỏi lại giữa một đợt cần push liên tục là bắt user trả lời cùng một câu nhiều lần.
- `02-70` **MỖI LẦN PUSH = MỘT LẦN LÊN VERSION — agent TỰ QUYẾT SỐ theo bảng ba cột dưới đây** *(user chốt 2026-10-14: "số giờ có luật rõ ràng, ko còn mơ hồ nữa nên có thể tự quyết" — thay vế "SỐ do USER chốt" 2026-08-05)*. Push là mốc phát hành: trước khi đẩy, agent ① kiểm file sạch (gate/lint những gì chạy được, `git status` không lọt data/secret) + rà `05_TODO` còn gì phải đóng, ② **chọn số theo bảng** (hỏi *"user báo cái gì"*, không hỏi *"mã đổi nhiều cỡ nào"*), ③ bump `package.json` + commit + push trong cùng một mốc. KHÔNG push với số cũ. Vẫn phải HỎI: force-push · xoá tag/nhánh trên remote.
  - **BA CỘT, ba nghĩa — user chốt 2026-09-24, nguyên văn:** *"số ở cột 3 là fix lỗi của tính năng
    đang có, số ở cột 2 là thêm tính năng bổ sung tính năng, số ở cột 1 là phải đụng tới cấu trúc
    và nó lớn, hoặc thêm 1 tính năng rất lớn"*.

    | cột | khi nào | ví dụ đã xảy ra |
    |---|---|---|
    | **1** (major) | đụng CẤU TRÚC, hoặc một tính năng RẤT LỚN | — |
    | **2** (minor) | THÊM một tính năng | mirror thư mục ⇒ 3.4.6 → **3.5.0** |
    | **3** (patch) | SỬA LỖI của tính năng đang có | vá nhận-thư-mục ⇒ 3.5.0 → **3.5.1** |

  - 🔴 **MỖI LẦN ĐẨY MỘT BẢN VÁ LÀ MỘT SỐ MỚI — TUYỆT ĐỐI KHÔNG ĐỂ TRÙNG** *(user chốt
    2026-09-24: "mỗi bug và đẩy lên git đều phải đẩy lên 1 số ver nhỏ mới đúng, ko dc để trùng")*.
    Hai bản vá đẩy trong cùng một ngày là **hai số**, không phải một. Vế *"KHÔNG push với số cũ"*
    ở trên đã nói điều này từ 2026-08-05, nhưng nó đọc ra như *"đừng lùi số"* nên vẫn lọt.
    **Ca đã trả giá, 2026-09-24:** agent đẩy `8e7ea89` (vá cửa ghi đi được bằng GET) rồi `c32e2a4`
    (vá máy trắng không nhận được gì) — **cả hai dưới 3.5.0**, tức trên GitHub có ba commit khác
    nhau cùng khai một bản. *Vì sao đắt hơn nó trông:* `publishChannelVersion` đóng dấu
    `appVersion()` lên kênh, và `selfupdate` của máy kia so đúng con số đó ⇒ máy đã ở 3.5.0 **không
    thấy có gì mới**, trong khi bản nó đang chạy còn nguyên lỗ. Số version là thứ MÁY KHÁC dùng để
    quyết định có cập nhật hay không, không phải một nhãn cho người đọc.
  - **TRỪ đợt CHỈ ĐỤNG DOCS — đẩy thẳng, KHÔNG bump** *(user chốt 2026-09-04: "khỏi đi, mấy cái fix ko liên quan gì app")*. Vế "mỗi lần push = một lần lên version" viết cho đợt có **BẢN BUILD** đi kèm; docs không sinh artifact nào, `dist/` byte-identical, và semver ở §Luật khi VIẾT chỉ định nghĩa `minor`=tính năng · `patch`=fix deploy — docs không rơi vào ô nào. **Thông lệ đã vậy sẵn** (đo 2026-09-04: sau `715f4eb` có **4** commit docs-only push mà không bump). Và bump cho docs có giá THẬT: `publishChannelVersion` đóng dấu `appVersion()` lên `<Drive>/version.json` ⇒ báo cho máy kia là **có bản mới** trong khi bản build y hệt, làm nhiễu đúng tín hiệu `selfupdate` đang cần. Đụng tới `backend/` · `frontend/` · `package.json` ⇒ quay về luật gốc: lên số theo bảng ba cột.
- `02-51` **Ghi sổ ≠ publish:** user bảo ghi changelog / commit / "xong rồi" **KHÔNG phải** là cho phép push. Đừng suy diễn.
- `02-52` Commit cục bộ (đảo được) thì thoải mái theo phong cách repo; **push mới là cửa cần phép**.
- `02-64` Sửa code chạy trên máy này **không cần push** — build là bản mới sống ngay.
- `02-53` KHÔNG `--force`, KHÔNG rewrite lịch sử đã push, KHÔNG `reset --hard`/`clean` lên việc chưa commit của user nếu chưa hỏi.

## Guardrail lớp ① — luật bất khả đảo phải có CHỐT MÁY (áp chuẩn 2026-08-07, hấp thụ từ OpenRCA plan 08 §4b)
- `02-54` Luật mà vi phạm là **KHÔNG đảo được** (secret vào commit · ghi vào đường cấm · `git push` chưa xin) **không được chỉ có chữ gác** — chữ là tầng quan sát, phát hiện SAU, không ngăn được lúc xảy ra (bằng chứng: secret lên GitHub 04/08 bên repo tham chiếu dù hiến pháp bên đó ĐÃ có chữ cấm).
- `02-55` **`zemory hook guard`** sinh bộ chốt vào `<nhà harness>/hooks/` từ marker (`protected` / `secretNames`): `policy.json` · `guard.cjs` (PreToolUse, chặn TRƯỚC khi chạm đĩa/mạng) · `precommit-guard.cjs` (chặn secret vào staging). Lệnh **tự cắm** guard vào `.claude/settings.json` › PreToolUse (matcher đủ `Write|Edit|MultiEdit|NotebookEdit|Read|Bash|PowerShell`, giữ hook khác) và cắm `pre-commit` khi repo chưa có — guard là CHUẨN, không phải tuỳ chọn (user chốt 2026-10-07; câu cũ "tool không tự cắm" đã thay từ 3.7.5). Pre-commit riêng của repo thì để yên và báo. `zemory gates --all` · chip **Cổng repo** đo mọi repo có THẬT SỰ chạy guard · pre-commit · đủ hàng §Cổng cho hiến pháp. Flag `.allow-*` = user duyệt **MỘT VIỆC**: guard cho qua rồi **đóng dấu** `ZEMORY-USED <vân tay lệnh> <thời điểm>` vào chính file flag — **KHÔNG xoá ngay**, vì hook `PreToolUse` chỉ nói *cho qua* chứ không biết lệnh có thật sự chạy (một tầng khác của host chặn lại là flag mất oan — đo 2026-08-20 lúc push 2.0.0). Trong **90 giây**, ĐÚNG lệnh đó thử lại được; xin việc KHÁC hoặc quá hạn ⇒ **thu hồi**, phải xin lại. *(Câu cũ "dùng một lần tự xoá" sai hành vi thật và đã làm một agent tưởng có lỗ, suýt ghi lỗ ma vào chuẩn dùng chung — sửa 2026-08-26.)* Nhóm secret KHÔNG có flag. `zemory doctor` nhắc khi repo khai `protected` mà chưa sinh chốt.
- `02-71` Ship trong template app/nonapp/adapt (`02_RULES §Guardrail lớp ①` của từng bộ) — và **từ 2026-08-10 ship cả cho cowork**.
  > 🔄 **Đảo vế cũ** *"bộ cowork CỐ Ý không mang — không bảo đảm có CLI lẫn hook PreToolUse"*. Vế đó chỉ đúng MỘT NỬA: đo lại thì `guard.cjs` dùng **thuần `node:fs`+`node:path`**, CLI chỉ cần lúc SINH chứ không cần lúc CHẠY ⇒ ship **bản đã sinh sẵn** là hết phụ thuộc CLI. Chỉ còn phụ thuộc hook của host, mà thiếu hook thì file nằm im **vô hại** và ăn ngay ngày host có — tốt hơn hẳn không ship gì. Lý do đảo (user chốt): bộ cowork **phụ thuộc hoàn toàn vào luật chữ**, mà chữ thì **agent quên được**. Bộ cowork nhận `hooks/guard.cjs` + `policy.json` với `protected_write = data/*/01_raw · docs/agent`.
- `02-61` **VAI CỦA HOOK: LƯỚI ĐỠ, KHÔNG PHẢI NGƯỜI QUYẾT (user chốt 2026-08-11).** Mọi hook guardrail
  tồn tại để **đỡ lúc agent đọc sót hoặc quên luật** — nó KHÔNG phải cơ chế cấm xoá, và **càng
  không phải giấy phép**. **Quyền quyết định xoá luôn thuộc USER: phải hỏi và được đồng ý TRƯỚC,
  bất kể hook có chặn hay không.** Hai hệ quả phải nhớ, vì cả hai đều là cách hiểu sai tự nhiên:
  · **Hook cho qua ≠ được phép.** Lưới chỉ bắt được thứ nó biết trước — đo 2026-08-11: xoá **một
  file thường** cố ý CHO QUA để gate khỏi thành nhiễu, nhưng nó vẫn là thao tác bất khả đảo và
  vẫn phải hỏi user. Lấy "guard không kêu" làm bằng chứng được phép là **đọc ngược ý nghĩa của gate**.
  · **Hook chặn ≠ hết việc.** Bị chặn thì đi HỎI USER, không phải đi tìm đường vòng hay tự tạo flag;
  flag `.allow-*` chỉ được tạo SAU khi user nói rõ trong phiên.
  Cùng doctrine với `§Hành xử` (*"thao tác xoá phải được user xác nhận trước"*): **chữ là tầng
  QUYẾT ĐỊNH, máy là tầng ĐỠ HỤT** — bỏ một tầng thì tầng kia không gánh thay được.
- `02-60` **Đường `protected` trỏ vào thứ CHỈ ĐỌC — ĐỪNG trỏ vào sản phẩm mà chính repo đang tạo ra** (2026-09-04, sinh từ một ca thật). Đúng chỗ cho nó: **đầu vào gốc** (`data/*/01_raw`) · **hiến pháp** · **két bí mật** — thứ harness/agent không có việc gì phải sửa. Trỏ vào **deliverable đang được xây** (báo cáo · model · nội dung) thì mọi lượt sửa thường ngày đều phải xin flag, và **một cổng kêu suốt là cổng sắp bị gỡ** (*gate nhiễu ⇒ gate bị bỏ qua*) — mất nhiều hơn được. Muốn chống sửa nhầm sản phẩm thì dùng **git** (đảo được), không dùng chốt lớp ① (dựng ra để gác thứ BẤT KHẢ ĐẢO). *Ca thật: một repo khai `reports/*.pbix` là `protected`, rồi đổi tên một báo cáo bị chặn VĨNH VIỄN — cộng thêm bug vân tay-theo-đường (đã vá cùng ngày) thì user cấp flag bao nhiêu lần cũng vô ích. Cổng đúng, chỗ đặt sai.*
- `02-72` **`protected_write` nhận GLOB, không chỉ tiền tố** (2026-08-10): `data/*/01_raw` diễn đạt được "đầu vào gốc của MỌI case" — thứ tiền tố không nói nổi vì tên case không biết trước. Thiếu nó thì hoặc liệt kê tay từng case (không ai bảo trì nổi), hoặc chặn cả `data` (chặn luôn chỗ agent ghi suốt ⇒ gate bị bỏ qua).
- `02-58` **Làm việc NGOÀI project cũng có chốt máy** (2026-10-06): guard chặn ① ghi ra đường **TUYỆT ĐỐI** ngoài repo (Write/Edit · `>`/`>>` · `cp`/`mv`/`robocopy` · `mkdir`/`New-Item`/`Set-Content`/`Out-File`/`tee`/`touch` · trình thông dịch có lệnh ghi) — miễn thư mục tạm của OS (scratchpad) · `~/.claude` · `/dev/null` · `/tmp` · `NUL` · các đường khai ở khoá marker `allowedRoots`; tên 8.3 và `/d/…` của Git Bash được quy về một cách viết trước khi so · ② SQL bắt máy chủ ghi file (`BACKUP … TO DISK` · `RESTORE … FROM DISK`/`WITH MOVE` · `CREATE DATABASE … FILENAME`) · ③ SQL đổi cấu hình máy chủ (`sp_configure`/`RECONFIGURE` · linked server · `CREATE/DROP/ALTER DATABASE`), và khi marker khai `allowedSqlServers` thì mọi máy chủ ngoài danh sách (`sqlcmd -S` · `-ServerInstance` · `Server=`/`Data Source=`) · ④ (2026-10-07) lệnh chạy trên **MÁY KHÁC** (`ssh` · `Invoke-Command -ComputerName`/`-Session` · `Enter-PSSession` · `psexec` · `winrs`) mà payload tạo · xoá · đổi thứ gì — thư mục/file · task Scheduler (`Register-`/`Unregister-ScheduledTask` · `schtasks /create`) · dịch vụ (`sc create` · `Set-Service`) · registry · gói cài · SQL ②③ — và `scp`/`rsync` chép LÊN máy khác; lệnh chỉ đọc (`Get-*` · `ls` · `SELECT`) cho qua. ②③ chỉ soi khi lệnh là `sqlcmd`/`osql`/`bcp`/`Invoke-Sqlcmd` hoặc trình thông dịch — `grep`/`git log` chỉ NHẮC chữ thì cho qua. Một cờ chung `.allow-outside`. **Giới hạn:** đường/SQL dựng lúc chạy, nằm trong biến hay trong file script (`sqlcmd -i x.sql` · `python job.py` · script nằm sẵn trên máy kia `ssh <máy> powershell -File x.ps1`), và đường tương đối sau khi `cd` ra ngoài thì guard KHÔNG thấy — luật chữ §Phạm vi project vẫn là tầng quyết định.
- `02-59` **ĐỌC HẾT TRƯỚC KHI GHI — có chốt máy** (2026-10-08): `02-59_read-first.cjs` (guard gọi) chặn mọi thao tác GHI (Write/Edit · lệnh shell có ghi) khi trong phiên này agent CHƯA đọc trọn các file khai ở `policy.json › read_first.required` — mặc định `01_CONSTITUTION` · `02_RULES` · `05_TODO` · `06_CHANGES` (`docs/plan/*` ra khỏi bộ này 2026-10-14 — tra bằng `plan search`, plan/27 §5; file khai mà không tồn tại thì bỏ qua) — bằng công cụ Read tới dòng cuối. Đọc dở hay đọc bằng `grep`/`head`/`Get-Content` KHÔNG tính. Chốt so theo NỘI DUNG từng dòng: dòng phiên đã thấy (qua Read, hoặc tự ghi bằng Edit/Write) không phải đọc lại; file bị sửa ngoài Edit/Write (phiên khác · script của chính agent · `zemory archive`) chỉ đòi đọc ĐÚNG các dòng đã đổi, câu chặn ghi số dòng (user chốt 2026-10-08: đọc lại cả file vì một dòng là phí token). Đòi thêm theo việc: ghi vào `tasks/<case>/` ⇒ `spec.md` · `mail_form.md` của case đó · tạo thư mục mới ⇒ `03_STRUCTURE` · đụng `frontend/` (bộ APP) ⇒ skill `app-design` · chạy script gửi mail ⇒ skill `write-style` (soi nội dung script được chạy, một bước sang script launcher gọi). Nén context KHÔNG bắt đọc lại (user chốt 2026-10-08); đọc GM · dò phiên (`zemory memory …` · `peers` · `graph`) không bao giờ bị chặn. **Không có cờ vượt.** Khai thêm file bắt đọc: khoá marker `readFirst: ["..."]`. Giới hạn: host không ghi transcript ⇒ chốt cho qua (fail-open); phần "đòi theo việc" chỉ phủ chỗ máy đoán tất định được — luật chữ vẫn là tầng quyết định.

## Cổng cho hiến pháp (BẮT BUỘC — luật cứng)

> User chốt 2026-10-07: *"tụi agent quên luật quá nhiều rồi, phải có hook chặn hết hạn chế quên"*. Mỗi điều trong `01_CONSTITUTION`
> phải có MỘT dòng ở bảng dưới: hook/test nào CHẶN nó, hoặc vì sao nó chỉ là chữ. Repo có HP riêng ⇒ agent của repo TỰ dựng hook
> cho điều nào kiểm được bằng máy (guard nhánh mới · test gate · `doctor` · `validate`), rồi ghi tên vào đây. `zemory validate`
> báo điều nào chưa có dòng. Bảng nằm Ở ĐÂY chứ không trong hiến pháp vì chỉ user sửa hiến pháp.
> Loại: **CHẶN** = máy chặn/đỏ gate · **NHẮC** = hook chỉ nhắc đúng lúc (luật cần phán đoán) · **CHỮ** = không có vai máy (nói vì sao).
> **Luật KHÔNG viết hook được ⇒ ĐƯA LÊN ĐẦU, kể cả hiến pháp** (user chốt 2026-10-07: *"các luật nào mà ko viết hook dc thì đưa lên
> đầu để nó ko đọc lướt… kể cả hiến pháp luôn"*). Luật có chốt máy thì có lưới đỡ; luật chỉ có chữ thì chỉ người đọc giữ được, nên nó
> là thứ KHÔNG được đọc lướt. `zemory gates --write-top` sinh khối **ĐỌC KỸ** ở đầu `01_CONSTITUTION` và đầu `02_RULES`, liệt kê
> điều loại CHỮ · điều ghi "CHƯA có" · điều chưa có hàng trong bảng; **số điều KHÔNG đổi** (chỗ khác đang gọi "điều N"). Mục
> `## Hành xử` (luật phán đoán — không hook nào đỡ) đứng ĐẦU `02_RULES`. Sửa bảng xong ⇒ chạy lại lệnh; `zemory validate` và
> `zemory gates` báo khi khối thiếu, cũ, hoặc không nằm ở đầu.

| # | Điều (tóm) | Loại | Cổng / lý do |
|---|---|---|---|
| 1 | *(bãi bỏ 2026-10-14)* | BÃI BỎ | — |
| 2 | Không dán source người khác · license · không commit model weight | CHẶN | `license-gate.test` · `no-data-in-git.test` |
| 3 | Một nguồn cho mỗi lớp · không xoá/sửa tin gốc | CHẶN | `rule-gates ①` (ratchet chỗ DELETE/UPDATE messages/sessions) |
| 4 | 1 capability = 1 slot | NHẮC | registry báo conflict lúc chạy; CHƯA có test ghim — việc mở |
| 5 | Tách tool khỏi dữ liệu | CHẶN | `zemory conform --gate` · `structure-sync.test` |
| 6 | Không proxy model API · không sinh văn bản trong lõi | CHẶN | `rule-gates ⑩` (cấm endpoint model trong backend/src) |
| 7 | Local-only · redact · không commit PII | CHẶN | `no-data-in-git` · `git-history-secrets` · `memory-privacy` · precommit-guard |
| 8 | Recall on-demand, không auto-inject | CHẶN | `realtime-capture.test` (SessionStart chỉ nói khi `source=compact`) |
| 9 | Fail-open ở mọi lớp phụ | NHẮC | rải trong test từng lớp; review khi thêm lớp |
| 10 | Capture cơ học, 0 token | CHẶN | `rule-gates ⑪` (đường ghi nhận không import model/nhúng, không gọi mạng) |
| 11 | Sync additive · DB sống ngoài thư mục cloud | CHẶN | `cloudguard.test` · bộ `sync-*`/`vector-ship` |
| 12 | Đo trung thực, gate trước khi bật mặc định | NHẮC | `surface-truth.test` (một phần); review số khi đổi mặc định |
| 13 | Graph là lớp dẫn xuất | CHẶN | `structure-sync.test`; agent ghi vào lớp dẫn xuất: CHƯA có nhánh guard — việc mở |
| 14 | Bí mật trong cây repo, ngoài git | CHẶN | nhánh secret của guard · precommit · `doctor` › home (`~/.zemory` chỉ `location.json`) |
| 15 | Chất lượng bộ nhớ là tối cao | NHẮC | đo recall trước khi cắt/nâng một lớp — CHƯA có hook nhắc — việc mở |
| 16 | Đồng bộ chở trọn RAG · MỘT kho, mọi máy nối vào | CHẶN | `vector-ship`/`vecship-chunks` · `delta-own-host` · `rule-gates ⑫` (ratchet `channelPen(` → 0 sau khi gộp kênh) |
| 17 | Một chức năng = một lệnh | NHẮC | CHƯA có cổng (manifest verb CLI ↔ endpoint ↔ MCP) — việc mở |
