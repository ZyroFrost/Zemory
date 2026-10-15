---
name: audit
version: 5
description: Run a full review of the project across every dimension, verifying each finding against real files before reporting it. Use only when explicitly asked for a thorough audit, or before a major milestone such as a release or a large batch of changes. This is not a quick check. Vietnamese triggers - "audit toàn diện", "soi hết", "kiểm tra toàn bộ", "rà lại hết", "review tổng thể".
---

# audit — soi toàn diện

> Kích hoạt: được yêu cầu **"audit toàn diện" / "soi hết"** · trước mốc lớn (release · commit gộp) ·
> sau một đợt đổi nhiều file. Đây KHÔNG phải kiểm vặt: cụm từ đó có nghĩa là chạy **đủ mọi mặt** của
> profile — **12 mặt** ở APP, **11 mặt** ở NON-APP — **không cắt bớt cho nhanh**.
>
> **Vì sao bản NON-APP khác bản APP:** dự án non-app không phát triển app — không endpoint, không
> FE↔BE, không bộ test code. Bê nguyên bản app sang là bắt một dự án BI chạy `npm run check` và soi
> `FE ↔ BE`, tức **cổng không bao giờ nổ được** (luật 4: còn tệ hơn không có). Nhưng **bốn mặt SỐNG
> SÓT giữ trọn** — non-app vẫn có connection string, vẫn có pipeline theo lịch, vẫn giao văn bản cho
> người đọc.

**Luật 1 — gate xanh KHÔNG phải bằng chứng.** Nó chỉ chứng minh *những gì phép kiểm soi thì đúng*,
không chứng minh nó đang soi thứ đang chạy. Ca APP: cả bộ test UI neo vào bản đã bị thay, gate 100%
xanh trong khi bề mặt đang chạy có **0 test**. Ca kinh điển ở non-app: script chạy **exit 0** mà file
ra **rỗng** — cổng xanh, sản phẩm hỏng. Nên luôn hỏi (ở APP là mặt ④): *phép kiểm / test này đang đọc
FILE NÀO?*

**Luật 2 — VERIFY từng finding rồi mới ghi.** Đối chiếu file THẬT trước khi gọi là "lỗi". Đã có đợt
loại 5 nghi vấn vì đo lại thì sai, và 2 đợt checker báo oan (48 rồi 13 mục). Một finding sai làm hỏng
lòng tin vào cả bảng.

**Luật 3 — mọi con số phải ĐO.** Không suy luận, không nhớ lại. Không đo được thì ghi thẳng
**"chưa đo"**.

**Luật 4 — hỏi ngược mỗi check: *"cái gì làm nó ĐỎ?"*** Trả lời không được ⇒ check đó không thể nổ,
và một check không nổ được còn tệ hơn không có (nó phát ra lời bảo đảm trong khi chưa hề nhìn).

**Luật 5 — ĐO HAI ĐƯỜNG, khác cơ chế.** Một phép đo chưa kiểm chéo thì chưa phải sự thật
(`Rule_Core_11_VerifyClaims`). Bốn dạng đã trả giá: công cụ **hỏng lặng** trả rỗng (cờ sai ⇒ âm tính giả ⇒
tưởng "sạch") · **báo oan** do so lỏng (không phân biệt hoa/thường) · **tiêu chí nghe hợp lý mà sai
bản chất** (khoá phụ trỏ hụt ⇒ tưởng mồ côi, suýt xoá dữ liệu đang sống) · **sổ nói khác code**.
Kiểm chéo = đổi công cụ · đổi hướng đếm · hoặc gọi bề mặt thật (kho/DB ↔ API).

