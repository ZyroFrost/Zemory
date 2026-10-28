---
name: session-close
description: Close out a work session correctly - route everything that happened into the right file so the next session can pick up where this one stopped. Use when the user asks to write things down, log progress, wrap up, or says the context is running out or they are switching sessions. Vietnamese triggers - "note lại", "docs lại", "ghi sổ", "chốt phiên", "sắp hết context", "đổi session", "mở phiên mới", "tổng kết lại".
---

# session-close — chốt phiên / ghi sổ

> Kích hoạt (luật cứng, `02_RULES §Chốt phiên`): user nói "note lại" · "docs lại" · "ghi sổ" · "chốt phiên" · "sắp hết context / đổi session / mở phiên mới" — hoặc bất kỳ cách nói nào mang nghĩa **kết sổ phiên này để phiên sau đọc tiếp**.

**TUYỆT ĐỐI không ghi docs theo trí nhớ tóm tắt.** Ghi theo tóm tắt = mất chi tiết, và cái mất luôn là cái phiên sau cần nhất.

**Global Memory là NGUỒN THẬT của phiên — trí nhớ trong context thì KHÔNG.** Khi context bị tóm tắt/trim, chi tiết phiên vẫn còn NGUYÊN trong episodic memory (DB); cái bạn "nhớ" trong context đã bị lược. Đây là GỐC của "đổi session là sót/lệch". Nên **mọi lần ghi docs / audit / báo cáo — nhất là khi ĐỔI SESSION — BẮT BUỘC dò Global Memory + đối chiếu code THẬT để verify TRƯỚC khi khẳng định bất cứ điều gì.**

**Bước 0 — DÒ GLOBAL MEMORY + VERIFY (bắt buộc, KHÔNG skip, làm TRƯỚC Bước 1):**
0. **`zemory memory scan` TRƯỚC `digest`** — phiên ĐANG CHẠY chưa nằm trong GM tới khi được scan; bỏ bước này thì `digest` trả thiếu/rỗng và phần đầu phiên đã bị nén khỏi context mất luôn. Scan xong GM vẫn thiếu ⇒ đọc thẳng transcript gốc của phiên (Claude Code: `~/.claude/projects/<repo>/<session>.jsonl`). *Đo 2026-10-02 (`Dept_CTL`): một quyết định user chốt giữa phiên rơi mất, sổ chỉ còn câu nói 3 phút trước đó — câu đã bị chính quyết định kia thay.*
1. `zemory memory digest <session>` + `zemory memory search "<chủ đề phiên>" [--all]` → dựng lại ĐẦY ĐỦ việc/đổi/quyết định/lỗi của phiên, kể cả đoạn đã trôi khỏi context.
2. **Verify từng mục sắp ghi vào docs với NGUỒN THẬT** = GM (điều đã thực sự làm/nói/quyết) + code/file THẬT (đọc lại dòng liên quan). Chỉ mục SỐNG SÓT verify mới được ghi; claim chưa verify = KHÔNG ghi.
3. **SOÁT `05_TODO` = ĐO LẠI, không đọc rồi chép** (`02_RULES §Hành xử`, luật áp **MỌI LÚC** — chốt phiên chỉ là một trường hợp): mỗi mục là một KHẲNG ĐỊNH VỀ TRẠNG THÁI. **BA NGUỒN, chạy ĐỦ CẢ BA cho MỌI mục — không chọn nguồn theo loại mục**: ① **mã** (grep/đếm) · ② **Global Memory** (`memory search --all`, lọc lời USER — quyết định hay nằm ở phiên khác, thậm chí **repo khác**) · ③ **chạy thật** (gọi endpoint · truy nguồn sống · mở app nhìn · đọc log tiến trình đang chạy). Chỉ khi **cả ba khớp** mới kết luận; lệch ⇒ **cái mới hơn thắng** (lời user CÓ HẠN DÙNG, có thể bị việc làm sau đó supersede). Nguồn nào không chạm được ⇒ ghi "chưa xác minh được" kèm nguồn đã thử, KHÔNG mặc định "chưa làm", KHÔNG lấy 2 nguồn còn lại làm đủ. Mục quá 7 ngày = NGHI NGỜ. **Đo 2026-08-05: soát 58 mục ra 11 sai (~19%)** — mục đã build vẫn mang `[ ]`, mục agent tự bịa vì thấy triệu chứng rồi phán nguyên nhân.
4. **Áp CẢ cho audit / báo cáo lỗi:** mỗi finding phải đối chiếu code + GM trước khi gọi là "lỗi thật" — phần lớn false-positive đến từ đọc code thiếu ngữ cảnh hoặc không biết quyết định lịch sử. Bẫy thật đã gặp: tên file cũ trong entry changelog CŨ là **BẢN GHI LỊCH SỬ**, KHÔNG phải link gãy cần sửa (sửa = vi phạm luật supersede); chuỗi English có thể là **thuật ngữ kỹ thuật GIỮ NGUYÊN**, KHÔNG phải leak i18n. KHÔNG tin kết quả subagent chưa tự kiểm lại.

