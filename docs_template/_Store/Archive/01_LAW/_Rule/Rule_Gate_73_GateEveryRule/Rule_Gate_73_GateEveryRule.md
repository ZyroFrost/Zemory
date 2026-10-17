---
id: Rule_73
aka: 02-73
name: gate-every-rule
version: 3
kind: content
---
# Rule_Gate_73_GateEveryRule Mỗi luật được phân loại rồi dựng chốt máy; chữ chỉ là tầng cuối

- Viết hoặc nhận một luật ⇒ phân loại theo câu hỏi: lúc vi phạm, máy nhìn thấy gì?
  1. **Hành động trên tool** — xoá · push · ghi ngoài repo · SQL vào máy chủ · sửa đường cấm · lệnh git huỷ việc ⇒ nhánh guard `PreToolUse` soi `tool_name` + lệnh/đường dẫn. Việc được phép một lần ⇒ cờ `.allow-*` (`Rule_Gate_56_AllowFlagOnce`).
  2. **Nội dung đang ghi** — EOL · tên file/định danh · chính tả/ngôn ngữ · câu trích lời · mục mới trong sổ · SQL viết tại chỗ:
     - hook `PreToolUse` trên Write/Edit, chỉ soi phần THÊM (dòng đã có không tính);
     - file vào git ⇒ pre-commit;
     - khuôn của file docs ⇒ `zemory validate`;
     - cây thư mục ⇒ `zemory conform`;
     - bất biến của mã ⇒ test trong cổng `npm run check`.
  3. **Phán đoán · lời nói** — hỏi khi chưa rõ · chưa xác minh · trình thiết kế trước · hiện từng bước ⇒ không có lời gọi tool để móc: vào `## Lõi`. Có cửa nhận ra được (lời nhắn khớp từ khoá · ghi vào `frontend/` · chạy script gửi mail) ⇒ thêm câu nhắc (`UserPromptSubmit`) hoặc đòi đọc skill (trigger của `read-first`).
- Mỗi chốt:
  - một file `<số luật>_<tên>.cjs` trong `<nhà harness>/hooks/`;
  - câu chặn nêu số luật và nguyên văn luật;
  - có ca DƯƠNG, ca ÂM (thứ trông giống mà phải cho qua) và phá mã cho test đỏ (`Rule_Gate_13_TestRed`);
  - chính hook lỗi ⇒ cho qua (fail-open).
- Luật riêng của repo ⇒ cổng của repo: lệnh khai ở khoá marker `repoGates` (pre-commit chạy) hoặc test trong cổng.
- Có chốt rồi ⇒ dời luật ra khỏi `## Lõi`, gắn `<!-- gate: … -->`.
- Phép kiểm: `zemory gates` báo luật thiếu dấu · luật lõi mang dấu · lõi vượt trần.

## Ví dụ

- Tình huống: nhóm muốn thêm luật "không ghi địa chỉ IP nội bộ vào file đưa lên git".
- ✗ Sai: chỉ thêm một dòng chữ vào bộ luật và tin agent sẽ nhớ.
- ✓ Đúng: hỏi lúc vi phạm máy thấy gì — đây là nội dung đang ghi ⇒ dựng hook soi phần thêm và pre-commit, có ca chặn, ca phải cho qua và thử phá mã cho test đỏ; xong thì dời luật khỏi lõi, gắn dấu cổng.