**Luật 6 — ĐỘT BIẾN HOÁ (PHÁ THỬ) trước khi tin một phép kiểm.** Đừng dừng ở câu trả lời trên giấy
của luật 4: **phá đúng thứ nó canh** (sửa code mà test canh · đổi một số trong nguồn · xoá một dòng
bắt buộc · đổi tên một cột) rồi chạy lại — nó phải ĐỎ. Sống sót ⇒ phép kiểm đó đang canh chỗ khác,
hoặc một bản sao logic ở nơi khác đang gánh thay. Nhớ hoàn nguyên thứ vừa phá. Đo được: **2/4
đột biến SỐNG SÓT** — một test chưa bao giờ chạy tới nhánh nguy hiểm, một test bị **bản sao logic ở
nơi khác gánh thay**. Cả hai đều xanh suốt và không soi gì cả.

**Luật 7 — MỌI CỔNG PHẢI ĐO BẰNG CẢ CA ÂM.** Chỉ chạy ca *phải chặn* thì không biết cổng có **chặn
NHẦM** không, mà chặn nhầm là đường ngắn nhất tới *"gate nhiễu ⇒ gate bị bỏ qua"* — tự tay phá thứ
mình đang xây. Đo được trên guardrail: bảng 28 ca có giá trị **chính nhờ 6 ca *phải cho qua***;
thiếu chúng thì siết tay đã hỏng cổng mà vẫn tưởng đang làm tốt.

## APP — 12 mặt, chạy đủ
*(6 mặt đầu là bản gốc, soi *"phần mềm có ĐÚNG không"*. **Mặt 7–10** thêm sau khi soi ngược **mọi sự
cố THẬT** của một repo rồi hỏi *"mặt nào lẽ ra bắt được"* — phát hiện: **mọi sự cố nặng nhất đều rơi
vào vùng 6 mặt cũ không nhìn tới**, vì chúng thuộc *"phần mềm có SỐNG SÓT không"*: mất mát · lộ lọt ·
chết lặng · không mang đi được. **Mặt 11** thêm vì chín mặt trước đều soi MÁY, không mặt nào soi thứ
**NGƯỜI ĐỌC** nhận. **Mặt 12** thêm vì mặt 11 soi chữ người dùng đọc, không mặt nào soi ngôn ngữ của
chính MÃ — tên file · định danh · chú thích.)*
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
   người dùng KHÔNG chủ động bật) · máy đích lúc deploy · quyền file khoá. Không mặt nào cũ nhìn tới
   đây, trong khi đây là chỗ mất mát **KHÔNG đảo được** — sai một lần là xong.
8. **Phụ thuộc & license** — dependency/model mới có license tương thích không (bất biến kiến trúc
   bắt rà, mà chưa cổng nào kiểm) · lockfile khớp · dependency chết · **dựng lại từ CLONE SẠCH có
   chạy không** (thứ chỉ chạy được trên máy đang có sẵn đồ thì chưa gọi là dựng được). Quét **CẢ
   CÂY**, không chỉ dependency trực tiếp — license xấu ở tầng sâu vẫn đi kèm sản phẩm. Bẫy đo: `OR`
   và `AND` trong biểu thức license **không cùng nghĩa** (`OR` = một vế hợp lệ là đủ · `AND` = phải
   hợp lệ MỌI vế), tách bằng cùng một mẫu là bỏ sót.
9. **Toàn vẹn & đồng thời** — write-gate / khoá ghi còn **TỪ CHỐI THẬT** không (khoá đúng mà người gọi
   bỏ qua lời từ chối thì vẫn thủng) · có kẻ ghi thứ hai nào đang mở kho không · giao dịch có nguyên
   tử · **THỬ PHỤC HỒI THẬT** một bản sao lưu ra chỗ tạm rồi ĐẾM — *"dữ liệu lành"* KHÁC *"dựng lại
   được"*, và kênh mang đi có thể lặng lẽ vứt mất lớp đắt nhất mà không cổng nào đỏ.
   Kèm: chạy skill `sync-path/`.
