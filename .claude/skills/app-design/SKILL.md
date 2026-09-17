---
name: app-design
description: Chuẩn thiết kế của một APP do repo này dựng — FE (bề mặt người dùng) và BE (tiến trình, tài nguyên). Mở khi đụng bất kỳ bề mặt nào của app, hoặc khi thêm/đổi một tiến trình nền.
---

# app-design — chuẩn thiết kế APP (FE + BE)

> **CHUẨN THIẾT KẾ, không phải điều khoản luật** *(user chốt 2026-09-16)*. Nó mô tả app **nên được
> dựng thế nào**; trái chuẩn thì sửa cho đúng chuẩn, không phải "cân nhắc". Trước đây phần này nằm
> nhờ trong `02_RULES` chỉ vì bộ skill chưa có — nay về đúng nhà, `02_RULES` giữ một dòng trỏ sang.

Áp cho profile **APP**. Profile NON-APP không có bề mặt UI ⇒ chỉ đọc §BE.

---

## FE — bề mặt người dùng

### F0. TỐI GIẢN LÀ LUẬT ƯU TIÊN — đọc TRƯỚC mọi luật FE khác

**Mặc định của mọi phần tử trên bề mặt là KHÔNG CÓ NÓ.** Thứ gì muốn có mặt phải trả lời được:
*người dùng làm gì với nó?* Không trả lời được ⇒ **bỏ**, không "để đó cho đủ".
*(user chốt 2026-09-18, sau ba lượt phải nhắc trong một phiên: "chú thích mấy cái gói phát này kia
làm gì chời, sao cứ thích chế mấy cái thừa thải rườm rà làm rối thiết kế thêm" · "t cũng không có
kêu thêm bắt buộc gì hết, bỏ hết mấy cái thừa thải đi" · "ghi rõ luật này ưu tiên vào luật skill
chung thiết kế UI, ưu tiên tối giản hoá mọi thứ".)*

**Luật này đứng TRÊN các luật F khác.** Khi một luật F bảo *"phải có X"* mà X không ai dùng, F0
thắng: đừng thêm X rồi viện dẫn luật. Các luật F còn lại nói *"nếu có thì phải đúng thế nào"* —
chúng không phải một danh sách thứ phải dựng.

**Năm thứ hay bị thêm thừa nhất — đo trên chính repo này, mỗi cái là một ca THẬT:**

| thứ thừa | vì sao nó thừa | ca thật |
|---|---|---|
| **nhãn hạng dán lên TỪNG mục** của một danh sách | lặp cùng một thông tin N lần, làm rối đúng hàng người ta đang phải chọn | 5 chip bộ mẫu mỗi cái đeo `gói phát`/`rót được`/`tham chiếu` |
| **chú giải (legend)** cho ký hiệu | chiếm một hàng tiêu đề vĩnh viễn để giải thích một thứ nhìn vài giây là quen | `★ = bắt buộc · opt = tạo khi có concern` trên card cây thư mục |
| **con số đếm** cạnh tiêu đề card | bản thân danh sách đã nói số lượng | `19 file` cạnh "Bộ chuẩn" |
| **nhãn lặp lại thứ đang chọn** | chip/tab đang sáng đã nói rồi | `05_app · rót được` cạnh tên file |
| **badge "bắt buộc"/"mặc định"** không ai bấm được | nó là chữ trang trí, không phải điều khiển | cùng ca legend ở trên |

**Phép thử trước khi thêm bất cứ gì:** ① **gỡ** cái đang có được không · ② **gộp** vào chỗ đã có
được không · ③ **không có nó thì người dùng làm hỏng việc gì**. Không trả lời được ③ ⇒ **KHÔNG THÊM**.
*(Cùng khuôn ba câu hỏi của `02_RULES §Sổ việc` cửa vào — ở đó là chống phình SỔ, ở đây chống phình
BỀ MẶT. Cùng một bệnh: bồi đắp cho chắc, rồi mọi người phải đọc mãi mãi.)*

**Một thông tin xuất hiện ĐÚNG MỘT LẦN trên màn** (mở rộng của §F6, siết hơn): F6 cấm cùng một số
sống ở hai MÀN; F0 cấm nó sống hai chỗ trong CÙNG một màn. Hạng của bộ mẫu nói ở dòng mô tả của bộ
đang chọn — không dán lên chip, không lặp cạnh tiêu đề.

⚠ **Đây là chỗ agent sai đi sai lại**, nên nói thẳng: xu hướng tự nhiên khi dựng bề mặt là *thêm cho
rõ*. Nó không làm rõ hơn — nó làm người dùng phải đọc nhiều hơn để tìm đúng thứ họ cần. **Thêm một
phần tử là thêm một thứ mọi người phải bỏ qua, mãi mãi.**

### F0b. MỘT CHỨC NĂNG — MỘT KHUNG, MỘT BỘ CSS

**Cùng một chức năng thì mọi nơi phải cùng một hình hài: cùng khung, cùng bộ CSS, cùng vị trí nút,
cùng nhãn.** Không có chuyện mỗi màn một kiểu. *(user chốt 2026-09-18: "có 1 cái khung search cũng
không làm đồng bộ cho giống nhau được… tự nhiên 1 cái xoay 1 cái nút tìm, quy tắc gì vậy — bất cứ
cái gì mà 1 chức năng thì phải cùng 1 kiểu thiết kế, 1 khung UI, 1 kiểu CSS, không được mỗi nơi 1
kiểu".)*

**Ca thật đẻ ra luật này:** hai ô tìm kiếm cùng nằm trên màn Recall — tab *Tìm kiếm* có nút
`Tìm ✦` (vàng, chữ), tab *Phiên* có nút `↻` (icon, viền). Người dùng đọc ra hai thứ khác nhau
trong khi cả hai đều là *"gõ để tìm"*.

- **Khác HÀNH VI không phải lý do để khác HÌNH HÀI.** Một ô chạy khi bấm, một ô chạy khi gõ —
  đó là chi tiết bên dưới; bề mặt vẫn phải là cùng một khung. Muốn khác thì phải khác vì **người
  dùng cần phân biệt**, không phải vì code tiện.
- **Thứ KHÔNG cùng chức năng thì ĐỪNG nhét chung khung.** Nút `↻` (quét lại tên phiên từ đĩa) là
  một hành động KHÁC hẳn tìm kiếm — nó nằm trong ô tìm chỉ vì chỗ đó trống. Tách ra.
- **Cách làm: một lớp CSS dùng chung + một khuôn markup**, khai một lần. Thêm ô tìm thứ ba là dùng
  lại khuôn đó, KHÔNG chép rồi sửa — chép là cách hai bản bắt đầu trôi lệch.
- **Phép kiểm:** đếm số biến thể markup/CSS của cùng một chức năng. `> 1` là lệch, trừ khi nêu
  được lý do người dùng cần phân biệt.

### F0c. MỌI CONTROL TRÊN CÙNG MỘT HÀNG PHẢI BẰNG CHIỀU CAO

**Nút · chip · select · ô tìm đứng chung một hàng thì cao bằng nhau — không có ngoại lệ.** Cái nào
không nhỏ hơn được một mức nào đó thì **mọi cái còn lại lấy mức đó làm chuẩn**, không phải để nó
thò ra. *(user chốt 2026-09-18: "mọi nút, khung search khi 1 hàng đều phải ngang chiều cao với
nhau; nếu 1 cái không nhỏ được thì mọi nút khác phải theo chiều cao min của nó".)*

🔴 **Chốt bằng CHIỀU CAO, đừng chốt bằng padding + font.** Đây là chỗ ai cũng làm sai lần đầu:
`<select>` là control của **hệ điều hành**, cùng `padding` và cùng `font-size` vẫn ra chiều cao khác
`<div>`. Đo trên repo này 2026-09-18 khi đã cho cả ba dùng chung padding/font: chip **28,7px** ·
select **26,0px** — vẫn lệch. Cách duy nhất chắc chắn là khai thẳng `height` + `box-sizing:border-box`
từ **một biến dùng chung**.

- **Một biến, mọi control.** `--ctl-h` (và `--ctl-fs` · `--ctl-px` · `--ctl-r`) khai một chỗ; nút,
  chip, select, ô tìm đều lấy từ đó. Sửa một chỗ là cả hàng theo — không có đường nào để chúng
  trôi lệch lần nữa.
- **Thêm một loại control mới thì nối nó vào danh sách đó**, đừng khai padding riêng.
- **Đo bằng MÁY, và đo ĐÚNG VẬT.** `getBoundingClientRect().height` trên **chính phần tử khung**,
  không phải `<input>` nằm trong nó — đo nhầm vật cho ra 18,7px và dẫn tới kết luận sai (đã dính).
  Phép kiểm: max − min trên mỗi hàng ≤ 0,6px.

### F1. Panel kề nhau PHẢI kéo được
**MỌI vùng có ≥2 panel kề nhau PHẢI có thanh kéo (resize handle) chỉnh được kích thước — KHÔNG có ngoại lệ** (user chốt 2026-07-22, "làm ơn thêm vào luật chung, tui ko nhắc nữa"). Ràng buộc: **① Tự do THẬT** — seam phải điều khiển một biến layout THẬT (kéo là đổi), CẤM seam "trang trí" (cột `2fr`/`1fr` cứng = kéo không đổi gì = SAI). **② Bố cục 2D → kéo cả 2 chiều** (2 panel cạnh nhau = seam DỌC chỉnh bề ngang; 2 panel trên-dưới = seam NGANG chỉnh chiều cao; lưới 2×2 = có cả hai). Không được chỉ cho co 1 chiều. **③ MỘT engine dùng chung** — mọi seam đi qua CÙNG một cơ chế (1 hàm init + 1 kiểu handle + biến/clamp data-driven), KHÔNG mỗi chỗ một nhánh `if(type===…)` hardcode (đó là nguồn "vá chỗ này lủng chỗ kia"). Thêm seam mới = khai báo dữ liệu, KHÔNG chép logic. **④ Lưu + khôi phục** y nguyên qua phiên (server config, như dialog). **⑤ Dựng lại (double-click) về mặc định.** Ngưỡng min/max theo nội dung tối thiểu mỗi panel, KHÔNG số ma rải rác

**⑥ VẠCH NGĂN CHẠY HẾT CHIỀU CAO VÙNG — mặc định, không phải tuỳ chọn** *(user chốt 2026-09-16: "line mặc định phải luôn kéo hết trang chứ")*. Hai panel gần như không bao giờ cao bằng nhau, nên vạch chỉ `align-self:stretch` sẽ dừng ở đáy panel NGẮN hơn và trông như kẻ hụt giữa trang. Vạch là **ranh giới của VÙNG**, không phải đường viền của panel — nó phải chạy trọn vùng bất kể hai bên dài ngắn ra sao.
· Cách làm: ép hàng lưới bằng chiều cao lưới (`grid-template-rows:minmax(0,1fr)` trên lớp lưới kéo được), **giữ** `align-items:start` để panel vẫn cao theo nội dung — kéo dài vạch, không kéo dài panel.
· **Đặt ở lớp DÙNG CHUNG, đừng vá từng màn**: cùng bài học với "phân mục phải có vạch ngăn" — vá riêng khung vừa bị chê thì lỗi quay lại ở khung kế tiếp.
· Nghiệm thu bằng MẮT, không bằng cổng: cổng đọc được class nhưng không thấy vạch dài bao nhiêu.

### F2. Dialog / modal
CHỈ 3 size S/M/L, cả 3 CÙNG MỘT TỈ LỆ CHUẨN MÀN HÌNH **16:9** (khung landscape cân đối như màn, KHÔNG phải hộp dài-thòng đứng). **Mỗi size = một % của KHUNG APP theo CẢ HAI CHIỀU** (16:9), công thức `width: min(Pvw, calc(Pvh*16/9))` + `aspect-ratio:16/9` ⇒ đúng P% trên màn 16:9, nhỏ hơn (không tràn) trên màn lệch tỉ lệ: **S 40% · M 60% · L 90%** (user chốt 2026-07-21; Settings = L). 3 size = 3 SCALE cùng tỉ lệ; S không đủ → chọn M/L, **vẫn đúng 16:9, KHÔNG bóp méo**. **KHUNG KHÔNG BAO GIỜ NHẢY theo nội dung** (đổi tab Settings mà khung phình/co = SAI); tràn → cuộn TRONG dialog (`overflow:auto` ở thân, thân là grid/flex child phải `min-height:0` mới cuộn). KHÔNG cố-định-Nvh (đẻ hộp cao méo), KHÔNG random/đổi-động/reflow loạn. Trạng thái layout user chỉnh (resize/vị-trí/size) phải LƯU + khôi phục y nguyên. Token/size ở frontend/styles/. **ESC LUÔN đóng dialog trên cùng** (mọi overlay/popup phải đăng ký 1 global keydown; ESC đóng MỘT lớp/lần theo thứ tự visually-topmost) + bấm nền (backdrop) cũng đóng — TRỪ dialog đang chạy tác vụ bất-khả-huỷ (vd sync đang chạy) thì chặn cả ESC lẫn backdrop cho tới khi xong

### F3. Bề mặt chết theo nền
**Mọi bề mặt phụ thuộc một tiến trình nền (cửa sổ app · tab · panel · CLI chờ) PHẢI phát hiện nền chết và CHẾT THEO — hoặc báo lỗi THẤY ĐƯỢC. TUYỆT ĐỐI không để lại vỏ rỗng trông như đang sống** (user chốt 2026-08-10 sau ca daemon chết mà cửa sổ vẫn mở: mọi nút bấm gửi request vào chỗ trống, vòng xoay "đang sync…" quay MÃI, user đọc thành "kẹt" và chờ hàng giờ trong khi KHÔNG có gì đang chạy). Vỏ rỗng là kiểu hỏng TỆ NHẤT — nó không báo lỗi, nó NÓI DỐI, và người dùng không có cách nào phân biệt với đang-chạy-thật. Cách làm: nhịp tim định kỳ tới nền; chịu lỗi có chủ đích (chỉ đếm SAU khi đã thấy nền sống ít nhất một lần, và phải trượt LIÊN TIẾP N nhịp mới kết luận — nền bận một nhịp ≠ nền chết); hết N nhịp thì đóng/ báo. Đối xứng với luật fail-open (HP điều 9): lớp phụ hỏng thì rơi về lớp dưới **và nói ra**, không giả vờ vẫn chạy

### F4. Chữ người dùng đọc
- **Văn KỸ THUẬT, không văn nói.** Nhãn là một câu ngắn nêu hành vi. Không kể lể, không nhấn giọng
  bằng VIẾT HOA, không cảm thán.
- **KHÔNG ghi chú nội bộ ra giao diện**: ngày đo, số hiệu phiên bản của một lần sửa, tên biến, lý do
  kỹ thuật. *(Đã lọt thật: một nhãn từng ghi "đo 15/09 trên hai mạng thật".)*
- **KHÔNG thuật ngữ nội bộ** ở chỗ người dùng phải quyết định (`WAL`, `.bak`, `watermark`) — trừ khi
  chính người dùng cần nó để chọn.
- **Trần ~120 ký tự** mỗi nhãn mô tả. Dài hơn nghĩa là đang giải thích, không phải đang gán nhãn.
- **Song ngữ ĐỦ HAI ĐẦU**, kể cả chữ nằm thẳng trong markup (`title`/`placeholder`/text node).
- **② Nhãn ĐỦ, máy đọc được.** Mọi phần tử tương tác (nút · ô nhập · select · link) phải có nhãn mà **công cụ đọc được**: nội dung chữ, hoặc `aria-label`/`title`/`placeholder`; ảnh có `alt`. Nút icon trơn không nhãn là **thiếu**, không phải "gọn". 
- **③ Song ngữ ĐỦ HAI ĐẦU.** Vế "0 chuỗi hardcode" ở trên áp cho **cả chữ nằm thẳng trong HTML/markup**, không riêng chuỗi trong code: text node và cả `title`/`placeholder`/hint phải có móc i18n tương ứng, mọi khoá phải tồn tại ở **cả hai** dict. Chữ một ngôn ngữ nằm trong markup mà thiếu móc = người dùng đổi ngôn ngữ xong **vẫn thấy tiếng cũ**, và không lỗi nào nổ. 

### F5. Dời một bề mặt là soát lại CẢ HAI ĐẦU
Bề mặt luôn mang giả định về khung chứa nó. Dời sang khung khác mà không soát lại là lỗi lặp
**bốn lần trong một phiên** (2026-09-16):

| giả định cũ | hỏng ra sao khi dời |
|---|---|
| `min-width:auto` của flex/grid | chuỗi dài đẩy panel **tràn ngang** |
| con của flex co được | nội dung dài bị **bóp, chữ chồng nhau** |
| `gap` do lưới cha lo | vào tab thì **dính liền một khối** |
| `flex:1` trên nút (cột hẹp) | màn rộng thì nút **dài hết trang** |

Và **bên CHO cũng phải dọn**: rút một cột khỏi lưới mà không sửa `grid-template-columns` thì còn
một cột rỗng + một thanh kéo mồ côi. Phép kiểm: **số rãnh = 2 × (số thanh kéo) + 1**.

### F6. Một nội dung MỘT NHÀ trên bề mặt
Cùng một thiết lập không được có hai chỗ chỉnh; cùng một con số không được hiện ở hai màn. Hai bản
sao luôn lệch nhau, và người dùng không biết bản nào đúng.

### F7. UI phải KHỚP CODE — kiểm bằng graph, không bằng mắt
 Bề mặt gọi tới đâu thì chỗ đó phải có thật, và ngược lại: cạnh seam `api` của graph đối chiếu route FE gọi với route BE thật ⇒ ① FE gọi route không tồn tại = UI gãy · ② endpoint không ai gọi = bề mặt chết. Đây là phép KIỂM ĐƯỢC BẰNG MÁY, nên không có lý do để nó chỉ nằm trong đầu ai đó.

### F8. Nơi ở của thiết lập UI
default ship → frontend/config/ (tracked); bản user chỉnh runtime → data/settings/ (gitignore)

### F9. Phân mục phải NHÌN RA — vạch ngăn + khoảng cách
Nhiều mục xếp liền nhau chỉ bằng một dòng tiêu đề nhỏ thì đọc thành **một khối chữ**; người dùng
không thấy được đây là mấy nhóm khác nhau. Mỗi mục phải có **vạch ngăn** và **khoảng thở**, cùng
khuôn với hàng thiết lập sẵn có (mỗi hàng một vạch đáy).

- Mục ĐẦU không kẻ vạch trên — nó sát tiêu đề panel, kẻ thêm là hai vạch dính nhau.
- Đây là lỗi **lặp lại**: mỗi lần dựng một panel mới lại quên, trong khi panel cũ đã làm đúng.
  Dựng panel mới thì COPY khuôn của panel đang chạy, đừng gõ lại từ đầu.
- **Viết luật cho MỌI khung chứa mục, đừng bó vào một panel.** Vá riêng chỗ vừa bị chê thì lỗi
  quay lại ở panel kế tiếp. Đo 2026-09-16: sau khi vá một panel, quét lại còn **4 khung khác**
  cũng có ≥2 mục mà không vạch nào.

### F10. Bấm một THẺ là CHỌN, không phải MỞ
Mở ngay khi bấm thẻ làm người dùng đọc thành *"bị nhảy sang màn khác"* — họ chỉ định chọn, không
định rời danh sách. Thẻ trong danh sách: bấm = đánh dấu đang chọn (phải NHÌN RA được); mở chi tiết
đi qua **nút riêng** trên thẻ.

⚠ Và khi người dùng nói *"bấm X bị nhảy sang Y"*, đo TRƯỚC xem có thật sự đổi màn không: có thể
không hề có lệnh đổi màn nào, mà chỉ là khung chi tiết trông giống màn Y. Sửa cái TÊN khi gốc là
HÀNH VI thì báo bao nhiêu lần cũng không hết (đã mất ba lượt như vậy).

---

### F11. Một kênh thị giác = MỘT hạng thông tin
**Viền · nền · đậm nhạt là các KÊNH riêng; mỗi kênh chỉ một hạng làm chủ** *(user chốt 2026-09-17: "cái khung sáng đánh dấu pin là đang bị ảo")*. Hai trạng thái khác hạng cùng đòi một kênh thì **kẻ khai báo sau thắng, kẻ kia biến mất mà không cổng nào báo** — và nếu hai màu còn gần nhau (đo được ca thật: `--primary` #FFD166 vs `--warn` #FBBF24 cùng làm viền thẻ dự án) thì ngay cả khi không đè nhau, mắt vẫn đọc ra CÙNG một nghĩa ⇒ người dùng đếm 6 thẻ "đã ghim" trong khi hệ chỉ ghim 2. Cách làm: **đếm xem có bao nhiêu trạng thái đang đòi cùng một kênh, rồi chia lại** — mỗi kênh đúng một chủ, cái thứ ba phải nói bằng badge chữ. Ca thực ở thẻ dự án (chốt 2026-09-17): **ghim = VIỀN** (giữ nguyên kênh nó vốn có — đừng đổi thói quen đọc của người dùng), **đang chọn = NỀN**, **lệch chuẩn = badge chữ** (thôi đòi viền). ⚠ Khi sửa loại lỗi này, **đừng đẩy nạn nhân sang kênh khác rồi coi là xong**: dọn đúng trạng thái đang chen vào, giữ kênh cũ cho chủ cũ. Nghiệm thu bằng SỐ trên DOM thật (`getComputedStyle`), đừng tin ảnh chụp.
· Cùng họ: **công tắc trạng thái phải LUÔN thấy được, hành động mới được ẩn theo hover**. Ẩn cả cụm nút bằng `opacity:0` ở container là bẫy — cha trong suốt thì con cũng vô hình, `opacity:1` trên con KHÔNG cứu được; phải ẩn theo từng nút.

### F12. TUYỆT ĐỐI không có thanh cuộn NGANG
**Hẹp lại thì nội dung XUỐNG DÒNG, không đẩy ngang** *(user chốt 2026-09-17: "lỗi UI, tuyệt đối ko dc có scoll bar ngang … size phải xuống chứ ko dc ngang")*. Ba cái bẫy đo được trong repo này, cả ba đều là "khai một nửa rồi trình duyệt tự điền nửa còn lại":
· **`overflow-y:auto` một mình BẬT luôn cuộn ngang** — CSS ép chiều còn lại từ `visible` thành `auto`. Hễ có một khối con rộng quá là mọc thanh ngang mà không ai khai nó. Vùng cuộn phải viết **đủ hai chiều**: `overflow-y:auto;overflow-x:hidden`.
· **`repeat(N,1fr)` là số cột CỨNG** — ô không co dưới nội dung tối thiểu ⇒ lưới rộng hơn khung. Dùng `repeat(auto-fit,minmax(<sàn>,1fr))`: đủ rộng thì vẫn N cột, hẹp thì tự bớt cột.
· **Track `1fr` vẫn bị nội dung đẩy rộng** — `1fr` thực chất là `minmax(auto,1fr)` và `auto` đo theo min-content của ô. Ô lưới phải có `min-width:0` mới co được.
· Ngoại lệ DUY NHẤT: khối **mã nguồn** (`pre.code`, `.fpre`) — bẻ dòng mã làm sai nghĩa, nên nó được giữ cuộn ngang.
· Đo bằng máy, đừng nhìn ảnh: quét `scrollWidth - clientWidth > 0` trên MỌI màn × MỌI tab con ở vài khổ khung (1100 · 900). Phân biệt **`overflow:hidden` + ellipsis** (cắt chữ, KHÔNG sinh thanh cuộn — hợp lệ) với vùng thật sự cuộn được.

### F13. Thẻ (card): NEO cố định, thứ liên quan ĐỨNG SÁT NHAU
**Cụm nút neo góc phải trên; badge gom thành một cụm** *(user chốt 2026-09-17: "3 cái nút chức năng phải luôn nằm ở góc phải trên như ban đầu dù có scale lại … cái nào liên quan nhau thì phân vào đứng sát nhau")*. Một thẻ có ba hạng nội dung, và mỗi hạng là MỘT HÀNG riêng, không trộn:
| hàng | chứa gì | luật |
|---|---|---|
| 1 | danh tính (icon · tên) + **cụm nút hành động** | `flex-wrap:nowrap` — hàng này KHÔNG BAO GIỜ xuống dòng. Nút neo phải (`margin-left:auto`, `flex:0 0 auto`); thứ co lại là **tên** (`min-width:0` + ellipsis) |
| 2 | **badge trạng thái** — gom hết vào một cụm, `gap` đều, `:empty{display:none}` | được phép wrap; rỗng thì biến mất, không để khoảng trắng ma |
| 3 | số liệu phụ | — |
· **Vì sao neo:** cho cả badge lẫn nút chung một hàng wrap thì khi thẻ co, nút bị badge đẩy xuống và rơi ra **giữa thẻ** — người dùng đọc là "hỏng", và đúng là hỏng: một nút điều khiển không có chỗ đứng cố định thì mỗi khổ màn hình lại nằm một nơi. Neo trước, co sau.
· **Khoảng cách chỉ một nguồn:** cụm đã có `gap` thì đừng gắn thêm `margin-right` lên từng badge — hai nguồn cùng chỉnh một khoảng, cụm thôi đều nhau.
· **Nút KHOÁ vĩnh viễn** (vd repo gốc của chính app) thì `disabled` + đổi `title` nói lý do, và **chặn ở BACKEND** nữa — nút disabled chỉ là lời nhắc, endpoint thì bề mặt nào cũng gọi được. Đừng làm mờ nút: mờ nghĩa là "tạm thời không dùng được", còn đây là vĩnh viễn theo thiết kế.

### F14. Vùng cuộn phải TỰ CHỪA CHỖ cho thanh cuộn
**Mọi vùng cuộn khai `scrollbar-gutter:stable`** *(user chốt 2026-09-17: "tất cả mọi panel đều phải
tự co lại 1 khoảng padding vừa đủ để cái scrollbar nó không đè lên mất 1 khoảng chữ")*. Thanh cuộn
mọc ra ở mép phải và **ăn vào chữ** — con số cuối hàng bị cắt, và người đọc không biết là bị cắt.
· **Vì sao `scrollbar-gutter` chứ không chỉ `padding`:** chừa chỗ bằng padding thì lúc CHƯA tràn dư
  một khoảng trống, lúc tràn lại vẫn đúng — hai trạng thái hai kiểu. `stable` giữ chỗ SẴN, nên nội
  dung **không nhảy ngang** đúng lúc nó dài thêm một dòng.
· **Kèm một khoảng thở** (`padding-right`): chữ dừng sát mép thanh cuộn vẫn đọc ra là bị cắt.
· **Đặt ở LỚP CHUNG**, liệt kê mọi vùng cuộn một lần. Vá riêng panel vừa bị chê thì panel kế tiếp
  lại dính — cùng bài học với §F9 và §F1⑥.
· Đo bằng máy: với mỗi vùng có `overflow-y:auto|scroll`, `getComputedStyle` phải trả
  `scrollbar-gutter: stable`. Ảnh chụp headless **không đo được** việc này (`--hide-scrollbars`),
  nên phải soi CSS đã tính, đừng tin mắt nhìn ảnh.

### F15. ĐÓNG BĂNG khi tắt, đừng ẩn — và chừa đường bật lại
**Một tính năng/kênh đang TẮT thì xám hẳn và không bấm được, KHÔNG phải biến mất** *(user chốt
2026-09-17: "tắt thì phải đóng băng luôn và xám hết các panel trong đây")*. Ẩn đi để lại một khoảng
trống không giải thích: người dùng không biết ở đó vốn có gì, cũng không biết vì sao mất.
· Công thức: `opacity` giảm **+ `filter:grayscale(1)` + `pointer-events:none`**. Phải xám HẲN —
  chỉ giảm opacity thì biểu đồ vàng/xanh vẫn đọc ra như đang sống.
· ⚠ **Luôn chừa đường bật lại.** Xám cả ô cấu hình cần để bật là **tự khoá mình ngoài cửa** (ca
  thật: xám luôn ô "Thư mục dùng chung" thì tắt kênh Drive xong không còn chỗ nào gõ đường dẫn).
  Liệt kê rõ thứ được miễn, và có cổng canh đúng điểm đó.
· ⚠ **Công tắc không được dùng chính CẤU HÌNH làm trạng thái.** Ca thật: gạt tắt kênh Drive gọi
  `/set-drive?path=` — tức XOÁ đường dẫn khỏi config. Tắt một tính năng không bao giờ được làm mất
  cấu hình của nó; tách một cờ `<feature>On` riêng.
· Bề mặt vẽ từ **nhiều đường** (lúc nạp · lúc làm tươi) thì cờ bật/tắt phải có mặt ở **mọi** đường,
  nếu không nó lúc ẩn lúc hiện tuỳ đường nào về sau. Và setter phải xoá cache của bảng điều khiển,
  nếu không công tắc "gạt mà không đổi".

## BE — tiến trình & tài nguyên

### B1. MỌI tiến trình của app gom về MỘT nhóm — không sót cái nào
*(user chốt 2026-09-16)*

- App có thể sinh nhiều tiến trình (daemon, cửa sổ, job nền, helper của thư viện). Trên bảng tiến
  trình của HĐH, **tất cả phải quy về một nhóm mang tên app** — không có tiến trình nào đứng lẻ với
  tên của thư viện sinh ra nó.
- **Phải có sổ liệt kê**: mỗi tiến trình app sinh ra được khai một dòng (tên hiện ra · ai phóng ·
  sống bao lâu). Sinh thêm tiến trình mới mà không khai vào sổ = **thiếu sót**, kể cả khi nó chạy đúng.
- Áp cho **cả tiến trình cũ lẫn mới** — helper dựng sẵn của dependency cũng phải đổi tên/gói lại.
- *Ca thật: `tray_windows_release.exe` (helper Go của `systray2`) đứng lẻ suốt gần hai tháng, trong
  khi `node.exe` đã được đổi tên thành `zemory.exe` ngay từ đầu. Đổi tên một nửa còn tệ hơn không
  đổi: người đọc tưởng đã gom đủ.*

### B2. Tiến trình nền không được mở cửa sổ console
Mọi đường phóng (lối tắt · autostart · tự khởi động lại sau cập nhật · phóng từ UI) đều phải ẩn.
Một cửa sổ đen là bề mặt kỹ thuật rò ra người dùng, và **đóng nhầm nó là giết tiến trình**.
Giấu console thì **bắt buộc** phải có đường xem nhật ký trong app — nếu không là bịt luôn phép
chẩn đoán *"vì sao không chạy"*.

### B3. Một kẻ ghi cho mỗi kho; nhiều ĐÍCH thì mỗi đích một sổ
Ghi vào hai kho khác nhau là hợp lệ. Thứ phải tách là **sổ theo dõi tiến độ**: dùng chung một khoá
cho mọi đích thì đích nào ghi trước sẽ nuốt phần của đích sau, im lặng và vĩnh viễn.

### B4. Hai kiểu version-up
① TỰ ĐỘNG (app tự check+tải+apply) → backend/src/update/ (phối attic/+dist/+migrations/). ② THỦ CÔNG (chốt bản X, up máy đích/VM) → git tag → dist/ build → backend/scripts/deploy.* → backup bản đang chạy về attic/ TRƯỚC khi đè → rollback nếu hỏng. Dùng hạ tầng có sẵn, KHÔNG concern mới

### B5. Deploy là việc HAI CHIỀU
KHÔNG chỉ push 1 chiều. Máy đích có backup lần trước → verify khớp attic/ local TRƯỚC khi đè (lệch = có sửa tay ngoài luồng, điều tra trước); deploy xong kéo bản-vừa-thay về attic/ local. Cùng nguyên lý additive-merge của memory sync/share.ts

### B6. Test — chạy app là phép thử chính
KHÔNG bắt buộc — chạy chính app = phép kiểm thử; folder test chỉ cho lõi logic dễ sai ngầm (search/migration/privacy). FE: e2e/story co-locate hoặc frontend/test

### B7. Đánh số phiên bản
git=source(tag/branch) · dist+Releases=build · data/snapshots=data · migrations=schema · 06_CHANGES=log. KHÔNG folder versions/ chép tay. **Bump RELEASE-BASED (như SasinFlow): số version chỉ tăng khi RELEASE/deploy 1 bản, KHÔNG bump per-commit/per-feature; USER quyết số (semver M.m.p — minor=tính năng, patch=fix deploy); mọi việc giữa 2 release GOM vào version kế; nguồn số = `package.json`(Node)/`__version__`(Py) — 1 chỗ; release-notes = `06_CHANGES`**
