---
name: write-style
description: Strict prose rules for reader-facing text (reports, emails, announcements, content, docs handed to people) — distilled from Wikipedia's "Signs of AI writing" into hard bans, so the result reads like a careful human wrote it. Use BEFORE drafting any text a person will read, and as a revision checklist afterwards. Do not use for code comments or the harness docs themselves (those follow the repo's own language rules). Vietnamese triggers - "viết văn bản", "soạn báo cáo", "viết email", "viết content", "viết bài", "văn phong", "giọng AI quá", "viết cho tự nhiên", "bớt giọng máy".
---

# write-style — bộ luật văn phong cho văn bản đưa người đọc

> Kích hoạt: sắp VIẾT (hoặc sửa) bất kỳ văn bản nào cho NGƯỜI đọc — báo cáo · email · thông báo ·
> content · tài liệu giao đi. Nguồn luật: chưng cất từ **Wikipedia:Signs of AI writing** (dò
> 2026-08-21) — trang cộng đồng Wikipedia dùng để nhận diện bài do AI viết; ở đây đảo chiều thành
> luật CẤM khi viết. Mục đích là **văn bản đọc như người cẩn thận viết** — không phải lách detector.
> Nội dung sẽ đổ vào file `.docx` → phần dựng file theo `write-docx/`; skill này chỉ lo phần CHỮ.

## Luật CẤM — soát từng mục, khớp là SỬA, không tha

**§1 CẤM thổi phồng (puffery).** Không tự phong tầm quan trọng, di sản, "bức tranh lớn hơn".
- EN: *stands as a testament · plays a vital/pivotal role · rich cultural heritage · vibrant ·
  nestled · boasts · breathtaking · must-visit*
- VI: *"khẳng định vị thế" · "đóng vai trò quan trọng" · "nâng tầm" · "đậm đà bản sắc" ·
  "toạ lạc tại" · "sở hữu vẻ đẹp" · "điểm đến không thể bỏ qua"*
- Thay bằng: **sự kiện + con số + tên riêng**. Quan trọng thì để dữ kiện tự nói.

**§2 CẤM phân tích đắp đuôi bằng mệnh đề -ing / "qua đó".** Câu kể xong không được gắn đuôi
diễn giải rỗng: *highlighting… · underscoring… · ensuring… · contributing to…* — VI: *"qua đó
khẳng định…" · "góp phần nhấn mạnh…" · "thể hiện tầm quan trọng của…"*. Có phân tích thật thì
viết thành CÂU RIÊNG có chủ ngữ + bằng chứng; không có thì cắt.

**§3 CẤM quy kết mơ hồ.** *Industry reports · experts argue · observers have cited · several
sources* — VI: *"nhiều chuyên gia cho rằng" · "được đánh giá là" · "theo ghi nhận"*. Luật: nói
AI nói, nêu **đích danh ai, ở đâu, khi nào** — không nêu được thì đó là ý của mình, viết thẳng
là ý của mình, hoặc bỏ.

**§4 CẤM khuôn câu học vẹt.**
- *not only X but also Y* / "không chỉ… mà còn…" — dùng tối đa MỘT lần cả bài, tốt nhất là không.
- *It's not X, it's Y* / "không phải là X, mà là Y" — kiểu phủ-định-để-nhấn, cắt.
- **Bộ ba thần thánh** (rule of three): "nhanh, gọn, hiệu quả" — hai hoặc bốn cũng được, đừng máy
  móc ba.
- Khuôn "Despite challenges… future outlook" / "Dù còn thách thức… hứa hẹn trong tương lai" — cắt.
- Kết bài tự tổng kết lại điều vừa nói (*In conclusion / Overall* / "Tóm lại / Nhìn chung") — văn
  bản ngắn không cần tóm tắt chính nó.

**§5 ĐỘNG TỪ THẲNG.** "là / có / làm" thay cho lối vòng: *serves as · stands as · functions as ·
marks · features · offers* — VI: *"đóng vai trò như" · "được xem là" · "mang trong mình"*.
"X là thư viện Y" hay hơn "X đóng vai trò như một giải pháp thư viện Y".

