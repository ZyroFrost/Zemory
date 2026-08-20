<!-- zemory template · BOOTSTRAP cho Claude Cowork — agent ĐỌC VÀ THI HÀNH, không phải người đọc.
     Bản mẫu TRẮNG: không nêu tên dự án cụ thể. Số ở cột "Dòng" được gate
     backend/test/bootstrap-manifest.test.mjs canh — sửa tay là gate đỏ. -->
# Dựng bộ chuẩn làm việc (harness) — cho Claude Cowork

> **File này để agent đọc và thi hành**, không phải để người đọc.
>
> Chạy xong: thư mục làm việc có bộ chuẩn đầy đủ, đã điền theo đúng công việc thật của dự án,
> và một bộ quy trình (skill) hợp với việc đó.

## Cách khởi động (người dùng)
Mở một phiên Cowork với thư mục làm việc đã gắn — ở ô chat bấm **Project or folder**, rồi chọn **một
trong hai**: **Add a folder** (gắn thẳng thư mục), hoặc **Create new project** (cũng chọn thư mục ở
bước đầu, thêm lời dặn thường trực · ghi nhớ · tác vụ định kỳ). Rồi dán **đúng một câu** này —
nguyên văn, không phải sửa gì:

> Dựng bộ khung làm việc cho dự án trong thư mục tôi đã gắn.
> Thư mục đó có file BOOTSTRAP.md thì đọc bản đó, không có thì tải bản dưới đây — rồi làm
> theo đúng những gì trong đó.
> `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork/BOOTSTRAP.md`

Trước khi dán, ở ô chat đổi **Auto → Skip all approvals** cho khỏi phải bấm duyệt từng lệnh — luật
trong bộ chuẩn (không ghi đè · không tự xoá/dời · việc hệ trọng phải trình rồi chờ gật) mới là thứ bắt
trợ lý dừng lại hỏi, không phải mức duyệt. **Cân nhắc:** ở mức đó nó không dừng cả ở hành động không an
toàn, mà luật chỉ ràng được sau khi bộ chuẩn đã dựng xong — nên chỉ bật khi đã gắn ĐÚNG thư mục dự án
(đừng gắn cả ổ đĩa hay thư mục cha) và thư mục đó đã có bản sao hoặc đã commit git.

*(Không có mạng thì cũng không mở được phiên, nên đừng dặn người dùng chuyện "máy offline". Ca có thật
là **mạng công ty CHẶN GitHub** trong khi miền Anthropic vẫn thông: lúc đó lối tải ở §1a hỏng, nhưng lối
"tool lấy nội dung web" vẫn chạy vì nó đi qua máy chủ Anthropic. Chặn cả hai thì mới xin người dùng gắn
thêm thư mục chứa bản zemory có sẵn, hoặc chép trước file này vào thư mục dự án.)*

Không cần cài gì trước. Không cần biết dòng lệnh.

## Bối cảnh — đọc trước khi làm
- Bạn đang chạy trong **Claude Cowork**, thao tác trên các thư mục người dùng đã mount.
- Cowork chạy trong **máy ảo riêng, KHÔNG với tới terminal máy thật**. Vì vậy:
  **không cài gì, không gọi `zemory`, không cần Node/git.** Chỉ đọc–ghi file trong
  thư mục đã mount, cộng lấy nội dung qua mạng.
- Máy ảo **chỉ ra mạng được tới domain của Anthropic**. Fetch thẳng tới GitHub bằng `curl`
  thường bị chặn — dùng tool lấy nội dung của Cowork (đi qua máy chủ Anthropic).
- Bộ chuẩn dưới đây là hệ **NON-APP** (sản phẩm/tài sản: báo cáo · dữ liệu · tài liệu ·
  thiết kế — bạn *đọc · dò · kéo · điền · xuất file*, không phát triển app).

## LUẬT — vi phạm là hỏng bộ chuẩn
1. **Chép NGUYÊN VĂN mọi file trong MANIFEST.** Không tóm tắt, không rút gọn, không diễn đạt
   lại, không dịch. Với các file đó bạn là người **CHÉP**, không phải người viết.
