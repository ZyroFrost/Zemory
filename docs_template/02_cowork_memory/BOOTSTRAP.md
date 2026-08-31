<!-- zemory template · BOOTSTRAP cho Claude Cowork — bản DỰNG BẢN ĐẦY ĐỦ + Global Memory riêng.
     Agent ĐỌC VÀ THI HÀNH, không phải người đọc. Bản mẫu TRẮNG: không nêu tên dự án cụ thể. -->
# Dựng zemory đầy đủ + bộ nhớ riêng — cho Claude Cowork

> **File này để agent đọc và thi hành**, không phải để người đọc.
>
> **Đối tượng dùng: người KHÔNG rành kỹ thuật.** Họ dán đúng một câu, rồi không gõ gì nữa. Mọi
> thứ dưới đây — cài Node, tải mã nguồn, dựng, quét, nhúng, nối — **là việc của BẠN**. Thấy máy
> thiếu gì thì cài nấy; tuyệt đối không liệt kê một danh sách yêu cầu rồi ngồi chờ họ làm.
>
> Kết quả: máy họ có **zemory chạy được** + **kho nhớ riêng của họ** + trợ lý **đọc được kho đó**.
> Khác bộ `cowork/` cũ: bộ cũ chỉ **chép file** bộ chuẩn, không có kho nhớ — giữ làm đường lùi cho
> máy không cài được Node.

---

## Cách khởi động (người dùng)
Mở một phiên Cowork với thư mục làm việc đã gắn — ở ô chat bấm **Project or folder**, rồi chọn
**Add a folder** hoặc **Create new project**. Rồi dán **đúng một câu** này, nguyên văn:

> Dựng bộ khung làm việc và kho nhớ cho dự án trong thư mục tôi đã gắn.
> Thư mục đó có file BOOTSTRAP.md thì đọc bản đó, không có thì tải bản dưới đây — rồi làm
> theo đúng những gì trong đó.
> `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/02_cowork_memory/BOOTSTRAP.md`

---

## §A. DỪNG LẠI — kiểm xem bạn ĐÃ CÓ trí nhớ chưa (làm TRƯỚC mọi thứ)

