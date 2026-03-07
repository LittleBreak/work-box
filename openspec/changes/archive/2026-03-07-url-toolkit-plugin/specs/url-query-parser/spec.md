## ADDED Requirements

### Requirement: 自动解析 query 参数

系统 SHALL 在用户输入 URL 后自动解析其 query string，并以结构化的键值对形式展示所有参数。

#### Scenario: 解析标准 query string

- **WHEN** 用户输入 `https://example.com/path?name=alice&age=30&city=beijing`
- **THEN** 系统展示参数表格：`name=alice`、`age=30`、`city=beijing`

#### Scenario: 解析无 query 参数的 URL

- **WHEN** 用户输入 `https://example.com/path`
- **THEN** 系统显示「无 query 参数」的提示信息

#### Scenario: 解析无效 URL

- **WHEN** 用户输入无法被 `new URL()` 解析的字符串
- **THEN** 系统 SHALL 显示错误提示，说明 URL 格式无效

### Requirement: 处理重复参数名

系统 SHALL 正确处理同名参数（如 `?tag=a&tag=b`），展示所有值。

#### Scenario: 展示重复参数

- **WHEN** 用户输入 `https://example.com?tag=a&tag=b&tag=c`
- **THEN** 系统展示 `tag` 参数的所有值：`a`、`b`、`c`

### Requirement: 自动解码参数值

系统 SHALL 自动对参数名和参数值进行 URL 解码后展示。

#### Scenario: 展示解码后的中文参数

- **WHEN** 用户输入 `https://example.com?%E5%90%8D%E7%A7%B0=%E5%BC%A0%E4%B8%89`
- **THEN** 系统展示解码后的参数：`名称=张三`

### Requirement: 复制单个参数

系统 SHALL 在每个参数旁提供复制按钮，支持复制单个参数的键值对。

#### Scenario: 复制参数键值对

- **WHEN** 用户点击 `name=alice` 旁的复制按钮
- **THEN** `name=alice` 被复制到剪贴板

### Requirement: 展示 URL 结构分解

系统 SHALL 在参数表格上方展示 URL 的结构分解（protocol、host、pathname、hash）。

#### Scenario: 展示完整 URL 结构

- **WHEN** 用户输入 `https://api.example.com:8080/v1/users?id=1#section`
- **THEN** 系统分别展示 protocol(`https:`)、host(`api.example.com:8080`)、pathname(`/v1/users`)、search(`?id=1`)、hash(`#section`)
