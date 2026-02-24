import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Database } from './database'
import * as schema from './schema'

describe('Database', () => {
  let database: Database

  beforeEach(() => {
    database = new Database(':memory:')
    database.initialize()
  })

  afterEach(() => {
    database.close()
  })

  describe('初始化', () => {
    // 正常路径：数据库初始化成功，4 张表全部存在
    it('初始化后表结构存在', () => {
      const tables = database.raw
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>
      const tableNames = tables.map((t) => t.name)
      expect(tableNames).toContain('conversations')
      expect(tableNames).toContain('messages')
      expect(tableNames).toContain('plugin_storage')
      expect(tableNames).toContain('settings')
    })

    // 正常路径：外键约束已启用
    it('PRAGMA foreign_keys 已开启', () => {
      const result = database.raw.pragma('foreign_keys') as Array<{ foreign_keys: number }>
      expect(result[0].foreign_keys).toBe(1)
    })

    // 边界条件：重复初始化不抛错
    it('重复初始化不报错', () => {
      expect(() => database.initialize()).not.toThrow()
    })
  })

  describe('未初始化保护', () => {
    it('未初始化时访问 drizzle 抛出 Error', () => {
      const uninit = new Database(':memory:')
      expect(() => uninit.drizzle).toThrow()
    })

    it('未初始化时访问 raw 抛出 Error', () => {
      const uninit = new Database(':memory:')
      expect(() => uninit.raw).toThrow()
    })
  })

  describe('Schema 一致性', () => {
    // 验证 database.ts 建表 SQL 与 schema.ts Drizzle schema 的列名一致
    it('实际数据库列名与 Drizzle schema 列名一致', () => {
      const schemaMap: Record<string, Record<string, unknown>> = {
        conversations: schema.conversations,
        messages: schema.messages,
        plugin_storage: schema.pluginStorage,
        settings: schema.settings
      }

      for (const [tableName, drizzleTable] of Object.entries(schemaMap)) {
        // 获取实际数据库的列名
        const columns = database.raw.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
          name: string
        }>
        const dbColumnNames = new Set(columns.map((c) => c.name))

        // 获取 Drizzle schema 定义的 DB 列名
        // Drizzle 的表对象中，每个列的 .name 属性对应数据库列名
        const drizzleColumnNames = new Set<string>()
        for (const [, col] of Object.entries(drizzleTable)) {
          if (col && typeof col === 'object' && 'name' in col) {
            drizzleColumnNames.add((col as { name: string }).name)
          }
        }

        expect(dbColumnNames).toEqual(drizzleColumnNames)
      }
    })
  })
})
