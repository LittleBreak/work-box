/**
 * Regex Templates
 *
 * 常用正则表达式模板，每个模板包含名称、正则、标志、描述和示例文本。
 */

/** 正则模板定义 */
export interface RegexTemplate {
  /** 模板名称 */
  name: string;
  /** 正则表达式字符串 */
  pattern: string;
  /** 正则标志位 */
  flags: string;
  /** 模板描述 */
  description: string;
  /** 示例匹配文本 */
  sampleText: string;
}

/** 常用正则模板集合 */
export const REGEX_TEMPLATES: RegexTemplate[] = [
  {
    name: "邮箱",
    pattern: "[\\w.-]+@[\\w.-]+\\.\\w+",
    flags: "g",
    description: "匹配邮箱地址",
    sampleText: "联系我：user@example.com 或 test.name@mail.org"
  },
  {
    name: "手机号",
    pattern: "1[3-9]\\d{9}",
    flags: "g",
    description: "匹配中国大陆手机号",
    sampleText: "手机号：13812345678，备用：15900001111"
  },
  {
    name: "URL",
    pattern: "https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=]+",
    flags: "gi",
    description: "匹配 HTTP/HTTPS URL",
    sampleText: "访问 https://example.com/path?q=1 或 http://test.org"
  },
  {
    name: "IPv4",
    pattern: "(\\d{1,3}\\.){3}\\d{1,3}",
    flags: "g",
    description: "匹配 IPv4 地址",
    sampleText: "服务器 IP: 192.168.1.1 和 10.0.0.255"
  },
  {
    name: "日期 (YYYY-MM-DD)",
    pattern: "\\d{4}-\\d{2}-\\d{2}",
    flags: "g",
    description: "匹配日期格式",
    sampleText: "日期范围：2024-01-15 至 2024-12-31"
  },
  {
    name: "十六进制颜色",
    pattern: "#[0-9a-fA-F]{3,8}",
    flags: "gi",
    description: "匹配十六进制颜色值",
    sampleText: "颜色：#fff #FF5733 #00aaff80"
  },
  {
    name: "HTML 标签",
    pattern: "</?[a-zA-Z][a-zA-Z0-9]*[^>]*>",
    flags: "g",
    description: "匹配 HTML 标签",
    sampleText: '<div class="main"><p>Hello</p></div>'
  },
  {
    name: "中文字符",
    pattern: "[\\u4e00-\\u9fa5]+",
    flags: "g",
    description: "匹配连续中文字符",
    sampleText: "Hello 你好世界 Test 测试"
  },
  {
    name: "整数",
    pattern: "-?\\d+",
    flags: "g",
    description: "匹配整数（含负数）",
    sampleText: "值：42 -7 0 100 -255"
  },
  {
    name: "浮点数",
    pattern: "-?\\d+\\.\\d+",
    flags: "g",
    description: "匹配浮点数（含负数）",
    sampleText: "坐标：3.14 -0.5 100.00"
  },
  {
    name: "身份证号",
    pattern: "\\d{17}[\\dXx]",
    flags: "g",
    description: "匹配18位身份证号",
    sampleText: "身份证：110101199003077735"
  },
  {
    name: "时间 (HH:MM:SS)",
    pattern: "\\d{2}:\\d{2}:\\d{2}",
    flags: "g",
    description: "匹配时间格式",
    sampleText: "时间：09:30:00 到 17:45:30"
  }
];
