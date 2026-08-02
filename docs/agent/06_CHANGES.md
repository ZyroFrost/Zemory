<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-08-03] — Audit 6 mặt: 3 lỗ THẬT, đau nhất là agent trả 30s mỗi lần tìm

- **`memory_search` qua MCP tốn 27–34s MỖI LẦN** — đợt trước tôi sửa đường UI mà **bỏ sót
  đường agent**, vốn là đường bị gọi nhiều nhất. Đo trong tiến trình đã ấm (kho 198.334 tin):
  **FTS 172ms · hybrid 746ms · hybrid+rerank 29.420ms** ⇒ thủ phạm là **rerank, không phải
  hybrid** (40×). Nay mặc định hybrid-không-rerank, `deep=true` mới thêm rerank: đo lại
  **0,9–1,05s** (lần đầu 9,7s vì nạp model). Mô tả tool nói thẳng cái GIÁ.
  ⚠ **Sửa cách diễn đạt của chính mục này:** câu *"rerank chưa từng thắng hybrid (8/8 = 8/8)"*
  ĐÚNG số nhưng dễ hiểu thành "rerank vô dụng" — corpus gate chỉ **8 truy vấn** và hybrid đã
  bão hoà, nên nó **không thể** cho rerank cơ hội thắng. Rerank vẫn là thành phần chuẩn của
  RAG (cross-encoder cho query và doc "nhìn" nhau, bi-encoder thì không); việc phải làm là
  làm nó RẺ, không phải bỏ — xem `05_TODO §RERANK`.
- **Daemon trả 200 + HTML cho MỌI đường lạ.** Bắt được bằng chính phép quét của mình: nó gọi
  `/scope-tree` (KHÔNG tồn tại — dữ liệu nằm trong `/memory-status`) và nhận 200, nên bảng
  kết quả báo "TẤT CẢ 200" trong khi một mục là hư không. Client gõ sai tên endpoint cũng
  nhận HTML rồi vỡ ở `JSON.parse`. Nay chỉ `/` và `/app` được vỏ app, còn lại **404 JSON**.
  *(Phép quét cũng đã sửa: thêm vế "đường lạ PHẢI 404" — "tất cả 200" mà không kiểm vế này
  thì không chứng minh được gì.)*
- **Hai danh sách móc có thể lệch nhau mà không ai biết:** `ZEMORY_HOOKS` (khai vào settings
  của host) và bộ sự kiện `cmdHook` chấp nhận. Lệch một cái ⇒ host gọi, CLI in `usage:` ⇒
  hook hỏng LẶNG, triệu chứng duy nhất là bộ nhớ thiếu tin. Đã chạy thật cả 4 (đều dispatch
  được) và thêm gate parity.
- **Sạch ở các mặt còn lại:** gate 481/481 · `conform` ✓ · `integrity_check ok` · schema v20 ·
  **0 mồ côi** (3 phép đo) · digest **1.272/1.272** · **0 nhóm project tách tên** (sau đợt gộp
  hôm qua) · 44/44 neo test trỏ file sống · endpoint parity chỉ còn false-positive `'/set-'+x`
  đã biết · 14 endpoint sống 200 + 3 đường lạ 404.
- **Nghi vấn đã loại:** "137 export mồ côi" — 136 là type/interface hoặc dùng nội bộ; chết
  thật vẫn chỉ `resolveDocPath` (cố ý giữ). · "engram có tool đo context" — regex khớp
  `mem_save` chỉ vì ví dụ trong mô tả có chữ *jsonwebtoken*; đọc từng tool thì engram **không
  có** tool nào đo context/nén.

Gate 478 → **481** · đột biến: rerank-mặc-định · 404-đường-lạ · parity-móc — **3/3 đỏ**.

## [2026-08-02i] — Tìm kiếm về lại HAI LỚP (rẻ trước, sâu khi xin) · gộp 23 project bị tách

- **F6 — daemon hết nghẹt.** `/memory-search` gọi thẳng `recall()` = hybrid + rerank cho MỌI
  lần gõ, ngay trên event loop. Đo trên kho thật (196.894 tin): **FTS 360ms · hybrid 20,5s ·
  hybrid+rerank 63,6s** (51s cả khi model đã ấm). Nay mặc định là lớp RẺ; lớp ngữ nghĩa chỉ
  chạy khi xin `deep=1` **và chạy ở tiến trình con**. Đo sống qua daemon: tìm nhanh
  **44–139ms** khi ấm (lượt ĐẦU sau khi daemon vừa bật, lại trúng lúc `embed --all` chạy:
  13,2s — nói ra để không ai tưởng lúc nào cũng 40ms), tìm sâu 51,5s mà `/ping` vẫn **6ms**
  và `/memory-status` **409ms** — trước đây mọi endpoint đứng 48s.
  Đây là quay về đúng điều 8 (progressive disclosure) mà bề mặt đã trôi khỏi — user chỉ ra:
  *"logic search ban đầu là search bộ lọc mà, rồi khi cần mới search full GM"*.
