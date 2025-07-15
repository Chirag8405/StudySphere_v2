import serverless from "serverless-http";

let cachedHandler = null;

export const handler = async (event, context) => {
  try {
    console.log("🚀 Netlify function starting...");

    if (!cachedHandler) {
      const module = await import("../../server/api-netlify-turso.js");
      const { getApp } = module;

      if (typeof getApp !== "function") {
        throw new Error("getApp is not a function");
      }

      const app = await getApp();
      cachedHandler = serverless(app);
      console.log("✅ Express app initialized and cached");
    }

    return await cachedHandler(event, context);
  } catch (error) {
    console.error("❌ Function error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
