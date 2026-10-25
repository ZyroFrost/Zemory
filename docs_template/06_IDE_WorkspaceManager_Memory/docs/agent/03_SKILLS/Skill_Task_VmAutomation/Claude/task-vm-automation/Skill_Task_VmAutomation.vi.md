---
version: 10
lang: vi
---

# task-vm-automation — đưa task lên chạy tự động trên VM

> Skill này là NHÀ của luật task chạy tự động: đầu vào và đầu ra thật, chỉ hệ mới, hai chiều, cổng đầu vào/đầu ra, lưới slot.
> Thiết kế bản chạy trên VM: plan của tổng quản (`docs/plan/22_vm_pipeline_standard.md`). Đồng bộ repo lên VM: skill riêng của
> tổng quản. Chia vai đầu vào giữa phòng và DW (ai chuẩn hoá, ai nạp, ai giữ luật nghiệp vụ): hiến pháp của tổng quản.

## Phạm vi — CHỈ task chạy trên VM ("cái này là chuẩn mới")

| Loại việc | Đầu vào | Kết quả | `data\<task>\` trên máy làm việc |
|---|---|---|---|
| **Task định kỳ chạy trên VM** (có `tasks/<task>/vm_deploy.json`) | SharePoint `DataInput` hoặc DW | SharePoint `DataReport` | `01_raw` + `03_output` = **chỉ `_SharePoint.url`** + `reference/` (máy và VM cùng giữ) · `02_processing` trống (nháp lúc chạy thử) |
| **Case / việc lẻ chạy trên máy** | lấy từ đâu cũng được, như cũ | trên máy, như cũ | đủ 3 chặng `01_raw → 02_processing → 03_output` như trước |

## 🔴 Không luồng giả · không Excel giả

File (Excel hay bất kỳ, trên `DataInput`/`DataReport`) chỉ được có khi là **đầu vào THẬT** — nhận từ ngoài task (hệ nguồn · người/phòng
khác gửi · form DW dựng cho người khác nhập) — hoặc **đầu ra THẬT** — người/phòng khác YÊU CẦU và mở nó. Task **không tự tạo đầu vào
hay đầu ra giả**: không Excel chứa luật không ai gửi (⇒ dữ liệu trong DW, §Hai chiều) · không xuất file chỉ để task khác/chính nó đọc lại · không đẩy
SharePoint "cho có" · không chép số DW ra file rồi nạp ngược. **Trước khi đề xuất/tạo file nào, hỏi:** *"Ai GỬI?"* (vào) · *"Ai YÊU
CẦU và MỞ?"* (ra) — không chỉ ra được một người/phòng cụ thể ngoài task ⇒ không tạo. (Nháp `02_processing` và `reference/` không tính.)

## 🔴 Chỉ dùng hệ mới · không đụng hệ cũ

Mã chạy của task chỉ đọc/ghi: bảng DW · site SharePoint của vùng (`sharepoint_site`) · `<vm_run_dir>\<Repo>\` · khoá `.env` của DW. **Cấm**: mọi mục ở
`legacy_sources` (nguồn, site, thư mục, khoá của hệ cũ) · server nguồn đọc thẳng (việc của DW) · app chạy trên máy làm việc. **Không đụng hệ cũ** (không đọc/ghi/xoá gì ở đó). Thôi dùng thì gỡ —
chỉ gỡ ở hệ mới (repo phòng + lịch VM), thứ ở hệ cũ để nguyên. Thiếu bảng ⇒ nhắn DW dựng, không lách về hệ cũ.

## Hai chiều — mỗi task định kỳ là IN hoặc OUT

**Phép thử:** *"Task này đưa số VÀO kho hay lấy số RA khỏi kho?"* Khai ở khối đầu `spec.md`: `direction: in` hoặc `direction: out`.
**Một task một chiều** — việc có cả hai thì tách hai task.

| | `direction: in` | `direction: out` |
|---|---|---|
| Làm gì | văn bản phòng soạn → chuẩn hoá → `DataInput` → DW nạp | đọc DW → giao file/mail |
| Đọc từ | file người nộp (SharePoint `DataInput/<PHÒNG>/<Việc>/`) | **bảng DW** (ưu tiên bảng gom/view dựng sẵn, vd `Agg_SaleDaily`) — không nguồn hệ cũ (`IPOS_Stage`, Fast…), không app nội bộ, không tự cộng lại số DW đã gom; thiếu bảng/cột ⇒ đặt DW dựng |
| Khai | `input_url` | `output_url` (`DataReport/<PHÒNG>/<Việc>/`) · không `input_url` nếu số gốc toàn từ hệ thống |
| Cổng | **`INPUT_CHECK`** trước mọi chặng ghi (§1 mục 6) | **`OUTPUT_CHECK`** trước khi giao (§1 mục 7) |
| File tham chiếu | `data/<Task>/01_raw/reference/` | `data/<Task>/03_output/reference/` |

- **MỘT BÁO CÁO MỘT NƠI LÀM**: phòng sở hữu nghiệp vụ của con số làm bản giao; phòng khác cần thì **dùng lại đúng file/link đó**, không dựng lại.
  Vd GC (doanh thu · lượt khách theo ngày × nhà): ABC làm, XYZ gửi file ABC làm ra.
- **Luật nghiệp vụ trong bản giao** (bậc VAT của doanh thu, cách đếm GC…): phòng quyết, DW áp trong bảng/view — không viết cứng trong SQL của task. **Excel chỉ có khi có người gửi**: luật không ai gửi ⇒ DỮ LIỆU trong DW đúng 5 loại bảng của hiến pháp DW (cột trên dim chủ · `Bridge_*` có hiệu lực theo ngày · `_Config`), không tiền tố tự chế, phòng nhắn DW đổi — KHÔNG tạo file mới để chứa luật; code phòng đọc luật từ DW, không chép số lại.

## Case vs task VM

- Case giao kết quả cho NGƯỜI KHÁC xem ⇒ nên đẩy bản cuối lên `DataReport/<PHÒNG>/…` của phòng (người nhận mở một chỗ); bản làm việc vẫn ở máy.
- Case **chuyển thành định kỳ** và lên VM ⇒ lúc đó mới áp chuẩn này: đầu vào nộp lên `DataInput`, khai `input_url` / `output_url`,
  chạy `move_outputs_to_vm.py`, trên máy chỉ còn shortcut.
- **`input_url` = số gốc nằm ở đâu, ai nộp — KHÔNG phải task đọc từ đâu**.
  Số gốc là file người nộp ⇒ khai `input_url` trỏ thư mục gốc trên SharePoint, **kể cả khi task đọc bảng DW** nạp từ file đó
  (vd XYZ `ABC_Daily_StoreInventoryReport` đọc `Fact_InventoryDaily`, số gốc = form kiểm kê nhà hàng). Số từ hệ thống (POS · Fast · CRM)
  ⇒ không `input_url`, `01_raw` TRỐNG. Cả hai ⇒ liệt kê đủ thư mục file gốc (` | `). `make_output_links.py` chỉ bắt buộc `output_url`.
- **Nhật ký chạy (`task_run.py`) vào DB của repo giữ dữ liệu mà repo đang chạy dùng:** repo `dept` → DW (`WAREHOUSE_CONN`), repo
  `app` → repo `app-data` (`APPDATA_CONN`, khai ở `uses.app-data` của marker), repo dữ liệu → DB của chính nó; một bản `task_run.py`
  cho mọi repo, không chép tay biến thể. Repo dữ liệu đặt khoá tên khác ⇒ khai trong `.env` của nó `RUNLOG_CONN_KEY=<TÊN KHOÁ>`
  (`task_run` đọc khoá đó trước khoá mặc định; trên VM chỉ `.env` đi theo nên khai ở đây, không ở marker) — và đưa cả hai khoá vào
  `.env` của `vm_deploy.json`.
- **Kiểm `reference/` trên VM:** `python scripts\move_outputs_to_vm.py --reference` liệt kê file `reference/` máy có mà VM thiếu hoặc
  khác nội dung, mã thoát 1 khi có (không đăng nhập SharePoint); kèm `--apply` thì chép bù file thiếu, file khác nội dung không ghi đè.
- **File tham chiếu** code/test cần để dựng lại đúng bản giao (mẫu người khác gửi · bản mốc nghiệm thu) — không phải đầu vào của lượt chạy ⇒ xếp theo CHIỀU (05/10): mẫu/mốc của **ĐẦU RA** (khuôn người nhận gửi · bản kế toán để so số bản giao) ⇒ `data/<Task>/03_output/reference/`; mẫu/mốc của **ĐẦU VÀO** ⇒ `data/<Task>/01_raw/reference/`. Cả hai: **máy và VM cùng giữ** — VM là bản sao lưu của máy; `reference/` chỉ chứa file lần đầu để dựng lại, không phình theo kỳ như `03_output`/`02_processing`. `move_outputs_to_vm.py` CHÉP `reference/` lên đúng đường đó trên VM (so SHA-256), KHÔNG gỡ bản máy; `make_output_links.py` không tính `reference/` là `EXTRA`. KHÔNG lên SharePoint, không `input_url`. Lỡ đẩy lên `DataInput` ⇒ kéo về `reference/` rồi gỡ bản ở `DataInput`.
- **Task chỉ GỬI LẠI file phòng khác làm** (MỘT BÁO CÁO MỘT NƠI LÀM — vd XYZ gửi mail đúng file GC do ABC làm): `output_url` = thư mục `DataReport/<PHÒNG LÀM FILE>/…` (nơi file thật nằm, không phải thư mục của mình) · `delivers_to: mail` · task KHÔNG tạo bản thứ hai, KHÔNG đẩy gì vào thư mục phòng khác. `move_outputs_to_vm.py` tự nhận ca này (`delivers_to: mail` hoặc `output_url` ngoài thư mục phòng mình) ⇒ `03_output` sót chỉ lên VM, không SharePoint.
- 🔴 **Đầu vào chỉ nộp ở SharePoint `DataInput`** — KHÔNG thả file vào `01_raw` (máy hay VM) rồi mong task đọc. `01_raw` không phải
  nguồn: lịch sử "lượt nào đọc số nào" = lịch sử phiên bản của file trên SharePoint.

## 0. Hình dung trước khi làm

```
máy làm việc  ──Syncthing──▶  VM  <vm_work_dir>\<Repo>\      CHỞ — không task nào chạy ở đây
                                   <vm_run_dir>\<Repo>\     CHẠY — cùng tên, cùng đường tương đối, CHỈ file task khai
  vm_deploy.ps1 (task \DW_Automation_Deploy, 5 phút): đọc tasks/<Task>/vm_deploy.json → chép · kiểm · thay bản chạy
                                                      → ĐĂNG KÝ lịch Task Scheduler theo khoá "schedule"
  mỗi lượt chạy: scripts\task_run.py bọc launcher → log data\logs\<task>.log + MỘT dòng vào DW dbo.Log_JobRun
