// Suppress known library warnings from Recharts
// These warnings are from the library, not our code, and don't affect functionality

const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = args[0];

  // Suppress Recharts defaultProps warnings
  if (
    typeof message === "string" &&
    (message.includes(
      "defaultProps will be removed from function components",
    ) ||
      message.includes("Support for defaultProps will be removed"))
  ) {
    return;
  }

  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args[0];

  // Suppress Recharts defaultProps errors
  if (
    typeof message === "string" &&
    (message.includes(
      "defaultProps will be removed from function components",
    ) ||
      message.includes("Support for defaultProps will be removed"))
  ) {
    return;
  }

  originalError.apply(console, args);
};
