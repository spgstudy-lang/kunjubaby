import serverless from "serverless-http";
import app from "../server";

// Trigger Vercel rebuild: 2026-07-27T22:11:00Z
export default serverless(app);