```

| Thứ | Nằm ở | Ai xem |
|---|---|---|
| File người dùng nộp vào (đầu vào) | SharePoint `DataLake/DataInput/<PHÒNG>/…` | task đọc thẳng |
| Kết quả cuối (deliverable) | SharePoint (`sharepoint_site` trong giá trị vùng)`/<PHÒNG>/…` — task tự đẩy (PUT ghi đè, giữ phiên bản) | người nhận mở ở đó |
| Dữ liệu làm việc của task (log · trạng thái · bản chép kết quả) | VM `<vm_run_dir>\<Repo>\data\<Task>\…` | sao lưu VM; tra khi cần |
| `data\<Task>\01_raw` · `03_output` trên máy làm việc | **ĐÚNG 1 file mỗi thư mục: `_SharePoint.url`** (cộng `reference/` nếu có — VM giữ bản sao) — `01_raw` trỏ `DataInput`, `03_output` trỏ `DataReport`; `02_processing` trống. Cổng: `zemory conform` › `vm-task-local-data` | bấm shortcut ra nguồn / kết quả thật |

🔴 **"Mỗi kỳ 1 file" là chuyện của SHAREPOINT, không phải của máy.** Task đẩy mỗi lượt 1 file lên `DataReport` (vd XYZ NQ: `NQ T9-2026.xlsx`,
`NQ T10-2026.xlsx` … nằm cạnh nhau) hoặc ghi đè 1 file (vd XYZ `ABC_SummaryInventoryResult.xlsx`, lịch sử ở phiên bản SharePoint). Còn
`03_output` trên máy chỉ là CỬA SỔ nhìn sang đó: một shortcut, hết. File chạy THỬ tại máy ghi vào `02_processing\` (hoặc xoá ngay sau khi
xem) — không để lại trong `03_output`.

**KHÔNG đồng bộ `data\` theo chiều nào**. Task cần số kỳ trước ⇒ đọc lại từ SharePoint `DataReport` (chính nó đã đẩy lên), không trông vào ổ đĩa.

## 1. Điều kiện của code (sửa trước khi lên VM)

1. **Đường dẫn tương đối** từ vị trí file (`Path(__file__).resolve().parents[…]`) — không viết cứng `D:\<user>\…`. Repo DW = thư mục anh em repo quản lý vùng (bản chạy DW trên VM có `.env` · `config\mail\` · `form_lib`…).
2. **Đầu vào** đọc từ SharePoint `DataInput` hoặc DW — không đọc file trên máy làm việc, không app chạy trên máy làm việc (VM không có), không bản chép máy local.
3. **Đầu ra**: ghi `data\<Task>\03_output\` rồi đẩy lên `DataReport/<PHÒNG>/<Việc>/…`. Ngay sau mỗi lần đẩy, **in một dòng `OUTPUT_URL: <webUrl>`** — `task_run.py` gom dòng đó vào sổ chạy.
4. **Mail**: người gửi + người nhận lấy từ mail vault của repo DW (`config/mail/mail_vault.json` — `senders[]` · `groups[]`), không viết địa chỉ vào code. Chưa có nhóm ⇒ nhắn phiên DW thêm, code DỪNG với lỗi rõ, không đoán địa chỉ.
   🔴 **Mail gửi NHÀ HÀNG chỉ tới hộp thư nhà hàng, KHÔNG CC ai** (vụ 45 mail CC nhầm phải thu hồi bằng Purview). Mặc định của mọi lệnh gửi: CHỈ gửi người chạy thử; gửi thật cần cờ riêng (`--send-real` / `live` / `--send`).
5. **Mã thoát**: 0 = xanh, khác 0 = đỏ. Lỗi giữa chừng không được nuốt im.
6. **Cổng đầu vào** (task có `input_url`): chặng kiểm đầu vào chạy TRƯỚC mọi chặng ghi, in
   `INPUT_CHECK: OK|NONE|INVALID · <file> · <chi tiết>` cho mỗi đầu vào (`task_run.py` gom vào `Log_JobRun`); `INVALID` ⇒ thoát ≠ 0,
   không ghi gì. Dùng lại hàm đọc của chặng xử lý; chạy được với `--doc <file>` để agent kiểm file TRƯỚC khi nộp lên `DataInput`.
   Thử đỏ đủ 4 tầng (thiếu file · file hỏng · sai khuôn/tên · số không khớp) trước khi gọi là xong. Mẫu: `repo phòng ban` `00_check_input.py`.
7. **Cổng đầu ra** (task `direction: out`): kiểm TRƯỚC khi giao (đẩy `DataReport` / gửi mail) — kỳ đã đủ
   (đủ ngày · đủ nhà) và **tổng file = tổng bảng DW cùng kỳ**. In MỘT dòng `OUTPUT_CHECK: OK|INVALID · <file> · <chi tiết>`
   (`task_run.py` gom vào `Log_JobRun` như `INPUT_CHECK`; tra `Message LIKE N'%OUTPUT_CHECK: INVALID%'`); `INVALID` ⇒ không giao, thoát ≠ 0.
   Thử đỏ ít nhất 2 ca (kỳ thiếu ngày/nhà · tổng lệch DW) trước khi gọi là xong.
8. **Kỳ đích = kỳ LIỀN SAU kỳ đã giao trên `DataReport`**, KHÔNG theo "kỳ trước hôm nay" (XYZ đo 07/10). Kỳ đó chưa đóng ⇒ thoát 0,
   không làm gì. Tính theo hôm nay thì kỳ trễ data bị nhảy cóc (weekly còn đánh số tuần sau cho dữ liệu tuần trễ).
   Mẫu: `repo phòng ban` `run_weekly.next_week_after` · `run_nq.next_month_after_delivered`.
9. **Tới hạn mà chưa đủ data ⇒ tự dò lại mỗi 3 giờ, qua nhiều ngày tới khi đủ** (*"tới ngày, nếu chưa có data, thì cứ
   check lại tự động sau mỗi 3 tiếng cho tới khi nào đủ data"*). Khớp `vm_deploy` (một giờ mỗi lịch): MỘT lịch `daily`, launcher thật
   truyền `--retry-hours 3`; trong lượt chạy, cổng đầu vào/sẵn sàng đỏ ⇒ ngủ 3 giờ rồi dò lại, tới ~23,5 giờ (trước lượt bắn hôm sau).
   **Chỉ lặp ở CỔNG** — stage sau cổng lỗi thì dừng ngay (lặp ở đó là gửi đôi / che lỗi). Không đẻ task `_Retry` theo giờ.
   `ExecutionTimeLimit` ≥ 24 giờ (mặc định `schtasks` 72 giờ là đủ). Lượt chưa đủ data thoát ≠ 0 ⇒ `Log_JobRun` đỏ 0–3 lần mỗi kỳ là
   CỔNG CHẶN ĐÚNG, không phải task hỏng.
10. **Dấu "đã gửi" TRƯỚC khi upload**: gửi mail thật xong ghi `data/<Task>/02_processing/_sent_<kỳ>.txt`, rồi mới đẩy `DataReport`;
    lượt sau thấy dấu ⇒ dừng (upload lỗi thì báo đẩy tay, KHÔNG gửi lại). Không có dấu thì upload lỗi = lượt 3 giờ sau gửi mail LẦN HAI.
11. **Mail báo lỗi cho người vận hành** (*"gửi mail cho t nếu task fail và thiếu dữ liệu"*): chỉ ở lượt THẬT đọc DW — lượt chạy bằng dữ liệu mẫu/test **KHÔNG gửi** (07/10 một lượt thử của XYZ gửi
    mail y như thật, người dùng tưởng task tự chạy sai ngày); chỉ tới người vận hành của task (người gửi của phòng trong `mail_vault.json`),
    KHÔNG Cc — đây là báo cho người chạy, không phải mail báo cáo. Gửi khi: (a) stage nào thoát ≠ 0 · `OUTPUT_CHECK` đỏ · upload lỗi
    sau khi đã gửi · crash; (b) thiếu data — MỘT mail mỗi lượt bắn trong ngày (sau khi đã dò hết các lượt 3 giờ), KHÔNG mail mỗi 3 giờ.
    Hàm gửi **không bao giờ được raise** (mail lỗi không được che mã thoát của task).
    **Bố cục mail** (*"cái này dc hơn"*; bản đổ log thô bị bác: *"báo cáo đơn giản ngắn gọn thôi, làm dạng
    bảng dễ nhìn"*): tiêu đề `[<PHÒNG> task] <task>: <kết quả>`; thân là MỘT bảng hai cột, mỗi dòng một thông tin — **Task** · **Lúc**
    (giờ dd/mm/yyyy · tên máy) · **Kết quả** · **Chưa đạt** (mỗi mục kiểm đỏ một dòng, bỏ ký hiệu console `❌`/`→`) · **Log cuối** (CHỈ
    khi lỗi không phải ở cổng, ≤ 12 dòng, khung tự xuống dòng) · **Bước kế** · **Log** (đường log trên máy chạy). Không đổ log thô.
    Mẫu: `repo phòng ban` `scripts/dw_access.alert` (commit `dd07cc7`; thử đỏ 07/10: cổng thiếu 1 ngày ⇒ 1 mail tới người vận hành, 0 file dựng, thoát 1).

## 2. Khai ở repo phòng (3 chỗ)

**a) `tasks/<Task>/spec.md` — khối đầu:** **`direction: in|out`** (§Hai chiều) · `cadence` (Daily/Weekly/Monthly) · `run_at` · **`input_url:`** = link THƯ MỤC chứa file GỐC người nộp trên SharePoint, kể cả khi task đọc bảng DW nạp từ file đó (bỏ trống chỉ khi số gốc toàn từ hệ thống) · **`output_url:`** = link THƯ MỤC kết quả trên SharePoint (nhiều đích: ngăn bằng ` | `). Vd
`output_url: <sharepoint_site>/DataReport/ABC/InventoryResult`

**b) `bin/<Task>.cmd`** — launcher: đường tương đối `%~dp0..\tasks\<Task>\pipeline`, `set PYTHONUTF8=1`, trả `exit /b %errorlevel%`.

**c) `tasks/<Task>/vm_deploy.json`** — manifest:
```json
{
  "files": ["bin/<Task>.cmd", "scripts/task_run.py", "tasks/<Task>/pipeline/common.py", "tasks/<Task>/pipeline/run.py"],
  "needs": ["../repo quản lý vùng/.env", "../repo quản lý vùng/config/mail/mail_vault.json", "../repo quản lý vùng/config/mail/mail.env"],
  "schedule": [
    {"task": "<Task>", "launcher": "bin/<Task>.cmd", "args": "live", "daily": "13:00"}
  ]
}
```
- `files`: ĐỦ mọi file task cần lúc chạy (code · launcher · `scripts/task_run.py` · cấu hình) — thiếu một file là VM chạy hỏng. Không khai `data\`, `docs\`, bí mật của repo khác. File đuôi `*.local.*` KHÔNG bao giờ lên VM (`.stignore`) — đừng khai.
- `needs`: file của repo KHÁC phải có sẵn ở bản chạy (thường là của DW).
- `schedule`: tên task = tên thư mục task (lượt phụ thêm hậu tố `_Night` / `_Close`…). Một trong `"daily": "HH:MM"` · `"weekly": {"day": "MON", "at": "HH:MM"}` · `"monthly": {"day": 1, "at": "HH:MM"}` · `"ondemand": true` (07/10: không trigger, chạy khi bấm — mẫu `repo quản lý vùng/tasks/DW_OnDemand_RunModels`).
- `files` nhận mẫu `*` / `?` (07/10, vd `"models/*.sql"`) — giải trong repo nguồn mỗi vòng. Gỡ một mục `schedule` ⇒ `vm_deploy` ghi `ORPHAN` + TẮT task đó (không xoá; xoá do người dùng).
- 🔴 **LƯỚI SLOT 30 PHÚT** (*"mọi task từ mọi phòng ban sẽ trải dài từ 12h đêm tới hết ngày, cứ cách nhau 30p … bỏ task vào theo slot"*): giờ chạy chỉ được `HH:00` hoặc `HH:30`, mỗi task MỘT slot, không chồng task của phòng khác. Trùng = cùng giờ, trừ hai lịch tuần khác thứ hoặc hai lịch tháng khác ngày (lịch ngày giữ slot mọi ngày). **Ngoại lệ cùng chuỗi việc** (*"lịch ko nhất thiết cấm trùng lịch, XYZ với ABC 2 mail nhưng chung loại job vẫn gửi chung dc"*): các lịch khai CÙNG `"slot_group": "<tên chuỗi>"` được chung slot (vd `store_inventory` = đợt cứu DW + mail ABC + XYZ lúc 01:00/13:00); khác nhóm hoặc không khai nhóm thì vẫn tính trùng. Máy canh: `vm_deploy` không đăng ký lịch mới/vừa đổi lệch lưới hoặc trùng slot, ghi `!! SLOT … not registered` vào `vm_deploy.log` ⇒ chọn slot khác. **THỨ TỰ ƯU TIÊN SLOT** (*"ưu tiên lịch ABC XYZ inventory trước, rồi mới tới XYZ và mấy lịch sau"*): ① task gắn GIỜ CHỐT nghiệp vụ trong ngày — chuỗi tồnkho (ABC night 01:00 · ABC close 13:00 · XYZ 13:30, ngay sau lượt cứu 01:00/13:00 của DW) · ② task hằng ngày khác · ③ báo cáo tuần · ④ tháng / quý. Mỗi phòng TỰ ĐỌC bảng slot và TỰ ĐIỀN vào slot trống (*"kể cả việc schedule, mỗi phòng ban tự đọc tự điền vào slot trống"*) — không xin DW. Muốn slot của task ưu tiên THẤP hơn ⇒ nhắn thẳng phiên của repo đó, repo ưu tiên thấp tự dời (vd XYZ Weekly thứ Sáu 01:00 → 02:30 để nhường ABC night). KHÔNG bao giờ đẩy task ưu tiên cao hơn. Task đọc số tồnkho của lượt cứu ⇒ đặt CÙNG slot cứu hoặc sau, và chờ `_Config.INVENTORY_RescueDoneAt` mới hơn giờ slot rồi mới đọc (cổng đầu vào §1 mục 6).
**Chọn slot TRƯỚC khi khai:** `python <repo tổng quản vùng>\scripts\vm_schedule.py` (bảng slot đang dùng của mọi repo · trùng · lệch lưới · giờ trống, đọc thẳng mọi `vm_deploy.json` — không cần SSH) rồi `… --check daily 13:30` (hoặc `weekly FRI 02:30` · `monthly 1 02:00`) phải ra `TRỐNG`. Bản in sẵn do script sinh nằm ở tổng quản. Task hệ cũ không tính (không đụng, sẽ cắt). Luật cũ "né phút :01/:31" BỎ — task hệ cũ `\Inventory day` đã xoá 07/10.
- Lệnh thật được dựng sẵn: `python scripts\task_run.py --task <Task> -- bin\<Task>.cmd <args> >> data\logs\<Task>.log`.
  Log trên VM luôn tên `data\logs\<tên task>.log` (task đăng ký tay trước chuẩn có thể còn file log tên khác, vd `…_close.log` —
  từ lượt bọc `task_run` trở đi log nằm ở tên mới).
- Task đã đăng ký TAY trước chuẩn (cùng tên): khai `schedule` cùng tên là `vm_deploy` dựng lại theo manifest — một nguồn, không giữ
  hai bản. Task tay đang BẬT thì giữ bật; muốn tắt ⇒ phòng tự tắt (`Disable-ScheduledTask` qua ssh) sau lời người dùng trong phiên phòng.

## 3. Chạy thử TRƯỚC khi lên

1. Chạy launcher tại máy ở chế độ thử (mail chỉ tới chính người dùng). Đọc log: không Traceback, mã thoát 0. Muốn thử cả lớp bọc thì
   `python scripts\task_run.py --task <Task> --no-log -- bin\<Task>.cmd <args thử>` — **`--no-log` bắt buộc khi thử**: không có nó,
   lượt thử ghi một dòng vào `Log_JobRun` THẬT dưới đúng tên task thật (sổ chặn xoá — dòng thử nằm đó mãi).
   Thử với output đổ RA FILE (`… > thu.log`), không chỉ ra màn hình: task in tiếng Việt mà stdout là file là ca hay vỡ bảng mã
   (lượt thử XYZ 04/10 bắt được — `task_run` nay ép UTF-8; file log đọc bằng UTF-8).
2. **In danh sách To/CC của TỪNG mail** và đối chiếu với điều người dùng đã chốt. Không khớp ⇒ dừng.
3. `python scripts\make_output_links.py` (từ gốc repo) ⇒ `data\<Task>\03_output\_SharePoint.url` mở đúng thư mục. Script báo `EXTRA`
   nếu `03_output` còn file khác ngoài shortcut — **dọn khi chuyển task lên VM = CHUYỂN, không xoá** (*"dọn là đẩy lên VM nha,
   ko xóa"* · *"đẩy VM lẫn đẩy lên SP"*): `python scripts\move_outputs_to_vm.py` (chạy khô) → `--apply`. Mỗi file: SharePoint (ĐÚNG thư mục
   `output_url` — file sót là bản giao chính thức nằm nhầm chỗ, không phải lưu trữ; KHÔNG có `_Archive/` — ; trùng tên khác
   nội dung ⇒ KHÔNG ghi đè, báo `CONFLICT`, giữ bản máy chờ người dùng) + VM (`<vm_run_dir>\<Repo>\data\<Task>\03_output\`; trùng tên khác nội dung ⇒ `__local`),
   cả hai kiểm khớp mới gỡ bản ở máy. Excel so theo giá trị ô (SharePoint tự sửa file Office khi nhận). Task `delivers_to: mail` hoặc
   `output_url` ở thư mục phòng khác ⇒ bỏ bước SharePoint, chỉ VM. `reference/` ⇒ chép lên VM, giữ bản máy (mục File tham chiếu).
4. Commit repo phòng (pathspec, chỉ file của task).

## 4. Lên VM — tự động

1. Syncthing chở sang `<vm_work_dir>\<Repo>` (vài chục giây). Repo chưa có folder Syncthing ⇒ báo người dùng (người quản trị máy chủ tự thêm folder).
2. Trong ≤ 5 phút `vm_deploy` chép sang `<vm_run_dir>\<Repo>` và đăng ký lịch. Task MỚI được tạo ở trạng thái **TẮT**.
3. 🔴 **PHÒNG TỰ LÀM, KHÔNG NHẮN DW** (*"luật là task phòng nào phòng đó quản"* — bản cũ bắt "nhắn phiên kho … kho bật task" là chỗ lủng): phiên của CHÍNH phòng (a) đọc `<vm_run_dir>\repo quản lý vùng\data\logs\vm_deploy.log` (dòng `REGISTERED` / `!! SLOT` / `VALIDATION FAILED` của task mình) · (b) chạy thử MỘT lượt trên VM ở chế độ thử (mail chỉ tới người vận hành) · (c) đưa người dùng xem kết quả / mail thử ngay trong phiên phòng · (d) người dùng gật ⇒ phòng tự `Enable-ScheduledTask -TaskName <Task>` qua `ssh <vm_ssh_alias>` (cờ `.allow-outside` một lần của repo phòng, tạo sau lời người dùng) rồi đo `State = Ready` + `NextRunTime`. Tắt / gỡ lịch tay cũ trên máy làm việc cũng do phòng. Task đã bật thì sửa lịch/lệnh sau đó vẫn giữ trạng thái bật. **Ranh giới (*"kho chỉ quản việc bổ sung bảng cột mới theo yêu cầu nghiệp vụ, chứ gì cũng nhắn kho rồi sao làm hết"*): nhắn DW CHỈ khi task cần BẢNG / CỘT DW chưa có.** Chạy thử · bật/tắt · chọn slot (`vm_schedule.py --check`) · dời lịch · nhường slot (nhắn thẳng phiên phòng giữ slot) · đọc `vm_deploy.log` · lỗi của task mình ⇒ phòng tự làm, không qua DW.
4. Lượt thật đầu tiên: đọc `dbo.Log_JobRun` (JobName = tên task, StepName `(Task Scheduler outcome)`) — `StatusText` OK, `Message` có `OUTPUT_URL:` + `INPUT_CHECK: OK` (task in) hoặc `OUTPUT_CHECK: OK` (task out).

## 5. Kiểm & tra cứu

```sql
SELECT TOP 20 JobName, RunAt, DurationSeconds, StatusText, Message
FROM <warehouse_db>.dbo.Log_JobRun WHERE StepName = N'(Task Scheduler outcome)' ORDER BY RunAt DESC;
```
Log đầy đủ một lượt: VM `<vm_run_dir>\<Repo>\data\logs\<Task>.log` · log deploy: `<vm_run_dir>\repo quản lý vùng\data\logs\vm_deploy.log`.

## Đừng làm
- Đừng đăng ký task tay bằng `schtasks` — khai `schedule` trong manifest (một nguồn, deploy tự dựng lại khi đổi).
- Đừng cho task đọc/ghi `<vm_work_dir>\…` — chỉ `<vm_run_dir>\…`.
- Đừng đồng bộ `data\`, đừng trỏ `03_output` vào thư mục OneDrive của SharePoint (chạy thử tại máy sẽ thành bản phát hành).
- Đừng gửi thật lần đầu khi chưa in To/CC và chưa có lời người dùng.
- 🔴 Đừng đề xuất TẠO Excel/sheet mới (`<PHÒNG>_<Luật>.xlsx` trên `DataInput`) để chứa một luật/ngưỡng/bảng mã mà không ai gửi
  (*"excel người ta gửi mới có, còn ko gửi thì nó đã nạp từ DW, tạo excel để làm gì??"*). Phép thử: *"Luật này có file
  người ta gửi không?"* — có ⇒ sheet trên `DataInput` (§Hai chiều) · không ⇒ nhắn phiên DW giữ luật thành dữ liệu DW — cột dim chủ · `Bridge_*` · `_Config` (5b; KHÔNG tự đặt tiền tố mới kiểu `Rule_`).
  Rộng hơn: không đầu vào/đầu ra giả nào (§1a, mục đầu skill).
- Đừng chép một ngưỡng/luật DW đang giữ vào code phòng (vd `LOOKBACK_DAYS = 184`) — đọc từ DW (§Hai chiều).
- Đừng tính kỳ đích theo ngày hôm nay (§1 mục 8) · đừng lặp lại stage SAU cổng khi dò lại (§1 mục 9) · đừng mail cảnh báo mỗi lượt dò
  3 giờ (§1 mục 11) · đừng đẩy `DataReport` trước khi ghi dấu "đã gửi" (§1 mục 10).
