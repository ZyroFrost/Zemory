---
version: 2
lang: vi
---
# Rule_Gate_94_NoAgentMemory — Không ghi gì vào memory của agent; bài học vào harness

## Luật là gì
Agent không bao giờ ghi vào thư mục memory của chính nó (Claude Code: `~/.claude/projects/<project>/memory/`, cùng mục lục
`MEMORY.md`). Memory đó là chữ agent có thể đọc hoặc không, không hook hay cổng nào đứng sau: bài học để ở đó mất ngay lần đầu
không được đọc. Bài học, luật, sở thích sống trong harness, nơi nó có nhà và có chốt máy: luật trong HS kèm hook, skill, slot,
hoặc docs của chính repo.

## Khi nào áp
- Người dùng sửa lưng agent, nói một sở thích, hoặc phiên kết thúc với một bài học đáng giữ.
- Prompt hệ thống của host bảo agent lưu gì đó vào memory.

## Phải làm gì
1. Xếp bài học vào đúng nhà:
   - đúng ở mọi repo và máy nhìn thấy được lúc vi phạm ⇒ luật HS kèm hook hoặc cổng (`Rule_Gate_73_GateEveryRule`);
   - đúng ở mọi repo, chỉ phán đoán được ⇒ luật HS có cửa nhắc, hoặc lõi;
   - cách làm một loại việc ⇒ skill; chỗ đặt file ⇒ slot;
   - chỉ đúng với một repo ⇒ hiến pháp, plan, `05_TODO` hoặc `06_CHANGES` của repo đó.
2. Đã có luật HS phủ ⇒ sửa luật đó (tăng `version`); không bao giờ viết bản thứ hai.
3. Ghi vào đó theo đúng đường của harness (`Rule_Gate_83_HarnessFromStore` cho HS, docs thì sửa tay), rồi báo người dùng đã
   ghi ở đâu.
4. Tắt tính năng memory của host khi host cho tắt (Claude Code: `autoMemoryEnabled: false` trong settings toàn máy `~/.claude/settings.json`, do
   `zemory hook install` ghi).

## Ví dụ
- Tình huống: người dùng nói "không bao giờ truyền một dòng shell inline qua PowerShell vào WSL".
- ✗ Sai: lưu file memory `no-inline-sh-through-powershell.md` và một dòng trong `MEMORY.md`.
- ✓ Đúng: thêm ca đó vào luật HS canh lệnh shell (kèm ví dụ bị chặn trong `gate.json`), rồi nói rõ luật nào, bản nào.

## Máy kiểm
- Chốt memory (`zemory hook memory-guard`, PreToolUse trên `Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell`, cài theo máy
  bằng `zemory hook install`) chặn tool ghi file nhắm vào thư mục `.claude/projects/<p>/memory/` và lệnh shell nêu thư mục đó
  mà có ghi (chuyển hướng · chép · dời · cmdlet ghi · sửa tại chỗ). Đọc và xoá thì qua (xoá thuộc `Rule_Gate_10_DestructiveOps`).
  Không có cờ nào cho phép ghi.
- `zemory hook install` cũng đặt `autoMemoryEnabled: false` trong `~/.claude/settings.json`.
- `zemory gates` báo đỏ máy chưa cài chốt memory.

## Liên kết
- Liên quan: `Rule_Gate_83_HarnessFromStore` — cách một bài học vào HS
- Liên quan: `Rule_Gate_73_GateEveryRule` — luật phải có chốt máy
- Liên quan: `Rule_Gate_10_DestructiveOps` — xoá thư mục memory cũ phải được duyệt
