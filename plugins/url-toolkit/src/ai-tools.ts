/**
 * AI Tools Handlers
 *
 * 可测试的独立函数，供 activate() 中注册 AI tools 使用。
 */
import { encodeFullUrl, decodeFullUrl, encodeComponent, decodeComponent } from "./url-codec.ts";
import { parseUrl } from "./url-parser.ts";

/** url_encode handler 参数 */
interface UrlEncodeParams {
  input: string;
  action: "encode" | "decode";
  mode?: "full" | "component";
}

/** url_encode handler 返回值 */
interface UrlEncodeResult {
  output?: string;
  error?: string;
}

/**
 * url_encode AI tool handler
 */
export async function handleUrlEncode(params: UrlEncodeParams): Promise<UrlEncodeResult> {
  const { input, action, mode = "full" } = params;
  try {
    let output: string;
    if (action === "encode") {
      output = mode === "component" ? encodeComponent(input) : encodeFullUrl(input);
    } else {
      output = mode === "component" ? decodeComponent(input) : decodeFullUrl(input);
    }
    return { output };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * url_parse AI tool handler
 */
export async function handleUrlParse(
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = params.url as string;
  try {
    const parsed = parseUrl(url);
    return {
      protocol: parsed.protocol,
      host: parsed.host,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      params: parsed.params
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
