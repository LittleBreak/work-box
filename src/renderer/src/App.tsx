import { useCallback, useEffect } from "react";
import { AppLayout } from "@renderer/components/Layout/AppLayout";
import { ErrorBoundary } from "@renderer/components/ErrorBoundary";
import { useAppStore } from "@renderer/stores/app.store";

function App(): React.JSX.Element {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    // Send error to main process via IPC for logging
    try {
      window.workbox?.log?.write({
        level: "error",
        scope: "renderer",
        message: `ErrorBoundary caught: ${error.message}`,
        timestamp: new Date().toISOString(),
        meta: {
          stack: error.stack,
          componentStack: errorInfo.componentStack
        }
      });
    } catch {
      // Fallback to console if IPC unavailable
      console.error("[ErrorBoundary]", error, errorInfo);
    }
  }, []);

  return (
    <ErrorBoundary onError={handleError}>
      <AppLayout />
    </ErrorBoundary>
  );
}

export default App;
