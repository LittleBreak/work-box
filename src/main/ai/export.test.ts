import { describe, it, expect } from "vitest";
import { formatConversationAsMarkdown, formatConversationAsJSON } from "./export";
import type { Conversation, Message } from "../storage/crud";

/** 测试用对话工厂 */
function makeConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: "conv-1",
    title: "Test Conversation",
    systemPrompt: null,
    createdAt: 1700000000000,
    updatedAt: 1700000100000,
    ...overrides
  };
}

/** 测试用消息工厂 */
function makeMessage(overrides?: Partial<Message>): Message {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    role: "user",
    content: "Hello",
    toolCalls: null,
    toolResult: null,
    createdAt: 1700000010000,
    ...overrides
  };
}

describe("formatConversationAsMarkdown", () => {
  // 正常路径：基本对话导出
  it("格式化包含 user 和 assistant 消息的对话", () => {
    const conv = makeConversation({ title: "My Chat" });
    const msgs: Message[] = [
      makeMessage({ id: "m1", role: "user", content: "Hello", createdAt: 1700000010000 }),
      makeMessage({
        id: "m2",
        role: "assistant",
        content: "Hi there!",
        createdAt: 1700000020000
      })
    ];

    const result = formatConversationAsMarkdown(conv, msgs);
    expect(result).toContain("# My Chat");
    expect(result).toContain("**User**");
    expect(result).toContain("Hello");
    expect(result).toContain("**Assistant**");
    expect(result).toContain("Hi there!");
  });

  // 正常路径：包含导出时间和创建时间
  it("包含导出时间和对话创建时间", () => {
    const conv = makeConversation();
    const result = formatConversationAsMarkdown(conv, []);
    expect(result).toContain("Exported at");
    expect(result).toContain("Conversation created:");
  });

  // 边界条件：空对话
  it("空消息列表只输出标题和元信息", () => {
    const conv = makeConversation({ title: "Empty Chat" });
    const result = formatConversationAsMarkdown(conv, []);
    expect(result).toContain("# Empty Chat");
    expect(result).not.toContain("**User**");
    expect(result).not.toContain("**Assistant**");
  });

  // 正常路径：含代码块的消息
  it("正确保留消息中的代码块", () => {
    const conv = makeConversation();
    const msgs: Message[] = [
      makeMessage({
        id: "m1",
        role: "user",
        content: "Show me code"
      }),
      makeMessage({
        id: "m2",
        role: "assistant",
        content: "Here:\n```typescript\nconst x = 1;\n```"
      })
    ];

    const result = formatConversationAsMarkdown(conv, msgs);
    expect(result).toContain("```typescript");
    expect(result).toContain("const x = 1;");
  });

  // 正常路径：包含 system prompt 的对话
  it("包含 systemPrompt 时导出系统提示信息", () => {
    const conv = makeConversation({ systemPrompt: "You are a helpful coder." });
    const result = formatConversationAsMarkdown(conv, []);
    expect(result).toContain("System Prompt:");
    expect(result).toContain("You are a helpful coder.");
  });

  // 边界条件：systemPrompt 为 null 时不输出
  it("systemPrompt 为 null 时不输出系统提示", () => {
    const conv = makeConversation({ systemPrompt: null });
    const result = formatConversationAsMarkdown(conv, []);
    expect(result).not.toContain("System Prompt:");
  });

  // 正常路径：不包含 tool_calls/tool_result 的原始 JSON
  it("不输出 tool_calls 和 tool_result 原始 JSON", () => {
    const conv = makeConversation();
    const msgs: Message[] = [
      makeMessage({
        id: "m1",
        role: "assistant",
        content: "Let me read that file.",
        toolCalls: JSON.stringify([{ id: "call-1", name: "readFile" }]),
        toolResult: JSON.stringify({ content: "file content" })
      })
    ];

    const result = formatConversationAsMarkdown(conv, msgs);
    expect(result).toContain("Let me read that file.");
    expect(result).not.toContain("call-1");
    expect(result).not.toContain("readFile");
  });

  // 正常路径：消息之间有分隔线
  it("消息之间用分隔线分隔", () => {
    const conv = makeConversation();
    const msgs: Message[] = [
      makeMessage({ id: "m1", role: "user", content: "Q1" }),
      makeMessage({ id: "m2", role: "assistant", content: "A1" })
    ];

    const result = formatConversationAsMarkdown(conv, msgs);
    expect(result).toContain("---");
  });
});

