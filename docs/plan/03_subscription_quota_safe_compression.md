<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Plan mới: Nén an toàn cho quota subscription

> ⛔ **DROPPED (2026-06-25):** compression đã bị bỏ khỏi scope zemory (xem changelog). Tài liệu này giữ làm **hồ sơ ý tưởng đã thử** (tham chiếu cho A.I Center sau), KHÔNG còn là việc đang làm. Code đã dời sang `attic/`.

> Ngày khảo sát: 2026-06-20. Tài liệu này là một spec độc lập, không thay thế các plan cũ. Mục tiêu là một engine nén quota-safe **thuần zemory** tại tool boundary, loại bỏ hoàn toàn đường proxy đã gây rủi ro cho quota subscription. (headroom — bản proxy từng được thử — đã bỏ hoàn toàn; §2 ghi lại bài học để không lặp lại.)
## 1. Kết luận ngắn

Phương án khả thi nhất là **không chặn hoặc sửa request HTTP gửi tới nhà cung cấp model**. zemory sẽ nén tại **tool boundary**, trước khi output mới được nhận vào transcript của agent:

1. Tool chỉ chạy đúng một lần.
2. Output thô được giữ local bằng một artifact có ID.
3. Policy quyết định giữ nguyên hay tạo bản rút gọn.
4. Agent chỉ nhận bản rút gọn kèm handle để tìm hoặc mở thêm đúng phần cần thiết.
5. Global brain tiếp tục ingest transcript và cung cấp recall qua MCP/CLI, không cần proxy.

Cơ chế này nhắm vào **net quota saving**, không nhắm vào con số phần trăm nén đẹp. Một handler chỉ được bật mặc định khi tổng input giảm mà không làm tăng số lần gọi tool, không làm xấu cache và không giảm tỷ lệ hoàn thành tác vụ.

## 2. Vì sao bỏ đường proxy — bài học từ headroom

Session cuối của `headroom-custom` đã chốt hai điểm tại message `#46488` và `#46495` trong global brain:

- Người dùng đang dùng Claude Team subscription, không thanh toán trực tiếp theo token API. Vì vậy tối ưu USD của Headroom không phải mục tiêu đúng.
- Headroom đứng ở `ANTHROPIC_BASE_URL`, nên mọi request đi qua proxy. Lợi nén quan sát được chỉ khoảng 8–12% trên một số tool output, trong khi một lần prefix cache bị mất có thể làm quota tăng mạnh hơn phần tiết kiệm.
- Memory xuyên session là phần có giá trị riêng, nhưng không cần gắn với proxy HTTP.

