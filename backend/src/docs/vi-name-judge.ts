// Rule 30 (plan/28 §0o) — a NAME written in Vietnamese without its marks (`DieuMotBatBien`, `bao-cao-thang`).
//
// The prose judge of rule 26 cannot see it: it reads a capitalised word as a proper noun, and every component of a
// CamelCase name is capitalised. A name is judged by Vietnamese syllable shape instead — every Vietnamese syllable is an
// onset (optional) plus one rhyme from a closed set, so `dieu` = d + ieu and `bien` = b + ien fit, while `read`, `design`,
// `door`, `dictionary` fit no rhyme. A name of two or more parts where EVERY part fits, and not every part is a common
// English word, is Vietnamese.
//
// ONE source for both places that judge names: the generated hook (agent writes) evaluates `VI_NAME_JUDGE`, and the
// store / conform checks (names the tool itself writes) build the same function from the same text.

export const VI_NAME_JUDGE = String.raw`
const VI_ONSET = /^(ngh|ng|nh|ch|gh|gi|kh|ph|th|tr|qu|b|c|d|g|h|k|l|m|n|p|r|s|t|v|x)?/;
const VI_RHYME = new Set(("a ai ao au ay an ang anh ac ach am ap at " +
  "e eo em en eng ep et ec ech enh " +
  "i ia iu ieu iem ien ieng iep iet iec inh ich im in ip it " +
  "o oa oai oan oang oanh oac oach oam oap oat oay oe oen oeo oet oi om on ong oong oc op ot " +
  "u ua uan uang uat uay ue uen uet ui um un ung uc up ut uy uya uyen uyet uynh uych uyu uoi uom uon uong uoc uop uot uou " +
  "ui ung uu uoi").split(" "));
const VI_EN = new Set(["a", "an", "at", "be", "can", "do", "go", "he", "in", "is", "it", "me", "no", "on", "so", "to", "up",
  "we", "man", "ban", "bat", "bin", "map", "mat", "net", "pin", "set", "tin", "top", "van", "hot", "hit", "kit", "lot",
  "not", "pot", "sit", "tag", "tab", "cap", "cat", "cut", "gap", "hat", "nut", "pan", "pat", "pet", "tap", "ten", "tip",
  "con", "den", "hen", "pen", "sun", "run", "gun", "bun", "fun", "mug", "rug", "bug", "hub", "sub", "tub", "cup"]);
function viSyllable(w) {
  const rest = w.replace(VI_ONSET, "");
  return rest !== w || /^[aeiouy]/.test(w) ? VI_RHYME.has(rest) : false;
}
// Short programming words (get · set · map · put · lang · vec) also fit the syllable shape, so fitting is not enough:
// at least one part must carry a mark English names lack — a Vietnamese-only rhyme, a Vietnamese-only onset, or one of
// the unmistakable words rule 30 already uses. Measured on zemory's 920 file names and 20,370 identifiers.
const VI_RHYME_ONLY = new Set(("ieu iem ien ieng iep iet iec ia iu uong uon uoc uot uoi uom uop uou uyen uyet uynh uych uya uyu uy " +
  "oai oan oang oanh oac oach oam oap oat oay oe oen oeo oet oong ao au uu inh ich anh ach enh ech ua").split(" "));
const VI_WORD = new Set(["khong", "duoc", "nguoi", "viec", "tieng", "nhieu", "truong", "thuong", "phuong", "huong", "duong",
  "luong", "tuong", "chuong", "muon", "ket", "thiet", "dien", "diem", "kiem", "hien", "chuyen", "quyen", "tuyen", "nguon",
  "thuoc", "buoc", "cuoc", "nuoc", "truoc", "suot", "luot", "doan", "loai", "ngoai", "xuat", "mot", "cua", "cho", "voi"]);
function viMarked(w) {
  if (VI_WORD.has(w)) return true;
  if (/^(ngh|ng|nh|kh|gh)/.test(w)) return true;
  return VI_RHYME_ONLY.has(w.replace(VI_ONSET, ""));
}
function viWords(text) {
  const parts = String(text).replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z]+/).filter(Boolean).map((w) => w.toLowerCase());
  if (parts.length < 2 || !parts.every(viSyllable)) return null;
  if (parts.every((p) => VI_EN.has(p))) return null;
  if (!parts.some(viMarked)) return null;
  return parts.join(" ");
}
// null = an English (or neutral) name · string = the Vietnamese words. A name of components joined by "_"
// (Rule_Core_80_DieuMotBatBien) is judged component by component as well as whole.
function viName(name) {
  const base = String(name).replace(/\.[A-Za-z0-9]+$/, "");
  for (const c of [base, ...base.split("_")]) {
    const hit = viWords(c);
    if (hit) return hit;
  }
  return null;
}
`;

/** The same judge for TypeScript callers, built from the same text the hook runs. */
export const viName: (name: string) => string | null = new Function(`${VI_NAME_JUDGE}\nreturn viName;`)() as (name: string) => string | null;
