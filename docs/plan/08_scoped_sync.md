<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Scoped sync — chọn nguồn để đồng bộ / recall (Local·Web × máy × agent × nền)

> Spec: một **bộ chọn phạm vi** dạng cây mở rộng theo tầng, để người dùng tick chính xác lane trí nhớ nào được **sync / merge / recall** — và **loại "chỗ xài chung không nên lấy"**.
> **Trạng thái (cập nhật 2026-07-10): ✅ ĐÃ BUILD — core + CLI + UI.** `backend/src/memory/scope.ts` + `zemory memory scope [ls|exclude|include|clear]`. Nền provenance (`origin`/`source`/`host`/`project_root`) tái dùng, KHÔNG thêm store/table (đúng thiết kế §3).

## 1. Mục tiêu & nguyên tắc
- Cho phép **chọn đúng lane** trí nhớ theo cây phân tầng, thay vì "tất cả hoặc không".
- **Loại trừ chỗ dùng chung**: có những nơi (account web dùng chung, máy công ty, agent tạp…) **không nên** ingest vào memory riêng — phải bỏ được.
- **Provenance TUYỆT ĐỐI không lẫn**: mỗi memory luôn giữ nguồn gốc thật; bộ chọn chỉ *lọc*, KHÔNG bao giờ đổi/gộp nguồn (RULES §3 — 1 nguồn sự thật).
- Tái dùng engine sẵn có (RULES §1): không viết store thứ 2; bộ chọn = query rollup + bộ lọc.

## 2. Cây chọn — 2 nhánh gốc — ✅ ĐÃ CÓ
- **Local** → **máy** (`host`) → **agent** (`source`: claude-code / codex / continue / lmstudio…)
- **Web** → **nền** (`source`: chatgpt-web / gemini-web / claude-web) *(+ Claude desktop nếu sau này có adapter)*
- `scopeTree()` (scope.ts) dựng cây, đếm session/message mỗi nút; `laneKey()` = định danh lane ổn định cho toggle UI/dedup.

## 3. Mô hình dữ liệu — ĐÃ CÓ, KHÔNG thêm bảng
- Cây suy ra từ 4 cột sẵn có trên `sessions`: `origin` (local|web) · `source` (agent/nền) · `host` (máy) · `project_root` (dự án).
- Không migration, không cột mới — đúng như thiết kế.

## 4. Áp bộ chọn vào đâu — 2/3 điểm ĐÃ DÙNG, 1 điểm CHƯA
- ✅ **recall / search** (`backend/src/memory/search.ts`): `isExcluded()` lọc theo `excludeLanes` (mặc định = `getScopeExclude()` từ settings) trước khi trả kết quả.
- ✅ **sync** (`backend/src/memory/share.ts` export + merge): cùng danh sách exclude áp cho cả 2 chiều.
- ✅ **ingest (scan / scan-web)** — **XONG 2026-08-06**: cùng bộ lọc áp ở cả ba cửa nạp (xem §Còn lại).

## 5. "Chỗ xài chung không nên lấy" — cơ chế loại trừ — ✅ ĐÃ CÓ
- Danh sách exclude lưu ở **`settings.json`** (qua `getScopeExclude`/`setScopeExclude` trong `backend/src/settings.ts`) — đúng phương án nghiêng ở §6 cũ (config, không phải data).
- Mặc định **include tất**; exclude opt-in, **hiện rõ** trong `zemory memory scope ls` (đánh dấu `✗ EXCLUDED` / `✗ excluded (covered by a broader rule)`) — không cắt âm thầm.
- Exclude là *lọc lúc chạy*, KHÔNG xóa dữ liệu; muốn xóa hẳn vẫn dùng `memory forget`.
- CLI: `zemory memory scope exclude|include --origin <local|web> --host <máy> --source <agent>` · `zemory memory scope clear`.
- UI: `ui.ts` đã expose `scopeTree`/`scopeExcluded`/`scopeRules` cho cockpit.