Tài liệu chính thức của Claude hiện xác nhận subscription có usage theo plan, `/usage` hiển thị breakdown của plan và số USD không phải thước đo billing phù hợp cho subscriber. Claude cũng khuyến nghị preprocess tool data bằng hooks trước khi model nhìn thấy nó. Nguồn: [Manage costs effectively](https://code.claude.com/docs/en/costs).

## 3. Các bất biến chống lặp lại lỗi cũ

Thiết kế mới phải giữ đủ các bất biến sau:

1. **Không proxy model traffic.** Không đặt `ANTHROPIC_BASE_URL`, không MITM OAuth, không sửa header, `cache_control`, TTL hoặc body request.
2. **Không tạo request model phụ.** Compressor không gọi Claude/OpenAI hay model cloud để tóm tắt. Bản đầu chỉ dùng parser và heuristic deterministic; semantic local là tùy chọn sau.
3. **Không sửa lịch sử đã gửi.** Chỉ quyết định output mới nào được nhận vào transcript. Không rewrite message cũ, system prompt cũ hoặc tool result cũ.
4. **Không thay tool schema giữa session.** MCP server có bộ tool ổn định từ lúc session bắt đầu; không connect/disconnect động.
5. **Không auto-approve quyền.** Hook nén không được dùng `permissionDecision: allow` chỉ để ép rewrite command. Quyền chạy tool vẫn do host và user quyết định.
6. **Không nén mọi thứ.** Code ngắn, diff nhỏ, prose cô đặc, lỗi khó phân loại và output không tiết kiệm đủ phải đi qua nguyên vẹn.
7. **Không đánh đổi khả năng hoàn thành.** Nếu agent phải gọi thêm tool để lấy lại dữ liệu đã bị cắt thì phần gọi thêm được tính là chi phí của compressor.
8. **Không tạo memory store cạnh tranh.** `global_memory.db` vẫn là memory provider duy nhất. Artifact store là kho output có TTL, không phải memory thứ hai.
9. **Không làm đứt session.** Hook lỗi thì fail-open và trả output gốc; có kill switch tức thời, không cần kill proxy hay restart giữa phiên.

## 4. Kiến trúc đề xuất: Quota-Safe Admission Gateway

```text
Agent gọi tool
     |
     v
Tool thật chạy đúng 1 lần
     |
     v
Host adapter (PostToolUse hoặc tool wrapper)
     |
     +--> Raw artifact local, content-addressed, có TTL
     |
     v
Admission policy
     |
     +--> passthrough: output nhỏ / dense / rủi ro cao
     |
     +--> compact envelope: signal chính + artifact handle
                              |
                              v
                    transcript / request model kế tiếp
                              |
                    cần thêm thì gọi MCP search/show

Stop/SessionEnd --> ingest transcript --> global_memory.db
MCP brain tools  --> search/show đúng phần cần recall
```

Đây là **admission control**, không phải request compression. Nó giảm dữ liệu ngay tại điểm output mới chuẩn bị đi vào context. Theo tài liệu Claude, `PostToolUse.updatedToolOutput` thay tool result trước khi result được gửi cho Claude. Nguồn: [Hooks reference](https://code.claude.com/docs/en/hooks#posttooluse-decision-control).

Prompt cache của Claude dựa trên exact prefix; nội dung mới thường được append ở cuối. Vì gateway không sửa prefix cũ nên nó giữ mô hình append-only tự nhiên. Subscription còn được Claude Code chọn TTL một giờ tự động. Nguồn: [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching).

## 5. Ranh giới module trong zemory

Kiến trúc vẫn giữ luật `1 capability = 1 slot = 1 provider`:

- Slot `compress` có một provider duy nhất: `quota-safe`.
- `quota-safe` sở hữu policy, artifact contract, metrics và quyết định passthrough/compact.
- RTK, squeez hoặc compressor nội bộ chỉ là engine nằm sau provider; chúng không tự đăng ký thêm slot.
- Slot `memory` vẫn do global brain sở hữu.
- Slot `search` vẫn dùng FTS của brain; semantic local có thể thay provider sau nhưng không chạy song song như một nguồn sự thật khác.
- Host adapter chỉ là transport cho Claude/Codex/Gemini, không phải capability provider.

Các khối code dự kiến:

```text
src/compress/
  policy.ts             # quyết định có nên nén và mức budget
  envelope.ts           # contract kết quả ngắn + artifact handle
  handlers/             # test, build, git, logs, json, generic
  engines/              # local, rtk, squeez adapter

src/artifacts/
  store.ts              # content-addressed files + metadata
  search.ts             # tìm trong một artifact, trả chunk nhỏ
  retention.ts          # TTL, quota đĩa, redaction/index

src/hosts/
  claude.ts             # typed PostToolUse output replacement
  codex.ts              # wrapper/MCP + capability detection
  generic-mcp.ts        # host không có hook rewrite

src/mcp/
  server.ts             # một stdio server, bộ tool ổn định

src/eval/
  fixtures.ts           # corpus output thật
  replay.ts             # benchmark không gọi model
  canary.ts             # A/B có kiểm soát
```

## 6. Contract output: ngắn nhưng luôn truy hồi được

Mỗi output đã nén phải có envelope ổn định, không dùng văn phong khó giải mã:

```text
[zemory output zmo_01J...]
command: pnpm test
exit: 1
size: 4,812 -> 94 lines
kept: 3 failing suites, 7 error blocks, final summary
full: zemory output show zmo_01J...
search: zemory output search zmo_01J... "AuthError"
---
<signal đã giữ>
```

Quy tắc của envelope:

- Luôn giữ command/tool, exit status, kích thước trước/sau và ID.
- Lỗi giữ test name, error message, path, line/column, stack frame liên quan và summary cuối.
- Output thành công của test/build có thể rút mạnh vì phần lặp thường là noise.
- JSON dạng bảng đồng nhất có thể chuyển sang biểu diễn cột gọn nhưng phải round-trip được hoặc có artifact gốc.
- Read/code không được “tóm tắt ý nghĩa” bằng heuristic. Chỉ paginate, lấy symbol/range hoặc trả handle.
- Nếu estimated reduction dưới ngưỡng, trả nguyên bản để tránh format-change tax.

## 7. Admission policy chống over-compression

Policy mặc định theo ba tầng:

### Tầng A — passthrough

Áp dụng cho output nhỏ, code/prose cô đặc, diff nhỏ, dữ liệu không nhận dạng hoặc output mà bản nén không giảm tối thiểu 30%. Bản trả về phải byte-equivalent sau khi bỏ ANSI/progress thuần túy nếu policy cho phép.

### Tầng B — deterministic compact

Áp dụng cho test/build/lint/log/git/listing/JSON lớn đã có handler. Handler phải giữ signal theo schema của command, không chỉ head/tail chung chung.

### Tầng C — artifact-first

Áp dụng cho output rất lớn như logs, browser snapshot, API response, CSV hoặc kết quả nghiên cứu. Raw data không vào transcript; transcript chỉ nhận index card và các hit liên quan. Agent dùng `output search/show` để progressive disclosure.

Ngưỡng ban đầu nên bảo thủ:

- Dưới 8 KB hoặc dưới 80 dòng: passthrough mặc định.
- Chỉ compact khi dry-run dự đoán giảm ít nhất 30% và không mất required signals.
- Error output dùng budget rộng hơn success output.
- Một artifact bị mở lại quá hai lần trong vài turn được đánh dấu `recovery`; handler tương ứng giảm aggression hoặc tự tắt cho session đó.

Các số trên là giá trị khởi tạo để benchmark, không phải hằng số sản phẩm. Profile cuối phải được hiệu chỉnh từ corpus thật của người dùng.

## 8. Adapter theo host

| Host | Đường cứng khả thi | Fallback | Mức cam kết ban đầu |
|---|---|---|---|
| Claude Code | `PostToolUse.updatedToolOutput` cho Bash, Read, Grep, Glob và MCP; typed shape theo từng tool | fail-open output gốc | Hard admission cho tool đã có schema |
| Codex CLI | `zemory run`, engine CLI và zemory MCP; PostToolUse dùng capture/metrics | AGENTS.md hướng agent dùng wrapper/MCP | Hard cho command/MCP, soft cho built-in read/grep |
| Gemini/Copilot/OpenCode | Adapter riêng theo capability matrix sau khi probe runtime | generic MCP | Chỉ claim phần đã test thật |
| Host không hook | MCP tools trả output ngắn ngay từ nguồn | CLI wrapper thủ công | Không claim coverage built-in |

Claude Code hiện là host tốt nhất để làm MVP vì hook chính thức cho phép thay output trước khi Claude thấy nó. Hook phải trả đúng shape của tool; nếu shape sai, host bỏ bản thay thế và dùng output gốc. Đây là fail-safe tự nhiên nhưng vẫn cần test contract.

Codex có hooks và MCP chính thức, nhưng tại thời điểm khảo sát, `updatedInput` cho PreToolUse và hook surface của `read_file`/`grep` vẫn đang là gap được theo dõi ở [openai/codex#18491](https://github.com/openai/codex/issues/18491). Vì vậy plan không giả vờ có hard coverage trên Codex. Nguồn host: [Codex hooks](https://developers.openai.com/codex/hooks) và [Codex MCP](https://developers.openai.com/codex/mcp).

Mỗi adapter phải có `probe()` và trả capability thật, ví dụ:

```json
{
  "host": "codex",
  "canRewriteToolInput": false,
  "canReplaceToolOutput": false,
  "canCaptureToolOutput": true,
  "hasMcp": true,
  "mode": "wrapper+mcp"
}
```

UI/doctor chỉ hiển thị “protected” cho surface nào probe và integration test đã qua.

## 9. Tích hợp global memory và các tool khác

Global memory đã được DỜI về `~/.zemory/global_memory.db` (migration 2026-06-25, có rollback). zemory đọc/ghi qua biến môi trường `GLOBAL_MEMORY_DB`. DB không còn nằm trong folder `headroom-custom` — headroom đã bỏ hoàn toàn; bản DB cũ ở đó chỉ giữ làm rollback.

MCP server của zemory chỉ cần một bộ tool nhỏ và ổn định:

- `zemory_brain_search(query, project?, limit?)`
- `zemory_brain_show(id)`
- `zemory_output_search(artifact_id, query, limit?)`
- `zemory_output_show(artifact_id, offset?, limit?)`
- `zemory_context_card(project)`

Nguyên tắc memory:

- Stop/SessionEnd chỉ ingest deterministic, không gọi LLM để tạo memory.
- Recall mặc định on-demand; không auto-push cả lịch sử vào mỗi prompt.
- Artifact metadata liên kết với `session_id`, `project_root`, tool và timestamp để brain search có thể dẫn tới output gốc.
- Nội dung index phải được redact secret trước. Raw artifact local dùng quyền file hạn chế; artifact là **bộ nhớ vĩnh viễn** (không TTL, không tự xóa) — disk quản bằng archive gzip + cảnh báo quota; dữ liệu nhạy cảm có thể đặt `no-store`.
- MCP tool definitions giữ nguyên trong session và ưu tiên deferred loading để không làm thay đổi system prompt giữa các turn.
## 10. Data model mở rộng

Không nhét raw output vào bảng `messages`. Dùng metadata trong SQLite và content-addressed file ngoài DB:

```sql
artifact(
  id, sha256, project_root, session_id, source, tool_name,
  command_redacted, exit_code, media_type, raw_bytes, admitted_bytes,
  storage_path, retention_class, created_at, expires_at
)

artifact_index(
  artifact_id, ordinal, text_redacted
)

compression_event(
  id, artifact_id, engine, handler, policy,
  before_chars, after_chars, before_lines, after_lines,
  estimated_tokens_before, estimated_tokens_after,
  passthrough_reason, recovery_count, created_at
)
```

`ledger` hiện tại vẫn giữ báo cáo tổng quát. `compression_event` là bằng chứng chi tiết để audit. Token nếu chỉ ước lượng phải ghi rõ estimated; số đo thật luôn ưu tiên bytes/chars/lines và token fields do host cung cấp.

## 11. Repo có sẵn và quyết định sử dụng

| Repo | Giá trị dùng được | Quyết định cho zemory |
|---|---|---|
| [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | Apache-2.0, binary nhanh, hơn 100 command handlers, CLI output compression | Dùng như engine tùy chọn cho whitelist command đã benchmark; không bắt buộc cài, không auto-rewrite mọi `read/cat` |
| [claudioemmanuel/squeez](https://github.com/claudioemmanuel/squeez) | Apache-2.0, hook adapters đa-host, `updatedToolOutput`, cross-call dedup, MCP và eval corpus | Nguồn tốt nhất để extend/tham khảo adapter và eval; không bật persona/session-memory riêng để tránh cạnh tranh global brain |
| [mksglu/context-mode](https://github.com/mksglu/context-mode) | Artifact/sandbox + FTS5 + progressive disclosure; kiến trúc gần nhất với mục tiêu | Dùng làm reference kiến trúc. Không nhúng core vì ELv2 và vì nó tạo SQLite/session layer riêng |
| [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | Memory/MCP reference server và SDK examples | Dùng làm reference protocol, không dùng memory server làm provider production |
| [mem0ai/mem0](https://github.com/mem0ai/mem0) | Memory framework đa tầng | Không dùng trong core: mặc định cần LLM/embedding và tạo nguồn memory thứ hai; chỉ cân nhắc adapter tùy chọn sau |
| [openai/codex](https://github.com/openai/codex) và [anthropics/claude-code](https://github.com/anthropics/claude-code) | Host APIs, hooks, MCP và issue tracker | Dùng làm nguồn sự thật cho capability matrix, không fork host |

Một cảnh báo phải đưa vào eval: issue [rtk-ai/rtk#582](https://github.com/rtk-ai/rtk/issues/582) ghi nhận trường hợp output ít khả năng nén có thể làm tổng chi phí tăng; kết luận cuối của maintainer cũng khuyến nghị chỉ áp dụng vào output máy lớn và lặp. Vì vậy zemory không dùng “phần trăm input saved” làm tiêu chí duy nhất.

## 12. Trình tự triển khai có cổng an toàn

### Giai đoạn A — Baseline và safety contract

Chốt corpus output thật, snapshot behavior hiện tại của `zemory run/compress`, thêm fixture success/failure/dense-code/secret/huge-output và định nghĩa metric net. Chưa cài hook mới ở giai đoạn này.

### Giai đoạn B — Artifact store và envelope

Build content-addressed store, retention, redaction, `output show/search` và exact-recovery test. Đây là nền bắt buộc trước khi cắt bất kỳ nội dung nào.

### Giai đoạn C — Quota-safe provider

Nâng compressor từ generic head/tail thành handler theo command. Engine local là fallback luôn có; RTK/squeez được gọi qua adapter nếu hiện diện và chỉ sau benchmark. Policy có passthrough threshold, recovery detector và per-handler circuit breaker.

### Giai đoạn D — Claude adapter canary

Cài riêng `PostToolUse` capture trước, chưa replace output. Khi metrics và shape đúng, bật replacement cho Bash success output; sau đó mới mở rộng sang test failures, Read/Grep/Glob và MCP. Không dùng proxy và không thay auth.

### Giai đoạn E — MCP hợp nhất compression + brain

Thêm stdio MCP server với năm tool ổn định. `brain_search/show` đọc đúng global DB hiện tại; `output_search/show` đọc artifact. Không có memory DB thứ hai.

### Giai đoạn F — Codex và host khác

Codex dùng wrapper + MCP + AGENTS guidance cho tới khi capability probe xác nhận upstream hỗ trợ hard rewrite. Mỗi host khác chỉ bật surface đã có integration test; không suy diễn parity từ Claude.

### Giai đoạn G — Rollout theo profile

Ba profile `off`, `conservative`, `balanced`; không có `aggressive` mặc định. `conservative` chỉ xử lý output lớn của test/build/log. Profile được nâng sau A/B, và tự hạ nếu recovery rate tăng.

## 13. Evals bắt buộc trước khi bật mặc định

### Offline replay, không tốn quota

- Chạy corpus raw qua từng engine và handler.
- Required signals của lỗi phải giữ 100%: command, exit, error class/message, failing test, path và line.
- Output nhỏ/dense không đủ 30% reduction phải passthrough.
- Artifact `show` phải khôi phục byte-exact raw output.
- p95 local latency mục tiêu dưới 50 ms cho output 1 MB; timeout thì passthrough.

### Live paired canary, dùng ít quota và đảo thứ tự

Chạy cùng scripted task ở session mới, luân phiên `raw -> zemory` và `zemory -> raw` để giảm cache ordering bias. So sánh:

- task success và thời gian hoàn thành;
- tổng model turns và số tool calls;
- số lần agent mở lại artifact hoặc chạy lại command;
- input/cache read/cache creation fields host ghi nhận;
- plan usage delta chỉ dùng làm tín hiệu phụ vì attribution của subscription không hoàn toàn công khai.

Handler chỉ qua gate khi median input thực giảm, cache creation ratio không xấu đi, tool-call count không tăng đáng kể và chất lượng không giảm. Nếu kết quả không rõ, mặc định giữ `off` hoặc `conservative`.

### Metric sản phẩm

Dashboard cần tách rõ:

- `raw bytes avoided`: đo thật;
- `admitted bytes`: đo thật;
- `estimated tokens avoided`: ước lượng, phải gắn nhãn;
- `recovery calls`: chi phí bù do nén;
- `net context saved`: saving trừ recovery/injection overhead;
- `cache read/create`: lấy từ host khi có;
- `subscription quota saved`: **không claim số tuyệt đối** nếu provider không cung cấp attribution đủ chính xác.

## 14. Fail-safe và kill switch

- `ZEMORY_COMPRESS=off` làm mọi hook no-op ngay, không ảnh hưởng capture/memory.
- `zemory hook doctor` kiểm tra host version, schema support, engine có trong PATH và quyền ghi artifact.
- Engine thiếu hoặc crash: dùng local engine; local engine lỗi: passthrough raw.
- Artifact store đầy: **CẢNH BÁO** (`output stats`) + **archive** (gzip lossless) các file nguội; **KHÔNG bao giờ tự xóa** — artifact là bộ nhớ vĩnh viễn, user thêm ổ hoặc tự `output rm`. Nếu vẫn ghi lỗi thì passthrough, không chặn tool.
- Output có secret marker hoặc binary: no-store hoặc metadata-only.
- Một handler tạo recovery loop: circuit breaker tắt handler cho session và ghi audit event.
- Gỡ compression không gỡ global memory; hai capability độc lập.
## 15. Quyết định kiến trúc cuối
Phương án được chốt là:

**zemory quota-safe admission gateway + artifact progressive disclosure + global brain, không model proxy.** Compression là capability chủ chốt và là ưu tiên triển khai số 1 của session kế tiếp.

Giá trị Zemory sở hữu không phải một thuật toán truncate đơn lẻ mà là:

- admission policy chọn passthrough, deterministic compact hoặc artifact-first;
- raw artifact local có range/query retrieval và redaction;
- engine routing: structured code/read ưu tiên LeanCTX; output tự do chỉ dùng semantic engine khi benchmark thắng;
- bounce/re-read detection và fallback tự động;
- đo net token/tool-call/cache impact thay vì chỉ phần trăm nén;
- dùng chung global brain và host adapter nhưng không rewrite conversation history;
- tuyệt đối không dùng `ANTHROPIC_BASE_URL`, không proxy Messages API và không auto-allow tool permission.

### Bàn giao cho session kế tiếp

Đọc plan này, đặc biệt §3–§7, §12–§15. Chỉ cần bàn/chốt ba thông số còn ảnh hưởng implementation: bề mặt MVP đầu tiên (wrapper/MCP/PostToolUse capability-probed), TTL/disk quota của artifact, và cách gọi LeanCTX optional binary. Chốt xong thì build ngay Giai đoạn A → C trong cùng session: safety contract + baseline, artifact store/envelope, rồi provider `quota-safe`. MCP memory, semantic rerank và UI không được ưu tiên trước lõi compression.

Đây là đường giữ phần mạnh của LeanCTX (structured code/read) nhưng loại bỏ kiểu proxy đã thất bại trên subscription quota. headroom đã bỏ hoàn toàn.