10. **Vận hành nền & guardrail** — tiến trình nền còn sống không · có nhịp tim/log đủ để truy khi nó
   chết cứng không · bề mặt có **CHẾT THEO nền** không (vỏ rỗng là kiểu hỏng tệ nhất: nó không báo
   lỗi, nó **NÓI DỐI**, và người dùng không có cách phân biệt với đang-chạy-thật) · **chạy ma trận
   guardrail** — cổng chặn có thật sự chặn không, thứ chỉ đo được bằng cách CHẠY, không đọc code ra
   (ca phải chặn **+ ca phải cho qua**, luật 7).
11. **CHỮ & BỀ MẶT NGƯỜI ĐỌC** — **NORM ở `Rule_Keys_31_TextCorrect`** (*chữ người dùng đọc phải đầy đủ và
   đúng*, 4 ràng buộc, ship cho MỌI bộ harness). Ở đây chỉ có **cách ĐO**. Năm phép, mỗi phép phải in
   *đã quét bao nhiêu* để không xanh giả:
   · **thiếu dấu tiếng Việt** trong docs · **chính tả** (từ lặp liền · mojibake);
   · **caption/nhãn** — phần tử tương tác có nhãn lập trình đọc được, ảnh có `alt`;
   · **song ngữ hai đầu** — chuỗi trong code (`.js`) *và* chữ nằm thẳng trong HTML/markup (text node +
     `title`/`placeholder`/hint); khoá đủ hai dict; khoá chết thì gỡ;
   · **UI ↔ code** — cạnh seam `api` của graph đối chiếu route FE gọi với route BE thật (dùng graph,
     không dùng mắt); `zemory graph path <FE> <BE>` để lần đường khi nghi.

   ⚠ **BỐN TRONG NĂM PHÉP NÀY BÁO OAN NẾU LÀM NGÂY THƠ — lượt đo đầu sai gần hết:**
   · *thiếu dấu*: danh sách phải CHỈ gồm từ mà bản không dấu **không phải từ hợp lệ** (`khong`
     `duoc` `cua`…). Nhét `minh` · `nhanh` · `song` vào là báo oan — chúng vốn không có dấu
     («chứng minh»). Bản đầu: **63 hit, 0 thật**.
     Miễn luôn `skills/write-docx/reference/*` — cố ý viết ASCII không dấu (code Python trong khối
     lệnh; 18 hit đo được ở đó KHÔNG phải lỗi).
   · *từ lặp*: `\b` của JS là **ASCII**, chữ Việt bị coi là ký tự không-phải-từ ⇒ «chứng ngại» cắt
     thành `ng`+`ng` và báo trùng (128 hit oan). Phải dùng lớp `\p{L}` + **trừ láy đôi** («song
     song» · «luôn luôn» · «bắt đầu đầu trang») và nhớ rằng bỏ code/đường dẫn có thể **dán hai
     chữ giống nhau vào cạnh nhau** («scan known/deep scan»). Sau khi vá: 15 hit, kiểm tay
     **vẫn 0 thật** ⇒ phép này CHƯA đủ chính xác để làm cổng, chỉ dùng để soi tay.
   · *mojibake* (UTF-8 bị đọc thành Latin-1): `Â.`/`Ã.` trúng cả chữ Việt hợp lệ (ĐÂY · NGÃ) — 192
     hit oan. Mẫu đúng: `[ÃÂ][-¿]` · `â€` · `ï»¿` · `U+FFFD`. Và phải **miễn chuỗi nằm trong
     backtick**: file DẠY về mojibake (chính `Rule_Keys_31_TextCorrect`) nêu ví dụ mẫu ⇒ bộ dò ngây thơ báo
     oan trên đúng tài liệu định nghĩa ra nó (đo được: 6/245 hit, 0 thật).
   · *caption*: nhãn thường nằm ở **thẻ CON** (`<a><span>…</span></a>`) hoặc ở `<label>` bọc ngoài
     ⇒ chỉ đọc text ngay sau thẻ mở là báo oan 20 ca.
   · *song ngữ*: chữ Việt trong HTML là **ĐÚNG** nếu phần tử có móc i18n (`data-i18n`,
     `-title`, `-ph`, `-hint`) — bản dịch sẽ đè lúc chạy. Chỉ chỗ **thiếu móc** mới là lỗi.
     Và khoá i18n truyền qua BIẾN (`doc:'f.doc.x'` rồi `t(item.doc)`) KHÔNG phải khoá chết:
     phải quét mọi literal, không chỉ `t('…')` — bản đầu báo oan **46 khoá chết**, thật là **0**.
   · *endpoint chết*: route ghép ĐỘNG (`post('/set-'+name)`) làm mọi `/set-*` trông như chết;
     và endpoint do **CLI gọi qua HTTP** không có người gọi trong FE. Kể cả ba nguồn (FE tĩnh ·
     tiền tố động · test/CLI) rồi mới kết luận.

