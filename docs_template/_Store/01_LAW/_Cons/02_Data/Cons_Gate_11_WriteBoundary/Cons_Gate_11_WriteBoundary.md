---
id: Cons_11
name: write-boundary
version: 3
kind: content
code: 02_Data
frame: true
---
# Cons_Gate_11_WriteBoundary — The write boundary

## What
Every repo states in the `Cons.md` of this frame where the product may write outside the repo, the one way structure changes
(tables · columns · rights · system settings) go, and which writes run only on the requester's command in the session.

## When
- The product starts writing somewhere new outside the repo.
- The agent is about to change a structure or run a write against a shared system.

## Do
1. Fill the three sections of `Cons.md`: may write to · structure changes only through · runs only on command.
2. Writes nothing outside the repo ⇒ `status: n/a` with the reason.

## Example
- Situation: a repo that manages a database shared by several apps fills the `Cons.md` of this frame.
- ✗ Wrong: no way for structure changes is declared; each app creates its own tables in the shared database, and months later
  nobody knows whose table is whose.
- ✓ Right: "May write to: only this repo's database. Structure changes only through the model folder, run by script after a clean
  syntax check; apps never create or alter tables. Only on command: every structure change, rights change and data fix."

## Check
- `conform` reds when `Cons.md` is missing, unwritten, or a template mark `<…>` is left.

## Luật là gì
Mọi repo khai trong `Cons.md` của khung này: sản phẩm được ghi vào đâu ngoài repo, đường duy nhất cho thay đổi cấu trúc (bảng ·
cột · quyền · cấu hình hệ), và thao tác ghi nào chỉ chạy khi người dùng ra lệnh trong phiên.

## Khi nào áp
- Sản phẩm bắt đầu ghi vào một chỗ mới ngoài repo.
- Agent sắp đổi một cấu trúc hay chạy lệnh ghi lên hệ dùng chung.

## Phải làm gì
1. Điền ba mục của `Cons.md`: được ghi vào · đổi cấu trúc chỉ qua · chỉ chạy khi có lệnh.
2. Không ghi gì ra ngoài repo ⇒ `status: n/a` kèm lý do.

## Ví dụ
- Tình huống: một repo quản cơ sở dữ liệu dùng chung cho nhiều app điền `Cons.md` của khung này.
- ✗ Sai: không khai đường đổi cấu trúc; mỗi app tự tạo bảng riêng trên cơ sở dữ liệu chung, vài tháng sau không ai biết bảng nào
  của ai.
- ✓ Đúng: "Được ghi vào: chỉ cơ sở dữ liệu của repo này. Đổi cấu trúc chỉ qua thư mục mô hình, chạy bằng script sau khi kiểm cú
  pháp sạch; app không tự tạo hay sửa bảng. Chỉ chạy khi có lệnh: mọi câu đổi cấu trúc, đổi quyền, sửa dữ liệu."

## Máy kiểm
- `conform` đỏ khi `Cons.md` thiếu, chưa viết, hoặc còn dấu mẫu `<…>`.

## Links · Liên kết
- Implements · Thi hành: `Skill_Dev_DbDesign` — how structure changes are written and run · cách viết và chạy thay đổi cấu trúc
- Related · Liên quan: `Rule_Gate_44_RepoScope` — SQL that changes a server is leaving the project · SQL đổi máy chủ là ra ngoài dự án
