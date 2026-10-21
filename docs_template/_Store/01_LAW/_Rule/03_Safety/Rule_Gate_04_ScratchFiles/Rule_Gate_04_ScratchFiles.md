---
id: Rule_4
aka: 02-4
name: scratch-files
version: 10
kind: judgment
code: 03_Safety
---
# Rule_Gate_04_ScratchFiles — A scratch file has a way out

## What
Anything made to do the work but not delivered (a probe script · measurement data · intermediate data · a downloaded model · a
screenshot · a draft · a trial copy · a copy kept to compare) lives in the session's scratch folder outside the repo, and is
deleted once used. A session keeps at most 5 scratch files at a time.

## When
- About to create a file that is not part of what the repo delivers.
- Writing code (test · script · tool) that creates a temporary folder.

## Do
1. Put the file in the session's scratch folder, outside the repo.
2. A tool forces it inside the repo (it insists on a path · the script needs that working folder) ⇒ name it `_scratch_*` and delete
   it in the same turn; deleting a `_scratch_*` path needs no flag (`Rule_Gate_10_DestructiveOps`).
3. A tool that breaks on long paths (the Windows path-length limit cuts files silently) ⇒ the copy may sit in a short folder at
   the drive root outside every repo; ask first (`Rule_Gate_44_RepoScope`) and delete it when done.
4. Done with a scratch file ⇒ delete it now. About to pass 5 ⇒ delete an old one before creating a new one. Anything kept must be
   small and say why it is kept.
5. Adding a pattern to `.gitignore` is not cleaning: the file is still on disk and still grows.
6. Code that creates a temporary folder names it `_scratch_<name>-` and deletes it in `finally` / `after`, also on error or cancel. The test runner gathers the
   temporary folders of every child process under one parent folder per run and deletes it at the end.

## Example
- Situation: a session tries out a model: downloads it, takes screenshots, exports a few measurement tables to compare.
- ✗ Wrong: leave everything "in case", or add the folder to `.gitignore` so `git status` looks clean; weeks later the disk is full
  and nobody knows where the files came from.
- ✓ Right: every scratch file sits in the session's scratch folder, each is deleted as soon as it is used, never more than five
  at once.

## Check
- A hook blocks a new file in the session's scratch folder once it already holds 5 files (no flag).
- The pre-commit check blocks `_scratch_*`.
- The number of folders in the system temp folder is the same before and after a test run.

## Luật là gì
Thứ tạo ra để làm việc mà không giao đi (script dò · dữ liệu đo · dữ liệu trung gian · model tải về · ảnh chụp · bản nháp · bản thử
· bản sao để so) nằm trong thư mục nháp của phiên, ngoài repo, và xoá khi dùng xong. Một phiên giữ tối đa 5 file nháp cùng lúc.

## Khi nào áp
- Sắp tạo một file không thuộc thứ repo giao đi.
- Viết mã (test · script · công cụ) có tạo thư mục tạm.

## Phải làm gì
1. Đặt file trong thư mục nháp của phiên, ngoài repo.
2. Công cụ ép nằm trong repo (đòi đúng đường dẫn · script cần đúng thư mục làm việc) ⇒ đặt tên `_scratch_*` và xoá trong cùng
   lượt; xoá đường `_scratch_*` không cần cờ (`Rule_Gate_10_DestructiveOps`).
3. Công cụ hỏng với đường dài (giới hạn độ dài đường dẫn của Windows cắt file lặng lẽ) ⇒ bản sao được đặt ở thư mục ngắn ở gốc ổ,
   ngoài mọi repo; hỏi trước (`Rule_Gate_44_RepoScope`) và xoá khi xong.
4. Dùng xong một file nháp ⇒ xoá ngay. Sắp vượt 5 ⇒ xoá file cũ trước khi tạo file mới. Thứ giữ lại phải nhỏ và nói rõ giữ vì gì.
5. Thêm pattern vào `.gitignore` không tính là đã dọn: file vẫn nằm trên đĩa và vẫn lớn lên.
6. Mã tạo thư mục tạm đặt tên `_scratch_<tên>-` và tự xoá ở `finally` / `after`, kể cả khi lỗi hay bị huỷ. Bộ chạy test gom thư mục tạm của mọi tiến trình con
   vào một thư mục cha của lượt chạy và xoá khi xong.

## Ví dụ
- Tình huống: một phiên thử nghiệm mô hình: tải mô hình về, chụp ảnh màn hình, xuất vài bảng số đo để so.
- ✗ Sai: để mọi thứ lại "biết đâu cần", hoặc thêm thư mục vào `.gitignore` cho `git status` sạch; vài tuần sau ổ đĩa đầy mà không
  ai biết các file đó đến từ đâu.
- ✓ Đúng: mọi file nháp nằm trong thư mục nháp của phiên, dùng xong file nào xoá ngay file đó, không bao giờ quá năm file cùng lúc.

## Máy kiểm
- Hook chặn tạo file mới trong thư mục nháp của phiên khi thư mục đó đã có 5 file (không có cờ vượt).
- Pre-commit chặn `_scratch_*`.
- Số thư mục trong thư mục tạm của hệ thống trước và sau một lượt chạy test bằng nhau.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_10_DestructiveOps` — deleting goes through approval · xoá phải được duyệt
- Related · Liên quan: `Rule_Gate_44_RepoScope` — a folder outside the repo · thư mục ngoài repo
- Related · Liên quan: `Skill_PBI_Pbip` — the long-path case of report files · ca đường dài của file báo cáo