12. **NGÔN NGỮ CỦA MÃ** — **NORM ở `Rule_Gate_26_ViDiacritics`–`Rule_Keys_31_TextCorrect`** (luật thiết kế chung mọi app). Bốn phép,
   **cách đo + bẫy báo oan + số nền ở [`reference/lang.md`](reference/lang.md)**; máy chạy:
   `node .claude/skills/audit/scripts/lang-scan.mjs . [--all]` — nó in *đã quét bao nhiêu* để một lượt
   sạch không bị đọc thành "chưa soi gì".
   · **Ⓐ tên file · thư mục** chỉ ASCII tiếng Anh · **Ⓑ định danh** (biến · hằng · hàm · lớp · kiểu ·
     khoá config) chỉ ASCII tiếng Anh — trong mã, thứ DUY NHẤT được tiếng Việt là **chú thích**;
   · **Ⓒ tuyệt đối KHÔNG có tiếng Việt mất dấu ở BẤT CỨ ĐÂU** — plan · docs · chú thích · tên test ·
     chuỗi sinh máy: hoặc tiếng Anh, hoặc tiếng Việt CÓ DẤU, không có lựa chọn thứ ba;
   · **Ⓓ song ngữ UI** — cân dict vi↔en (thiếu một bên thì hàm dịch lặng lẽ rơi về ngôn ngữ gốc,
     KHÔNG lỗi nào nổ) · khoá dùng mà chưa khai · khoá chết · chữ Việt trong markup thiếu móc i18n.
     (Vế *người đọc* của song ngữ vẫn ở mặt ⑪; ở đây là vế **đếm khoá**.)
   ⚠ **Ba bẫy, đều đã đo:** ① không bóc chú thích/chuỗi trước khi quét ⇒ vừa báo oan vừa
   **bỏ sót** (lượt đầu: 4 hit oan, sót 9 định danh thật) · ② đồng âm Anh–Việt (`do · so · can ·
   ten · van`) bắt oan cả câu tiếng Anh thuần · ③ nhãn nằm ở thẻ CON của phần tử ĐÃ có móc i18n
   (2/2 hit oan).

## NON-APP — 11 mặt, chạy đủ
*(5 mặt đầu soi *"việc có ĐÚNG không"*. **Mặt 6–9** thêm sau khi soi ngược **mọi sự cố THẬT** của một
repo rồi hỏi *"mặt nào lẽ ra bắt được"* — phát hiện: **mọi sự cố nặng nhất đều rơi vào vùng các mặt
cũ không nhìn tới**, vì chúng thuộc loại khác hẳn: *"việc có SỐNG SÓT không"* — mất mát · lộ lọt ·
chết lặng · không mang đi được. **Mặt 10** thêm vì chín mặt trước đều soi MÁY, không mặt nào soi thứ
**NGƯỜI ĐỌC** nhận — mà ở dự án non-app thì *sản phẩm giao đi CHÍNH LÀ chữ người đọc*, nên nó là mặt
nặng nhất, không phải mặt phụ.)*

