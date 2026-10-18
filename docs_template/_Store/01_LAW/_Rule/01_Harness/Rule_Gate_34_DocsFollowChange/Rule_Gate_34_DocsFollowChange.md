---
id: Rule_34
aka: 02-34
name: docs-follow-change
version: 6
kind: judgment
code: 01_Harness
---
# Rule_Gate_34_DocsFollowChange — Docs change in the same change as the thing they describe

## What
When something changes, every doc that describes it changes in the same change. A doc that is wrong is worse than a doc that is
missing, because people trust it.

## When
- A change touches something a doc describes: code, a report, a task, a structure, a design, a guide shown in the product.

## Do
1. In the same change, update every doc that describes the thing: the plan when a design changes, `05_CHANGES` once the change is
   confirmed, `04_TODO` under `Rule_Gate_38_TodoDoor`, the guide shown in the product.
2. Edit the `.md` file itself, in its right role; a search index (if any) is rebuilt from the files, never written back.
3. The repo's harness copy is not the repo's doc to edit: a change to a law, slot or skill goes through
   `Rule_Gate_83_HarnessFromStore`.
4. End of session: go through the list in `Skill_Harness_SessionClose`.

## Example
- Situation: a report app has a "Guide" page listing the kinds of alerts; the agent just removed one kind in the code.
- ✗ Wrong: change only the code; the guide still says "9 kinds", people look for the one that is gone and think the app is broken.
- ✓ Right: in the same change, update the guide page and write the changelog entry.

## Check
- conform reds a folder tree that differs from the repo's assembled structure; the other points are judgment.

## Luật là gì
Khi một thứ thay đổi, mọi tài liệu mô tả nó đổi trong cùng lần thay đổi đó. Tài liệu sai nguy hơn tài liệu thiếu, vì người đọc
tin nó.

## Khi nào áp
- Một thay đổi đụng tới thứ có tài liệu mô tả: mã, báo cáo, task, cấu trúc, thiết kế, hướng dẫn hiện trong sản phẩm.

## Phải làm gì
1. Trong cùng thay đổi, sửa mọi tài liệu mô tả thứ đó: plan khi đổi thiết kế, `05_CHANGES` khi thay đổi đã được xác nhận,
   `04_TODO` theo `Rule_Gate_38_TodoDoor`, trang hướng dẫn hiện cho người dùng trong sản phẩm.
2. Sửa thẳng file `.md`, đúng file, đúng vai; chỉ mục tìm kiếm (nếu có) dựng lại từ file, không ghi ngược vào file.
3. Bản harness chép về repo không phải tài liệu repo được sửa: đổi luật, slot hay skill đi theo `Rule_Gate_83_HarnessFromStore`.
4. Cuối phiên: đi qua bảng soát trong `Skill_Harness_SessionClose`.

## Ví dụ
- Tình huống: app báo cáo có trang "Hướng dẫn" liệt kê các loại cảnh báo; agent vừa gỡ một loại trong mã.
- ✗ Sai: chỉ sửa mã; trang hướng dẫn vẫn ghi "9 loại", người dùng đi tìm loại đã không còn và nghĩ app lỗi.
- ✓ Đúng: cùng lần sửa đó cập nhật trang hướng dẫn và ghi changelog.

## Máy kiểm
- conform báo đỏ cây thư mục lệch cấu trúc đã ráp của repo; các ý khác là phán đoán.

## Links · Liên kết
- Implements · Thi hành: `Skill_Harness_SessionClose` — the end-of-session checklist · bảng soát cuối phiên
- Related · Liên quan: `Rule_Gate_38_TodoDoor` — the TODO ledger · sổ việc
- Related · Liên quan: `Rule_Gate_83_HarnessFromStore` — the harness copy is not edited in the repo · bản harness không sửa trong repo
