/**
 * JSON Operations Tests
 *
 * 覆盖 json-ops 所有函数：formatJson、compressJson、validateJson、
 * jsonToTypeScript、typeScriptToJson、diffJson。
 * 包含正常路径、边界条件和错误处理。
 */
import { describe, it, expect } from "vitest";
import {
  formatJson,
  compressJson,
  validateJson,
  jsonToTypeScript,
  typeScriptToJson,
  diffJson
} from "./json-ops.ts";

// ============================================================
// formatJson
// ============================================================
describe("formatJson", () => {
  it("should format a simple JSON object with default 2-space indent", () => {
    const input = '{"name":"Alice","age":30}';
    const result = formatJson(input);
    expect(result).toBe('{\n  "name": "Alice",\n  "age": 30\n}');
  });

  it("should format with custom indent (4 spaces)", () => {
    const input = '{"a":1}';
    const result = formatJson(input, 4);
    expect(result).toBe('{\n    "a": 1\n}');
  });

  it("should format nested objects", () => {
    const input = '{"user":{"name":"Bob","address":{"city":"NY"}}}';
    const result = formatJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.user.address.city).toBe("NY");
    // Verify it's multi-line
    expect(result.split("\n").length).toBeGreaterThan(1);
  });

  it("should format arrays", () => {
    const input = "[1,2,3]";
    const result = formatJson(input);
    expect(result).toBe("[\n  1,\n  2,\n  3\n]");
  });

  it("should throw on invalid JSON", () => {
    expect(() => formatJson("{invalid}")).toThrow();
  });

  it("should handle empty object", () => {
    expect(formatJson("{}")).toBe("{}");
  });

  it("should handle empty array", () => {
    expect(formatJson("[]")).toBe("[]");
  });

  it("should handle already formatted JSON", () => {
    const input = '{\n  "a": 1\n}';
    const result = formatJson(input);
    expect(result).toBe('{\n  "a": 1\n}');
  });
});

// ============================================================
// compressJson
// ============================================================
describe("compressJson", () => {
  it("should compress formatted JSON to single line", () => {
    const input = '{\n  "name": "Alice",\n  "age": 30\n}';
    const result = compressJson(input);
    expect(result).toBe('{"name":"Alice","age":30}');
  });

  it("should compress nested objects", () => {
    const input = '{\n  "user": {\n    "name": "Bob"\n  }\n}';
    const result = compressJson(input);
    expect(result).toBe('{"user":{"name":"Bob"}}');
  });

  it("should compress arrays", () => {
    const input = "[\n  1,\n  2,\n  3\n]";
    const result = compressJson(input);
    expect(result).toBe("[1,2,3]");
  });

  it("should throw on invalid JSON", () => {
    expect(() => compressJson("{invalid}")).toThrow();
  });

  it("should handle already compressed JSON", () => {
    const input = '{"a":1}';
    expect(compressJson(input)).toBe('{"a":1}');
  });
});

// ============================================================
// validateJson
// ============================================================
describe("validateJson", () => {
  it("should return valid for valid JSON object", () => {
    const result = validateJson('{"name":"Alice"}');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should return valid for valid JSON array", () => {
    const result = validateJson("[1, 2, 3]");
    expect(result.valid).toBe(true);
  });

  it("should return valid for primitive values", () => {
    expect(validateJson('"hello"').valid).toBe(true);
    expect(validateJson("42").valid).toBe(true);
    expect(validateJson("true").valid).toBe(true);
    expect(validateJson("null").valid).toBe(true);
  });

  it("should return invalid for missing closing brace", () => {
    const result = validateJson('{"name":"Alice"');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.message).toBeTruthy();
  });

  it("should return invalid for trailing comma", () => {
    const result = validateJson('{"a":1,}');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return invalid for single quotes", () => {
    const result = validateJson("{'a':1}");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should provide line and column number for multi-line errors", () => {
    const input = '{\n  "a": 1,\n  "b": invalid\n}';
    const result = validateJson(input);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.line).toBeGreaterThanOrEqual(1);
    expect(result.error!.column).toBeGreaterThanOrEqual(1);
  });

  it("should return invalid for empty string", () => {
    const result = validateJson("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return invalid for undefined-like input", () => {
    const result = validateJson("undefined");
    expect(result.valid).toBe(false);
  });
});

