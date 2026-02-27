/**
 * 所有 IPC channel 在此统一定义
 * Channel 命名格式：`domain:action`（如 `fs:readFile`, `shell:exec`）
 */
export const IPC_CHANNELS = {
  fs: {
    readFile: "fs:readFile",
    writeFile: "fs:writeFile",
    readDir: "fs:readDir",
    stat: "fs:stat"
  },
  shell: {
    exec: "shell:exec"
  },
  ai: {
    chat: "ai:chat",
    getModels: "ai:getModels",
    getConversations: "ai:getConversations",
    getHistory: "ai:getHistory",
    deleteConversation: "ai:deleteConversation",
    stream: "ai:stream",
    updateSystemPrompt: "ai:updateSystemPrompt",
    deleteMessagesAfter: "ai:deleteMessagesAfter",
    regenerate: "ai:regenerate",
    updateMessageContent: "ai:updateMessageContent",
    exportConversation: "ai:exportConversation",
    searchConversations: "ai:searchConversations"
  },
  plugin: {
    list: "plugin:list",
    enable: "plugin:enable",
    disable: "plugin:disable"
  },
  settings: {
    get: "settings:get",
    update: "settings:update",
    reset: "settings:reset"
  },
  clipboard: {
    writeText: "clipboard:writeText"
  },
  workspace: {
    selectFile: "workspace:selectFile"
  },
  terminal: {
    create: "terminal:create",
    write: "terminal:write",
    resize: "terminal:resize",
    close: "terminal:close",
    list: "terminal:list",
    data: "terminal:data",
    exit: "terminal:exit"
  }
} as const;
