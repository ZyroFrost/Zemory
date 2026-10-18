---
id: Rule_22
aka: 02-22
name: fail-loud
version: 8
kind: judgment
code: 02_Work
---
# Rule_Keys_22_FailLoud — A failure must show

## What
A failure is never hidden: a dead background process takes its surface down with it or shows a visible error; a stage that dies
stops the chain with a non-zero exit; a half-written product is a failure and is not delivered.

## When
- Building or running a background process · launcher · multi-step pipeline · scheduled job · script · tool window.

## Do
1. Background dies ⇒ the surface that depends on it stops too, or shows a visible error; never an empty shell that looks alive.
2. A stage dies midway ⇒ exit code ≠ 0 and the stage is named. A readiness check fails ⇒ stop the chain; never export a file with
   numbers missing.
3. A product written halfway ⇒ treat it as a failure; do not deliver it.

## Example
- Situation: a multi-stage pipeline exports a report; the data-pull stage dies midway.
- ✗ Wrong: the later stages still run, export a file with missing numbers, exit with 0, and the tool window still says "running".
- ✓ Right: the chain stops at once, exits non-zero, the message names the broken stage; the half-written file is not delivered.

## Check
- Keyword reminder: a request about a pipeline, job, background run, hang or crash shows this law; the rest is judgment.

## Luật là gì
Lỗi không bao giờ được giấu: nền chết thì bề mặt dừng theo hoặc báo lỗi thấy được; chặng chết thì chuỗi dừng với mã thoát khác 0;
sản phẩm ghi dở là lỗi và không giao đi.

## Khi nào áp
- Dựng hay chạy tiến trình nền · launcher · pipeline nhiều chặng · job theo lịch · script · cửa sổ tool.

## Phải làm gì
1. Nền chết ⇒ bề mặt phụ thuộc nó dừng theo, hoặc báo lỗi thấy được; không để vỏ rỗng trông như đang chạy.
2. Chặng chết giữa chừng ⇒ mã thoát ≠ 0, nêu tên chặng. Cổng sẵn sàng hỏng ⇒ dừng chuỗi; không xuất file thiếu số.
3. Sản phẩm ghi dở ⇒ coi là lỗi; không giao đi.

## Ví dụ
- Tình huống: pipeline nhiều chặng xuất báo cáo; chặng kéo dữ liệu chết giữa chừng.
- ✗ Sai: các chặng sau vẫn chạy, xuất file thiếu số, mã thoát 0, cửa sổ tool vẫn hiện "đang chạy".
- ✓ Đúng: chuỗi dừng ngay, mã thoát khác 0, thông báo nêu tên chặng hỏng; file ghi dở không giao đi.

## Máy kiểm
- Nhắc theo từ khoá: lời yêu cầu nói tới pipeline, job, chạy nền, treo hay crash thì hiện luật này; phần còn lại là phán đoán.

## Links · Liên kết
- Related · Liên quan: `Rule_Gate_01_DoneMeansRun` — a half-done run is not done · chạy dở không phải xong
