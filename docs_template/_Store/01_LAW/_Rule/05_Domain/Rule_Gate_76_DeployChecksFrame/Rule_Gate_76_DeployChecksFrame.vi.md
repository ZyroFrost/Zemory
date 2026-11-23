---
version: 2
lang: vi
---
# Rule_Gate_76_DeployChecksFrame — An app of a family deploys only through the frame's shared checks

## Luật là gì
App mang khung chung của họ (ghim một bản khung ở `frontend/config/shell.json`) chỉ được đẩy bản build qua bộ kiểm trình duyệt
có nạp luật chung của khung: `RULES` · `PROBES` · `DIALOG_RULES` của `scripts/sneat_glass_check.mjs`, cộng `RULES` của
`scripts/report_layout_check.mjs` khi app có trang báo cáo (`data-rp-page`). Không công tắc nào của lệnh deploy được bỏ bộ kiểm.
Bản khung ghim không bao giờ thấp hơn mức sàn của họ; thấp hơn bản mới nhất chỉ cảnh báo, không chặn.

## Khi nào áp
- Chạy script deploy của một app có ghim bản khung (`deploy*.ps1` · `deploy*.sh`), trừ lần kiểm khô hoặc quay lại bản cũ.

## Phải làm gì
1. Lệnh deploy chạy bộ kiểm trình duyệt trước khi đẩy, hoặc ngay sau khi cài và báo deploy hỏng khi đỏ (skill app-shell-use §6):
   mọi trang, ở một độ rộng máy bàn và một độ rộng điện thoại, cả hai theme. Đỏ hoặc không kiểm được ⇒ không đẩy gì.
2. Bộ kiểm đó import các tên chung, hoặc giao file luật chung cho bộ chạy chung của họ (`live-app.mjs` của repo quản hệ); bộ chạy
   này nạp đủ ba tên. App có trang báo cáo thì nạp thêm luật báo cáo.
3. Không thêm công tắc bỏ bộ kiểm (`-SkipLive`, `-NoCheck` …), và không chạy deploy kèm công tắc đó.
4. Bản ghim giữ bằng hoặc cao hơn `floor` trong `shell_floor.json` cạnh luật này. Repo quản hệ nâng mức sàn khi một bản khung sửa
   lỗi nặng, và ghi bản mới nhất vào đó mỗi khi phát một bản (skill app-shell).

## Ví dụ
- Tình huống: script deploy của một app báo cáo chạy unit test và build rồi đẩy luôn.
- ✗ Sai: deploy như vậy; các trang chưa từng được soi theo luật của khung, một thanh trang lệch cỡ lên server.
- ✓ Đúng: lệnh deploy chạy `scripts/sneat_check.mjs` trên bản mock đã build; file này import `RULES`, `PROBES`, `DIALOG_RULES`
  và `RULES` của luật báo cáo; chỉ lượt xanh mới được đẩy.

## Máy kiểm
- Hook chặn lần chạy script deploy trong repo có `frontend/config/shell.json` khi: những gì script chạy (file `.mjs` và `.py`
  nó nêu tên, script `npm run`, và những gì các file đó chạy hay import, xuống ba tầng; chú thích không tính) không nạp các tên
  chung · app có `data-rp-page` mà không nạp luật báo cáo · lệnh kèm công tắc bỏ kiểm · bản ghim thấp hơn `floor`. Bản ghim thấp
  hơn `latest` bị chặn một lần mỗi phiên như lời cảnh báo; chạy lại thì qua. Cho qua: lần kiểm khô (`-Check`) hay quay lại bản
  cũ · repo không ghim khung · lệnh chỉ nhắc tên script. Hook lỗi thì cho qua.
- `zemory conform` (`rule-conform`, chỉ báo) chạy cùng phép kiểm nạp luật trên mọi script `deploy*` của app có ghim khung, theo
  repo như đang có: hook export `conform(root)`.
- Cái hook không thấy (bộ kiểm có chạy nhưng kết quả bị bỏ qua) là việc của chính cổng trong script deploy, chủ repo phán.

## Links · Liên kết
- Implements · Thi hành: `Skill_App_ShellUse` — an app wears the frame and runs its check · app mang khung và chạy bộ kiểm của nó
- Related · Liên quan: `Skill_App_SneatGlass` — the shared rules of the frame · luật chung của khung
- Related · Liên quan: `Skill_App_Report` — the report rules · luật trang báo cáo
- Related · Liên quan: `Rule_Keys_90_AppFamilyContract` — an app wears the build it pins · app mang bản khung nó ghim
