import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDatabase } from "../storage/test-utils";
import { createSettingsHandler } from "./settings.handler";
import { DEFAULT_SETTINGS } from "../../shared/types";
import type { Database } from "../storage/database";
import type { Crud } from "../storage/crud";

describe("settings.handler", () => {
  let database: Database;
  let crud: Crud;
  let handler: ReturnType<typeof createSettingsHandler>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    database = testDb.database;
    crud = testDb.crud;
    handler = createSettingsHandler(crud);
  });

  afterEach(() => {
    database.close();
  });

  describe("getSettings", () => {
    // 正常路径：返回完整 AppSettings 对象，包含所有 8 个字段
    it("返回所有设置（合并默认值）", () => {
      const settings = handler.getSettings();
      expect(settings).toHaveProperty("theme");
      expect(settings).toHaveProperty("aiProvider");
      expect(settings).toHaveProperty("aiApiKey");
      expect(settings).toHaveProperty("aiBaseUrl");
      expect(settings).toHaveProperty("aiModel");
      expect(settings).toHaveProperty("aiTemperature");
      expect(settings).toHaveProperty("pluginDir");
      expect(settings).toHaveProperty("language");
    });

    // 边界条件：数据库为空时返回全部默认值
    it("无自定义设置时返回全部默认值", () => {
      const settings = handler.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    // 正常路径：数据库有值时覆盖默认值
    it("数据库中有值时覆盖默认值", () => {
      crud.setSetting("theme", JSON.stringify("light"));
      const settings = handler.getSettings();
      expect(settings.theme).toBe("light");
      expect(settings.aiProvider).toBe(DEFAULT_SETTINGS.aiProvider); // 其他字段仍为默认值
    });
  });

  describe("updateSettings", () => {
    // 正常路径
    it("更新设置并持久化", () => {
      handler.updateSettings({ theme: "light" });
      const settings = handler.getSettings();
      expect(settings.theme).toBe("light");
    });

    // 正常路径：部分更新不影响其他设置
    it("部分更新不覆盖其他设置", () => {
      handler.updateSettings({ theme: "light" });
      handler.updateSettings({ aiProvider: "claude" });
      const settings = handler.getSettings();
      expect(settings.theme).toBe("light");
      expect(settings.aiProvider).toBe("claude");
    });

    // 正常路径：值被 JSON 序列化存储
    it("值以 JSON 字符串形式存储到 settings 表", () => {
      handler.updateSettings({ aiTemperature: 0.5 });
      const raw = crud.getSetting("aiTemperature");
      expect(raw).toBe("0.5"); // JSON.stringify(0.5) === '0.5'
    });

    // 错误处理：无效设置值
    it("无效主题值抛出错误", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => handler.updateSettings({ theme: "invalid" as any })).toThrow();
    });

    // 错误处理：temperature 超出范围
    it("temperature 超出 [0, 2] 范围抛出错误", () => {
      expect(() => handler.updateSettings({ aiTemperature: 3 })).toThrow();
      expect(() => handler.updateSettings({ aiTemperature: -1 })).toThrow();
    });
  });

  describe("resetSettings", () => {
    it("重置后恢复默认值（清空 settings 表）", () => {
      handler.updateSettings({ theme: "light", aiProvider: "claude" });
      handler.resetSettings();
      const settings = handler.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it("重置后 settings 表为空", () => {
      handler.updateSettings({ theme: "light" });
      handler.resetSettings();
      expect(crud.getAllSettings()).toHaveLength(0);
    });
  });
});
