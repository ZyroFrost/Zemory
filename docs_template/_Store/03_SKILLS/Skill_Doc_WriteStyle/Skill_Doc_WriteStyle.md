---
id: Skill_Doc_WriteStyle
aka: write-style
name: doc-write-style
version: 9
type: process
description: Strict prose rules for reader-facing text (reports, emails, announcements, content, docs handed to people) — distilled from Wikipedia's "Signs of AI writing" into hard bans, so the result reads like a careful human wrote it. Use BEFORE drafting any text a person will read, and as a revision checklist afterwards. Do not use for code comments or the harness docs themselves (those follow the repo's own language rules). Vietnamese triggers - "viết văn bản", "soạn báo cáo", "viết email", "viết content", "viết bài", "văn phong", "giọng AI quá", "viết cho tự nhiên", "bớt giọng máy".
---

# write-style — the writing-style rules for text handed to readers

> Trigger: about to WRITE (or edit) any text for a PERSON to read — reports · emails · announcements ·
> content · documents handed out. Source of the rules: distilled from **Wikipedia:Signs of AI writing** —
> the Wikipedia community page used to recognise articles written by AI; here turned around into
> BANS when writing. The aim is **text that reads as a careful person wrote it** — not dodging a detector.
> When the content goes into a `.docx` file → building the file follows `write-docx/`; this skill only handles the WORDS.
>
> The Vietnamese phrases below are examples of the banned patterns in Vietnamese text; they stay in Vietnamese.

## BANS — check item by item, a match gets FIXED, no excuses

**§1 NO puffery.** Do not crown importance, legacy, "the bigger picture" yourself.
- EN: *stands as a testament · plays a vital/pivotal role · rich cultural heritage · vibrant ·
  nestled · boasts · breathtaking · must-visit*
- VI: *"khẳng định vị thế" · "đóng vai trò quan trọng" · "nâng tầm" · "đậm đà bản sắc" ·
  "toạ lạc tại" · "sở hữu vẻ đẹp" · "điểm đến không thể bỏ qua"*
- Replace with: **facts + figures + proper names**. When it matters, let the facts speak.

**§2 NO analysis tacked on with an -ing clause / "qua đó".** A sentence that has told its story must not get a hollow
interpretive tail: *highlighting… · underscoring… · ensuring… · contributing to…* — VI: *"qua đó
khẳng định…" · "góp phần nhấn mạnh…" · "thể hiện tầm quan trọng của…"*. Real analysis
is written as A SEPARATE SENTENCE with a subject + evidence; none ⇒ cut it.

**§3 NO vague attribution.** *Industry reports · experts argue · observers have cited · several
sources* — VI: *"nhiều chuyên gia cho rằng" · "được đánh giá là" · "theo ghi nhận"*. The rule: say
WHO said it, name **exactly who, where, when** — when you cannot, it is your own view; write it plainly
as your own view, or drop it.

**§4 NO parroted sentence moulds.**
- *not only X but also Y* / "không chỉ… mà còn…" — at most ONCE in the whole text, best not at all.
- *It's not X, it's Y* / "không phải là X, mà là Y" — the negate-to-emphasise pattern, cut it.
- **The magic trio** (rule of three): "nhanh, gọn, hiệu quả" — two or four is fine too, do not mechanically
  use three.
- The mould "Despite challenges… future outlook" / "Dù còn thách thức… hứa hẹn trong tương lai" — cut it.
- An ending that sums up what was just said (*In conclusion / Overall* / "Tóm lại / Nhìn chung") — a
  short text does not need to summarise itself.

**§5 PLAIN VERBS.** "is / has / does" instead of the roundabout: *serves as · stands as · functions as ·
marks · features · offers* — VI: *"đóng vai trò như" · "được xem là" · "mang trong mình"*.
"X is library Y" beats "X serves as a library solution Y".

