---
id: Rule_32
aka: 02-32
name: skill-register
version: 2
kind: judgment
from: _Store/01_RULES/Rule_Core_32_SkillRegister @v2 #75c9caa54f9a
---
# Rule_Core_32_SkillRegister Quy trình lặp lại là một skill, đăng ký đủ chỗ

- Quy trình lặp lại ⇒ một skill: `.claude/skills/<tên-tiếng-anh>/SKILL.md`, frontmatter có `name` + `description` (`description` quyết định skill có được gọi).
- Đăng ký thêm hai chỗ: một dòng ở `04_SKILLS` §2 và một dòng ở bảng trigger `AGENTS.md`.
- Thiếu một chỗ ⇒ skill mồ côi.
- Playbook không quay lại `04_SKILLS`.
