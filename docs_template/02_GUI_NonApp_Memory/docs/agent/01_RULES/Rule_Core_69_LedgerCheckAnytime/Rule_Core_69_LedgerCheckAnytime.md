---
id: Rule_69
aka: 02-69
name: ledger-check-anytime
version: 2
kind: judgment
from: _Store/01_RULES/Rule_Core_69_LedgerCheckAnytime @v2 #c4768d925182
---
# Rule_Core_69_LedgerCheckAnytime Soát sổ lúc chốt phiên theo `Rule_Keys_12_TodoRecheck`

- Soát hoặc ghi `05_TODO` · `06_CHANGES` · plan lúc chốt phiên ⇒ áp `Rule_Keys_12_TodoRecheck`.
- `Rule_Keys_12_TodoRecheck` áp mọi lúc, không riêng lúc chốt phiên.
