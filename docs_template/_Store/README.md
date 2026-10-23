# HS — bộ linh kiện harness

HS (harness store, `docs_template/_Store/`) là bộ nhận phần rã ra của TOÀN BỘ cấu trúc làm việc: từ ổ dữ liệu, `Workspace/`,
từng tổ chức, tới từng repo và luật, skill, khung thư mục bên trong repo. Máy nào clone zemory về cũng lắp lại được đúng cấu
trúc đó từ HS, không cần xem máy khác, không học từ dữ liệu mẫu.

- HS chỉ chứa phần CHUNG, viết bằng tên chung. Tên tổ chức, tên repo thật, đường dẫn và tên máy thật không bao giờ nằm trong HS.
- Phần riêng của từng repo (hiến pháp đã viết, sổ việc, mã, dữ liệu) nằm trong repo đó và đi đường của repo (git · Syncthing).
- Bộ ráp (`docs_template/<NN>_<Hệ>_<Tên>_<Tầng>/`) là một repo mẫu đã ráp sẵn từ HS cho một vai.

## 1. Bốn tầng

| Tầng | Khung HS | Gốc áp | Kiểm |
|---|---|---|---|
| Ổ dữ liệu | `Struc_Drive_Data` | gốc ổ (`D:\`) hoặc thư mục dữ liệu (`~/data`) | `zemory conform --layout D:\` |
| Workspace | `Struc_Region_Workspace` | `Workspace/` | `zemory conform --layout D:\Workspace` |
| Tổ chức | `Struc_Region_Company` | `Workspace/Company/<Tổ chức>/` | `zemory conform --layout D:\Workspace\Company\<Tổ chức>` |
| Repo | `Struc_Repo_<Vai>` | một repo | `zemory conform` (trong repo) |

```
<ổ dữ liệu>/
├── Workspace/                       mọi repo
│   ├── Company/<Tổ chức>/            repo của một tổ chức
│   │   ├── Dept_<Mã>/                repo phòng ban              → bộ Dept
│   │   ├── _DB_<Hệ>/                 DW · hệ nguồn · log          → bộ AppData · LogCenter
│   │   ├── _Glossary/                thuật ngữ chung (đồng bộ)
│   │   ├── _<Công cụ>_Template/      khuôn báo cáo chung (đồng bộ)
│   │   ├── _Legacy/<Nguồn>/          việc cũ, chỉ đọc
│   │   └── _Project/<Nhóm>/<repo>/   ứng dụng nội bộ · của bên cung cấp → bộ App
│   ├── Personal/[<Nhóm>/]<repo>/     repo cá nhân
│   └── External/<repo>/              clone của bên ngoài, chỉ đọc, không ráp HS
├── Software/<Nhóm>/[<Hãng>/]<Ứng dụng>/{App,Data,Setup}
│                                     nhóm: AI · Dev · Drivers · Network · Office · System · Utility
├── AppConfig/<công cụ>/              cấu hình + khoá: configs/ · credentials/ · cache/
├── Documents/<mảng>/                 tài liệu cá nhân
└── Recovery/                         bản khôi phục máy
```

- Áp một tầng = từ điển tên + phép kiểm. Không tạo thư mục rỗng; không ghi file vào gốc ổ hay gốc tổ chức.
- Mỗi slot của một tầng mô tả: vai trò · được chứa / không chứa · khuôn tên · đồng bộ (`02_STRUCTURE/_Slot/`, số 143–159).

## 2. Các kệ

| Kệ | Chứa | Trong repo | Đồng bộ |
|---|---|---|---|
| `01_LAW/_Rule/` | Luật chung: cách agent làm việc, lời y hệt mọi repo | `docs/agent/01_LAW/_Rule/` | Ghi đè theo HS |
| `01_LAW/_Cons/` | Luật khung hiến pháp: bắt repo khai một loại bất biến của sản phẩm, kèm mẫu `Cons.md` | `docs/agent/01_LAW/_Cons/` = hiến pháp của repo | Thêm khung mới; không đụng `Cons.md` đã viết và điều riêng |
| `02_STRUCTURE/` | Khung thư mục: `Struc_Drive_*` · `Struc_Region_*` · `Struc_Repo_*` · `_Slot/` · `_Host/<GUI\|IDE\|CLI>` | `docs/agent/02_STRUCTURE/` (khung của repo) | Ghi đè theo HS |
| `03_SKILLS/` | Cách làm một loại việc | `docs/agent/03_SKILLS/` + bản host dựng (`.claude/skills/`) | Ghi đè theo HS |
| `04_TODO.md` | Khung sổ việc chưa làm, kèm hướng dẫn cửa vào / cửa ra | `docs/agent/04_TODO.md` | Ghi một lần khi repo chưa có; từ đó là của repo |
| `05_CHANGES.md` | Khung sổ việc đã làm, kèm khuôn mục và cách dời sang archive | `docs/agent/05_CHANGES.md` | Ghi một lần khi repo chưa có; từ đó là của repo |
| `Archive/` | Linh kiện đã gộp hoặc bãi bỏ, giữ số; `ARCHIVE.md` ghi nơi nhận nội dung | — | — |

Lịch sử của repo (mục sổ đã đóng, bản chép đã nghỉ hưu) nằm ở `docs/archive/`, cạnh `docs/agent/`, không đọc mỗi phiên.

## 3. Tên linh kiện

`<Mã>_<Loại>_<NN>_<Tên>`

| Phần | Giá trị | Nghĩa |
|---|---|---|
| Mã | `Rule` | Luật chung, kệ `01_LAW/_Rule` |
| | `Cons` | Luật khung hiến pháp, kệ `01_LAW/_Cons`; cũng là mã của điều riêng repo tự viết |
| | `Skill` | Skill, kệ `03_SKILLS`; `<Loại>` là nhóm skill: `Dev` · `Doc` · `Harness` · `Task` |
| | `Struc` | Khung, kệ `02_STRUCTURE`, không số: `Struc_<Tầng>_<Vai>` với tầng `Drive` · `Region` · `Repo` |
| Loại (luật) | `Gate` | Có chốt máy chặn được lúc vi phạm (hook · pre-commit · cổng kiểm) |
| | `Keys` | Có máy nhắc theo từ khoá nhưng không chặn |
| | `Core` | Chỉ phán đoán; thuộc phần bắt đọc đầu phiên |
| NN | `01`–`99` | Số của HS; không đánh lại; bãi bỏ ⇒ giữ số, chuyển vào `Archive/` |
| | `101`+ | Điều riêng của repo trong `_Cons/`; HS không bao giờ dùng |
| Tên | PascalCase tiếng Anh ASCII | Nói nội dung; bắt đầu bằng số được (`01Raw`) |

Loại do `gate.json` quyết định, không do người đặt: có `hook` · `gate` · `conform` · `read` ⇒ `Gate`; chỉ có `prompt` ⇒
`Keys`; không có gì ⇒ `Core`. Tên nói sai loại thì phép kiểm tên của HS báo đỏ.

Slot: `_Slot/<Vùng>_<NNN>_<Tên>/` (vùng = cấp 1 của đường dẫn tính từ gốc của khung). Host: `_Host/<GUI|IDE|CLI>/`.

## 4. Cấu tạo một linh kiện

```
Rule_Gate_10_DestructiveOps/
├── Rule_Gate_10_DestructiveOps.md   frontmatter (id · name · version · kind) + luật + ## Ví dụ
├── gate.json                        chốt máy: hook · gate · read · prompt · ca thử block / pass
└── hook.cjs                         (luật có hook riêng; luật nhận thêm luật khác có thêm hook-<tên>.cjs)

Cons_Gate_10_ReadOnlySources/
├── Cons_Gate_10_ReadOnlySources.md  frontmatter có frame: true · luật "repo phải khai …" · phép kiểm · ví dụ đã viết
├── Cons.md                          mẫu: repo viết lại cho sản phẩm của mình
└── gate.json                        cổng conform: Cons.md đã viết, hoặc đã ghi status: n/a kèm lý do

Struc_Drive_Data/
├── Struc_Drive_Data.md              frontmatter (id · name · version · scope) + cây + luật + phép kiểm
└── structure.json                   { scope, slots: [tên slot …] } — khung repo thêm extends · role

_Slot/Software_149_Program/
└── Software_149_Program.md          frontmatter: id · name · version · path · [values] · [match] · [scope]
```

- Frontmatter của slot:
  - `path` — mẫu đường dẫn từ gốc của khung: `<X>` = một tên bất kỳ · `[<X>/]` = một cấp tuỳ chọn.
  - `values` — danh sách tên duy nhất được nhận cho biến cuối của `path`; áp cho cùng biến đó ở mọi slot của khung.
  - `match` — biểu thức chính quy cho tên cuối, phân biệt hoa thường (`^Dept_[A-Z]{2,4}$`).
  - `scope: layout` — slot của tầng ổ đĩa / workspace / tổ chức.
- Lời luật theo khuôn điều kiện → hành vi → phép kiểm: câu ngắn, không trích lời người, không ghi ngày.
- Luật quy định cách viết có mục **Lối đúng**: cách làm tiếp hợp lệ khi bị chặn. Luật cấm hành động không có mục này:
  câu chặn chỉ nói "không làm; muốn làm thì hỏi".
- Mỗi luật có một ví dụ: Tình huống · ✗ Sai · ✓ Đúng, viết bằng nghiệp vụ dễ hiểu, không tên công ty hay sản phẩm.
- Đổi nội dung một linh kiện ⇒ tăng `version`.

## 5. Bộ ráp

`docs_template/<NN>_<Hệ>_<Tên>_<Tầng>/` — hệ `GUI` · `IDE` · `CLI`; tầng `Basic` (không cần zemory) · `Memory` (dùng GM).

- Một bộ ráp là thư mục của nó: khung `Struc_Repo_*` + các luật · hiến pháp · skill đã chọn, chép từ HS. Không có sổ kê nào khác.
- Dựng / sửa bộ: màn Harness của cockpit (tab Dựng bộ: kéo phần của HS vào bộ, lưu) hoặc `zemory store assemble` (ráp lại mọi
  bộ từ HS sau khi HS đổi).
- Chọn bộ theo vai của repo trong tầng tổ chức: phòng ban → `Dept` · DW / hệ nguồn → `AppData` · log → `LogCenter` · quản cụm
  → `WorkspaceManager` · ứng dụng → `App` · không có mã chạy → `NonApp`.

## 6. Cách dùng

### 6.1 Dựng máy mới
1. Cài zemory (`README.md` của repo zemory › Quickstart / Docker).
2. Xếp ổ dữ liệu theo §1; kiểm: `zemory conform --layout <gốc ổ>` — sửa tới khi sạch.
3. Đưa repo về đúng chỗ: clone từng repo vào `Workspace/Company/<Tổ chức>/…`, `Personal/…`; thư mục đồng bộ (`_Glossary` ·
   `_<Công cụ>_Template`) nhận qua Syncthing. Kiểm từng tổ chức: `zemory conform --layout <thư mục tổ chức>`.
4. Mỗi repo chưa ráp: `zemory init` trong repo, chọn bộ theo vai (§5). Repo đã ráp: `zemory sync --standard` để lên bản HS mới.
5. Phần mềm: chạy bộ cài trong `Software/<Nhóm>/<Ứng dụng>/Setup/`; cấu hình và khoá trong `AppConfig/` mang sang bằng tay.

### 6.2 Nhận một repo có sẵn
- `zemory adapt` / skill `reconcile`: bảng đề xuất dời file về đúng slot; không tự dời.
- Đối chiếu luật riêng cũ của repo với HS theo §8.

### 6.3 Đồng bộ với HS
- `zemory sync --check` — repo lệch HS ở đâu · `zemory sync --standard` — kéo bản HS mới về.
- Sửa một linh kiện HS: sửa trong `docs_template/_Store/` (người dùng duyệt), tăng `version`, `zemory store assemble`, rồi
  `sync --standard` ở mọi repo dùng linh kiện đó.

### 6.4 Kiểm
- `zemory conform` (repo) · `zemory conform --layout <gốc>` (ổ · workspace · tổ chức) · `zemory validate` (docs harness).

## 7. Cách thiết kế

### 7.1 Xếp một câu vào đúng nhà

| Câu đó nói về | Nhà |
|---|---|
| Cách agent làm việc, đúng ở mọi repo | `01_LAW/_Rule` |
| Chính sản phẩm của repo này (nguồn · ranh giới · kiến trúc · nghiệp vụ) | `Cons.md` của repo, hoặc điều riêng từ 101 |
| Cách làm một loại việc, hoặc chuẩn chung của một loại sản phẩm | Skill |
| Chỗ đặt file, khuôn file — trong repo hoặc trên ổ | Slot · `Struc_` |
| Cơ chế công cụ khác nhau theo hệ (hook · guard · phiên) | `_Host` |

- Phép thử: đem câu đó sang một repo khác mà vẫn đúng y nguyên ⇒ không phải hiến pháp.
- Câu chỉ có nghĩa với một loại file vẫn là luật hoặc skill; khai đường dẫn ở `gate.json › read` hoặc trong hook. Repo
  không có loại file đó thì hook không kích.
- Hai món nói cùng một điều ⇒ gộp. Một món nói hai điều khác nhà ⇒ tách.

### 7.2 Thêm · gộp · bãi bỏ
- Chỉ khi người dùng duyệt (`Rule_Gate_79_HarnessEdit`). Cách dựng chốt máy: `Skill_Harness_RuleGate`.
- Thêm slot: số kế tiếp (không dùng lại số), một vai một slot, ghi đủ bốn mục; thêm tên slot vào `structure.json` của khung.
- Thêm một tầng hay một vai mới trên ổ: một slot mới ở khung của tầng đó; thư mục thật có trước mà chưa có slot thì
  `conform --layout` báo "thư mục lạ" tới khi HS có slot cho nó.
- Bãi bỏ: giữ số, dời vào `Archive/` kèm nơi nhận nội dung.

## 8. Repo viết hiến pháp

1. Mỗi luật khung trong `01_LAW/_Cons/` có một `Cons.md` mẫu (`status: template`). Viết lại cho sản phẩm, đặt
   `status: written`; không áp ⇒ `status: n/a` và một dòng lý do.
2. Bất biến không thuộc loại khung nào ⇒ điều riêng `Cons_<Loại>_<101+>_<Tên>/Cons_<Loại>_<101+>_<Tên>.md`.
3. Hệ nhiều repo cùng chung bất biến ⇒ viết một lần ở repo trung tâm; mỗi repo dùng bất biến đó ghi `Cons.md` trỏ về repo
   trung tâm và chỉ thêm phần riêng.
4. Hiến pháp chỉ siết thêm luật chung, không nới hay trái luật chung.
5. `conform` đỏ khi còn khung chưa viết; read-first đòi đọc mọi `Cons.md` đã viết trước lần ghi đầu.

## 9. Nắn một repo có sẵn về chuẩn

Đối chiếu hiến pháp và luật riêng cũ của repo với HS:

- Câu trùng luật chung ⇒ bỏ ở repo.
- Câu là cách làm ⇒ chuyển sang skill (của repo hoặc của HS).
- Câu là bất biến sản phẩm ⇒ chép vào `Cons.md` của khung tương ứng, hoặc thành điều riêng từ 101.
- Câu trái luật chung ⇒ sửa theo luật chung.

`zemory sync --standard` dời bố cục cũ sang tên mới (`01_RULES` · `02_CONSTITUTION` → `01_LAW/_Rule` · `_Cons`,
`03_STRUCTURE` → `02_STRUCTURE`, `04_SKILLS` → `03_SKILLS`, `05_TODO` → `04_TODO`, `06_CHANGES` → `05_CHANGES`).

## 10. Đồng bộ linh kiện vào repo

- `01_LAW/_Rule` · `02_STRUCTURE` · `03_SKILLS` ghi đè theo HS; bản repo sửa tay thì hợp nhất ba chiều.
- `01_LAW/_Cons`: file luật khung theo HS; `Cons.md` đã viết và điều riêng từ 101 không bao giờ bị đụng; khung mới được
  thêm kèm `Cons.md` mẫu.

## 11. Ví dụ trọn vẹn — tổ chức `Acme` trên một máy mới

```
D:\
├── Workspace\Company\Acme\Dept_SALES\        zemory init → bộ Dept      (owner: Acme_Manager · uses.data: _DB_Warehouse)
├── Workspace\Company\Acme\_DB_Warehouse\     zemory init → bộ AppData   (provides: data)
├── Workspace\Company\Acme\_DB_Log\           zemory init → bộ LogCenter (provides: log)
├── Workspace\Company\Acme\_Glossary\         Syncthing (provides: glossary)
├── Workspace\Personal\MyTool\                zemory init → bộ App
├── Software\Dev\VSCode\{App,Setup}\
└── AppConfig\git\ · AppConfig\ssh\
```

1. `zemory conform --layout D:\` ⇒ sạch.
2. `zemory conform --layout D:\Workspace\Company\Acme` ⇒ sạch; một thư mục `Dept_sales` (chữ thường) ⇒ "thư mục lạ" — đổi
   thành `Dept_SALES`.
3. Trong từng repo: `zemory init` theo bộ của vai; `zemory conform` ⇒ sạch.
