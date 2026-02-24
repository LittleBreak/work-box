import { Database } from './database'
import { createCrud, Crud } from './crud'

/** 测试数据库返回类型 */
interface TestDatabase {
  database: Database
  crud: Crud
}

/**
 * 创建用于测试的内存数据库和 CRUD 实例。
 * 自动初始化表结构和 PRAGMA foreign_keys = ON。
 */
export function createTestDatabase(): TestDatabase {
  const database = new Database(':memory:')
  database.initialize()
  const crud = createCrud(database.drizzle)
  return { database, crud }
}
