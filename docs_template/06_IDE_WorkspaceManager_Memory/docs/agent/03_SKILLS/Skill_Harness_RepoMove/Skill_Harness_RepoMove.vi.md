---
version: 2
lang: vi
---

# harness-repo-move — đổi tên hay dời một repo

> Skill này chỉ đổi CHỖ và TÊN của cả repo, giữ nguyên ruột. Rút từ đợt đổi `_DB_AppCore` → `_DB_ERP` (22/10).

**Vì sao không gộp vào phần có sẵn:**
- `Skill_Harness_Reshape` nắn NỘI DUNG repo lên một bộ của HS (luật · skill · slot); đường của repo không đổi.
- `Skill_Harness_Reconcile` dời FILE lạc chỗ bên trong repo; không đụng thư mục gốc, phiên hay bộ nhớ.
- `Skill_Harness_Adopt` nhận repo có cấu trúc riêng vào harness; không dời gì.
- `Skill_Harness_SessionClose` ghi sổ cuối phiên; không sửa tệp phiên.
- `Rule_Gate_44_RepoScope` chỉ chặn việc ghi ngoài repo và đòi lời người dùng; không nói cách dời, cách trỏ lại phiên cũ,
  cách nghiệm thu. Skill này thi hành luật đó cho một loại việc cụ thể.

## 0. Trước khi chạm repo

- Tên mới do người dùng quyết, nói trong chính phiên làm việc. Lời nói ở phiên khác không thay được: dời repo là ghi ngoài
  repo của phiên đang làm (`Rule_Gate_44_RepoScope`).
- Không phiên agent hay editor nào còn mở repo đó — Windows khoá thư mục đang mở. Phiên đứng TRONG repo không dời được chính
  nó ⇒ một phiên ở repo KHÁC làm.
- `git status` của repo sạch; ghi lại commit cuối để đối chiếu sau khi dời.
- Liệt kê nơi trỏ vào đường cũ: `docs/.harness.json` của các repo khác · cấu hình ngoài repo (SSH · tác vụ hẹn giờ · deploy ·
  bản trên máy ảo) · tài liệu của repo khác. Chỉ liệt kê và báo; tài liệu BÊN TRONG repo bị dời là việc của phiên sau của chính nó.

## 1. Dời

1. Chạy thử, không ghi gì: `zemory project move "<đường cũ>" "<đường mới>"`. Đọc bảng xem trước: thư mục · thư mục phiên
   Claude · bộ nhớ (phiên · tài liệu · sổ thay đổi) · registry.
2. Bảng đúng ⇒ cùng lệnh thêm `--apply`.

## 2. Trỏ lại các phiên cũ

Lệnh dời chỉ đổi tên thư mục phiên; các dòng bên trong tệp phiên vẫn mang đường và tên cũ.

- Sao lưu các tệp `~/.claude/projects/<thư mục phiên mới>/*.jsonl` trước khi sửa (gộp thành một tệp nén — giới hạn tệp tạm,
  `Rule_Gate_04_ScratchFiles`).
- Đếm trước: mỗi trường cấu trúc có bao nhiêu giá trị chứa tên cũ.
- Chỉ sửa trường CẤU TRÚC, theo từng giá trị JSON, không thay chuỗi mù trên cả dòng:
  - `cwd` · `trackingPath`: mọi đời đường cũ của repo (kể cả đường trước các lần dời trước, khác hoa thường ổ đĩa) → đường mới,
    giữ phần đuôi sau tên repo.
  - `customTitle` · `agentName`: tên phiên theo khuôn `<repo>_<Model>_<d-m-yyyy>`, giữ đúng ngày cũ.
- Giữ nguyên: nội dung hội thoại (lịch sử thật) · dòng `cwd` trỏ repo KHÁC (lúc phiên đứng ở repo khác) · phiên chưa có tên.
- Không dùng đề xuất của `zemory peers --fix` khi nó ghép tên repo mới đè lên tên phiên cũ (đã gặp 22/10:
  `_DB_ERP_Claude_DB_AppCore_Claude_21-10-2026`). Dòng không đổi thì ghi lại nguyên từng byte.

## 3. Nghiệm thu — đủ cả bảng, thiếu một dòng là chưa xong

| Phép đo | Đạt khi |
|---|---|
| Thư mục | mới có, cũ không còn |
| Git | `git log -1` đúng commit đã ghi ở bước 0 · `git status` sạch |
| Chuẩn | `zemory conform --gate` chạy TỪ thư mục mới ⇒ mã 0 |
| Tệp phiên | số trường đã sửa = số đếm trước · 0 trường cấu trúc còn tên cũ · 0 dòng hỏng JSON |
| Tên phiên | `zemory peers --all --check` không còn báo lệch khuôn cho repo mới |
| Chạy thật | người dùng mở lại một phiên cũ thấy chạy bình thường ⇒ xoá bản sao lưu |

## 4. Báo

- Bảng nghiệm thu bằng số · danh sách nơi còn trỏ đường cũ (bước 0) và ai sửa.
- Lỗ của công cụ bắt được trong lúc dời ⇒ ghi vào sổ việc của Zemory.

## Ngoài phạm vi

- Đổi tên DB hay dịch vụ đi kèm repo — việc riêng, theo giờ chuyển người dùng chốt.
- Sửa tài liệu bên trong repo bị dời · nắn cấu trúc bên trong repo (`Skill_Harness_Reshape` · `Skill_Harness_Reconcile`).

## Cấm

- Dời khi repo còn phiên hoặc editor mở.
- Thay chuỗi tên cũ trên toàn dòng tệp phiên (đụng cả lịch sử hội thoại).
- Xoá bản sao lưu tệp phiên trước khi người dùng mở lại được phiên cũ.

## Implements · Thi hành luật
- `Rule_Gate_44_RepoScope` — moving a repo writes outside the working repo · dời repo là ghi ngoài repo đang làm
- `Rule_Gate_01_DoneMeansRun` — done only with the acceptance table measured · xong khi đã đo đủ bảng nghiệm thu
