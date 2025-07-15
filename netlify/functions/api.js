import serverless from "serverless-http";

let cachedHandler = null;

export const handler = async (event, context) => {
  try {
    console.log("🚀 Netlify function starting...");

    // Initialize only once
    if (!cachedHandler) {
      const { default: getApp } = await import("../../server/api-netlify-turso.js");
      const app = await getApp();
      cachedHandler = serverless(app);
      console.log("✅ Express app initialized and cached");
    }

    // Reuse the cached handler
    return await cachedHandler(event, context);
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
