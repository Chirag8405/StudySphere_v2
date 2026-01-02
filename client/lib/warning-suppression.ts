// Enhanced warning suppression for Recharts library warnings
// This needs to run before React renders anything

// Store original methods
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Enhanced detection function
function isRechartsWarning(...args: any[]): boolean {
  const messageStr = args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg && typeof arg === "object") return JSON.stringify(arg);
      return String(arg);
    })
    .join(" ");

  return (
    messageStr.includes(
      "defaultProps will be removed from function components",
    ) ||
    messageStr.includes("Support for defaultProps will be removed") ||
    (messageStr.includes("XAxis") && messageStr.includes("defaultProps")) ||
    (messageStr.includes("YAxis") && messageStr.includes("defaultProps")) ||
    messageStr.includes("Use JavaScript default parameters instead")
  );
}

// Override console.warn with enhanced detection
console.warn = function (...args: any[]) {
  if (isRechartsWarning(...args)) {
    return; // Suppress Recharts warnings
  }
  originalConsoleWarn.apply(console, args);
};

// Override console.error with enhanced detection
console.error = function (...args: any[]) {
  if (isRechartsWarning(...args)) {
    return; // Suppress Recharts warnings
  }
  originalConsoleError.apply(console, args);
};

// Additional React DevTools suppression
if (typeof window !== "undefined") {
  // Suppress React DevTools warnings
  const suppressReactDevToolsWarnings = () => {
    const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && hook.onCommitFiberRoot) {
      const originalOnCommitFiberRoot = hook.onCommitFiberRoot;
      hook.onCommitFiberRoot = function (...args: any[]) {
        try {
          return originalOnCommitFiberRoot.apply(this, args);
        } catch (error) {
          const errorStr = String(error);
          if (isRechartsWarning(errorStr)) {
            return; // Suppress the error
          }
          throw error;
        }
      };
    }
  };

  // Apply suppression when DOM is ready and after React loads
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      suppressReactDevToolsWarnings,
    );
  } else {
    suppressReactDevToolsWarnings();
  }

  // Also try after a delay to catch late-loading DevTools
  setTimeout(suppressReactDevToolsWarnings, 1000);
  setTimeout(suppressReactDevToolsWarnings, 3000);
}

export {};