**§6 TỪ CẤM (AI vocabulary).** Gặp là thay bằng từ thường: *delve · tapestry · landscape (ẩn dụ) ·
pivotal · crucial · intricate · testament · underscore · showcase · leverage · robust · seamless ·
comprehensive · foster · empower* — VI: *"đào sâu" · "bức tranh toàn cảnh" · "then chốt" ·
"toàn diện" · "tối ưu hoá" (khi chỉ định nghĩa là "làm tốt hơn") · "mượt mà" · "trọn vẹn" ·
"đồng hành cùng"*. Từ nối mở câu (*Additionally · Moreover · Furthermore* / "Bên cạnh đó" ·
"Hơn nữa" · "Ngoài ra") — tối đa MỘT lần; hai câu liền nhau cùng mở bằng từ nối là lỗi.

**§7 ĐỊNH DẠNG.**
- Em-dash (—): thấy muốn dùng thì thử dấu phẩy, ngoặc đơn, hoặc tách câu trước; quá 1–2 cái mỗi
  đoạn là dấu hiệu.
- **Đậm** rải khắp bài: cấm. Đậm tối đa cho vài cụm THẬT SỰ cần tra nhanh.
- Bullet-hoá mọi thứ: lập luận liền mạch phải là ĐOẠN VĂN; bullet chỉ cho danh sách thật.
- Emoji trang trí, kẻ ngang phân đoạn, Title Case Tiếng Việt (viết hoa Chữ Đầu Mỗi Từ), heading
  lặp lại tiêu đề, bảng cho thứ không phải dữ liệu bảng: cấm cả.

**§8 SẠCH ARTIFACT — soát trước khi gửi.** Không được sót: *As an AI… · I hope this helps ·
Certainly! · as of my knowledge cutoff* · chữ chờ điền `[tên khách hàng]` · rác markup
(`contentReference` · `oaicite` · `turn0search` · `[cite: 1]`) · markdown lọt vào nơi không render
markdown (`**đậm**` trong email thường) · nháy cong/nháy thẳng trộn lẫn trong cùng văn bản.

**§9 NHỊP NGƯỜI.** Câu và đoạn phải LỆCH độ dài — đều tăm tắp là giọng máy. Cho phép câu ngắn.
Một câu dài theo sau bằng một câu ngắn là nhịp tốt. Không mở mọi đoạn cùng một kiểu; không kết
mỗi mục bằng một câu tổng kết mini.

**§10 NÓI CÓ SỐ, CÓ TÊN, CÓ NGÀY.** Khẳng định đáng giá phải đi kèm dữ kiện kiểm được — "nhanh
hơn 40% trên bộ đo X" thay cho "cải thiện hiệu năng đáng kể". Không có số thì hạ giọng khẳng định
xuống đúng mức mình biết.

## Quy trình áp dụng

1. **Viết nháp tự do** — đừng vừa viết vừa soát, sẽ ra văn gồng.
2. **Soát ngược từng § như checklist** (1→10). Mỗi chỗ khớp: SỬA, không bào chữa "chỗ này hợp lý".
3. **Đọc to thử một đoạn.** Nghe như người nói chuyện thì đạt; nghe như thuyết minh thì quay lại §.
4. Văn bản giao đi (khách hàng · sếp · công khai): chạy checklist LẦN HAI trên bản cuối — bản sửa
   hay tự mọc lại lỗi §4/§6.

## Ranh giới — đọc để không áp nhầm chỗ

- **Một dấu hiệu đơn lẻ không phải tội** — chính trang nguồn ghi rõ nhóm "ineffective indicators".
  Luật nổ khi dấu hiệu CHỒNG NHAU; một chữ "toàn diện" lẻ loi không cần họp khẩn.
- Docs kỹ thuật nội bộ của harness (rules · spec · changelog) giữ văn phong QUY PHẠM theo luật
  ngôn ngữ của repo — hai chuẩn không đè nhau; skill này cho văn bản ĐƯA NGƯỜI ĐỌC.
- Thuật ngữ chuyên ngành giữ nguyên, không dịch, không né bằng từ đồng nghĩa màu mè.

**Cấm:** giao văn bản chưa chạy checklist · dùng skill này để "lách máy dò" rồi bỏ qua chất lượng
nội dung (thứ tự đúng: nội dung có dữ kiện TRƯỚC, văn phong SAU) · sửa giọng mà làm sai nghĩa gốc.
