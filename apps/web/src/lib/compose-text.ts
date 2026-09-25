const BOLD_CAP = 0x1d5d4;
const BOLD_SMALL = 0x1d5ee;
const BOLD_DIGIT = 0x1d7ec;
const ITALIC_CAP = 0x1d434;
const ITALIC_SMALL = 0x1d44e;

function mapLatin(
  text: string,
  cap: number,
  small: number,
  digit?: number,
) {
  return Array.from(text)
    .map((ch) => {
      const code = ch.codePointAt(0);
      if (code === undefined) return ch;
      if (code >= 65 && code <= 90) return String.fromCodePoint(cap + (code - 65));
      if (code >= 97 && code <= 122) {
        if (small === ITALIC_SMALL && code === 104) return "ℎ";
        return String.fromCodePoint(small + (code - 97));
      }
      if (digit !== undefined && code >= 48 && code <= 57) {
        return String.fromCodePoint(digit + (code - 48));
      }
      return ch;
    })
    .join("");
}

export function toUnicodeBold(text: string) {
  return mapLatin(text, BOLD_CAP, BOLD_SMALL, BOLD_DIGIT);
}

export function toUnicodeItalic(text: string) {
  return mapLatin(text, ITALIC_CAP, ITALIC_SMALL);
}

export function applyToSelection(
  value: string,
  start: number,
  end: number,
  transform: (chunk: string) => string,
) {
  if (start === end) return { value, start, end };
  const next = transform(value.slice(start, end));
  return {
    value: value.slice(0, start) + next + value.slice(end),
    start,
    end: start + next.length,
  };
}

export function xCharCount(text: string) {
  const weighted = text.replace(/https?:\/\/[^\s]+/gi, "x".repeat(23));
  return Array.from(weighted).length;
}

export const X_LIMIT = 280;
export const LINKEDIN_LIMIT = 3000;
export const LINKEDIN_SEE_MORE = 210;
export const TELEGRAM_CAPTION = 1024;

export const PLATFORM_LIMITS = {
  TWITTER: 280,
  LINKEDIN: 3000,
  LINKEDIN_PAGE: 3000,
  TELEGRAM: 4096,
  SLACK: 40000,
  DISCORD: 2000,
  DEVTO: 100000,
} as const;

export type ComposePlatform = keyof typeof PLATFORM_LIMITS;

export function platformCharCount(platform: ComposePlatform, text: string) {
  return platform === "TWITTER" ? xCharCount(text) : Array.from(text).length;
}
