<!-- SINH RA lúc NHẬN REPO. Khung do template cấp; phần §3 do agent điền từ cây thư mục THẬT. -->
# Cấu trúc repo — hệ ADAPT (repo có cấu trúc RIÊNG có sẵn)

> **File này KHÁC hai bản `03_STRUCTURE` kia ở một điểm cốt tử.**
> - `03_STRUCTURE` của **APP** và **NON-APP** *QUY ĐỊNH* repo phải trông thế nào (`backend/` · `frontend/` … ), rồi `conform` ép repo về đó.
> - File này *MÔ TẢ* repo đang trông thế nào, rồi **KHOÁ** bản mô tả đó lại, và `conform` gác **thực tế so với bản đã khoá**.
>
> Dùng khi repo **đã có cấu trúc riêng và KHÔNG được nắn** — repo của bên thứ ba, repo làm nhóm,
> repo có build/CI/import khoá cứng theo tên folder. Ta nắn **harness theo repo**, không nắn repo.

## 0. Luật tối cao của hệ ADAPT — đọc trước, đừng bỏ

1. **KHÔNG đổi tên, KHÔNG dời, KHÔNG xoá bất kỳ folder nào đang có của repo.** Đổi tên một folder
   là phá đường import, CI, pre-commit, và mọi tham chiếu trong tài liệu của người khác. Nếu thấy
   cấu trúc repo "xấu" — **ghi nhận xét vào `05_TODO`, KHÔNG tự sửa.**
2. **Chỉ được THÊM** những đường mà harness cần, và chúng phải nằm ở chỗ **không đụng gì**:
   `AGENTS.md` · `CLAUDE.md` · thư mục harness (mặc định `docs/agent/`, đổi được qua
   `.harness.json`) · `docs/plan/` · `.claude/skills/`. Trùng tên với thứ có sẵn → **đổi đường
   harness, KHÔNG đổi thứ của repo.**
   **Mọi tên file/folder MÌNH thêm viết bằng tiếng Anh ASCII thuần** — KHÔNG ngôn ngữ bản địa (cả
   có dấu lẫn mất dấu), KHÔNG ký tự ngoài ASCII; chỗ hay vi phạm nhất là `docs/plan/NN_tên.md`.
   NỘI DUNG bên trong vẫn theo `02_RULES §Ngôn ngữ` — luật này chỉ nói về TÊN. Lý do: tên bị gõ
   lại trong lệnh·import·link·URL, dấu vỡ theo encoding và ký tự đồng hình (`с` Cyrillic vs `c`
   Latin) làm ref chết không nhìn ra. Tên CÓ SẴN của repo thì để yên — đó là điều 1 ở trên.
3. **Bảng ánh xạ ở §3 phải được NGƯỜI DUYỆT rồi mới khoá.** Đây là chỗ dễ hỏng nhất của cả hệ:
   nếu chuẩn tự uốn theo bất cứ thứ gì nó nhìn thấy thì `conform` thành **lời nói vòng** —
   "repo tuân thủ đúng cái repo đang là", luôn xanh, **không gác gì cả**. Một cổng không thể
   đỏ thì không phải cổng. Vì vậy: **đọc → đề xuất → người duyệt → khoá → từ đó mới gác.**
4. **Cái gì nắn, cái gì KHÔNG BAO GIỜ nắn:**
   | | nắn theo repo? |
   |---|---|
   | `01_CONSTITUTION` — bất biến, TỐI CAO | **KHÔNG.** Nó nói về *cách làm việc*, không về tên folder |
   | `02_RULES` · skill · kỷ luật `05_TODO`/`06_CHANGES` | **KHÔNG** |
   | Chỗ đặt harness | cấu hình được (`.harness.json` → `docs`) |
   | **File này (`03_STRUCTURE`)** | **CHỈ mình nó** |

## 1. Từ điển slot — KHÔNG chép về đây

Từ điển tên slot là **một bản duy nhất**, nằm trong zemory (`03_STRUCTURE` của hệ APP §3 và của
hệ NON-APP). Repo này **KHÔNG sao chép nó**. Ở đây chỉ có **bảng dịch**: slot ↔ đường thật.

Vì sao: chép từ điển về là tạo bản sao thứ hai của chuẩn — sửa luật một chỗ, các bản kia trôi
lệch, và không ai biết bản nào đúng (phạm điều 3: một nguồn cho một lớp). Bảng dịch thì rẻ,
sửa cục bộ, và không bao giờ mâu thuẫn với chuẩn gốc.

