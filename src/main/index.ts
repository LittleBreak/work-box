import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { registerIPCHandlers } from "./ipc/register";
import { Database } from "./storage/database";
import { createCrud } from "./storage/crud";
import { createAIService, createProviderAdapter } from "./ai";
import { createSettingsHandler } from "./ipc/settings.handler";
import type { Crud } from "./storage/crud";
import type { AIService } from "./ai";
import icon from "../../resources/icon.png?asset";

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.workbox");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  ipcMain.on("ping", () => console.log("pong"));

  // 初始化数据库
  const dbPath = join(app.getPath("userData"), "workbox.db");
  const database = new Database(dbPath);
  database.initialize();
  const crud = createCrud(database.drizzle);

  // 初始化 AI 服务
  const aiService = initAIService(crud);

  registerIPCHandlers({ crud, aiService });

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * 从数据库读取 AI 设置并创建 AI 服务实例。
 * 如果创建失败（如设置缺失），返回 undefined 并降级为 notImplemented 处理。
 */
function initAIService(crud: Crud): AIService | undefined {
  try {
    const settingsHandler = createSettingsHandler(crud);
    const { aiProvider, aiApiKey, aiBaseUrl, aiModel } = settingsHandler.getSettings();

    const adapter = createProviderAdapter({ aiProvider, aiApiKey, aiBaseUrl });
    return createAIService({ crud, adapter, model: aiModel });
  } catch (err) {
    console.error("[AI] Failed to initialize AI service:", err);
    return undefined;
  }
}
