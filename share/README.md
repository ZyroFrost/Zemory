# Zemory Shared Memory Bundle

> ⛔ **Thư mục này KHÔNG còn chứa gì ngoài file README.** Từ 2026-07-29:
> - **bundle `.enc`** — gitignored, **không** đi qua git. Chuyển qua Drive/USB. (Dòng ngoại lệ
>   `!share/global_memory.zemory.enc`, thêm `f59b2ac` 2026-07-10, đã gỡ.)
> - **chìa** — dời sang **`<thư mục DB>/share.key`**, gitignored. Tra: `zemory memory key path`.
>   (Dòng ngoại lệ `!share/share.key`, thêm `98bc126` 2026-07-01, đã gỡ; chìa đã xoay.)
>
> Luật: **git chứa SOURCE, không chứa DATA.** Gate `no-data-in-git` khoá lại.
> Thiết kế đầy đủ + vì sao KHÔNG có két master-password: **`docs/plan/16_share_key.md`**.

## Chìa ở đâu

`<thư mục DB>/share.key` — **cạnh DB, không phải trong repo**. `currentMemoryDir()` di động được
(`zemory memory relocate` dời DB khỏi ổ hệ thống), nên "chìa ở `data/`" là câu SAI trên máy chưa
relocate; ở đó DB nằm `~/.zemory/`. Máy thứ hai **vẫn phải cài từ mã nguồn** (`git clone` → `npm install` → `npm run build` → `npm link`) — `npm i -g zemory` KHÔNG chạy, gói chưa publish lên npm (đo 2026-08-03).

```powershell
zemory memory key path      # đường chuẩn của chìa
zemory memory key show      # dấu tay + nguồn (KHÔNG in chìa)
```

## Thêm máy — thứ tự BẮT BUỘC

Chìa phải có **trước** lần sync đầu (`sync` = scan → export → merge, mà export không chìa thì chặn ngay).

**Máy nguồn**
```powershell
zemory memory keygen        # sinh chìa mới vào đường chuẩn; in dấu tay
zemory memory sync          # scan + export baseline lên Drive
```
Rồi lưu chìa vào note riêng — **profile Windows hỏng là mất chìa, không còn đường phục hồi nào khác.**

**Máy khác**
```powershell
zemory memory key set       # dán chìa rồi Ctrl+Z (đọc STDIN), hoặc: type chia.txt | zemory memory key set
zemory memory key show      # PHẢI ra cùng dấu tay với máy nguồn — khác là gõ sai
zemory memory sync          # một lệnh làm cả hai chiều: merge bundle máy kia + export lane của mình
```

Chìa **là danh tính**: zemory local-only nên không có server nhận diện "cùng một user" — người mang
chìa vào từng máy. Chi tiết: `docs/plan/16_share_key.md §1`.

## Bundle

Sinh/mã hoá lại:
```powershell
zemory memory export <out.zemory.enc>          # dùng chìa ở đường chuẩn
zemory memory import <in.zemory.enc> --force   # giải vào DB local
```
`memory sync` tự lo cả hai qua thư mục Drive đã cấu hình (`zemory memory info` để xem).

Trước khi export, tuỳ chọn quét riêng tư:
```powershell
zemory memory redact --force
zemory memory forget --project "D:\some\project"           # dry-run
zemory memory forget --project "D:\some\project" --force
```
`forget` chỉ đổi DB/vector index dẫn xuất; **KHÔNG** xoá transcript gốc của agent.

## Không bao giờ

- Đưa chìa hoặc bundle vào git (kể cả private repo — cứ giữ một luật cho đơn giản).
- Đặt chìa **cùng thư mục** với bundle (Drive folder chứa `.enc` ⇒ đừng để chìa ở đó).
- Dán chìa vào chat với agent: phiên bị ingest vào chính `global_memory.db`, rồi theo bundle lên
  Drive ⇒ ai mở được **một** bundle sẽ đọc được chìa và mở **mọi** bundle. Vì vậy `key show` chỉ in
  dấu tay và `key set` đọc stdin chứ không nhận đối số.
