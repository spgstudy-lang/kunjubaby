import express from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (
  process.env.SUPABASE_URL || "https://zawnmkvqbrdeiqgsfxzg.supabase.co"
).trim();

const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphd25ta3ZxYnJkZWlxZ3NmeHpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE3NjcxMCwiZXhwIjoyMTAwNzUyNzEwfQ.WFetvohX0TpWBUTh7EEEMohdnlNNoeSidwu3l3UJioY"
).trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: "healthy", supabase: SUPABASE_URL, timestamp: new Date().toISOString() });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const hash = crypto.createHash("sha256").update(password).digest("hex");

    // Admin login
    if (email === "syam@gmail.com" && password === "225500") {
      return res.json({
        message: "Logged in successfully",
        token: "00000000-0000-0000-0000-000000000001",
        user: {
          id: "00000000-0000-0000-0000-000000000002",
          user_id: "00000000-0000-0000-0000-000000000001",
          name: "Syam (Admin)",
          role: "admin",
          email: "syam@gmail.com"
        }
      });
    }

    const { data: userAuth, error: authError } = await supabase
      .from("users_auth")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (authError || !userAuth) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (userAuth.password_hash !== hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { data: profile } = await supabase
      .from("users_profile")
      .select("*")
      .eq("user_id", userAuth.id)
      .maybeSingle();

    return res.json({
      message: "Logged in successfully",
      token: userAuth.id,
      user: profile || { user_id: userAuth.id, email: userAuth.email, role: userAuth.role }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default function (req: any, res: any) {
  return app(req, res);
}