2. **File đã tồn tại thì BỎ QUA, tuyệt đối không ghi đè.** Báo lại "đã có".
3. **Không tự xoá, không tự di chuyển file của người dùng.** Thấy cần nắn → **ĐỀ XUẤT**,
   chờ gật rồi mới làm.
4. **Không tạo thư mục rỗng.** Chuẩn là *từ điển tên để tra*, không phải danh sách phải tạo.
   Chỉ tạo thư mục khi đã có file thật bỏ vào.
5. **Không rõ thì HỎI** theo skill `grill`: dừng lại · cái nào tự đọc ra được thì đọc, đừng hỏi ·
   hỏi **mỗi lần MỘT câu**, kèm đề xuất của bạn · đủ rõ mới làm. Tuyệt đối không tự chọn cách
   hiểu rộng nhất rồi chạy.
6. Lấy nội dung không được ⇒ **DỪNG và báo người dùng**. Cấm bịa nội dung thay thế.
7. Mỗi giai đoạn xong phải **in bảng kết quả** rồi mới sang giai đoạn sau.

---

## Cách NÓI với người dùng — áp cho MỌI giai đoạn

Người đọc kết quả của bạn làm nghiệp vụ, không phải kỹ sư. Bảng và báo cáo bạn in ra là
**sản phẩm giao đi**, không phải log nội bộ.

1. **Nói bằng CÔNG VIỆC, không bằng thuật ngữ.** Trước khi viết một từ chuyên ngành, thử diễn đạt
   lại bằng thứ người dùng làm hằng ngày. Diễn đạt được thì bỏ từ đó đi.
2. **Tên thư mục chuẩn thì GIỮ NGUYÊN** (`reports/` · `sources/` · `templates/` …) — đó là tên thật
   trên đĩa, đổi đi là chỉ sai chỗ. Nhưng **lần đầu nhắc mỗi tên, kèm một cụm giải thích**:
   *"`sources/` — nơi để dữ liệu đầu vào"*. Từ lần sau dùng trần.
3. **Những từ này KHÔNG đưa vào câu hướng tới người dùng** (chúng là tiếng lóng nội bộ):
   | Đừng viết | Viết |
   |---|---|
   | routing | bảng tra "để ở đâu" |
   | manifest | danh sách file |
   | profile / non-app | loại dự án |
   | slot | thư mục chuẩn |
   | deliverable | sản phẩm giao đi |
   | skill | quy trình |
   | frontmatter / metadata | phần đầu file |
   | gap-fill | chỉ bổ sung chỗ còn thiếu |
   | idempotent | chạy lại nhiều lần vẫn ra một kết quả |
   | scaffold / bootstrap | dựng |
4. **Dẫn chiếu chuẩn đặt CUỐI câu, trong ngoặc** — sau khi đã nói lý do bằng tiếng người.
   - ✗ `structure §3: "định nghĩa nguồn … → sources/"`
   - ✓ File này là dữ liệu đầu vào để dựng bản đồ, nên để ở `sources/` — thư mục chuẩn dành cho
     dữ liệu nguồn *(chuẩn `structure §3`)*.
5. **Thuật ngữ CỦA CHÍNH dự án thì giữ** (tên định dạng file, đơn vị đo, tên hệ toạ độ…). Đó là
   ngôn ngữ nghề của người dùng, không phải tiếng lóng của bạn.

---

## Giai đoạn 1 — Áp bộ chuẩn

### 1a. Lấy nội dung: thử theo THỨ TỰ, dừng ở lối đầu tiên chạy được

