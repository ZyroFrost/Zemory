---
name: plan-trim
description: Trim the specs in docs/plan when they grow past the cap, WITHOUT losing ideas — back up, draft outside the repo, have an independent reviewer restore every lost idea against the original and the code, then apply. Use when `zemory validate` warns that a spec or docs/plan is over the line cap, or when the user asks to shorten, trim or tidy the plans. Vietnamese triggers - "gọt plan", "dọn plan", "plan dài quá", "rút gọn plan", "plan vượt trần", "plan quá trần".
---

# plan-trim — gọt plan vượt trần mà không mất ý

> Luật nằm ở `02_RULES §Tài liệu` (gạch **PLAN PHẢI GỌN**): plan giữ hướng đã chốt + điểm còn mở, lịch sử
> sang `06_CHANGES`, trần một spec / cả `docs/plan` do `zemory validate` canh. Skill này chỉ là **cách làm**.
> Sinh từ hai đợt gọt thật: 2026-10-05 (lượt soát bắt ~120 ý bị mất) và 2026-10-08 (bốn spec, soát lại ~140 ý,
> bắt 5 chỗ spec nói sai so với code).

## Khi nào dùng
- `zemory validate` báo `plan: N spec(s) over … lines` hoặc `docs/plan is … lines`.
- User bảo gọt / dọn / rút gọn plan.
- **Chỉ gọt spec ĐANG VƯỢT trần.** Spec dưới trần thì để yên — gọt cho đẹp là đổi rủi ro mất ý lấy không gì cả.

## Một "ý" là gì — thứ KHÔNG được mất
Quyết định + lý do một câu · luật user chốt và câu nguyên văn đã chốt nó · con số biện minh cho một quyết định
hay một lần bác · bẫy (`⚠` · `🔴` · "bẫy") · phương án đã bỏ (`Đã bỏ` · `BÁC` · "đừng đề xuất lại" — nén còn MỘT
dòng: bỏ gì + vì sao, chúng chặn agent sau đề xuất lại) · dữ kiện giao thức/định dạng mà code dựa vào · cổng
nghiệm thu và ca ÂM · điểm còn mở / chưa đo · số mục (`§N`) mà file khác đang dẫn chiếu.
**Không phải ý** (cắt được): tường thuật một phiên đã đi tới đó thế nào · cùng một sự thật kể ở chỗ thứ hai (giữ
một nhà, chỗ kia trỏ về) · số trung gian mà chính file đã ghi là bị thay.
**Sơ đồ vẽ tay** (cây thư mục · bảng · `mermaid`) là phần chính của plan — giữ, nén chữ quanh nó chứ đừng xoá nó.

## Quy trình

**1. Lùi bản gốc TRƯỚC khi đụng gì.** Chép nguyên `docs/plan/*.md` vào `docs/agent/archive/plan-<YYYY-MM-DD>/`,
kiểm từng file khớp byte. Không có bản gốc thì không soát được mất ý.

**2. Tìm số mục đang bị dẫn chiếu.** `grep -rn "plan/NN §" docs backend` (và thư mục mã của repo). Mọi tiêu đề
được dẫn chiếu phải giữ nguyên số và tên.

**3. Viết bản nháp NGOÀI repo.** Một spec một bản nháp, ghi vào thư mục nháp của phiên. Giao cho subagent thì
dặn rõ: **chỉ ghi bản nháp, không sửa file trong repo** — sửa thẳng từng đoạn thì chốt đọc-trước-khi-ghi coi
mỗi lượt sửa là "người khác sửa" và mọi agent trong phiên bị chặn liên tục.

**4. Lượt soát ĐỘC LẬP — bắt buộc, không bỏ.** Một agent khác (không phải người viết nháp) đọc TRỌN bản gốc và
bản nháp, đi từng mục:
- liệt kê từng ý bản nháp làm rơi, đưa lại vào ở dạng nén;
- **đối chiếu với code** mọi khẳng định trạng thái (đã bật / đã dựng / chưa làm) — bản gốc có thể đã cũ hơn
  code, bản nháp có thể tự suy thêm; ghi đúng sự thật của code;
- kiểm mọi chỗ người viết nháp tự thêm hoặc tự suy, giữ cái đúng, bỏ cái sai.

**5. Không lách thước.** Trần đo bằng số dòng ở khổ chữ thường của repo (~130 ký tự). Gói dòng dài cho đủ số
dòng là không gọn thật — nội dung không đổi, chỉ khó đọc hơn. Đo kèm số ký tự để biết bản nháp thật sự nhỏ đi.

**6. Không xuống được trần mà không mất ý ⇒ DỪNG ở mức trung thực và đề xuất.** Báo số dòng thật + ý nào sẽ phải
bỏ nếu ép tiếp; đề xuất nâng trần (khoá `thresholds.plan_spec_lines` / `plan_total_lines`) hoặc tách spec nếu
nó gánh hai bài toán khác nhau. **User quyết** — không tự bỏ ý để đạt số, không tự đổi trần.

**7. Áp.** Thay file trong repo bằng bản đã soát. Ghi đè cả file cần lời cho phép của user (cờ guard
`.allow-overwrite`) — xin trước, gỡ cờ ngay sau. Giữ kiểu xuống dòng của file gốc.

**8. Đọc lại TRỌN bản cuối** (soát lần cuối, và chốt đọc-trước-khi-ghi đòi đọc lại file vừa thay), rồi chạy
`zemory paths check` (0 đường mới chết) và `zemory validate`.

**9. Ghi `06_CHANGES`:** spec nào, trước/sau bao nhiêu dòng, lượt soát đưa lại bao nhiêu ý, chỗ nào sửa cho khớp
code, đường dẫn bản gốc.

## Bẫy đã gặp
- Bản nháp tự thêm "trạng thái ✅" hoặc một mục tổng hợp mới — lượt soát phải kiểm, đừng nhận nguyên.
- Spec ghi một thiết kế (bảng mới, mức đã chạy một nửa) mà code đã làm khác — gọt là lúc sửa cho khớp code.
- Spec nhiều bảng đo (mỗi quyết định là một phép đo) không xuống thấp được — bảng số chính là bằng chứng chống đề
  xuất lại; đó là lý do đề xuất nâng trần, không phải lý do xoá bảng.
