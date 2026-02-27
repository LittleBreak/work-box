import { eq, and, asc, desc, gte, like, InferSelectModel } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { conversations, messages, pluginStorage, settings } from "./schema";

/** 对话记录行类型 */
export type Conversation = InferSelectModel<typeof conversations>;

/** 消息记录行类型 */
export type Message = InferSelectModel<typeof messages>;

/** 消息角色类型 */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/** insertConversation 参数类型 */
export interface InsertConversationParams {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

/** updateConversation 可更新字段 */
export interface UpdateConversationFields {
  title?: string;
  systemPrompt?: string | null;
  updatedAt: number;
}

/** insertMessage 参数类型 */
export interface InsertMessageParams {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: string;
  toolResult?: string;
  createdAt: number;
}

/** CRUD 操作接口 */
export interface Crud {
  insertConversation(params: InsertConversationParams): void;
  getConversation(id: string): Conversation | undefined;
  updateConversation(id: string, fields: UpdateConversationFields): void;
  deleteConversation(id: string): void;
  getAllConversations(): Conversation[];
  insertMessage(params: InsertMessageParams): void;
  getMessage(messageId: string): Message | undefined;
  getMessagesByConversation(conversationId: string): Message[];
  updateMessageContent(messageId: string, content: string): void;
  deleteMessagesAfter(conversationId: string, messageId: string): void;
  searchConversations(query: string): Conversation[];
  getSetting(key: string): string | undefined;
  setSetting(key: string, value: string): void;
  deleteSetting(key: string): void;
  getAllSettings(): Array<{ key: string; value: string }>;
  deleteAllSettings(): void;
  getPluginData(pluginId: string, key: string): string | undefined;
  setPluginData(pluginId: string, key: string, value: string): void;
  deletePluginData(pluginId: string, key: string): void;
  deleteAllPluginData(pluginId: string): void;
}

/**
 * 创建 CRUD 操作对象。
 * 依赖注入模式：接收 Drizzle 实例，返回所有 CRUD 方法。
 * 所有方法均为同步函数（与 better-sqlite3 同步 API 一致）。
 */
export function createCrud(db: BetterSQLite3Database): Crud {
  return {
    // ---- conversations ----

    /** 插入对话 */
    insertConversation(params: InsertConversationParams): void {
      db.insert(conversations).values(params).run();
    },

    /** 查询单个对话，未找到返回 undefined */
    getConversation(id: string) {
      return db.select().from(conversations).where(eq(conversations.id, id)).get();
    },

    /** 更新对话（支持 title、systemPrompt、updatedAt） */
    updateConversation(id: string, fields: UpdateConversationFields): void {
      const setFields: Record<string, unknown> = { updatedAt: fields.updatedAt };
      if (fields.title !== undefined) setFields.title = fields.title;
      if ("systemPrompt" in fields) setFields.systemPrompt = fields.systemPrompt;
      db.update(conversations).set(setFields).where(eq(conversations.id, id)).run();
    },

    /** 删除对话 */
    deleteConversation(id: string): void {
      db.delete(conversations).where(eq(conversations.id, id)).run();
    },

    /** 获取所有对话，按 updatedAt 降序 */
    getAllConversations() {
      return db.select().from(conversations).orderBy(desc(conversations.updatedAt)).all();
    },

    // ---- messages ----

    /** 插入消息 */
    insertMessage(params: InsertMessageParams): void {
      db.insert(messages)
        .values({
          id: params.id,
          conversationId: params.conversationId,
          role: params.role,
          content: params.content,
          toolCalls: params.toolCalls ?? null,
          toolResult: params.toolResult ?? null,
          createdAt: params.createdAt
        })
        .run();
    },

    /** 查询单条消息，未找到返回 undefined */
    getMessage(messageId: string) {
      return db.select().from(messages).where(eq(messages.id, messageId)).get();
    },

    /** 查询对话的所有消息，按创建时间升序 */
    getMessagesByConversation(conversationId: string) {
      return db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt))
        .all();
    },

    /** 更新消息内容 */
    updateMessageContent(messageId: string, content: string): void {
      db.update(messages).set({ content }).where(eq(messages.id, messageId)).run();
    },

    /** 删除目标消息及其之后的所有消息（基于 createdAt） */
    deleteMessagesAfter(conversationId: string, messageId: string): void {
      const target = db.select().from(messages).where(eq(messages.id, messageId)).get();
      if (!target) return;
      db.delete(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            gte(messages.createdAt, target.createdAt)
          )
        )
        .run();
    },

    /** 按标题搜索对话，使用 SQLite LIKE 模糊匹配，结果按 updatedAt 降序 */
    searchConversations(query: string): Conversation[] {
      const trimmed = query.trim();
      if (!trimmed) return [];
      return db
        .select()
        .from(conversations)
        .where(like(conversations.title, `%${trimmed}%`))
        .orderBy(desc(conversations.updatedAt))
        .all();
    },

    // ---- settings ----

    /** 获取设置值，未找到返回 undefined */
    getSetting(key: string): string | undefined {
      const row = db.select().from(settings).where(eq(settings.key, key)).get();
      return row?.value;
    },

    /** 设置值（upsert 语义） */
    setSetting(key: string, value: string): void {
      db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } })
        .run();
    },

    /** 删除设置 */
    deleteSetting(key: string): void {
      db.delete(settings).where(eq(settings.key, key)).run();
    },

    /** 获取所有设置 */
    getAllSettings(): Array<{ key: string; value: string }> {
      return db.select().from(settings).all();
    },

    /** 删除所有设置 */
    deleteAllSettings(): void {
      db.delete(settings).run();
    },

    // ---- plugin_storage ----

    /** 获取插件数据，未找到返回 undefined */
    getPluginData(pluginId: string, key: string): string | undefined {
      const row = db
        .select()
        .from(pluginStorage)
        .where(and(eq(pluginStorage.pluginId, pluginId), eq(pluginStorage.key, key)))
        .get();
      return row?.value;
    },

    /** 设置插件数据（upsert 语义） */
    setPluginData(pluginId: string, key: string, value: string): void {
      db.insert(pluginStorage)
        .values({ pluginId, key, value })
        .onConflictDoUpdate({
          target: [pluginStorage.pluginId, pluginStorage.key],
          set: { value }
        })
        .run();
    },

    /** 删除单条插件数据 */
    deletePluginData(pluginId: string, key: string): void {
      db.delete(pluginStorage)
        .where(and(eq(pluginStorage.pluginId, pluginId), eq(pluginStorage.key, key)))
        .run();
    },

    /** 删除插件全部数据 */
    deleteAllPluginData(pluginId: string): void {
      db.delete(pluginStorage).where(eq(pluginStorage.pluginId, pluginId)).run();
    }
  };
}
