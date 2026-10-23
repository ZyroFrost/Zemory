---
id: Cons_14
name: access
version: 5
kind: content
code: 04_Security
frame: true
from: _Store/01_LAW/_Cons/04_Security/Cons_Gate_14_Access @v5 #485e0a5944b3
---
# Cons_Gate_14_Access — Access and security

## What
Every repo states in the `Cons.md` of this frame who may use the product, at which layer rights are guarded, what happens when no
right is declared (block or allow), the secrets the system uses (NAMES only, never values), the personal data it keeps and how it
is protected, and whether the product is open to a network or runs only on the machine. Personal data of the people who use it (identity ·
contact · financial) is never stored or sent in clear text.

## When
- The product gets people who sign in, rights, secrets or personal data, or opens to a network.
- The agent adds a feature that writes, or a field that holds personal data.

## Do
1. Fill the sections of `Cons.md`: who uses it · guarded at · secrets (names) · personal data · network scope.
2. Secrets: one row per secret: its NAME (`Name`), the file-name pattern it lives in (`File`, for example `*.sec`), its use;
   the value lives in `data/secrets/` (`Rule_Gate_21_WhatEntersGit`).
3. Personal data: which fields · encrypted with what · where the key lives. Keeps none ⇒ write `none` with the reason.
4. Nobody signs in and no secrets ⇒ `status: n/a` with the reason.

## Example
- Situation: an internal app with viewers and editors fills the `Cons.md` of this frame.
- ✗ Wrong: write only "role-based rights"; the agent adds a new write feature and hides the button from viewers, but the server
  still accepts writes from them; customer phone numbers sit in clear text in a table.
- ✓ Right: "Guarded at the server, block by default: a new write feature blocks viewers until it is declared allowed. Hiding a
  button is not security. Personal data: `phone` · `email` encrypted with AES-256-GCM, key in the vault, rotated every 90 days."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.
- The guard reads the `File` column of the secrets table as secret file names (`secretNames`): such a file never enters a
  commit.

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_DbDesign` — how a column is encrypted, the library, key rotation · cách mã hoá cột, thư viện, xoay khoá
- Related · Liên quan: `Rule_Gate_21_WhatEntersGit` — where secret values live · giá trị bí mật nằm đâu
- Related · Liên quan: `Cons_Gate_15_DataLifecycle` — how long personal data is kept · dữ liệu cá nhân giữ bao lâu
