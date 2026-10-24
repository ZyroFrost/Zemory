---
version: 7
lang: vi
---
# Scripts_128_Scripts scripts — tự động hoá: kéo / điền / upload, và dựng máy riêng của repo

## Vai trò

- **Tự động hoá ba động tác**: kéo · điền · publish/upload — script MỎNG, agent gọi, dùng chung nhiều case. Tự động hoá
  publish / refresh nằm ở đây; bản render ra `exports/`.
  - AGENT là thứ làm ba động tác; zemory chỉ nhớ và giữ kỷ luật (ghi việc đã làm vào Global Memory), không tự gọi LLM, không
    tự đi kéo file. Mỗi động tác = một script mỏng ở đây + một playbook ở `.claude/skills/task-pull/` · `fill/` · `upload/`
    (đăng ký `03_SKILLS`); playbook giữ công thức: kéo nguồn nào, điền mẫu nào, đẩy đi đâu.
  - KÉO: đọc `sources/` → bản thô về `data/extract/`; thông tin đăng nhập lấy từ `.env` / `config/`, không bao giờ nhập mật
    khẩu vào zemory (nguồn web: mượn phiên đăng nhập trên trang thật). ĐIỀN: `templates/` + số từ `data/` / `measures/` →
    `reports/` hoặc `exports/`. UP: đẩy deliverable / bản xuất lên đích (workspace BI · Drive · SharePoint) qua `scripts/` hoặc
    bước upload của pipeline.
- **Dựng và vận hành máy / dịch vụ riêng của repo**: script chạy một lần hay hiếm khi, cài hoặc cấu hình thứ repo chạy trên đó
  (máy chủ cơ sở dữ liệu, ổ dữ liệu, một dịch vụ), hoặc chạy chuỗi `models/`. Luật:
  - kiểm trước khi đổi: mỗi bước nhìn trạng thái hiện tại trước, nên chạy lần hai thì bỏ qua phần đã xong;
  - lỗi phải lộ: bước đầu tiên hỏng là dừng cả lượt với mã thoát khác 0;
  - không bí mật, không địa chỉ nội bộ trong file: truyền vào lúc chạy, hoặc đọc từ `.env` / `data/secrets/`;
  - đầu file ghi cách chạy (chạy ở đâu, bằng tài khoản nào).
- Mọi động tác tự động phải lần lại được (task / lượt chạy → `05_CHANGES` / `04_TODO`).
- Gốc repo sạch: script để ở `scripts/`.

## Không chứa

Code ngoài clone về (→ `external/`) · script của riêng một case (→ `tasks/<case>/pipeline/`) · chính chuỗi cơ sở dữ liệu
(→ `models/`; script ở đây chỉ CHẠY chuỗi).

## Phép kiểm

Chưa có phép kiểm máy.
