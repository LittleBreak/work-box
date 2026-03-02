/**
 * JSON Operations Module
 *
 * 提供 JSON 格式化/压缩、校验、JSON-TS 互转和结构化 Diff 功能。
 * 所有逻辑运行在渲染进程，不依赖 Node.js API。
 */

/** JSON 校验结果 */
export interface JsonValidationResult {
  valid: boolean;
  error?: { message: string; line: number; column: number };
}

/** JSON Diff 条目 */
export interface JsonDiffEntry {
  path: string;
  type: "added" | "removed" | "changed" | "unchanged";
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * JSON 格式化（美化）
 *
 * @param input - 原始 JSON 字符串
 * @param indent - 缩进空格数，默认 2
 * @returns 格式化后的 JSON 字符串
 * @throws 输入不是有效 JSON 时抛出异常
 */
export function formatJson(input: string, indent: number = 2): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, indent);
}

/**
 * JSON 压缩为单行
 *
 * @param input - 原始 JSON 字符串
 * @returns 压缩后的单行 JSON 字符串
 * @throws 输入不是有效 JSON 时抛出异常
 */
export function compressJson(input: string): string {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed);
}

/**
 * 从 JSON.parse 错误消息中解析行列号
 *
 * @param message - 原始错误消息
 * @param input - 输入的 JSON 字符串
 * @returns 行号和列号
 */
function parseErrorPosition(message: string, input: string): { line: number; column: number } {
  // V8: "... at position X"  or "... at line X column Y"
  const posMatch = message.match(/at position (\d+)/);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    return offsetToLineColumn(input, pos);
  }

  const lineColMatch = message.match(/at line (\d+) column (\d+)/);
  if (lineColMatch) {
    return {
      line: parseInt(lineColMatch[1], 10),
      column: parseInt(lineColMatch[2], 10)
    };
  }

  // Fallback
  return { line: 1, column: 1 };
}

/**
 * 将字符偏移量转换为行列号
 *
 * @param input - 输入字符串
 * @param offset - 字符偏移量
 * @returns 行号和列号（从 1 开始）
 */
function offsetToLineColumn(input: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < input.length; i++) {
    if (input[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

/**
 * JSON 校验，返回校验结果（含错误行列号）
 *
 * @param input - 待校验的 JSON 字符串
 * @returns 校验结果，包含是否有效和错误信息
 */
export function validateJson(input: string): JsonValidationResult {
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : String(e);
    const { line, column } = parseErrorPosition(rawMessage, input);

    // 格式化用户友好消息（去掉 V8 前缀）
    const message = rawMessage
      .replace(/^(Unexpected token .* in JSON )at position \d+$/, "$1")
      .replace(/^JSON\.parse:\s*/, "");

    return {
      valid: false,
      error: { message, line, column }
    };
  }
}

/**
 * 将属性名转为 PascalCase（用于生成 interface 名）
 *
 * @param key - 属性名
 * @returns PascalCase 字符串
 */
function toPascalCase(key: string): string {
  return key
    .replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toUpperCase());
}

/**
 * 推断 JSON 值的 TypeScript 类型字符串
 *
 * @param value - JSON 值
 * @param key - 属性名（用于嵌套 interface 命名）
 * @param interfaces - 收集生成的子 interface 定义
 * @returns TypeScript 类型字符串
 */
function inferType(value: unknown, key: string, interfaces: Map<string, string>): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    default:
      break;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";

    const elementTypes = new Set<string>();
    const itemInterfaceName = toPascalCase(key) + "Item";

    for (const item of value) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        // Object element — generate sub-interface
        const subInterface = generateInterface(
          item as Record<string, unknown>,
          itemInterfaceName,
          interfaces
        );
        interfaces.set(itemInterfaceName, subInterface);
        elementTypes.add(itemInterfaceName);
      } else {
        elementTypes.add(inferType(item, key, interfaces));
      }
    }

    const typeArr = Array.from(elementTypes);
    if (typeArr.length === 1) {
      return `${typeArr[0]}[]`;
    }
    return `(${typeArr.join(" | ")})[]`;
  }

  if (typeof value === "object") {
    // Nested object → generate sub-interface
    const interfaceName = toPascalCase(key);
    const subInterface = generateInterface(
      value as Record<string, unknown>,
      interfaceName,
      interfaces
    );
    interfaces.set(interfaceName, subInterface);
    return interfaceName;
  }

  return "unknown";
}

