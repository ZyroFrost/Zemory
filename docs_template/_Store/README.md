# Kho linh kiện harness

Kho chứa mọi linh kiện để ráp harness cho một repo. Bộ ráp (`docs_template/<NN>_<Hệ>_<Structure>_<Tầng>/`) là kho đã
chọn sẵn cho một loại repo: hệ (`GUI` · `IDE` · `CLI`), cấu trúc (`App` · `NonApp`), tầng (`Basic` · `Memory`). Repo nhận
bộ ráp, viết phần của mình, rồi đồng bộ với kho về sau.

## Các kệ

| Kệ | Chứa | Trong repo | Đồng bộ |
|---|---|---|---|
| `01_LAW/_Rule/` | Luật chung: cách agent làm việc, lời y hệt mọi repo | `docs/agent/01_LAW/_Rule/` | Ghi đè theo kho |
| `01_LAW/_Cons/` | Luật khung hiến pháp: bắt repo khai một loại bất biến của sản phẩm, kèm mẫu `Cons.md` | `docs/agent/01_LAW/_Cons/` = hiến pháp của repo | Thêm khung mới; không đụng `Cons.md` đã viết và điều riêng |
| `02_STRUCTURE/` | Chuẩn cây thư mục: `Struc_Repo_<App\|NonApp>` · `_Slot/` · `_Host/<GUI\|IDE\|CLI>` | `docs/agent/02_STRUCTURE/` | Ghi đè theo kho |
| `03_SKILLS/` | Cách làm một loại việc | `docs/agent/03_SKILLS/` + bản host dựng (`.claude/skills/`) | Ghi đè theo kho |
| `04_TODO.md` | Khung sổ việc chưa làm, kèm hướng dẫn cửa vào / cửa ra | `docs/agent/04_TODO.md` | Ghi một lần khi repo chưa có; từ đó là của repo |
| `05_CHANGES.md` | Khung sổ việc đã làm, kèm khuôn mục và cách dời sang archive | `docs/agent/05_CHANGES.md` | Ghi một lần khi repo chưa có; từ đó là của repo |
| `Archive/` | Linh kiện đã gộp hoặc bãi bỏ, giữ số; `ARCHIVE.md` ghi nơi nhận nội dung | — | — |

Lịch sử của repo (mục sổ đã đóng, bản chép đã nghỉ hưu) nằm ở `docs/archive/`, cạnh `docs/agent/`, không đọc mỗi phiên.

## Tên linh kiện

`<Mã>_<Loại>_<NN>_<Tên>`

| Phần | Giá trị | Nghĩa |
|---|---|---|
| Mã | `Rule` | Luật chung, kệ `01_LAW/_Rule` |
| | `Cons` | Luật khung hiến pháp, kệ `01_LAW/_Cons`; cũng là mã của điều riêng repo tự viết |
| | `Skill` | Skill, kệ `03_SKILLS`; `<Loại>` là nhóm skill: `Dev` · `Doc` · `Harness` · `Task` |
| | `Struc` | Cụm cấu trúc, kệ `02_STRUCTURE`, không số |
| Loại (luật) | `Gate` | Có chốt máy chặn được lúc vi phạm (hook · pre-commit · cổng kiểm) |
| | `Keys` | Có máy nhắc theo từ khoá nhưng không chặn |
| | `Core` | Chỉ phán đoán; thuộc phần bắt đọc đầu phiên |
| NN | `01`–`99` | Số của kho; không đánh lại; bãi bỏ ⇒ giữ số, chuyển vào `Archive/` |
| | `101`+ | Điều riêng của repo trong `_Cons/`; kho không bao giờ dùng |
| Tên | PascalCase tiếng Anh ASCII | Nói nội dung; bắt đầu bằng số được (`01Raw`) |

Loại do `gate.json` quyết định, không do người đặt: có `hook` · `gate` · `conform` · `read` ⇒ `Gate`; chỉ có `prompt` ⇒
`Keys`; không có gì ⇒ `Core`. Tên nói sai loại thì phép kiểm tên của kho báo đỏ.

Slot: `_Slot/<Vùng>_<NNN>_<Tên>/` (vùng = cấp 1 của đường dẫn). Host: `_Host/<GUI|IDE|CLI>/`.

## Cấu tạo một linh kiện

