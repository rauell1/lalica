/**
 * Small shared text utilities.
 *
 * Writing rule: this repository must never contain U+2013 (en dash) or
 * U+2014 (em dash) in authored text. These helpers are part of the
 * enforcement for that rule.
 */

export const EN_DASH = "\u2013";
export const EM_DASH = "\u2014";

export interface DashViolation {
  path: string;
  char: string;
}

/** Returns true when the text contains a forbidden dash character. */
export function hasForbiddenDash(text: string): boolean {
  return text.includes(EN_DASH) || text.includes(EM_DASH);
}

/**
 * Walk a plain JSON value and return every path where a forbidden dash
 * character appears in a string. Paths use dot notation, for example
 * "body.blocks[2].text".
 */
export function findDashViolations(
  value: unknown,
  path = "",
  acc: DashViolation[] = [],
): DashViolation[] {
  if (typeof value === "string") {
    if (value.includes(EN_DASH)) {
      acc.push({ path: path || "(root)", char: "U+2013 (en dash)" });
    }
    if (value.includes(EM_DASH)) {
      acc.push({ path: path || "(root)", char: "U+2014 (em dash)" });
    }
    return acc;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findDashViolations(item, `${path}[${index}]`, acc);
    });
    return acc;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const isIndex = /^\d+$/.test(key);
      const keyPath =
        path === ""
          ? key
          : isIndex
            ? `${path}[${key}]`
            : `${path}.${key}`;
      findDashViolations(item, keyPath, acc);
    }
  }
  return acc;
}

/** Human readable correction message for CMS validation errors. */
export function dashViolationMessage(violations: DashViolation[]): string {
  const first = violations[0];
  if (!first) return "";
  const list = violations
    .slice(0, 5)
    .map((v) =>
      v.path === "(root)" ? v.char : `"${v.path}" (${v.char})`,
    )
    .join(", ");
  const more = violations.length > 5 ? ` and ${violations.length - 5} more` : "";
  return (
    `This text contains ${list}${more}. ` +
    "Please use a comma, colon, parentheses, full stop, or an ordinary ASCII hyphen instead."
  );
}

/** Slugify a title into a URL safe slug: lower case a-z 0-9 separated by hyphens. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Truncate text to a sensible excerpt length without cutting words. */
export function makeExcerpt(text: string, maxLength = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : maxLength).trim()}...`;
}

/** Normalise an email address for consistent comparisons and hashing. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Public facing reference for enquiries, for example ENQ-K4F9Q2. */
export function publicReference(prefix: string, random: string): string {
  return `${prefix}-${random}`;
}

/** Obfuscate an email for inclusion in logs (first two chars plus domain). */
export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "redacted";
  return `${local.slice(0, 2)}...@${domain}`;
}
