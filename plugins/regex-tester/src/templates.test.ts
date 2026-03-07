/**
 * Regex Templates Tests
 *
 * 验证模板数据结构完整性：每个模板必须有有效的正则、标志、名称和描述。
 */
import { describe, it, expect } from "vitest";
import { REGEX_TEMPLATES } from "./templates";
import type { RegexTemplate } from "./templates";

describe("REGEX_TEMPLATES", () => {
  it("has at least 10 templates", () => {
    expect(REGEX_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("every template has required fields", () => {
    for (const tmpl of REGEX_TEMPLATES) {
      expect(typeof tmpl.name).toBe("string");
      expect(tmpl.name.length).toBeGreaterThan(0);
      expect(typeof tmpl.pattern).toBe("string");
      expect(tmpl.pattern.length).toBeGreaterThan(0);
      expect(typeof tmpl.flags).toBe("string");
      expect(typeof tmpl.description).toBe("string");
      expect(tmpl.description.length).toBeGreaterThan(0);
    }
  });

  it("every template has a valid regex pattern", () => {
    for (const tmpl of REGEX_TEMPLATES) {
      expect(() => new RegExp(tmpl.pattern, tmpl.flags)).not.toThrow();
    }
  });

  it("every template has a sample text", () => {
    for (const tmpl of REGEX_TEMPLATES) {
      expect(typeof tmpl.sampleText).toBe("string");
      expect(tmpl.sampleText.length).toBeGreaterThan(0);
    }
  });

  it("every template sample text produces at least one match", () => {
    for (const tmpl of REGEX_TEMPLATES) {
      const regex = new RegExp(tmpl.pattern, tmpl.flags);
      expect(regex.test(tmpl.sampleText)).toBe(true);
    }
  });

  it("has unique template names", () => {
    const names = REGEX_TEMPLATES.map((t: RegexTemplate) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
