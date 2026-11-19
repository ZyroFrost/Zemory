---
name: install-switch
description: Switch a machine between the two zemory installs - native (Windows) and Docker (WSL) - in either direction, carrying the memory store across and leaving NOTHING of the other install behind (shortcuts, autostart, the zemory command, hooks, a container that comes back). Use whenever a machine moves from Docker to native or native to Docker, when reinstalling zemory, or when an old shortcut/command still opens the other install. Vietnamese triggers - "chuyển về cài thẳng", "bỏ docker", "chuyển sang docker", "cài lại zemory", "trả lại cài pc", "startmenu mở bản cũ", "lối tắt mở bản cũ", "cài bên này bên kia sót".
---

# install-switch — đổi kiểu cài zemory trên một máy, không sót bản cũ

Một máy chạy **đúng một** bản zemory: native (daemon `dist\zemory.exe` trên Windows) hoặc Docker (container `zemory` trong
distro WSL). Đổi kiểu = chuyển GM sang bản mới + tắt hẳn mọi lối vào bản cũ. Sót một lối vào ⇒ bấm lối tắt, hook, hay
lệnh `zemory` vẫn mở bản cũ với GM cũ — người dùng thấy "không lên" hoặc thấy dữ liệu cũ.

Luật áp: GM là dữ liệu gốc (HP điều 3) — chép, kiểm, rồi mới đổi; không xoá bản nguồn (`02-10`). Thư mục GM chỉ chứa
`global_memory.db` (+ `-wal`/`-shm`, HP điều 18). Ghi ngoài repo (`D:\_ConfigVault`, `%APPDATA%`, Registry, `.wslconfig`) cần
lời cho phép của người dùng trong phiên (`Rule_Gate_44`).

## 1. Danh mục — mỗi kiểu cài để lại gì trên máy

| Thứ | Native | Docker |
|---|---|---|
| Daemon | `dist\zemory.exe dist\cli.js ui` (pid Windows) | container `zemory` (`restart: unless-stopped`), image `zemory:local` |
| Lệnh `zemory` | `%APPDATA%\npm\zemory{,.cmd,.ps1}` (`npm install -g .`) | `%LOCALAPPDATA%\Microsoft\WindowsApps\zemory.cmd` → `host-cli.mjs` |
| Lối tắt | Start Menu + Desktop `Zemory.lnk` → `wscript.exe %APPDATA%\zemory\launch.vbs` | Start Menu `Zemory.lnk` → `msedge.exe --app=http://127.0.0.1:4444` |
| Tự khởi động | Startup `zemory.vbs`/`zemory.cmd` (nếu bật) | Run `Zemory (WSL)` = `conhost --headless wsl.exe -d <distro> --exec sleep infinity` |
| GM | `~/.zemory/location.json` → `memoryRoot` (thường `<repo>\global-memory`) | `<store>/global-memory` trong distro (`.env` → `ZEMORY_STORE`, vd `/home/<u>/zemory`) |
| `data` (khoá · danh tính kênh · model · config) | `location.json` → `dataDir` (vd `D:\_ConfigVault\zemory\data`) | `<store>/data` |
| Lựa chọn của máy | `~/.zemory/install.json` `runtime: native` | `runtime: docker` |
| Hook Claude Code/Codex | `~/.claude/settings.json` gọi `zemory hook …` (cùng chuỗi cho cả hai — bản nào trả lời do lệnh `zemory` nào đứng đầu PATH) | như trái |

Desktop có thể nằm trong OneDrive (`<OneDrive>\Desktop`) — quét cả hai.

## 2. Docker → native

1. **Dừng container, tắt tự khởi động — không xoá:** `docker update --restart=no zemory && docker stop -t 60 zemory`.
   Container · image · `<store>` giữ nguyên (lần thử Linux sau dùng lại).
2. **Đổi tên lệnh Docker NGAY**, trước mọi bước khác: `WindowsApps\zemory.cmd` → `zemory.cmd.docker-shim`. Còn tên cũ thì
   hook của mọi phiên trên máy vẫn đi qua `host-cli.mjs`; bản ≤ 4.19.2 của nó còn bật lại container đã dừng.
