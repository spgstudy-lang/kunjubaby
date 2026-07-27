let appInstance: any = null;

export default async function (req: any, res: any) {
  try {
    if (!appInstance) {
      let m: any;
      try {
        m = await import("../server.js");
      } catch (e1) {
        try {
          m = await import("../server");
        } catch (e2: any) {
          throw new Error(`Failed to load server module. e1: ${e1?.message}, e2: ${e2?.message}`);
        }
      }
      appInstance = m.default || m;
    }
    return appInstance(req, res);
  } catch (err: any) {
    console.error("Vercel Startup Error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: "Vercel Startup Error",
      message: err?.message || String(err),
      stack: err?.stack || null
    }));
  }
}
