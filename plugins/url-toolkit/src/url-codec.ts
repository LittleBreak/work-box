/**
 * URL Codec
 *
 * 提供完整 URL 和 URL 组件的编码/解码功能。
 */

/**
 * 对完整 URL 进行编码（使用 encodeURI）
 * @param url - 要编码的 URL 字符串
 * @returns 编码后的 URL
 */
export function encodeFullUrl(url: string): string {
  return encodeURI(url);
}

/**
 * 对完整 URL 进行解码（使用 decodeURI）
 * @param url - 要解码的 URL 字符串
 * @returns 解码后的 URL
 * @throws URIError 当包含无效编码序列时
 */
export function decodeFullUrl(url: string): string {
  return decodeURI(url);
}

/**
 * 对 URL 组件进行编码（使用 encodeURIComponent）
 * @param component - 要编码的 URL 组件
 * @returns 编码后的组件
 */
export function encodeComponent(component: string): string {
  return encodeURIComponent(component);
}

/**
 * 对 URL 组件进行解码（使用 decodeURIComponent）
 * @param component - 要解码的 URL 组件
 * @returns 解码后的组件
 * @throws URIError 当包含无效编码序列时
 */
export function decodeComponent(component: string): string {
  return decodeURIComponent(component);
}