**Bước 1 — ĐỌC LẠI ĐỦ 3 nguồn TRƯỚC khi ghi:**
1. **FULL phiên hiện tại** — đọc lại từ ĐẦU hội thoại, kể cả đoạn đã bị tóm tắt/trôi khỏi context (dùng `zemory memory digest <session>` / `memory search` để moi lại). Rút ra: đã LÀM gì · đã ĐỔI gì · QUYẾT ĐỊNH gì · còn DỞ gì · phát hiện LỖI gì chưa sửa.
2. **FULL `docs/plan/*`** — mọi file, để biết việc vừa làm có đụng/lệch spec nào không.
3. **FULL `docs/agent/*`** — `01_CONSTITUTION` · `02_RULES` · `03_STRUCTURE` · `04_SKILLS` · `05_TODO` · `06_CHANGES`, để biết chỗ nào phải cập nhật và không ghi trùng cái đã có.
4. **FULL spec của MỌI case/task đã đụng trong phiên** (vd `tasks/<case>/spec.md`) — cả thân lẫn khối khai báo đầu file (`status` · `updated` · `evidence` · `run_at`…). Quyết định riêng của một case sống ở đó, KHÔNG ở `docs/plan`. *Đo 2026-10-02 (`Dept_CTL`): bỏ qua file này ⇒ spec còn ghi "chưa dựng pipeline" sau khi pipeline đã chạy, giữ bảng lịch đã huỷ, ghi sai máy chạy.*

**Bước 2 — định tuyến từng thứ về đúng file, KHÔNG BỎ SÓT:**

| Thứ phát sinh trong phiên | Ghi vào |
|---|---|
| Việc đã xong / đã sửa code | `06_CHANGES.md` (sau khi user OK) **và xoá khỏi** `05_TODO.md` |
| Việc còn dở (ĐANG làm, user đã biết) | `05_TODO.md` — nêu rõ `[~]`, **đã tới đâu, bước kế tiếp là gì** |
| Việc PHÁT SINH / ý cho phiên sau | **BÁO trong phiên, hỏi trước khi ghi** — cửa vào ở `02_RULES` §Sổ việc `05_TODO`. Không gật ⇒ không có dòng nào |
| Thiết kế / quyết định thay đổi | `docs/plan/NN_*.md` (+ supersede ở changelog nếu đảo quyết định cũ) |
| Quyết định / trạng thái của MỘT case | spec của case đó (vd `tasks/<case>/spec.md`) — thân + khối khai báo (`updated` đổi cùng lượt); câu cũ bị thay thì sửa/gạch, KHÔNG để hai câu ngược nhau cùng sống |
| Luật / bất biến riêng phát sinh | **HỎI user ngay trong phiên**, gật thì ghi thẳng vào đúng nhà (`01`/`02`) — KHÔNG tự sửa `01_CONSTITUTION.md`, và KHÔNG đậu vào `05_TODO` chờ duyệt (vế đó đã BÃI BỎ) |

**Chuẩn "không bỏ sót":** mọi việc ĐÃ LÀM trong phiên phải tìm được ở CHANGES **hoặc** TODO — không việc nào chỉ nằm trong đầu rồi mất theo phiên. Chẩn đoán sai · đường cụt · thứ đã thử mà không xong: gộp vào **entry CHANGES của chính việc đó** (một hai dòng "đã loại X vì Y"), KHÔNG đẻ mục `05_TODO` riêng. *"Không bỏ sót" nói về việc ĐÃ LÀM — nó KHÔNG phải giấy phép ghi mọi thứ nghĩ ra vào sổ; cửa vào của sổ ở `02_RULES` §Sổ việc `05_TODO`.*

