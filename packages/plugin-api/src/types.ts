/**
 * @workbox/plugin-api - Complete type definitions for Work-Box plugin system
 */

// ---- Shared types (mirrored from src/shared/types.ts for package independence) ----

/** Shell command execution result */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal?: string;
}

/** Shell command execution options */
export interface ExecOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

/** File metadata */
export interface FileStat {
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  mtime: number;
}

// ---- Disposable ----

/** Disposable resource handle returned by registration methods */
export interface Disposable {
  /** Release the resource */
  dispose(): void;
}

// ---- Permission ----

/** Plugin permission identifiers matching ARCHITECTURE.md 4.5 */
export type Permission =
  | "fs:read"
  | "fs:write"
  | "shell:exec"
  | "network:fetch"
  | "ai:chat"
  | "clipboard"
  | "notification";

// ---- Plugin Manifest (basic metadata) ----

/** Basic plugin metadata from package.json top-level fields */
export interface PluginManifest {
  /** Unique plugin identifier (package.json name) */
  name: string;
  /** Semantic version string */
  version: string;
  /** Human-readable description */
  description?: string;
  /** Plugin author */
  author?: string;
}

// ---- Command & Tool definitions ----

/** Command definition for keyboard shortcuts and command palette */
export interface CommandDefinition {
  /** Unique command identifier */
  id: string;
  /** Human-readable title */
  title: string;
  /** Optional keyboard shortcut (e.g., "CmdOrCtrl+Shift+C") */
  shortcut?: string;
}

/** AI Tool definition for LLM tool calling */
export interface ToolDefinition {
  /** Tool name (used in AI tool calls) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Parameter schema definition */
  parameters: Record<string, unknown>;
  /** Tool execution handler */
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

// ---- WorkboxPluginConfig (package.json "workbox" field) ----

/** Configuration from the "workbox" field in a plugin's package.json */
export interface WorkboxPluginConfig {
  /** Display name of the plugin */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Path to plugin icon */
  icon?: string;
  /** Required permissions */
  permissions: Permission[];
  /** Entry point paths */
  entry: {
    /** Main process entry point */
    main: string;
    /** Optional renderer process UI entry */
    ui?: string;
  };
  /** Registered commands */
  commands?: CommandDefinition[];
  /** AI integration configuration */
  ai?: {
    /** Tool names this plugin provides */
    tools: string[];
  };
}

// ---- Watch callback ----

/** Callback for file system watch events */
export type WatchCallback = (event: string, filename: string) => void;

// ---- PluginContext (8 submodules) ----

/** Plugin context provided to activate(), matches ARCHITECTURE.md 4.3 */
export interface PluginContext {
  /** Plugin metadata */
  plugin: {
    /** Plugin identifier */
    id: string;
    /** Display name */
    name: string;
    /** Plugin version */
    version: string;
    /** Plugin data directory path */
    dataPath: string;
  };

  /** File system operations (requires fs:read / fs:write permission) */
  fs: {
    readFile(path: string): Promise<Buffer>;
    writeFile(path: string, data: Buffer | string): Promise<void>;
    readDir(path: string): Promise<string[]>;
    stat(path: string): Promise<FileStat>;
    watch(path: string, callback: WatchCallback): Disposable;
  };

  /** Shell command execution (requires shell:exec permission) */
  shell: {
    exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  };

  /** AI capabilities (requires ai:chat permission for chat) */
  ai: {
    chat(
      messages: Array<{ role: string; content: string }>,
      options?: Record<string, unknown>
    ): AsyncIterable<unknown>;
    registerTool(tool: ToolDefinition): Disposable;
  };

  /** Command registration */
  commands: {
    register(id: string, handler: () => Promise<void>): Disposable;
  };

  /** UI notifications */
  notification: {
    success(message: string): void;
    error(message: string): void;
    info(message: string): void;
  };

  /** Workspace operations */
  workspace: {
    rootPath: string;
    selectFolder(): Promise<string | null>;
    selectFile(filters?: Array<{ name: string; extensions: string[] }>): Promise<string | null>;
  };

  /** Plugin-private key-value storage */
  storage: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };
}

// ---- PluginDefinition ----

/** Plugin definition passed to definePlugin() */
export interface PluginDefinition {
  /** Plugin name identifier */
  name: string;
  /** Called when the plugin is activated */
  activate(ctx: PluginContext): Promise<void>;
  /** Called when the plugin is deactivated (optional) */
  deactivate?(): Promise<void>;
}
