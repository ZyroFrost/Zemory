---
id: Cons_115
aka: 01-15
name: chat-luong-bo-nho-la
version: 1
kind: judgment
---
# Cons_Core_115_ChatLuongBoNhoLa CHẤT LƯỢNG BỘ NHỚ LÀ MỤC TIÊU TỐI CAO — DUNG LƯỢNG KHÔNG BAO GIỜ ĐƯỢC MUA BẰNG CHẤT LƯỢNG

**CHẤT LƯỢNG BỘ NHỚ LÀ MỤC TIÊU TỐI CAO — DUNG LƯỢNG KHÔNG BAO GIỜ ĐƯỢC MUA BẰNG CHẤT LƯỢNG** *(user chốt 2026-08-07)*. Thứ mạnh nhất của zemory là **bộ nhớ VĨNH VIỄN dùng chung cho MỌI agent** — nó phải **chính xác nhất · nhanh nhất · recall trả về thông minh nhất**. Đó là lý do tồn tại của cả hệ, không phải một tính năng phụ. Với mọi mô hình RAG, đích cao nhất là **CHẤT LƯỢNG TRUY HỒI**, không phải số MB.
    - **Mọi đề xuất tối ưu phải đi theo hướng TĂNG chất lượng.** Đề xuất hạ chất lượng để đổi lấy dung lượng (hay một khoản tốc độ vặt) là **KHÔNG HỢP LỆ**, kể cả khi con số tiết kiệm rất đẹp. Muốn giảm dung lượng thì tìm đường **không đụng chất lượng** (nén lớp lưu, dọn rác, dedup, VACUUM) — đó mới là tối ưu.
    - **CẮT / THU HẸP một lớp phải qua ĐÚNG CỔNG như THÊM một lớp mới** (điều 12): đo recall trên **corpus CÓ NHÃN** TRƯỚC, chỉ cắt khi chứng minh được **không tụt**. "Tiết kiệm được N MB" KHÔNG phải lý do đủ để cắt.
    - **Vì sao phải thành điều khoản:** dung lượng cân được ngay (MB), còn chất lượng phải dựng corpus có nhãn mới đo được — nên đề xuất **tự nhiên nghiêng về phía cắt**, và cái mất thì im lặng. Đã trả giá **hai lần**: ① cắt 768→**256 chiều** (2026-07: đo được DB 1.141→595 MB, **không ai đo chất lượng**) ⇒ tới 2026-08-05 mới lộ **recall@1 74% vs 91%** và **44% câu KHÔNG BAO GIỜ lấy về được**, chuộc bằng **43 giờ** embed lại · ② đề xuất cắt tool-dump khỏi FTS trigram (2026-08-07, agent nêu — **user bác**): tính được ~285 MB nhưng không đo recall, đo lại thì **119.668 tin tool-dump chỉ 171 tin có vector** (embed cố ý bỏ `tool_name IS NOT NULL`) ⇒ cắt trigram là **chặt một trong hai chân tìm kiếm duy nhất của 57% kho**.
    - **NÂNG chất lượng cũng phải ĐO TRƯỚC — cấm "làm hết rồi mới biết sai" (user chốt cùng ngày).** Cửa này mở cả hai chiều: **được phép tăng** (thêm chiều embed, đổi model, thêm lớp rerank/chỉ mục…) **nếu nó đáng giá** — nhưng phải chứng minh bằng **phép thử NHỎ, trên BẢN SAO, TRƯỚC khi bỏ công lớn**: ① mức tăng chất lượng đo được là bao nhiêu · ② giá phải trả (giờ máy · đĩa · độ trễ truy vấn) · ③ có đáng đánh đổi không. Không đáng ⇒ **đề xuất đường khác tối ưu hơn**, đừng cố. Đây là chiều ngược của cùng một kỷ luật: cắt mà không đo thì mất chất lượng, tăng mà không đo thì đốt công vô ích.
      *Khuôn mẫu đã làm ĐÚNG, dùng lại:* trước khi bỏ 43 giờ dựng lại 768 chiều, phép thử `dims-test` embed **MỘT lần** ở 768 rồi cắt bốn mức trên **cùng một dãy số** (EmbeddingGemma huấn luyện Matryoshka) — nên khác biệt duy nhất là số chiều, không lẫn biến nào khác. Ra bảng `128/256/512/768` (`recall@1` 62/74/85/**91%**) trong ~1 giờ, rồi mới quyết. Một giờ đo cứu 43 giờ đi sai đường.
    - **Đĩa rẻ và mua thêm được; một câu trả lời trượt vì recall kém thì không mua lại được.**

- **Chưa có chốt máy:** đo recall trước khi cắt/nâng một lớp — CHƯA có hook nhắc — việc mở