**Đảo một quyết định cũ?** Mệnh đề `> 🔄 **Supersede:**` phải nêu ĐÚNG khoá ngày của entry bị thay (`2026-07-29l`) — máy chỉ nối được khi có khoá đó, và nối rồi thì ai tra trúng entry CŨ mới thấy nhãn “⚠ ĐÃ BỊ THAY”. Viết trống ngày ⇒ quyết định chết vẫn hiện như đang sống (`02_RULES §Changelog`).

**Bước 3 — TỰ DỌN hai file sổ (bắt buộc, đừng chờ ai nhớ gõ lệnh):**

Chạy `zemory archive` ngay sau khi ghi. Nó làm hai việc KHÁC NHAU, đúng bản chất từng file:
- **`05_TODO.md` — KHÔNG có ngưỡng.** Mọi mục đã xong — dấu `[x]` **hoặc** `✅`, `archive` nhận cả hai
  (bản vá 2026-08-21: trước đó nó chỉ biết `[x]` nên **chưa bao giờ nhặt được mục nào** ở repo viết
  `✅`, và sổ phình tới 2.327 dòng trong khi lệnh báo *"nothing to do"* mỗi lần) — chuyển sang `docs/archive/05_TODO.md`
  ngay, vì một mục đã xong là **đặt sai chỗ kể từ giây nó xong**. (Đo 2026-07-29: gác bằng ngưỡng kích
  thước là lý do 107 mục đã xong nằm lại chiếm **46%** một file vốn được nạp MỌI phiên.)
  **Dạng dấu máy dời (3.6.0):** dòng `- [x]` · `- ✅` · `N. [x]`, và khối có tiêu đề `## [x]` (dời NGUYÊN khối tới tiêu đề cùng cấp kế tiếp). `✅` trên mục đánh số / tiêu đề, và khối đóng mà bên trong còn `[ ]`/`[~]`, thì máy CHỈ BÁO (danh sách *"NOT moved"*), không dời. Đọc từng dòng báo: xong thật thì đổi sang `[x]` rồi chạy lại. Số khối bàn giao `archive` đếm phải về 1 (chỉ khối của phiên này).
- **`06_CHANGES.md` — có trần.** Entry **cũ nhất** chuyển đi, giữ bản mới nhất tại chỗ; ngưỡng khai
  trong `docs/.harness.json` (`thresholds.changes_lines`/`changes_keep`).

**Chép NGUYÊN VĂN, KHÔNG tóm tắt** — archive là để TRA LẠI. Cả hai tầng được reindex nên mục vừa chuyển
tra được ngay (`zemory changelog search` · `zemory memory search`).

**Bước 3b — DỌN NHỮNG GÌ PHIÊN BỎ LẠI (bắt buộc; luật `02_RULES` *".gitignore là GIẤU, không phải DỌN"*):**
Chốt phiên là chỗ DUY NHẤT chắc chắn chạy cuối phiên, nên phép dọn đặt ở đây. Agent để rác ra xa ngoài repo: script trong thư
mục nháp, thư mục tạm trên ổ dữ liệu, bản sao lưu chụp trước khi sửa, cờ duyệt, tiến trình đã mở, chỗ sửa ở repo khác. *Đo 28/10
trong một phiên: một thư mục tạm ở cấp workspace, một compose override và hai bản sao lưu phiên ngoài repo, thư mục nháp chạm trần
hai lần, hai cờ đã dùng sót ở repo khác, một lượt cổng tự chạy lại ở nền, 44 chỗ sửa chưa commit ở 17 repo khác — phép quét ba mục
cũ không thấy cái nào.* Bảng đầy đủ là `Skill_Harness_SessionClose` v22 Bước 3b ở HS; tóm tắt để chạy:

**Biết thứ nào là của phiên:** transcript của phiên (`~/.claude/projects/<repo>/<session>.jsonl`: mọi Write · Edit · `New-Item` ·
`mkdir` · `Copy-Item` · đích `tar`/`cp`, mọi tác vụ `run_in_background`) hoặc `zemory memory digest <session>`. Đường do phiên tạo
thì phiên dọn; thứ khác trông như rác thì BÁO, không xoá theo phỏng đoán. Chạy đủ mọi dòng, in số từng dòng — 0 là kết quả, im
lặng thì không:

