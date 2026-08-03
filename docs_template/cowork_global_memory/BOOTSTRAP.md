<!-- zemory template · BOOTSTRAP cho Claude Cowork — bản DÙNG THẲNG zemory + Global Memory.
     Agent ĐỌC VÀ THI HÀNH, không phải người đọc. Bản mẫu TRẮNG: không nêu tên dự án cụ thể. -->
# Dựng bộ chuẩn + nối Global Memory — cho Claude Cowork

> **File này để agent đọc và thi hành**, không phải để người đọc.
>
> Khác bộ `cowork/` cũ ở một điểm: bộ cũ **chép từng file** bộ chuẩn về vì giả định máy ảo không
> gọi được `zemory`. Bản này **cài hẳn zemory rồi dùng thẳng** — nên có đủ mọi thứ, đặc biệt là
> **Global Memory** (kho hội thoại của mọi phiên, mọi máy — thứ mạnh nhất của zemory và thứ mà
> chép file không bao giờ có được).
>
> **Chọn bộ nào:** dò ở §0. Dò thấy chạy được → dùng bản này. Không → quay về `cowork/BOOTSTRAP.md`.

## Cách khởi động (người dùng)
Mở một phiên Cowork với thư mục làm việc đã gắn — ở ô chat bấm **Project or folder**, rồi chọn
**Add a folder** hoặc **Create new project**. Rồi dán **đúng một câu** này, nguyên văn:

> Dựng bộ khung làm việc và nối bộ nhớ cho dự án trong thư mục tôi đã gắn.
> Thư mục đó có file BOOTSTRAP.md thì đọc bản đó, không có thì tải bản dưới đây — rồi làm
> theo đúng những gì trong đó.
> `https://raw.githubusercontent.com/ZyroFrost/Zemory/main/docs_template/cowork_global_memory/BOOTSTRAP.md`

---

## §0. DÒ TRƯỚC — ba lệnh, rồi mới quyết đi tiếp hay quay về bộ cũ

**Đừng giả định năng lực của máy ảo.** Nó khác nhau theo từng máy, và cả hai chiều giả định đều
đã từng sai: bản `cowork/` cũ khẳng định *"không cài gì, không gọi `zemory`, máy ảo chỉ ra được
domain Anthropic"* — đo lại trên một máy thật thì **có** `node`, **có** `npm`, `npm ping` ra được
registry, và đọc được cả thư mục của máy thật. Nhưng máy đó vốn đã cài sẵn và đã mount sẵn; máy
mở Cowork lần đầu thì không có gì.

```bash
node -v; npm -v            # ① có runtime không
npm ping                   # ② ra được npm registry không
ls <thư-mục-đã-gắn>        # ③ thấy được gì của máy thật
```

| ① và ② | làm gì |
|---|---|
| cả hai **xanh** | đi tiếp §1 — bản này dùng được |
| ① hoặc ② **đỏ** | **DỪNG bản này**, chuyển sang `docs_template/cowork/BOOTSTRAP.md` (lối chép file). Đừng cố cài. |

In kết quả dò ra cho người dùng thấy trước khi đi tiếp. **Đừng báo "đã dò" mà không in số.**

## §1. Cài zemory

```bash
zemory --version || npm i -g zemory
zemory --version                      # phải in ra số hiệu
```

Cài hỏng ⇒ **DỪNG, báo người dùng, chuyển sang bộ `cowork/` cũ.** Cấm bịa, cấm loay hoay.

## §2. Dựng bộ chuẩn — KHÔNG chép file nữa

Đây là chỗ bản này rẻ hơn hẳn bộ cũ: không MANIFEST, không đối chiếu số dòng, không chép nguyên
văn. Lệnh `init` tự rót bộ chuẩn **từ bản gốc**, nên không bao giờ lệch phiên bản.

1. **HỎI USER — dự án này là APP hay NON-APP? ĐỪNG tự đoán.**
   - **NON-APP** = sản phẩm / tài sản: báo cáo · dữ liệu · tài liệu · thiết kế. Agent *đọc · dò ·
     kéo · điền · xuất file*. **Đa số việc làm trên Cowork rơi vào loại này.**
   - **APP** = có code CHẠY do mình phát triển (giao diện / máy chủ / dòng lệnh).
2. Chạy ở **thư mục dự án**: `zemory init --non-app` (hoặc `zemory init` nếu là APP).
3. `zemory doctor` — phải xanh. Đỏ thì đọc lỗi rồi sửa, đừng bỏ qua.
4. `zemory conform` — chấm độ bám chuẩn.

