#!/usr/bin/env node
// Language-discipline probe for the audit skill, face 12.
// Three measurements over every git-tracked text file:
//   1. names   - file and directory names that are not plain English ASCII
//   2. idents  - declared identifiers that are not plain English ASCII
//   3. noDiacritic - Vietnamese written without diacritics (banned everywhere)
// Report only, never a gate: it prints what it scanned so a clean run cannot be
// mistaken for "scanned nothing". Verify every hit by hand (audit rule 2).
//
// Usage: node .claude/skills/audit/scripts/lang-scan.mjs [repoRoot] [--all]
//        --all prints every hit instead of the first 60 per face.

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.cwd()
const showAll = process.argv.includes('--all')

// Tier A - syllables with no valid zero-diacritic reading in Vietnamese. One is enough to flag.
const A = new Set(['khong', 'duoc', 'nguoi', 'viec', 'tieng', 'nhieu', 'truong', 'thuong', 'phuong',
  'huong', 'duong', 'luong', 'tuong', 'chuong', 'muon', 'ket', 'thiet', 'dien', 'diem',
  'kiem', 'hien', 'chuyen', 'quyen', 'tuyen', 'nguon', 'thuoc', 'buoc', 'cuoc', 'nuoc', 'truoc',
  'suot', 'luot', 'doan', 'loai', 'ngoai', 'xuat'])
// Demoted OUT of tier A once mixed lines started being read: each of these IS a valid bare syllable,
// so tier A's own definition never fitted them - `giai đoạn` · `khoan thai` · `hoan nghênh` · `toan
// tính` are correct spelling with no mark on that syllable. They cost two false positives on the
// negative control the moment the whole-line diacritic exemption was lifted.
const A_DEMOTED = ['giai', 'toan', 'hoan', 'khoan']
// Tier B - frequent function words. Weak on their own; 4 in one line is the real signal.
const B = new Set(['va', 'la', 'cua', 'cho', 'voi', 'tren', 'trong', 'cac', 'cai', 'nay', 'se',
  'da', 'dang', 'phai', 'neu', 'thi', 'ma', 'roi', 'moi', 'cung', 'chi', 'tu', 've', 'theo',
  'truoc', 'khi', 'luc', 'ra', 'vao', 'len', 'xuong', 'hoac', 'nhu', 'nen', 'de', 'bi', 'co', 'toi',
  ...A_DEMOTED])
// English homographs of stripped-Vietnamese syllables. Counting these flags plain English prose:
// the first run of this probe reported 74 English-only lines because of do / so / can / ten / van.
const EN = new Set(['do', 'so', 'can', 'ten', 'ban', 'van', 'no', 'to', 'in', 'on', 'at', 'be',
  'me', 'we', 'he', 'con', 'as', 'is', 'it', 'an', 'a', 'the', 'not', 'one', 'man', 'end', 'set',
  'get', 'run', 'row', 'cot', 'sau', 'hay', 'den', 'nam', 'bang', 'dong', 'loi', 'tinh', 'tong',
  'thu', 'muc', 'danh', 'sach', 'tep', 'gio', 'ngay', 'thang'])

const DIACRITIC = /[À-ỹ]/
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'])
const TEXT_EXT = new Set([...CODE_EXT, '.md', '.json', '.html', '.css'])
// Paths exempt by design. Add a line here only with the reason next to it.
const EXEMPT = [
  /docs_template\/.*\/skills\/write-docx\/reference\//, // deliberately ASCII Python samples
]
// The archive IS scanned. 02_RULES forbids rewriting an old entry, but PUTTING THE DIACRITICS BACK
// adds nothing and removes nothing - it only makes the same sentence readable (user ruling
// 2026-09-12). Changing what an entry SAYS is still forbidden.

const files = execSync('git ls-files', { cwd: root, maxBuffer: 64 * 1024 * 1024 })
  .toString().split('\n').filter(Boolean).filter(f => !EXEMPT.some(re => re.test(f)))

const out = { names: [], idents: [], noDiacritic: [] }
const scanned = { files: 0, code: 0, lines: 0, decls: 0, parts: 0 }

