/**
 * URL Parser
 *
 * 使用原生 URL + URLSearchParams API 解析 URL 结构和 query 参数。
 */

/** 单个 query 参数 */
export interface UrlParam {
  key: string;
  value: string;
}

/** URL 解析结果 */
export interface ParsedUrl {
  protocol: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
  params: UrlParam[];
}

/**
 * 解析 URL 为结构化结果
 * @param url - 要解析的 URL 字符串
 * @returns 解析后的 URL 结构
 * @throws TypeError 当 URL 格式无效时
 */
export function parseUrl(url: string): ParsedUrl {
  const parsed = new URL(url);
  const params: UrlParam[] = [];

  parsed.searchParams.forEach((value, key) => {
    params.push({ key, value });
  });

  return {
    protocol: parsed.protocol,
    host: parsed.host,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    params
  };
}