Bộ chuẩn dựng ra là **bản đầy đủ**, không phải bản cắt gọn như bộ cũ phải làm.

## §3. Global Memory — thứ đáng giá nhất, và cũng nguy hiểm nhất

GM là kho hội thoại của **mọi phiên, mọi agent, mọi máy**. Nối được nó nghĩa là bạn tra lại được
việc đã làm tháng trước thay vì hỏi lại người dùng.

**ĐỌC — thoải mái:**
```bash
zemory memory search "<điều cần nhớ>"          # phạm vi: dự án hiện tại
zemory memory search "<điều cần nhớ>" --all    # mọi dự án
```

> ⛔ **GHI thì PHẢI HỎI USER TRƯỚC.** `memory scan` · `sync` · `embed` · `reindex` · `hook` đều là
> lệnh GHI.
>
> Vì sao nghiêm đến vậy: GM là **một file SQLite dùng chung**, và máy thật rất có thể **đang mở
> nó** (tiến trình nền, hook chạy sau mỗi lượt chat). Bạn ghi từ máy ảo = **nhiều tiến trình ghi
> một file** mà hai bên **không nhìn thấy nhau** — khoá ghi của zemory dựa trên pid nên **không
> phủ qua ranh giới máy ảo**.
>
> Đây không phải lo xa. Sự cố thật: một kho 1,19 GB **hỏng** chỉ vì một tiến trình ngoài (dịch vụ
> đồng bộ đám mây) đụng vào file trong lúc nó đang được ghi — mất gần một ngày để cứu.

**Kiểm sức khoẻ trước khi đụng vào bất cứ thứ gì:**
```bash
zemory memory verify      # kho có lành không
```

**Nếu người dùng đồng ý cho ghi**, kiểm hai thứ này trước — cả hai đều đã gây sự cố thật:
```bash
zemory memory relocate --show 2>/dev/null || zemory doctor | grep -i memory
```
- Kho **KHÔNG được** nằm trong thư mục đồng bộ đám mây (Google Drive · OneDrive · Dropbox).
  Dấu hiệu: thư mục cha có `.tmp.driveupload` / `.dropbox` / tên chứa `OneDrive`.
- Trên Windows kiểm thêm: `fsutil hardlink list <đường-dẫn-DB>` — ra **nhiều hơn một dòng** nghĩa
  là có tiến trình khác đang hardlink file đó. **Dừng lại, báo người dùng.**

## LUẬT — vi phạm là hỏng việc của người khác

1. **File đã tồn tại thì BỎ QUA, tuyệt đối không ghi đè.** Báo lại "đã có".
2. **Không tự xoá, không tự di chuyển file của người dùng.** Thấy cần nắn → **ĐỀ XUẤT**, chờ gật.
3. **Không tạo thư mục rỗng.** Chuẩn là *từ điển tên để tra*, không phải danh sách phải tạo.
4. **Không rõ thì HỎI**: dừng lại · cái nào tự đọc ra được thì đọc, đừng hỏi · hỏi **mỗi lần MỘT
   câu**, kèm đề xuất của bạn. Tuyệt đối không tự chọn cách hiểu rộng nhất rồi chạy.
5. **Lệnh nào GHI vào Global Memory đều phải hỏi trước** (xem §3).
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
  | manifest | danh sách file |
  | profile / non-app | loại dự án |
  | slot | thư mục chuẩn |
  | deliverable | sản phẩm giao đi |
  | skill | quy trình |
  | scaffold / bootstrap | dựng |
  | idempotent | chạy lại nhiều lần vẫn ra một kết quả |
  | index / embedding | kho tra cứu |

- Dẫn chiếu chuẩn đặt **cuối câu, trong ngoặc** — sau khi đã nói lý do bằng tiếng người.

## BÁO CÁO CUỐI — in đủ, đừng rút gọn

| mục | phải in |
|---|---|
| Dò năng lực | số hiệu `node` · `npm` · kết quả `npm ping` |
| zemory | số hiệu, cài mới hay đã có sẵn |
| Bộ chuẩn | loại dự án đã chọn · `doctor` xanh/đỏ · `conform` chấm bao nhiêu |
| Global Memory | `verify` lành/hỏng · kho nằm ở đâu · **có nằm trong thư mục đồng bộ đám mây không** |
| Đã GHI gì vào GM | **liệt kê từng lệnh + ai cho phép**. Không ghi gì thì nói "không ghi gì" |
| Còn treo | việc chưa làm được và vì sao |
