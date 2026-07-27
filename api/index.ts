import app from "../server";

// Vercel Serverless Express Handler
// Timestamp: 2026-07-27T22:46:00Z
export default function (req: any, res: any) {
  return app(req, res);
}
