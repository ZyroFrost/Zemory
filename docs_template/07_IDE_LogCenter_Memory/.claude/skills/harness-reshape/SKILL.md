---
id: Skill_Harness_Reshape
name: harness-reshape
version: 4
type: process
description: Move a repo onto a standard set from the store - measure what the repo has of its own, bring it up to the store first, assemble in two phases, remove the copies that hold nothing of their own, and accept with measurements and a real run. Use whenever a repo moves to the folder harness, changes set, or takes a large store update. Vietnamese triggers - "nắn repo", "áp chuẩn", "áp bộ", "chuyển sang bộ", "reshape", "đưa repo về chuẩn".
from: _Store/03_SKILLS/Skill_Harness_Reshape @v4 #240504ecfb52
---

# harness-reshape — nắn một repo lên bộ chuẩn

> Khác `Skill_Harness_Reconcile` (file lạc chỗ trong một thư mục) và `Skill_Harness_Adopt` (nhận repo của bên khác, không
> nắn). Skill này đưa một repo đang dùng harness lên đúng một bộ của kho, không mất gì, không để lại bản thứ hai.

## 0. Trước khi chạm repo

- Repo đang có phiên agent mở ⇒ người dùng tắt phiên đó trước. Ghi vào repo đang có phiên khác làm việc là xung đột thật.
- Xác định bộ đích (`<NN>_<host>_<cấu trúc>_<tầng>`): cấu trúc theo loại repo (App · NonApp · Dept…), không theo thói quen.
- Repo có thay đổi chưa commit ⇒ ghi lại danh sách; đợt nắn không đụng các file đó.

## 1. Đo phần riêng của repo — theo DÒNG, so với mọi phiên bản nguồn

- Với mỗi skill, tool, luật repo đang giữ mà kho cũng có: liệt kê dòng chỉ có ở repo. So với **mọi phiên bản trong lịch sử**
  của nguồn đã chép xuống repo (bản chép cũ thường ghép từ nhiều trạng thái, không trùng phiên bản commit nào).
- Bỏ qua khác biệt kiểu xuống dòng (CRLF) trước khi đếm.
- Kết quả là một bảng: `phần · số dòng riêng · số dòng chỉ nguồn có`. Dòng riêng > 0 ⇒ bước 2; bằng 0 ⇒ bản đó là bản thừa.

## 2. Trộn phần riêng lên kho — TRƯỚC khi áp

- Dòng riêng là nâng cấp ⇒ đưa vào đúng phần của kho (một bản), tăng version. Kho đã có bản tốt hơn ⇒ kho thắng.
- Tool bị sửa ⇒ đối chiếu bản kho với bản của repo trên **chính dữ liệu thật của repo** (báo cáo, file mẫu): kết quả phải
  giống hệt, chỉ khác ở chỗ đã chủ ý đổi. Lệch ⇒ không áp.
- Giá trị riêng của công ty / vùng ⇒ khoá vùng (`values.json`), không vào phần kho.

## 3. Pha 1 — ráp

- Sao lưu bề mặt harness (`docs/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`) và `git status` ra ngoài repo.
- Chụp trạng thái trước: kho tính năng (luật, skill, trigger, guard), băm mọi file ngoài harness, lỗi `validate` đang có.
- `zemory sync --standard [--kit <NN>] --apply`.
- Bản chép không có dòng riêng (bước 1) ⇒ **xoá**. Có dòng riêng mà chưa trộn ⇒ dừng, quay lại bước 2.
- Tool đã cài bởi phần kho (`installs:`) mà repo đang giữ bản chép cũ không dòng riêng ⇒ thay bằng bản kho.

## 4. Pha 2 — nghiệm thu (đủ cả bảng, thiếu một dòng là chưa xong)

| Phép đo | Đạt khi |
|---|---|
| Lượt `sync` thứ hai | `0 to add · 0 to update · 0 conflict` |
| Tính năng | không mất luật, skill, trigger, cổng nào so với lúc trước |
| File ngoài harness | chỉ đổi đúng những file đợt nắn chủ ý đổi (tool thay, link đổi đích); không file nào biến mất |
| Guard | bộ thử chặn/cho qua chạy đủ, đúng hết |
| `doctor` | docs · guard · nối guard đều xanh |
| `conform` | `harness-layout` sạch (`docs/agent` chỉ có kệ và hai sổ; archive ở `docs/archive/`; thư mục hook cũ cạnh `docs/agent/` đã gỡ) |
| `validate` | không có lỗi mới |
| Chạy thật | tool của repo chạy trong repo và đọc đúng giá trị (vùng, cấu hình) |

- Mục `conform` thuộc phần việc của repo (khung hiến pháp chưa viết, tên điều riêng) ⇒ báo, không tự viết thay.
- Không commit trong repo được nắn; người dùng hoặc phiên của repo đó commit.

## 5. Báo

- Cập nhật bảng tiến độ của đợt: repo · bộ · kết quả từng phép đo · việc còn lại của repo.
- Lỗ của harness bắt được trong lúc nắn (luật có chữ không có chốt máy, cổng báo oan, bước tool bỏ sót) ⇒ vá trong đợt, có
  test và đột biến, rồi áp lại cho các repo đã nắn trước đó.

## Cấm

- Chạy script chép đè cũ (mirror) sau khi repo đã nắn.
- Xoá một bản chép còn dòng riêng.
- Áp khi phép đối chiếu tool còn lệch.

## Implements · Thi hành luật
- `Rule_Gate_83_HarnessFromStore` — bringing a repo onto the store's harness and syncing it down · đưa repo về harness của HS và đồng bộ xuống
