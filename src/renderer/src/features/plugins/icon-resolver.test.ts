import { describe, it, expect } from "vitest";
import { Terminal, FolderOpen, GitBranch, Braces, Regex, Puzzle } from "lucide-react";
import { resolvePluginIcon } from "./icon-resolver";

describe("resolvePluginIcon", () => {
  it("已知图标名 terminal 返回 Terminal 组件", () => {
    expect(resolvePluginIcon("terminal")).toBe(Terminal);
  });

  it("已知图标名 folder-open 返回 FolderOpen 组件", () => {
    expect(resolvePluginIcon("folder-open")).toBe(FolderOpen);
  });

  it("已知图标名 git-branch 返回 GitBranch 组件", () => {
    expect(resolvePluginIcon("git-branch")).toBe(GitBranch);
  });

  it("已知图标名 braces 返回 Braces 组件", () => {
    expect(resolvePluginIcon("braces")).toBe(Braces);
  });

  it("已知图标名 regex 返回 Regex 组件", () => {
    expect(resolvePluginIcon("regex")).toBe(Regex);
  });

  it("undefined 返回默认 Puzzle 图标", () => {
    expect(resolvePluginIcon(undefined)).toBe(Puzzle);
  });

  it("空字符串返回默认 Puzzle 图标", () => {
    expect(resolvePluginIcon("")).toBe(Puzzle);
  });

  it("未知图标名返回默认 Puzzle 图标", () => {
    expect(resolvePluginIcon("unknown-icon")).toBe(Puzzle);
  });
});