- **UI có chip `🔬 Tìm sâu`** — lựa chọn TỪNG LƯỢT, không lấy từ setting máy (máy này
  `hybrid=true` sẵn; đọc theo nó là mọi lượt tìm lại rơi vào đường 20–60s). Hai chip
  `Hybrid`/`Rerank` cũ giữ nguyên vai **công tắc engine của MÁY** (dùng cho lượt sâu + CLI +
  MCP) và nay nói rõ điều đó trong tooltip — trước đây chúng hứa đổi kết quả tìm, mà sau khi
  tách lớp thì không còn đúng. Lượt sâu có nhãn chờ riêng; hỏng/quá giờ thì **nói ra**, không
  hiện "0 kết quả" (hai thứ đó trông y hệt nhau).
- **F5 — gộp xong 23 nhóm project bị tách tên** (user duyệt). 115 phiên trỏ lại, **44ms**;
  khoá project **135 → 112**; phiên/tin **không đổi** (1.272 / 198.179) — không xoá dòng nào.
  Riêng repo này gom về **29 phiên · 35.941 tin** (trước nằm hai khoá 24+5). `cwd` gốc giữ
  nguyên cách viết cũ ở **59 phiên** ⇒ vẫn truy ngược được nó vốn thuộc chỗ nào.
- **Bấm nhầm `/compact` rồi huỷ — nay không còn tính là một chu kỳ.** Cờ cảnh báo mở lại dựa
  trên **DẤU VẾT** `compact_boundary` trong transcript (host chỉ ghi khi nén THẬT xảy ra),
  không dựa vào việc móc `PreCompact` đã nổ. Kèm bẫy đã trả giá lúc đo: chuỗi
  `"compact_boundary"` cũng xuất hiện trong nội dung chat (phiên đang BÀN về compact bị đếm
  thành lần nén) ⇒ chỉ nhận bản ghi có đủ `type=system` + `subtype` + `compactMetadata`.
- **Bối cảnh đo được, để khỏi đoán:** 30 lần nén thật trên máy — **27 auto · 3 tay**; p50 nén
  ở **1.000.183** token nhưng có ca auto ở **711.803** và thấp nhất **342.068** ⇒ ngưỡng 95%
  KHÔNG phải lưới duy nhất, `PreCompact` mới là thứ chạy bất kể nén sớm hay muộn.
- **`memory search --json`** — đường máy-đọc cho tiến trình con. **PowerShell làm hỏng encoding
  một file test** (`Get-Content -Raw` đọc bằng ANSI rồi ghi lại UTF-8): khôi phục từ git, và
  bài học là sửa văn bản bằng công cụ sửa file, không bằng `-replace` của shell.

Gate 475 → **478** · `conform` ✓ · đột biến: dấu-vết-nén 2/2 · "UI mặc định phải rẻ" 2/2 ·
chip Tìm sâu 2/2 — tất cả đỏ. *(Một phép đếm trong test tự nó sai lúc đầu: đếm cả chuỗi nằm
trong biểu thức ba ngôi nên ra 3 thay vì 2 — sửa bằng cách đếm trong đúng hai khối từ điển.)*

## [2026-08-02h] — Nạp bộ nhớ chuyển sang PER-MESSAGE · đồng hồ context · lưới sau khi nén

> 🔄 **Supersede:** thay [2026-07-30d] — "daemon KHÔNG hề scan" — ở phần NHỊP: chuỗi nền
> vẫn còn nhưng thôi làm đường nạp chính. User chốt: *"nhịp 10' là lần đó chưa xét kỹ — mỗi
> 1 mes phải tự đưa lên luôn mới đúng"*.

- **Vì sao đổi (số, không phải cảm tính):** poll trả tiền theo THỜI GIAN — 6 lần scan/giờ kể
  cả máy rảnh, 1,8–7,2s/lần — và vẫn trễ tới 10 phút. Hook trả theo CÔNG VIỆC: không tin thì
  0 chạy, có tin thì **~320ms** cả tiến trình (việc thật 5–71ms). Rẻ hơn, lại tươi hơn.
- **`scanOneFile`** nạp đúng MỘT transcript từ `transcript_path` của host, bỏ hẳn khâu
  discover. Không nhận diện được đường ⇒ trả "không nhận", **KHÔNG** lặng lẽ rơi về quét cả
  kho. Write-gate bận ⇒ bỏ qua ngay (chờ là ~125s/lượt), lưới bù lượm.
