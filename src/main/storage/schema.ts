// ⚠️ 表结构以 database.ts 中的 CREATE TABLE SQL 为准，修改字段时需同步两处

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/** AI 对话历史 */
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  systemPrompt: text("system_prompt"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});

/** 对话消息 */
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  toolCalls: text("tool_calls"),
  toolResult: text("tool_result"),
  createdAt: integer("created_at").notNull()
});

/** 插件数据存储 */
export const pluginStorage = sqliteTable("plugin_storage", {
  pluginId: text("plugin_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull()
});

/** 应用配置 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull()
});
