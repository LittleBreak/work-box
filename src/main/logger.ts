/**
 * Centralized logging system for the main process.
 *
 * Uses electron-log v5+ for structured file logging with rotation.
 * Falls back to console if electron-log is unavailable.
 */
import path from "node:path";
import fs from "node:fs";
import type { LogLevel } from "@shared/types";

// Re-export shared types for convenience
export type { LogLevel, LogEntry } from "@shared/types";

// ---- Types ----

/** Logger instance with scoped methods */
export interface Logger {
  /** Log error-level message */
  error(message: string, meta?: Record<string, unknown>): void;
  /** Log warn-level message */
  warn(message: string, meta?: Record<string, unknown>): void;
  /** Log info-level message */
  info(message: string, meta?: Record<string, unknown>): void;
  /** Log debug-level message */
  debug(message: string, meta?: Record<string, unknown>): void;
}

/** Options for initLogger */
export interface InitLoggerOptions {
  /** Custom log directory. Defaults to ~/.workbox/logs/ */
  logDir?: string;
}

// ---- Internal State ----

/** The underlying log transport function */
type LogTransport = (
  level: LogLevel,
  scope: string,
  message: string,
  meta?: Record<string, unknown>
) => void;

let transport: LogTransport = consoleTransport;

// ---- Console Fallback Transport ----

/** Fallback transport using console */
function consoleTransport(
  level: LogLevel,
  scope: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [${level}] [${scope}] ${message}`;
  const args: unknown[] = [formatted];
  if (meta && Object.keys(meta).length > 0) {
    args.push(meta);
  }

  switch (level) {
    case "error":
      console.error(...args);
      break;
    case "warn":
      console.warn(...args);
      break;
    case "debug":
      console.debug(...args);
      break;
    default:
      console.log(...args);
      break;
  }
}

// ---- electron-log Transport ----

/** Try to set up electron-log transport */
function createElectronLogTransport(logDir: string): LogTransport | null {
  try {
    // Dynamic import to avoid hard dependency during testing
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const log = require("electron-log");

    // Configure log file path
    log.transports.file.resolvePathFn = (): string => {
      return path.join(logDir, "main.log");
    };

    // Configure file rotation: max 10MB, keep 5 files
    log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB

    // Configure log format
    log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

    // Disable default console transport to avoid double logging
    log.transports.console.level = false;

    return (
      level: LogLevel,
      scope: string,
      message: string,
      meta?: Record<string, unknown>
    ): void => {
      const formatted = `[${scope}] ${message}`;
      const args: unknown[] =
        meta && Object.keys(meta).length > 0 ? [formatted, meta] : [formatted];

      switch (level) {
        case "error":
          log.error(...args);
          break;
        case "warn":
          log.warn(...args);
          break;
        case "debug":
          log.debug(...args);
          break;
        default:
          log.info(...args);
          break;
      }
    };
  } catch {
    // electron-log not available (e.g., in tests), fall back to console
    return null;
  }
}

// ---- Public API ----

/**
 * Initialize the logging system.
 * Configures electron-log for file output with rotation.
 * Falls back to console if electron-log is unavailable.
 *
 * @param options - Configuration options
 */
export function initLogger(options?: InitLoggerOptions): void {
  const logDir = options?.logDir ?? getDefaultLogDir();

  // Ensure log directory exists
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch {
    // If we can't create the log directory, fall back to console
    console.warn(`[logger] Failed to create log directory: ${logDir}, falling back to console`);
    transport = consoleTransport;

    return;
  }

  const electronLogTransport = createElectronLogTransport(logDir);
  if (electronLogTransport) {
    transport = electronLogTransport;
  } else {
    transport = consoleTransport;
  }
}

/**
 * Create a logger instance with a specific scope.
 *
 * @param scope - Logger scope identifier (e.g., 'main', 'plugin:json-formatter')
 * @returns Logger instance with error/warn/info/debug methods
 */
export function createLogger(scope: string): Logger {
  return {
    error(message: string, meta?: Record<string, unknown>): void {
      transport("error", scope, message, meta);
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      transport("warn", scope, message, meta);
    },
    info(message: string, meta?: Record<string, unknown>): void {
      transport("info", scope, message, meta);
    },
    debug(message: string, meta?: Record<string, unknown>): void {
      transport("debug", scope, message, meta);
    }
  };
}

/**
 * Install global error handlers for uncaughtException and unhandledRejection.
 * Logs errors using the provided logger before allowing the process to continue.
 *
 * @param logger - Logger instance to use for error logging
 */
export function installGlobalErrorHandlers(logger: Logger): void {
  process.on("uncaughtException", (error: Error) => {
    logger.error(`Uncaught exception: ${error.message}`, {
      stack: error.stack,
      name: error.name
    });
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    logger.error(`Unhandled rejection: ${message}`, { stack });
  });
}

/**
 * Get the default log directory path (~/.workbox/logs/).
 */
function getDefaultLogDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return path.join(home, ".workbox", "logs");
}
