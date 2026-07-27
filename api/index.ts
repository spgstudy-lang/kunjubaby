import serverless from "serverless-http";

let handler: any = null;

export default async function (req: any, res: any) {
  try {
    if (!handler) {
      const serverModule = await import("../server");
      const app = serverModule.default;
      handler = serverless(app);
    }
    return handler(req, res);
  } catch (err: any) {
    console.error("Vercel Handler Init Error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: "Server Initialization Error",
      message: err?.message || String(err),
      stack: err?.stack || null
    }));
  }
}
