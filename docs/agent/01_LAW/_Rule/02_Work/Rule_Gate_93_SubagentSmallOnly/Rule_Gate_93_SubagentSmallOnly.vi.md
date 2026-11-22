---
version: 1
lang: vi
---
# Rule_Gate_93_SubagentSmallOnly — The main session does the work; a subagent takes only a small errand

## Luật là gì
Phiên mà người dùng đang trò chuyện tự làm việc. Subagent (công cụ Agent, agent chạy nền, workflow) chỉ nhận việc vặt nhỏ, tốn ít
token và không cần ngữ cảnh lớn. Subagent không bao giờ đọc lại thứ phiên chính đã nạp: template, chuẩn, spec, file lớn. Đọc lại là
trả lại trọn ngữ cảnh đó một lần nữa, còn người dùng ngồi chờ mà không thấy tiến độ.

## Khi nào áp
- Trước khi gọi một subagent, một agent chạy nền hay một workflow.

## Phải làm gì
1. Hỏi trước: việc này có cần đọc nhiều file, đọc trọn một file, hay một brief dài mới hiểu được không? Có ⇒ phiên chính tự làm.
2. Subagent hợp với: một lần tra có đích đã biết · một lệnh ra output dài mà chỉ cần kết luận · các phép kiểm nhỏ độc lập, không cần
   thứ phiên chính đang giữ.
3. Brief giao subagent chỉ nêu đích và câu hỏi; không bao giờ bảo subagent đọc chuẩn, template hay spec mà phiên chính đã có.
4. Người dùng gọi đích danh subagent hay workflow cho một việc lớn ⇒ được chạy một lần: cờ một lần `.allow-agent`, chỉ tạo sau lời
   yêu cầu đó trong phiên.

## Ví dụ
- Tình huống: chép giao diện từ một template đã duyệt; phiên chính đã đọc template 180 KB và chuẩn thiết kế.
- ✗ Sai: gọi một agent chạy nền với brief nêu 18 file và bảo nó chép giai đoạn 1 — nó đọc lại template và chuẩn, chạy một giờ
  mà không hiện gì.
- ✓ Đúng: phiên chính tự chép giai đoạn 1, hiện từng bước; subagent nhiều nhất là đo một trang bằng bộ kiểm rồi trả về con số.

## Máy kiểm
- Hook guard: lời gọi `Agent` · `Task` · `Workflow` mà brief nêu từ 5 file trở lên, bảo đọc trọn file, hoặc dài từ 4.000 ký tự bị
  chặn; cờ một lần `.allow-agent` cho qua một lần.
- Matcher của guard phủ `Agent|Task|Workflow` (`zemory doctor` báo đỏ repo có cấu hình host thiếu chúng).
- Ví dụ cổng trong `gate.json` chạy lại một brief lớn (bị chặn) và một việc vặt nhỏ (cho qua).
