# mặt ⑫ — NGÔN NGỮ CỦA MÃ: cách ĐO

> **NORM ở `02_RULES §Ngôn ngữ`** (luật thiết kế chung mọi app, user chốt 2026-09-12). Ở đây chỉ có
> **cách đo** và **bẫy báo oan**. Luật nói PHẢI ĐÚNG GÌ; file này nói ĐO THẾ NÀO cho khỏi báo oan.
> Máy chạy: `node .claude/skills/audit/scripts/lang-scan.mjs . [--all]` — phép Ⓐ Ⓑ Ⓒ.
> Phép Ⓓ (song ngữ) đo riêng vì phải bám đúng chỗ để dict của repo.

## Bốn phép

**Ⓐ TÊN FILE · THƯ MỤC — chỉ ASCII tiếng Anh.** Quét mọi thành phần đường dẫn của `git ls-files`:
bắt ký tự ngoài ASCII, và bắt âm tiết Việt mất dấu (`bao_cao.ts` · `du-lieu/`). Tên đã theo chuẩn
đặt tên của `03_STRUCTURE` thì phép này im.

**Ⓑ ĐỊNH DANH — chỉ ASCII tiếng Anh.** Biến · hằng · hàm · lớp · kiểu · khoá cấu hình. **Phải bóc
chú thích và chuỗi TRƯỚC khi quét**, xem bẫy ①. Bắt hai dạng: ký tự ngoài ASCII (`chặnNhầm`), và
tiếng Việt mất dấu ghép lại (`THAN_TOI_DA` · `soLuongBanGhi`).

**Ⓒ TIẾNG VIỆT KHÔNG DẤU — cấm ở MỌI file.** Chú thích code · docstring · tên test · plan · docs ·
chuỗi sinh máy · JSON cấu hình. Một dòng chỉ hợp lệ khi **hoặc** là tiếng Anh, **hoặc** là tiếng
Việt CÓ DẤU. Dòng đã có dấu ⇒ bỏ qua ngay, không xét tiếp.

**Ⓓ SONG NGỮ UI — đủ HAI ĐẦU.** Bốn số phải đo, không số nào thay được số nào:
1. **Cân dict**: tập khoá `vi` và `en` phải BẰNG NHAU. Lệch = người dùng đổi sang EN vẫn thấy
   tiếng Việt và **không lỗi nào nổ** — hàm `t()` lặng lẽ rơi về `vi`.
2. **Khoá dùng mà chưa khai**: mọi `data-i18n` · `data-i18n-title` · `-ph` · `-hint` trong markup,
   cộng mọi `t('…')` trong script, phải có trong dict. Thiếu ⇒ UI hiện trần cái KHOÁ.
3. **Khoá chết**: khai trong dict mà không ai gọi ⇒ gỡ. Phải kể cả khoá **truyền qua biến**
   (`{doc:'f.doc.x'}` rồi `t(item.doc)`), nếu không sẽ báo oan hàng loạt.
4. **Chữ Việt nằm thẳng trong markup KHÔNG có móc i18n** ⇒ lỗi thật (đổi ngôn ngữ không đè được).

## Bẫy báo oan — đo 2026-09-12, lượt đầu sai gần hết

· **① Không bóc chú thích/chuỗi thì phép Ⓑ vừa BÁO OAN vừa BỎ SÓT.** Bản đầu báo 4 hit — cả 4 là
  chữ `const` nằm trong chú thích tiếng Việt (`const —`) — và **bỏ sót 9 định danh thật**
  (`chặnNhầm` · `tênFile` · `phảiChặn` · `lọt` ở `backend/test/guard-tool-matrix.test.mjs`). Bóc
  chú thích + chuỗi xong mới đảo được cả hai chiều. *Đây đúng kiểu "thước sai, không phải N thiết
  kế sai" — `02_RULES §BA LUẬT ĐO` ②.*
· **② Đồng âm Anh–Việt làm dòng tiếng Anh thuần bị bắt.** `do · so · can · ten · ban · van · no ·
  to · in · on` vừa là từ tiếng Anh vừa là âm tiết Việt mất dấu. Không trừ chúng ra thì một câu
  tiếng Anh chuẩn cũng đủ 3 "âm tiết Việt". Đo được: 627 → **616** hit sau khi trừ.