| # | Thứ gì | Rồi làm gì |
|---|---|---|
| ① | file lạ trong repo: untracked ngoài gitignore hợp lệ; `_scratch_*` · `.tmp*` · `*.bak` · `*.orig` · `*.rej` | của phiên ⇒ xoá; trông như sản phẩm ⇒ hỏi user |
| ② | thư mục nháp của phiên (`<tmp>/claude/<repo>/<session>/scratchpad`) | xoá mọi thứ đã dùng xong; file giữ lại ghi vì sao (`02-4`) |
| ③ | thứ phiên tạo NGOÀI repo (thư mục tạm · compose override · bản chép · file tải về) | xoá; cái nghiệm thu còn cần thì giữ, nêu tên + điều kiện xoá |
| ④ | bản sao lưu chụp trước khi sửa (`*.tar` · `*.zip` · `*.bak`) | nghiệm thu qua ⇒ xoá; chưa ⇒ giữ và nêu tên |
| ⑤ | cờ duyệt `.allow-*` (`docs/hooks` · `docs/.harness-state`) ở repo này và mọi repo phiên đã ghi | xoá cờ đã dùng hoặc hết hạn |
| ⑥ | tiến trình, tác vụ nền: `run_in_background` · monitor · dev server · lượt test · container chạy một lần (`docker ps -a`) | dừng cái đã xong; cái còn cần thì nêu đang chờ gì |
| ⑦ | chỗ sửa còn ở repo khác (`git status --short` từng repo phiên đã ghi) | file của phiên ⇒ commit ở đó `--only <đường>` sau khi kiểm diff; lẫn việc của repo đó ⇒ báo phiên repo đó |
| ⑧ | rác git: nhánh · stash · worktree phiên tạo | đã gộp/bỏ ⇒ gỡ; còn việc ⇒ nêu tên |
| ⑨ | khoá cũ `.harness-state/*.lock` mà tiến trình đã mất | xoá |
| ⑩ | ghi vào ổ bị cấm (máy này: mọi ổ ngoài D) | dời hoặc xoá; báo từng chỗ |
| ⑪ | thư mục gitignore phình (gợi ý **2 GB**) — *đo thật: 3 GB venv + `.rar` trùng, không cổng nào thấy* | BÁO kèm 3 thư mục con to nhất |
| ⑫ | `.cmd` · `.sh` · `.bat` ở gốc repo (`03_STRUCTURE §5` *Gốc repo sạch*) | dời vào `bin/` |

Không bao giờ xoá: dữ liệu user tạo hay tải về · việc chưa commit của chính repo khác · thứ phiên không tạo — chỉ báo. Xoá ngoài
repo vẫn cần cờ `.allow-outside`.

Gợi ý lệnh (Windows PowerShell — đổi theo repo):
```
git status --porcelain | Select-String '^\?\?'                                   # ① file lạ
Get-ChildItem -Recurse -File -Include '_scratch_*','.tmp*','*.bak','*.orig','*.rej' # ① sót lại
Get-ChildItem "$env:TEMP\claude\<repo>\<session>\scratchpad"                      # ② thư mục nháp
Get-ChildItem -Recurse -Force -Filter '.allow-*' docs                             # ⑤ cờ
docker ps -a --filter "status=exited"                                             # ⑥ container chạy một lần
git branch; git stash list; git worktree list                                     # ⑧ rác git
Get-ChildItem data -Directory | ForEach-Object { '{0,8:N0} MB  {1}' -f ((Get-ChildItem $_ -Recurse -File | Measure-Object Length -Sum).Sum/1MB), $_.Name }  # ⑪
Get-ChildItem -File | Where-Object Extension -in '.cmd','.bat','.sh'              # ⑫ gốc
```
Báo cáo nêu từng dòng kèm số và việc đã làm: `② nháp 5 → 0 · ③ ngoài repo xoá 2, giữ 1 (sao lưu tới khi mở lại phiên) · …`.

**Bước cuối:** `zemory validate` (đọc file trực tiếp — xanh mới coi là chốt xong) → BÁO CÁO user. Không tự `git push` (`02_RULES §Git`).
