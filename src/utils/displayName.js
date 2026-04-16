const ARABIC_CHARS_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_CHARS_RE = /[A-Za-z]/;

export function isEnglishDisplayName(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return LATIN_CHARS_RE.test(text) && !ARABIC_CHARS_RE.test(text);
}
