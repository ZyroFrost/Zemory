<!-- zemory template · BOOTSTRAP cho Claude Cowork — bản DỰNG BẢN ĐẦY ĐỦ + Global Memory riêng.
     Agent ĐỌC VÀ THI HÀNH, không phải người đọc. Bản mẫu TRẮNG: không nêu tên dự án cụ thể. -->
# Dựng zemory đầy đủ + bộ nhớ riêng — cho Claude Cowork

> **File này để agent đọc và thi hành**, không phải để người đọc.
>
> Khác bộ `cowork/` cũ: bộ cũ **chép từng file** bộ chuẩn về vì giả định máy ảo không gọi được
> `zemory`. Bản này **dựng hẳn một bản zemory chạy được** — bộ chuẩn đầy đủ · **kho nhớ riêng
> (Global Memory)** · quét dữ liệu từ các nguồn · và giao diện. Dò không đạt thì quay về bộ cũ.

## Cách khởi động (người dùng)
Mở một phiên Cowork với thư mục làm việc đã gắn — ở ô chat bấm **Project or folder**, rồi chọn
**Add a folder** hoặc **Create new project**. Rồi dán **đúng một câu** này, nguyên văn:

> Dựng bộ khung làm việc và kho nhớ cho dự án trong thư mục tôi đã gắn.
> Thư mục đó có file BOOTSTRAP.md thì đọc bản đó, không có thì tải bản dưới đây — rồi làm
> theo đúng những gì trong đó.
> `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork_global_memory/BOOTSTRAP.md`

---

## §0. DÒ TRƯỚC — ba lệnh, rồi mới quyết đi tiếp hay quay về bộ cũ

**Đừng giả định năng lực của máy ảo.** Nó khác nhau theo từng máy, và **cả hai chiều giả định đều
đã từng sai**: bản `cowork/` cũ khẳng định *"không cài gì, không gọi `zemory`, máy ảo chỉ ra được
domain Anthropic"* — đo lại trên một máy thật thì **có** `node`, **có** `npm`, `npm ping` ra được
registry, và đọc được cả thư mục của máy thật. Nhưng máy đó vốn đã cài sẵn và đã mount sẵn; máy
mở Cowork lần đầu thì trắng.

```bash
node -v; npm -v            # ① có runtime không
npm ping                   # ② ra được npm registry không
ls <thư-mục-đã-gắn>        # ③ thấy được gì của máy thật
```

| ① và ② | làm gì |
|---|---|
| cả hai **xanh** | đi tiếp §1 |
| ① hoặc ② **đỏ** | **DỪNG bản này**, chuyển sang `docs_template/cowork/BOOTSTRAP.md` (lối chép file). Đừng cố cài. |

**In số ra cho người dùng thấy.** Đừng báo "đã dò" mà không in kết quả.

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

**Luật 2 — kho nhớ này là kho RIÊNG, KHÔNG trỏ vào kho của máy thật.**
Nếu máy thật đã dùng zemory, nó có kho riêng và **đang mở kho đó** (tiến trình nền, móc chạy sau
mỗi lượt trò chuyện). Trỏ chung vào một tệp = **hai bên cùng ghi mà không thấy nhau** — khoá ghi
dựa trên **pid** nên **không phủ qua ranh giới máy ảo**. Muốn gộp dữ liệu về sau thì dùng đường
xuất/nhập gói ở §6, **không phải** dùng chung tệp.

Chốt xong thì ghi lại đường dẫn đó — mọi bước sau dùng nó.

## §2. Cài zemory + trỏ kho về đúng chỗ

```bash
zemory --version || npm i -g zemory
zemory --version                          # phải in ra số hiệu
zemory memory relocate "<đường-dẫn-đã-chốt>"
zemory memory verify                      # phải "lành"
```

`relocate` dời kho **và** ghi con trỏ, nên từ đó mọi lệnh đều tự tìm đúng chỗ.

> ⚠ **Đã biết `relocate` bỏ lại vài thứ** ở chỗ cũ: `backups/` · `browser/` · `imports/` ·
> `logs/` · và **`secrets/` + tệp chìa**. Sau khi chạy, **kiểm thư mục cũ** và **dời tay** những
> thứ đó sang chỗ mới — chìa nằm lại trong thư mục đồng bộ đám mây là **rò rỉ thật**, không phải
> bất tiện.

