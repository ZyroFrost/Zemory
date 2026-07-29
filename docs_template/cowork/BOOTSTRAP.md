<!-- zemory template · BOOTSTRAP cho Claude Cowork — agent ĐỌC VÀ THI HÀNH, không phải người đọc.
     Bản mẫu TRẮNG: không nêu tên dự án cụ thể. Số ở cột "Dòng" được gate
     backend/test/bootstrap-manifest.test.mjs canh — sửa tay là gate đỏ. -->
# Dựng bộ chuẩn làm việc (harness) — cho Claude Cowork

> **File này để agent đọc và thi hành**, không phải để người đọc.
>
> Sau khi chạy xong, thư mục làm việc có một bộ harness đầy đủ, đã điền theo đúng
> công việc thật của dự án, và một bộ playbook hợp với việc đó.

## Cách khởi động (người dùng)
Mở một phiên Cowork trong project đã mount thư mục làm việc, rồi nói **một trong hai**:

- Đã có sẵn file này trong thư mục → *"Đọc BOOTSTRAP.md và dựng bộ chuẩn."*
- Chưa có → dán nguyên dòng này:
  > Tải `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork/BOOTSTRAP.md`
  > rồi làm theo đúng những gì trong đó.

Không cần cài gì trước. Không cần biết dòng lệnh.

## Bối cảnh — đọc trước khi làm
- Bạn đang chạy trong **Claude Cowork**, thao tác trên các thư mục người dùng đã mount.
- Cowork chạy lệnh trong **sandbox riêng, KHÔNG với tới terminal máy thật**. Vì vậy:
  **không cài gì, không gọi `zemory`, không cần Node/git.** Chỉ đọc–ghi file trong
  thư mục đã mount, cộng lấy nội dung qua mạng.
- Bộ chuẩn dưới đây là hệ **NON-APP** (sản phẩm/tài sản: báo cáo · dữ liệu · tài liệu ·
  thiết kế — bạn *đọc · dò · kéo · điền · xuất file*, không phát triển app).

## LUẬT — vi phạm là hỏng bộ chuẩn
1. **Chép NGUYÊN VĂN 8 file chuẩn.** Không tóm tắt, không rút gọn, không diễn đạt lại,
   không dịch. Với 8 file đó bạn là người **CHÉP**, không phải người viết.
2. **File đã tồn tại thì BỎ QUA, tuyệt đối không ghi đè.** Báo lại "đã có".
3. **Không tự xoá, không tự di chuyển file của người dùng.** Thấy cần nắn → **ĐỀ XUẤT**,
   chờ gật rồi mới làm.
4. **Không tạo thư mục rỗng.** Chuẩn là *từ điển tên để tra*, không phải danh sách phải tạo.
   Chỉ tạo thư mục khi đã có file thật bỏ vào.
5. **Không rõ thì HỎI, theo đúng skill `grill`** (§Giai đoạn 3): dừng lại · cái nào tự đọc
   ra được thì đọc, đừng hỏi · hỏi **mỗi lần MỘT câu**, kèm đề xuất của bạn · đủ rõ mới làm.
   Tuyệt đối không tự chọn cách hiểu rộng nhất rồi chạy.
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
   | gap-fill | chỉ bổ sung chỗ còn thiếu |
   | idempotent | chạy lại nhiều lần vẫn ra một kết quả |
   | scaffold / bootstrap | dựng |
4. **Dẫn chiếu chuẩn đặt CUỐI câu, trong ngoặc** — sau khi đã nói lý do bằng tiếng người. Người
   dùng cần hiểu *vì sao*; số hiệu chỉ để tra lại khi cần.
   - ✗ `03 §3: "định nghĩa nguồn … chỗ automation KÉO đọc → sources/"`
   - ✓ File này là dữ liệu đầu vào để dựng bản đồ, nên để ở `sources/` — thư mục chuẩn dành cho
     dữ liệu nguồn *(chuẩn `03 §3`)*.
5. **Thuật ngữ CỦA CHÍNH dự án thì giữ** (tên định dạng file, đơn vị đo, tên hệ toạ độ…). Đó là
   ngôn ngữ nghề của người dùng, không phải tiếng lóng của bạn.

---