3. **Chép GM ra:** `robocopy \\wsl.localhost\<distro>\<store>\global-memory <thư mục tạm cạnh memoryRoot> global_memory.db
   global_memory.db-wal global_memory.db-shm /J` (chép đủ bộ ba — không còn ai ghi nên bộ đó nhất quán).
   Kiểm: `sha256` từng file nguồn = đích. Rồi mới đổi chỗ: GM native cũ → `<dataDir>\backups\` (đổi tên, không xoá) · bộ
   mới vào `memoryRoot`. Mở GM một lần: đếm `sessions`/`messages` + `MAX(timestamp)` (= tin cuối trước khi dừng),
   `wal_checkpoint(TRUNCATE)`, `integrity_check` = `ok`.
4. **Gộp `data`:** sao lưu `dataDir` native (trừ `models`) vào `<dataDir>\backups\native-before-<ngày>` → `robocopy
   <store>\data <dataDir> /E /XD backups cockpit cache`. So trước: `share.key` + `secrets\channel\device.key` hai bên trùng
   hash (khác ⇒ dừng, hỏi — danh tính kênh đổi là máy kia coi như máy lạ). `config.json`: lấy bản Docker, giữ khoá chỉ đúng
   ở Windows (đường dẫn — vd `ignoredRoots`).
5. **Cài native:** trong repo `node backend/scripts/fetch-prebuilds.mjs` · `npm ci` · `npm run build` · `npm install -g .` ·
   gỡ Run `Zemory (WSL)` (ghi lại giá trị trước khi gỡ) · `install.json` `runtime: native` · `zemory setup --shortcut` ·
   `zemory hook install` · khởi động bằng chính lối tắt (`wscript launch.vbs`) · `zemory memory scan`.
   Tương đương `install.ps1`, trừ bước 3–4 mà `install.ps1` CHƯA làm.

## 3. Native → Docker

Chạy `install-docker.ps1` (bước 4–6 của nó: dừng daemon native · gỡ Startup · `npm uninstall -g zemory` · chuyển GM native
vào `<store>` khi GM Docker còn trống · dựng container · Run `Zemory (WSL)` · `install.json` docker · lệnh `WindowsApps\
zemory.cmd` · lối tắt Start Menu). Rồi làm tay phần nó CHƯA làm:
- Lối tắt **Desktop** `Zemory.lnk` (kể cả Desktop OneDrive) còn trỏ `launch.vbs` native ⇒ trỏ lại như Start Menu hoặc xoá
  (hỏi trước khi xoá).
- `%APPDATA%\zemory\launch.vbs` còn gọi `dist\zemory.exe` ⇒ không lối tắt nào được trỏ vào nó.
- GM Docker KHÔNG trống ⇒ bộ cài không chuyển GM: tự chép theo §2.3 theo chiều ngược, cùng phép kiểm.

## 4. Phép kiểm "không sót bản cũ" — chạy đủ, ghi số vào `06_CHANGES`

1. `Get-Command zemory -All` ⇒ chỉ một họ (native: `%APPDATA%\npm\…` · Docker: `WindowsApps\zemory.cmd`).
2. Mọi `Zemory.lnk` ở Start Menu · Desktop · Desktop OneDrive · Startup ⇒ trỏ đúng bản mới (in `TargetPath` + `Arguments`).
3. Run keys: native ⇒ không còn `Zemory (WSL)`; Docker ⇒ có, và Startup không còn `zemory.vbs`/`zemory.cmd`.
4. `/ping` ⇒ `runtime` đúng bản mới; ĐO LẠI sau 5–10 phút và sau một lượt hook của phiên khác (bản cũ tự sống lại là
   lỗi đã gặp — `docker inspect -f '{{.RestartCount}} {{.State.StartedAt}}' zemory` + `docker events --filter container=zemory`
   nói ai bật nó).
5. Native: `docker ps -a` ⇒ `zemory Exited`, `RestartPolicy = no`. Docker: không còn `zemory.exe` chạy trên Windows.
6. Thư mục GM của bản mới chỉ có `global_memory.db` (+ `-wal`/`-shm`); số phiên/tin ≥ số đếm ở bước kiểm GM.
7. Kênh: daemon log có phiên `#n` với máy kia ngay sau khi khởi động (danh tính giữ nguyên).
8. Từ điện thoại / trình duyệt: mở lối tắt, màn Dự án hiện thẻ, tab Chat tải được.