const words = s => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z]+/).filter(Boolean).map(w => w.toLowerCase())
// Count DISTINCT syllables: one weak word repeated is not evidence. A table row repeating
// "cho qua" four times tripped the threshold with a single word.
// The three sets above were tuned for PROSE, where `danh` · `sach` · `tong` · `ngay` · `dong` had
// to be excused or every English sentence lit up. Lending that same excuse to the IDENTIFIER face
// is why this probe once reported 37 Vietnamese identifiers in a front-end that has about 350:
// `danhDauTrich` · `tongCa` · `cauHoi` · `dapAn` · nearly all of `popover.js` went unseen. An
// identifier is a deliberate naming choice, so it gets its own vocabulary and a much shorter
// excuse list - only words people really do name things with.
const A_ID = new Set([...A,
  'danh', 'sach', 'cham', 'chon', 'hong', 'dap', 'hoi', 'nhan', 'dau', 'cua', 'dung', 'tra', 'phu',
  'tong', 'cau', 'truc', 'xoa', 'xem', 'luu', 'giu', 'ghi', 'keo', 'cay', 'khop', 'nhom', 'goc',
  'lech', 'lop', 'lich', 'lui', 'tien', 'quet', 'phut', 'giay', 'vong', 'trich', 'kien', 'pham',
  'khu', 'chuan', 'nha', 'nhip', 'xin', 'gon', 'chong', 'noi', 'thay', 'sua', 'xep', 'ngan', 'dai',
  // `doc` (đọc) is deliberately ABSENT: the negative control below ran this face over an
  // all-English backend and 21 of its 22 hits were the English `doc` - docPath · docId · docFreq.
  'rong', 'cao', 'trai', 'giua', 'duoi', 'chay', 'tat', 'doi', 'tung', 'nang', 'ngay', 'gio',
  'thang', 'dong', 'loi', 'tinh', 'muc', 'tep', 'bang', 'nam', 'cuon', 'khoi', 've', 'moi'])
const EN_ID = new Set(['do', 'so', 'can', 'ten', 'ban', 'van', 'no', 'to', 'in', 'on', 'at', 'be',
  'me', 'we', 'he', 'con', 'as', 'is', 'it', 'an', 'a', 'the', 'not', 'one', 'man', 'end', 'set',
  'get', 'run', 'row'])

const hits = (toks, forIdent) => (forIdent ? {
  a: [...new Set(toks.filter(t => A_ID.has(t) && !EN_ID.has(t)))],
  b: [...new Set(toks.filter(t => B.has(t) && !EN_ID.has(t)))],
} : {
  a: [...new Set(toks.filter(t => A.has(t) && !EN.has(t)))],
  b: [...new Set(toks.filter(t => B.has(t) && !EN.has(t)))],
})

