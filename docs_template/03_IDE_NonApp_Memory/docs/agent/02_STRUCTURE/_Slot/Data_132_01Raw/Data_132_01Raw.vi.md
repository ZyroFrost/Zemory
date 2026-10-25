---
version: 6
lang: vi
---
# Data_132_01Raw 01_raw — đầu vào từ ngoài, chỉ đọc

- Vai trò: ĐẦU VÀO từ ngoài (người gửi · kéo từ nguồn) cho một case — không dựng lại được nếu xoá.
- Được chứa / không chứa: CHỈ ĐỌC, không ghi đè (`Rule_Gate_10_DestructiveOps`); làm sạch trên bản chép ở `02_processing/`.
- Ba chặng của một case có ba vòng đời: `01_raw` bất khả đảo · `02_processing` xoá thoải mái, dựng lại được · `03_output` giữ để đối chiếu.
- Khoá máy: khai glob `data/*/01_raw` vào khoá `protected` của marker (một glob phủ mọi case, kể cả case mới).