```
Rule_Gate_10_DestructiveOps/
├── Rule_Gate_10_DestructiveOps.md   frontmatter (id · name · version · kind) + luật + ## Ví dụ
├── gate.json                        chốt máy: hook · gate · read · prompt · ca thử block / pass
└── hook.cjs                         (luật có hook riêng; luật nhận thêm luật khác có thêm hook-<tên>.cjs)

Cons_Gate_10_ReadOnlySources/
├── Cons_Gate_10_ReadOnlySources.md  frontmatter có frame: true · luật "repo phải khai …" · phép kiểm · ví dụ đã viết
├── Cons.md                          mẫu: repo viết lại cho sản phẩm của mình
└── gate.json                        cổng conform: Cons.md đã viết, hoặc đã ghi status: n/a kèm lý do
```

- Lời luật theo khuôn điều kiện → hành vi → phép kiểm: câu ngắn, không trích lời người, không ghi ngày.
- Luật quy định cách viết có mục **Lối đúng**: cách làm tiếp hợp lệ khi bị chặn. Luật cấm hành động không có mục này:
  câu chặn chỉ nói "không làm; muốn làm thì hỏi".
- Mỗi luật có một ví dụ: Tình huống · ✗ Sai · ✓ Đúng, viết bằng nghiệp vụ dễ hiểu, không tên công ty hay sản phẩm.
- Đổi nội dung một linh kiện ⇒ tăng `version`.

## Xếp một câu vào đúng nhà

| Câu đó nói về | Nhà |
|---|---|
| Cách agent làm việc, đúng ở mọi repo | `01_LAW/_Rule` |
| Chính sản phẩm của repo này (nguồn · ranh giới · kiến trúc · nghiệp vụ) | `Cons.md` của repo, hoặc điều riêng từ 101 |
| Cách làm một loại việc, hoặc chuẩn chung của một loại sản phẩm | Skill |
| Chỗ đặt file, khuôn file | Slot · `Struc_` |
| Cơ chế công cụ khác nhau theo hệ (hook · guard · phiên) | `_Host` |

- Phép thử: đem câu đó sang một repo khác mà vẫn đúng y nguyên ⇒ không phải hiến pháp.
- Câu chỉ có nghĩa với một loại file vẫn là luật hoặc skill; khai đường dẫn ở `gate.json › read` hoặc trong hook. Repo
  không có loại file đó thì hook không kích.
- Hai món nói cùng một điều ⇒ gộp. Một món nói hai điều khác nhà ⇒ tách.
- Thêm · gộp · bãi bỏ · đổi số linh kiện chỉ khi người dùng duyệt (`Rule_Gate_79_HarnessEdit`). Cách dựng chốt máy:
  `Skill_Harness_RuleGate`.

## Repo viết hiến pháp

1. Mỗi luật khung trong `01_LAW/_Cons/` có một `Cons.md` mẫu (`status: template`). Viết lại cho sản phẩm, đặt
   `status: written`; không áp ⇒ `status: n/a` và một dòng lý do.
2. Bất biến không thuộc loại khung nào ⇒ điều riêng `Cons_<Loại>_<101+>_<Tên>/Cons_<Loại>_<101+>_<Tên>.md`.
3. Hệ nhiều repo cùng chung bất biến ⇒ viết một lần ở repo trung tâm; repo con ghi `Cons.md` trỏ về repo đó và chỉ thêm
   phần riêng.
4. Hiến pháp chỉ siết thêm luật chung, không nới hay trái luật chung.
5. `conform` đỏ khi còn khung chưa viết; read-first đòi đọc mọi `Cons.md` đã viết trước lần ghi đầu.

## Nắn một repo có sẵn về chuẩn

Đối chiếu hiến pháp và luật riêng cũ của repo với kho:

- Câu trùng luật chung ⇒ bỏ ở repo.
- Câu là cách làm ⇒ chuyển sang skill (của repo hoặc của kho).
- Câu là bất biến sản phẩm ⇒ chép vào `Cons.md` của khung tương ứng, hoặc thành điều riêng từ 101.
- Câu trái luật chung ⇒ sửa theo luật chung.

`zemory sync --standard` dời bố cục cũ sang tên mới (`01_RULES` · `02_CONSTITUTION` → `01_LAW/_Rule` · `_Cons`,
`03_STRUCTURE` → `02_STRUCTURE`, `04_SKILLS` → `03_SKILLS`, `05_TODO` → `04_TODO`, `06_CHANGES` → `05_CHANGES`).

## Đồng bộ

- `01_LAW/_Rule` · `02_STRUCTURE` · `03_SKILLS` ghi đè theo kho; bản repo sửa tay thì hợp nhất ba chiều.
- `01_LAW/_Cons`: file luật khung theo kho; `Cons.md` đã viết và điều riêng từ 101 không bao giờ bị đụng; khung mới được
  thêm kèm `Cons.md` mẫu.
