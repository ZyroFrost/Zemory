---
version: 4
lang: vi
---
# Share_081_Share share — bundle sync mã hoá xuyên máy

- Vai trò:
  - Bundle SYNC MÃ HOÁ xuyên máy: git-lfs `*.enc` + key + README. TRACKED (đã mã hoá).
  - Hệ APP: chỉ app CÓ sync qua git. Hệ NON-APP: chỉ khi cần chia sẻ file nặng xuyên máy — qua bundle mã hoá, không đưa plaintext lên git.
  - Folder Drive-sync chỉ nhận bundle `.enc`, không nhận DB sống.
