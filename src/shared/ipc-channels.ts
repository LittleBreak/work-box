/**
 * 所有 IPC channel 在此统一定义
 * Channel 命名格式：`domain:action`（如 `fs:readFile`, `shell:exec`）
 */
export const IPC_CHANNELS = {} as const