// ============================================================
// jsonToTypeScript
// ============================================================
describe("jsonToTypeScript", () => {
  it("should generate interface for simple object", () => {
    const input = '{"name":"Alice","age":30,"active":true}';
    const result = jsonToTypeScript(input);
    expect(result).toContain("interface Root");
    expect(result).toContain("name: string");
    expect(result).toContain("age: number");
    expect(result).toContain("active: boolean");
  });

  it("should use custom root name", () => {
    const input = '{"id":1}';
    const result = jsonToTypeScript(input, "User");
    expect(result).toContain("interface User");
  });

  it("should handle nested objects", () => {
    const input = '{"user":{"name":"Alice","address":{"city":"NY","zip":"10001"}}}';
    const result = jsonToTypeScript(input);
    expect(result).toContain("interface Root");
    expect(result).toContain("user: User");
    expect(result).toContain("interface User");
    expect(result).toContain("name: string");
    expect(result).toContain("address: Address");
    expect(result).toContain("interface Address");
    expect(result).toContain("city: string");
    expect(result).toContain("zip: string");
  });

  it("should handle arrays of primitives", () => {
    const input = '{"tags":["a","b","c"]}';
    const result = jsonToTypeScript(input);
    expect(result).toContain("tags: string[]");
  });

  it("should handle arrays of objects", () => {
    const input = '{"users":[{"name":"Alice"},{"name":"Bob"}]}';
    const result = jsonToTypeScript(input);
    expect(result).toContain("users: UsersItem[]");
    expect(result).toContain("interface UsersItem");
    expect(result).toContain("name: string");
  });

  it("should handle null values", () => {
    const input = '{"data":null}';
    const result = jsonToTypeScript(input);
    expect(result).toContain("data: null");
  });

  it("should handle empty object", () => {
    const input = "{}";
    const result = jsonToTypeScript(input);
    expect(result).toContain("interface Root");
  });

  it("should handle empty array", () => {
    const input = '{"items":[]}';
    const result = jsonToTypeScript(input);
    expect(result).toContain("items: unknown[]");
  });

  it("should handle mixed type arrays", () => {
    const input = '{"mixed":[1,"hello",true]}';
    const result = jsonToTypeScript(input);
    // Should produce union type or unknown[]
    expect(result).toContain("mixed:");
  });

  it("should handle top-level array", () => {
    const input = '[{"name":"Alice"},{"name":"Bob"}]';
    const result = jsonToTypeScript(input);
    expect(result).toContain("name: string");
  });

  it("should throw on invalid JSON", () => {
    expect(() => jsonToTypeScript("{invalid}")).toThrow();
  });

  it("should handle number values including float", () => {
    const input = '{"count":42,"price":9.99}';
    const result = jsonToTypeScript(input);
    expect(result).toContain("count: number");
    expect(result).toContain("price: number");
  });
});

// ============================================================
// typeScriptToJson
// ============================================================
describe("typeScriptToJson", () => {
  it("should generate JSON sample from simple interface", () => {
    const input = `interface User {
  name: string;
  age: number;
  active: boolean;
}`;
    const result = typeScriptToJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe("");
    expect(parsed.age).toBe(0);
    expect(parsed.active).toBe(false);
  });

  it("should handle null type", () => {
    const input = `interface Data {
  value: null;
}`;
    const result = typeScriptToJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.value).toBeNull();
  });

  it("should handle array types", () => {
    const input = `interface Data {
  tags: string[];
  scores: number[];
}`;
    const result = typeScriptToJson(input);
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed.tags)).toBe(true);
    expect(parsed.tags[0]).toBe("");
    expect(Array.isArray(parsed.scores)).toBe(true);
    expect(parsed.scores[0]).toBe(0);
  });

  it("should handle optional properties (with ?)", () => {
    const input = `interface Config {
  name: string;
  debug?: boolean;
}`;
    const result = typeScriptToJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe("");
    // Optional properties should still appear in sample with defaults
    expect("debug" in parsed).toBe(true);
  });

  it("should handle nested interface reference", () => {
    const input = `interface Address {
  city: string;
  zip: string;
}

interface User {
  name: string;
  address: Address;
}`;
    const result = typeScriptToJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe("");
    expect(parsed.address).toBeDefined();
    expect(parsed.address.city).toBe("");
    expect(parsed.address.zip).toBe("");
  });

  it("should handle unknown type as null", () => {
    const input = `interface Data {
  payload: unknown;
}`;
    const result = typeScriptToJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.payload).toBeNull();
  });

  it("should handle any type as null", () => {
    const input = `interface Data {
  value: any;
}`;
    const result = typeScriptToJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.value).toBeNull();
  });

  it("should return empty object for empty interface", () => {
    const input = `interface Empty {}`;
    const result = typeScriptToJson(input);
    expect(JSON.parse(result)).toEqual({});
  });

  it("should return empty object for non-interface input", () => {
    const input = "some random text";
    const result = typeScriptToJson(input);
    expect(JSON.parse(result)).toEqual({});
  });
});

