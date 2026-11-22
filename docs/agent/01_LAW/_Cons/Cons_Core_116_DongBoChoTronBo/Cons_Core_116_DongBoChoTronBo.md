---
id: Cons_116
aka: 01-16
name: dong-bo-cho-tron-bo
version: 1
kind: content
---
# Cons_Core_116_DongBoChoTronBo ĐỒNG BỘ CHỞ TRỌN BỘ RAG — MÁY NHẬN KHÔNG BAO GIỜ PHẢI DỰNG LẠI GÌ

**ĐỒNG BỘ CHỞ TRỌN BỘ RAG — MÁY NHẬN KHÔNG BAO GIỜ PHẢI DỰNG LẠI GÌ** *(user chốt 2026-08-12)*. Mục đích thật của zemory: **cài zemory + có chìa ⇒ đọc được Global Memory NGAY**. Mọi thiết kế đồng bộ phải phục vụ điều đó.
    - **Một tin lên kho chung là mang theo TRỌN bộ RAG của chính nó** — dữ liệu gốc **và** vector **và** mọi lớp dò khác. Không chở nửa vời rồi để máy kia dựng bù: bắt máy mới nhúng lại kho của máy khác là **sai thiết kế**, không phải đánh đổi.
    - **Mỗi máy chỉ nhúng ĐÚNG phần dữ liệu của chính nó**, rồi **ADD THẲNG** vào kho chung. Mọi tiến trình lên kho chung là **THÊM** — không chạy lại, không dựng lại, không ghi đè.
    - **Kho THẬT là bản local của từng máy** (`<repo>/data/`); thứ nằm trên kênh chung chỉ là chỗ gặp nhau. Mất nó không mất dữ liệu ⇒ thiết kế được phép ưu tiên **báo lỗi rõ ràng** hơn là chống mọi tranh chấp.
    - **Kênh chung chỉ có ĐÚNG MỘT kho chính** (thêm tối đa một bản lùi), **mọi máy ghi vào chính nó**, và **ghi là NỐI THÊM**. Series-theo-máy, ghi đè nguyên gói, hay đống file rải rác đều **trái điều này**. *(SỬA ĐỔI 2026-08-30, user chốt: kho chính = **MỘT DÃY KHÚC tuần tự** — khúc đầy thì niêm phong, mọi máy nối vào khúc CUỐI. Vế cũ "một file duy nhất" bị thay vì đo được nó chính là thứ làm kênh đơ: Drive không upload delta, nối 0,3 MB vào file 2 GB là re-upload cả 2 GB, 10–20 lượt/ngày ≈ 20–40 GB — DriveFS treo cứng 2 lần/giờ ngày 30/08. Ý gốc GIỮ NGUYÊN: vẫn một kho logic duy nhất, vẫn cấm series-theo-máy / ghi đè / rải rác; dãy khúc là thứ tự TOÀN CỤC chung mọi máy, không phải mỗi máy một file. Spec: `plan/08 §8e`.)* *(SỬA ĐỔI 2026-09-13, user chốt: **bất biến là TẬP KHỐI, KHÔNG phải thứ tự byte.** Vế cũ *"dãy khúc là thứ tự TOÀN CỤC chung mọi máy"* chỉ đứng được khi có **một chỗ chung** để mọi máy cùng nối vào (Drive). Kênh máy-tới-máy (`plan/24`) **không có chỗ chung nào**: mỗi máy giữ dãy khúc trên đĩa thật CỦA NÓ, nhận khối của máy kia rồi nối vào khúc đang mở của MÌNH ⇒ hai máy lệch nhau về thứ tự byte nhưng **cùng một tập khối**, và merge vốn dedup theo chữ ký khối nên vẫn hội tụ. **Ý gốc GIỮ NGUYÊN:** vẫn một kho logic duy nhất · mọi khối phải tới mọi máy · ghi vẫn là NỐI THÊM · khối đã niêm phong vẫn bất biến. **Vế cấm "series-theo-máy" KHÔNG bị nới** — nó cấm nhiều BẢN SAO của cùng một kho nằm cạnh nhau trên một kênh chung (đo 2026-08-12: 667 MB trùng lặp cho một kho đã hội tụ); dãy khúc cục bộ không phải bản sao thứ hai, nó LÀ kho của máy đó. **Phép kiểm thay cho "thứ tự khớp": tập chữ ký khối của hai máy phải BẰNG NHAU** — `plan/24 §6` phép ⑤ và ⑦ đo đúng điều đó. Spec: `plan/24 §4`.)*
    - **Cả gói đã mã hoá bằng chìa share** ⇒ **KHÔNG được lấy "cho an toàn" làm lý do bỏ bớt lớp nào**. Lý lẽ an toàn ở đây là thừa, và cái giá phải trả rơi đúng vào mục tiêu tối cao (điều 15: chất lượng truy hồi).
    - *Vì sao thành điều khoản: trong MỘT phiên (2026-08-12) agent đi sai **bốn lần** đúng những điểm này — series theo máy (13 file/2,9 GB cho cùng một kho) · định ghi đè nguyên gói mỗi lượt · bỏ 11.233 tin không-uuid (đẩy 3,9 giờ nhúng lại sang máy mới) · bỏ 7.381 cửa sổ phụ vì "chỉ 2,6%". Mẫu số chung: **agent tự thêm ràng buộc an toàn/đơn giản mà user không đặt**. Đặc tả đầy đủ ở `plan/08 §8.0`.*

- **Chốt máy:** `vector-ship`/`vecship-chunks` · `delta-own-host` · `rule-gates ⑫` (ratchet `channelPen(` → 0 sau khi gộp kênh)