// Identifiers must be read from code with comments and string literals removed: the first run
// flagged 4 declarations that were really the word "const" sitting inside a Vietnamese comment.
function stripCommentsAndStrings (src, ext) {
  // Python comments start with #. Without stripping them, the prose "... interface thì có xanh"
  // reads as a declaration named `thì`. Only do it for .py: # is legal JS/CSS syntax.
  // Triple-quoted docstrings first, then # comments: prose inside them is not code.
  if (ext === '.py') src = src.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, ' ').replace(/#[^\n]*/g, ' ')
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``')
    .replace(/'(?:\\[\s\S]|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\[\s\S]|[^"\\\n])*"/g, '""')
}

const seen = new Set()
for (const f of files) {
  for (const part of f.split('/')) {
    if (seen.has(part)) continue
    seen.add(part)
    scanned.parts++
    if (/[^\x20-\x7E]/.test(part)) { out.names.push([f, part, 'non-ASCII']); continue }
    // A generated hash is not a word: Power BI names visual folders `0020fa6de5da33e10866`,
    // which splits into "fa · de · da" and looked like two Vietnamese syllables.
    if (/^[0-9a-f]{12,}$/i.test(part.replace(/\.[^.]+$/, ''))) continue
    // A file name is a naming choice too, so it reads the identifier vocabulary, not the prose one.
    const { a, b } = hits(words(part.replace(/\.[^.]+$/, '')), true)
    if (a.length >= 1 || b.length >= 3) out.names.push([f, part, [...a, ...b].join(',')])
  }
}

for (const f of files) {
  const ext = path.extname(f)
  if (!TEXT_EXT.has(ext)) continue
  let src
  try { src = fs.readFileSync(path.join(root, f), 'utf8') } catch { continue }
  scanned.files++
  const lines = src.split(/\r?\n/)
  scanned.lines += lines.length

  if (CODE_EXT.has(ext)) {
    scanned.code++
    const code = stripCommentsAndStrings(src, ext)
    const re = /(?:const|let|var|function|class|interface|type|enum|def)\s+([A-Za-z_$-￿][\w$-￿]*)/g
    let m
    while ((m = re.exec(code))) {
      scanned.decls++
      const name = m[1]
      const { a, b } = hits(words(name), true)
      const bad = /[^\x00-\x7F]/.test(name) ? 'non-ASCII' : (a.length >= 1 || b.length >= 2 ? [...a, ...b].join(',') : null)
      if (bad) out.idents.push([f, code.slice(0, m.index).split('\n').length, name, bad])
    }
  }

  let inBlock = false // inside a docstring or a /* */ block, carried line to line
  lines.forEach((raw, i) => {
    let text = raw
    if (CODE_EXT.has(ext)) {
      // `#` starts a comment in Python only. In JS/CSS it is a selector or a colour, so treating it
      // as a comment marker read `$$('#sc-tree .sc-i')` as prose.
      const re = ext === '.py' ? /(?:#|^\s*"""|^\s*''')\s*(.*)$/ : /(?:\/\/|\/\*|^\s*\*)\s*(.*)$/
      const c = raw.match(re)
      // Matching only the line that OPENS a block read the first line of a docstring and dropped
      // the rest of it: `build_access_xlsx.py:7` sat four lines inside a module docstring and was
      // invisible. `inBlock` carries the state down, so the body of a docstring or a /* */ comment
      // is read as prose too.
      const wasInside = inBlock
      if (ext === '.py') {
        if (((raw.match(/"""|'''/g) || []).length) % 2) inBlock = !inBlock
      } else if (/\/\*/.test(raw) && !/\*\//.test(raw)) inBlock = true
      else if (/\*\//.test(raw)) inBlock = false
      if (!c && !wasInside) return
      text = c ? c[1] : raw
    }
    // A line is NOT exempt just because it carries one mark. `console.css:1764` mixed
    // "MOT BEN chiu trach nhiem khoang cach" with "ĐI SAU" on the same line and stayed invisible
    // through a full pass of this probe. Drop the words that ARE accented - those are already
    // correct - and judge what is left. On such a mixed line only tier A counts: correct Vietnamese
    // legitimately contains bare `cho` · `khi` · `chi` · `ra`, so the tier-B count means nothing
    // there, while every tier-A syllable is by definition impossible without a mark.
    const mixed = DIACRITIC.test(text)
    // A long base64 blob spells out syllables by chance: an embedded icon scored 5 "Vietnamese" hits.
    if (/[A-Za-z0-9+/]{60,}={0,2}/.test(text)) return
    // Strip what is DATA rather than prose, before judging. The rule exempts names other people
    // assigned, and "fixing" them breaks the loader that looks them up:
    //   · e-mail addresses and URLs  (nguoi.khac@congty.example)
    //   · identifier-shaped tokens   (ma_ct · stt_rec · total_so_luong · sl_nhap)
    //   · bracketed SQL identifiers  ([ngay_ct])
    const prose = text
      // Backticks mark code, paths and file names by convention - that is data, not prose.
      // `20260819_SASIN_ECOM_HOAN-HUY_T07-2026.xlsx` is the delivered workbook's real name.
      .replace(/`[^`]*`/g, ' ')
      .replace(/[\w.+-]+@[\w.-]+/g, ' ')
      .replace(/\b\w+:\/\/\S+/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\b[A-Za-z]+(?:_[A-Za-z0-9]+)+\b/g, ' ')
      // Same reasoning as the backticks, one step further out: a QUOTED span is being cited, not
      // written. `Vẫn KHÔNG dấu "TAM"/"KHONG GUI"` is a rule ABOUT a file name that must stay bare.
      .replace(/"[^"]*"/g, ' ')
    // Only NOW drop the accented words, never before the step above: they carry the delimiters.
    // Filtering first tore the backticks off `\`[Mì tr?n tuong den Super Cay]\`` - the opening
    // backtick rode away on `Mì` - and the probe read the broken data inside as sloppy prose.
    const toks = words(mixed ? prose.split(/\s+/).filter(w => !DIACRITIC.test(w)).join(' ') : prose)
    if (toks.length < 3 && !mixed) return
    let { a, b } = hits(toks)
    // A PROPER NOUN written without diacritics is a name, not sloppy prose: "DuAn 324 An Duong
    // Vuong" is how the store is registered. Only count a syllable that appears in lower case.
    const lower = words(prose.replace(/\b[A-Z][a-z]+/g, ' '))
    a = a.filter(t => lower.includes(t))
    b = b.filter(t => lower.includes(t))
    if (a.length >= 1 || (!mixed && b.length >= 4)) {
      out.noDiacritic.push([f, i + 1, raw.trim().slice(0, 110), [...new Set([...a, ...b])].join(',')])
    }
  })
}

console.log(`SCANNED  files=${scanned.files} code=${scanned.code} lines=${scanned.lines} decls=${scanned.decls} path-parts=${scanned.parts}`)
const perFile = {}
for (const r of out.noDiacritic) perFile[r[0]] = (perFile[r[0]] || 0) + 1
const ranked = Object.entries(perFile).sort((x, y) => y[1] - x[1])
console.log(`\n=== noDiacritic by file: ${out.noDiacritic.length} lines in ${ranked.length} files ===`)
for (const [f, n] of (showAll ? ranked : ranked.slice(0, 25))) console.log(`  ${String(n).padStart(4)}  ${f}`)
for (const [face, rows] of Object.entries(out)) {
  console.log(`\n=== ${face}: ${rows.length} hits ===`)
  for (const r of (showAll ? rows : rows.slice(0, 60))) console.log('  ' + r.join(' | '))
  if (!showAll && rows.length > 60) console.log(`  ... +${rows.length - 60} more (--all)`)
}
