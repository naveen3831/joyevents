import { createRoot } from "react-dom/client";
import { Component, ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";
import { initSession } from "./lib/session";
import { syncPlatformSettings } from "./lib/platformName";
import { measurePerformance, optimizeImages } from "./lib/performance";
import "./lib/i18n"; // initialize English labels

// Must run before React renders — clears inherited sessionStorage on fresh tab loads
initSession();

// Set document.title synchronously from localStorage before first render
document.title = localStorage.getItem("platformName") || "JoyEvents";

// Initialize performance optimizations
measurePerformance();
optimizeImages();

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", fontFamily: "monospace", color: "#f87171" }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{(this.state.error as Error).message}</pre>
          <button onClick={() => window.location.href = "/"} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fetch latest platform name BEFORE mounting React so first render shows correct name
syncPlatformSettings().finally(() => {
  document.title = localStorage.getItem("platformName") || "JoyEvents";
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
});