## Giai đoạn 1 — Áp bộ chuẩn

### 1a. Lấy nội dung: thử theo THỨ TỰ, dừng ở lối đầu tiên chạy được
| # | Lối | Vì sao xếp thứ tự này |
|---|---|---|
| 0 | Máy đã có sẵn một bản chuẩn trên đĩa → **chép thẳng từ đó**, nhưng **phải đối chiếu số dòng với MANIFEST trước khi chép** | Rẻ nhất, không cần mạng. Bỏ bước đối chiếu thì có nguy cơ chép nhầm một bản cũ |
| 1 | `curl -fsSL <URL> -o <đích>` trong bash | Nội dung đi thẳng ra đĩa, gần như không tốn ngữ cảnh |
| 2 | Tool `web_fetch` rồi tự ghi ra file | Luôn chạy được (đi qua máy chủ Anthropic, không qua mạng sandbox), nhưng tốn ngữ cảnh |
| 3 | Xin người dùng gửi file `.zip` rồi giải nén | Khi cả hai lối trên đều bị chặn |

### 1b. MANIFEST
`<RAW>` = `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/nonapp`

| # | Ghi ra | Tải từ | Dòng |
|---|---|---|---:|
| 1 | `AGENTS.md` | `<RAW>/AGENTS.md` | 22 |
| 2 | `CLAUDE.md` | `<RAW>/CLAUDE.md` | 6 |
| 3 | `docs/agent/01_CONSTITUTION.md` | `<RAW>/agent/01_CONSTITUTION.md` | 31 |
| 4 | `docs/agent/02_RULES.md` | `<RAW>/agent/02_RULES.md` | 82 |
| 5 | `docs/agent/03_STRUCTURE.md` | `<RAW>/agent/03_STRUCTURE.md` | 130 |
| 6 | `docs/agent/04_SKILLS.md` | `<RAW>/agent/04_SKILLS.md` | 213 |
| 7 | `docs/agent/05_TODO.md` | `<RAW>/agent/05_TODO.md` | 7 |
| 8 | `docs/agent/06_CHANGES.md` | `<RAW>/agent/06_CHANGES.md` | 9 |
| 9 | `docs/plan/00_overview.md` | `<RAW>/plan/00_overview.md` | 18 |

Rồi tự tạo `docs/.harness.json` (không tải, gõ thẳng):
```json
{ "docs": "docs/agent", "profile": "non-app" }
```

### 1c. Tự kiểm (BẮT BUỘC)
Đếm số dòng từng file vừa ghi, so với cột **Dòng**. In bảng:
`đường dẫn · dòng thực · kỳ vọng · ✓/✗`.
Có ✗ ⇒ nói rõ file nào lệch bao nhiêu và dừng. **Chưa in bảng thì chưa được nói "xong".**

### 1d. Đọc lớp nền — CHỈ áp cho lần dựng này
Đọc **ba file**: `docs/agent/01_CONSTITUTION.md` → `02_RULES.md` → `04_SKILLS.md`,
cộng `docs/plan/00_overview.md`. Đủ để đi tiếp các giai đoạn dưới.

`03_STRUCTURE` mở ở **giai đoạn 3a** (khi chiếu file vào thư mục chuẩn); `05_TODO` và
`06_CHANGES` mở ở **giai đoạn 4** — lúc đó chúng còn trống nên đọc trước cũng vô ích.

> ⚠ **Đây là luật của RIÊNG lần dựng này, không phải luật của dự án.** Từ phiên sau trở đi,
> đọc theo đúng `AGENTS.md` của dự án — tức **đọc HẾT `docs/`**. Đừng bê thứ tự rút gọn ở
> đây thành thói quen thường trực.

---

## Giai đoạn 2 — Dò toàn bộ dự án

Mục tiêu: biết dự án này **thực tế đang có gì**, trước khi nói nó *nên* trông thế nào.

1. **Liệt kê mọi thư mục đã mount** (không chỉ thư mục chứa file này) và duyệt cây,
   bỏ qua `.git/`, `node_modules/`, thư mục ẩn của hệ điều hành.
2. Với mỗi nhóm file, ghi nhận: **đuôi file · số lượng · tổng dung lượng · nơi đang nằm ·
   file mới sửa gần nhất**. Đừng mở hết mọi file — mở đủ để hiểu vai trò.