**§6 BANNED WORDS (AI vocabulary).** Met ⇒ replace with an ordinary word: *delve · tapestry · landscape (metaphor) ·
pivotal · crucial · intricate · testament · underscore · showcase · leverage · robust · seamless ·
comprehensive · foster · empower* — VI: *"đào sâu" · "bức tranh toàn cảnh" · "then chốt" ·
"toàn diện" · "tối ưu hoá" (when it only means "make better") · "mượt mà" · "trọn vẹn" ·
"đồng hành cùng"*. Sentence-opening connectives (*Additionally · Moreover · Furthermore* / "Bên cạnh đó" ·
"Hơn nữa" · "Ngoài ra") — at most ONCE; two sentences in a row both opening with a connective is an error.

**§7 FORMATTING.**
- Em-dash (—): when tempted, try a comma, parentheses, or splitting the sentence first; more than 1–2 per
  paragraph is a sign.
- **Bold** scattered across the text: banned. Bold at most a few phrases REALLY needing a quick lookup.
- Bulleting everything: a connected argument must be a PARAGRAPH; bullets only for real lists.
- Decorative emoji, horizontal rules splitting sections, Title Case in Vietnamese (capitalising Each Word), headings
  repeating the title, tables for things that are not table data: all banned.

**§8 CLEAN OF ARTIFACTS — check before sending.** None may remain: *As an AI… · I hope this helps ·
Certainly! · as of my knowledge cutoff* · fill-in placeholders `[customer name]` · markup debris
(`contentReference` · `oaicite` · `turn0search` · `[cite: 1]`) · markdown leaking where markdown does not
render (`**bold**` in a plain email) · curly and straight quotes mixed in the same text.

**§9 HUMAN RHYTHM.** Sentences and paragraphs must VARY in length — evenly matched is the machine's voice. Short sentences are allowed.
A long sentence followed by a short one is good rhythm. Do not open every paragraph the same way; do not end
each item with a mini summary sentence.

**§10 SPEAK WITH FIGURES, NAMES, DATES.** A claim worth making comes with checkable facts — "40% faster
on benchmark X" instead of "significantly improved performance". No figure ⇒ lower the claim
to exactly what you know.

## Report mail — a fixed layout

```
Dear <name>,

<body>

Best regards,
<signature>
```

- `Dear <name>,` stands on its own line, one blank line before the body; `Best regards,` and the signature are two lines. HTML: each block one
  `<p>`, the signature `<p>Best regards,<br>{signature}</p>`.
- The default signature and Cc recipients come from the region's `values.json`: `mail_signature` · `mail_cc` for mail sent from a personal mailbox;
  `shared_mailbox` · `shared_mailbox_signature` for mail sent from a shared mailbox — that mail is signed with the unit's name and has no default Cc.
- The layout is not the tone: the form of address follows the recipient's standing, settled per case in `spec.md`.

## How to apply

1. **Write a free draft** — do not check while writing, it gives stiff prose.
2. **Check back through each § as a checklist** (1→10). Every match: FIX it, no excuse that "this one is reasonable".
3. **Read one paragraph aloud.** Sounds like a person talking ⇒ passes; sounds like a commentary ⇒ back to the §.
4. Text handed out (customers · managers · public): run the checklist A SECOND TIME on the final copy — edited copies
   tend to grow §4/§6 errors back.

## Boundaries — read so as not to apply it in the wrong place

- **A single sign is not a crime** — the source page itself names a group of "ineffective indicators".
  The rule fires when signs PILE UP; one lone "comprehensive" needs no emergency meeting.
- The harness's internal technical docs (rules · specs · changelog) keep the NORMATIVE style of the repo's language
  rule — the two standards do not override each other; this skill is for text HANDED TO READERS.
- Domain terms stay as they are, untranslated, not dodged with fancy synonyms.

**Forbidden:** handing out text without running the checklist · using this skill to "dodge detectors" while skipping the quality of the
content (the right order: content with facts FIRST, style AFTER) · fixing the tone in a way that changes the original meaning.

## Implements · Thi hành luật
- `Rule_Gate_02_ReaderText` — the writing-style rules for every text a reader gets · luật văn phong cho mọi văn bản người đọc nhận