· **③ Một âm tiết yếu KHÔNG phải bằng chứng.** Nhiều âm tiết Việt vốn không mang dấu (`minh` ·
  `nhanh` · `song` · `cho`). Ngưỡng đang dùng: **1 âm tiết hạng A** (không có cách đọc nào không
  dấu) **hoặc 4 âm tiết hạng B** trong cùng một dòng.
· **④ Nhãn nằm ở thẻ CON của phần tử CÓ móc.** Phép Ⓓ.4 báo 2 hit, **cả 2 oan**: `<b>Quét sâu</b>`
  nằm trong `<div data-i18n="mem.scanHint">`, mà `applyI18n` thay nguyên `innerHTML` của thẻ cha.
  Phải xét **tổ tiên** trước khi kết luận thiếu móc. (Cùng họ với bẫy *caption* ở mặt ⑪.)
· **⑤ Regex theo DÒNG đếm hụt dict.** Dict của repo này nhồi hàng chục khoá mỗi dòng; bắt
  `^\s*'key':` chỉ lấy khoá ĐẦU mỗi dòng ⇒ đếm ra 83 khoá thay vì **638**, rồi đẻ ra 169 "khoá
  thiếu" ma. Quét theo **toàn khối**, không theo dòng.
· **⑥ Bộ dò bỏ sót tham số và biến destructure.** `const [nhãn, command] of …` không lọt lưới
  `const\s+<tên>`. Biết trước giới hạn này còn hơn tin một số 0 giả — soi tay phần tên tham số khi
  file đang bị đụng tới.
· **⑦ Ⓒ chỉ soi CHÚ THÍCH trong file mã, không soi chuỗi.** Cố ý (chuỗi thường là dữ liệu), nhưng nó
  là một lỗ có thật: chuỗi sinh ra `policy.json` viết bằng Việt mất dấu **không bị bắt ở nguồn** —
  chỉ lộ ra ở file JSON sinh ra. Đụng file sinh mã thì soi tay phần chuỗi.
· **⑧ Ngưỡng bỏ sót dòng thưa từ khoá.** Hai dòng chú thích ngay cạnh nhau có thể một dòng bị bắt,
  dòng kia lọt (chỉ 2–3 từ khoá). Khi đã quyết dọn một file thì **đọc cả khối**, đừng sửa đúng những
  dòng máy chỉ.
· **⑨ Dòng XUỐNG HÀNG của một đoạn có dấu bị bắt oan.** `hai kho.` là đuôi của câu tiếng Việt có dấu
  ở dòng trên. Xét cả đoạn trước khi phán một dòng cụt.
· **⑩ Base64 đánh vần ra âm tiết Việt.** Icon nhúng trong `tray.ts` ăn 5 "hit" — đã miễn trong máy dò
  bằng luật *chuỗi ≥60 ký tự base64 thì bỏ qua*.
· **⑪ MỘT âm tiết yếu LẶP nhiều lần không phải bằng chứng.** Một hàng bảng viết `cho qua` bốn lần
  vượt ngưỡng "4 âm tiết hạng B" chỉ bằng **một** từ. Máy dò nay đếm **âm tiết KHÁC NHAU**.
· **⑫ Máy dò chỉ soi file `git ls-files` — file CHƯA add thì vô hình.** Đúng ý (không soi rác tạm),
  nhưng nhớ: vừa tạo file mới mà chưa `git add` thì một lượt quét sạch **không nói gì về nó**.

## Archive — sửa được, nhưng chỉ được THÊM DẤU

`docs/agent/archive/` **có bị quét**. `02_RULES §Changelog` cấm sửa/xoá entry cũ, nhưng **bỏ dấu vào
lại không thêm cũng không bớt thông tin** — cùng một câu, chỉ là đọc được (user chốt 2026-09-12).
Đổi *nội dung* một entry thì vẫn cấm. Đợt 2026-09-12 đã phục hồi **39 dòng** (36 ở `06_CHANGES` · 3 ở
`05_TODO`), số dòng không đổi, kèm dựng lại dấu phân cách đã hỏng vì mojibake cũ (`???`→`—` ·
`??`→`·` hoặc `§` tuỳ ngữ cảnh).

## Lúc SỬA hàng loạt — ba cái bẫy đã trả giá trong đợt dọn 2026-09-12

· **`$&` trong chuỗi THAY THẾ của `String.replace` NỞ ra thành đoạn vừa khớp.** Một bản dịch chứa
  `$&` đã tự nhân đôi tiêu đề và làm hỏng cú pháp file. Dùng **hàm thay thế** (`replace(from, () => to)`).
  *Trớ trêu: file bị hỏng đúng là file test dạy rằng `$&` không được nở.*