> Bộ nào không có CLI `zemory`: lệnh `zemory conform` / `zemory validate` ở mặt 1–2 thay bằng script kiểm
> chuẩn của bộ (`python .claude/skills/structure/scripts/check_structure.py .`, skill `conform`), kèm
> đo tay độ dài `05_TODO`/`06_CHANGES` so ngưỡng 300 dòng và entry changelog nào vượt trần 30 dòng.

1. **Cổng của dự án** — chạy đủ cổng repo có: `zemory conform` · `zemory validate` · script kiểm cấu
   trúc · **cổng readiness của launcher** (`<tên> auto` phải trả mã thoát ≠ 0 khi thiếu điều kiện).
   Repo **không có cổng nào chạy được** thì đó CHÍNH LÀ finding đầu tiên, không phải lý do bỏ mặt này.
2. **Chuẩn & docs** — `zemory conform` · `zemory validate` · độ dài docs vs ngưỡng (`zemory archive`
   nếu quá) · TODO còn mục nào đã xong mà chưa đóng không · docs lặp nội dung của nhau.
3. **Cấu trúc & NGUỒN TRÙNG** — cùng một sự thật nằm ở **≥2 nơi** ⇒ chắc chắn sẽ lệch. Soi:
   file/thư mục ngoài chuẩn · script/query không ai gọi · cùng một truy vấn chép ở hai chỗ · **định
   nghĩa metric nằm ở ≥2 nơi** (từ điển dữ liệu trong `03_STRUCTURE` là nhà DUY NHẤT — có
   `docs/dictionary.md` lạc, metric định nghĩa ở từ điển nhưng tính khác trong `measures/`, hay công
   thức chép vào nhiều measure không) · số pipeline có **mirror đúng 3 nơi** (`tasks/NN_` ↔
   `pipelines/NN_` ↔ `data/NN_`) · ghi vào file nguồn có nguyên tử không.
4. **Dữ liệu & 3 chặng** — có ai GHI vào `01_raw/` không (nó **CHỈ ĐỌC**) · file trung gian có mang
   tiền tố số stage không · deliverable cuối có nằm `03_output/` với tên nghiệp vụ không · `data/adhoc/`
   có bị dùng cho việc **định kỳ** không (nó chỉ dành cho file lẻ throwaway) · kích thước · bản rác.
5. **Sản phẩm giao đi — MỞ RA NHÌN** — mở đúng file deliverable (`.xlsx`/`.pbix`/`.docx`) **bằng
   mắt**: số có đổ vào đúng ô, sheet/trang không rỗng, kỳ báo cáo đúng, công thức không `#REF!`, vài
   số mốc khớp nguồn, ngày tháng đúng, bản đang ở đích có đúng bản mới nhất không. Suy luận từ script
   KHÔNG thay được việc mở file: script exit 0 mà file ra rỗng là ca thật; đã có lần mọi phép kiểm
   xanh mà báo cáo vẫn hiển thị sai.
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
   đọc, không phải phụ kiện của một app). NORM ở `Rule_Keys_31_TextCorrect`. Đo: **thiếu dấu** · **chính
   tả** (từ lặp liền · mojibake do UTF-8 bị đọc thành Latin-1) · **nhãn trong sản phẩm** (tiêu đề
   cột · chú thích hình · biểu đồ · ảnh có tiêu đề và **ĐƠN VỊ** rõ; số có đơn vị + kỳ/mốc thời gian
   kèm) · **thuật ngữ NHẤT QUÁN** — một thuật ngữ một tên xuyên suốt (cùng một metric không mang hai
   tên khác nhau giữa các report — đối chiếu từ điển dữ liệu trong `03_STRUCTURE`, đó là nhà duy nhất
   của định nghĩa) · **chữ trong file giao đi** (tên sheet · tiêu đề trang · chú thích) — chỗ này
   người ngoài đọc, nên một lỗi chữ ở đây đắt hơn mọi lỗi trong repo.
   ⚠ **Các phép này BÁO OAN nếu làm ngây thơ:** danh sách từ-không-dấu chỉ được gồm từ mà bản không
   dấu KHÔNG hợp lệ (`khong` `duoc` `cua`…; `minh`/`nhanh`/`song` vốn không dấu) · dò từ lặp phải dùng
   `\p{L}` (`\b` của JS là ASCII) và **trừ láy đôi** ("song song" · "luôn luôn") · mẫu mojibake
   `Â.`/`Ã.` trúng cả chữ Việt hợp lệ (ĐÂY · NGÃ) — mẫu đúng là `[ÃÂ][-¿]` · `â€` · `ï»¿` · `U+FFFD`,
   **và phải miễn chuỗi nằm trong backtick**, vì chính tài liệu nêu mẫu mojibake sẽ tự trúng (đo
   được: 6/245 file trúng, kiểm tay **0 thật**) · và **tên do người ta đặt thì KHÔNG phải lỗi**: tên
   cột/sheet của nguồn, tên file vendor, thuật ngữ nghiệp vụ viết hoa lạ — soi chữ trong phần MÌNH
   viết, đừng soi chữ mình chỉ đi ngang qua.

