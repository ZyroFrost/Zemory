---
id: Rule_70
aka: 02-70
name: moi-lan-push-mot-lan
version: 1
kind: content
---
# Rule_Gate_70_MoiLanPushMotLan MỖI LẦN PUSH = MỘT LẦN LÊN VERSION — agent TỰ QUYẾT SỐ theo bảng ba cột dưới đây

- `02-70` **MỖI LẦN PUSH = MỘT LẦN LÊN VERSION — agent TỰ QUYẾT SỐ theo bảng ba cột dưới đây** *(user chốt 2026-10-14: "số giờ có luật rõ ràng, ko còn mơ hồ nữa nên có thể tự quyết" — thay vế "SỐ do USER chốt" 2026-08-05)*. Push là mốc phát hành: trước khi đẩy, agent ① kiểm file sạch (gate/lint những gì chạy được, `git status` không lọt data/secret) + rà `05_TODO` còn gì phải đóng, ② **chọn số theo bảng** (hỏi *"user báo cái gì"*, không hỏi *"mã đổi nhiều cỡ nào"*), ③ bump `package.json` + commit + push trong cùng một mốc. KHÔNG push với số cũ. Vẫn phải HỎI: force-push · xoá tag/nhánh trên remote. <!-- gate: guard -->
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
