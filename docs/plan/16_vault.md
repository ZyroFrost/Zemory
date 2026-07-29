<!-- GENERATED · NGUỒN = file .md này (hand-edit tự do, file wins); DB = index dẫn xuất cho search. -->
# Vault — master password mở két, chìa không đi qua kênh nào

> **Trạng thái: ĐỀ XUẤT — chờ user chốt.** Chưa code. Ý gốc của user (2026-07-29):
> *"sao ko làm 1 mk truyền chìa master keyword mở vault giống sasinflow?"* + yêu cầu bổ sung:
> *"masterpassword phải lưu ở máy local chính, xem nó như db lưu trữ, vì chỉ lưu trong đầu thì
> lỡ user quên là ko có chức năng reset."*

## 1. Vì sao — ba sự cố đo được trong một ngày

| # | sự cố | gốc |
|---|---|---|
| ① | `share/share.key` bị commit vào repo **PUBLIC** từ `98bc126` (2026-07-01) | chìa là FILE, mà file thì lọt vào git |
| ② | `.gitignore` có `!share/global_memory.zemory.enc` (từ `f59b2ac`) — whitelist cho bundle **toàn bộ bộ nhớ**, LFS cắm sẵn, chìa nằm ngay cạnh | chìa và ciphertext ở cùng một chỗ |
| ③ | 500+ MB bundle trong `G:\My Drive\Global Memory` **giải mã được bằng chìa cũ** — chìa đó đọc công khai trên GitHub | xoay chìa KHÔNG bảo vệ hồi tố bundle đã có |

Cả ba cùng một gốc: **bí mật tồn tại dưới dạng file/chuỗi phải mang đi**. Bỏ được cái "mang đi" là bỏ được cả ba.

## 2. Mô hình — hai tầng chìa (envelope)

```
MASTER PASSWORD  (chỉ người dùng biết; KHÔNG truyền qua git/Drive)
      │  scrypt(N=2^17, r=8, p=1)  ← nặng, chỉ chạy lúc mở khoá
      ▼
  KEK 32 byte  ──unlock──►  KÉT  data/secrets/vault.enc
                              │  chứa: share key (DEK) 32 byte random
                              │        (về sau: mật khẩu DB, token adapter…)
                              ▼
                        DEK ──► bundle .enc  (scrypt N=2^14 + salt RIÊNG mỗi bundle)
```

- **Master password** = thứ duy nhất người dùng nhớ, và là thứ duy nhất cần giống nhau giữa các máy.
- **DEK** = chìa share 32 byte random, xoay được **không cần đổi master password**.
- Két nằm ở `data/secrets/` — đúng chỗ `03_STRUCTURE §5` đã khai (*"key/salt/bundle → data/secrets/"*), và `/data/` đã gitignored ⇒ **không thể lọt vào git**.

## 3. Bản lùi trên MÁY NGUỒN (yêu cầu của user — quan trọng nhất)

Chỉ-nhớ-trong-đầu có một lỗ thật: **quên là mất sạch, không có đường reset.** Két bị khoá vĩnh viễn, và bộ nhớ 254 MB trong bundle thành rác. Đây là lý do mọi app có phân quyền đều có recovery path (BitLocker recovery key · emergency kit của password manager).

**Chốt:** máy nguồn giữ một **bản lùi của master password**, bọc bằng **Windows DPAPI**, ở `data/secrets/master.dpapi`.

- **Xem như dữ liệu, không phải nguồn** — nằm cùng tầng với `global_memory.db`: gitignored, không commit, không sync. Câu *"lưu backup ở chính nguồn repo này"* hiểu là **thư mục repo trên máy nguồn, tầng `data/`** — TUYỆT ĐỐI không phải commit lên git.
- **DPAPI buộc vào máy + user**: copy blob sang máy khác là vô dụng. Đây đúng là cách SasinFlow dùng cho VM viewer tự mở khoá (`backend/sasinflow/api/dpapi.py`).
- **Đã đo (2026-07-29, PowerShell `ProtectedData`)**: blob 170 byte cho chuỗi 30 ký tự · giải lại đúng nguyên văn · **có xác thực thật** — lật 1 byte ở 5/6 vị trí đều bị từ chối. *(Vị trí duy nhất lật được mà vẫn giải ra là byte 10 — vùng GUID provider, không phải ciphertext. Phép thử ĐẦU của tôi lật đúng byte đó rồi suýt kết luận "DPAPI không xác thực" — sai.)*
- **Scope**: `CurrentUser` (chỉ tài khoản Windows đó) là mặc định. `LocalMachine` chỉ dùng khi zemory chạy dưới service/tài khoản khác — yếu hơn vì mọi user trên máy đọc được.

**Cái giá phải nói rõ:** có bản lùi ⇒ độ an toàn của két tụt xuống bằng *"tài khoản Windows của máy nguồn có an toàn không"*. Đó là đánh đổi CÓ CHỦ ĐÍCH, đổi lấy việc không mất trắng khi quên. Máy nguồn phải là máy tin cậy nhất; máy phụ **không** giữ bản lùi.