- **Bốn móc, mỗi cái một vai:** `Stop` nạp mỗi lượt · `UserPromptSubmit` im tuyệt đối tới
  95% rồi **chốt sổ + cảnh báo MỘT lần/phiên** · `PreCompact` nạp nốt trước khi nén ·
  `SessionStart` **chỉ** nói khi `source=compact` — auto-inject đầu tiên của hệ: một thẻ
  795 B, đúng sự kiện agent vừa mất trí nhớ, không phải memory mỗi prompt (điều 8).
- **Scheduler teo thành LƯỚI BÙ** (10' → 30'): embed · digest sweep · quét vét nguồn không
  hook · poll chiều import. Drive giữ nguyên nhịp 30' hai chiều theo user chốt.
- **Ba lỗi THẬT bắt được lúc chạy bề mặt sống, không phải khi đọc code:** ① hook hét
  **"Context ~295%"** (transcript ghi `claude-opus-5` ⇒ tính theo 200k trong khi phiên chạy
  1M) — nay `windowFor` **tự sửa**: phiên không thể vượt cửa sổ của chính nó nên số >100% là
  bằng chứng giả định sai ⇒ nâng bậc; vượt cả bậc cao nhất ⇒ IM thay vì hét bậy. ②
  `readStdin` cắm `setTimeout(800)` **không `unref`** ⇒ mỗi lần gọi hook chờ thừa 800ms. ③
  `memory_doctor` gọi thật mất **48s** ⇒ tách cờ `deep` (lượt nhanh **186ms**, khai `notProbed`).
- **CLI tách lối tắt cho `hook`** (nạp động) — 400ms → **232–320ms**; lệnh khác giữ đường cũ.
- **F1/F4 của audit sáng nay** xử luôn: doctor probe đúng thứ nó hứa · gom 5 bản so-path về
  `core/config::projectKey` (`graph-memory` CỐ Ý giữ riêng: id node dùng `/`, đã ghi rõ).
- **Một test của tôi XANH GIẢ, tự bắt bằng đột biến:** F1 chỉ soi CHỮ trong source nên gỡ
  hẳn hai key khỏi vòng probe vẫn xanh — viết lại thành kiểm hành vi.

- **Cảnh báo là một lần mỗi CHU KỲ ĐẦY, không phải mỗi phiên** (user hỏi "lâu lâu bị nén dù
  chưa tới hạn" ⇒ đo 30 lần nén thật trên máy: **27 auto · 3 manual**; p50 nén ở
  **1.000.183** token nhưng có ca auto ở **711.803** và thấp nhất **342.068**; **7/19 phiên
  bị nén >1 lần**, cá biệt **6 lần**). Vậy hai điều: ① ngưỡng 95% KHÔNG phải lưới duy nhất —
  `PreCompact` chạy cho cả nén tay lẫn nén tự động nên không phụ thuộc lúc nào nổ; ② cờ
  "đã cảnh báo" nay được XOÁ khi nén, nếu không thì từ lần nén thứ hai trở đi im lặng.

Gate 462 → **475** · `conform` ✓ · đột biến realtime **8/8** đỏ, F1 **2/2**, F4 (phải gỡ cả
hai cơ chế mới đỏ — chúng dự phòng nhau).

## [2026-08-02g] — Chạy engram THẬT (v1.20.0) rồi mới so — hai chỗ hôm nay tôi đo sai

> 🔄 **Supersede:** thay [2026-08-02e] — "Soát sổ: 6 mục chưa làm thực ra đã xong · 3 tiền đề
> sai" — ở đúng một gạch đầu dòng: số tool của engram và chuyện họ có pin hay không.

Tải bản phát hành windows_amd64 (**khớp checksum công bố**), chạy trong HOME sandbox, bơm
JSON-RPC vào `engram mcp` — đúng phép thử đã dùng cho zemory và cho CALM (`plan/13 §9`). Xong
xoá sạch binary + sandbox.

- **Sai 1 — "20 tool": binary trả 22**, có cả `mem_pin`/`mem_unpin` (`DOCS.md` của họ liệt kê
  thiếu). Tôi lấy TÀI LIỆU bên thứ ba làm phép đo rồi gọi là "đo lại". **Sai 2 — "họ không có
  pin": có** ⇒ ⑤ là bám kịp, không phải đi trước. Sổ cũ ghi 22 là đúng.
- **⑥ thì zemory đi trước THẬT, bằng chứng là README của họ:** *"Engram's MCP transport is
  **stdio only** — there is no HTTP or network MCP endpoint."* `serve :7437` là REST cho plugin
  OpenCode/Pi (đo: `/health` 200 · `/mcp` **404**). Ghi chú Docker tôi viết cho `mcp --http`
  trùng điều họ tự thú: loopback ⇒ container không với tới.
