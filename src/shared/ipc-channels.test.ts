import { describe, it, expect } from "vitest";
import { IPC_CHANNELS } from "./ipc-channels";

describe("IPC_CHANNELS", () => {
  // 正常路径：通道常量存在且格式正确
  it("定义 fs 领域通道", () => {
    expect(IPC_CHANNELS.fs.readFile).toBe("fs:readFile");
    expect(IPC_CHANNELS.fs.writeFile).toBe("fs:writeFile");
    expect(IPC_CHANNELS.fs.readDir).toBe("fs:readDir");
    expect(IPC_CHANNELS.fs.stat).toBe("fs:stat");
  });

  it("定义 shell 领域通道", () => {
    expect(IPC_CHANNELS.shell.exec).toBe("shell:exec");
  });

  it("定义 ai 领域通道", () => {
    expect(IPC_CHANNELS.ai.chat).toBe("ai:chat");
    expect(IPC_CHANNELS.ai.getModels).toBe("ai:getModels");
  });

  it("定义 plugin 领域通道", () => {
    expect(IPC_CHANNELS.plugin.list).toBe("plugin:list");
    expect(IPC_CHANNELS.plugin.enable).toBe("plugin:enable");
    expect(IPC_CHANNELS.plugin.disable).toBe("plugin:disable");
  });

  it("定义 settings 领域通道", () => {
    expect(IPC_CHANNELS.settings.get).toBe("settings:get");
    expect(IPC_CHANNELS.settings.update).toBe("settings:update");
    expect(IPC_CHANNELS.settings.reset).toBe("settings:reset");
  });

  // 边界条件：通道对象是 as const（只读）
  it("IPC_CHANNELS 是只读的", () => {
    expect(typeof IPC_CHANNELS).toBe("object");
    expect(IPC_CHANNELS).toBeDefined();
  });

  // 正常路径：所有通道值遵循 domain:action 格式
  it("所有通道值遵循 domain:action 命名格式", () => {
    const pattern = /^[a-z]+:[a-zA-Z]+$/;
    const allChannels = Object.values(IPC_CHANNELS).flatMap((domain) => Object.values(domain));
    allChannels.forEach((channel) => {
      expect(channel).toMatch(pattern);
    });
  });
});
