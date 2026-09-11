import { describe, expect, it } from "vitest";

import {
  dashViolationMessage,
  findDashViolations,
  makeExcerpt,
  slugify,
  SLUG_PATTERN,
} from "@/lib/utils/text";

describe("findDashViolations", () => {
  it("finds en dash and em dash characters in strings", () => {
    const violations = findDashViolations({ title: "One \u2013 two \u2014 three" });
    expect(violations.map((v) => v.char)).toEqual([
      "U+2013 (en dash)",
      "U+2014 (em dash)",
    ]);
  });

  it("walks nested objects and arrays with readable paths", () => {
    const violations = findDashViolations({
      meta: { note: "ok" },
      items: [{ text: "bad \u2014 text" }],
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.path).toBe("items[0].text");
  });

  it("accepts ASCII hyphens, commas, colons, and parentheses", () => {
    const violations = findDashViolations({
      text: "A fine sentence, with a colon: (and parentheses) - and hyphens.",
    });
    expect(violations).toHaveLength(0);
  });

  it("does not crash on null or primitives", () => {
    expect(findDashViolations(null)).toHaveLength(0);
    expect(findDashViolations(42)).toHaveLength(0);
    expect(findDashViolations("clean")).toHaveLength(0);
  });
});

describe("dashViolationMessage", () => {
  it("explains the rule and the correction", () => {
    const message = dashViolationMessage([
      { path: "title", char: "U+2013 (en dash)" },
    ]);
    expect(message).toContain("title");
    expect(message).toContain("en dash");
    expect(message).toContain("ordinary ASCII hyphen");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Electrical & Automation!")).toBe("electrical-and-automation");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  Hello, world  ")).toBe("hello-world");
  });

  it("caps length at 80 characters", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

describe("makeExcerpt", () => {
  it("collapses whitespace and truncates without cutting words", () => {
    const excerpt = makeExcerpt(`Lots   of   whitespace   here. ${"word ".repeat(60)}`, 60);
    expect(excerpt.length).toBeLessThanOrEqual(63);
    expect(excerpt).not.toMatch(/\s{2,}/);
  });
});

describe("SLUG_PATTERN", () => {
  it("accepts lowercase hyphenated slugs and rejects others", () => {
    expect(SLUG_PATTERN.test("electrical-automation")).toBe(true);
    expect(SLUG_PATTERN.test("UPPER")).toBe(false);
    expect(SLUG_PATTERN.test("with_underscore")).toBe(false);
    expect(SLUG_PATTERN.test("-leading")).toBe(false);
    expect(SLUG_PATTERN.test("trailing-")).toBe(false);
  });
});