## 6. Quyết định — ĐÃ CHỐT qua code (không còn "mở")
- ✅ Lưu ở `settings.json` (không phải cột/bảng) — đúng như nghiêng.
- ✅ Exclude theo **lane tĩnh** (origin/host/source cụ thể) — **CHƯA** có rule dạng glob project_root (nếu cần lọc theo pattern project thì đây là mở rộng sau).
- ❌ **Profile nhiều bộ chọn** (đổi nhanh "chỉ code"/"chỉ web") — CHƯA có, chỉ 1 danh sách exclude đang hoạt động tại 1 thời điểm.
- ✅ UI tái dùng app-mode window có sẵn (không phải cây tick riêng biệt — hiện là data-driven, xem cockpit).
- ✅ Quan hệ với sync xuyên máy (plan 02 §0): scope lọc TRƯỚC khi export và TRƯỚC khi merge — đúng thiết kế.

## 7. MỨC ĐỘ sync (ý tưởng user 2026-07-20) — chọn sync "sâu tới đâu"

> 🔄 **LỖI THỜI TỪ 2026-08-12 — đọc §8.0 trước.** Cả mục này dựng trên tiền đề *"bundle mặc định
> chỉ chở 4 bảng nguồn, lớp dẫn xuất để máy nhận tự dựng lại"*. Tiền đề đó **đã bị bãi bỏ**: kho
> chính nay chở **TRỌN bộ RAG** (nguồn + vector + cửa sổ phụ của tin dài), vì bắt máy nhận nhúng
> lại là sai mục đích của cả hệ (HP điều 16). Ba mức L1/L2/L3 vì vậy **không còn là trục chọn**:
> mặc định là "đủ", không phải "gọn".
> Phần dưới GIỮ LẠI làm hồ sơ — nó giải thích vì sao có `attachment_ship`, và chính khuôn
> làm-phẳng-theo-`(session_id, uuid)` của L3 là thứ được dùng lại để chở vector ở §8b.

> Khác §2–§5: chỗ đó chọn **LANE NÀO** (Local/Web × máy × agent) được sync. Mục này chọn **SÂU TỚI ĐÂU** trong một lane: chỉ chữ, hay kéo theo cả file đã upload. User nêu: *"chọn sync ở mức độ nào, mess thôi, hoặc lấy luôn file đã up"*.

**Ba mức đề xuất:**

| Mức | Chở gì | Trạng thái |
|---|---|---|
| **L1 — chỉ message** ("mess thôi") | `sessions` · `messages` · `known_stores` | ✅ **ĐÃ LÀ MẶC ĐỊNH HÔM NAY** — chính là bundle `payload=rows` (lean 184.6MB · delta 1.8MB) |
| **L2 — snapshot đầy đủ** | thêm mọi lớp dẫn xuất (FTS · vector · digest · doc/section) | ✅ đã có: cờ `--full`, giữ cho disaster-restore |
| **L3 — kèm FILE đã upload** | bytes của ảnh/file người dùng đính kèm | ✅ **XONG 2026-07-28** — công tắc opt-in, mặc định TẮT |

### L3 — ĐÃ LÀM (2026-07-28), cả ba bước
> 🔄 **Supersede** kết luận "❌ CHƯA KHẢ THI" bên dưới (viết 2026-07-20). Kết luận đó **đúng với dữ kiện lúc đó** — khi ấy schema thật sự không có bảng file và adapter bỏ mọi part non-text. Ba tiền đề nó đòi nay đã có đủ, nên phần đo cũ giữ lại làm hồ sơ, KHÔNG xoá.

| bước nó đòi | trạng thái |
|---|---|
| ① giữ + tải phần non-text lúc ingest | ✅ cả **6 adapter** dùng chung `_shared.imageAttachment` (Anthropic base64 · OpenAI `image_url` · ChatGPT `image_asset_pointer` ⇒ `ref`) |
| ② chỗ chứa blob | ✅ bảng `attachment` + `attachment_link`, dedup `sha256` (schema v19) |
| ③ mức sync chở nó | ✅ công tắc `🖼 Kèm ảnh` (`/set-sync-attachments`), **mặc định TẮT** |

