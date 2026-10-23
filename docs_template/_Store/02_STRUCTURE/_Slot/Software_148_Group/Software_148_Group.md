---
id: Slot_148
name: group
version: 2
path: Software/<Nhóm>/
values: [AI, 3D, CAD, Image_2D, Video, Screen_Record, Audio, Office, Dev, Network, System, Utility, Drivers, Fonts]
scope: layout
---
# Software_148_Group group — nhóm phần mềm

## Vai trò

Cấp thứ hai của `Software\`: chia phần mềm theo VIỆC NÓ LÀM. Mục đích là nhìn vào là tìm ra phần mềm, và dựng lại một máy mới
theo từng nhóm. Mọi phần mềm nằm trong đúng một nhóm; mỗi phần mềm là một thư mục theo khuôn `Software_149_Program`
(`<Ứng dụng>\` với đủ `Setup\` · `App\` · `Data\`).

## Mười bốn nhóm — danh sách cố định

| nhóm | chứa phần mềm làm việc gì | ví dụ |
|---|---|---|
| `AI` | trợ lý AI, ứng dụng chat với mô hình, chạy mô hình tại máy, agent và CLI của mô hình | `Claude` · `ChatGPT` · `LMStudio` · `Ollama` · `ComfyUI` |
| `3D` | dựng hình, diễn hoạ, điêu khắc 3D | `Blender` · `Maya` · `ZBrush` |
| `CAD` | bản vẽ kỹ thuật, thiết kế cơ khí và kiến trúc | `AutoCAD` · `SolidWorks` · `SketchUp` |
| `Image_2D` | chỉnh ảnh, vẽ, thiết kế đồ hoạ 2D | `Photoshop` · `Illustrator` · `Krita` · `Figma` |
| `Video` | dựng và chỉnh video, hiệu ứng, chuyển định dạng video | `Premiere` · `DaVinciResolve` · `CapCut` · `HandBrake` |
| `Screen_Record` | quay màn hình, phát trực tiếp, chụp màn hình | `OBS` · `ShareX` · `Bandicam` |
| `Audio` | thu âm, chỉnh âm thanh, phát nhạc | `Audacity` · `FLStudio` · `Spotify` |
| `Office` | văn phòng, bảng tính, trình chiếu, BI, đọc PDF | `MicrosoftOffice` · `PowerBI` · `Tableau` · `FoxitReader` |
| `Dev` | lập trình: trình soạn mã, IDE, CSDL và công cụ CSDL, runtime, container, git | `Microsoft\VSCode` · `JetBrains\DataGrip` · `Database\MongoDB` · `Python\Conda` · `Git` |
| `Network` | trình duyệt, VPN, điều khiển từ xa, đồng bộ tệp, nhắn tin, tải tệp | `Chrome` · `UltraViewer` · `Syncthing` · `Zalo` · `IDM` |
| `System` | công cụ của hệ điều hành và của hãng máy: ảo hoá, cập nhật, màn hình phụ, ổ mạng, phân vùng ổ | `Microsoft\WSL` · `Lenovo\Vantage` · `RaiDrive` |
| `Utility` | tiện ích nhỏ: nén/giải nén, gõ tiếng Việt, dọn máy, game launcher | `7-Zip` · `UniKey` · `Steam` |
| `Drivers` | gói driver thiết bị — theo khuôn riêng `Software_150_Drivers`, không theo khuôn ba thư mục | `Drivers\Printer_Canon\` |
| `Fonts` | gói phông chữ tải về để cài | `Fonts\GoogleSans\` |

## Luật

- Chỉ đúng mười bốn nhóm trên, viết đúng tên như bảng (hoa thường và dấu gạch dưới giữ nguyên). Không tạo nhóm thứ mười lăm.
- Một phần mềm làm được nhiều việc thì xếp theo việc CHÍNH người dùng cài nó để làm: `PowerBI` vào `Office` (báo cáo), không
  vào `Dev`.
- Phần mềm không vừa nhóm nào ⇒ `Utility`.
- Không có file lẻ ở cấp nhóm: trong `Software\Dev\` chỉ có thư mục phần mềm (hoặc thư mục hãng chứa thư mục phần mềm).

## Phép kiểm

`zemory conform --layout <gốc ổ>` báo đỏ (`unknown-value`) mọi thư mục trong `Software\` không thuộc mười bốn nhóm, và báo đỏ
(`program-incomplete`) mọi thư mục phần mềm trong nhóm (trừ `Drivers` · `Fonts`) thiếu `Setup\`, `App\` hoặc `Data\`.
