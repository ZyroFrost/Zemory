// Server-side i18n: pick a string by the current UI language, for the few
// human-facing strings that originate in the backend (status / checks / doctor).
// Extracted out of settings.ts (config) so one file = one concern (03_STRUCTURE §4).
import { getLang } from "../config/settings.js";

export function tr(vi: string, en: string): string {
  return getLang() === "en" ? en : vi;
}
