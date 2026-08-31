---
name: adopt
description: Nhận một repo CÓ SẴN cấu trúc riêng vào harness mà KHÔNG nắn repo — đọc cây thật, đề xuất bảng ánh xạ slot, chờ người duyệt, rồi khoá vào .harness.json. Dùng khi repo là của bên thứ ba / làm nhóm / có CI-import khoá cứng theo tên folder, hoặc khi `conform` báo cấu trúc gốc đã đổi.
---

# Nhận repo có sẵn (hệ ADAPT)

Ta nắn **harness theo repo**, KHÔNG nắn repo. Kết quả của quy trình này là một **bảng ánh xạ đã
được người duyệt và khoá lại** — từ đó `conform` mới có cái để gác.

## ⛔ Ba điều làm hỏng cả hệ — đọc trước

1. **KHÔNG đổi tên / dời / xoá bất kỳ folder nào của repo.** Thấy cấu trúc "xấu" → ghi vào
   `05_TODO`, không tự sửa. Đổi tên một folder là phá import, CI, pre-commit, và tài liệu của
   người khác.
2. **KHÔNG khoá bảng khi chưa có người duyệt.** Nếu chuẩn tự uốn theo bất cứ thứ gì nó nhìn thấy
   thì `conform` thành lời nói vòng — luôn xanh, không gác gì. Bước duyệt CHÍNH LÀ thứ biến bản
   mô tả thành một cái cổng.
3. **KHÔNG ép một folder vào slot "gần đúng".** Không khớp thì cho vào `extra`. Ánh xạ sai còn
   tệ hơn không ánh xạ: nó khiến agent sau này sửa nhầm chỗ và tin là mình làm đúng chuẩn.

## Bước 1 — HỎI USER: APP hay NON-APP?

**ĐỪNG tự đoán.** Hệ ADAPT chỉ bỏ phần *ép tên folder*; nó KHÔNG bỏ câu hỏi profile.

- **APP** — có code CHẠY do mình phát triển (UI / server / CLI). Áp luật của hệ APP (có luật UI).
- **NON-APP** — sản phẩm / tài sản; agent chỉ đọc · dò · kéo · điền · xuất FILE. **0 luật UI**,
  thay bằng luật deliverable / tasks / data.

Repo lai (có cả pipeline nghiên cứu lẫn ý định dựng app) là **chỗ dễ đoán sai nhất** — càng phải
hỏi. Hỏi một câu, đợi trả lời, rồi mới đi tiếp.

## Bước 2 — ĐỌC cây thư mục THẬT

Chỉ **cấp 1 và cấp 2**. Không đọc nội dung file — nhận vai trò bằng tên + vài dấu hiệu rẻ:

- file khai báo gói ở gốc (`package.json` · `pyproject.toml` · `go.mod` · `pom.xml`…) → biết ngôn ngữ
- `.github/` · CI config · pre-commit → **đường khoá cứng, tuyệt đối không đụng**
- file `.md` ở gốc → tài liệu sẵn có của repo, **không được đè**

Ghi lại cây đó nguyên trạng trước khi diễn giải. Diễn giải sai thì còn quay lại được.

## Bước 3 — ĐỀ XUẤT bảng ánh xạ, in ra cho user

In đủ ba phần, không rút gọn:

```
BẢNG ÁNH XẠ ĐỀ XUẤT — chưa khoá, chờ duyệt

slot            →  đường thật        vì sao
<slot>          →  <đường/>          <một câu>
…

extra (repo có, từ điển không có — giữ nguyên):
<đường/>        <nó là gì>          <vì sao không vào slot nào>

harness sẽ THÊM (chỉ những đường này, không đụng gì khác):
AGENTS.md · CLAUDE.md · <docs-dir>/agent/ · <docs-dir>/plan/ · .claude/skills/
```

**Xử lý trùng tên** — trước khi in, kiểm từng đường harness:

| tình huống | xử lý |
|---|---|
| repo đã có `docs/` với nội dung riêng | vẫn dùng `docs/agent/` + `docs/plan/` (thư mục con, không đụng file sẵn có) — nhưng **phải nói rõ trong bản đề xuất** |
| repo đã có `docs/agent/` hoặc `docs/plan/` | **đổi đường harness** qua `.harness.json` → `"docs": "docs/<tên-khác>"`. KHÔNG đè |
| repo đã có `AGENTS.md` / `CLAUDE.md` | **DỪNG, hỏi user.** Đây là file chỉ đường của agent khác — đè là cướp quyền điều hướng |
| repo đã có `.claude/skills/<trùng tên>` | giữ của repo, báo user, **không đè** |

**Nêu cả thứ mình KHÔNG chắc.** Folder tên mơ hồ (`common/` `misc/` `tmp/` `old/`) → đưa vào
`extra` kèm dấu hỏi, để user quyết. Đoán bừa rồi khoá lại là cách chắc nhất để sai lâu dài.

## Bước 4 — Chờ DUYỆT, rồi mới KHOÁ

Chỉ khi user duyệt:

1. Ghi `docs/.harness.json`:
```jsonc
{
  "profile": "app",            // hoặc "nonapp" — theo bước 1
  "layout": "foreign",         // BẮT BUỘC: nói cho conform biết đây là repo cấu trúc riêng
  "docs": "docs/agent",        // đổi nếu trùng
  "slots": { "<slot>": "<đường/thật>" },
  "extra": ["<đường/>"]
}
```
2. Điền §3 của `03_STRUCTURE.md`: bảng thật + **ngày khoá** + **tên người duyệt**. Xoá hết khung mẫu.
3. Ghi một mục vào `06_CHANGES`: nhận repo ngày nào, profile gì, ánh xạ ra sao, **và những chỗ
   còn chưa chắc**.
4. Chạy `zemory conform` — phải xanh. Đỏ ngay lúc này nghĩa là bảng sai, sửa bảng chứ đừng nới cổng.

## Về sau — cấu trúc gốc đổi thì `conform` đỏ

Đó là **tin tốt**: repo của người khác thì nó sẽ đổi, và cổng báo đúng lúc. Xử lý: đọc lại cây →
cập nhật §3 + `.harness.json` → ghi một dòng `06_CHANGES` nói cấu trúc gốc đổi ra sao.

**Đừng tắt cổng. Đừng nới bảng cho khỏi đỏ.** Nới một lần là từ đó cổng không còn nghĩa gì.
