// Corpus CÓ NHÃN cho `memory bench --recall` — sinh từ tin THẬT trong kho, mỗi truy vấn là
// một bản DIỄN ĐẠT LẠI (cố ý tránh trùng từ khoá) của đúng một tin.
//
// Neo bằng (session, uuid): khoá BỀN qua re-ingest, và KHÔNG chở nội dung tin vào git — điều 7
// cấm commit dữ liệu thật. Máy nào không có đúng kho đó thì bench báo THIẾU NHÃN thay vì giả
// vờ có kết quả.
//
// Thêm truy vấn: đọc một tin thật, viết lại ý bằng từ KHÁC, rồi thêm một dòng. Corpus càng
// lớn thì cổng càng phân biệt được hai lớp gần nhau (34 truy vấn là mức tối thiểu dùng được).

/**
 * LỚP của một truy vấn — thứ quyết định corpus có nhìn thấy chỗ cần nhìn hay không.
 *
 * Đo thành phần kho 2026-08-07 (213.241 tin): `tool_use` 28,7% (KHÔNG vector, KHÔNG trigram
 * ⇒ chỉ còn FTS word) · `tool_result` 28,3% (CÓ vector, KHÔNG trigram) · hội thoại 42,9%
 * (đủ cả hai). Ba nhóm này được tìm bằng những đường KHÁC HẲN nhau, nên một con số recall
 * gộp không nói được gì: corpus cũ 34 câu toàn `prose`, có nhân lên 200 câu vẫn mù với
 * 57% kho. Chia lớp để `bench --recall` trả lời được ba câu đang treo:
 *   · `tool_use` thiếu vector có THẬT SỰ làm mất recall không (⇒ có đáng embed thêm không)
 *   · `tool_result` đang ăn ~40% công embed có đáng giữ không (⇒ cắt được thì rút 43h → ~26h)
 *   · `prose` lên 768 hơn 256 bao nhiêu (mốc chính của đợt rebuild)
 */
/**
 * `keyword` (thêm 2026-08-09) — lối tìm PHỔ BIẾN NHẤT mà corpus từng MÙ HOÀN TOÀN: gõ 2–3 từ
 * khoá, một đường dẫn, một mảnh lệnh. Đo 2026-08-08: **cả 64 câu cũ đều có lane AND rỗng**
 * (câu tự nhiên dài không bao giờ khớp đủ mọi từ) ⇒ không có phép đo nào cho nhóm này, và
 * cổng "không biết" (plan 17 §1.3) *không thể* nghiệm thu vì điều kiện ② của nó nói về đúng
 * lane AND đó. Nhóm này cố ý dùng NGUYÊN VĂN từ khoá — trái hẳn lối "tránh trùng từ khoá" của
 * lớp `prose`, và đó là chủ đích: hai lớp đo hai năng lực khác nhau, KHÔNG so chéo với nhau.
 */
export type QueryKind = "prose" | "tool_use" | "tool_result" | "keyword";

export interface LabeledQuery {
  q: string;
  lang: string;
  /** Nhãn DƯƠNG: neo tới tin đích. Ca ÂM TÍNH để rỗng (xem `NEGATIVE_CORPUS`). */
  session: string;
  uuid: string;
  /** Thiếu ⇒ `prose` (34 truy vấn đầu viết trước khi có phân lớp, đều thuộc lớp đó). */
  kind?: QueryKind;
}

