---
frame: Cons_Gate_15_DataLifecycle
status: written
---
# Vòng đời dữ liệu

## Không bao giờ xoá
Phiên và tin trong GM — chỉ `zemory memory forget` tường minh, có chạy thử và bản sao lưu (điều 11).

## Chỉ ghi thêm
Khúc kênh chung trên Drive (điều 16) · `05_CHANGES.md` · nhật ký daemon (`Rule_Gate_71_LogNeverDeleted`).

## Cache
Được cache: model weight (tải lúc chạy, không vào git — điều 2), lớp dẫn xuất (FTS · vector · graph). Không bao giờ cache: share.key
ngoài `data/` của máy, nội dung chưa redact.

## Thời hạn giữ
- Bản sao lưu GM tự chụp — 2 bản mới nhất (điều 19).
- Thư mục tạm của zemory — dọn sau 6 giờ (đợt dọn tạm của daemon).
- Thư mục nháp của phiên — tối đa 5 file (`Rule_Gate_04_ScratchFiles`).
