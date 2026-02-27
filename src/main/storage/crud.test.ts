import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDatabase } from "./test-utils";
import type { Database } from "./database";

// 注意：better-sqlite3 + drizzle-orm 的 better-sqlite3 driver 均为同步 API，
// 所有 CRUD 函数为同步函数，测试中不使用 async/await。

describe("Schema CRUD 操作", () => {
  let database: Database;
  let crud: ReturnType<typeof import("./crud").createCrud>;

  beforeEach(() => {
    const testDb = createTestDatabase();
    database = testDb.database;
    crud = testDb.crud;
  });

  afterEach(() => {
    database.close();
  });

  describe("conversations 表", () => {
    // 正常路径：创建对话
    it("创建对话并查询", () => {
      const id = "conv-001";
      crud.insertConversation({
        id,
        title: "Test Chat",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      const conv = crud.getConversation(id);
      expect(conv).toBeDefined();
      expect(conv!.title).toBe("Test Chat");
    });

    // 正常路径：更新对话标题和 updatedAt
    it("更新对话标题和 updatedAt", () => {
      const id = "conv-002";
      const now = Date.now();
      crud.insertConversation({ id, title: "Old", createdAt: now, updatedAt: now });
      const later = now + 5000;
      crud.updateConversation(id, { title: "New Title", updatedAt: later });
      const conv = crud.getConversation(id);
      expect(conv!.title).toBe("New Title");
      expect(conv!.updatedAt).toBe(later);
    });

    // 正常路径：删除对话（无关联消息）
    it("删除对话", () => {
      const id = "conv-003";
      crud.insertConversation({
        id,
        title: "To Delete",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      crud.deleteConversation(id);
      const conv = crud.getConversation(id);
      expect(conv).toBeUndefined();
    });

    // 正常路径：删除对话时级联删除关联消息（ON DELETE CASCADE）
    it("删除对话时级联删除关联消息", () => {
      crud.insertConversation({
        id: "conv-cascade",
        title: "Cascade Test",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      crud.insertMessage({
        id: "msg-cascade-1",
        conversationId: "conv-cascade",
        role: "user",
        content: "Hello",
        createdAt: Date.now()
      });
      crud.insertMessage({
        id: "msg-cascade-2",
        conversationId: "conv-cascade",
        role: "assistant",
        content: "Hi",
        createdAt: Date.now()
      });
      crud.deleteConversation("conv-cascade");
      const messages = crud.getMessagesByConversation("conv-cascade");
      expect(messages).toHaveLength(0);
    });

    // 边界条件：查询不存在的对话
    it("查询不存在的对话返回 undefined", () => {
      const conv = crud.getConversation("nonexistent");
      expect(conv).toBeUndefined();
    });
  });

  describe("messages 表", () => {
    // 每个 messages 测试前先创建所需的 conversation
    beforeEach(() => {
      crud.insertConversation({
        id: "conv-msg",
        title: "Chat",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });

    // 正常路径：创建消息（仅必填字段）
    it("创建消息并查询", () => {
      crud.insertMessage({
        id: "msg-001",
        conversationId: "conv-msg",
        role: "user",
        content: "Hello",
        createdAt: Date.now()
      });
      const messages = crud.getMessagesByConversation("conv-msg");
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hello");
      // toolCalls 和 toolResult 为可选字段，未传入时应为 null
      expect(messages[0].toolCalls).toBeNull();
      expect(messages[0].toolResult).toBeNull();
    });

    // 正常路径：创建带 toolCalls 和 toolResult 的消息
    it("创建带 tool 字段的消息", () => {
      const toolCalls = JSON.stringify([
        { id: "call-1", name: "readFile", args: { path: "/tmp" } }
      ]);
      const toolResult = JSON.stringify({ content: "file content" });
      crud.insertMessage({
        id: "msg-tool",
        conversationId: "conv-msg",
        role: "assistant",
        content: "Let me read that file.",
        toolCalls,
        toolResult,
        createdAt: Date.now()
      });
      const messages = crud.getMessagesByConversation("conv-msg");
      expect(messages[0].toolCalls).toBe(toolCalls);
      expect(messages[0].toolResult).toBe(toolResult);
    });

    // 正常路径：role 枚举校验（system、tool 角色）
    it("支持所有 role 值：user, assistant, system, tool", () => {
      const roles = ["user", "assistant", "system", "tool"] as const;
      roles.forEach((role, i) => {
        crud.insertMessage({
          id: `msg-role-${i}`,
          conversationId: "conv-msg",
          role,
          content: `${role} message`,
          createdAt: Date.now() + i
        });
      });
      const messages = crud.getMessagesByConversation("conv-msg");
      expect(messages).toHaveLength(4);
    });

    // 正常路径：按时间排序
    it("消息按创建时间排序", () => {
      const now = Date.now();
      crud.insertMessage({
        id: "msg-1",
        conversationId: "conv-msg",
        role: "user",
        content: "first",
        createdAt: now
      });
      crud.insertMessage({
        id: "msg-2",
        conversationId: "conv-msg",
        role: "assistant",
        content: "second",
        createdAt: now + 100
      });
      crud.insertMessage({
        id: "msg-3",
        conversationId: "conv-msg",
        role: "user",
        content: "third",
        createdAt: now + 200
      });
      const messages = crud.getMessagesByConversation("conv-msg");
      expect(messages.map((m) => m.content)).toEqual(["first", "second", "third"]);
    });

    // 错误处理：外键约束（需要 PRAGMA foreign_keys = ON）
    it("引用不存在的 conversationId 抛错", () => {
      expect(() =>
        crud.insertMessage({
          id: "msg-bad",
          conversationId: "nonexistent",
          role: "user",
          content: "x",
          createdAt: Date.now()
        })
      ).toThrow();
    });
  });

  describe("settings 表", () => {
    // 正常路径：设置和获取
    it("保存和获取设置值", () => {
      crud.setSetting("theme", "dark");
      const value = crud.getSetting("theme");
      expect(value).toBe("dark");
    });

    // 正常路径：更新已有设置（upsert 语义）
    it("更新已有设置值", () => {
      crud.setSetting("theme", "light");
      crud.setSetting("theme", "dark");
      const value = crud.getSetting("theme");
      expect(value).toBe("dark");
    });

    // 正常路径：删除设置（删除整行记录）
    it("删除设置", () => {
      crud.setSetting("theme", "dark");
      crud.deleteSetting("theme");
      const value = crud.getSetting("theme");
      expect(value).toBeUndefined();
    });

    // 边界条件：获取不存在的设置
    it("获取不存在的设置返回 undefined", () => {
      const value = crud.getSetting("nonexistent");
      expect(value).toBeUndefined();
    });

    // 正常路径：JSON 序列化的复杂值（由调用者负责序列化）
    it("支持 JSON 序列化的复杂值", () => {
      const config = { provider: "openai", model: "gpt-4", temperature: 0.7 };
      crud.setSetting("ai", JSON.stringify(config));
      const value = JSON.parse(crud.getSetting("ai")!);
      expect(value.provider).toBe("openai");
    });

    // 边界条件：删除不存在的设置不抛错
    it("删除不存在的设置不抛错", () => {
      expect(() => crud.deleteSetting("nonexistent")).not.toThrow();
    });

    // 正常路径：获取所有设置
    it("获取所有设置", () => {
      crud.setSetting("theme", '"dark"');
      crud.setSetting("language", '"zh"');
      const all = crud.getAllSettings();
      expect(all).toHaveLength(2);
      expect(all.map((r) => r.key).sort()).toEqual(["language", "theme"]);
    });

    // 边界条件：无设置时返回空数组
    it("无设置时 getAllSettings 返回空数组", () => {
      const all = crud.getAllSettings();
      expect(all).toHaveLength(0);
    });

    // 正常路径：删除所有设置
    it("删除所有设置", () => {
      crud.setSetting("theme", '"dark"');
      crud.setSetting("language", '"zh"');
      crud.deleteAllSettings();
      expect(crud.getAllSettings()).toHaveLength(0);
      expect(crud.getSetting("theme")).toBeUndefined();
    });

    // 边界条件：空表时 deleteAllSettings 不抛错
    it("空表时 deleteAllSettings 不抛错", () => {
      expect(() => crud.deleteAllSettings()).not.toThrow();
    });
  });

  describe("plugin_storage 表", () => {
    // 正常路径：按插件 ID + key 存取（value 为原始字符串，调用者负责 JSON 序列化）
    it("按 pluginId + key 保存和获取", () => {
      crud.setPluginData("git-helper", "lastCommit", '"abc123"');
      const value = crud.getPluginData("git-helper", "lastCommit");
      expect(value).toBe('"abc123"');
    });

    // 正常路径：更新已有 key 的值（upsert 语义）
    it("更新已有 key 的值", () => {
      crud.setPluginData("plugin-a", "config", '"old"');
      crud.setPluginData("plugin-a", "config", '"new"');
      expect(crud.getPluginData("plugin-a", "config")).toBe('"new"');
    });

    // 边界条件：不同插件相同 key 不冲突
    it("不同插件的相同 key 互不干扰", () => {
      crud.setPluginData("plugin-a", "config", '"a"');
      crud.setPluginData("plugin-b", "config", '"b"');
      expect(crud.getPluginData("plugin-a", "config")).toBe('"a"');
      expect(crud.getPluginData("plugin-b", "config")).toBe('"b"');
    });

    // 正常路径：删除单条插件数据
    it("删除指定 pluginId + key 的数据", () => {
      crud.setPluginData("plugin-a", "config", '"val"');
      crud.deletePluginData("plugin-a", "config");
      expect(crud.getPluginData("plugin-a", "config")).toBeUndefined();
    });

    // 正常路径：删除插件全部数据
    it("删除插件全部数据", () => {
      crud.setPluginData("plugin-a", "k1", '"v1"');
      crud.setPluginData("plugin-a", "k2", '"v2"');
      crud.setPluginData("plugin-b", "k1", '"other"');
      crud.deleteAllPluginData("plugin-a");
      expect(crud.getPluginData("plugin-a", "k1")).toBeUndefined();
      expect(crud.getPluginData("plugin-a", "k2")).toBeUndefined();
      // 不影响其他插件
      expect(crud.getPluginData("plugin-b", "k1")).toBe('"other"');
    });

    // 边界条件：删除不存在的插件数据不抛错
    it("删除不存在的插件数据不抛错", () => {
      expect(() => crud.deletePluginData("unknown", "missing")).not.toThrow();
      expect(() => crud.deleteAllPluginData("unknown")).not.toThrow();
    });

    // 边界条件：获取不存在的 key 返回 undefined
    it("获取不存在的 key 返回 undefined", () => {
      const value = crud.getPluginData("unknown", "missing");
      expect(value).toBeUndefined();
    });
  });

  describe("getMessage", () => {
    beforeEach(() => {
      crud.insertConversation({
        id: "conv-gm",
        title: "Chat",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });

    // 正常路径：获取存在的消息
    it("返回存在的消息", () => {
      const now = Date.now();
      crud.insertMessage({
        id: "msg-gm-1",
        conversationId: "conv-gm",
        role: "user",
        content: "Hello",
        createdAt: now
      });
      const msg = crud.getMessage("msg-gm-1");
      expect(msg).toBeDefined();
      expect(msg!.content).toBe("Hello");
      expect(msg!.role).toBe("user");
    });

    // 边界条件：获取不存在的消息返回 undefined
    it("不存在的消息返回 undefined", () => {
      const msg = crud.getMessage("nonexistent");
      expect(msg).toBeUndefined();
    });
  });

  describe("updateMessageContent", () => {
    beforeEach(() => {
      crud.insertConversation({
        id: "conv-umc",
        title: "Chat",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });

    // 正常路径：更新消息内容
    it("更新消息内容", () => {
      crud.insertMessage({
        id: "msg-umc-1",
        conversationId: "conv-umc",
        role: "user",
        content: "Original",
        createdAt: Date.now()
      });
      crud.updateMessageContent("msg-umc-1", "Updated");
      const msg = crud.getMessage("msg-umc-1");
      expect(msg!.content).toBe("Updated");
    });

    // 边界条件：更新不存在的消息不抛错
    it("更新不存在的消息不抛错", () => {
      expect(() => crud.updateMessageContent("nonexistent", "Updated")).not.toThrow();
    });
  });

  describe("deleteMessagesAfter", () => {
    beforeEach(() => {
      crud.insertConversation({
        id: "conv-dma",
        title: "Chat",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });

    // 正常路径：删除目标消息及后续消息
    it("删除目标消息及其之后的所有消息", () => {
      const base = 1000;
      crud.insertMessage({
        id: "msg-dma-1",
        conversationId: "conv-dma",
        role: "user",
        content: "First",
        createdAt: base
      });
      crud.insertMessage({
        id: "msg-dma-2",
        conversationId: "conv-dma",
        role: "assistant",
        content: "Second",
        createdAt: base + 100
      });
      crud.insertMessage({
        id: "msg-dma-3",
        conversationId: "conv-dma",
        role: "user",
        content: "Third",
        createdAt: base + 200
      });
      crud.insertMessage({
        id: "msg-dma-4",
        conversationId: "conv-dma",
        role: "assistant",
        content: "Fourth",
        createdAt: base + 300
      });

      crud.deleteMessagesAfter("conv-dma", "msg-dma-2");
      const msgs = crud.getMessagesByConversation("conv-dma");
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe("First");
    });

    // 正常路径：保留目标之前的消息
    it("保留目标消息之前的消息", () => {
      const base = 1000;
      crud.insertMessage({
        id: "msg-dma-a",
        conversationId: "conv-dma",
        role: "user",
        content: "Keep1",
        createdAt: base
      });
      crud.insertMessage({
        id: "msg-dma-b",
        conversationId: "conv-dma",
        role: "assistant",
        content: "Keep2",
        createdAt: base + 100
      });
      crud.insertMessage({
        id: "msg-dma-c",
        conversationId: "conv-dma",
        role: "user",
        content: "Delete",
        createdAt: base + 200
      });

      crud.deleteMessagesAfter("conv-dma", "msg-dma-c");
      const msgs = crud.getMessagesByConversation("conv-dma");
      expect(msgs).toHaveLength(2);
      expect(msgs.map((m) => m.content)).toEqual(["Keep1", "Keep2"]);
    });

    // 边界条件：目标消息不存在时不抛错
    it("目标消息不存在时不抛错", () => {
      expect(() => crud.deleteMessagesAfter("conv-dma", "nonexistent")).not.toThrow();
    });

    // 边界条件：只有一条消息时删除
    it("只有一条消息时删除该消息", () => {
      crud.insertMessage({
        id: "msg-dma-only",
        conversationId: "conv-dma",
        role: "user",
        content: "Only",
        createdAt: 1000
      });
      crud.deleteMessagesAfter("conv-dma", "msg-dma-only");
      const msgs = crud.getMessagesByConversation("conv-dma");
      expect(msgs).toHaveLength(0);
    });

    // 边界条件：删除第一条时删除全部
    it("删除第一条消息时删除全部消息", () => {
      const base = 1000;
      crud.insertMessage({
        id: "msg-dma-f1",
        conversationId: "conv-dma",
        role: "user",
        content: "First",
        createdAt: base
      });
      crud.insertMessage({
        id: "msg-dma-f2",
        conversationId: "conv-dma",
        role: "assistant",
        content: "Second",
        createdAt: base + 100
      });
      crud.deleteMessagesAfter("conv-dma", "msg-dma-f1");
      const msgs = crud.getMessagesByConversation("conv-dma");
      expect(msgs).toHaveLength(0);
    });
  });

  describe("systemPrompt CRUD", () => {
    // 正常路径：新对话 systemPrompt 默认为 null
    it("新对话 systemPrompt 默认为 null", () => {
      crud.insertConversation({
        id: "conv-sp1",
        title: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      const conv = crud.getConversation("conv-sp1");
      expect(conv!.systemPrompt).toBeNull();
    });

    // 正常路径：更新 systemPrompt
    it("更新对话 systemPrompt", () => {
      const now = Date.now();
      crud.insertConversation({
        id: "conv-sp2",
        title: "Test",
        createdAt: now,
        updatedAt: now
      });
      crud.updateConversation("conv-sp2", {
        systemPrompt: "You are a helpful assistant.",
        updatedAt: now + 1000
      });
      const conv = crud.getConversation("conv-sp2");
      expect(conv!.systemPrompt).toBe("You are a helpful assistant.");
    });

    // 正常路径：读回 systemPrompt
    it("更新后读回 systemPrompt 值一致", () => {
      const now = Date.now();
      crud.insertConversation({
        id: "conv-sp3",
        title: "Test",
        createdAt: now,
        updatedAt: now
      });
      const prompt = "你是一个代码助手，只用中文回答";
      crud.updateConversation("conv-sp3", { systemPrompt: prompt, updatedAt: now + 1000 });
      const conv = crud.getConversation("conv-sp3");
      expect(conv!.systemPrompt).toBe(prompt);
    });

    // 正常路径：清除 systemPrompt 为 null
    it("将 systemPrompt 清除为 null", () => {
      const now = Date.now();
      crud.insertConversation({
        id: "conv-sp4",
        title: "Test",
        createdAt: now,
        updatedAt: now
      });
      crud.updateConversation("conv-sp4", { systemPrompt: "Some prompt", updatedAt: now + 1000 });
      crud.updateConversation("conv-sp4", { systemPrompt: null, updatedAt: now + 2000 });
      const conv = crud.getConversation("conv-sp4");
      expect(conv!.systemPrompt).toBeNull();
    });

    // 正常路径：只更新 systemPrompt 不影响 title
    it("只更新 systemPrompt 不影响 title", () => {
      const now = Date.now();
      crud.insertConversation({
        id: "conv-sp5",
        title: "My Title",
        createdAt: now,
        updatedAt: now
      });
      crud.updateConversation("conv-sp5", { systemPrompt: "prompt", updatedAt: now + 1000 });
      const conv = crud.getConversation("conv-sp5");
      expect(conv!.title).toBe("My Title");
      expect(conv!.systemPrompt).toBe("prompt");
    });
  });
});