| # | Lối | Vì sao xếp thứ tự này |
|---|---|---|
| 0 | Máy đã có sẵn một bản chuẩn trên đĩa → **chép thẳng từ đó**, nhưng **phải đối chiếu số dòng với MANIFEST trước khi chép** | Rẻ nhất, không cần mạng. Bỏ bước đối chiếu thì có nguy cơ chép nhầm bản cũ |
| 1 | **Tool lấy nội dung web của Cowork** rồi tự ghi ra file | Đi qua máy chủ Anthropic, không qua mạng máy ảo ⇒ **luôn chạy được**. Đây là lối chính |
| 2 | `curl -fsSL <URL> -o <đích>` trong bash | Rẻ hơn (không qua ngữ cảnh) nhưng **máy ảo chỉ ra được domain Anthropic** ⇒ thường bị chặn. Thử nhanh, hỏng thì bỏ ngay, đừng loay hoay |
| 3 | Xin người dùng gửi file `.zip` rồi giải nén | Khi cả hai lối trên đều bị chặn |

### 1b. MANIFEST

`<RAW>` = `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork/nonapp`

Đường dẫn ghi ra **giống hệt** đường dẫn nguồn, trừ hai file `docs/` (bộ chuẩn nằm dưới `docs/`).

| # | Ghi ra | Tải từ | Dòng |
|---|---|---|---:|
| 1 | `AGENTS.md` | `<RAW>/AGENTS.md` | 50 |
| 2 | `CLAUDE.md` | `<RAW>/CLAUDE.md` | 6 |
| 3 | `docs/agent/01_CONSTITUTION.md` | `<RAW>/agent/01_CONSTITUTION.md` | 31 |
| 4 | `docs/agent/02_RULES.md` | `<RAW>/agent/02_RULES.md` | 118 |
| 5 | `docs/agent/03_STRUCTURE.md` | `<RAW>/agent/03_STRUCTURE.md` | 36 |
| 6 | `docs/agent/04_SKILLS.md` | `<RAW>/agent/04_SKILLS.md` | 41 |
| 7 | `docs/agent/05_TODO.md` | `<RAW>/agent/05_TODO.md` | 7 |
| 8 | `docs/agent/06_CHANGES.md` | `<RAW>/agent/06_CHANGES.md` | 9 |
| 9 | `docs/plan/00_overview.md` | `<RAW>/plan/00_overview.md` | 18 |
| 10 | `.claude/skills/structure/SKILL.md` | `<RAW>/.claude/skills/structure/SKILL.md` | 97 |
| 11 | `.claude/skills/structure/reference/conventions.md` | `<RAW>/.claude/skills/structure/reference/conventions.md` | 151 |
| 12 | `.claude/skills/structure/scripts/check_structure.py` | `<RAW>/.claude/skills/structure/scripts/check_structure.py` | 254 |
| 13 | `.claude/skills/grill/SKILL.md` | `<RAW>/.claude/skills/grill/SKILL.md` | 35 |
| 14 | `.claude/skills/session-close/SKILL.md` | `<RAW>/.claude/skills/session-close/SKILL.md` | 59 |
| 15 | `.claude/skills/read-office/SKILL.md` | `<RAW>/.claude/skills/read-office/SKILL.md` | 55 |
| 16 | `.claude/skills/pull/SKILL.md` | `<RAW>/.claude/skills/pull/SKILL.md` | 24 |
| 17 | `.claude/skills/fill/SKILL.md` | `<RAW>/.claude/skills/fill/SKILL.md` | 31 |
| 18 | `.claude/skills/upload/SKILL.md` | `<RAW>/.claude/skills/upload/SKILL.md` | 22 |
| 19 | `.claude/skills/reconcile/SKILL.md` | `<RAW>/.claude/skills/reconcile/SKILL.md` | 38 |
| 20 | `.claude/skills/conform/SKILL.md` | `<RAW>/.claude/skills/conform/SKILL.md` | 41 |
| 21 | `.claude/skills/audit/SKILL.md` | `<RAW>/.claude/skills/audit/SKILL.md` | 43 |
| 22 | `.claude/skills/write-docx/SKILL.md` | `<RAW>/.claude/skills/write-docx/SKILL.md` | 120 |
| 23 | `.claude/skills/write-docx/reference/pagination-toc.md` | `<RAW>/.claude/skills/write-docx/reference/pagination-toc.md` | 118 |
| 24 | `.claude/skills/write-docx/reference/edit-traps.md` | `<RAW>/.claude/skills/write-docx/reference/edit-traps.md` | 86 |
| 25 | `docs/hooks/guard.cjs` | `<RAW>/hooks/guard.cjs` | 321 |
| 26 | `docs/hooks/policy.json` | `<RAW>/hooks/policy.json` | 43 |