**Thiết kế chốt của bước ③:**
- **KHÔNG phải mức thứ ba** cạnh Gọn/Đầy đủ — là **công tắc độc lập**, ảnh đi kèm được ở cả hai mức. (User 2026-07-28: *"dạng check có lấy hay không, giống setting đang có"*.)
- **Mặc định TẮT có chủ đích**: bundle lean vừa cắt −74%, thả blob vào là xoá phần lớn lợi ích đó ⇒ phải là lựa chọn có ý thức của từng máy. `settings-defaults.test.mjs` khoá mặc định này.
- Bundle chở bảng phẳng **`attachment_ship`** mang `session_id` + `msg_uuid`, **KHÔNG mang `message_id`**: id là AUTOINCREMENT CỤC BỘ và cố ý không đi theo bundle (merge khoá `UNIQUE(session_id, uuid)`) — chở id sang máy khác là trỏ vào tin của người ta. Bên nhận tra lại id của mình rồi mới nối; nội dung dedup theo `sha256` nên cùng một ảnh từ nhiều máy chỉ tốn một hàng.
- Bundle cũ / máy gửi tắt công tắc ⇒ không có bảng đó ⇒ merge **im lặng bỏ qua** (fail-open, điều 9).
- **Điều 7 vẫn giữ:** blob đi qua bundle `.enc` như mọi thứ khác, KHÔNG đẩy vào `share/` git-LFS.
- Test round-trip dựng máy nhận có id lệch hẳn (9001): bật ⇒ nối đúng id máy nhận · tắt ⇒ **0** blob.

**Kiểm chứng khả thi L3 (đo thật trên DB sống 2026-07-20 — KHÔNG suy đoán; giữ làm hồ sơ):**
- Schema **không có bảng/cột nào chứa file**: `messages` chỉ có `content TEXT` (`id · session_id · uuid · role · content · tool_name · timestamp`); không có `artifact`/`attachment`/blob store nào trong DB.
- Trên **144.396 message**: `file-service://` (con trỏ asset của ChatGPT) = **0 dòng**; chuỗi `attachment` = 77 dòng nhưng là **chữ người viết**, không phải tham chiếu tải được.
- Nguyên nhân: `scanweb.ts` flatten `content.parts[]` **chỉ lấy phần text** — part ảnh/file bị bỏ ngay lúc ingest. Nên **không có cả con trỏ lẫn bytes** để mà sync.
- Với agent local (Claude Code/Codex): "file" đi vào memory dưới dạng **tool output = text** trong `messages`, nên L1 vốn đã chở phần chữ đó rồi; cái thiếu chỉ là **binary gốc**.

⇒ **L3 không phải một công tắc sync — nó là một năng lực CAPTURE mới**, phải làm trước 3 việc: ① `scanweb` giữ non-text part + tải asset qua phiên đã login · ② có chỗ chứa blob (kiểu `artifact` store — thiết kế cũ nằm ở plan 03 DROPPED + `attic/`) · ③ rồi mới thêm mức sync chở nó.

**Phản biện thiết kế trước khi ai đó bắt tay vào L3** (nêu để quyết định có cơ sở, quyền chốt là user):
- **Đụng HP điều 7:** `share/` là git-LFS **tracked**; nhét file người dùng upload vào bundle = đẩy PII thật lên git — điều 7 cấm commit data thật. Nếu làm, blob phải nằm ngoài luồng git hoặc mã hoá + tách kho.
- **Đụng kết quả vừa đạt:** vừa cắt bundle 709MB → 184MB → delta 1.8MB (−74%); binary sẽ thổi ngược lại và xoá phần lớn lợi ích đó.
- **Đề xuất:** làm **L1/L2 selector trước** (đã có sẵn, chỉ thiếu chỗ bấm), L3 để dạng ý tưởng có điều kiện — chỉ mở khi user thật sự cần file gốc xuyên máy và chấp nhận đánh đổi dung lượng + luồng lưu riêng cho blob.

## 8.0 YÊU CẦU GỐC CỦA ĐỒNG BỘ — user chốt 2026-08-12, ĐỌC TRƯỚC KHI ĐỘNG VÀO SYNC

> Chép lại nguyên ý user, vì phiên này đã đi sai **bốn lần** do agent tự suy diễn thêm ràng buộc
> mà user không đặt ra. Mọi thay đổi ở §8/§8b phải đối chiếu về đây trước.

1. **Kho THẬT nằm ở `<repo>/data/` của TỪNG máy** — đó là bản đầy đủ nhất. Thứ trên Drive chỉ
   là chỗ gặp nhau; hỏng/mất nó không mất dữ liệu, sync lại là xong.
