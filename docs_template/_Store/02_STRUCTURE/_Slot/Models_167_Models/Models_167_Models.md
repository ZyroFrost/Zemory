---
id: Slot_167
name: models
version: 1
path: _Models/<engine>/
scope: layout
---
# Models_167_Models models — the one shared model store

## Role

`<data root>\_Models\` is a shared store of the whole machine (the `_` of `Struc_Disk_Data`): the ONE place where AI model files
live (language models, image models, embeddings). Every AI app points to it, so a model downloaded once is used by every app and
never sits twice on the drive. It is not a program (no installer, no installed copy) and it belongs to no single program, so it
is neither a folder of `Software\` nor the `Data\` of one app.

## Inside

One folder per engine, because each engine keeps models in its own format and layout.

| folder | holds | how the app is pointed at it |
|---|---|---|
| `lmstudio\` | LM Studio's models (`.gguf`, by publisher and model) | LM Studio → My Models → models directory = `…\_Models\lmstudio\` |
| `ollama\` | Ollama's models (blobs and manifests) | environment variable `OLLAMA_MODELS=…\_Models\ollama` |
| `huggingface\` | the Hugging Face hub cache | environment variable `HF_HUB_CACHE=…\_Models\huggingface` |
| `comfyui\` | ComfyUI's checkpoints, LoRAs, VAEs | ComfyUI `extra_model_paths.yaml` → `…\_Models\comfyui\` |

## Steps — adding an engine

1. Create `_Models\<engine>\`.
2. Point the app at it with the app's own setting or environment variable (table above).
3. If the app gives no setting, move its default model folder here and replace the old folder with a junction to this one
   (`mklink /J "%USERPROFILE%\.lmstudio\models" "D:\_Models\lmstudio"`).
4. Move models already downloaded elsewhere into the engine folder; delete duplicates.

## Rules

- A model the owner downloads for AI apps lives nowhere else on the machine: not in an app's `App\` or `Data\`, not on `C:`, not
  in a repo.
- A model that ONE app downloads and manages for itself, and no other app uses (an app's built-in embedding model), stays in that
  app's own data.
- The AI apps themselves are programs in `Software\AI\<App>\` with `Setup\` · `App\` · `Data\`; only their models come here.
- Models are large: measure the drive's free space before a download. `_Models\` may live on a fast SSD as one block and be linked
  back (the five laws of `Struc_Disk_Data`).

## Naming

`_Models` exactly. Engine folders lower case, as the engine is called on the command line: `lmstudio` · `ollama` · `huggingface`
· `comfyui`.

## Sync

Not in git, not synced: models can be downloaded again.

## Check

`zemory conform --layout <data root>` accepts `_Models` at the data root and reds a repo inside it (`repo-outside-workspace`).