11. **NGÔN NGỮ CỦA MÃ** — NORM ở `Rule_Gate_26_ViDiacritics`–`Rule_Keys_31_TextCorrect`. Máy chạy `node
   .claude/skills/audit/scripts/lang-scan.mjs .`; nó in *đã quét bao nhiêu* để lượt sạch không bị đọc
   thành "chưa soi gì". Cách đo + bẫy chi tiết: [`reference/lang.md`](reference/lang.md).
   · **Ⓐ tên file · thư mục** chỉ ASCII tiếng Anh · **Ⓑ định danh trong script/pipeline** (biến · hàm ·
     cột trung gian mình tự đặt · khoá config) chỉ ASCII tiếng Anh — thứ DUY NHẤT được tiếng Việt
     trong mã là **chú thích**. *Tên do NGUỒN đặt (cột Excel · trường API) giữ nguyên từng ký tự: đó
     là DỮ LIỆU, đổi là loader không tìm thấy.*
   · **Ⓒ tuyệt đối KHÔNG có tiếng Việt mất dấu ở BẤT CỨ ĐÂU** — plan · docs · chú thích · tên test ·
     chuỗi sinh máy: hoặc tiếng Anh, hoặc tiếng Việt CÓ DẤU, không có lựa chọn thứ ba.
   ⚠ **Hai bẫy đã trả giá:** ① không bóc chú thích/chuỗi trước khi quét ⇒ vừa báo oan vừa **bỏ sót**
   (một lượt đo: 4 hit oan mà vẫn sót 9 định danh thật) · ② đồng âm Anh–Việt (`do · so · can · ten ·
   van`) bắt oan cả câu tiếng Anh thuần.

## Đầu ra

Bảng finding, mỗi mục ghi *đo được gì · ảnh hưởng · sửa ở đâu*, phân `blocking` (phải sửa) /
`advisory` (xem xét). Việc đã sửa → `06_CHANGES`. **Phát hiện MỚI và nghi vấn đã loại (kèm lý do loại
— để lần sau khỏi đào lại): BÁO trong phiên, KHÔNG tự ghi thành mục `05_TODO`** — chỉ mục nào được
duyệt mới ghi (`Rule_Gate_38_TodoDoor`, cửa vào). Một lượt đủ mặt đẻ ra hàng chục advisory; ghi
hết là nhồi sổ, mà sổ thì nạp MỌI phiên.

## Cấm

- Cắt bớt mặt nào cho nhanh.
- Ghi finding chưa verify.
- Báo "sạch" khi mới chạy mỗi gate / mỗi script kiểm chuẩn.
