---
id: Cons_106
aka: 01-6
name: few-llm-calls
version: 1
kind: content
---
# Cons_Core_106_FewLlmCalls zemory HẠN CHẾ gọi LLM — để TỐI ƯU TOKEN, không phải vì nguyên tắc chống-LLM.

**zemory HẠN CHẾ gọi LLM — để TỐI ƯU TOKEN, không phải vì nguyên tắc chống-LLM.** Model là thứ nằm **NGOÀI** zemory: trí tuệ là agent đang lái terminal, zemory là bộ nhớ + kỷ luật. **Không proxy model API** (`ANTHROPIC_BASE_URL`, rewrite history/cache) và **không sinh văn bản trong lõi**. Thứ tự ưu tiên khi cần một việc "có vẻ phải nhờ model": **① script/luật tất định làm được thì SCRIPT LÀM** (rẻ, lặp lại ra cùng kết quả, kiểm được) → ② không tất định được thì **AGENT LIÊN KẾT làm** (nó đã ở đó, token của phiên đang chạy) → ③ zemory tự gọi model **chỉ khi** ① và ② đều không xong, có ích lợi **đo được** (điều 12), user chốt, và **fail-open** khi thiếu model. Mỗi lời gọi là token của user — đó là lý do HẠN CHẾ. Embed/rerank local chỉ *đo nghĩa* (chấm điểm/xếp hạng), không *sinh văn bản* — luôn hợp lệ. **PHẠM VI (khoanh vùng chống hiểu lầm, 2026-07-25): điều này ràng buộc CHÍNH hệ zemory (memory · search · harness · graph) — KHÔNG áp cho APP mà harness dựng ra.** Chuẩn `03_STRUCTURE` cố tình có slot `ai/`·`agents/`·`tools/`·`evals/` để user/agent XÂY app LLM/AI tự do. *(gốc: build plan §2.5 §2.7, plan 05 §2, plan 06 §2.4 §4B; nới từ "KHÔNG BAO GIỜ" → "HẠN CHẾ" theo user chốt 2026-08-02)*

- **Chốt máy:** `rule-gates ⑩` (cấm endpoint model trong backend/src)