/**
 * 生成单个 interface 定义字符串
 *
 * @param obj - JSON 对象
 * @param name - Interface 名称
 * @param interfaces - 收集子 interface 定义
 * @returns interface 定义字符串
 */
function generateInterface(
  obj: Record<string, unknown>,
  name: string,
  interfaces: Map<string, string>
): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return `interface ${name} {\n}`;
  }

  const fields = entries.map(([key, value]) => {
    const type = inferType(value, key, interfaces);
    return `  ${key}: ${type};`;
  });

  return `interface ${name} {\n${fields.join("\n")}\n}`;
}

/**
 * JSON → TypeScript 接口定义
 *
 * @param input - JSON 字符串
 * @param rootName - 根接口名称，默认 "Root"
 * @returns TypeScript interface 定义字符串
 * @throws 输入不是有效 JSON 时抛出异常
 */
export function jsonToTypeScript(input: string, rootName: string = "Root"): string {
  const parsed: unknown = JSON.parse(input);
  const interfaces = new Map<string, string>();

  if (Array.isArray(parsed)) {
    // Top-level array: generate interface for elements
    if (parsed.length > 0) {
      const firstObj = parsed[0];
      if (firstObj !== null && typeof firstObj === "object" && !Array.isArray(firstObj)) {
        const rootInterface = generateInterface(
          firstObj as Record<string, unknown>,
          rootName,
          interfaces
        );
        interfaces.set(rootName, rootInterface);
      }
    } else {
      interfaces.set(rootName, `interface ${rootName} {\n}`);
    }
  } else if (parsed !== null && typeof parsed === "object") {
    const rootInterface = generateInterface(
      parsed as Record<string, unknown>,
      rootName,
      interfaces
    );
    interfaces.set(rootName, rootInterface);
  }

  // Build output: root interface first, then sub-interfaces
  const parts: string[] = [];
  const rootDef = interfaces.get(rootName);
  if (rootDef) {
    parts.push(rootDef);
    interfaces.delete(rootName);
  }

  for (const def of interfaces.values()) {
    parts.push(def);
  }

  return parts.join("\n\n");
}

/**
 * 解析基础 TypeScript interface 定义
 *
 * @param input - TypeScript 源代码
 * @returns 解析的 interface 映射：name → { field: type }
 */
function parseInterfaces(input: string): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();

  // Match interface blocks
  const interfaceRegex = /interface\s+(\w+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = interfaceRegex.exec(input)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields = new Map<string, string>();

    // Match field declarations: name?: type;
    const fieldRegex = /(\w+)\??:\s*([^;]+);/g;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields.set(fieldMatch[1], fieldMatch[2].trim());
    }

    result.set(name, fields);
  }

  return result;
}

/**
 * 从 TypeScript 类型字符串生成默认值
 *
 * @param typeStr - TypeScript 类型字符串
 * @param allInterfaces - 所有已解析的 interface 定义
 * @returns 默认的 JSON 值
 */
function defaultValueForType(
  typeStr: string,
  allInterfaces: Map<string, Map<string, string>>
): unknown {
  const trimmed = typeStr.trim();

  if (trimmed === "string") return "";
  if (trimmed === "number") return 0;
  if (trimmed === "boolean") return false;
  if (trimmed === "null") return null;
  if (trimmed === "unknown" || trimmed === "any") return null;

  // Array type: T[]
  const arrayMatch = trimmed.match(/^(.+)\[\]$/);
  if (arrayMatch) {
    const elementType = arrayMatch[1]
      .replace(/^\(|\)$/g, "")
      .split("|")[0]
      .trim();
    return [defaultValueForType(elementType, allInterfaces)];
  }

  // Reference to another interface
  if (allInterfaces.has(trimmed)) {
    return buildObjectFromInterface(trimmed, allInterfaces);
  }

  return null;
}

