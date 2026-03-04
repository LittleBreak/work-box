import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";

/** A component that throws an error on render */
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }): React.JSX.Element {
  if (shouldThrow) {
    throw new Error("Test render error");
  }
  return <div data-testid="child">Child content</div>;
}

describe("ErrorBoundary", () => {
  // Suppress React error boundary console.error in tests
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("正常渲染子组件", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId("child")).toBeDefined();
    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("子组件抛错后显示 fallback UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    // Should show error UI with reload button
    expect(screen.getByText(/出错了/)).toBeDefined();
  });

  it("显示重新加载按钮", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    const reloadButton = screen.getByRole("button", { name: /重新加载/ });
    expect(reloadButton).toBeDefined();
  });

  it("onError 回调被调用", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("Test render error");
  });

  it("自定义 fallback 渲染", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId("custom-fallback")).toBeDefined();
  });

  it("点击重新加载按钮重置错误状态", () => {
    // Use a wrapper to control the throwing behavior
    let shouldThrow = true;
    function ConditionalChild(): React.JSX.Element {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return <div data-testid="recovered">Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>
    );

    // Error UI should be showing
    const reloadButton = screen.getByRole("button", { name: /重新加载/ });

    // Fix the child so it won't throw
    shouldThrow = false;

    // Click reload — this triggers setState which re-renders children
    fireEvent.click(reloadButton);

    // After reset, child should render successfully
    expect(screen.getByTestId("recovered")).toBeDefined();
  });
});
