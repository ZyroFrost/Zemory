---
version: 4
lang: vi
---
# Software_148_Group group — nhóm của một chương trình

## Vai trò

Cấp thứ hai của `Software\`: chương trình chia theo VIỆC NÓ LÀM, để nhìn là tìm ra chương trình và dựng lại máy mới theo từng nhóm.
Mọi chương trình nằm trong đúng một nhóm; mỗi chương trình là một thư mục theo khuôn `Software_149_Program`.

## Câu hỏi của cấp này — mười lăm nhóm, danh sách cố định

| nhóm | chương trình làm việc gì | ví dụ |
|---|---|---|
| `AI` | trợ lý AI, chat với mô hình, chạy mô hình tại máy, agent và CLI của mô hình | `Claude` · `LMStudio` · `Ollama` · `ComfyUI` |
| `3D` | dựng hình, diễn hoạ, điêu khắc 3D | `Blender` · `Maya` · `ZBrush` |
| `CAD` | bản vẽ kỹ thuật, thiết kế cơ khí và kiến trúc | `AutoCAD` · `SolidWorks` · `SketchUp` |
| `Image_2D` | chỉnh ảnh, vẽ, thiết kế đồ hoạ 2D | `Photoshop` · `Krita` · `Figma` |
| `Video` | dựng và chuyển định dạng video, hiệu ứng | `Premiere` · `DaVinciResolve` · `HandBrake` |
| `Screen_Record` | quay hoặc chụp màn hình, phát trực tiếp | `OBS` · `ShareX` · `Bandicam` |
| `Audio` | thu âm, chỉnh âm thanh, phát nhạc | `Audacity` · `FLStudio` · `Spotify` |
| `Office` | văn phòng, bảng tính, trình chiếu, BI, đọc PDF | `MicrosoftOffice` · `PowerBI` · `FoxitReader` |
| `Dev` | lập trình: trình soạn mã, IDE, CSDL và công cụ CSDL, runtime, container, git | `Microsoft\VSCode` · `JetBrains\DataGrip` · `Git` |
| `Network` | trình duyệt, VPN, điều khiển từ xa, đồng bộ tệp, nhắn tin, tải tệp | `Chrome` · `Syncthing` · `UltraViewer` |
| `System` | công cụ của hệ điều hành và hãng máy: ảo hoá, cập nhật, ổ đĩa | `Microsoft\WSL` · `RaiDrive` |
| `Utility` | tiện ích nhỏ: nén/giải nén, gõ phím, dọn máy | `7-Zip` · `UniKey` |
| `Game` | game, launcher game và công cụ game (quản lý mod, giả lập, trainer, app hỗ trợ game) | `Steam` · `EpicGames` · `ModOrganizer` |
| `Drivers` | gói driver thiết bị — theo khuôn `Software_150_Drivers`, không theo ba phần | `Drivers\Printer_<Model>\` |
| `Fonts` | gói phông chữ tải về để cài | `Fonts\GoogleSans\` |

## Luật

- Đúng mười lăm nhóm trên, viết đúng như bảng. Không có nhóm thứ mười sáu.
- Chương trình làm nhiều việc thì xếp theo việc CHÍNH chủ máy cài nó để làm: `PowerBI` ⇒ `Office`, không vào `Dev`.
- Thư viện game của launcher là `Data\` của launcher (`Software\Game\Steam\Data\`); game cài không qua launcher là một chương trình
  riêng ở `Software\Game\<Game>\`.
- Chương trình không vừa nhóm nào ⇒ `Utility`.
- Không có file lẻ ở cấp nhóm.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` báo đỏ (`unknown-value`) mọi thư mục trong `Software\` ngoài mười lăm nhóm, và
(`program-stray`) mọi thư mục chương trình trong một nhóm (trừ `Drivers` · `Fonts`) chứa thứ gì ngoài `Setup\`, `App\`, `Data\` và
`_README.md`.
