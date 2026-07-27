import serverless from "serverless-http";
import app from "../server";

const handler = serverless(app);

export default async function(req: any, res: any) {
  try {
    return await handler(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Execution Error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ 
        error: err?.message || "Internal Server Error",
        details: String(err)
      }));
    }
  }
}



