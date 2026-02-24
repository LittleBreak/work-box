import type { IpcMain } from "electron";
import type { Crud } from "../storage/crud";
import { IPC_CHANNELS } from "../../shared/ipc-channels";
import { DEFAULT_SETTINGS, validateSettings } from "../../shared/types";
import type { AppSettings } from "../../shared/types";

/** settings handler 返回类型 */
export interface SettingsHandler {
  getSettings(): AppSettings;
  updateSettings(partial: Partial<AppSettings>): void;
  resetSettings(): void;
}

/**
 * 创建 settings handler（依赖注入，便于测试）。
 * 返回 getSettings / updateSettings / resetSettings 三个方法。
 */
export function createSettingsHandler(crud: Crud): SettingsHandler {
  return {
    /** 获取所有设置，合并默认值 */
    getSettings(): AppSettings {
      const rows = crud.getAllSettings();
      const dbValues: Record<string, unknown> = {};
      for (const row of rows) {
        dbValues[row.key] = JSON.parse(row.value);
      }
      return { ...DEFAULT_SETTINGS, ...dbValues } as AppSettings;
    },

    /** 部分更新设置，先校验再逐条写入 */
    updateSettings(partial: Partial<AppSettings>): void {
      validateSettings(partial);
      for (const [key, value] of Object.entries(partial)) {
        crud.setSetting(key, JSON.stringify(value));
      }
    },

    /** 重置设置（清空 settings 表，getSettings 自然回到默认值） */
    resetSettings(): void {
      crud.deleteAllSettings();
    }
  };
}

/**
 * 在 ipcMain 上注册 settings IPC handler。
 * 用于 register.ts 中调用，替换空壳函数。
 */
export function setupSettingsHandlers(ipcMain: IpcMain, crud: Crud): void {
  const handler = createSettingsHandler(crud);

  ipcMain.handle(IPC_CHANNELS.settings.get, () => {
    return handler.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.settings.update, (_event, partial: Partial<AppSettings>) => {
    handler.updateSettings(partial);
  });

  ipcMain.handle(IPC_CHANNELS.settings.reset, () => {
    handler.resetSettings();
  });
}
