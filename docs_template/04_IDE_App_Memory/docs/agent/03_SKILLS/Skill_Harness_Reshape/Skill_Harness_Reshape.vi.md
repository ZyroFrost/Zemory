---
version: 5
lang: vi
---

# harness-reshape — nắn một repo lên bộ chuẩn

> Khác `Skill_Harness_Reconcile` (file lạc chỗ trong một thư mục) và `Skill_Harness_Adopt` (nhận repo của bên khác, không
> nắn). Skill này đưa một repo đang dùng harness lên đúng một bộ của HS, không mất gì, không để lại bản thứ hai.

## 0. Trước khi chạm repo

- Repo đang có phiên agent mở ⇒ người dùng tắt phiên đó trước. Ghi vào repo đang có phiên khác làm việc là xung đột thật.
- Xác định bộ đích (`<NN>_<host>_<cấu trúc>_<tầng>`): cấu trúc theo loại repo (App · NonApp · Dept…), không theo thói quen.
- Repo có thay đổi chưa commit ⇒ ghi lại danh sách; đợt nắn không đụng các file đó.

## 1. Đo phần riêng của repo — theo DÒNG, so với mọi phiên bản nguồn

- Với mỗi skill, tool, luật repo đang giữ mà HS cũng có: liệt kê dòng chỉ có ở repo. So với **mọi phiên bản trong lịch sử**
  của nguồn đã chép xuống repo (bản chép cũ thường ghép từ nhiều trạng thái, không trùng phiên bản commit nào).
- Bỏ qua khác biệt kiểu xuống dòng (CRLF) trước khi đếm.
- Kết quả là một bảng: `phần · số dòng riêng · số dòng chỉ nguồn có`. Dòng riêng > 0 ⇒ bước 2; bằng 0 ⇒ bản đó là bản thừa.

## 2. Trộn phần riêng lên HS — TRƯỚC khi áp

- Dòng riêng là nâng cấp ⇒ đưa vào đúng phần của HS (một bản), tăng version. HS đã có bản tốt hơn ⇒ HS thắng.
- Tool bị sửa ⇒ đối chiếu bản HS với bản của repo trên **chính dữ liệu thật của repo** (báo cáo, file mẫu): kết quả phải
  giống hệt, chỉ khác ở chỗ đã chủ ý đổi. Lệch ⇒ không áp.
- Giá trị riêng của công ty / vùng ⇒ khoá vùng (`values.json`), không vào phần HS.

## 3. Pha 1 — ráp

- Sao lưu bề mặt harness (`docs/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`) và `git status` ra ngoài repo.
- Chụp trạng thái trước: bảng tính năng (luật, skill, trigger, guard), băm mọi file ngoài harness, lỗi `validate` đang có.
- `zemory sync --standard [--kit <NN>] --apply`.
- Bản chép không có dòng riêng (bước 1) ⇒ **xoá**. Có dòng riêng mà chưa trộn ⇒ dừng, quay lại bước 2.
- Tool đã cài bởi phần HS (`installs:`) mà repo đang giữ bản chép cũ không dòng riêng ⇒ thay bằng bản HS.

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
