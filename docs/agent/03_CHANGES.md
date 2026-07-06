<!-- GENERATED from global_memory.db by zemory · do not hand-edit · use `zemory changelog add` -->
# Change Log

> Mới nhất ở trên. Đảo/thay quyết định cũ → `> 🔄 Supersede:`.

---

## [2026-07-05] — UI dialog harness: implement 3 size cố định (S/M/L) trong ui-page.ts

Implement rule §Thiết kế UI (3 size dialog cố định) vào code UI cockpit — trước đó mới có rule + hệ 2 size ad-hoc (`.modal` 380px cứng + `.modal.big` 920px). `src/ui-page.ts`:
- `.modal` thành flex-column + trần chung `max-width:94vw; max-height:90vh; overflow:hidden` → dialog KHÔNG còn tự phình theo nội dung (trước `.modal` không có trần cao nên `syncBox` phình được).
- 3 size cố định thay `.modal.big`: `.modal.s` (`min(94vw,max(380px,30vw))`, ≤45vh) · `.modal.m` (560px/50vw, ≤70vh) · `.modal.l` (820px/72vw, ≤85vh). Min-width 380/560/820 qua `max()`, co theo vw ở màn lớn, canh giữa sẵn có.
- Gán size theo lượng nội dung: Setup actions → S · Cross-machine sync → M · Doc viewer + Session thread → L (bỏ class `big`).
- Cuộn TRONG dialog: `.doc-body`/`.session-body`/`.sync-box` → `flex:1; min-height:0; overflow:auto`; `.mtitle` cố định. Bỏ cột cứng `max-height:72vh`.
- Size do loại nội dung quyết định lúc mở (không đổi động) → không có state size để lưu; persist chỉ áp cho panel kéo-resize (đã có sẵn).
- typecheck + lint + build xanh, dist cập nhật. Chưa thêm test CSS (không có harness test cho style).
