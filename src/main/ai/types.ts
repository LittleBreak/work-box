/** AI Provider 适配器接口 - 统一不同 AI Provider 的调用方式 */
export interface AIProviderAdapter {
  /** Provider 唯一标识 */
  id: string;
  /** Provider 显示名称 */
  name: string;
  /** 获取可用模型列表 */
  getModels(): ModelInfo[];
  /** 根据模型 ID 创建模型实例（供 AI SDK streamText 使用） */
  createModel(modelId: string): unknown;
}

/** 模型信息 */
export interface ModelInfo {
  /** 模型唯一标识 */
  id: string;
  /** 模型显示名称 */
  name: string;
  /** 所属 Provider */
  provider: string;
}

/** Provider 创建所需配置 */
export interface ProviderSettings {
  apiKey: string;
  baseUrl: string;
}