**Hai file cuối là bộ chặn tự động, không phải tài liệu.** Có những việc mà làm rồi thì không
lấy lại được: ghi đè dữ liệu gốc người dùng đưa vào, xoá cả một thư mục, để mật khẩu lọt vào
bản lưu. Luật bằng chữ ngăn được phần lớn, nhưng chữ thì người đọc có thể quên — hai file này
để máy chặn ngay lúc xảy ra, thay vì phát hiện sau.

Cứ ghi chúng ra như mọi file khác. **Không tự nối vào máy** — muốn bật thì người dùng tự khai
vào phần cài đặt của công cụ họ đang chạy. Nơi bạn làm việc chưa hỗ trợ thì hai file nằm yên,
không gây hại gì, và ăn ngay khi nào được hỗ trợ.

Rồi **tự tạo** `docs/.harness.json` (không tải, gõ thẳng):
```json
{ "docs": "docs/agent", "profile": "non-app", "standard": "2.0" }
```

### 1c. Tự kiểm (BẮT BUỘC)

Lấy thêm **một file nữa** — công cụ tự kiểm:

| # | Ghi ra | Tải từ |
|---|---|---|
| — | `check_install.py` (để tạm ở thư mục làm việc) | `<COWORK>/check_install.py` |

`<COWORK>` = `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork`
Có sẵn bản trên đĩa thì chép từ đó, khỏi tải.

Rồi chạy:

```
python check_install.py . BOOTSTRAP.md
```

Nó tự đọc bảng MANIFEST ở trên, đối chiếu **từng file vừa ghi**, và kiểm luôn phần mô tả của
mỗi quy trình. In ra bảng lệch. Thoát `0` = đúng hết · `1` = có chỗ sai.

- Còn dòng `[THIẾU]` hoặc `[LỆCH]` ⇒ **DỪNG**, nói rõ file nào sai rồi tải/chép lại **đúng file đó**.
- Lệch số dòng gần như luôn có nghĩa: khi chép bạn đã tóm tắt hoặc rút gọn. **Chép lại NGUYÊN VĂN.**
- Xong xuôi thì xoá `check_install.py` khỏi thư mục làm việc (nó chỉ dùng lúc dựng).

**Không chạy được Python?** Làm tay: đếm số dòng từng file, so với cột **Dòng**, in bảng
`đường dẫn · dòng thực · kỳ vọng · ✓/✗`.

**Chưa in bảng kết quả thì chưa được nói "xong".**

### 1d. Đọc lớp nền
Đọc **`docs/agent/01_CONSTITUTION.md`** → **`02_RULES.md`** → **`docs/plan/00_overview.md`**.

> Đây **cũng chính là** cách đọc từ phiên sau trở đi — không có luật riêng cho lần dựng.
> `AGENTS.md` quy định: luôn đọc `01` + `02` + mục còn mở trong `05_TODO`. Ba thứ **chỉ mở khi
> trúng việc**: các quy trình trong `.claude/skills/`, `03_STRUCTURE` (chỗ-để-file **+ từ điển
> chỉ số/cột**) và `04_SKILLS` (sổ đăng ký quy trình). Đừng mở trước cho "chắc".

---

## Giai đoạn 2 — Dò toàn bộ dự án

Mục tiêu: biết dự án này **thực tế đang có gì**, trước khi nói nó *nên* trông thế nào.

1. **Liệt kê mọi thư mục đã mount** (không chỉ thư mục chứa file này) và duyệt cây.
   Bỏ qua `.git/`, `node_modules/`, thư mục ẩn của hệ điều hành —
   **NGOẠI LỆ: `.claude/` phải được tính**, đó là chỗ bộ quy trình vừa ghi vào.
