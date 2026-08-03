// Corpus CÓ NHÃN cho `memory bench --recall` — sinh từ tin THẬT trong kho, mỗi truy vấn là
// một bản DIỄN ĐẠT LẠI (cố ý tránh trùng từ khoá) của đúng một tin.
//
// Neo bằng (session, uuid): khoá BỀN qua re-ingest, và KHÔNG chở nội dung tin vào git — điều 7
// cấm commit dữ liệu thật. Máy nào không có đúng kho đó thì bench báo THIẾU NHÃN thay vì giả
// vờ có kết quả.
//
// Thêm truy vấn: đọc một tin thật, viết lại ý bằng từ KHÁC, rồi thêm một dòng. Corpus càng
// lớn thì cổng càng phân biệt được hai lớp gần nhau (34 truy vấn là mức tối thiểu dùng được).

export interface LabeledQuery {
  q: string;
  lang: string;
  session: string;
  uuid: string;
}

export const RECALL_CORPUS: LabeledQuery[] = [
  { q: "ứng dụng chỉ chạy lại lịch sử: một tab thử chiến lược, một tab replay nến bấm tay mất trạng thái khi tải lại, một tab thử bằng JS — còn thiếu ví ảo chạy tới", lang: "vi", session: "25c71331-0b7a-445c-a280-17f5292ab02a", uuid: "634dc937-bee0-422e-84de-c442d1e00e7e" },
  { q: "năm khoá ngoại ngày của các bảng dữ kiện đều báo không thiếu dòng nào, nên mục kế là vẽ lược đồ cơ sở dữ liệu", lang: "vi", session: "50de6bd7-d7af-4159-934d-8c6fae9f93ca", uuid: "3f8a52fc-3487-4409-bbb1-568fbfb53e83" },
  { q: "đổi khung chờ từ cửa sổ rời sang widget con của cửa sổ chính, căn giữa theo bề rộng cha thay vì theo màn hình", lang: "vi", session: "5fb49ead-45cf-4ec0-8d15-6b0c0bbe9f9c", uuid: "fdc2d560-fb1e-49ff-8f67-a51cd5077799" },
  { q: "ba bước: gõ ssh tới địa chỉ ngoài, thấy dấu nhắc là vào được máy, rồi cài docker chạy airflow", lang: "vi", session: "chatgpt-69bbfff6-4d28-8323-85e6-988bef09f2d6", uuid: "5bc164a8-a85e-498a-a1fc-a83f1c9b6a5d" },
  { q: "lá tiền số tám chứ không phải số chín: chỉ nên đáp lại nếu vì muốn rõ ràng, không phải để hơn thua", lang: "vi", session: "chatgpt-690e2911-a36c-8327-adea-5e7087931b43", uuid: "1607434c-9f0e-4706-b8ed-2a9e2d4216b7" },
  { q: "toạ độ con năm trăm mười hai và hai trăm tám tám bị hiểu thành tuyệt đối nên nhảy lên góc trên trái thay vì cộng vào vị trí cha", lang: "vi", session: "2a462d1f-b883-4518-a804-207fdcc7ea96", uuid: "0a94888c-8bfe-4f3d-b5b1-0424eca34704" },
  { q: "bộ ba sữa chua giấy vệ sinh nước uống đếm ra một lần dù năm giao dịch gốc không có giao dịch nào đủ cả ba món", lang: "vi", session: "chatgpt-68e140ae-da1c-8324-8f00-2bdadb688e1a", uuid: "d75e848e-5366-4816-8849-c8ca96dce183" },
  { q: "dấu than thuộc cột FE vì đó là lệch hoá đơn, còn việc chốt ca chỉ báo thời điểm bắt đầu tính", lang: "vi", session: "19a4395d-3491-46a5-8d67-cb1083b59d0a", uuid: "8e46688e-7619-4f93-86df-bd17888f5d99" },
  { q: "commit tải bộ dữ liệu ngân hàng đã sẵn sàng, chỉ còn đẩy từ terminal linux con vì chìa nằm bên đó", lang: "vi", session: "26e4bc7e-6714-4fb2-b4e1-43ef7d4b0b37", uuid: "60c9025d-0f80-4d7d-8c6f-76f388a92638" },
  { q: "chọn câu nói rõ chuyển cả giao dịch lẫn ngân sách sang nhóm khác thay vì chỉ nhắc mỗi giao dịch", lang: "vi", session: "chatgpt-694e5cdf-b524-8322-b4e0-154eee9519dd", uuid: "12d9c7b2-a063-407a-8e9d-f3f1c57293ec" },
  { q: "thêm bảng ghi lúc vượt hạn mức vào khoảng trống bên phải, và đổi hộp thoại từ cỡ lớn dư thừa sang cỡ vừa", lang: "vi", session: "4f1ea683-0a03-41fa-aec2-9252a4300a03", uuid: "13931453-80da-4292-94e4-28b7ea1a7bd1" },
  { q: "mã tám mươi hai là rà soát tài liệu thuộc chặng hai, không nằm trong ba khối nhập xử lý xuất", lang: "vi", session: "59abf707-09f2-43dc-b317-eb629bcd9ba4", uuid: "b6c4d591-4a71-468c-ac45-1d3d5a1a20f8" },
  { q: "không phiên nào chạm trần năm nghìn tin, cắt bốn nghìn ký tự chỉ đụng hơn bốn phần trăm, còn quá nửa số tin là khối công cụ", lang: "vi", session: "88015817-4be1-4817-8f05-1d9e34786b4f", uuid: "dc09f8ec-7af8-4261-8535-098c7b17c52b" },
  { q: "bảng ánh xạ hoa hồng hướng dương hoa tulip sang dạng số nhiều mà vẫn báo lỗi thư mục", lang: "vi", session: "chatgpt-69c5714a-2168-8322-b1ba-edc2330f9e3e", uuid: "5f52bb13-db57-4674-8a32-882e72c5900d" },
  { q: "màn hệ thống phải chia đôi, danh sách phiên gần đây hiện tên tôi tự đặt, thẻ dự án đếm theo loại, và mọi khung phải kéo được", lang: "vi", session: "ce2ed6df-69fd-4d93-9c5b-6aa14fed5143", uuid: "9ad5ae43-e7d3-466d-ab53-0d972c646377" },
  { q: "hàm tìm ký ức không nằm trong giao ước lưu trữ vốn chỉ có lưu lấy truy vấn, nên proxy nói với lớp quản lý cao hơn", lang: "vi", session: "98b4d9bf-69b2-476c-8c87-d322cc4d2c26", uuid: "3e506b6c-056f-4eab-8d3c-1a5dee5d0e1f" },
  { q: "đẩy hai tệp thêm sáu mươi dòng: đặc tả bản tóm lược mười mục với năm điều bất biến và bảng lưu riêng", lang: "vi", session: "f22aca3a-4262-4c60-9158-e98022fe9aa8", uuid: "ebec0747-421e-4f7c-b57f-275ce15f67ae" },
  { q: "tệp thứ ba là từ điển khe và mục lục toàn ứng dụng, chỉ mở khi thêm hoặc sửa khe chứ không đọc mỗi phiên", lang: "vi", session: "0b2dc2bd-deb3-4ae3-8fc1-5b1092a11b86", uuid: "d6c260c4-6891-4465-a1ce-727b6a3a9552" },
  { q: "trang chỉ khai biểu tượng dạng véc-tơ nên cửa sổ chromium lấy nhầm icon trình duyệt khác, phải thêm bản dạng điểm", lang: "vi", session: "fcaea489-bd94-4a72-92f3-6784de2c5613", uuid: "733925d2-f8ed-41eb-863c-ec1ba9d7fbbf" },
  { q: "gói chở theo chỉ mục véc-tơ và tóm lược trong khi bên nhận chỉ đọc ba bảng nguồn, phần thừa chiếm khoảng tám mươi bảy phần trăm", lang: "vi", session: "42183723-eb69-444c-9990-8228d3ea88e4", uuid: "ed7f6588-1c7a-4689-a745-c56366417bc3" },
  { q: "máy chủ trả đúng bản mới nên cái đang nhìn là cửa sổ cũ đóng băng, gỡ viền vàng và huy hiệu góc rồi mở đúng một cửa sổ", lang: "vi", session: "ce2ed6df-69fd-4d93-9c5b-6aa14fed5143", uuid: "ac06d46a-7333-4e6d-8845-a4e52063973e" },
  { q: "một lệnh chỉ dựng chỉ mục nội bộ từ tệp, lệnh kia mới là đẩy gói mã hoá giữa các máy qua ổ đám mây, tôi không đụng cái sau", lang: "vi", session: "a649fce2-86f0-4145-9f52-42ccb52ccfa5", uuid: "6d5c6e65-4962-43c6-895b-27fe7b35f439" },
  { q: "đọc nhầm log: con số kia là phần còn thiếu chứ không phải tiến độ, tốc độ thật gần bốn trăm tin mỗi phút nên còn vài tiếng", lang: "vi", session: "d541a4d9-efdb-4bef-8b21-6cae1337544b", uuid: "ba548e64-f899-4cad-9405-75a35fc96005" },
  { q: "lệnh dựng lại ghi đè toàn bộ nên nguy hiểm khi kho cũ, cách an toàn là sửa tệp rồi cho kho khớp lại", lang: "vi", session: "bb02723b-818f-48d5-b5dc-c67be21f74bc", uuid: "e54d4152-21d9-4a89-855f-e82703e0285e" },
  { q: "kiểm trả về không lỗi, chỉ nhắc bốn trăm mười hai dòng vượt ngưỡng bốn trăm và bốn dấu thay thế", lang: "vi", session: "d6769db8-26a6-4b8a-9a20-0b3da92cd8aa", uuid: "5f5ab8bd-45f0-445f-a4ca-654e97c72884" },
  { q: "gộp hai câu khởi động thành một, dán nguyên văn là chạy dù máy đã có bản cài hay chưa", lang: "vi", session: "0b2dc2bd-deb3-4ae3-8fc1-5b1092a11b86", uuid: "b6869033-ecce-4938-8e82-6fe6a1689136" },
  { q: "đồ thị khai báo xong với sáu tham chiếu và ba mươi tư dấu thay thế, lớp phủ ngữ nghĩa chạy ngoài luồng chính", lang: "vi", session: "fcaea489-bd94-4a72-92f3-6784de2c5613", uuid: "0392fe1d-182a-42d5-9c9b-5c313b568796" },
  { q: "bản nền cũ ngốn gần bốn nghìn giây CPU nên không đáp thăm dò, khiến bản thứ hai mọc lên và rơi sang cổng khác", lang: "vi", session: "634d1b14-160f-46ad-9227-a7d1e4112d5e", uuid: "3708bfc1-3bd3-44a9-a45d-9ecbd559744e" },
  { q: "chạy từ thư mục người dùng không thấy chìa vì chìa nằm trong kho, chép sang thư mục toàn cục thì chạy được từ mọi nơi", lang: "vi", session: "f22aca3a-4262-4c60-9158-e98022fe9aa8", uuid: "6bb48650-5140-4e61-8a2d-e2f078e6cc42" },
  { q: "kiểm kho từ xa chỉ có đúng một tham chiếu, vẫn đứng ở commit vừa đẩy nên máy kia chưa lên", lang: "vi", session: "e0c47480-e7d1-444f-b350-e2ab829aecec", uuid: "dc612381-085d-4935-9cdc-c55c4a075304" },
  { q: "kho dev tụt hơn ba mươi commit: đổi tên toàn bộ, tách thư mục nền với giao diện, thêm nền chạy cổng cố định và khay hệ thống", lang: "vi", session: "a21b28f6-aa75-488f-9c43-91424e0ab952", uuid: "aaa91e45-aa25-4a89-83d1-d5171df757f0" },
  { q: "một thẻ lớn gộp phần tra cứu với phần khung chuẩn, ba cái còn lại gom vào thẻ máy", lang: "vi", session: "3145fe31-3a4f-4f14-90db-0ca8bc9ddfea", uuid: "6b96ca59-eba9-4eae-b066-6ada0c5e7caf" },
  { q: "chỉ mượn ý tưởng chế độ đọc, mật độ, bản đồ và sổ ghi từ repo kia chứ không sao chép cả kho", lang: "vi", session: "rollout-2026-06-20T19-53-56-019ee518-5171-7410-a785-d4bb19e21b9e", uuid: "msg_03249aaab0fe91d7016a36a2deb22881919d6ca1d05c6717bd" },
  { q: "máy chủ giao thức sống lâu nạp mô hình một lần nên tra khoảng hai trăm mili giây, thay vì mỗi lệnh phải nạp lại", lang: "vi", session: "f568ecae-0e85-45aa-b2ef-73e244f797b9", uuid: "f1479e10-c613-403c-91ca-df7919a5b4c3" },
];
