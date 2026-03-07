## ADDED Requirements

### Requirement: URL 完整编码

系统 SHALL 提供对完整 URL 进行编码的功能，使用 `encodeURI` 对整体 URL 编码。

#### Scenario: 编码包含中文的 URL

- **WHEN** 用户输入 `https://example.com/路径?名称=值`
- **THEN** 系统返回 `https://example.com/%E8%B7%AF%E5%BE%84?%E5%90%8D%E7%A7%B0=%E5%80%BC`

#### Scenario: 编码已编码的 URL

- **WHEN** 用户输入已经编码的 URL `https://example.com/%E4%B8%AD%E6%96%87`
- **THEN** 系统正常编码（不做双重编码检测），返回编码结果

### Requirement: URL 完整解码

系统 SHALL 提供对完整 URL 进行解码的功能，使用 `decodeURI` 对整体 URL 解码。

#### Scenario: 解码编码后的 URL

- **WHEN** 用户输入 `https://example.com/%E8%B7%AF%E5%BE%84?%E5%90%8D%E7%A7%B0=%E5%80%BC`
- **THEN** 系统返回 `https://example.com/路径?名称=值`

#### Scenario: 解码无效编码序列

- **WHEN** 用户输入包含无效编码序列的字符串（如 `%ZZ`）
- **THEN** 系统 SHALL 显示错误提示，说明解码失败原因

### Requirement: URL 组件编码

系统 SHALL 提供对 URL 组件（片段）进行编码的功能，使用 `encodeURIComponent` 编码。

#### Scenario: 编码包含特殊字符的组件

- **WHEN** 用户输入 `hello world&foo=bar`
- **THEN** 系统返回 `hello%20world%26foo%3Dbar`

### Requirement: URL 组件解码

系统 SHALL 提供对 URL 组件进行解码的功能，使用 `decodeURIComponent` 解码。

#### Scenario: 解码编码后的组件

- **WHEN** 用户输入 `hello%20world%26foo%3Dbar`
- **THEN** 系统返回 `hello world&foo=bar`

### Requirement: 编解码模式切换

系统 SHALL 提供 UI 控件让用户在「完整 URL」和「URL 组件」两种编解码模式间切换。

#### Scenario: 切换编码模式

- **WHEN** 用户从「完整 URL」模式切换到「URL 组件」模式
- **THEN** 系统使用 `encodeURIComponent` / `decodeURIComponent` 处理当前输入内容

### Requirement: 一键复制结果

系统 SHALL 在编解码结果旁提供复制按钮，点击后将结果复制到剪贴板。

#### Scenario: 复制编码结果

- **WHEN** 用户点击编码结果旁的复制按钮
- **THEN** 结果被复制到系统剪贴板，并显示成功提示
