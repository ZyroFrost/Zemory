# <PROJECT>

> ⛔ **Mở repo này để LÀM VIỆC, hay chỉ để THAM KHẢO?** Repo đang làm không phải repo này ⇒ CHỈ ĐỌC: không sửa / tạo /
> xoá file ở đây; không chạy lệnh `zemory` với cwd ở đây (lệnh ghi như `init` · `sync` · `reindex` · `archive` ·
> `memory scan` · `hook` ghi vào repo này và kho nhớ). Repo này có thể đang có phiên agent khác làm việc. Muốn tham khảo
> ⇒ đọc rồi áp vào repo của mình. Thật sự cần ghi vào đây ⇒ hỏi trước.

Repo này dùng harness của zemory, hệ **<STRUC_LABEL>**<STRUC_INTRO>. Luật · cấu trúc · quy trình nằm trong `docs/agent/`,
mỗi luật và mỗi slot một folder; file này chỉ chỉ đường.

## Vào việc
1. **Chưa có `docs/.harness.json`?** ⇒ hỏi trước: dự án là APP hay NON-APP (không tự đoán<STRUC_ASK>). <STRUC_LABEL> ⇒
   <STRUC_KITS>;
   rồi `zemory doctor` xanh. Thiếu lệnh `zemory` ⇒ cài bằng một lệnh PowerShell:
   `irm <ZEMORY_RAW>/backend/scripts/install.ps1 | iex` (đặt `$env:ZEMORY_DIR` trước — hỏi nếu chưa rõ thư mục cài; kho
   nhớ không nằm trong thư mục cài). Tab Code của Claude Desktop không đọc PowerShell profile ⇒ cài xong mở lại app.
   - Init xong ⇒ liệt kê một lần mọi luật `docs/agent/01_RULES/Rule_*/` (tên đầy đủ) và hỏi giữ · sửa · bỏ. Bỏ một luật
     = thêm `retired: true` vào đầu `RULE.md`, giữ folder và số (`Rule_Gate_10_ConfirmDelete`). Chưa trả lời ⇒ giữ mặc định.
2. **Luật tự đến, không phải đọc trước** — mỗi loại một đường:
   - `Core` và `Keys` (luật phán đoán) cùng Mục đích của repo được chèn nguyên văn lúc mở phiên và sau mỗi lần nén;
   - `Keys` còn nhắc lại một dòng khi câu gõ trúng từ khoá của luật đó;
   - `Gate` chặn đúng lúc định làm sai — câu chặn mang tên đầy đủ và nguyên văn luật.
3. **Đọc `docs/agent/05_TODO.md`** trước khi làm.
4. **Tra khi cần, không đọc hết:** luật `docs/agent/01_RULES/Rule_<Gate·Keys·Core>_<NN>_<Tên>/RULE.md` · hiến pháp `docs/agent/02_CONSTITUTION/`
   · cấu trúc `docs/agent/03_STRUCTURE/` (`INDEX.md`: <STRUC_INDEX_ROLE>; slot ở `Struc_Slot/`) · lịch sử
   `zemory changelog search` (phủ cả `docs/agent/archive/`) · thiết kế `zemory plan search "<vùng>"` trước khi đề xuất hay
   đổi thiết kế một vùng. Không thấy một việc trong `05_TODO`/`06_CHANGES` không có nghĩa là chưa từng có — tra archive
   trước khi kết luận.
5. Luật chung (`01_RULES/`) là sàn cho mọi repo; hiến pháp (`02_CONSTITUTION/`) của repo chỉ siết thêm, không nới.

## Mở khi trúng trigger — chưa trúng thì không mở
Mở một skill = đọc nguyên file đó. Host tự nạp skill theo `description`; bảng này là đường dự phòng.

| Mở khi | Đọc |
|---|---|
| <STRUC_TRIGGER> | `docs/agent/03_STRUCTURE/INDEX.md` + slot liên quan |
| hỏi repo có quy trình gì · thêm/bớt skill | `docs/agent/04_SKILLS/INDEX.md` |
<SKILL_TRIGGERS>
