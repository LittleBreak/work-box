/**
 * Regex Engine
 *
 * 正则表达式匹配引擎，提供正则执行、校验和高亮分段功能。
 * 运行在渲染进程，使用原生 RegExp API。
 */

/** 最大匹配次数限制，防止 ReDoS 攻击 */
const MAX_MATCHES = 1000;

/** 单条匹配结果 */
export interface RegexMatch {
  /** 完整匹配字符串 */
  fullMatch: string;
  /** 匹配起始位置 */
  index: number;
  /** 匹配长度 */
  length: number;
  /** 命名捕获组 */
  groups: Record<string, string>;
  /** 未命名捕获组（按顺序） */
  captures: string[];
}

/** 正则校验结果 */
export interface RegexValidation {
  /** 是否合法 */
  valid: boolean;
  /** 错误信息（仅当 valid = false） */
  error?: string;
}

/** 高亮文本片段 */
export interface HighlightSegment {
  /** 文本内容 */
  text: string;
  /** 是否为匹配片段 */
  isMatch: boolean;
  /** 匹配索引号（仅匹配片段） */
  matchIndex?: number;
}

/**
 * 校验正则表达式是否合法
 * @param pattern - 正则表达式字符串
 * @param flags - 正则标志位
 */
export function validateRegex(pattern: string, flags: string): RegexValidation {
  try {
    new RegExp(pattern, flags);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

/**
 * 执行正则匹配，返回所有匹配结果
 * @param pattern - 正则表达式字符串
 * @param flags - 正则标志位
 * @param text - 待匹配文本
 * @returns 匹配结果数组（最多 MAX_MATCHES 条）
 */
export function executeRegex(pattern: string, flags: string, text: string): RegexMatch[] {
  if (!pattern || !text) return [];

  const validation = validateRegex(pattern, flags);
  if (!validation.valid) return [];

  const regex = new RegExp(pattern, flags);
  const results: RegexMatch[] = [];

  if (flags.includes("g")) {
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null && results.length < MAX_MATCHES) {
      results.push(buildMatch(match));
      // Prevent infinite loop on zero-length matches
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }
  } else {
    const match = regex.exec(text);
    if (match) {
      results.push(buildMatch(match));
    }
  }

  return results;
}

/**
 * 生成匹配高亮片段，用于 UI 渲染
 * @param text - 原始文本
 * @param matches - 匹配结果数组
 * @returns 文本片段数组
 */
export function generateHighlightSegments(text: string, matches: RegexMatch[]): HighlightSegment[] {
  if (!text) return [];
  if (matches.length === 0) {
    return [{ text, isMatch: false }];
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];

    // Non-match segment before this match
    if (m.index > cursor) {
      segments.push({ text: text.slice(cursor, m.index), isMatch: false });
    }

    // Match segment
    segments.push({ text: m.fullMatch, isMatch: true, matchIndex: i });
    cursor = m.index + m.length;
  }

  // Trailing non-match segment
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false });
  }

  return segments;
}

/** 从 RegExpExecArray 构建 RegexMatch */
function buildMatch(match: RegExpExecArray): RegexMatch {
  const captures: string[] = [];
  for (let i = 1; i < match.length; i++) {
    captures.push(match[i] ?? "");
  }

  const groups: Record<string, string> = {};
  if (match.groups) {
    for (const [key, value] of Object.entries(match.groups)) {
      groups[key] = value ?? "";
    }
  }

  return {
    fullMatch: match[0],
    index: match.index,
    length: match[0].length,
    groups,
    captures
  };
}
