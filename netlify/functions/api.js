import serverless from "serverless-http";

// Import Turso-powered API (make sure the dist file is ESM too)
const { default: getApp } = await import("../../server/api-netlify-turso.js");

// Export the handler as an async function
export const handler = async (event, context) => {
  try {
    console.log("🚀 Netlify function starting...");

    const app = await getApp();
    const handler = serverless(app);

    console.log("✅ Request processed successfully");
    return handler(event, context);
  } catch (error) {
    console.error("❌ Function error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