Cài hoặc `verify` hỏng ⇒ **DỪNG, báo người dùng, chuyển sang bộ `cowork/` cũ.** Cấm bịa.

## §3. Dựng bộ chuẩn — KHÔNG chép file nữa

Đây là chỗ bản này rẻ hơn hẳn bộ cũ: không danh sách file, không đối chiếu số dòng, không chép
nguyên văn. Lệnh `init` tự rót bộ chuẩn **từ bản gốc** ⇒ không bao giờ lệch phiên bản, và nhận
được **bản ĐẦY ĐỦ** chứ không phải bản cắt gọn.

1. **HỎI USER — dự án này là APP hay NON-APP? ĐỪNG tự đoán.**
   - **NON-APP** = sản phẩm / tài sản: báo cáo · dữ liệu · tài liệu · thiết kế. Agent *đọc · dò ·
     kéo · điền · xuất tệp*. **Đa số việc trên Cowork rơi vào loại này.**
   - **APP** = có mã CHẠY do mình phát triển (giao diện / máy chủ / dòng lệnh).
2. Chạy ở **thư mục dự án**: `zemory init --non-app` (hoặc `zemory init` nếu là APP).
3. `zemory doctor` — phải xanh. Đỏ thì đọc lỗi rồi sửa, đừng bỏ qua.
4. `zemory conform` — chấm độ bám chuẩn.

## §4. Quét dữ liệu vào kho — như bản zemory gốc

```bash
zemory memory scan            # nhanh: các vị trí đã biết
zemory memory scan --deep     # nếu quét nhanh không thấy gì: dò rộng hơn
zemory memory search "<thử một từ khoá>"
```

**In ra cho người dùng: quét được bao nhiêu phiên, bao nhiêu tin, từ ngày nào đến ngày nào.**
Quét ra **0 tin** là chuyện bình thường ở máy ảo trắng — **nói thẳng như vậy**, đừng im lặng bỏ
qua và cũng đừng báo "đã quét xong" như thể có dữ liệu.

Tuỳ chọn, chỉ khi người dùng muốn tra được bằng ngữ nghĩa (không chỉ đúng từ khoá):
```bash
zemory memory embed --all     # CHẠY LÂU (hàng giờ với kho lớn). Hỏi trước khi chạy.
```

> ⛔ **`scan` · `embed` · `reindex` · `sync` · `hook` đều là lệnh GHI.** Kho này là kho riêng ở
> §1 nên ghi vào là an toàn — **nhưng nếu vì lý do nào đó kho đang trỏ vào kho của máy thật thì
> DỪNG NGAY và hỏi người dùng.** Kiểm lại bằng `zemory memory verify` và đường dẫn ở §1.

## §5. Giao diện

```bash
zemory ui
```

Nó chạy một máy chủ cục bộ và mở cửa sổ. **Trong máy ảo, cửa sổ có thể không hiện ra được** —
đó là hạn chế của môi trường, không phải lỗi. Nếu không hiện:

- **báo thẳng cho người dùng là không xem được từ đây**, đừng khẳng định "đã mở";
- mọi việc vẫn làm được bằng dòng lệnh — giao diện chỉ là một cách nhìn khác của cùng dữ liệu;
- muốn xem thì mở giao diện **trên máy thật**, trỏ vào kho ở §1 (nếu máy thật với tới được).

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
| Dò năng lực | số hiệu `node` · `npm` · kết quả `npm ping` |
| zemory | số hiệu · cài mới hay đã có sẵn |
| **Kho nhớ** | **đường dẫn** · ai chốt · `verify` lành/hỏng · **có nằm trong thư mục đồng bộ đám mây không** · **có phải kho riêng không** |
| Bộ chuẩn | loại dự án đã chọn · `doctor` xanh/đỏ · `conform` chấm bao nhiêu |
| Quét dữ liệu | bao nhiêu phiên · bao nhiêu tin · từ ngày nào đến ngày nào (**0 thì nói thẳng là 0**) |
| Giao diện | mở được hay không — **không mở được thì nói không mở được** |
| Đã GHI gì | liệt kê từng lệnh + ai cho phép. Không ghi gì thì nói "không ghi gì" |
| Còn treo | đồng bộ Drive · việc chưa làm được và vì sao |