/**
 * CA ÂM TÍNH — câu hỏi mà kho **KHÔNG** có câu trả lời.
 *
 * Vì sao phải có (lỗ đo được 2026-08-08): 56 nhãn dương chỉ trả lời được *"tìm có ra không"*.
 * Chúng MÙ với *"có bịa không"* — mà đó đúng là triệu chứng người dùng báo (search trả kết
 * quả lạc repo, không liên quan). Nguy hơn nữa: bản vá thêm luồng OR nới pool từ ~5,4 lên
 * 100 ứng viên, chắc chắn tăng recall nhưng cũng chắc chắn kéo thêm thứ không liên quan —
 * và nếu chỉ có nhãn dương thì **không cách nào nhìn thấy mặt trái đó**. Một cái thước đo
 * một chiều sẽ luôn nói bản vá là cải thiện thuần.
 *
 * Cách dùng: chạy truy vấn, rồi đọc ĐIỂM/thứ hạng của kết quả đầu. Hệ tốt phải trả **rỗng**,
 * hoặc trả điểm thấp rõ rệt so với ca dương — chứ không phải trả 12 kết quả trông tự tin.
 *
 * Chủ đề cố ý chọn NGOÀI hẳn phạm vi kho (kho là hội thoại kỹ thuật/BI của một người dùng
 * Việt Nam): không thể "vô tình đúng". Tránh dùng thuật ngữ kỹ thuật, vì mọi tin kỹ thuật
 * đều na ná nhau ở tầng ngữ nghĩa và ta sẽ đo nhầm sang bài toán khác.
 */
export interface NegativeQuery {
  q: string;
  lang: string;
  /** Vì sao chắc chắn kho không có — ghi lại để người sau khỏi tưởng là nhãn thiếu. */
  why: string;
}

export const NEGATIVE_CORPUS: NegativeQuery[] = [
  { q: "công thức nấu phở bò gia truyền Nam Định cần hầm xương mấy tiếng", lang: "vi", why: "kho là hội thoại kỹ thuật, chưa bao giờ bàn nấu ăn" },
  { q: "lịch thi đấu vòng loại World Cup khu vực châu Á tháng này", lang: "vi", why: "không có nội dung thể thao" },
  { q: "triệu chứng và cách điều trị bệnh sốt xuất huyết ở trẻ nhỏ", lang: "vi", why: "không có nội dung y tế" },
  { q: "thủ tục làm hộ chiếu phổ thông cần giấy tờ gì và mất bao lâu", lang: "vi", why: "không có nội dung hành chính công" },
  { q: "phân tích ý nghĩa bài thơ Tây Tiến của Quang Dũng", lang: "vi", why: "không có nội dung văn học" },
  { q: "giá vé máy bay khứ hồi Hà Nội Đà Lạt tháng sau", lang: "vi", why: "không có nội dung du lịch/đặt vé" },
  { q: "cách chăm sóc lan hồ điệp sau khi tàn hoa", lang: "vi", why: "không có nội dung trồng trọt" },
  { q: "luật chơi cờ vua: tốt phong hậu trong trường hợp nào", lang: "vi", why: "không có nội dung cờ/game luật" },
];

/**
 * CA ÂM **GIỮ RIÊNG** (thêm 2026-08-09) — chỉ để NGHIỆM THU, tuyệt đối KHÔNG dùng để chọn ngưỡng.
 *
 * Vì sao phải tách làm hai bộ: ngưỡng θ=0,82 của cổng "không biết" được hiệu chỉnh bằng cách
 * quét trên `NEGATIVE_CORPUS` — tức **fit trên chính tập dùng để chấm nó**. Một cái thước hiệu
 * chỉnh trên đúng dữ liệu nó sẽ chấm thì luôn cho điểm đẹp, và điều 12 gọi đó là chưa qua cổng.
 * Bộ này chưa từng tham gia chọn θ, nên tỉ lệ chặn ở đây mới là con số nói thật.
 *
 * Cùng nguyên tắc chọn chủ đề như bộ trên: NGOÀI HẲN phạm vi kho (kho là hội thoại kỹ thuật/BI
 * của một người dùng Việt Nam) để không thể "vô tình đúng"; tránh thuật ngữ kỹ thuật vì mọi tin
 * kỹ thuật đều na ná nhau ở tầng ngữ nghĩa và sẽ đo nhầm sang bài toán khác.
 */
