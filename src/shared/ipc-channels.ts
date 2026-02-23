/**
 * 所有 IPC channel 在此统一定义
 * Channel 命名格式：`domain:action`（如 `fs:readFile`, `shell:exec`）
 */
export const IPC_CHANNELS = {
  fs: {
    readFile: 'fs:readFile',
    writeFile: 'fs:writeFile',
    readDir: 'fs:readDir',
    stat: 'fs:stat'
  },
  shell: {
    exec: 'shell:exec'
  },
  ai: {
    chat: 'ai:chat',
    getModels: 'ai:getModels'
  },
  plugin: {
    list: 'plugin:list',
    enable: 'plugin:enable',
    disable: 'plugin:disable'
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update',
    reset: 'settings:reset'
  }
} as const