2. Với mỗi nhóm file, ghi nhận: **đuôi file · số lượng · tổng dung lượng · nơi đang nằm ·
   file mới sửa gần nhất**. Đừng mở hết mọi file — mở đủ để hiểu vai trò.
3. File Office/PDF cần đọc nội dung → theo quy trình `read-office`; file lớn thì convert ra file
   rồi đọc đúng phần cần, đừng nạp cả bản convert vào ngữ cảnh.
4. **In BẢNG KIỂM KÊ** trước khi đề xuất bất cứ điều gì:
   `nhóm · số file · dung lượng · đang nằm ở đâu · đoán vai trò`.

**Cấm ở giai đoạn này:** di chuyển, đổi tên, xoá, hay "dọn cho gọn". Chỉ nhìn và ghi.

---

## Giai đoạn 3 — Áp chuẩn lên thực tế, rồi ĐỀ XUẤT

### 3a. Chiếu file thật vào thư mục chuẩn
Mở `.claude/skills/structure/SKILL.md` §3 (bảng tra "cần gì → để đâu"). Với mỗi nhóm đã kiểm kê,
xác định thư mục đúng.

In **BẢNG LỆCH**: `file/nhóm · đang ở · nên ở · vì sao`.
Cột "vì sao" phải dẫn đúng dòng trong bảng tra, không nói chung chung.

**Đây là ĐỀ XUẤT.** Không tự dời. Người dùng gật từng mục thì mới làm, và làm xong phải in lại
bảng đối chiếu.

Muốn máy chấm trước cho nhanh:
```
python .claude/skills/structure/scripts/check_structure.py .
```
Nó **chỉ báo, không tự sửa**. Mục `xem xét` không phải lỗi — chỉ là máy không biết thư mục đó
thuộc đâu; bạn mới là người phán.

### 3b. Điền bản trắng — hỏi theo `grill`
Bản vừa dựng còn chỗ ghi `<PROJECT>`. Trước khi hỏi, **tự trả lời trước bằng những gì đã dò
được** ở giai đoạn 2 — chỉ hỏi phần thật sự chỉ người dùng mới biết.

Hỏi **mỗi lần MỘT câu, kèm đề xuất của bạn**. Thứ tự gợi ý:
1. Dự án này là gì, phục vụ ai? *(kèm phán đoán của bạn từ bảng kiểm kê)*
2. Đầu ra cuối cùng giao đi là gì? *(kèm loại sản phẩm bạn đoán)*
3. Việc nào lặp lại theo kỳ (tuần/tháng), việc nào làm lẻ?
4. Có quy tắc, mẫu, hay nguồn dữ liệu nào bắt buộc phải theo không?

Đủ rõ thì điền: `AGENTS.md` (tên + mô tả 1–2 dòng) · `01_CONSTITUTION §Mục đích` + §PHI-MỤC-TIÊU.

### 3c. Đề xuất OVERVIEW
Viết `docs/plan/00_overview.md` theo đúng 4 mục bản mẫu chừa sẵn: **Tóm tắt ·
Tính năng/năng lực chính · Ý tưởng/định hướng · Kiến trúc/bố cục tổng thể**.

- Chỉ viết điều **dò được hoặc người dùng đã xác nhận**. Không suy diễn thành thật.
- Chỗ chưa đủ dữ kiện ghi thẳng *"chưa rõ — cần xác nhận"*, đừng lấp bằng chữ cho đầy.
- **Trình cho người dùng duyệt** trước khi coi là chốt.

### 3d. Quy trình riêng của dự án
Mười một quy trình chuẩn đã có sẵn trong `.claude/skills/`. Việc của bạn:

1. Đối chiếu việc thật của dự án với mười một cái đó. Việc lặp nào **chưa có** → soạn thêm một thư mục
   `.claude/skills/<tên>/SKILL.md`, viết theo đúng khuôn đang có (*phần đầu file `name` +
   `description` → các bước → cấm gì*), ngắn gọn, thao tác được.
   - `name`: **tiếng Anh**, chữ thường, nối bằng `-`. Thân file: tiếng Việt.
   - `description` phải nói cả **làm gì** lẫn **khi nào dùng** — đó là thứ duy nhất quyết định
     quy trình có được gọi ra hay không. Kèm vài cụm tiếng Việt người dùng hay gõ.
   - Mỗi `SKILL.md` **≤ 120 dòng**; dài hơn thì đẩy phần chi tiết xuống `reference/`.
