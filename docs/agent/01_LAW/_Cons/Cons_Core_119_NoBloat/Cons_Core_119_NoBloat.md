---
id: Cons_119
aka: 01-19
name: no-bloat
version: 1
kind: content
---
# Cons_Core_119_NoBloat KHÔNG PHÌNH — thứ tạm, đệm, sao lưu TỰ DỌN; TRẦN dung lượng có chốt máy và KHÔNG VƯỢT được.

**KHÔNG PHÌNH — thứ tạm, đệm, sao lưu TỰ DỌN; TRẦN dung lượng có chốt máy và KHÔNG VƯỢT được.** Trần giữ bằng máy; trần tự vượt được là luật vô dụng.
    - **Phạm vi:** mọi thứ zemory sinh ra mà không phải dữ liệu gốc — đệm build của Docker · image thừa · bản sao lưu GM tự chụp · thư mục nháp của phiên · khối kênh/tệp tạm. GM (`global_memory.db`) là dữ liệu gốc, không thuộc diện tự xoá (điều 3).
    - **Sao lưu tự chụp** (`forget` · `redact` · mọi lệnh tự chụp trước khi ghi): chỉ giữ **2 bản mới nhất** của mỗi GM; chính lệnh chụp xoá bản cũ hơn ngay sau khi chụp. Bản người dùng tự chỉ đường lưu thì không bị xoá.
    - **Dựng lại bản Docker: chỉ một đường,** `backend/scripts/docker-rebuild.sh` (lần cài đầu: bộ cài `install-docker.*`) — xoá đệm build và image thừa TRƯỚC và SAU khi build, rồi đo trần. Lệnh build trần (`docker compose up --build` · `docker build`) bị guard chặn.
    - **Trần của bản Docker: 10 GB cho mọi thứ nằm cạnh GM** (image + store trừ thư mục GM); đệm build sau khi dựng bằng 0. Vượt ⇒ `docker-rebuild.sh` thoát đỏ và nêu thứ phình; việc đầu tiên là dọn, không phải nâng trần.
    - **Ổ ảo WSL không tự co lại** khi xoá file bên trong: ổ chạy ở chế độ sparse (`wsl --manage <distro> --set-sparse true`); ổ đã phình ⇒ nén một lần (xuất/nhập lại distro).
    - **Phép kiểm:** guard nhánh `docker_prune` (marker `dockerPrune: true`) chặn build trần · `no-bloat.test` (build trần bị chặn, kể cả sau `wsl … bash -lc`; sao lưu tự chụp giữ 2 bản; bản đặt tên không bị xoá) · `docker-rebuild.sh` đỏ khi đệm build khác 0 hoặc phần cạnh GM vượt trần · `02-4_scratch-cap` (thư mục nháp tối đa 5 file).

- **Chốt máy:** guard nhánh `docker_prune` (marker `dockerPrune`: build Docker trần bị chặn, chỉ qua `backend/scripts/docker-rebuild.sh`) · `no-bloat.test` · `docker-rebuild.sh` đỏ khi đệm build ≠ 0 hoặc phần cạnh GM > 10 GB · sao lưu tự chụp giữ 2 bản (`pruneBackups`) · `02-4_scratch-cap`
