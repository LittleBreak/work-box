import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

/** xterm.js 暗色主题 */
const DARK_THEME = {
  background: "#1e1e1e",
  foreground: "#d4d4d4",
  cursor: "#d4d4d4",
  selectionBackground: "#264f78",
  black: "#1e1e1e",
  red: "#f44747",
  green: "#6a9955",
  yellow: "#d7ba7d",
  blue: "#569cd6",
  magenta: "#c586c0",
  cyan: "#4ec9b0",
  white: "#d4d4d4",
  brightBlack: "#808080",
  brightRed: "#f44747",
  brightGreen: "#6a9955",
  brightYellow: "#d7ba7d",
  brightBlue: "#569cd6",
  brightMagenta: "#c586c0",
  brightCyan: "#4ec9b0",
  brightWhite: "#e8e8e8"
};

/** xterm.js 亮色主题 */
const LIGHT_THEME = {
  background: "#ffffff",
  foreground: "#383a42",
  cursor: "#383a42",
  selectionBackground: "#b6d7f4",
  black: "#383a42",
  red: "#e45649",
  green: "#50a14f",
  yellow: "#c18401",
  blue: "#4078f2",
  magenta: "#a626a4",
  cyan: "#0184bc",
  white: "#fafafa",
  brightBlack: "#a0a1a7",
  brightRed: "#e45649",
  brightGreen: "#50a14f",
  brightYellow: "#c18401",
  brightBlue: "#4078f2",
  brightMagenta: "#a626a4",
  brightCyan: "#0184bc",
  brightWhite: "#ffffff"
};

/** TerminalInstance 组件属性 */
interface TerminalInstanceProps {
  /** PTY session ID */
  sessionId: string;
  /** 是否为当前活跃实例 */
  isActive: boolean;
  /** 主题模式 */
  theme?: "dark" | "light";
}

/** 单个终端实例组件，挂载 xterm.js Terminal */
export function TerminalInstance({
  sessionId,
  isActive,
  theme = "dark"
}: TerminalInstanceProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // 初始化 xterm.js Terminal 实例
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontFamily: '"Cascadia Code", "Fira Code", "Menlo", monospace',
      fontSize: 14,
      theme: theme === "dark" ? DARK_THEME : LIGHT_THEME,
      cursorBlink: true,
      scrollback: 5000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    // 延迟 fit 以确保 DOM 已完成布局
    requestAnimationFrame(() => {
      fitAddon.fit();
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 用户键入 → 发送到 PTY stdin
    const onDataDisposable = terminal.onData((data) => {
      window.workbox.terminal.write(sessionId, data);
    });

    // PTY stdout → 写入 terminal
    const unsubData = window.workbox.terminal.onData((sid, data) => {
      if (sid === sessionId) {
        terminal.write(data);
      }
    });

    // PTY 退出事件
    const unsubExit = window.workbox.terminal.onExit((sid, exitCode) => {
      if (sid === sessionId) {
        terminal.write(`\r\n[Process exited with code ${exitCode}]\r\n`);
      }
    });

    // 容器 resize → fitAddon.fit() + IPC resize
    const resizeObserver = new ResizeObserver(() => {
      if (!fitAddonRef.current) return;
      fitAddonRef.current.fit();
      const dims = fitAddonRef.current.proposeDimensions();
      if (dims) {
        window.workbox.terminal.resize(sessionId, dims.cols, dims.rows);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      onDataDisposable.dispose();
      unsubData();
      unsubExit();
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, theme]);

  // 当 tab 变为活跃时重新 fit 以适配尺寸
  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
      });
    }
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      data-testid={`terminal-instance-${sessionId}`}
      className="h-full w-full"
      style={{ display: isActive ? "block" : "none" }}
    />
  );
}
