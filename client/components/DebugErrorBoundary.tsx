// DebugErrorBoundary.tsx
import React from "react";

class DebugErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(err: Error) {
    return { error: err };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, background: "#fee", color: "#900" }}>
          <h2>💥 Uncaught render error:</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default DebugErrorBoundary;