2. **Trình trước khi ghi**: nêu tên + một dòng lý do, người dùng gật mới thêm.
3. Đăng ký ở **HAI chỗ**, thiếu một là quy trình thành mồ côi: một dòng vào danh mục §2 của
   `docs/agent/04_SKILLS.md`, và một dòng vào bảng trigger trong `AGENTS.md` (mở lúc nào).

---

## Giai đoạn 4 — Chốt

1. In **BÁO CÁO CUỐI**: đã tạo file nào · bỏ qua file nào (đã có) · bảng lệch còn treo ·
   mục nào trong overview còn "chưa rõ".
2. Ghi việc còn dở vào `docs/agent/05_TODO.md`; việc đã xong ghi `docs/agent/06_CHANGES.md`
   theo format `## [YYYY-MM-DD] — tiêu đề` (chỉ ghi sau khi người dùng xác nhận OK).
3. **Đường CHẮC cho hợp đồng nạp.** Cowork tự đọc `CLAUDE.md` của thư mục đã gắn (nó hiện lên dưới
   dạng *Instructions*), nên hợp đồng nạp thường đã có hiệu lực. Nhưng cơ chế đó **chưa có tài liệu
   chính thức** — nên nhắc người dùng dán thêm đoạn dưới đây vào chỗ ghi **lời dặn thường trực**:
   chỉ gắn thư mục thì là **Folder instructions**, có project thì là **Projects → project này →
   Instructions**. Dán trùng thì vô hại; thiếu thì mất hợp đồng nạp. Dán đúng nguyên văn:
   > Trước mỗi phiên, đọc `AGENTS.md` rồi làm theo đúng hợp đồng nạp trong đó:
   > luôn đọc `docs/agent/01_CONSTITUTION.md` + `02_RULES.md` + mục còn mở trong `05_TODO.md`;
   > các quy trình trong `.claude/skills/` chỉ mở khi trúng việc.
   > Việc đã xong ghi `06_CHANGES.md`, việc còn dở ghi `05_TODO.md`.
   > Yêu cầu chưa rõ thì hỏi lại theo quy trình `grill`, mỗi lần một câu.
   >
   > **Tự dọn cuối phiên.** Sau khi ghi sổ, dọn hai file sổ sang `docs/agent/archive/<tên file>.md`
   > (tạo nếu chưa có) — hai file hai luật khác nhau:
   > `05_TODO.md` KHÔNG chờ ngưỡng nào — mục **đã huỷ/hoãn vô hạn** đi ngay, mục còn mở giữ toàn bộ
   > (mục đã xong thì đã sang `06_CHANGES` rồi); vẫn to vì quá nhiều việc mở thì BÁO, đừng tự xoá việc.
   > `06_CHANGES.md` có trần theo **KÍCH THƯỚC**: `wc -c` vượt **40.000 ký tự** thì chuyển entry
   > **cũ nhất** đi, giữ ~25.000 ký tự mới nhất. Đếm dòng là đo sai — dòng ở sổ dày mỏng rất khác nhau.
   > **Chép nguyên văn, không tóm tắt** — phần lưu trữ là để tra lại, không phải để nén.
   > Báo người dùng đã chuyển bao nhiêu.
4. Báo người dùng: từ giờ chỉ cần mô tả việc, không phải nhắc lại bộ chuẩn nữa.
5. Người dùng hỏi *"bộ chuẩn này là cái gì / từng file để làm gì"* → trỏ họ đọc
   [`README.md`](README.md) cạnh file này (bản viết cho người, không có thuật ngữ kỹ thuật).
   **Đừng tự giải thích lại theo cách của bạn** — bản đó đã chốt cách diễn đạt.
