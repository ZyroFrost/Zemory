<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# zemory — TODO / Backlog
> `[ ]` chưa làm · `[~]` đang làm · xong → ghi sang `06_CHANGES.md` (sửa file trực tiếp) và xoá khỏi đây.
> Lịch sử việc đã xong: `archive/05_TODO.md` (ngoài bộ đọc mỗi phiên, tra bằng `zemory plan search`).

## 🔵 BÀN GIAO 2026-08-26 — ĐỌC MỤC NÀY TRƯỚC

**SỔ TRỐNG — 0 mục mở.** Dưới đây là TRẠNG THÁI đã ĐO.

### Phiên này làm gì (số đo đầy đủ: `06_CHANGES [2026-08-26]`)
Vá **3 lỗ của `guard.cjs`** do repo phòng ban báo về, rồi **lan ra 9 repo `PBI_*`**:
- **Khớp TOKEN ở VỊ TRÍ LỆNH** thay vì khớp chuỗi ở bất kỳ đâu — hết cảnh `echo "… git push …"`
  bị chặn (dính 3 lần trong một phiên thật). Ngoại lệ bắt buộc: interpreter (`bash -c` · `node -e`
  · `python -c`) thì nội dung trong nháy CHÍNH LÀ lệnh ⇒ soi cả câu.
- **Soi GHI/DỜI qua LỆNH**: chuyển hướng `>`/`>>` · `mv`/`cp` · payload interpreter. Trước đây
  `checkWrite` chỉ chạy cho tool Write/Edit nên ghi bằng shell/script thì không ai soi.
- **`mv` ra khỏi protected** nay bị coi như xoá (hậu quả y hệt, chỉ khác tên thao tác).
- **Sửa câu mô tả flag ở 6 chỗ** — flag bị ĐÓNG DẤU chứ không xoá ngay; 90 giây cho ĐÚNG lệnh đó
  thử lại; xin việc khác thì thu hồi.

### Trạng thái máy lúc chốt (ĐO, không nhớ)
- **zemory 2.7.0**. `origin/main` = `da0a300` (bản guard **487 dòng**).
- 🔴 **CÒN LỆCH: đĩa + 9 repo đang là bản 491, git mới có 487.** Bốn file chưa commit:
  `guard-gen.ts` · `docs/hooks/guard.cjs` · `docs_template/cowork/nonapp/hooks/guard.cjs` ·
  `docs_template/cowork/BOOTSTRAP.md` (manifest 487→491).
- **9/9 repo `PBI_*`** đã nhận guard **491 dòng**, khớp từng byte với bản zemory, nghiệm thu
  **8/8 ca** mỗi repo bằng marker của CHÍNH repo đó. `policy.json` mỗi repo chỉ đổi 1 dòng.
  **KHÔNG commit ở repo nào ngoài zemory** — diff để phiên bên đó xem.
- Daemon đang chạy (autostart BẬT). Kho local ~299k tin.

### Việc đầu tiên của phiên sau
1. **Xem gate cho bản 491** (`npm run check`, phải tắt daemon trước). Xanh ⇒ **commit + push** để
   git bắt kịp 9 repo. Đây là việc DUY NHẤT còn bắt buộc.
2. Nếu gate đỏ: bản 491 chỉ khác 487 ở **một điều kiện** trong nhánh interpreter (bỏ yêu cầu token
   phải có dấu `/`) + manifest. Đường lùi là `git checkout docs/hooks/guard.cjs` rồi chạy lại
   `zemory hook guard`.

### Bẫy đã trả giá trong phiên này — đừng dẫm lại
· **Sửa guard là phải cập nhật MANIFEST đếm dòng** của bộ cowork (`BOOTSTRAP.md` dòng 26). Dính
  hai lần: 359→487 rồi 487→491, mỗi lần một lượt gate đỏ.
· **Nghiệm thu đa-repo phải dựng ca từ marker CỦA TỪNG REPO.** Dùng marker của một repo áp cho
  mọi repo ⇒ báo "6 repo trượt" trong khi guard hành xử đúng; và che mất lỗ `.vault` thật.
· **Lỗ chỉ hiện trên cấu hình của người khác:** nhánh interpreter đòi token có dấu `/` nên đường
  protected là TÊN TRẦN (`.vault` · `attic`) thì lọt — 7/9 repo dính, zemory không dính.
· **Probe phải chạy đúng CWD.** Chạy guard với cwd = zemory làm đường dẫn tương đối giải về repo
  khác ⇒ probe báo "bản mới cũng lọt", sai hoàn toàn.
· **Đột biến phải tiêm được mới tính.** Escape trong template literal của máy sinh (`\$`) vừa làm
  lint đỏ vừa dễ làm regex sinh ra sai — đọc bản ĐÃ SINH rồi mới tin.

## ⭐ NGÃ RẼ RECALL — "còn cách nào nữa không" (dựng 2026-08-23 để trả lời câu user sẽ hỏi)