/**
 * 根据 interface 定义构建 JSON 对象
 *
 * @param name - Interface 名称
 * @param allInterfaces - 所有已解析的 interface 定义
 * @returns 构建的 JSON 对象
 */
function buildObjectFromInterface(
  name: string,
  allInterfaces: Map<string, Map<string, string>>
): Record<string, unknown> {
  const fields = allInterfaces.get(name);
  if (!fields) return {};

  const result: Record<string, unknown> = {};
  for (const [fieldName, fieldType] of fields) {
    result[fieldName] = defaultValueForType(fieldType, allInterfaces);
  }
  return result;
}

/**
 * TypeScript 接口 → JSON 样例
 *
 * 仅支持基础 interface 定义（string/number/boolean/null/array/nested object）。
 * 不支持泛型、联合类型、枚举等复杂 TypeScript 语法。
 *
 * @param input - TypeScript interface 源代码
 * @returns 生成的 JSON 样例字符串
 */
export function typeScriptToJson(input: string): string {
  const allInterfaces = parseInterfaces(input);

  if (allInterfaces.size === 0) {
    return JSON.stringify({}, null, 2);
  }

  // Use the last interface as the "main" one
  // (Usually the last defined interface is the root)
  let lastInterfaceName = "";
  for (const name of allInterfaces.keys()) {
    lastInterfaceName = name;
  }

  const result = buildObjectFromInterface(lastInterfaceName, allInterfaces);
  return JSON.stringify(result, null, 2);
}

/**
 * 递归比较两个 JSON 值，生成 diff 条目列表
 *
 * @param a - 旧值
 * @param b - 新值
 * @param path - 当前路径前缀
 * @param entries - 收集 diff 条目
 */
function diffValues(a: unknown, b: unknown, path: string, entries: JsonDiffEntry[]): void {
  // Both are objects (not arrays, not null)
  if (
    a !== null &&
    b !== null &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);

    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key;
      const inA = key in objA;
      const inB = key in objB;

      if (inA && !inB) {
        entries.push({ path: childPath, type: "removed", oldValue: objA[key] });
      } else if (!inA && inB) {
        entries.push({ path: childPath, type: "added", newValue: objB[key] });
      } else {
        // Both have the key — recurse
        diffValues(objA[key], objB[key], childPath, entries);
      }
    }
    return;
  }

  // Both are arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= a.length) {
        entries.push({ path: childPath, type: "added", newValue: b[i] });
      } else if (i >= b.length) {
        entries.push({ path: childPath, type: "removed", oldValue: a[i] });
      } else {
        diffValues(a[i], b[i], childPath, entries);
      }
    }
    return;
  }

  // Primitive comparison
  if (a === b) {
    entries.push({ path, type: "unchanged", oldValue: a, newValue: b });
  } else {
    entries.push({ path, type: "changed", oldValue: a, newValue: b });
  }
}

/**
 * 结构化 JSON Diff
 *
 * 递归对比两段 JSON，生成 added/removed/changed/unchanged 条目列表。
 *
 * @param a - 旧版 JSON 字符串
 * @param b - 新版 JSON 字符串
 * @returns Diff 条目列表
 * @throws 输入不是有效 JSON 时抛出异常
 */
export function diffJson(a: string, b: string): JsonDiffEntry[] {
  const parsedA: unknown = JSON.parse(a);
  const parsedB: unknown = JSON.parse(b);

  const entries: JsonDiffEntry[] = [];
  diffValues(parsedA, parsedB, "", entries);
  return entries;
}
