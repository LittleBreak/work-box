import type {
  ExecResult,
  ExecOptions,
  FileStat,
  AppSettings,
  TerminalCreateOptions
} from "../shared/types";

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
  terminal: {
    create(options?: TerminalCreateOptions): Promise<string>;
    write(sessionId: string, data: string): Promise<void>;
    resize(sessionId: string, cols: number, rows: number): Promise<void>;
    close(sessionId: string): Promise<void>;
    list(): Promise<string[]>;
    onData(callback: (sessionId: string, data: string) => void): () => void;
    onExit(callback: (sessionId: string, exitCode: number) => void): () => void;
  };
  log?: {
    write(entry: {
      level: string;
      scope: string;
      message: string;
      timestamp: string;
      meta?: Record<string, unknown>;
    }): void;
  };
  /** Dynamic plugin-registered APIs (e.g., fileExplorer, git) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

declare global {
  interface Window {
    workbox: WorkboxAPI;
  }
}
