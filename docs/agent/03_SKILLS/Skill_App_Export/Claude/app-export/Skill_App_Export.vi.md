---
version: 1
lang: vi
---

# app-export — dữ liệu rời app thành tệp: có phạm vi, có chọn, có nhật ký

> Thi hành `Rule_Gate_75_ScopedExport`. Là skill riêng vì: `Skill_App_Base` nói cách dựng bề mặt, `Skill_App_Report` cách đọc
> một trang báo cáo, `Skill_App_CrossFilter` cách các hình lọc lẫn nhau, `Skill_Db_Base` cách dựng bảng - không skill nào nói
> thứ gì được rời app thành tệp, ai chọn, và nhật ký giữ gì.

## 1. Một danh sách cột
- Backend giữ MỘT danh sách những gì một lần xuất được mang: khoá → (SQL của cột, có phải dữ liệu cá nhân không). Tệp hiện cột
  theo thứ tự của danh sách, dù yêu cầu gửi theo thứ tự nào.
- Khoá không có trong danh sách bị từ chối (422). SQL của cột chỉ lấy từ danh sách, không bao giờ từ yêu cầu.
- `GET /api/export/columns` trả danh sách (khoá, cá nhân) cho hộp thoại; chữ hiện cho từng khoá là của app.

## 2. Ba route
- `GET /api/export/columns` - danh sách cột.
- `POST /api/<thực thể>/export/preview` - số dòng phạm vi đang có; không có phạm vi thì từ chối.
- `POST /api/<thực thể>/export` - body: bộ lọc theo tên API của trang · `columns` · `purpose` · `format` (`csv` · `xlsx`) ·
  nhóm đã lưu nếu xuất từ nhóm.
- Mọi route kiểm bậc vai trên máy chủ (bậc do hiến pháp của app đặt cho chức năng xuất).

## 3. Các phép kiểm của route xuất, theo thứ tự
1. Bậc vai, không đủ thì 403.
2. Phạm vi: ít nhất một bộ lọc; một khoảng thời gian tính là một. Không có ⇒ 422 `export.no_filter` - không bao giờ cả bảng
   bằng một cú bấm.
3. Cột: ít nhất một, cột nào cũng có trong danh sách ⇒ không thì 422.
4. Có cột cá nhân ⇒ mục đích từ 5 tới 200 ký tự, không thì 422.
5. Định dạng có trong danh mục (`csv`, `xlsx`), không thì 422.
6. Đọc dòng; ghi dòng nhật ký (mã xuất của app, mức warn, Detail `<số dòng> · <phạm vi> · cols <khoá> · purpose <chữ> ·
   <định dạng>`); không ghi được ⇒ 503, không có tệp.
7. Dựng tệp trong bộ nhớ: CSV UTF-8 có BOM (Excel đọc đúng tên có dấu); Excel một sheet trong workbook chỉ-ghi, cố định dòng
   tiêu đề, số giữ là số, ngày giữ là ngày. Trả kèm `Content-Disposition: attachment; filename="<app>-<thực thể>-<yyyymmdd-hhmm>.<đuôi>"`
   và `Cache-Control: no-store`. Không ghi gì xuống đĩa máy chủ.

## 4. Hộp thoại
- Mở từ nút xuất của trang (id của nút là chỗ bài kiểm trình duyệt bấm) hoặc từ menu dòng của một nhóm đã lưu; cú bấm đầu không
  bao giờ ra tệp.
- Đặt NGOÀI page card: ô ngày của khung đặt trong page card tự đăng ký thành bộ lọc của thanh trang và hiện nút ghim.
- Các mục, mỗi mục một vạch ngăn: phạm vi bằng chữ (đổi ở thanh trang, không đổi trong hộp thoại) · thời gian (hai ô ngày của
  khung) · cột là các ô tick theo nhóm, cột cá nhân có nhãn, mở ra không tick cột cá nhân · mục đích, hiện khi tick cột cá nhân ·
  định dạng (Excel hoặc CSV) và tệp đi đâu · số dòng.
- Bấm Xuất mở hộp "Lưu thành" của trình duyệt trước (`showSaveFilePicker`, Edge và Chrome), ngay trong cú bấm, trước khi dựng
  tệp; huỷ thì dừng hết - không đọc, không ghi nhật ký. Trình duyệt không có hộp đó thì tệp vào thư mục tải xuống, và hộp thoại
  nói rõ.
- Nút Xuất tắt cho tới khi có phạm vi, có cột và (khi có cột cá nhân) có mục đích.

## 5. Test
- Test backend: từng bậc vai · không phạm vi · không cột · cột lạ · cột cá nhân thiếu mục đích · định dạng không có · dòng nhật
  ký ghi trước với Detail của nó · nhật ký hỏng thì 503 và không lộ nội dung tệp · thứ tự cột · đọc lại tệp Excel (số, ngày,
  tiêu đề).
- Phá từng phép kiểm: một test đỏ; trả lại: xanh.
- Bài kiểm trình duyệt mở hộp thoại từ nút xuất và đo nó bằng các luật hộp thoại.

## Implements · Thi hành luật
- `Rule_Gate_75_ScopedExport` — the dialog, the routes and the checks of an export · hộp thoại, route và phép kiểm của một lần xuất
