---
version: 1
lang: vi
---
# Models_167_Models models — nơi chứa model chung duy nhất

## Vai trò

`<gốc dữ liệu>\_Models\` là nơi chứa dùng chung của cả máy (dấu `_` của `Struc_Disk_Data`): nơi DUY NHẤT chứa file model AI (model
ngôn ngữ, model ảnh, embedding). Mọi app AI trỏ vào đây, nên một model tải một lần là mọi app dùng được và không bao giờ nằm hai
bản trên ổ. Nó không phải phần mềm (không bộ cài, không bản cài) và không thuộc riêng phần mềm nào, nên không phải thư mục của
`Software\`, cũng không phải `Data\` của một app.

## Bên trong

Mỗi engine một thư mục, vì mỗi engine giữ model theo định dạng và cách xếp riêng.

| thư mục | chứa | cách trỏ app vào |
|---|---|---|
| `lmstudio\` | model của LM Studio (`.gguf`, theo publisher và model) | LM Studio → My Models → models directory = `…\_Models\lmstudio\` |
| `ollama\` | model của Ollama (blobs và manifests) | biến môi trường `OLLAMA_MODELS=…\_Models\ollama` |
| `huggingface\` | cache hub của Hugging Face | biến môi trường `HF_HUB_CACHE=…\_Models\huggingface` |
| `comfyui\` | checkpoint, LoRA, VAE của ComfyUI | `extra_model_paths.yaml` của ComfyUI → `…\_Models\comfyui\` |

## Các bước — thêm một engine

1. Tạo `_Models\<engine>\`.
2. Trỏ app vào đó bằng thiết lập hoặc biến môi trường của chính app (bảng trên).
3. App không có thiết lập ⇒ dời thư mục model mặc định của nó vào đây, rồi thay thư mục cũ bằng một junction trỏ về đây
   (`mklink /J "%USERPROFILE%\.lmstudio\models" "D:\_Models\lmstudio"`).
4. Dời các model đã tải ở chỗ khác vào thư mục engine; xoá bản trùng.

## Luật

- Model chủ máy tải về cho các app AI không nằm ở bất kỳ chỗ nào khác trên máy: không trong `App\` hay `Data\` của app, không ở
  `C:`, không trong repo.
- Model mà MỘT app tự tải và tự quản cho riêng nó, không app nào khác dùng (model nhúng có sẵn của một app), ở lại dữ liệu riêng
  của app đó.
- Bản thân các app AI là phần mềm trong `Software\AI\<Ứng dụng>\` có đủ `Setup\` · `App\` · `Data\`; chỉ model của chúng vào đây.
- Model nặng: đo chỗ trống của ổ trước khi tải. `_Models\` được đặt nguyên khối trên SSD nhanh rồi nối về (năm luật của
  `Struc_Disk_Data`).

## Khuôn tên

`_Models` viết đúng như vậy. Thư mục engine viết thường, đúng tên lệnh của engine: `lmstudio` · `ollama` · `huggingface` ·
`comfyui`.

## Đồng bộ

Không vào git, không đồng bộ: model tải lại được.

## Phép kiểm

`zemory conform --layout <gốc dữ liệu>` nhận `_Models` ở gốc dữ liệu và báo đỏ repo nằm trong nó (`repo-outside-workspace`).
