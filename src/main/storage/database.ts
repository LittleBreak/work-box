import BetterSqlite3 from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

/** 建表 SQL — 表结构的唯一执行路径（source of truth） */
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
  content         TEXT NOT NULL,
  tool_calls      TEXT,
  tool_result     TEXT,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_storage (
  plugin_id  TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  PRIMARY KEY (plugin_id, key)
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
`;

/**
 * SQLite 数据库封装类。
 * 管理 better-sqlite3 连接的生命周期和 Drizzle ORM 实例。
 */
export class Database {
  private _path: string;
  private _raw: BetterSqlite3.Database | null = null;
  private _drizzle: BetterSQLite3Database | null = null;

  /**
   * 构造函数仅保存路径参数，不打开连接。
   * @param dbPath - 数据库文件路径或 `:memory:` 用于内存数据库
   */
  constructor(dbPath: string) {
    this._path = dbPath;
  }

  /**
   * 初始化数据库：打开连接、启用外键、建表、运行迁移、创建 Drizzle 实例。
   * 可安全重复调用（CREATE TABLE IF NOT EXISTS）。
   */
  initialize(): void {
    if (!this._raw) {
      this._raw = new BetterSqlite3(this._path);
    }
    this._raw.pragma("foreign_keys = ON");
    this._raw.exec(CREATE_TABLES_SQL);
    this.runMigrations();
    if (!this._drizzle) {
      this._drizzle = drizzle(this._raw);
    }
  }

  /**
   * 运行增量迁移。
   * 每条 ALTER TABLE 包裹在 try-catch 中保证幂等（列已存在时静默忽略）。
   */
  private runMigrations(): void {
    try {
      this._raw!.exec("ALTER TABLE conversations ADD COLUMN system_prompt TEXT DEFAULT NULL");
    } catch {
      // 列已存在，静默忽略
    }
  }

  /** Drizzle ORM 实例，未初始化时访问抛出 Error */
  get drizzle(): BetterSQLite3Database {
    if (!this._drizzle) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this._drizzle;
  }

  /** 原生 better-sqlite3 连接，未初始化时访问抛出 Error */
  get raw(): BetterSqlite3.Database {
    if (!this._raw) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this._raw;
  }

  /** 关闭数据库连接 */
  close(): void {
    if (this._raw) {
      this._raw.close();
      this._raw = null;
      this._drizzle = null;
    }
  }
}