## 4. Máy khác — người dùng tự chọn

Chỉ **master password** cần tới máy thứ hai, và nó đi trong đầu. Ở máy đó, người dùng chọn:

| cách | đánh đổi |
|---|---|
| gõ master password mỗi phiên | an toàn nhất, không có gì trên đĩa |
| lưu DEK dạng text ở `data/secrets/` | tiện, và **đủ dùng** — `/data/` gitignored nên không lọt git; đây là lựa chọn của user (*"lưu dạng text hay ko là tùy ý"*) |
| DPAPI-bọc master password ở máy đó luôn | tiện + không trần, nhưng máy phụ cũng thành điểm phục hồi |

## 5. KHÔNG bê `_SYNC_SALT` của SasinFlow sang

SasinFlow buộc phải đẻ một **salt CỐ ĐỊNH** cho khoá đồng bộ, vì két của nó dẫn xuất từ `master_password + salt NGẪU NHIÊN sinh riêng trên từng máy` ⇒ cùng mật khẩu vẫn ra khoá khác nhau ⇒ máy A mã hoá, máy B `InvalidToken`.

**zemory không mắc bệnh đó**: salt nằm **TRONG bundle** (`kdf.salt` ở header), nên cùng một chuỗi bí mật là giải được bundle của nhau. Đã đo: export bằng passphrase ở máy này → import lại bằng passphrase đó ✓ · sai 1 ký tự ✗ · không có chìa → báo lỗi rõ ✗.

⇒ Giữ **salt random mỗi bundle**. Bê salt cố định sang là tự hạ cấp (mở đường precompute dùng lại giữa các bundle) để trị một bệnh không có.

## 6. Nối vào code hiện tại

`resolveShareKey(projectRoot, explicit)` hiện xét theo thứ tự: `explicit` → `<thư mục DB>/share.key` → `<repo>/share/share.key` → rồi `readShareSecret` mới rơi về env `ZEMORY_SHARE_KEY`.

Thêm két vào **giữa**, không đổi thứ tự cũ (tương thích ngược):

```
explicit  →  KÉT đã mở (DEK trong RAM)  →  <DB>/share.key  →  <repo>/share/share.key  →  env
```

- Chưa có két ⇒ hành vi y như hiện tại, không ai bị vỡ.
- Có két nhưng **chưa mở** ⇒ lệnh cần chìa phải **báo rõ "két đang khoá, chạy `zemory vault unlock`"**, KHÔNG âm thầm rơi về file cũ (nếu không thì két thành trang trí).
- Bề mặt mới: `zemory vault init | unlock | lock | status | rotate-key | recover`.

## 7. Cổng kiểm bắt buộc (không có thì đừng ship)

1. `data/secrets/**` phải bị `git check-ignore` chặn — nối vào gate `no-data-in-git` đã có.
2. Master password **không** được ghi ra đĩa ở dạng trần ở bất kỳ đâu; chỉ tồn tại ở RAM và trong blob DPAPI.
3. Két khoá ⇒ export/import **thất bại RÕ**, không rơi ngầm về chìa file.
4. Round-trip: `init` → `unlock` → export → import ✓; sai master password ✗; `rotate-key` xong thì DEK cũ **không** giải được bundle mới.
5. `recover`: xoá master password khỏi RAM (giả lập "quên") → phục hồi được từ blob DPAPI trên máy nguồn; copy blob sang máy khác ⇒ **thất bại**.
6. Đột biến hoá cho từng cổng — theo `02_RULES` (*test mới phải chứng minh mình ĐỎ ĐƯỢC*).

## 8. Phi-mục-tiêu

- **KHÔNG** phân quyền nhiều người / nhiều vai. Đây là két một-người-một-máy, không phải IAM.
- **KHÔNG** mã hoá at-rest cho `global_memory.db` (SQLCipher) trong đợt này — `03_STRUCTURE §5` đặt việc đó ở `store/`, là plan khác.
- **KHÔNG** đưa két lên cloud/git dưới bất kỳ dạng nào.
- **KHÔNG** tự gọi LLM ở bất kỳ bước nào (điều 6 hiến pháp).

## 9. Thứ tự thi công

1. `backend/src/vault/` — derive · seal/open két · DPAPI wrap (qua `koffi`, đã có trong `optionalDependencies`; dự phòng: PowerShell `ProtectedData`). *(Đã kiểm: `koffi` nạp được trên máy này.)*
2. `zemory vault init|unlock|lock|status` + nối vào `resolveShareKey`.
3. `rotate-key` (xoay DEK, giữ master password) + `recover`.
4. Cổng kiểm §7 + đột biến hoá.
5. Di trú: nhập chìa hiện có vào két, rồi xoá `share/share.key` + `data/share.key`.
6. **Chỉ SAU khi két chạy** mới xoá bundle chìa-cũ trong Drive và export lại baseline.
