import type { Conversation, Message } from "../storage/crud";

/**
 * 将对话格式化为 Markdown 字符串。
 * 不包含 tool_calls/tool_result 原始 JSON，格式化为人类可读文本。
 */
export function formatConversationAsMarkdown(
  conversation: Conversation,
  messages: Message[]
): string {
  const lines: string[] = [];

  // 标题
  lines.push(`# ${conversation.title}`);
  lines.push("");

  // 元信息
  lines.push(`> Exported at ${new Date().toISOString()}`);
  lines.push(`> Conversation created: ${new Date(conversation.createdAt).toISOString()}`);
  lines.push("");

  // 系统 Prompt（如果有）
  if (conversation.systemPrompt) {
    lines.push(`> **System Prompt:** ${conversation.systemPrompt}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // 消息列表
  for (const msg of messages) {
    const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    const time = new Date(msg.createdAt).toISOString();

    lines.push(`**${role}** _${time}_`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/** JSON 导出中的消息格式（排除 tool_calls/tool_result） */
interface ExportMessage {
  id: string;
  role: string;
  content: string;
  createdAt: number;
}

/** JSON 导出的完整结构 */
interface ExportData {
  exportedAt: string;
  conversation: {
    id: string;
    title: string;
    systemPrompt: string | null;
    createdAt: number;
    updatedAt: number;
  };
  messages: ExportMessage[];
}

/**
 * 将对话格式化为 JSON 字符串。
 * 返回 `{ conversation, messages, exportedAt }` 的结构化数据。
 * 不包含 tool_calls/tool_result 原始字段。
 */
export function formatConversationAsJSON(conversation: Conversation, messages: Message[]): string {
  const data: ExportData = {
    exportedAt: new Date().toISOString(),
    conversation: {
      id: conversation.id,
      title: conversation.title,
      systemPrompt: conversation.systemPrompt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    },
    messages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt
    }))
  };

  return JSON.stringify(data, null, 2);
}
