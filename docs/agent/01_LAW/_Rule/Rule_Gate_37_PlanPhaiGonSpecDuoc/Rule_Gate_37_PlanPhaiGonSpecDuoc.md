---
id: Rule_37
aka: 02-37
name: plan-phai-gon-spec-duoc
version: 1
kind: content
---
# Rule_Gate_37_PlanPhaiGonSpecDuoc PLAN PHẢI GỌN — spec được tra theo vùng và đọc trọn mỗi lần sửa

- `02-37` **PLAN PHẢI GỌN — spec được tra theo vùng và đọc trọn mỗi lần sửa** (user chốt 2026-10-08, từ một repo kho dữ liệu: plan 12.800 dòng, đọc hết rồi nén context, đọc lại không xuể). Plan chỉ giữ **hướng ĐÃ CHỐT hiện tại + điểm còn mở**; lịch sử ("làm ngày nào", "trước đây là X") là việc của `06_CHANGES`. Đổi hướng ⇒ sửa TẠI CHỖ thành hướng mới, lý do ghi ở CHANGES. **Plan là văn bản NGƯỜI viết để bàn và chốt thiết kế — không máy sinh nào ghi vào `docs/plan`, kể cả MỘT KHỐI trong file** (user chốt 2026-10-08: *"plan đúng là phải full text… plan là bàn và chốt thiết kế mà"*): mục lục · catalog · bảng tra do build sinh ⇒ ghi ra file cạnh nguồn sinh ra nó, plan chỉ trỏ link. **Sơ đồ cây thư mục · bảng cấu trúc · khối mũi tên kiến trúc · `mermaid` do agent hoặc người viết thẳng khi bàn thiết kế là PHẦN CHÍNH của plan — giữ, cứ vẽ tay, KHÔNG cần script**; luật chỉ cấm ĐẦU RA của script build nằm trong plan, không bao giờ là lý do xoá sơ đồ hay né không vẽ. `zemory validate` báo LỖI khi gặp dấu khối máy sinh (`<!-- AUTOGEN` · `AUTOGEN:` · tiêu đề "SINH TỰ ĐỘNG" · "MÁY SINH … ĐỪNG SỬA TAY"). Mỗi mục `05_TODO` gắn `→ plan/NN §mục` để dẫn đường. Trần: một spec ~1.000 dòng (gọt không mất ý thì spec lớn nhất còn ~700) · `zemory validate` cảnh báo khi vượt (khoá `thresholds.plan_spec_lines`). Cả `docs/plan` không có trần: không phiên nào đọc trọn thư mục — spec được tra bằng `plan search`, hoặc mở đúng `plan/NN §mục` mà câu báo của cổng/hook dẫn tới; sửa một spec ⇒ đọc trọn spec đó. <!-- gate: validate -->