> 🔄 **Đảo hướng 2026-08-27.** Cả bộ này dựng trên tiền đề *"Cowork không với tới `zemory` trên
> máy thật, nên phải cài một bản riêng với kho riêng"*. **Tiền đề đó SAI**, và nó sai vì một lỗi
> đường dẫn chứ không phải vì giới hạn của máy ảo: `zemory setup mcp` dò cấu hình Claude Desktop
> ở `%APPDATA%\Claude\`, trong khi bản cài từ Microsoft Store (MSIX) **chuyển hướng** sang
> `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude\`. Nên trên máy ĐANG CHẠY Desktop
> nó vẫn báo "chưa cài", và người dùng kết luận nhầm là Desktop không đọc được kho.
>
> **Nghiệm thu 2026-08-27, trong một phiên Cowork thật:** nối MCP vào Claude Desktop rồi hỏi
> trong Cowork ⇒ nó liệt kê đủ `mcp__zemory__memory_search` · `memory_show` · `memory_stats` ·
> `memory_context` · `memory_conflicts` · `memory_doctor`, và `memory_stats` trả về **đúng kho
> chung của máy thật**: `messages` = **303.977**, khớp tuyệt đối với số đo cùng lúc ở máy thật
> (số 30 phút trước đó là 303.434). Trùng đúng một con số **đang thay đổi** là bằng chứng nó đọc
> kho SỐNG, không phải bản sao.

**Việc đầu tiên: nhìn danh sách tool của chính bạn.**

Có tool nào tên `mcp__zemory__memory_*` không?

| | làm gì |
|---|---|
| **CÓ** | ✅ **DỪNG. Không dựng gì cả.** Bạn đã nối thẳng vào kho nhớ chung của máy thật — đủ và tốt hơn mọi thứ bộ này dựng ra. Gọi `memory_stats` để xác nhận `dbPath`, báo người dùng, rồi làm việc bình thường: cần nhớ gì thì gọi `memory_search`. Phần còn lại của file này **không áp dụng**. |
| **KHÔNG** | Đọc tiếp §B rồi mới xuống §0. |

## §B. Chưa có tool — kiểm xem máy đã cài zemory chưa, rồi mới quyết

```bash
zemory --version
```

| | làm gì |
|---|---|
| **in ra số hiệu** | zemory có rồi, chỉ **chưa nối**. Nhảy thẳng **§5b** — một lệnh là xong, **đừng dựng lại từ đầu**. |
| **không có lệnh** | máy trắng. Đi tuần tự **§0 → §5b**. Đó là đường chính của bộ này. |

Không hỏi người dùng ở bước này. Họ đã chọn khi dán câu gọi bạn; việc còn lại là của bạn.

---

## §0. DÒ — rồi TỰ CÀI thứ còn thiếu. Đừng bắt người dùng gõ gì.

> ⚠ **Chỉ tới đây khi §A không thấy tool `mcp__zemory__memory_*`.** Có rồi thì đã xong, đừng dựng đè.

**Người dùng đã làm xong phần của họ khi dán câu lệnh gọi bạn.** Từ đây trở đi là việc của bạn:
thiếu gì thì **cài nấy**, không thông báo một danh sách yêu cầu rồi ngồi chờ. Họ không rành kỹ
thuật — đó là lý do bộ này tồn tại.

```bash
node -v ; npm -v ; git --version      # ① máy có sẵn gì
npm ping                              # ② ra được registry không
```

**Thiếu `node` hoặc `git` ⇒ CÀI, không bỏ cuộc.** Windows 10 (1809+) và 11 đều có sẵn `winget`:

```bash
winget --version                                   # có winget không
winget install -e --id OpenJS.NodeJS  --silent --accept-package-agreements --accept-source-agreements
winget install -e --id Git.Git        --silent --accept-package-agreements --accept-source-agreements
```

Cài xong **mở một shell mới** rồi đo lại `node -v` — tiến trình đang chạy không thấy `PATH` vừa đổi.

Không có `winget` (Windows quá cũ · macOS · Linux) thì theo bảng này, vẫn là việc của bạn:

| nền | cách |
|---|---|
| macOS | `brew install node git` — chưa có brew thì cài brew trước |
| Linux | trình quản lý gói của bản phân phối (`apt` · `dnf` · `pacman`) |
| Windows không winget | tải bộ cài Node LTS bản `.msi` rồi chạy im lặng: `msiexec /i <file> /qn` |

**Chỉ khi đã THỬ CÀI mà vẫn hỏng** mới chuyển sang `docs_template/01_cowork_basic/BOOTSTRAP.md` (lối chép
file, không cần Node). Nói rõ đã thử cách nào và hỏng ở đâu — đừng lặng lẽ đổi đường.

**In số đo ra.** Đừng báo "đã dò" mà không in kết quả; và đừng báo "đã cài" khi chưa đo lại.

## §1. HỎI NGƯỜI DÙNG — kho nhớ đặt ở đâu

Đây là quyết định **quan trọng nhất và khó sửa nhất** của cả quy trình. Hỏi **trước khi cài gì**.

> **Câu hỏi:** *"Kho nhớ nên đặt ở thư mục nào?"* — kèm đề xuất của bạn và **hai luật dưới đây**.

**Luật 1 — TUYỆT ĐỐI KHÔNG đặt trong thư mục đồng bộ đám mây.**
Google Drive · OneDrive · Dropbox · iCloud. Kho nhớ là một **cơ sở dữ liệu đang mở**, gồm ba tệp
phải nhất quán với nhau; phần mềm đồng bộ chép từng tệp một trong lúc chúng đang đổi ⇒ **hỏng
kho**. Đây không phải lo xa: một kho **1,19 GB đã hỏng đúng vì lý do này**, mất gần một ngày để
cứu. Cách kiểm, chạy thật đừng đoán:

```bash
ls -a <thư-mục-cha>        # có .tmp.driveupload / .dropbox / tên chứa OneDrive ⇒ ĐỪNG đặt ở đây
# Windows, kiểm thêm sau khi đã tạo:
# fsutil hardlink list "<đường-dẫn-kho>"   → ra NHIỀU HƠN một dòng = có kẻ khác đang đụng vào
```

**Luật 2 — MỘT máy chỉ có MỘT kho.**
Tới được §1 nghĩa là §B đã xác nhận máy **chưa có** zemory (có rồi thì §B đã đưa bạn thẳng sang
§5b). Nên đừng dựng thêm kho thứ hai cạnh một kho đã có: hai kho là hai nửa ký ức, tìm bên này
không thấy bên kia. Lỡ phát hiện máy đã có kho ⇒ **DỪNG, quay lại §B**.

Chốt xong thì ghi lại đường dẫn đó — mọi bước sau dùng nó.

## §2. Cài zemory + trỏ kho về đúng chỗ

```bash
zemory --version && echo "đã có, bỏ qua bước cài"
```

Chưa có thì cài **từ mã nguồn**. **`npm i -g zemory` KHÔNG chạy** — gói *chưa publish lên npm*
(404, đo 2026-08-03). Đường chạy được (nặng: kéo ~500 MB phụ thuộc để có `tsc`):

```bash
git clone https://github.com/ZyroFrost/Zemory
cd Zemory
npm install          # kéo cả devDependencies → có tsc
npm run build        # dựng dist/
npm link             # hoặc: npm i -g .
zemory --version     # phải in ra số hiệu
```

> ⚠ **Đừng dùng `npm i -g github:ZyroFrost/Zemory`** — cài global **không kéo devDependencies**
> nên thiếu `tsc`, `prepare` không dựng được `dist/`, cài xong vẫn hỏng. Đã thử, đã lỗi.

Rồi trỏ kho về chỗ đã chốt ở §1:

```bash
zemory memory relocate "<đường-dẫn-đã-chốt>"
zemory memory verify                      # phải "lành" hoặc "chưa có kho (máy mới)"
```

`relocate` dời kho **và** ghi con trỏ, nên từ đó mọi lệnh đều tự tìm đúng chỗ.

> ⚠ **Đã biết `relocate` bỏ lại vài thứ** ở chỗ cũ: `backups/` · `browser/` · `imports/` ·
> `logs/` · và **`secrets/` + tệp chìa**. Sau khi chạy, **kiểm thư mục cũ** và **dời tay** những
> thứ đó sang chỗ mới — chìa nằm lại trong thư mục đồng bộ đám mây là **rò rỉ thật**, không phải
> bất tiện.

Cài hoặc `verify` hỏng ⇒ **DỪNG, báo người dùng, chuyển sang bộ `cowork/` cũ.** Cấm bịa.

## §3. Dựng bộ chuẩn — bản ĐẦY ĐỦ, giống hệt một máy bình thường

1. **HỎI USER — dự án này là APP hay NON-APP? ĐỪNG tự đoán.**
   - **NON-APP** = sản phẩm / tài sản: báo cáo · dữ liệu · tài liệu · thiết kế. Agent *đọc · dò ·
     kéo · điền · xuất tệp*. **Đa số việc trên Cowork rơi vào loại này.**
   - **APP** = có mã CHẠY do mình phát triển (giao diện / máy chủ / dòng lệnh).
2. Chạy ở **thư mục dự án**: `zemory init --non-app` (hoặc `zemory init` nếu là APP).
3. `zemory doctor` — phải xanh. Đỏ thì đọc lỗi rồi sửa, đừng bỏ qua.
4. `zemory conform` — chấm độ bám chuẩn.

### Bản này nhận được ĐỦ những gì bộ cũ buộc phải cắt

Bộ `cowork/` cũ không gọi được `zemory` nên phải **chép tay từng tệp**, mà chép tay thì tốn ngữ
cảnh — nên nó **cắt bớt cho vừa**. Bản này để `init` rót từ bản gốc, nên không cắt gì. Số đo thật:

| | bộ `cowork/` cũ | bản này |
|---|---:|---:|
| `03_STRUCTURE` (từ điển thư mục chuẩn) | 36 dòng | **143 dòng** |
| `02_RULES` | 68 dòng | **112 dòng** |
| `04_SKILLS` | 41 dòng | **55 dòng** |
| Chấm độ bám chuẩn | script `check_structure.py` chép kèm | **`zemory conform` thật** |
| Kho nhớ chung | **không có** | **có** |

⇒ **KHÔNG chép `check_structure.py`, KHÔNG dựng skill `structure`.** Đó là đường vòng bộ cũ phải
đi vì thiếu công cụ; ở đây `zemory conform` làm đúng việc đó và bám sát chuẩn hơn. Thấy hai thứ
đó trong thư mục dự án (do phiên trước dựng bằng bộ cũ) thì **báo người dùng**, đừng tự xoá.

⇒ Vì bộ chuẩn đã đầy đủ, **cứ dùng nguyên chuẩn NON-APP như một máy bình thường** — không phải
lược bớt, không phải diễn giải lại. Mọi quy trình (`fill` · `pull` · `upload` · `audit` ·
`reconcile` · `session-close` · `grill` · `read-office` · `write-docx`) đều có sẵn và chạy được.

## §4. Quét dữ liệu vào kho — như bản zemory gốc

**HỎI người dùng lấy từ đâu — MỘT câu, kèm đề xuất của bạn.** Đừng quét câm rồi báo "xong".

> *"Tôi lấy ký ức từ những nguồn nào? Đề xuất: lấy hết những nguồn bạn có."*
>
> | nguồn | là gì |
> |---|---|
> | trên máy | trợ lý lập trình đã cài sẵn (Claude Code · Codex · Continue · LM Studio) |
> | ChatGPT | hội thoại trên chatgpt.com — mở một cửa sổ để bạn đăng nhập một lần |
> | Claude.ai | hội thoại trên claude.ai — cũng đăng nhập một lần |

```bash
zemory memory scan                          # nguồn trên máy (nhanh, incremental)
zemory memory scan --deep                   # quét nhanh ra 0 thì dò rộng hơn
zemory memory scan-web --platform chatgpt   # chỉ khi người dùng chọn
zemory memory scan-web --platform claude    # chỉ khi người dùng chọn
```

**`scan-web` mở cửa sổ trình duyệt để đăng nhập.** Mật khẩu gõ trên trang thật của nền đó, **không
bao giờ nhập vào zemory**. Lệnh trả `need-login` thì **nói cho người dùng biết cửa sổ đang chờ họ**
— đừng đứng im, và tuyệt đối đừng báo "đã quét xong".

**In ra: bao nhiêu phiên · bao nhiêu tin · từ ngày nào đến ngày nào.** Quét ra **0 tin** thì nói
thẳng là 0 và nêu vì sao (máy chưa có trợ lý nào, hoặc chưa chọn nguồn web).

> ⛔ **`scan` · `embed` · `reindex` · `sync` · `hook` đều là lệnh GHI.** Kho này là kho riêng ở
> §1 nên ghi vào là an toàn — **nhưng nếu vì lý do nào đó kho đang trỏ vào kho của máy thật thì
> DỪNG NGAY và hỏi người dùng.** Kiểm lại bằng `zemory memory verify` và đường dẫn ở §1.

## §4b. NHÚNG — BẮT BUỘC, không phải tuỳ chọn

Quét xong mới có **một nửa**: tìm bằng **từ khoá** chạy được ngay (chỉ mục chữ cập nhật ngay lúc
nạp), nhưng tìm bằng **ý nghĩa** thì chưa. Thiếu nó là mất lane đắt nhất của recall — hỏi "hôm nọ
bàn gì về X" mà diễn đạt khác chữ đã lưu là không ra.

```bash
zemory memory embed --all
```

**Chạy LÂU** — cỡ **58 tin/phút**, nên 1.000 tin ≈ 17 phút, một kho ChatGPT vài chục nghìn tin là
nhiều giờ. Vì vậy:

- **Đừng ngồi chờ nó xong rồi mới nói gì.** Khởi động, rồi báo người dùng con số ước lượng.
- **Nói bằng thời gian, không bằng thuật ngữ**: *"đang dựng kho tra cứu cho 1.240 mẩu, khoảng 20
  phút nữa là tìm theo ý nghĩa được; từ giờ tìm theo từ khoá đã dùng được rồi."*
- Máy có **daemon nền** (§5) thì nó **tự nhúng tiếp** theo nhịp, không cần ai canh. Kiểm còn tồn
  bao nhiêu bằng dòng `remaining` của:

```bash
zemory memory info
```

⛔ **Đừng báo "đã xong" khi `remaining` còn khác 0.** Đó là lời nói dối dễ mắc nhất ở bước này.

## §5. Giao diện

```bash
zemory ui
```

Nó chạy một máy chủ cục bộ và mở cửa sổ. **Trong máy ảo, cửa sổ có thể không hiện ra được** —
đó là hạn chế của môi trường, không phải lỗi. Nếu không hiện:

- **báo thẳng cho người dùng là không xem được từ đây**, đừng khẳng định "đã mở";
- mọi việc vẫn làm được bằng dòng lệnh — giao diện chỉ là một cách nhìn khác của cùng dữ liệu;
- muốn xem thì mở giao diện **trên máy thật**, trỏ vào kho ở §1 (nếu máy thật với tới được).

## §5b. NỐI MCP — bước làm cho mọi thứ vừa dựng trở nên DÙNG ĐƯỢC

> Thiếu bước này thì kho đầy dữ liệu mà trợ lý **không đọc được** — dựng xong để đó.
> Bộ này trước đây thiếu hẳn nó, vì lệnh dò nhầm đường cấu hình nên tưởng Desktop chưa cài.

```bash
zemory setup mcp claude-desktop
```

Lệnh tự sao lưu `.bak`, chỉ thêm khoá `zemory`, **không đụng** server khác đã có.

**Rồi bảo người dùng THOÁT HẲN Claude Desktop và mở lại** — chuột phải biểu tượng khay hệ thống →
Quit. Đóng cửa sổ suông là chưa đủ: tiến trình còn sống thì không nạp lại cấu hình.

**Nghiệm thu — bắt buộc, đừng bỏ:** mở lại rồi hỏi trong phiên mới:

> *"Bạn có tool nào tên bắt đầu bằng `memory_` không? Gọi `memory_stats` và cho tôi biết `dbPath`
> cùng số dòng bảng `messages`."*

| kết quả | nghĩa |
|---|---|
| liệt kê được `memory_*` và `dbPath` trỏ đúng kho ở §1 | ✅ xong — báo người dùng rồi dừng |
| không có tool nào | ⚠ chưa nạp — kiểm đã thoát HẲN chưa, rồi chạy lại `setup mcp` |
| có tool nhưng `dbPath` khác | 🔴 đang trỏ nhầm kho — **DỪNG**, đối chiếu lại §1 |

## §6. Đồng bộ Drive — ĐỂ SAU, đừng dựng bây giờ

Đồng bộ nhiều máy là bước riêng, có chìa mã hoá và có luật riêng. **Đừng tự dựng trong lượt này.**
Ghi một dòng vào `docs/agent/05_TODO.md` rằng còn treo, rồi thôi.

Khi nào làm: dùng đường **xuất / nhập gói đã mã hoá** (`zemory memory export` / `import`), **KHÔNG
BAO GIỜ** đặt kho vào thư mục đồng bộ để "cho tiện" — xem lại Luật 1 ở §1.

## LUẬT — vi phạm là hỏng việc của người khác

1. **Tệp đã tồn tại thì BỎ QUA, tuyệt đối không ghi đè.** Báo lại "đã có".
2. **Không tự xoá, không tự di chuyển tệp của người dùng.** Thấy cần nắn → **ĐỀ XUẤT**, chờ gật.
3. **Không tạo thư mục rỗng.** Chuẩn là *từ điển tên để tra*, không phải danh sách phải tạo.
4. **Không rõ thì HỎI**: dừng lại · cái nào tự đọc ra được thì đọc, đừng hỏi · hỏi **mỗi lần MỘT
   câu**, kèm đề xuất của bạn. Tuyệt đối không tự chọn cách hiểu rộng nhất rồi chạy.
5. **Chỗ đặt kho (§1) phải do NGƯỜI DÙNG chốt**, không được tự quyết.
6. Chạy hỏng ⇒ **DỪNG và báo người dùng**. Cấm bịa kết quả, cấm bỏ qua lỗi rồi đi tiếp.
7. Mỗi giai đoạn xong phải **in bảng kết quả** rồi mới sang giai đoạn sau.

## Cách NÓI với người dùng

Người đọc kết quả của bạn làm nghiệp vụ, không phải kỹ sư. Bảng bạn in ra là **sản phẩm giao
đi**, không phải log nội bộ.

- **Nói bằng CÔNG VIỆC, không bằng thuật ngữ.** Trước khi viết một từ chuyên ngành, thử diễn đạt
  lại bằng thứ người dùng làm hằng ngày. Diễn đạt được thì bỏ từ đó đi.
- **Tên thư mục chuẩn thì GIỮ NGUYÊN** (đó là tên thật trên đĩa), nhưng **lần đầu nhắc mỗi tên,
  kèm một cụm giải thích**. Từ lần sau dùng trần.
- Những từ này **không** đưa vào câu hướng tới người dùng:

  | Đừng viết | Viết |
  |---|---|
  | manifest | danh sách tệp |
  | profile / non-app | loại dự án |
  | slot | thư mục chuẩn |
  | deliverable | sản phẩm giao đi |
  | skill | quy trình |
  | scaffold / bootstrap | dựng |
  | index / embedding | kho tra cứu |
  | relocate | dời kho |

- Dẫn chiếu chuẩn đặt **cuối câu, trong ngoặc** — sau khi đã nói lý do bằng tiếng người.

## BÁO CÁO CUỐI — in đủ, đừng rút gọn

| mục | phải in |
|---|---|
| Dò năng lực | số hiệu `node` · `npm` · `git` · **thứ nào BẠN vừa cài thêm** |
| zemory | số hiệu · cài mới hay đã có sẵn |
| **Kho nhớ** | **đường dẫn** · ai chốt · `verify` lành/hỏng · **có nằm trong thư mục đồng bộ đám mây không** |
| Bộ chuẩn | loại dự án đã chọn · `doctor` xanh/đỏ · `conform` chấm bao nhiêu |
| Quét dữ liệu | **nguồn nào người dùng chọn** · bao nhiêu phiên · bao nhiêu tin · từ ngày nào đến ngày nào (**0 thì nói thẳng là 0**) |
| **Nhúng** | đã khởi động chưa · `remaining` còn bao nhiêu · **ước còn bao nhiêu phút** · ai nhúng tiếp (daemon nền hay không ai) |
| **Nối trợ lý (§5b)** | `setup mcp` chạy chưa · người dùng đã khởi động lại Desktop chưa · **nghiệm thu: có thấy `memory_*` không, `dbPath` có trỏ đúng kho ở §1 không** |
| Giao diện | mở được hay không — **không mở được thì nói không mở được** |
| Đã GHI gì | liệt kê từng lệnh + ai cho phép. Không ghi gì thì nói "không ghi gì" |
| Còn treo | đồng bộ nhiều máy · việc chưa làm được và vì sao |

⛔ **Hai câu cấm nói khi chưa đúng:** *"đã xong"* lúc `remaining` còn khác 0 · *"trợ lý đọc được
kho rồi"* lúc chưa nghiệm thu §5b bằng một lời gọi `memory_stats` thật.
