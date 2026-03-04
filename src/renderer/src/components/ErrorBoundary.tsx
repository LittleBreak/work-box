/**
 * React Error Boundary component.
 *
 * Catches rendering errors in child components and displays a fallback UI
 * with a reload button. Optionally reports errors via callback (for IPC logging).
 */
import React from "react";

/** ErrorBoundary component props */
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Custom fallback UI to display on error */
  fallback?: React.ReactNode;
  /** Callback invoked when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/** ErrorBoundary component state */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React class component that catches rendering errors in its subtree.
 * Displays a friendly error UI with a "Reload" button.
 *
 * Must be a class component — React's componentDidCatch / getDerivedStateFromError
 * are only available in class components.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  /** Reset error state to re-render children */
  private handleReload = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: "2rem",
            textAlign: "center"
          }}
        >
          <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: 600 }}>
            出错了 / Something went wrong
          </h2>
          <p style={{ marginBottom: "1rem", color: "#888", maxWidth: "400px" }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReload}
            aria-label="重新加载"
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "0.375rem",
              border: "1px solid #555",
              backgroundColor: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: "0.875rem"
            }}
          >
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