· **Escape rơi một tầng khi đi qua JSON/heredoc.** `LocalCache\\Roaming` trong JSON về còn một dấu
  `\` ⇒ eslint `no-useless-escape`. Viết bản dịch ra **TSV bằng Write tool**, đừng nhét qua shell.
· **Đổi tên test an toàn vì `run-tests.mjs` đọc tên ĐỘNG từ file** — nhưng nó đòi tên **duy nhất
  trong một file** và dạng `test("…")`; lệch là nó rơi về chạy cả file trong một tiến trình.

## 2026-09-13 — MÁY DÒ TỪNG NÓI DỐI. Bốn lỗ, đều đã vá, đều có ca âm

Bảng "sau đợt dọn = 0" ngay dưới đây **đã sai** lúc nó được ghi. Không phải vì repo sạch, mà vì
phép đo hỏng. Đây là bài học đắt nhất của mặt ⑫: **một gate xanh chỉ đáng tin bằng ca âm của nó.**

| Lỗ | Triệu chứng | Vá |
|---|---|---|
| ① Mặt **định danh** mượn bộ `EN` của văn xuôi | `EN` sinh ra để chặn báo oan trên câu tiếng Anh, nên nó miễn `danh` · `sach` · `tong` · `ngay` · `gio` · `dong` · `loi` — và miễn luôn cho tên biến. `danhDauTrich` · `tongCa` · `cauHoi` · `dapAn` · gần trọn `popover.js` đều lọt. Báo **37**, sự thật **~350**. | Mặt định danh (và tên file) có bộ riêng `A_ID` / `EN_ID`. |
| ② Cả **dòng** được miễn vì MỘT chữ có dấu | `if (DIACRITIC.test(text)) return`. Nên `"MOT BEN chiu trach nhiem khoang cach — khoi ĐI SAU"` vô hình suốt một đợt dọn, chỉ vì chữ `ĐI`. | Bỏ riêng các TỪ đã có dấu rồi chấm phần còn lại. Trên dòng trộn **chỉ tier A được tính** — tiếng Việt đúng chính tả vẫn chứa `cho` · `khi` · `chi` · `ra` không dấu, nên đếm tier B ở đó là vô nghĩa. |
| ③ Chỉ đọc dòng **MỞ** khối | Thân docstring nhiều dòng và thân `/* */` không được đọc. `build_access_xlsx.py:7` nằm bốn dòng bên trong docstring, vô hình. Riêng DuAnA lộ thêm ~40 dòng. | Mang trạng thái `inBlock` xuống từng dòng. |
| ④ Tier A có bốn từ **không thuộc tier A** | `giai` · `toan` · `hoan` · `khoan` ĐỀU là âm tiết hợp lệ không dấu (`giai đoạn` · `khoan thai` · `hoan nghênh`). Vô hại khi còn lỗ ②; lỗ ② vừa vá là chúng báo oan ngay trên ca âm. | Hạ xuống tier B. |

**Thứ tự các bước là một phần của phép đo.** Bản vá ② đầu tiên lọc từ-có-dấu **trước** khi bóc dữ
liệu ⇒ chữ `Mì` mang theo backtick mở của `` `[Mì tr?n tuong den Super Cay]` `` bay mất, ruột lộ ra
và bị chấm là văn xuôi cẩu thả. **Bóc dữ liệu trước, lọc dấu sau.**

**Ca âm bắt buộc:** chạy mặt định danh trên một cây mã chắc chắn tiếng Anh (`backend/src`). Lần đầu
nó ra 22 hit, **21 trong đó là chữ `doc`** — tôi thêm `doc` (đọc) vào bộ từ mà quên `doc` là
"document" đầy rẫy trong code. Gỡ `doc` ⇒ còn đúng 1 hit, và đó là vi phạm THẬT (`coNoiDung`).
Không có ca âm này thì bộ từ mới đã đi ra 20 repo kèm 21 báo oan mỗi lượt quét.

## Số nền 17 REPO — đo 2026-09-13, SAU khi vá máy dò (so lần sau vào đây)

Đây là con số đáng tin, vì nó đo bằng máy dò đã qua bốn bản vá ở mục trên. Bảng 2026-09-12 phía
dưới nói "0" ở mọi ô — nó sai, và sai theo hướng dễ chịu.

| Phép | Hit khi máy dò còn hỏng | Sự thật khi máy dò đã vá | Còn lại sau đợt dọn |
|---|---|---|---|
| Ⓐ tên file | 0 | **22** | **0** |
| Ⓑ định danh | 0 | **302** (OpenRCA 260 · DuAnA 38) | **3** |
| Ⓒ không dấu | 0 | **197 dòng** | **22 dòng** |

13/17 repo sạch tuyệt đối cả ba mặt. Phần còn lại là miễn trừ có lý do, ghi ở §Miễn trừ:
`bang` tiếng Anh của DuAnA (3) · tên sheet Excel `QUYEN` và một chuỗi thử của Dept_IT (4) ·
từ điển thuật ngữ đang gạch bỏ cách viết sai + log watchdog trích nguyên văn (6) · hai chỗ đang
có phiên agent khác giữ file, cố ý không đụng (`KhoDuLieuTrungTam` 9 · `Dept_HR` 3).

**Bài học lớn nhất của đợt này:** `guard.cjs` sinh máy từng chiếm 72% số dòng mất dấu, sửa một
chỗ là sạch 9 repo — nhưng thứ tốn công nhất lại là **~350 định danh mà máy dò không thấy**. Khi
gate và mắt người lệch nhau một bậc độ lớn, tin mắt người trước, rồi đi sửa gate.

## Số nền một repo — đo 2026-09-12 (bảng CŨ, giữ để đối chiếu)

| Phép | Đã quét | Hit lúc đầu | Sau đợt dọn |
|---|---|---|---|
| Ⓐ tên file | 834 thành phần đường dẫn | 0 | **0** |
| Ⓑ định danh | 13.625 khai báo / 446 file mã | 9 (một file test) | **0** |
| Ⓒ không dấu | 145.683 dòng / 789 file | 616 (28 file) | **0** |
| Ⓓ song ngữ | 638 khoá × 2 dict · 201 khoá markup · 332 khoá `t()` | 2 (oan cả 2) | **0** |
| tên test tiếng Việt | 1.199 tên / 165 file | 962 | **0** |

**Đọc bảng cho đúng:** 72% của Ⓒ từng dồn vào **một chỗ** — `guard.cjs` sinh máy cố ý viết ASCII vì
sợ encoding console. Lối thoát đó đã bị bãi bỏ: sợ encoding thì viết **tiếng Anh**. Sửa
`guard-gen.ts` rồi `zemory hook guard` là sạch cả ba file (nguồn nhúng · bản sinh · bản ship cowork)
— nhưng `backend/test/template-parity.test.mjs` so **TỪNG BYTE**, nên phải sinh lại **rồi chép sang
cowork trong CÙNG một lượt**, và `BOOTSTRAP.md` ghim SỐ DÒNG nên phải cập nhật manifest theo.

## Miễn trừ — KHÔNG tính là lỗi

· **Tên do người khác đặt** giữ nguyên từng ký tự: cột Excel · trường API · tên file nguồn
  (`"Kich thuoc khu dat"`). Đổi là loader không tìm thấy. Đây là DỮ LIỆU, không phải định danh.
· **Thuật ngữ kỹ thuật** giữ nguyên (`Recall` · `FTS5` · `vector` · `embed` · `token`).
· **Chuỗi render ra tài liệu / nhãn UI** theo luật của docs/UI, không theo luật code.
· `docs_template/*/skills/write-docx/reference/*` — mẫu Python cố ý viết ASCII (đã miễn trong máy dò).
· **`attic/` và bản đã bàn giao** — ảnh chụp đông cứng; tên file CHÍNH LÀ biên bản của thứ đã giao.
· **Từ đồng âm Anh–Việt phải xử theo NGHĨA, không theo mặt chữ.** DuAnA có cả hai trong một
  repo: `.rc-bang` / `.upd-bang` / `_setBang` là `bang` TIẾNG ANH (dấu `!`, `⚠`) — giữ; còn
  `dwOpenBang` / `dwBackBang` là `bảng` — đổi, và bằng chứng nằm ngay tại chỗ: nhãn nút viết
  `_L("Bảng", "Table")`. Máy dò không phân biệt được; người phải đọc mã rồi quyết.
· **Trích nguyên văn** lời user hoặc log máy — thêm dấu vào là sửa lời người khác.
