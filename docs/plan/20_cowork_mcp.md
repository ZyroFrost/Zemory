<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan 20: Cowork đọc Global Memory qua MCP — một đường dẫn sai đẻ ra một kiến trúc thừa

> Chốt 2026-08-27 sau khi nghiệm thu trong một phiên Cowork thật. Khung kỷ luật: HP điều 8 (recall
> on-demand, không auto-inject) · điều 12 (đo trung thực) · `02_RULES §Hành xử` (chưa xác minh thì
> chưa phải sự thật).

## 1. Kết luận, đặt trước vì nó đảo một quyết định lớn

**Claude Cowork ĐỌC ĐƯỢC kho Global Memory chung của máy thật, qua MCP.** Không cần cài zemory vào
máy ảo, không cần kho thứ hai, không cần đường xuất/nhập để gộp.

Vế bị đảo — từng nằm trong code (`commands/harness.ts`) và là tiền đề của cả bộ
`docs_template/cowork_global_memory/`:

> *"Cowork KHÔNG dùng được MCP: nó chạy trong máy ảo riêng, không với tới `zemory` trên máy thật."*

## 2. Vì sao vế cũ sai — không phải giới hạn máy ảo, mà là MỘT ĐƯỜNG DẪN

Claude Desktop cài từ **Microsoft Store là gói MSIX**, chạy trong container ⇒ mọi phép ghi vào
`%APPDATA%` bị **chuyển hướng** sang `%LOCALAPPDATA%\Packages\<PackageFamilyName>\LocalCache\Roaming\`.

| | đường |
|---|---|
| `mcpsetup.ts` dò | `%APPDATA%\Claude\claude_desktop_config.json` — **trống** |
| config THẬT | `…\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json` |
| tiến trình | `C:\Program Files\WindowsApps\Claude_1.37937.1.0_x64__pzs8sxrjxfjjc\app\Claude.exe` |

Nên trên máy **đang chạy** Desktop, `zemory setup mcp` vẫn báo *"chưa cài claude-desktop"*.

**Cái giá không phải một dòng báo sai.** Từ đó rút ra kết luận *"Desktop không trỏ vào máy đọc GM
được"*, rồi dựng hẳn một bộ template riêng cho máy ảo (13 file, BOOTSTRAP 225 dòng) với kho cô lập,
luật chống hai-kẻ-ghi, và một mục §6 treo vô thời hạn. **Một đường dẫn sai đẻ ra một kiến trúc thừa.**

## 3. Nghiệm thu — bằng chứng là con số ĐANG THAY ĐỔI

Nối MCP vào Desktop (khoá `mcpServers.zemory` → `node <repo>/dist/cli.js mcp`), thoát hẳn Desktop,
mở lại, rồi hỏi **trong một phiên Cowork**:

- Liệt kê được: `mcp__zemory__memory_search` · `memory_show` · `memory_stats` · `memory_context` ·
  `memory_conflicts` · `memory_doctor`.
- `memory_stats` trả `dbPath = D:\…\Zemory\data\global_memory.db` · `messages` **303.977** · 2.614 phiên.

**Vì sao đây là bằng chứng mạnh, không phải "nó trả lời được là xong":**

| mốc | messages |
|---|---|
| đo ở máy thật, ~30 phút trước | 303.434 |
| **Cowork báo** | **303.977** |
| đo lại ở máy thật, ngay sau đó | **303.977** |

Kho đang được daemon nạp liên tục nên con số **nhích 543 tin** giữa hai lần đo. Cowork bắt đúng con
số MỚI. Bản sao hay cache thì phải ra số cũ. Trùng đúng một giá trị đang trôi ⇒ đọc **kho sống,
cùng file**. Đây là phép đo mà một bản sao **không thể** giả được.

## 3b. ĐÍNH CHÍNH PHẠM VI — bộ này cài lên MÁY THẬT cho NGƯỜI KHÁC (user chốt 2026-08-27)

Bản đầu của mục 4 dưới đây viết theo hiểu nhầm của agent, phải nêu ra vì nó suýt làm hỏng cả thiết
kế. Ba lần hiểu sai liên tiếp, user phải chỉnh cả ba:

| agent hiểu | thực tế |
|---|---|
| bộ này dựng kho trong **máy ảo** | cài lên **máy thật** của người dùng, cùng máy chạy Claude Desktop |
| máy đích **đã có** zemory + GM (như máy đang phát triển) | máy đích **trắng** — chưa có gì |
| **người dùng** phải cài Node/git rồi mới chạy được | **AGENT tự cài hết**; người dùng chỉ dán một câu |

**Đối tượng là người KHÔNG rành kỹ thuật.** Đó là toàn bộ lý do bộ này tồn tại — và cũng là lý do
mọi câu kiểu *"máy bạn cần có Node"* trong bootstrap đều là lỗi thiết kế, không phải ghi chú hữu ích.

⇒ MCP **không thay thế** bootstrap; nó là **BƯỚC CUỐI** của bootstrap — thứ làm cho kho vừa dựng
trở nên dùng được từ Cowork. Thiếu nó thì dựng xong để đó.

## 3c. Chuỗi bootstrap sau khi nắn (đã ship)

```
§A  đã có tool mcp__zemory__memory_* chưa?   → CÓ ⇒ dừng, đừng dựng đè
§B  máy đã cài zemory chưa?                  → CÓ ⇒ nhảy thẳng §5b (một lệnh)
§0  dò node/npm/git → THIẾU THÌ TỰ CÀI (winget · brew · apt · msiexec), KHÔNG bỏ cuộc
§1  hỏi kho đặt ở đâu (một máy = một kho)
§2  cài zemory từ mã nguồn + relocate + verify
§3  init bộ chuẩn
§4  HỎI quét nguồn nào: đĩa · ChatGPT · Claude.ai  → scan + scan-web
§4b NHÚNG — BẮT BUỘC (trước đây ghi là "tuỳ chọn"); chạy nền, báo ước lượng phút
§5  giao diện
§5b NỐI MCP + khởi động lại Desktop + NGHIỆM THU bằng một lời gọi memory_stats thật
§6  đồng bộ nhiều máy — để sau
```

**Ba lỗ đã vá trong lượt này:** §0 *"dò không đạt thì quay về bộ cũ"* ⇒ bỏ cuộc đúng lúc máy nontech
nào cũng rơi vào (không có Node) · §4 không hỏi nguồn nào và không có `scan-web` ⇒ máy trắng quét ra
**0 tin** · **không có bước nối MCP** ⇒ dựng xong trợ lý vẫn không đọc được. Lỗ thứ ba tồn tại
CHÍNH VÌ lỗi đường dẫn MSIX: hồi viết bộ này `setup mcp` báo "chưa cài" nên không ai nghĩ tới nó.

## 4. Hệ quả kiến trúc

- **Đường CHÍNH cho Cowork = MCP trên máy thật.** Một lệnh `zemory setup mcp claude-desktop`, không
  cài gì vào máy ảo, không đẻ kho thứ hai.
- **`cowork_global_memory/` đổi vai: từ "đường chính" thành "đường lùi".** BOOTSTRAP nay mở đầu bằng
  **§A** — bảo agent nhìn danh sách tool của chính nó trước; có `mcp__zemory__memory_*` thì **DỪNG,
  không dựng gì**. **§B** — chưa có thì bảo người dùng nối MCP, **đừng tự dựng kho**. Chỉ khi người
  dùng CHỐT muốn kho riêng mới xuống §0.
- **§6 "Đồng bộ Drive — để sau" hết là nợ** ở đường chính: một kho thì không có gì để gộp. Nó chỉ
  còn áp cho nhánh kho-riêng.
- **`cowork/` (bộ chép file) thu hẹp** còn đúng một ca: máy ảo trắng, máy thật không có zemory.

## 5. Ranh giới còn giữ nguyên — đừng nới

- **Kho riêng vẫn là kho riêng.** Nhánh §0 trở đi giữ nguyên luật "KHÔNG trỏ vào kho máy thật":
  khoá ghi của SQLite dựa trên **pid**, không phủ qua ranh giới máy ảo. MCP an toàn vì nó **không
  mở file từ máy ảo** — tiến trình `zemory mcp` chạy trên MÁY THẬT, máy ảo chỉ nói chuyện qua stdio.
  Đó là khác biệt cốt lõi, không phải chi tiết vặt.
- **Vẫn không đặt kho trong thư mục đồng bộ đám mây** (đã hỏng một kho 1,19 GB vì lý do này).
- **Recall vẫn on-demand** (HP điều 8): mô tả tool bắt agent chấm điểm hit, viết lại truy vấn tối đa
  2 lần, trả snippet + ID trước rồi mới `memory_show`. Không đổ kho vào ngữ cảnh.

## 6. Cổng

`backend/test/mcp-msix.test.mjs` — 5 ca soi HÀNH VI của `agentTargets` trên HOME giả: bản MSIX phải
được nhận · **không ghim cứng** PackageFamilyName (đuôi đổi theo kênh phát hành) · MSIX ưu tiên
TRƯỚC `%APPDATA%` khi có cả hai · bản cài thường không bị phá · chưa cài thì trả `null` chứ không
đoán bừa. Hai đột biến: bỏ nhánh MSIX ⇒ 3 ca đỏ · ghim cứng `Claude_pzs8sxrjxfjjc` ⇒ đúng 1 ca đỏ.

## 7. Còn hở, nói thẳng

- **Chỉ đo trên Windows + một bản MSIX.** macOS/Linux chưa có bản Store nên nhánh này không áp; nếu
  sau này có, phải đo lại chứ đừng suy.
- **Chưa đo Cowork GHI vào kho** — mới chứng minh ĐỌC. Các tool ghi (`session_pin`, `project_merge`)
  chưa thử qua đường Cowork; trước khi mở phải cân lại chuyện hai kẻ ghi.
- **Chưa đo Cowork ra lệnh cho zemory làm việc nặng** (`memory scan-web` kéo dữ liệu nền web). Đó là
  việc kế tiếp user đã giao.
