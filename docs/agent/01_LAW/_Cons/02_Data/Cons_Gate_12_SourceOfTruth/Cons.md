---
frame: Cons_Gate_12_SourceOfTruth
status: written
---
# Nguồn sự thật

## Gốc
- Docs đã biên tập (luật · plan · sổ việc · changelog): file `.md` (điều 3).
- Trí nhớ theo phiên: transcript gốc của host; trong GM là bảng `sessions`/`messages` (điều 3).
- Phần harness dùng chung: HS (`docs_template/_Store`); bản trong từng repo là bản lắp từ HS.

## Khi lệch
- File `.md` thắng chỉ mục doc trong GM, vì chỉ mục dựng lại được từ file (điều 3).
- GM local của mỗi máy thắng thư mục kênh chung, vì kênh chỉ là chỗ gặp nhau (điều 16).
- HS thắng bản lắp trong repo, trừ phần repo khai là của riêng (`Rule_Gate_83_HarnessFromStore`).

## Dẫn xuất (không sửa tay)
FTS · vector · digest · chỉ mục doc · graph · `02_STRUCTURE/INDEX.md` — dựng lại bằng `zemory reindex` · `zemory memory embed --all` ·
`zemory sync`; graph tự dựng từ file mỗi lần `zemory graph` được gọi.

## Phải khớp
Số phiên và số tin của GM ở hai máy đã ghép đôi, so theo uuid của tin (phép diễn tập `plan/24 §6 ⑦`).

## Định nghĩa

| Thuật ngữ | Nghĩa | Định danh |
|---|---|---|
| GM (Global Memory) | bộ nhớ chung của mọi agent trên mọi máy | file `global_memory.db` |
| HS (harness store) | kho phần harness chuẩn mà mọi repo lắp từ đó | `docs_template/_Store` |
| Khối | gói tin mã hoá chở GM giữa hai máy | `p2pdb` buildOutgoing · inboxPut |
| Kênh chung | thư mục Drive nơi các máy gặp nhau | `G:/My Drive/Global Memory` (cấu hình `driveDir`) |
