# Zemory Shared Memory Bundle

This folder is intentionally self-contained for the private `ZyroFrost/Zemory`
repo.

Files:

- `global_memory.zemory.enc` — encrypted `global_memory.db` bundle, tracked by Git LFS.
- `share.key` — decrypt key for the bundle, committed by owner request.

Important:

- Anyone with read access to this private repo can decrypt the memory bundle.
- Keep the repo private unless you intentionally want to expose the full memory.
- Do not edit `global_memory.zemory.enc` by hand; regenerate it with:

```powershell
node dist\cli.js memory export share\global_memory.zemory.enc --key-file share\share.key --force
```

Restore on another trusted machine:

```powershell
git lfs install
git lfs pull
npm ci
npm run build
node dist\cli.js memory import share\global_memory.zemory.enc --key-file share\share.key --force
node dist\cli.js memory info
```

Before exporting a new bundle, optional privacy pass:

```powershell
node dist\cli.js memory redact --force
node dist\cli.js memory forget --project "D:\some\project"   # dry-run
node dist\cli.js memory forget --project "D:\some\project" --force
node dist\cli.js memory export share\global_memory.zemory.enc --key-file share\share.key --force
```

`forget` changes only zemory's derived memory DB/vector index; it does not delete
the original agent transcript files.