describe("formatConversationAsJSON", () => {
  // 正常路径：完整结构化数据
  it("返回包含 conversation 和 messages 的结构化数据", () => {
    const conv = makeConversation({ title: "JSON Test" });
    const msgs: Message[] = [
      makeMessage({ id: "m1", role: "user", content: "Hello" }),
      makeMessage({ id: "m2", role: "assistant", content: "Hi" })
    ];

    const result = formatConversationAsJSON(conv, msgs);
    const parsed = JSON.parse(result);
    expect(parsed.conversation).toBeDefined();
    expect(parsed.conversation.id).toBe("conv-1");
    expect(parsed.conversation.title).toBe("JSON Test");
    expect(parsed.messages).toHaveLength(2);
  });

  // 正常路径：消息包含基本字段
  it("每条消息包含 id、role、content、createdAt", () => {
    const conv = makeConversation();
    const msgs: Message[] = [
      makeMessage({ id: "m1", role: "user", content: "Test", createdAt: 1700000010000 })
    ];

    const result = formatConversationAsJSON(conv, msgs);
    const parsed = JSON.parse(result);
    expect(parsed.messages[0].id).toBe("m1");
    expect(parsed.messages[0].role).toBe("user");
    expect(parsed.messages[0].content).toBe("Test");
    expect(parsed.messages[0].createdAt).toBe(1700000010000);
  });

  // 正常路径：包含导出时间
  it("包含 exportedAt 字段", () => {
    const conv = makeConversation();
    const result = formatConversationAsJSON(conv, []);
    const parsed = JSON.parse(result);
    expect(parsed.exportedAt).toBeDefined();
    expect(typeof parsed.exportedAt).toBe("string");
  });

  // 边界条件：空对话
  it("空消息列表返回空 messages 数组", () => {
    const conv = makeConversation();
    const result = formatConversationAsJSON(conv, []);
    const parsed = JSON.parse(result);
    expect(parsed.messages).toEqual([]);
  });

  // 正常路径：不包含 tool_calls/tool_result 原始字段
  it("不包含 tool_calls 和 tool_result 原始字段", () => {
    const conv = makeConversation();
    const msgs: Message[] = [
      makeMessage({
        id: "m1",
        role: "assistant",
        content: "Result",
        toolCalls: JSON.stringify([{ id: "tc1" }]),
        toolResult: JSON.stringify({ data: "x" })
      })
    ];

    const result = formatConversationAsJSON(conv, msgs);
    const parsed = JSON.parse(result);
    expect(parsed.messages[0].toolCalls).toBeUndefined();
    expect(parsed.messages[0].toolResult).toBeUndefined();
  });

  // 正常路径：包含 systemPrompt
  it("对话包含 systemPrompt 时输出到 conversation 字段", () => {
    const conv = makeConversation({ systemPrompt: "Be helpful" });
    const result = formatConversationAsJSON(conv, []);
    const parsed = JSON.parse(result);
    expect(parsed.conversation.systemPrompt).toBe("Be helpful");
  });

  // 正常路径：返回合法 JSON 字符串
  it("返回值是合法 JSON 字符串", () => {
    const conv = makeConversation();
    const msgs: Message[] = [makeMessage()];
    const result = formatConversationAsJSON(conv, msgs);
    expect(() => JSON.parse(result)).not.toThrow();
  });
});
