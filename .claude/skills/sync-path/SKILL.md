---
name: sync-path
description: Declare and PROVE how every new artifact reaches a second machine - code, data layer, derived index, secret, model, config. Run before calling any build "done", when adding a new storage or index layer, when handing a repo to another PC, or when something works on one machine but not the other. Vietnamese triggers - "đồng bộ 2 máy", "máy thứ hai", "bàn giao máy mới", "pull về máy kia", "kẹt giữa 2 máy", "sync đa máy", "máy kia chạy được chưa".
---

# sync-path — mỗi thứ sinh ra phải có ĐƯỜNG sang máy khác, và phải ĐO được

> Kích hoạt: **trước khi gọi một việc là XONG** · khi thêm **lớp lưu / chỉ mục / bí mật / model
> mới** · khi **bàn giao repo sang máy khác** · khi "máy này chạy, máy kia không".

**Vấn đề skill này sinh ra để chặn:** thứ mới được xây xong trên MỘT máy rồi mới phát hiện nó
không có đường sang máy thứ hai — và mỗi lần lại đi dò, mỗi lần vòng một kiểu. Đó là *lùng rồi
fix*, không phải một đường cố định. Bằng chứng trong chính repo này (2026-08-11): bỏ **43 giờ +
12–16 giờ** máy dựng chỉ mục vector, rồi mới lộ ra bundle mặc định **không chở vector**; và lệnh
xuất bundle bàn giao **không tự tìm chìa** trong khi chìa nằm ngay cạnh kho.

## 1. Luật: KHÔNG có kênh = CHƯA XONG

Mọi thứ tồn tại sau khi build phải thuộc **đúng một** kênh dưới đây. Không xếp được vào ô nào ⇒
việc chưa xong, dù code chạy.

| kênh | dùng cho | ràng buộc |
|---|---|---|
| **git** | mã nguồn · docs · template · hook · cấu hình mặc định | **cấm mọi data/bí mật** (`01_CONSTITUTION` điều 7 · 14) |
| **bundle mã hoá** (`.enc`) | kho dữ liệu thật | không bao giờ qua git; không để kho SỐNG trong thư mục đám mây (điều 11) |
| **người mang tay** | chìa · mật khẩu | không git, không đám mây, không in ra màn hình |
| **dựng lại tại máy đích** | lớp dẫn xuất rẻ · `dist/` · cache | phải ghi rõ **lệnh dựng** và **giá** (bao lâu) |
| **tải lúc chạy** | model weight | không commit (điều 2) — nhớ nó cần cả lúc TRUY VẤN, không chỉ lúc dựng |

## 2. Ba câu hỏi bắt buộc — trả lời bằng ĐO, không bằng trí nhớ

Trước khi coi một thứ là xong:

1. **Nó đi kênh nào?** Xếp vào bảng §1. Nếu là "dựng lại tại máy đích" thì **giá bao nhiêu giờ**?
   Giá cao (nhiều giờ máy) ⇒ nó KHÔNG phải thứ dựng lại, nó là thứ phải CHỞ.
2. **Kênh đó có chở nó thật không?** *Đọc code của đường chở*, đừng suy từ tên cờ. Câu hỏi đúng
   là **bên NHẬN đọc những bảng/tệp nào** — bên gửi gói đủ mà bên nhận chỉ đọc một phần thì phần
   còn lại **bị vứt trong im lặng**.
3. **Máy đích chạy được ngay chưa?** Liệt kê đủ thứ nó cần; thiếu MỘT là hụt. Với repo có kho dữ
   liệu, tối thiểu: **mã · dữ liệu+chỉ mục · chìa · model**.

## 3. ĐO — vòng khép kín, không tin "file có nghĩa là dùng được"

"Đã ghi ra file" **không phải** bằng chứng. Bằng chứng là **giải mã/khôi phục ra CHỖ TẠM rồi đếm
lại** — đúng thứ máy kia sẽ nhận:

```
# 1. xuất theo đúng lệnh ghi trong tài liệu (KHÔNG thêm cờ tay)
# 2. nhập bản vừa xuất vào một đường TẠM (tuyệt đối không trỏ vào kho thật)
# 3. mở bản tạm ra và đếm: quick_check · số tin · số phiên · số vector · cấu hình chỉ mục · FTS
```

Đếm phải phủ **cả lớp dẫn xuất**, vì đó chính là lớp hay bị rơi. Một con số tổng ("2 GB") không
nói được gì — nó vẫn đúng khi 87% dung lượng là thứ bên nhận sẽ vứt.

## 4. Bẫy đã trả giá — đọc trước khi tự tin

- **Hai đường tên gần giống nhau, hành vi khác hẳn.** *Gộp thêm* (merge) chỉ lấy bảng NGUỒN;
  *thay nguyên* (import/restore) mới chở được lớp dẫn xuất. Gửi đúng gói mà bảo bên kia chạy sai
  lệnh thì vẫn mất.
- **Mỗi cửa vào một kiểu dò chìa.** Một lệnh tự dò, lệnh kia bắt truyền tay ⇒ người làm theo tài
  liệu vẫn thất bại. **Mọi cửa của cùng một đường phải dò giống nhau** — nay có cổng canh.
- **Đặt tên theo hậu tố đời cũ.** Bộ đọc đổi sang định dạng mới mà chỗ đếm vẫn khớp hậu tố cũ ⇒
  báo "0 gói" vĩnh viễn dù gói có thật.
- **Mẫu gitignore không neo.** Mẫu trần khớp MỌI độ sâu, từng nuốt luôn thư mục dữ liệu của thư
  viện vendored ⇒ ai clone về cũng nhận bản cụt ruột.
- **Model weight**: cấm commit (từng làm nghẽn push vì vượt giới hạn 100 MB), nhưng phải NÓI RÕ
  máy đích tự tải — và rằng thiếu nó thì lớp ngữ nghĩa im lặng rơi về tìm-theo-từ.

## 5. Máy canh, đừng dựa trí nhớ

Skill là chữ, mà chữ thì quên được (`01_CONSTITUTION` điều 13 — thứ CHẶN drift là code). Cổng
đang có, chạy chúng thay vì tự nhớ:

- **`no-data-in-git`** — data/bí mật lọt git, và ngoại lệ mở đường cho bundle.
- **`sync-path-key`** — mọi cửa của đường đồng bộ phải dò chìa giống nhau.

Thêm một lớp lưu/chỉ mục mới mà **không** thêm được cổng canh kênh của nó ⇒ ghi thẳng vào
`05_TODO` là **nợ**, đừng để nó thành thứ phiên sau phải đi dò lại.
