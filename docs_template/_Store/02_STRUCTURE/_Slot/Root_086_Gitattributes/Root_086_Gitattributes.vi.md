---
version: 6
lang: vi
---
# Root_086_Gitattributes .gitattributes — eol + LFS

- Vai trò: eol + LFS (manifest do tool ép ở gốc). Nhị phân nặng (deliverable `.pbix`/`.fig`…, bundle `*.enc`) đi qua LFS.
- Khoá kiểu xuống dòng: `* text=auto eol=lf`, đặt TRƯỚC các dòng LFS (dòng sau đè dòng trước). Repo chưa khoá thì sửa file theo `Rule_Gate_24_EolKeep`.
- Launcher giữ CRLF: `*.cmd text eol=crlf` · `*.bat text eol=crlf` ngay sau dòng `text=auto` — cmd.exe đọc launcher LF sai (dòng `rem`
  bị cắt, dòng sau chạy thành lệnh). Thiếu hai dòng này ⇒ `conform` › `slot-gate` báo, `zemory sync` đưa vào sổ việc của repo.