3. File Office/PDF (`.xlsx .xls .docx .pptx .pdf`) cần đọc nội dung thì theo playbook
   **`04_SKILLS §đọc file Office qua Markdown`**; file lớn thì convert ra file rồi đọc
   đúng phần cần, đừng nạp cả bản convert vào ngữ cảnh.
4. **In BẢNG KIỂM KÊ** trước khi đề xuất bất cứ điều gì:
   `nhóm · số file · dung lượng · đang nằm ở đâu · đoán vai trò`.

**Cấm ở giai đoạn này:** di chuyển, đổi tên, xoá, hay "dọn cho gọn". Chỉ nhìn và ghi.

---

## Giai đoạn 3 — Áp chuẩn lên thực tế, rồi ĐỀ XUẤT

### 3a. Chiếu file thật vào slot chuẩn
Dùng bảng routing `docs/agent/03_STRUCTURE.md §3`. Với mỗi nhóm đã kiểm kê, xác định
slot đúng: deliverable (`reports/` `models/` `content/` `design/`) · `tasks/` ·
`templates/` · `sources/` · `queries/` · `measures/` · `pipelines/` · `fixtures/` ·
`assets/` · `scripts/` · `config/` · `data/` (gitignore) · `exports/` · `attic/`.

In **BẢNG LỆCH**: `file/nhóm · đang ở · nên ở · vì sao`.
Cột "vì sao" phải dẫn đúng dòng routing, không nói chung chung.

**Đây là ĐỀ XUẤT.** Không tự dời. Người dùng gật từng mục thì mới làm, và làm xong
phải in lại bảng đối chiếu.

### 3b. Điền bản trắng — hỏi theo `grill`
Bản vừa dựng còn chỗ ghi `<PROJECT>`. Trước khi hỏi, **tự trả lời trước bằng những gì
đã dò được** ở giai đoạn 2 — chỉ hỏi phần thật sự chỉ người dùng mới biết.

Hỏi **mỗi lần MỘT câu, kèm đề xuất của bạn** (đúng `04_SKILLS §grill`). Thứ tự gợi ý:
1. Dự án này là gì, phục vụ ai? *(kèm phán đoán của bạn từ bảng kiểm kê)*
2. Đầu ra cuối cùng giao đi là gì? *(kèm loại deliverable bạn đoán)*
3. Việc nào lặp lại theo kỳ (tuần/tháng), việc nào làm lẻ?
4. Có quy tắc, mẫu, hay nguồn dữ liệu nào bắt buộc phải theo không?

Đủ rõ thì điền: `AGENTS.md` (tên + mô tả 1–2 dòng) · `01_CONSTITUTION §Mục đích` ·
`03_STRUCTURE` (nếu có quy ước riêng của dự án).

### 3c. Đề xuất OVERVIEW
Viết `docs/plan/00_overview.md` theo đúng 4 mục bản mẫu chừa sẵn: **Tóm tắt ·
Tính năng/năng lực chính · Ý tưởng/định hướng · Kiến trúc/bố cục tổng thể**.

Luật cho phần này:
- Chỉ viết điều **dò được hoặc người dùng đã xác nhận**. Không suy diễn thành thật.
- Chỗ chưa đủ dữ kiện thì ghi thẳng *"chưa rõ — cần xác nhận"*, đừng lấp bằng chữ cho đầy.
- **Trình cho người dùng duyệt** trước khi coi là chốt.

### 3d. Dựng bộ skill hợp với dự án
Playbook sống trong **`docs/agent/04_SKILLS.md`** (đó là slot chuẩn — xem routing §3).
Bản mẫu đã có sẵn: `grill` · `chốt phiên` · `reconcile` · `pull` · `fill` · `upload` ·
`đọc file Office qua Markdown` · `soi chuẩn` · `audit toàn diện`.

Việc của bạn:
1. Đối chiếu việc thật của dự án với danh sách trên. Việc lặp nào **chưa có playbook** →
   soạn thêm một mục `## <tên skill>`, viết theo đúng khuôn đang có
   (*trigger → các bước → cấm gì*), ngắn gọn, thao tác được.