// ============================================================
// diffJson
// ============================================================
describe("diffJson", () => {
  it("should detect added properties", () => {
    const a = '{"name":"Alice"}';
    const b = '{"name":"Alice","age":30}';
    const result = diffJson(a, b);
    const added = result.find((e) => e.type === "added");
    expect(added).toBeDefined();
    expect(added!.path).toBe("age");
    expect(added!.newValue).toBe(30);
  });

  it("should detect removed properties", () => {
    const a = '{"name":"Alice","age":30}';
    const b = '{"name":"Alice"}';
    const result = diffJson(a, b);
    const removed = result.find((e) => e.type === "removed");
    expect(removed).toBeDefined();
    expect(removed!.path).toBe("age");
    expect(removed!.oldValue).toBe(30);
  });

  it("should detect changed values", () => {
    const a = '{"name":"Alice","age":25}';
    const b = '{"name":"Alice","age":30}';
    const result = diffJson(a, b);
    const changed = result.find((e) => e.type === "changed");
    expect(changed).toBeDefined();
    expect(changed!.path).toBe("age");
    expect(changed!.oldValue).toBe(25);
    expect(changed!.newValue).toBe(30);
  });

  it("should detect unchanged properties", () => {
    const a = '{"name":"Alice","age":30}';
    const b = '{"name":"Alice","age":30}';
    const result = diffJson(a, b);
    expect(result.every((e) => e.type === "unchanged")).toBe(true);
    expect(result.length).toBe(2);
  });

  it("should handle nested object changes", () => {
    const a = '{"user":{"name":"Alice","age":25}}';
    const b = '{"user":{"name":"Alice","age":30}}';
    const result = diffJson(a, b);
    const changed = result.find((e) => e.type === "changed");
    expect(changed).toBeDefined();
    expect(changed!.path).toBe("user.age");
    expect(changed!.oldValue).toBe(25);
    expect(changed!.newValue).toBe(30);
  });

  it("should handle nested object added", () => {
    const a = '{"user":{"name":"Alice"}}';
    const b = '{"user":{"name":"Alice","email":"a@b.com"}}';
    const result = diffJson(a, b);
    const added = result.find((e) => e.type === "added");
    expect(added).toBeDefined();
    expect(added!.path).toBe("user.email");
  });

  it("should handle array changes", () => {
    const a = '{"items":[1,2,3]}';
    const b = '{"items":[1,2,4]}';
    const result = diffJson(a, b);
    const changed = result.find((e) => e.type === "changed");
    expect(changed).toBeDefined();
    expect(changed!.path).toContain("items");
  });

  it("should handle type changes (string to number)", () => {
    const a = '{"value":"hello"}';
    const b = '{"value":42}';
    const result = diffJson(a, b);
    const changed = result.find((e) => e.type === "changed");
    expect(changed).toBeDefined();
    expect(changed!.oldValue).toBe("hello");
    expect(changed!.newValue).toBe(42);
  });

  it("should handle identical JSON", () => {
    const json = '{"a":1,"b":"two"}';
    const result = diffJson(json, json);
    expect(result.every((e) => e.type === "unchanged")).toBe(true);
  });

  it("should handle both empty objects", () => {
    const result = diffJson("{}", "{}");
    expect(result).toEqual([]);
  });

  it("should handle one empty object", () => {
    const result = diffJson("{}", '{"a":1}');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("added");
  });

  it("should throw on invalid JSON input (a)", () => {
    expect(() => diffJson("{invalid}", "{}")).toThrow();
  });

  it("should throw on invalid JSON input (b)", () => {
    expect(() => diffJson("{}", "{invalid}")).toThrow();
  });

  it("should handle null to value changes", () => {
    const a = '{"value":null}';
    const b = '{"value":"hello"}';
    const result = diffJson(a, b);
    const changed = result.find((e) => e.type === "changed");
    expect(changed).toBeDefined();
    expect(changed!.oldValue).toBeNull();
    expect(changed!.newValue).toBe("hello");
  });

  it("should handle array length differences", () => {
    const a = '{"items":[1,2]}';
    const b = '{"items":[1,2,3]}';
    const result = diffJson(a, b);
    // Should detect the added element
    const added = result.find((e) => e.type === "added");
    expect(added).toBeDefined();
    expect(added!.path).toContain("items");
  });
});
