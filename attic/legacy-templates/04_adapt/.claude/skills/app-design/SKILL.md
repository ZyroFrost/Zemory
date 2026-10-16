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
  khi tiến trình chính đã mang tên app ngay từ đầu. Đổi tên một nửa còn tệ hơn không
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
git=source(tag/branch) · dist+Releases=build · data/snapshots=data · migrations=schema · 06_CHANGES=log. KHÔNG folder versions/ chép tay. **Bump RELEASE-BASED: số version chỉ tăng khi RELEASE/deploy 1 bản, KHÔNG bump per-commit/per-feature; USER quyết số (semver M.m.p — minor=tính năng, patch=fix deploy); mọi việc giữa 2 release GOM vào version kế; nguồn số = `package.json`(Node)/`__version__`(Py) — 1 chỗ; release-notes = `06_CHANGES`**
