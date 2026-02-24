import type { ExecResult, ExecOptions, FileStat, AppSettings } from "../shared/types";

interface WorkboxAPI {
  fs: {
    readFile(path: string): Promise<string>;
    writeFile(path: string, data: string): Promise<void>;
    readDir(path: string): Promise<string[]>;
    stat(path: string): Promise<FileStat>;
  };
  shell: {
    exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  };
  ai: {
    chat(params: unknown): Promise<unknown>;
    getModels(): Promise<unknown>;
  };
  plugin: {
    list(): Promise<unknown>;
    enable(id: string): Promise<void>;
    disable(id: string): Promise<void>;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(settings: Partial<AppSettings>): Promise<void>;
    reset(): Promise<void>;
  };
}

declare global {
  interface Window {
    workbox: WorkboxAPI;
  }
}
