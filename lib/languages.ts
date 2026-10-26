// The learner's own language: the other side of every lookup, French being
// the one they're writing. Client-safe.

export type Language = {
  code: string;
  /** English name. */
  name: string;
  /** The name in its own script, as the menu shows it. */
  native: string;
  /** Show the English name beside the native one: the script isn't Latin. */
  hint?: boolean;
  rtl?: boolean;
  /** Google Translate's code, where it differs from `code`. */
  google?: string;
};

export const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "pt-BR", name: "Portuguese (Brazil)", native: "Português (Brasil)", google: "pt" },
  { code: "ar", name: "Arabic", native: "العربية", hint: true, rtl: true },
  { code: "fa", name: "Persian", native: "فارسی", hint: true, rtl: true },
  { code: "zh-Hans", name: "Chinese (Simplified)", native: "中文（简体）", hint: true, google: "zh-CN" },
] as const satisfies Language[];

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export function language(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
