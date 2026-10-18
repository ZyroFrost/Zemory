---
id: Skill_Frame_Own
name: frame-own
version: 1
type: process
frame: true
checked: [Skill_Harness_RuleGate, Skill_Task_Case, Skill_Harness_Structure]
description: The frame every skill of a repo's own follows (Skill_Own_<Name>). Not a skill to run - copy it into docs/agent/03_SKILLS/Skill_Own_<Name>/ and fill every section; never add, remove or rename a section.
---
# Skill_Frame_Own — The frame of a repo's own skill

> A repo's own skill (`Skill_Own_<Name>`, in `docs/agent/03_SKILLS/`) teaches one piece of work only this repo does, for example
> how one department calculates one measure. It is the repo's, not HS's. It keeps exactly the sections below, in this order, each
> in English then Vietnamese. A section the repo needs but the frame lacks ⇒ propose it to HS (`Rule_Gate_85_ProposeChecked`).
>
> Skill riêng của repo (`Skill_Own_<Tên>`, trong `docs/agent/03_SKILLS/`) dạy một việc chỉ repo này làm, ví dụ cách một phòng
> tính một chỉ số. Nó là của repo, không lên HS. Nó giữ đúng các mục dưới đây, đúng thứ tự, mỗi mục tiếng Anh trước rồi tiếng
> Việt. Repo cần một mục mà khung chưa có ⇒ đề xuất lên HS (`Rule_Gate_85_ProposeChecked`).

## Used for · Dùng cho
<department · report · case this skill serves> · <phòng · report · case mà skill phục vụ>

## Calculates · Tính gì
<the measure or result, in business words> · <chỉ số hay kết quả, bằng từ nghiệp vụ>

## Where · Ở đâu
<paths in the repo: model, measure, script, query> · <đường dẫn trong repo: model, measure, script, câu truy vấn>

## How · Cách làm
1. <step, with the number it should give> · <bước, kèm con số nó phải ra>

## How to check · Cách kiểm
<compared with which source, by which number> · <đối chiếu với nguồn nào, bằng số nào>

## Implements · Thi hành luật
- `<law or frame>` — <which part of this skill carries it out> · <phần nào của skill thi hành nó>
