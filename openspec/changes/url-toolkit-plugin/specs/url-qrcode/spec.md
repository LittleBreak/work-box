## ADDED Requirements

### Requirement: 根据 URL 生成二维码

系统 SHALL 根据用户输入的 URL 生成对应的二维码图片，实时预览。

#### Scenario: 生成标准 URL 的二维码

- **WHEN** 用户输入 `https://example.com`
- **THEN** 系统实时生成并展示该 URL 对应的二维码图片

#### Scenario: URL 变更时更新二维码

- **WHEN** 用户修改输入框中的 URL
- **THEN** 二维码实时更新为新 URL 对应的内容

### Requirement: 空输入不生成二维码

系统 SHALL 在输入为空时不生成二维码，并显示引导提示。

#### Scenario: 空输入状态

- **WHEN** URL 输入框为空
- **THEN** 系统显示「请输入 URL 以生成二维码」的提示，不显示二维码图片

### Requirement: 超长 URL 警告

系统 SHALL 在 URL 超过 2000 字符时显示警告，提示二维码可能难以扫描。

#### Scenario: 超长 URL 生成二维码

- **WHEN** 用户输入超过 2000 字符的 URL
- **THEN** 系统生成二维码但同时显示警告提示「URL 过长，二维码可能难以扫描」

### Requirement: 下载二维码为 PNG

系统 SHALL 提供下载按钮，将当前二维码保存为 PNG 图片文件。

#### Scenario: 下载二维码图片

- **WHEN** 用户点击下载按钮
- **THEN** 系统将二维码保存为 PNG 文件，文件名格式为 `qrcode-<timestamp>.png`

### Requirement: 二维码尺寸可调

系统 SHALL 提供尺寸选项，允许用户调整二维码的大小。

#### Scenario: 调整二维码尺寸

- **WHEN** 用户选择不同的尺寸选项（如 128px、256px、512px）
- **THEN** 二维码按所选尺寸重新生成并展示
