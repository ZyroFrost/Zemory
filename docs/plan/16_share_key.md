<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Chìa share — danh tính đa máy, và vì sao KHÔNG có két

> **Trạng thái: CHỐT + ĐÃ BUILD 2026-07-29.** File này thay bản nháp "vault master-password"
> viết cùng ngày: két đã được cân và **BÁC**, lý do ở §5.

## 1. Bất biến

**Chìa share CHÍNH LÀ danh tính.** Ai giữ chìa thì máy của người đó nối được vào cùng một pool
bộ nhớ qua Drive. Không có khái niệm tài khoản/user nào cần cài — chìa **là** tài khoản.

**Danh tính phải do NGƯỜI mang vào từng máy.** Hệ quả trực tiếp của điều 7 hiến pháp
(*local-only, không transmit gì ngoài bundle mã hoá do user chủ động sync*): không có server
nào chứng thực "cùng một user". Mọi cơ chế enrollment tự động cần một bên thứ ba làm chứng;
không có bên đó. Và nếu máy mới **tự** lấy được chìa từ chỗ nào công khai thì kẻ khác cũng lấy
được — nên đây không phải lỗ thiết kế, mà là điều kiện biên.

## 2. Chìa nằm ở đâu

`<thư mục DB>/share.key` — tra bằng `zemory memory key path`.

**Cạnh DB, KHÔNG phải trong repo.** `currentMemoryDir()` di động được (`memory relocate` dời DB
khỏi ổ hệ thống), nên câu *"chìa ở `data/`"* là SAI trên máy chưa relocate — ở đó DB nằm
`~/.zemory/`. Máy thứ hai **vẫn phải cài từ mã nguồn** (`git clone` → `npm install` → `npm run build` → `npm link`); `npm i -g zemory` KHÔNG chạy — chưa publish lên npm (đo 2026-08-03).

`resolveShareKey` xét: `--key-file` → `<DB>/share.key` → `<repo>/share/share.key` → env
`ZEMORY_SHARE_KEY`. **File thắng env**, nên còn file là env bị bỏ qua — đây là bẫy đã dính một lần.

Chìa đọc lại **mỗi lần gọi** (`readFileSync`, không cache) ⇒ sửa file là lệnh kế tiếp đã dùng
chìa mới, không cần restart, không cần set biến môi trường.

## 3. Luồng — thứ tự BẮT BUỘC

Chìa phải có **TRƯỚC** lần sync đầu: `sync` = scan → **export** → merge, mà export không chìa
thì chặn ngay.

**Máy nguồn:** cài zemory → `zemory memory keygen` (ghi vào đường chuẩn) → trỏ Drive →
`zemory memory sync` → lưu chìa vào note riêng.

**Máy khác:** cài zemory → `zemory memory key set` (dán chìa, đọc stdin) → **so dấu tay** với máy
nguồn → trỏ **cùng** thư mục Drive → `zemory memory sync` (một lệnh làm cả hai chiều).

## 4. Dấu tay — phần đáng giá nhất của luồng mang-chìa-bằng-tay

Lỗi thật khi gõ lại chìa ở máy khác là **GÕ SAI**, mà gõ sai chỉ lộ ra dưới dạng
`unable to authenticate data` **sau khi** import xong một bundle 255 MB. `key show` in
**8 hex đầu của sha256** — so là biết ngay.

**Không bao giờ in giá trị chìa.** Phiên agent bị ingest vào chính `global_memory.db`, nên in
chìa ra là nhét nó vào cái nó bảo vệ, rồi nó theo bundle lên Drive: ai mở được **một** bundle sẽ
đọc được chìa và mở **mọi** bundle. Cùng lý do đó, `key set` đọc **stdin** chứ không nhận đối số
— đối số đi vào history của shell và vào transcript.

## 5. Két master-password — đã cân, **BÁC**

Bản nháp đầu là: master password → két `data/secrets/vault.enc` → DEK 32 byte → bundle. Bị bác
sau khi soi lại bằng hai câu hỏi của chủ repo:

1. **"Máy mới clone về thì cơ sở nào nhận diện?"** — Két nằm **SAU** bước đưa chìa vào, nên nó
   không đóng góp gì cho bài toán đa máy. Thứ còn thiếu là **ô nhập**, và đó là một lệnh, không
   phải một két.
2. **"Chung quy giống như có key ở gitignore thôi"** — Đúng. Và chính **yêu cầu bản lùi** (phải
   phục hồi được khi quên) kéo két về đúng mức bảo vệ của một file gitignored: blob DPAPI cũng mở
   được cho đúng user đó. Két chỉ **thêm** gánh nhớ và **thêm** một lỗi mới (quên là khoá cứng)
   để trị một mối đe doạ mà bản lùi lại mở ra ngay.

**DPAPI-bọc file chìa — cũng BÁC.** Nó chỉ trị "file bị copy khỏi đĩa", mà đó là việc của
full-disk encryption; đổi lấy code Windows-only + một lỗi mới (blob chết khi profile hỏng → vẫn
phải gõ lại từ note). Đã đo: DPAPI chạy được và **có xác thực thật** (lật 1 byte ở 5/6 vị trí đều
bị từ chối; vị trí duy nhất lật được là byte 10 — vùng GUID provider). Tức bác vì **không đáng**,
không phải vì không làm được.

**KHÔNG bê `_SYNC_SALT` của SasinFlow sang.** SasinFlow buộc phải đẻ salt CỐ ĐỊNH cho khoá đồng
bộ, vì két của nó dẫn xuất từ `master_password + salt ngẫu nhiên sinh riêng trên từng máy` ⇒ cùng
mật khẩu vẫn ra khoá khác ⇒ máy A mã hoá, máy B `InvalidToken`. **zemory không mắc bệnh đó**: salt
nằm TRONG bundle (`kdf.salt` ở header). Bê salt cố định sang là tự hạ cấp (mở đường precompute
dùng lại giữa các bundle) để trị một bệnh không có.

## 6. Ai trị được gì — nói thẳng để khỏi bán ảo

| đường rò | ai trị |
|---|---|
| chìa lọt vào git | `.gitignore` + gate `no-data-in-git` |
| chìa lọt vào transcript/DB | `key show` chỉ in dấu tay · `key set` đọc stdin |
| chìa bị copy khỏi đĩa | full-disk encryption (**không** phải việc của app) |
| profile Windows hỏng | **note riêng của người dùng** — đây là đường phục hồi THẬT |
| tiến trình chạy dưới cùng user | **không gì trị được** — kể cả két hay DPAPI |

## 7. Cổng kiểm đang khoá (`share-key-entry` 10 test · `no-data-in-git` 5 test)

`shareKeyPath` cạnh DB · dấu tay ổn định + trim + đổi 1 ký tự là khác · `key set` ghi mode 0600 ·
đã-có-chìa thì không đè khi thiếu `--force` · chặn rỗng/quá-ngắn/có-khoảng-trắng và **ca lỗi không
để lại file** · hai máy cùng chìa ⇒ cùng dấu tay · câu lỗi phải **chỉ đường** chứ không kể tên cờ ·
CLI **không** nhận chìa qua đối số · `key show` không in giá trị. Đột biến hoá **8/8**.

## 8. Việc còn của người dùng

Đưa chìa sang máy thứ hai rồi chạy `zemory memory key set` ở đó. Cho tới lúc đó, máy kia còn giữ
chìa cũ nên lần sync tiếp theo của nó sẽ **đẩy một bundle chìa-cũ lên Drive** — nhận ra bằng
`plan/16` script kiểm hoặc đơn giản là thấy file `global_memory.<host>.*.enc` mới của host đó.
Chìa cũ (`41d88e4d`) nằm trong lịch sử git **đã push** ⇒ coi như lộ vĩnh viễn.
