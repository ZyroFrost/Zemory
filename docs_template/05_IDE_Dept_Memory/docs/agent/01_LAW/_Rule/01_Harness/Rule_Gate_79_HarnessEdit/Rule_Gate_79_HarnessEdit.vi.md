---
version: 7
lang: vi
---
# Rule_Gate_79_HarnessEdit — Changing HS needs the requester's approval; a law whose breach cannot be undone needs a machine check

## Luật là gì
HS (`docs_template/_Store`) và các file harness không luật nào khác giữ (`docs/plan/`, `AGENTS.md`, `CLAUDE.md`) chỉ đổi khi người
dùng đã cho phép đúng thay đổi đó trong phiên. Luật áp cho phiên của MỌI repo, không riêng phiên zemory: repo tự sửa phần chung
trên HS (`Rule_Gate_83_HarnessFromStore` bước 3a) và hỏi trước. Trong repo, bốn thư mục harness theo
`Rule_Gate_83_HarnessFromStore`: repo không bao giờ sửa bản chép.

## Khi nào áp
- Agent sắp tạo, sửa, xoá hay dời bất kỳ thứ gì trong HS, trong `docs/plan/`, hoặc `AGENTS.md` / `CLAUDE.md`.
- Viết một luật mới mà vi phạm thì không đảo được.

## Phải làm gì
1. Chỉ sửa các file đó sau khi người dùng đã cho phép đúng thay đổi đó trong phiên này.
2. Không tự tạo, gộp, bãi bỏ hay đánh lại số luật, điều, slot, skill, kệ, lớp; hỏi một câu kèm đề xuất, và không để đề xuất nằm
   trong sổ chờ duyệt.
3. Câu agent tự viết vào plan hay luật không phải quyết định của người dùng; không dùng làm căn cứ cho thay đổi khác.
4. Luật mà vi phạm không đảo được (bí mật vào commit, ghi vào đường cấm, push chưa xin) phải có chốt máy chặn lúc xảy ra; chữ một
   mình không đủ. Cách chọn và dựng chốt: `Skill_Harness_RuleGate`.

## Ví dụ
- Tình huống: agent thấy HS "nên có" thêm một kệ để chứa file khởi đầu của một bộ mẫu.
- ✗ Sai: tạo kệ mới, dời vài luật vào archive cho gọn, ghi lý do vào plan rồi báo đã làm "theo plan".
- ✓ Đúng: thử xếp vào phần có sẵn trước; vẫn cần ⇒ đề xuất và chờ; chỉ sửa HS khi người dùng đã cho phép đúng việc đó.

## Máy kiểm
- Guard chặn mọi lần ghi vào HS và các file harness kể trên khi chưa có cờ dùng một lần `.allow-docs-write`; cờ chỉ tạo khi người
  dùng đã cho phép.