## 2. Nhận repo — quy trình BỐN bước

> Quy trình đầy đủ (kèm cách đọc cây, cách xử lý trùng tên, cách viết bản đề xuất) nằm ở
> `.claude/skills/adopt/SKILL.md`. Dưới đây là bộ xương để không ai làm tắt.

1. **HỎI USER: profile là APP hay NON-APP?** — ĐỪNG tự đoán. Hệ ADAPT không thay thế câu hỏi này,
   nó chỉ bỏ phần *ép folder*. Profile vẫn quyết định luật nào áp (APP có luật UI; NON-APP có 0
   luật UI, thay bằng luật deliverable/tasks).
2. **ĐỌC cây thư mục THẬT** — chỉ cấp 1 và cấp 2, đủ để nhận vai trò. Không đọc nội dung file.
3. **ĐỀ XUẤT bảng ánh xạ** — in ra cho user duyệt. Slot nào không có thì **bỏ trống, đừng bịa**;
   folder nào của repo không khớp slot nào thì cho vào `extra`, **đừng ép nó vào một slot gần đúng**.
4. **KHOÁ** — ghi vào `docs/.harness.json` rồi điền §3 bên dưới. Từ giờ `conform` gác theo nó.

## 3. Bảng ánh xạ ĐÃ KHOÁ — agent điền mục này lúc nhận repo

> **CHƯA NHẬN REPO:** mục này còn nguyên khung dưới đây. Đừng đọc nó như sự thật.
> **ĐÃ NHẬN REPO:** thay toàn bộ khung bằng bảng thật + ngày khoá + tên người duyệt.

```
TRẠNG THÁI: ☐ chưa nhận repo   ☐ đã khoá ngày <YYYY-MM-DD>, người duyệt <ai>
```

| slot (từ điển zemory) | đường THẬT trong repo | ghi chú |
|---|---|---|
| `<slot>` | `<đường/thật/>` | *(vì sao ánh xạ như vậy — một câu)* |

**`extra` — folder repo có mà từ điển không có** (giữ nguyên, `conform` biết là hợp lệ):

| đường thật | nó là gì | vì sao không ánh xạ vào slot nào |
|---|---|---|
| `<đường/>` | | |

**Đường harness đã thêm** (chỉ những thứ ta tạo, để ai cũng biết cái gì là của zemory):

| đường | |
|---|---|
| `AGENTS.md` · `CLAUDE.md` | chỉ đường |
| `<docs-dir>/agent/` | harness docs |
| `<docs-dir>/plan/` | thiết kế |
| `.claude/skills/` | quy trình |

## 4. Tra "thứ này nằm đâu"

Đọc §3 từ **phải sang trái**: có đường thật → biết nó đóng vai trò slot nào → tra luật của slot
đó trong từ điển gốc (zemory). Ngược lại, cần sửa một concern → tìm slot trong từ điển → đọc §3
để biết trong repo này nó nằm ở đâu.

**Không thấy slot cần dùng trong §3** ⇒ repo chưa có concern đó. Tạo mới thì:
① đặt vào chỗ **hợp với quy ước ĐANG CÓ của repo**, không phải quy ước zemory;
② thêm một dòng vào §3;
③ ghi vào `06_CHANGES`. Bỏ bước ② là `conform` đỏ — đúng như mong muốn.

## 5. `conform` gác gì ở hệ này

- Mọi đường khai trong §3 / `.harness.json` **phải tồn tại** → không thì bảng đã lỗi thời.
- Mọi folder cấp 1 của repo **phải được khai** (ở `slots` hoặc `extra`) → có folder mới mà không
  ai khai = cấu trúc đang trôi, phải cập nhật bảng có ý thức.
- Các file harness bắt buộc phải có mặt.
- **KHÔNG** đòi `backend/` `frontend/` — đó là chuẩn của hệ APP, không áp ở đây.

## 6. Khi repo gốc đổi cấu trúc

Repo là của người khác (hoặc của nhóm) nên nó **sẽ** đổi. Lúc đó `conform` đỏ, và đó là **tin
tốt** — nó báo đúng lúc. Xử lý: đọc lại cây → cập nhật §3 + `.harness.json` → ghi một dòng vào
`06_CHANGES` nói cấu trúc gốc đã đổi ra sao. **Đừng** tắt cổng, **đừng** nới bảng cho khỏi đỏ.