2. **Trên Drive luôn CHỈ tồn tại MỘT kho chính — một file.** Cần thì thêm đúng một bản lùi.
   **KHÔNG** mỗi máy một file, **KHÔNG** series theo host, **KHÔNG** đống file rải rác.
3. **Mọi máy bấm sync đều ghi vào CHÍNH file đó** — không được ghi sang file khác.
4. **Ghi là NỐI THÊM, không ghi đè.** Đã tối ưu thì không có chuyện mỗi lượt sync viết lại
   nguyên gói.
5. **Chở TRỌN bộ RAG** — vector và mọi lớp dò, không giữ lại phần nào. Cả gói đã mã hoá bằng
   share key, nên lý lẽ "cẩn thận nên bỏ bớt phần này" là **thừa và sai mục tiêu**.
6. **Máy mới: cài zemory + có chìa ⇒ đọc được Global Memory NGAY.** Đây là mục đích thật của
   zemory. **KHÔNG máy nào được nhúng lại kho của máy khác** — bắt máy mới chờ hàng chục giờ
   là vô lý, và là dấu hiệu thiết kế sai.
7. **Mỗi máy chỉ nhúng ĐÚNG phần dữ liệu của chính nó**, rồi add thẳng vào GM.
8. **Mọi tiến trình lên GM đều là ADD THÊM.** Không chạy lại, không dựng lại, không ghi đè.
9. **Tự động** — người dùng không phải nhớ bấm gì.

