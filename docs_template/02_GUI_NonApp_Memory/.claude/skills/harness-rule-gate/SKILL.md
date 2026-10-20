---
id: Skill_Harness_RuleGate
name: harness-rule-gate
version: 5
type: process
description: Write a new rule, constitution frame or skill for a harness, place it in the right home, and build its machine gate with positive and negative cases. Use once adding or changing a rule, a constitution frame or a gate has been approved. Vietnamese triggers - "thêm luật", "viết luật", "dựng cổng", "chốt máy cho luật", "xếp nhà luật".
from: _Store/03_SKILLS/Skill_Harness_RuleGate @v5 #951c6a622985
---

# harness-rule-gate — viết luật và dựng chốt máy

> Chỉ chạy khi người dùng đã duyệt việc thêm hoặc sửa luật (`Rule_Gate_79_HarnessEdit`). Quy tắc đặt tên và xếp nhà:
> `docs_template/_Store/README.md`.

## 1. Xếp nhà trước khi viết

- Câu nói về cách agent làm việc ở mọi repo ⇒ luật chung (`01_LAW/_Rule`).
- Câu nói về chính sản phẩm của repo ⇒ `Cons.md` của khung tương ứng, hoặc điều riêng từ số 101.
- Câu là cách làm một loại việc ⇒ skill. Câu là chỗ đặt file ⇒ slot (đề xuất slot hay template mới: `Skill_Harness_Structure`
  §5). Câu là cơ chế công cụ theo hệ ⇒ `_Host`.
- Hai món nói cùng một điều ⇒ gộp vào món có sẵn; không đẻ món mới.

## 2. Phân loại theo câu hỏi: lúc vi phạm, máy thấy gì?

1. **Hành động trên công cụ** (xoá · push · ghi ngoài repo · SQL vào máy chủ · sửa đường cấm · lệnh git huỷ việc) ⇒ nhánh
   guard `PreToolUse` soi tên công cụ và lệnh/đường dẫn. Việc được phép một lần ⇒ cờ `.allow-*`.
2. **Nội dung đang ghi** (kiểu xuống dòng · tên · chính tả · lời trích · mục mới trong sổ · SQL tại chỗ) ⇒ hook `PreToolUse`
   trên Write/Edit, chỉ soi phần thêm; file vào git ⇒ pre-commit; khuôn docs ⇒ `zemory validate`; cây thư mục ⇒
   `zemory conform`; bất biến của mã ⇒ test trong cổng của repo.
3. **Phán đoán, lời nói** (hỏi khi chưa rõ · chưa xác minh · trình thiết kế) ⇒ không có lời gọi công cụ để móc: luật `Core`.
   Có cửa nhận ra được (lời nhắn khớp từ khoá · ghi vào một đường · chạy một loại script) ⇒ thêm `prompt` (Keys) hoặc
   `read` (đòi đọc skill) trong `gate.json`.
- Luật mà vi phạm là không đảo được (bí mật vào commit · ghi đường cấm · push chưa xin) ⇒ phải có chốt máy; chữ một mình
  không đủ.

## 3. Dựng chốt

- Hook nằm trong folder luật: `hook.cjs`; luật nhận thêm luật khác ⇒ thêm `hook-<tên>.cjs`, `gate.json › hook` liệt kê đủ.
- Câu chặn nêu tên đầy đủ của luật, thứ vừa bắt được (file · dòng · lệnh) và Lối đúng nếu luật quy định cách viết.
- `gate.json` có ca chặn (`block`) và ca phải cho qua (`pass`: thứ trông giống mà đúng). Phá mã hook rồi chạy lại: ca chặn
  phải đỏ (`Rule_Gate_01_DoneMeansRun`).
- Chính hook lỗi ⇒ cho qua (fail-open).
- Loại trong tên (`Gate` · `Keys` · `Core`) phải khớp thứ `gate.json` thật sự làm; phép kiểm tên của kho báo khi lệch.

## 4. Khung hiến pháp mới

- Một khung = một loại bất biến nhiều sản phẩm cùng có. Folder `Cons_Gate_<NN>_<Tên>/`: file luật (`frame: true`, "repo
  phải khai …", ví dụ đã viết) · `Cons.md` mẫu (`status: template`, chỗ trống `<…>`, lối `n/a`) · `gate.json` `{"gate": "conform"}`.
- Bất biến chỉ một sản phẩm có ⇒ không làm khung; để repo viết điều riêng.

## Implements · Thi hành luật
- `Rule_Gate_79_HarnessEdit` — giving a law whose breach cannot be undone its machine check · gắn chốt máy cho luật mà vi phạm không đảo được
- `Rule_Gate_85_ProposeChecked` — proposing a new part after the store was searched · đề xuất phần mới sau khi đã dò HS
