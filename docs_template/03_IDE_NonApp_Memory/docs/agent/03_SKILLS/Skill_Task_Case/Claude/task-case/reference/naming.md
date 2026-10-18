# Tên case, tên việc và tên file — repo phòng ban

> Phần của `Skill_Task_Case`. Áp cho repo theo template `Struc_Repo_Dept` và repo tổng quản của cụm. Bộ mã chủ (mã phòng ban +
> mã của tổng quản) là danh sách ĐÓNG do tổng quản giữ: khoá `dept_codes` trong giá trị cụm.

## 1. Tên case: `<MÃ>_<NHỊP>_<TênViệc>`, không đánh số

| Nhịp | Dùng khi |
|---|---|
| `Daily` · `Weekly` · `Monthly` · `Quarterly` · `Yearly` | việc theo lịch |
| `Realtime` | job máy dò theo PHÚT trong khung giờ để đuổi độ tươi; `run_at` dạng `every:5m 05:30-23:59` |
| `Every<N>m` · `Every<N>h` | job máy chạy nhịp CỐ ĐỊNH chọn theo chi phí đo được của nguồn; `run_at` dạng `every:15m 05:15-23:59` |
| `Case` | việc lẻ, ập tới rồi xong là hết, không có gì để chạy lại |
| `OnDemand` | có quy trình dựng sẵn, chạy thành đợt khi có người yêu cầu; không lịch |

- `Case` không ngụ ý sẽ có pipeline: phần lớn là dò, trả lời xong câu hỏi là ĐÓNG. "Chưa dựng pipeline" không phải trạng thái của
  một `Case`. Việc thật sự cần quy trình chạy lại là `OnDemand` ngay từ lúc mở.
- Phân loại nhịp bằng cách ĐỌC SPEC (spec tự khai chạy theo lịch hay theo yêu cầu), không đếm file. Máy chỉ kiểm chéo: launcher nào
  gọi case nào (`bin/*.cmd`). Spec nói có quy trình mà không launcher nào gọi ⇒ chưa dựng xong; có launcher mà spec nói chưa dựng ⇒
  spec cũ. Lệch nhau là phát hiện. Có thư mục `pipeline/` hay có launcher không phải phép phân loại: nhịp hỏi việc là LOẠI gì, không
  hỏi đã dựng tới đâu. Tên chốt theo bản chất lúc mở; dựng thêm script không đổi tên.
- Áp cho case MỚI. Case cũ chỉ đổi khi chạm tới và khi người dùng chốt — đổi tên làm mất mạch tra Global Memory.

## 2. `<TênViệc>` tả VIỆC, không phải mã kỹ thuật

- Phép thử: đưa tên cho người không làm kỹ thuật — họ đoán được case làm chuyện gì không? Không ⇒ đổi tên.
- Cấm lấy tên bảng · tên cột · mã hệ thống làm tên việc (`SKU` · `Dvcs` · `Ct70` · mã vật tư). Nói việc, ngắn nhất mà vẫn đúng:
  *quy đổi số lượng* · *đối soát bill* · *doanh thu theo khối*. Viết PascalCase tiếng Anh; viết tắt nghiệp vụ giữ IN HOA (`B2B` ·
  `COGS` · `KPI`).
- Không lẫn với luật "tên có sẵn của người ta giữ nguyên": luật đó áp cho tên FILE, bảng, vendor của bên ngoài; tên việc là tên mình
  đặt.

## 3. Đổi tên case = khai tên cũ ở `spec.md`

Ngay đầu `spec.md`, dòng đầu của khối trích dẫn:
```
> **Tên cũ — tra Global Memory PHẢI dùng tên này:** `<tên cũ>` (tới <ngày đổi>). …
```
- Đổi nhiều lần ⇒ liệt kê ĐỦ mọi tên. Đặt ở `spec.md` vì đó là file agent thật sự mở khi chạm case.
- Thứ gãy khi đổi tên là chuỗi tên case nằm trong NỘI DUNG bộ nhớ (tra tên mới ra 0 kết quả ⇒ tưởng case chưa từng làm), không
  phải `project_root`. Đổi tên REPO mới là dời `project_root` — làm ở phiên tổng quản.
- Đổi mã chủ của case theo bộ mã mới cũng là đổi tên ⇒ khai tên cũ.

## 4. Tên file đã chuẩn hoá

Áp cho file nguồn sau chặng đổi tên (`data/<case>/02_processing/`) và file giao theo phòng (`03_output/<MÃ>/`):
`<MÃ>_<TênViệc>.<ext>`; file theo từng đơn vị thêm tên ngắn của đơn vị: `<MÃ>_<TênViệc>_<TênNgắn>.<ext>`.

- Không có nhịp trong tên file — nhịp là của task kéo hay sinh ra nó.
- `<TênViệc>` theo luật mục 2. `<TênNgắn>` là tên ngắn người đọc nhận ra (số nhà + viết tắt đường của cửa hàng, viết liền), lấy từ
  cột tên ngắn của dim đơn vị trên DW; không dùng mã khoá nội bộ (người đọc không nhận ra đơn vị). Chữ có dấu và `-` hợp lệ ở vế
  này; `/` đổi thành `-` (Windows cấm `/` trong tên file).
- Tên GỐC của file nguồn giữ nguyên ở `01_raw/`; đổi tên là việc của chặng 02.
- Ánh xạ tên gốc → tên chuẩn là DỮ LIỆU, không nằm trong code: một sổ người điền + một script kiểm khuôn tên và mã chủ (thoát ≠ 0 khi
  sai). Khuôn kiểm: `^<MÃ>_[A-Za-z0-9]+(_[A-Za-z0-9]+)?\.(xlsx|xls)$`, `<MÃ>` bằng cột mã chủ của cùng dòng.

## 5. Tên bản giao

- Bản giao theo chuẩn tên của bên đã gửi bản gốc (bên gửi `DT T6-2026.xlsx` ⇒ bản giao `DT T<M>-<YYYY>.xlsx`).
- Bản trọn kỳ giữ tên trơn; bản một phần kỳ kèm khoảng ngày: `DT T8-2026 (01-20.08).xlsx`. Hai bản giao khác nhau của cùng một kỳ
  không bao giờ trùng tên — trùng tên là bản sau ghi đè bản đã gửi.
- Không dấu "tạm" hay "không gửi" trong tên.
- Bản giao mọi kỳ nằm cùng nhau trong `03_output/` — đó là lịch sử giao hàng của case.