export const NEGATIVE_HOLDOUT: NegativeQuery[] = [
  { q: "cách gấp áo sơ mi cho gọn khi xếp vào vali", lang: "vi", why: "kho không có nội dung sinh hoạt/gia đình" },
  { q: "bao lâu nên thay dầu nhớt xe máy một lần", lang: "vi", why: "không có nội dung bảo dưỡng xe" },
  { q: "trồng rau mầm tại nhà mấy ngày thì thu hoạch được", lang: "vi", why: "không có nội dung trồng trọt" },
  { q: "phân biệt cà phê arabica với robusta khi pha phin", lang: "vi", why: "không có nội dung đồ uống/ẩm thực" },
  { q: "tập plank đúng cách giữ bao lâu mỗi lần", lang: "vi", why: "không có nội dung thể dục" },
  { q: "thủ tục đăng ký kết hôn ở phường cần những gì", lang: "vi", why: "không có nội dung hành chính hộ tịch" },
  { q: "mèo con mấy tuần thì cai sữa và ăn được hạt", lang: "vi", why: "không có nội dung thú nuôi" },
  { q: "đàn guitar bị rè dây thì căn chỉnh chỗ nào", lang: "vi", why: "không có nội dung nhạc cụ" },
  { q: "nên chọn sơn nước loại nào cho tường ngoài trời", lang: "vi", why: "không có nội dung xây dựng/nội thất" },
  { q: "cách tính tiền điện bậc thang của hộ gia đình", lang: "vi", why: "không có nội dung hoá đơn điện dân dụng" },
];

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

  // ── LỚP `tool_use` (2026-08-07) — 28,7% kho, KHÔNG vector KHÔNG trigram ─────────────
  //
  // ⚠ LỐI DIỄN ĐẠT KHÁC lớp `prose` bên trên — đọc kỹ trước khi so hai lớp với nhau.
  // `prose` cố ý TRÁNH mọi từ khoá để đo riêng sức của vector. Hai lớp tool thì dùng lối
  // "NHỚ MANG MÁNG": giữ một hai danh từ riêng (tên dự án, tên file, tên lệnh) rồi diễn
  // đạt phần còn lại bằng từ khác — vì đó mới là cách người thật đi tìm lại một lệnh đã
  // chạy. Tránh sạch từ khoá ở lớp không có vector thì recall chắc chắn 0%, và con số đó
  // chỉ xác nhận điều đã biết chứ không giúp quyết định gì. So sánh chéo hai lối paraphrase
  // này là SAI — mỗi lớp chỉ so được với chính nó qua các lần đo.
  { q: "lệnh xem trong thư mục data của crypto_pipeline_binance có gì, liệt kê cả nhánh raw bên dưới", lang: "vi", kind: "tool_use", session: "96666196-7a2d-45a4-a197-f121928864e5", uuid: "d2da825b-3896-4ba0-aafe-ace42278453f" },
  { q: "sửa khối khai báo kiểu nhập vào ở FlowCanvas.tsx, thêm dòng cho Connection và OnSelect", lang: "vi", kind: "tool_use", session: "784a13f4-916f-4b34-a787-16834f66d250", uuid: "97e43c3d-77c8-48f4-9974-d221f19d9d45" },
  { q: "khởi động lại container của music_video_flow rồi chờ vài giây xem trạng thái nó ra sao", lang: "vi", kind: "tool_use", session: "26a80738-40fb-4be9-932c-e3069a3e0e40", uuid: "a57269df-b18f-4daa-9ef2-ed78324f9585" },
  { q: "sửa nhánh tải bản WAV trong suno_dl.py ở thư mục tạm", lang: "vi", kind: "tool_use", session: "40a576bc-fa1f-4686-98ab-dec3434d0a2c", uuid: "f9df5b80-441d-4e72-a8f1-d30b25232e58" },
  { q: "soi thư mục data của OpenRCA bên Ubuntu, đi sâu hai tầng xem có gì", lang: "vi", kind: "tool_use", session: "988fd273-8246-493d-853c-c1ceaeb91fe6", uuid: "8dea2be2-fab6-46f6-8b21-7f15df8a1d89" },
  { q: "dựng trang sơ đồ luồng nạp kho dữ liệu SASIN, vẽ từ nguồn gốc tới các bảng thật", lang: "vi", kind: "tool_use", session: "90977e21-710b-44c2-b799-b8c7b7a0b377", uuid: "0628b87c-15d9-4f3c-8ac3-bdcd59c0c731" },
  { q: "sửa đoạn giải thích về máng lề và đường phân cách của cột chênh lệch trong trang web SasinFlow", lang: "vi", kind: "tool_use", session: "4f1ea683-0a03-41fa-aec2-9252a4300a03", uuid: "fab00b80-441e-461e-a724-c9f70632ec79" },
  { q: "viết một tệp python tạm rồi gọi endpoint query để chạy câu lệnh lên kho INVOICE", lang: "vi", kind: "tool_use", session: "d60b4cb7-1bc9-42a2-bea3-bfc4b6119cd3", uuid: "8d9f11a8-5960-4ec6-9050-7595d75406bc" },
  { q: "chạy trong SasinInfra, trỏ tới tệp todo và tệp bàn giao nằm bên thư mục tạm của phiên", lang: "vi", kind: "tool_use", session: "d158fb77-fce8-43ed-ba9d-50822825eaa1", uuid: "09a651e8-2390-4b06-b8d1-c8aa75a7e19d" },
  { q: "gom nhóm các khoá trong ui.json bằng một đoạn node chạy thẳng trên dòng lệnh", lang: "vi", kind: "tool_use", session: "88015817-4be1-4817-8f05-1d9e34786b4f", uuid: "1329ad32-dc66-4d75-970f-bca9a149b716" },
  { q: "thêm dòng vào MEMORY.md về luật cấm ghi sang project khác", lang: "vi", kind: "tool_use", session: "d541a4d9-efdb-4bef-8b21-6cae1337544b", uuid: "fc759206-b1ae-4c7b-a0d3-00e45fae095f" },
  { q: "giết tiến trình đang chiếm cổng 8756 bên Ubuntu rồi kiểm lại xem cổng đã trống chưa", lang: "vi", kind: "tool_use", session: "ca59b27f-74da-493f-88ce-43f81414a413", uuid: "00a3c17e-b3d1-4755-8dbc-98c1c51dd45f" },
  { q: "chạy lại launcher nq của repo PBI_SasinFlow_Maintain ở bước điền, xem còn sinh rác ở gốc không", lang: "vi", kind: "tool_use", session: "5ccc6d83-f120-4b37-8f6c-086b526c4e43", uuid: "f283b2b6-0b0e-4802-bd02-41731dd23f1d" },
  { q: "dừng hết tiến trình robocopy rồi đếm lại còn sót cái nào không", lang: "vi", kind: "tool_use", session: "7ddd9210-e3a7-42d3-ba10-5e5bcbe34099", uuid: "f9b81a50-20db-46e9-945e-a0e35300cbac" },

  // ── LỚP `tool_result` (2026-08-07) — 28,3% kho, CÓ vector, ăn ~40% công embed ────────
  // Nhãn CHỈ chọn kết quả có NỘI DUNG THẬT. Cố ý bỏ khối văn bản lặp ("Command running in
  // background with ID…" — 3/12 mẫu rút ngẫu nhiên): không ai đi tìm lại một câu boilerplate,
  // nên lấy nó làm đáp án là tự bơm điểm cho lớp này. Chính tỉ lệ boilerplate cao đó là một
  // phần câu hỏi "lớp này có đáng embed không".
  { q: "nội dung tệp dựng ảnh airflow: cài git bằng apt rồi quay về người dùng thường và cài gói theo requirements", lang: "vi", kind: "tool_result", session: "96666196-7a2d-45a4-a197-f121928864e5", uuid: "1a305a34-8a1a-4017-8e72-39215d315164" },
  { q: "đoạn mã đẩy các hàng đầu vào vào danh sách, có nhánh đánh dấu biến đã ngắt kết nối", lang: "vi", kind: "tool_result", session: "e573d701-a79d-4dce-bd50-3a909342a35f", uuid: "2ca8bd26-8ba2-4fe4-9f3d-c92f8d2c6717" },
  { q: "kết quả dò các nơi gọi track-node-states và rerun-track-node, cả bên giao diện lẫn bên máy chủ", lang: "vi", kind: "tool_result", session: "e5c549b7-e9a1-4208-a2b8-83f8fabada1b", uuid: "6c5c3207-fbb2-4345-8a2a-cb5044012205" },
  { q: "tra xem hàm định dạng số được khai ở tầng mô-đun hay khai riêng trong hàm vẽ thống kê đối soát", lang: "vi", kind: "tool_result", session: "4f1ea683-0a03-41fa-aec2-9252a4300a03", uuid: "b99b1c4f-fba7-4ffd-bf6f-61efac6737ce" },
  { q: "kết quả tìm hộp thoại cấu hình nguồn đối soát, chỗ chọn kho và câu lệnh cho từng nguồn", lang: "vi", kind: "tool_result", session: "f3668722-c322-4945-b048-3d1092ef0838", uuid: "71858070-25c2-48d3-be21-fcf84c08effc" },
  { q: "khối thẻ giao diện hiển thị danh sách nguồn hàng đầu, có khoá dịch và ô chờ nạp", lang: "vi", kind: "tool_result", session: "88015817-4be1-4817-8f05-1d9e34786b4f", uuid: "8e719970-fa37-48cb-bd32-53f1585c816d" },
  { q: "bản đếm khoá app đọc được và kích thước ui.json, kèm danh sách còn lại trong hồ sơ người dùng", lang: "vi", kind: "tool_result", session: "381f6d09-1cea-46ab-9474-cd8fab5bd94f", uuid: "31bc78d2-ecfd-4dd7-9062-15b20e5fc3c6" },
  { q: "báo đã tạo xong tệp model_cover.ps1 trong thư mục tạm của phiên bên repo bảo trì Power BI", lang: "vi", kind: "tool_result", session: "ebaa7b66-963a-4edb-9642-7ad757f2574b", uuid: "e34baae5-9c7e-4fa5-8131-7f3cfe95dd98" },

  // ── LỚP `keyword` (2026-08-09) — lối tìm PHỔ BIẾN NHẤT, corpus từng MÙ HOÀN TOÀN ───────
  //
  // ⚠ ĐỌC TRƯỚC KHI SO: lớp này dùng NGUYÊN VĂN từ khoá (tên file, tên hàm, tên gói) — TRÁI
  // HẲN lối "tránh trùng từ khoá" của lớp `prose`. Không phải sơ suất mà là chủ đích: `prose`
  // đo sức của VECTOR khi không có từ nào trùng, còn lớp này đo lane TỪ KHOÁ khi người ta gõ
  // đúng chữ họ nhớ. So chéo hai lớp là vô nghĩa; mỗi lớp chỉ so với chính nó qua các lần đo.
  //
  // Vì sao bắt buộc phải có: đo 2026-08-08 thấy **cả 64 câu cũ đều có lane AND rỗng**, nên
  // không phép đo nào phủ nhóm này — và cổng "không biết" (plan 17 §1.3) có điều kiện ② nói
  // về đúng lane AND đó, tức nó KHÔNG THỂ nghiệm thu bằng corpus cũ. Đây cũng là nhóm duy
  // nhất kiểm được lớp `tool_use` theo lối dùng THẬT (gõ lại mảnh lệnh/đường dẫn đã chạy) —
  // 14 câu `tool_use` kia diễn giải bằng từ khác nên chúng đo một lối dùng có thể không có thật.
  //
  // Cách sinh (lặp lại được): rải mẫu theo bước id cố định trên tin cũ hơn 01/08, MỖI PHIÊN
  // nhiều nhất một câu, chọn 3 token có tần số tài liệu 2–400 rồi giữ lại câu nào lane AND
  // trả 1–60 ứng viên. Bản đầu lấy theo id giảm dần nên 14/14 câu rơi vào ĐÚNG MỘT phiên —
  // corpus như thế đo cái phiên đó, không đo cái kho. Bản này trải 12 phiên/12 project.
  { q: "fetch_history.py window-based fetching", lang: "en", kind: "keyword", session: "9ca1789c-0676-4272-a014-8a7186ec68b0", uuid: "dab0bdb2-e630-4fbb-a19a-292d28b1de4d" },
  { q: "candle airflow.operators.python pythonoperator", lang: "en", kind: "keyword", session: "a34b501b-3c7e-4504-b6ff-484722473c56", uuid: "f0f0a6eb-ad2c-413b-8483-1fab48e40bc1" },
  { q: "pydantic base_provider.py csv_provider.py", lang: "en", kind: "keyword", session: "89c2eef5-a20b-40b3-896c-c099bf3ec675", uuid: "cbeed3ef-11f1-4eaa-b96f-df9b1c9a97f6" },
  { q: "apirouter app.core.config_loader configloader", lang: "en", kind: "keyword", session: "13856ad2-6e33-4e6c-ad38-86e55533e26f", uuid: "88401dd1-3bf1-4da6-9bfa-410867a4ef9d" },
  { q: "handlers openai.py memory_handler.py", lang: "en", kind: "keyword", session: "54a2acbd-15bc-454b-9aa9-ddbab86563f5", uuid: "2d14404c-92d2-480c-96d1-43689cda458a" },
  { q: "langgraph_workspace-langgraph-api langchain langgraph-api", lang: "en", kind: "keyword", session: "11d14bc7-6cde-4c38-8f2a-db8a72ce4c4c", uuid: "065f6a55-8b08-4ae1-99d6-18de44b12636" },
  { q: "markitdown file.pdf output.md", lang: "en", kind: "keyword", session: "d35c5632-e5c3-4548-80fb-65d70985cabb", uuid: "63e68bc8-2f9d-495d-b846-d503443b9e36" },
  { q: "generateimageprompt trackid urlsearchparams", lang: "en", kind: "keyword", session: "38d0af8f-d667-4606-94e2-51a372d300d5", uuid: "c9009fd5-2cef-4232-8e5f-dba9e3d869b8" },
  { q: ".dockerignore progress.md run_dev.bat", lang: "en", kind: "keyword", session: "2e83fb0e-5f7f-4712-968c-b0b32acfab01", uuid: "bc9ed07d-c368-4ded-a616-49e32944dec1" },
  { q: "headroom_memory memory_backend enable_memory", lang: "en", kind: "keyword", session: "98b4d9bf-69b2-476c-8c87-d322cc4d2c26", uuid: "75e522fd-281b-461d-8382-9496c9360c6e" },
  { q: "claude-plugins-official anthropics installlocation", lang: "en", kind: "keyword", session: "a90f54d0-a483-4c3d-8872-f8bac2579e46", uuid: "0059262f-5c6c-498e-9b9e-c8e4788ddbda" },
  { q: "flowstore.ts movenode positions", lang: "en", kind: "keyword", session: "22836668-7408-49ac-998d-c13b0f0a8278", uuid: "d7358bba-f375-4007-a724-221b0691f734" },
];

/** Truy vấn theo lớp — `kind` khuyết nghĩa là `prose` (34 câu viết trước khi phân lớp). */
export function corpusByKind(): Map<QueryKind, LabeledQuery[]> {
  const m = new Map<QueryKind, LabeledQuery[]>();
  for (const q of RECALL_CORPUS) {
    const k = q.kind ?? "prose";
    const list = m.get(k);
    if (list) list.push(q);
    else m.set(k, [q]);
  }
  return m;
}