- **Lời dặn, đo cạnh nhau:** cùng dùng marker; chạy **3 lần** + chèn chữ user vào giữa ⇒ cả hai
  **1 khối, chữ user còn**. Khác cỡ: engram **3.873 B** (ép gọi `mem_save` sau mỗi việc) ·
  zemory **1.289 B** (chỉ dạy lúc nào ĐỌC). Mô tả có "khi nào gọi": engram **10/22** · zemory **12/12**.
- **Mô hình khác nhau — vòng ghi–đọc:** engram tìm trước khi ghi = *No memories found*, phải
  `mem_save` mới thấy; zemory cùng lúc có sẵn **1.271 phiên · 196.894 tin**, agent **không gọi
  lệnh ghi nào**. Cỡ một kết quả: engram 540 B · zemory 454 B/hit.
- **Ba agent ta chưa khai được thì họ khai được**, và giờ biết hình dạng: `codex` → `config.toml`
  + file chỉ dẫn · `opencode` → plugin `.ts` 21 KB · `pi` → npm. Khoảng cách là thật.
- **Lỗi SỐNG bắt được lúc tra lại sổ vừa ghi:** `changelog search "x" --limit 3` tìm chuỗi
  `"x 3"` (và `plan search` y hệt) — **cùng họ lỗi đã vá sáng nay cho `memory search`, khác bề
  mặt**. Nay dùng chung `positionalArgs`; gate `docs-search-flags` 4 test, đột biến 2 hướng đỏ.

Gate 458 → **462** · `conform` ✓.

## [2026-08-02f] — MCP 8 → 12 tool: đóng hết sáu khoảng trống so với engram

Sáu mục `05_TODO` ghi từ đợt đối chiếu sáng nay, làm trọn trong một lượt.

- **① Lời dặn cài CÙNG `setup mcp`** — khai server chỉ cho agent *có* tool; thứ quyết định nó
  có *gọi* hay không là lời dặn trong file chỉ dẫn thường trực (Cursor `.mdc` kèm
  `alwaysApply` · Windsurf `global_rules.md` · Gemini/Antigravity `GEMINI.md` · Qwen · Kiro).
  Khối có **marker hai đầu** ⇒ chạy lại THAY đúng khối cũ, không đẻ bản thứ hai, không đụng
  chữ user; marker mở-mà-không-đóng thì **DỪNG, không đoán chỗ kết thúc**. Claude Code/Desktop
  cố ý KHÔNG chèn: `AGENTS.md`/`CLAUDE.md` là tài sản harness, và lời dặn đã nằm ở mô tả tool.
- **② `memory_conflicts` — KHÁC engram có chủ đích.** `mem_judge`/`mem_compare` của họ GHI phán
  quyết vào kho; zemory chỉ **ghép cặp nghi ngờ** (cùng chủ đề · có dấu hiệu quyết định · cách
  xa nhau về thời gian) rồi giao agent phán — đúng thứ tự điều 6 (①script → ②agent liên kết) và
  không đổ suy luận ngược vào lớp dẫn xuất (điều 3). Trả thẳng `CANDIDATES ONLY`.
- **③ `project_merge`** tự tìm nhóm bị tách (`D:\` vs `d:\` · gạch cuối), **mặc định dry-run**,
  `apply=true` mới ghi, **không xoá dòng nào** — `cwd` gốc giữ nguyên để truy ngược.
- **④ `memory_doctor`** probe engine THẬT (không đọc công tắc) · **⑤ `session_pin`** dùng cột
  RIÊNG `sessions.pinned` (**schema v20**), lấy bằng truy vấn riêng nên phiên ghim **không tuột
  khỏi cửa sổ 400 dòng** dù rất cũ · **⑥ `zemory mcp --http`** (4445), cùng bộ tool với stdio
  (**gate parity**), guard loopback dùng CHUNG một bản với daemon UI (`util/loopback.ts`).
- **Nói thẳng giới hạn ⑥:** bind loopback nên container Docker **không** với tới nếu không
  `--network host`/map cổng. Bind rộng hơn là mở kho nhớ ra mạng (điều 7) — không làm mặc định.
- **Một test của tôi XANH GIẢ, tự bắt được:** `fetch` không cho ghi đè header `Host`, nên phép
  thử DNS-rebinding chưa hề chạm guard. Viết lại bằng `node:http` mới đỏ được.

Gate 437 → **458** · `conform` ✓ · đột biến phần lời dặn **5/5** đỏ.
