const serverless = require("serverless-http");

// Import Turso-powered API
const getApp = require("../../server/api-netlify-turso.js");

// Export the serverless function
exports.handler = async (event, context) => {
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
