---
id: Rule_29
aka: 02-29
name: code-language
version: 9
kind: judgment
---
# Rule_Gate_29_CodeLanguage Mã và tên viết tiếng Anh

- Mã · script · pipeline · measure: comment · docstring · tên biến/hàm · log kỹ thuật · output CLI và script phụ ⇒ tiếng Anh. Một file một ngôn ngữ. Commit message: tiếng Anh hoặc tiếng Việt có dấu.
- Định danh và tên (biến · hằng · hàm · lớp · kiểu · tham số · khoá config/JSON · tên test · tên file · tên thư mục · tên nhánh git) ⇒ ASCII tiếng Anh.
- Không dịch: chuỗi render cho người đọc (nhãn giao diện · nhãn báo cáo · mô tả bảng/cột sinh vào docs) · tên do bên khác đặt (cột nguồn · trường API · tên file nguồn), giữ từng ký tự · thuật ngữ chuyên ngành.
- Comment tiếng Việt cũ: sửa khi đang đụng file đó, không mở đợt dịch hàng loạt.
- Lối đúng: viết lại comment bằng tiếng Anh · đổi tên file hoặc định danh sang ASCII tiếng Anh.
- Phép kiểm: hook chặn dòng comment mới có chữ Việt, và tên file/định danh mới không phải ASCII tiếng Anh; máy soi `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`

## Ví dụ

- Tình huống: sửa một hàm tính doanh thu trong script nạp dữ liệu.
- ✗ Sai: thêm comment "tinh doanh thu theo thang", đặt file `thieu-dong-dim.csv`, đổi tên cột nguồn `Ma_KH` thành `customer_code` cho đẹp.
- ✓ Đúng: comment "Compute monthly revenue", file `missing-dim-row.csv`; tên cột do hệ nguồn đặt giữ nguyên.
