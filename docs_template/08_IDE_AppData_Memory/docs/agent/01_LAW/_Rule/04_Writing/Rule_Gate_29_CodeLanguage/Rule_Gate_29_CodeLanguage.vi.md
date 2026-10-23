---
version: 12
lang: vi
---
# Rule_Gate_29_CodeLanguage — Code and names are written in English

## Luật là gì
Mã, script, pipeline và measure viết bằng tiếng Anh: comment, docstring, log kỹ thuật, output CLI. Định danh và tên là ASCII tiếng
Anh. Chữ hiển thị cho người đọc và tên do hệ khác đặt thì không dịch.

## Khi nào áp
- Viết hay sửa mã · script · pipeline · measure.
- Đặt tên biến · hằng · hàm · lớp · kiểu · tham số · khoá config/JSON · test · file · thư mục · nhánh git.

## Phải làm gì
1. Comment · docstring · log kỹ thuật · output của CLI và script phụ ⇒ tiếng Anh. Một file một ngôn ngữ. Commit message: tiếng Anh,
   hoặc tiếng Việt có đủ dấu.
2. Định danh và tên ⇒ ASCII tiếng Anh.
3. Không dịch: chuỗi hiển thị cho người đọc (nhãn giao diện · nhãn báo cáo · mô tả bảng/cột sinh vào docs) · tên do hệ khác đặt
   (cột nguồn · trường API · tên file nguồn), giữ từng ký tự · thuật ngữ chuyên ngành.
4. Comment tiếng Việt cũ: sửa khi đang đụng file đó; không mở đợt dịch hàng loạt.

## Ví dụ
- Tình huống: sửa một hàm tính doanh thu trong script nạp dữ liệu.
- ✗ Sai: thêm comment "tinh doanh thu theo thang", đặt file `thieu-dong-dim.csv`, đổi tên cột nguồn `Ma_KH` thành `customer_code`
  cho đẹp.
- ✓ Đúng: comment "Compute monthly revenue", file `missing-dim-row.csv`; cột do hệ nguồn đặt tên giữ nguyên.

## Máy kiểm
- Hook chặn dòng comment mới có chữ Việt, và tên file hay định danh mới không phải ASCII tiếng Anh.
- Soát cả repo: `node .claude/skills/harness-audit/scripts/lang-scan.mjs .`