2. **Trình trước khi ghi**: nêu tên skill + một dòng lý do, người dùng gật mới thêm vào file.
3. Giữ `04_SKILLS.md` không phình: skill dài, có nhiều tài nguyên đi kèm thì tách riêng,
   trong file chỉ để một dòng trỏ tới.

**Về skill cài vào Cowork (khác với playbook):** Cowork chỉ nạp skill/plugin bật trong
**Customize**, và **không đọc thư mục `~/.claude` của máy**. Bạn **không tự cài được**.
Nếu có việc lặp đáng đóng gói thành skill Cowork, hãy **soạn sẵn** thư mục skill
(`SKILL.md` + tài nguyên) rồi hướng dẫn người dùng tự nén `.zip` và thêm ở **Customize →
Skills**. Lưu ý trần: `description` tối đa **200 ký tự**, `SKILL.md` nên dưới **500 dòng**.

---

## Vì sao phải TỰ DỌN — đọc trước khi bỏ qua bước 3 ở dưới

Hai file sổ (`05_TODO.md`, `06_CHANGES.md`) **lớn dần mãi**, và bộ chuẩn bắt đọc chúng ở
đầu mỗi phiên. Ở đây **không có công cụ dòng lệnh nào để cắt bớt** (Cowork không chạm tới
terminal máy thật), nên nếu không ai dọn thì mỗi phiên phải nạp lại toàn bộ lịch sử —
càng dùng lâu càng chậm và càng tốn, cho tới lúc không còn chỗ cho công việc thật.

Việc dọn **không cần công cụ gì**: chỉ là chuyển đoạn cũ từ file này sang file kia, bạn
làm được bằng thao tác file thông thường. Ngưỡng 300 dòng là để nó xảy ra **trước** khi
thành vấn đề, chứ không phải sau.

Đừng nén, đừng tóm tắt khi chuyển: nội dung trong `archive/` vẫn phải đọc lại được
nguyên văn khi cần tra một quyết định cũ.

---

## Giai đoạn 4 — Chốt

1. In **BÁO CÁO CUỐI**: đã tạo file nào · bỏ qua file nào (đã có) · bảng lệch còn treo ·
   mục nào trong overview còn "chưa rõ".
2. Ghi việc còn dở vào `docs/agent/05_TODO.md`; việc đã xong ghi `docs/agent/06_CHANGES.md`
   theo đúng format `## [YYYY-MM-DD] — tiêu đề` (chỉ ghi sau khi người dùng xác nhận OK).
3. Nhắc người dùng mở **Projects → project này → Instructions**, dán đúng đoạn này:
   > Trước mỗi phiên, đọc `docs/agent/01_CONSTITUTION.md` → `06_CHANGES.md` và bám đúng
   > chuẩn trong đó. Việc đã xong ghi `06_CHANGES.md`, việc còn dở ghi `05_TODO.md`.
   > Yêu cầu chưa rõ thì hỏi lại theo `04_SKILLS §grill`, mỗi lần một câu.
   >
   > **Tự dọn cuối phiên.** Sau khi ghi sổ, đếm số dòng hai file sổ. File nào vượt
   > **300 dòng** thì chuyển phần cũ sang `docs/agent/archive/<tên file>.md` (tạo nếu
   > chưa có): `06_CHANGES.md` chuyển các entry **cũ nhất**, giữ lại ~200 dòng mới nhất;
   > `05_TODO.md` chuyển các mục **đã xong** (`- [x]`), giữ toàn bộ mục còn mở.
   > **Chép nguyên văn, không tóm tắt** — archive là để tra lại, không phải để nén.
   > Báo người dùng đã chuyển bao nhiêu. Cần tra việc cũ thì tìm trong `archive/`.
4. Báo người dùng: từ giờ chỉ cần mô tả việc, không phải nhắc lại bộ chuẩn nữa.
5. Người dùng hỏi *"bộ chuẩn này là cái gì / từng file để làm gì"* → trỏ họ đọc
   [`README.md`](README.md) cạnh file này (bản viết cho người, không có thuật ngữ kỹ thuật).
   **Đừng tự giải thích lại theo cách của bạn** — bản đó đã chốt cách diễn đạt.