> Xếp theo **dư địa đo được**, không theo cảm giác. Ba thứ đã LOẠI bằng số ở cuối — đừng đề xuất lại.

*(Mục ① CỔNG "KHÔNG BIẾT" đã ĐÓNG 2026-08-24 — đo xong, qua cổng, **user chốt BẬT MẶC ĐỊNH**;
xem `06_CHANGES [2026-08-24i]` + `plan/17 §1.3b`. Hai hướng BỊ BÁC bằng số, đừng đề xuất lại:
`margin` là gánh nặng · độ đồng thuận giữa lane cộng thêm đúng số không. Còn hở có chủ đích:
4/28 ca âm vẫn lọt ở dải 0,806–0,839 — bịt nốt phải hạ θ xuống mức bắt đầu ăn vào câu thật.)*

## 📌 Việc còn MỞ tách ra từ các khối đã đóng (tách 2026-08-23 lúc chốt phiên)

> Bốn mục dưới đây nằm LẪN trong ba section `## ✅` đã xong. Archive cả khối là **nuốt việc**, nên
> tách ra đây rồi mới dời phần đã xong đi. Ngữ cảnh gốc của từng mục vẫn tra được ở
> `archive/05_TODO.md` (`zemory plan search`).

*(Mục "ÁP CHUẨN MỚI LÊN TOÀN BỘ REPO CŨ" đã ĐÓNG 2026-08-24 — chạy xong cả 9 repo, xem
`06_CHANGES [2026-08-24e]`. Ghi chú còn giá trị: 2 dòng đăng ký skill (`04_SKILLS`+`AGENTS`)
sync KHÔNG tự thêm (file-wins) — `conform` bên đó sẽ nhắc, agent bên đó tự thêm.)*

## 🆕 Phát sinh 2026-08-07 tối (sau release 1.2.0) — **0 việc mở**

*(Mục "CHẠY 5 FILE TEST CÒN MÙ" đã ĐÓNG 2026-08-15 — gate đầy đủ **670/670 · 0 fail · 0 skipped**,
tức cả 5 file đó chạy thật. Dời nguyên văn sang `archive/05_TODO.md` ngày 2026-08-25 khi audit bắt
được nó vẫn nằm trong sổ: `zemory archive` KHÔNG nhặt được vì nó viết dạng gạch ngang chứ không
phải ô `[x]`/`✅` ở đầu mục. Bài học còn giá trị: **"audit xanh" ≠ "đã soi hết"** — ba lượt audit
07/08 cố ý bỏ nhóm test nhúng để không tranh CPU với job embed, và điều đó phải được NÓI RA.)*
*(Biển cấm "separator của index" đã DỜI về nhà vĩnh viễn 2026-08-24 — `02_RULES §Luật khi VIẾT`,
dòng `Separator của INDEX`. Nó là LUẬT nổ lúc viết code, không phải việc chưa làm, nên không còn
chiếm một dòng `[ ]` mà mọi phiên phải đọc rồi soát lại.)*
*(Mục "Cổng bundle ĐÃ RỜI KHỎI MÁY chưa" đã ĐÓNG 2026-08-24 — build xong `uplinkguard`, xem
`06_CHANGES [2026-08-24f]`. Bài học giữ lại: chữ trong log client — `user-paused`, "Syncing is
paused" — KHÔNG đủ kết luận; thứ đáng tin là HÀNG ĐỢI + ĐỊNH DANH trong sổ của client.)*
## Quyết định mở / cần chốt
*(Mục "Zemory tự đổi model/agent theo việc lớn·nhỏ" đã ĐÓNG 2026-08-24 — **user chốt BỎ**, theo
hướng (b): để CLI/agent tự lo, zemory không đụng. Nguyên văn lý do, giữ vì nó là một RANH GIỚI
kiến trúc chứ không phải một cái tick: *"second brain nó phải nằm bên project A.I Center; t sợ mở
quá nhiều ở zemory thì nó ko còn là hệ RAG nữa, nó thành AI ops"*. Ai định mở lại hướng này thì
đọc câu đó trước.)*

## Phase 2 — Năng lực nặng
*(Mục #12 "Memory promotion" đã ĐÓNG 2026-08-24 — `zemory memory promote` ship đúng cơ chế đã
hình dung: phát hiện lặp → xếp hạng → trình user, user gật agent mới ghi; xem `06_CHANGES
[2026-08-24h]`. Việc dùng nó là NGHI THỨC định kỳ: chạy `promote`, duyệt danh sách với user.)*
*(Mục #13 "Quét & ingest BỘ NHỚ CURATED" đã ĐÓNG 2026-08-24 — adapter `claude-code-memory`
ship, 3 câu "Cần chốt" chốt bằng thiết kế có lý do, xem `06_CHANGES [2026-08-24g]`. Vế còn để
ngỏ có chủ đích: Codex/Cursor adapter khi có nhu cầu · global `~/.claude/CLAUDE.md` · recall
xếp curated cao hơn — vế cuối phải qua corpus có nhãn, để cặp với #12.)*
