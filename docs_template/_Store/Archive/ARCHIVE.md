# Archive

Kệ giữ linh kiện đã bãi bỏ, để tra lại được. Một linh kiện chỉ vào đây khi người dùng duyệt bãi bỏ; số của nó
không bao giờ được cấp lại. Mỗi dòng: linh kiện · nơi nhận nội dung của nó.

## Đợt xếp nhà luật (plan/28 §0q)

Luật chung (`01_LAW/_Rule`):

| Linh kiện | Nội dung chuyển tới |
|---|---|
| Rule_Gate_05_GitignoreHides | `Rule_Gate_04_ScratchFiles` |
| Rule_Keys_09_ExtendNotOverwrite | `Rule_Gate_10_DestructiveOps` (ghi đè cũng là xoá) |
| Rule_Keys_12_TodoRecheck | `Rule_Keys_11_VerifyClaims` (sổ là khẳng định) · cách đo ba nguồn: `Skill_Harness_Audit` |
| Rule_Gate_13_TestRed | `Rule_Gate_01_DoneMeansRun` · cách phá mã: `Skill_Harness_Audit` |
| Rule_Keys_14_ChallengeDesign | `Rule_Keys_08_ClarifyFirst` |
| Rule_Core_15_DeliverableLayout | `Rule_Keys_62_DesignChangeApproval` · phần báo cáo BI: `Skill_PBI_Base` |
| Rule_Keys_16_SkillAdvises | `Rule_Gate_63_SkillTrigger` (đảo nghĩa) · vế gợi ý thiết kế: `Rule_Keys_62_DesignChangeApproval` |
| Rule_Gate_17_StructureIndexSync | `Rule_Gate_34_DocsFollowChange` · cổng `conform` |
| Rule_Gate_18_FollowStandard | bãi bỏ: mọi vế đã có nhà (slot · `Rule_Gate_35_OneHome` · `Skill_Dev_AppDesign`) |
| Rule_Core_19_HeavyBinaryLfs | `Rule_Gate_21_WhatEntersGit` |
| Rule_Gate_20_RealVsSampleData | `Rule_Gate_21_WhatEntersGit` · chỗ đặt: slot dữ liệu, slot mẫu |
| Rule_Gate_23_DocsIndexSeparator | hiến pháp riêng của repo mang công cụ (không phải luật chung) |
| Rule_Gate_25_SqlOneWay | `Rule_Gate_35_OneHome` (vế truy vấn, mang hook) |
| Rule_Gate_26_ViDiacritics | `Rule_Gate_27_HarnessLanguage` · hook mất dấu: `Rule_Gate_31_NoBrokenVietnamese` |
| Rule_Keys_28_OutputI18n | output CLI: `Rule_Gate_29_CodeLanguage` · i18n giao diện: `Skill_Dev_AppDesign` |
| Rule_Gate_30_AsciiNames | `Rule_Gate_29_CodeLanguage` (mang hook tên) |
| Rule_Core_32_SkillRegister | máy ráp bảng trigger từ `gate.json` của skill · cổng kho |
| Rule_Keys_33_DocsMdSource | `Rule_Gate_34_DocsFollowChange` · `reindex`: `Skill_Harness_SessionClose` |
| Rule_Gate_36_PlanSpecOnly | slot plan (`Docs_006_Plan`) · cổng `validate` |
| Rule_Gate_37_PlanLean | slot plan (`Docs_006_Plan`) · cổng `validate` |
| Rule_Keys_39_MemorySearch | `Rule_Keys_11_VerifyClaims` |
| Rule_Keys_40_MemoryVerify | `Rule_Keys_11_VerifyClaims` |
| Rule_Gate_41_ChangelogNewestFirst | slot harness (`Docs_005_Agent`) · cổng `validate` |
| Rule_Gate_42_ChangelogSupersede | slot harness (`Docs_005_Agent`) · cổng `validate` |
| Rule_Gate_43_ChangelogEntryShort | slot harness (`Docs_005_Agent`) · cổng `validate` |
| Rule_Gate_45_AskBeforeOtherRepo | `Rule_Gate_44_RepoScope` |
| Rule_Gate_46_OtherRepoReadOnly | `Rule_Gate_44_RepoScope` |
| Rule_Gate_47_OtherRepo | `Rule_Gate_44_RepoScope` (mang hook) |
| Rule_Gate_48_SessionTitle | `02_STRUCTURE/_Host/IDE` |
| Rule_Gate_49_PeerMessage | `02_STRUCTURE/_Host/IDE` |
| Rule_Gate_51_LogIsNotPublish | `Rule_Gate_50_Git` |
| Rule_Core_52_LocalCommitFree | `Rule_Gate_50_Git` |
| Rule_Gate_53_NoHistoryRewrite | `Rule_Gate_50_Git` |
| Rule_Gate_54_IrreversibleNeedsGate | `Rule_Gate_79_HarnessEdit` |
| Rule_Gate_55_HookGuard | `02_STRUCTURE/_Host/IDE` (bộ guard) |
| Rule_Gate_56_AllowFlagOnce | vế agent: `Rule_Keys_61_HookSafetyNet` · cơ chế: `02_STRUCTURE/_Host/IDE` |
| Rule_Gate_57_ProtectedKey | `02_STRUCTURE/_Host/IDE` (khoá `protected`) |
| Rule_Gate_58_OutsideGuard | `Rule_Gate_44_RepoScope` · cơ chế: `02_STRUCTURE/_Host/IDE` |
| Rule_Core_60_ProtectedReadonlyOnly | `02_STRUCTURE/_Host/IDE` (khoá `protected`) |
| Rule_Core_64_LocalBuildNoPush | `Rule_Gate_50_Git` |
| Rule_Gate_65_RawInputReadonly | `Rule_Gate_10_DestructiveOps` · ba chặng: slot `Data_132` → `Data_134` |
| Rule_Gate_66_PartNames | `README.md` của kho · phép kiểm tên của kho |
| Rule_Keys_68_MeasureRules | `Rule_Keys_11_VerifyClaims` · cách đo: `Skill_Harness_Audit` |
| Rule_Core_69_LedgerCheckAnytime | `Rule_Keys_11_VerifyClaims` |
| Rule_Gate_70_VersionPerPush | `Skill_Dev_Release` |
| Rule_Gate_72_ProtectedGlob | `02_STRUCTURE/_Host/IDE` (khoá `protected`) |
| Rule_Gate_73_GateEveryRule | `Skill_Harness_RuleGate` |
| Rule_Keys_74_CleanRoot | slot gốc (`Root_*`) · cổng `conform` |

Kệ hiến pháp cũ (`02_CONSTITUTION`) bãi bỏ cả kệ: kho không chở điều hiến pháp viết sẵn; hiến pháp là `Cons.md` mỗi
repo tự viết theo luật khung `01_LAW/_Cons`.

| Linh kiện | Nội dung chuyển tới |
|---|---|
| Cons_Core_01_SecretsInTree | `Rule_Gate_21_WhatEntersGit` |
| Cons_Core_02_OneSurfaceFilter | `Rule_Gate_35_OneHome` |
| Cons_Core_03_ReadRunningVersion | `Skill_Dev_Release` |
| Cons_Core_04_DocsMatchCode | `Rule_Gate_34_DocsFollowChange` |
| Cons_Core_05_OneNameDictionary | `Rule_Gate_35_OneHome` |
| Cons_Core_06_NoTechnicalNamesUi | `Rule_Gate_02_ReaderText` |
| Cons_Core_07_LayoutIsFixed | `Rule_Keys_62_DesignChangeApproval` · dòng tổng ở dưới: `Skill_Dev_AppDesign` |
| Cons_Core_08_DoNowNotBacklog | `Rule_Gate_38_TodoDoor` |
| PURPOSE.md | `Cons_Gate_09_Purpose` |
