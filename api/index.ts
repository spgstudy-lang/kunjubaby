// Minimal diagnostic - no imports from server.ts
export default function(req: any, res: any) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    ok: true,
    ts: new Date().toISOString(),
    nodeVersion: process.version,
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      vercel: process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV
    }
  }));
}