**Bốn lần đi sai của phiên 2026-08-12, ghi ra để không lặp:** ① dựng series theo từng máy ⇒
13 file / 2,9 GB cho cùng một kho · ② định ghi đè nguyên gói mỗi lượt sync (user: *"đã tối ưu mà
cứ ghi đè thì ai chơi"*) · ③ bỏ 11.233 tin `uuid=NULL` vì "khó định danh" ⇒ đẩy 3,9 giờ nhúng
lại sang máy mới · ④ bỏ 7.381 cửa sổ phụ vì "chỉ 2,6%, không đáng" ⇒ máy nhận mất phần đuôi tin
dài mà không cổng nào thấy. **Mẫu số chung: agent tự thêm ràng buộc an toàn/đơn giản mà user
không đặt, rồi trả bằng đúng thứ user cần nhất.**

## 8. MỘT KHO CHÍNH TRÊN DRIVE — ghi bằng NỐI THÊM (user chốt 2026-08-12)

> 🔄 **Supersede §7 vế "series theo từng máy"** (baseline + delta mang tên host, gộp khi đủ 12
> file). Vế đó khiến MỖI máy đẻ một baseline riêng của **cùng một kho đã hội tụ** — đo trên Drive
> thật: `DESKTOP-PFB157K.000003` (1.312 phiên · 235.839 tin · 331 MB) và `SS01-IT-12.000024`
> (1.314 · 238.422 · 336 MB) gần như trùng nội dung, tức 667 MB cho thứ một gói phủ xong. Nguyên
> văn user: *"trên drive luôn chỉ tồn tại 1 kho chính, 1 file duy nhất… bất kể máy nào bấm sync
> đều ghi lên 1 file đó, không được ghi vào file khác"*.

**Định dạng.** `global_memory.enc` = container:

```
ZEMORY-MEMORY-CHUNKS v1
ZCHUNK <độ dài>  <nguyên một bundle .enc>
```

Mỗi khối là một bundle HOÀN CHỈNH (header · salt · iv · thẻ xác thực riêng), chỉ nối vào cuối.
Chọn hình dạng này thay vì bẻ lại lớp mã hoá vì hai lẽ: ① nối thêm là nối thật — không giải mã,
không mã hoá lại, không đụng byte cũ (sync thường ngày nối ~100 KB thay vì viết lại ~336 MB);
② mọi khối vẫn đi qua đúng `exportMemoryBundle`/`mergeMemoryBundle` — tự chế khung mật mã mới là
chỗ dễ sai nhất, không có lý do chạm vào. Tiền tố ĐỘ DÀI, không dò dấu hiệu đầu gói: bản mã trông
ngẫu nhiên nên có thể chứa đúng chuỗi dấu hiệu, bộ đọc dò-dấu-hiệu sẽ cắt nhầm giữa thân gói.

**Giao thức một lượt sync:** khoá (`global_memory.sync.lock`, mồ côi sau 15 phút) → **merge mọi
khối chưa có** (và mọi file `.enc` đời cũ còn sót) → **nối** khối của mình → nhả khoá. Thứ tự
gộp-trước-ghi-sau là BẮT BUỘC: ngược lại thì khối mình ghi thiếu phần máy kia. Không có tin mới ⇒
KHÔNG chạm file. Dedup ở mức KHỐI (`<tên file>#<số thứ tự>` + chữ ký khối), không mức file — file
đổi mỗi lần nối nên chữ ký cả file thì lượt nào cũng merge lại từ đầu.

**Tranh chấp thì BÁO, không cố chống.** Drive không có khoá file thật; khoá ở đây chỉ thu hẹp cửa
sổ và biến một lần giẫm chân im lặng thành câu báo lỗi. Chấp nhận được vì **kho THẬT nằm ở
`<repo>/data/` của từng máy** — Drive chỉ là chỗ gặp nhau, sync lỗi thì sync lại.

**Gộp:** quá `MAIN_COMPACT_CHUNKS` (48) khối ⇒ viết container mới một khối (`since=0`) ra file tạm
rồi đổi tên đè; bản trước lùi thành `global_memory.bak.enc` (giữ đúng MỘT thế hệ).

### 8b. Vector đi cùng gói (cùng đợt)

Trước đó gói chỉ chở nguồn ⇒ máy nhận có đủ chữ mà recall rơi về FTS: đo `@10` **26%/50%**
(nghiêm/tương đương) so với hybrid **38%/71%**. Nay bundle `rows` mang thêm bảng `vector_ship`
khoá theo **`session_id` + `msg_uuid`** — `messages.id` là AUTOINCREMENT cục bộ, chở id sang là
trỏ vào tin của người ta (đúng khuôn `attachment_ship` §7 đã giải cho ảnh).

- Giá **3 KB/tin** ⇒ sync ~100 tin tốn thêm ~300 KB. Con số ~700 MB là **toàn bộ 226k vector lịch
  sử**, việc MỘT LẦN lúc bàn giao máy — chưa làm.
- **Lệch `vec_config` ⇒ TỪ CHỐI kèm lý do**, tin vẫn vào đủ. Trộn hai không gian vector (256 vs
  768, q8 vs fp32) là hỏng recall im lặng — thà không có còn hơn có bậy.
- Kho đích **chưa từng nhúng** ⇒ nhận và đóng dấu cấu hình bên gửi, để không đẻ kho lai.
- > 🔄 **BÃI BỎ vế *"phạm vi hẹp: chỉ vector CHÍNH, cửa sổ phụ không chở"*** (viết 2026-08-12).
  > Vế đó sống đúng MỘT ngày: nó là một trong **bốn lần đi sai** mà `§8.0` ghi tên — *"bỏ 7.381
  > cửa sổ phụ vì chỉ 2,6%, không đáng"* ⇒ máy nhận mất phần ĐUÔI của tin dài mà không cổng nào
  > thấy. Đúng thứ HP điều 16 cấm. **Vá 2026-08-13** (release 1.5.0, `vecship.ts`): bundle mang
  > thêm bảng `vector_ship_chunk` khoá `(session_id, msg_uuid, seq)`, máy nhận dựng lại rowid
  > tổng hợp của chính nó. Nay gói chở **TRỌN** bộ RAG: vector chính **và** cửa sổ phụ.
- **Cửa sổ phụ ĐƯỢC CHỞ** — `vector_ship_chunk`, tra `vec_map` chứ không tra thẳng id tin (id là
  AUTOINCREMENT cục bộ). Đo trên kho hiện tại: **4.459 tin dài · 8.906 cửa sổ phụ**; thiếu chúng
  thì hỏi về đoạn CUỐI một tin dài là trượt, dù tin vẫn nằm nguyên trong kho.
  🔴 **LỖ MỚI, đo 2026-08-25 bằng diễn tập phục hồi (`plan/18 §4b`): vector nhúng SAU không được
  chở.** `shipVectorsInto(…, sinceMessageId)` lọc `messages.id > watermark`, nên vector chỉ đi ké
  đợt tin mới. Nhúng chạy sau tin ~30 phút (scheduler) ⇒ khi vector có thì id tin đã nằm dưới
  watermark, và nó **không bao giờ lên kênh**. Đo: kho dựng từ kênh thiếu **~22.000 vector** so
  với kho thật ⇒ máy nhận phải nhúng lại **27.035 tin (~12 giờ)** — trái HP điều 16. Đối chiếu
  chéo 300/300 tin `prose` của chính máy này: có vector tại chỗ, không có trong gói.
  **Hướng vá (chưa làm, chờ user chốt):** tách watermark RIÊNG cho vector (`vec_chunks.rowid`
  tăng đều theo thứ tự nhúng) thay vì dùng chung watermark tin — cùng khuôn `sync_state` đã có.
  Giá: bù một lần ~27k vector ≈ 81 MB, sau đó incremental như cũ.

  ✅ **Cửa sổ phụ ĐÃ CÓ CỔNG từ 2.4.0** — `backend/test/vecship-chunks.test.mjs`. *(Câu cũ ở đây, viết
  2026-08-23: "chưa có cổng nào canh, 0 file test nhắc `vector_ship_chunk`" — đúng lúc đó, sai từ
  khi cổng ship. Mục `05_TODO` "717 cửa sổ phụ" nó trỏ tới đã đóng, nay nằm ở `archive/05_TODO.md`.)*

## Còn lại (backlog thật)
- [x] ~~**Export gọn + DELTA**~~ **HOÀN TẤT 2026-07-19** — xem `06_CHANGES`. Phát hiện then chốt: `mergeMemoryBundle` VỐN chỉ đọc `sessions`/`messages`/`known_stores`; mọi lớp dẫn xuất trong bundle là **hàng chết được chở đi vô ích**. Nay bundle mặc định là **payload `rows`** (chỉ 3 bảng nguồn, DDL copy verbatim từ source nên schema đổi không phải sửa); `--full` giữ lại cho disaster-restore. `sinceMessageId` → **delta**; watermark per-bundle ở bảng `sync_state` (schema **v13**, per-máy, KHÔNG đi theo bundle). **Đo thật trên DB 709.1MB: lean 184.6MB (−74%, 4s) · delta ~1.6k msg = 1.8MB (0.2s).** Round-trip verify: 1173 session / 144.396 msg khớp tuyệt đối, **FTS dựng lại đúng** (13.946 hit `zemory`, khớp nguồn), re-merge +0/+0.
  - ~~**Còn lại:** `syncDrive` vẫn đẩy lean baseline (1 file/máy, ghi đè)…~~ **ĐÓNG 2026-08-12 —
    xem §8.** Nay đúng MỘT kho chính cho MỌI máy, ghi bằng **nối thêm** (file tích luỹ + gộp định
    kỳ, đúng hướng dòng này đã đoán), và nó chở **trọn bộ RAG** chứ không chỉ bảng nguồn.
    ⚠ Câu *"mọi lớp dẫn xuất trong bundle là hàng chết được chở đi vô ích"* ở dòng trên **chỉ đúng
    với `mergeMemoryBundle` ĐỜI 07-2019**, khi merge không biết đọc chúng. Từ 2026-08-12 merge
    nhận cả vector ⇒ lớp dẫn xuất trong gói là **hàng SỐNG**, và chính là thứ giúp máy mới khỏi
    nhúng lại hàng chục giờ (HP điều 16). Đừng đọc dòng cũ rồi cắt vector khỏi gói lần nữa.
- [x] ~~Áp scope lúc **ingest**~~ **XONG 2026-08-06** (`06_CHANGES [2026-08-06c]`): `scan` +
  `scanOneFile` (đường hook per-message) + `scanWeb` cùng một bộ lọc; lane bị loại được BÁO
  (`skippedLanes`), KHÔNG ghi `ingest_state` nên bỏ lọc là lần quét sau nạp lại đủ; `scan-web`
  chặn TRƯỚC khi mở trình duyệt (status `excluded`). §4 bên trên: điểm ingest nay ✅.
- [ ] Exclude theo **rule/glob** (không chỉ lane tĩnh) nếu cần lọc theo pattern project_root.
- [ ] **Profile nhiều bộ chọn** nếu user cần đổi nhanh giữa nhiều cấu hình exclude.
