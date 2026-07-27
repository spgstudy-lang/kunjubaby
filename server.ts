import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// ─── Supabase ────────────────────────────────────────────────────────────────
const SUPABASE_URL = (
  process.env.SUPABASE_URL || "https://zawnmkvqbrdeiqgsfxzg.supabase.co"
).trim();

const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphd25ta3ZxYnJkZWlxZ3NmeHpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE3NjcxMCwiZXhwIjoyMTAwNzUyNzEwfQ.WFetvohX0TpWBUTh7EEEMohdnlNNoeSidwu3l3UJioY"
).trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("Supabase initialized:", SUPABASE_URL);

// ─── Admin constants ──────────────────────────────────────────────────────────
const ADMIN_EMAIL        = "syam@gmail.com";
const ADMIN_USER_ID      = "00000000-0000-0000-0000-000000000001";
const ADMIN_PROFILE_ID   = "00000000-0000-0000-0000-000000000002";
const ADMIN_PW_HASH      = crypto.createHash("sha256").update("225500").digest("hex");

// ─── Gemini AI (lazy dynamic import to avoid ESM conflicts on Vercel) ─────────
let _aiInstance: any = null;
async function getAI(): Promise<any | null> {
  if (!process.env.GEMINI_API_KEY) return null;
  if (_aiInstance) return _aiInstance;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    _aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
  } catch (e) {
    console.error("Failed to load @google/genai:", e);
  }
  return _aiInstance;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hashPw(pw: string) {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

function ok(res: express.Response, data: any, status = 200) {
  return res.status(status).json(data);
}

function fail(res: express.Response, msg: string, status = 500) {
  return res.status(status).json({ error: msg });
}

// Log activity to Supabase (fire-and-forget, never crash request)
async function logActivity(userId: string, activityType: string, description: string) {
  try {
    // Try to get user profile for name/role
    const { data: profile } = await supabase
      .from("users_profile")
      .select("name,role")
      .eq("user_id", userId)
      .maybeSingle();

    await supabase.from("activity_logs").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      user_name: profile?.name || "User",
      user_role: profile?.role || "user",
      activity_type: activityType,
      description,
      created_at: new Date().toISOString()
    });
  } catch (_) {}
}

// Default hospital bag items
const DEFAULT_BAG_ITEMS = [
  { item_name: "Nightgown / Loose comfy clothes",           category: "mother" },
  { item_name: "Slippers & Warm socks",                    category: "mother" },
  { item_name: "Robe / Comfy cardigan",                    category: "mother" },
  { item_name: "Toiletries (toothbrush, paste, shampoo, hair tie)", category: "mother" },
  { item_name: "Phone charger with long cable",            category: "mother" },
  { item_name: "Nursing bra & Nursing pads",               category: "mother" },
  { item_name: "Maternity pads",                           category: "mother" },
  { item_name: "Lip balm & lotion",                        category: "mother" },
  { item_name: "Onesies & Sleepsuits (3-4 sets)",          category: "baby"   },
  { item_name: "Swaddle blankets & warm baby blanket",     category: "baby"   },
  { item_name: "Diapers & sensitive baby wipes",           category: "baby"   },
  { item_name: "Baby mittens, socks & hats",               category: "baby"   },
  { item_name: "Going-home outfit",                        category: "baby"   },
  { item_name: "Car seat (installed or ready)",            category: "baby"   },
  { item_name: "IDs (Passports / Driver's licenses)",      category: "documents" },
  { item_name: "Health insurance card / Hospital paperwork", category: "documents" },
  { item_name: "Pediatrician contact details",             category: "documents" },
  { item_name: "Birth plan copy",                          category: "documents" }
];

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return fail(res, "Unauthorized: missing token", 401);
  }
  const token = authHeader.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    return fail(res, "Unauthorized: invalid token", 401);
  }

  // Admin fast-path
  if (token === ADMIN_USER_ID) {
    (req as any).user = {
      id: ADMIN_PROFILE_ID, user_id: ADMIN_USER_ID,
      name: "Syam (Admin)", role: "admin", email: ADMIN_EMAIL
    };
    return next();
  }

  // Supabase profile lookup
  try {
    const { data: profile } = await supabase
      .from("users_profile")
      .select("*")
      .or(`user_id.eq.${token},id.eq.${token}`)
      .maybeSingle();

    if (!profile) {
      return fail(res, "Unauthorized: session not found. Please log in again.", 401);
    }
    (req as any).user = profile;
    next();
  } catch (err: any) {
    console.error("Auth middleware error:", err);
    return fail(res, "Authentication error", 500);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// Health check
app.get("/api/health", (_req, res) => {
  ok(res, { status: "ok", supabase: SUPABASE_URL, timestamp: new Date().toISOString() });
});

app.get("/api", (_req, res) => {
  ok(res, { message: "Kunju Baby API is operational" });
});

// Schema file endpoint
app.get("/api/supabase/schema", (_req, res) => {
  try {
    const p = path.join(process.cwd(), "supabase_schema.sql");
    if (fs.existsSync(p)) return res.type("text/plain").send(fs.readFileSync(p, "utf-8"));
    return fail(res, "Schema file not found", 404);
  } catch { return fail(res, "Error reading schema", 500); }
});

// Supabase status
app.get("/api/supabase/status", async (_req, res) => {
  try {
    const { error } = await supabase.from("users_auth").select("id").limit(1);
    ok(res, { connected: !error, supabaseUrl: SUPABASE_URL, message: error ? error.message : "Connected" });
  } catch (err: any) {
    ok(res, { connected: false, message: err.message });
  }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password || !role) {
      return fail(res, "Missing required fields (name, email, password, role)", 400);
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const pwHash = hashPw(String(password));
    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();

    // Check duplicate email
    const { data: existing, error: checkErr } = await supabase
      .from("users_auth").select("id").eq("email", cleanEmail).maybeSingle();

    if (checkErr) {
      if (checkErr.code === "PGRST205") {
        return fail(res, "Database not set up. Run supabase_schema.sql first.", 503);
      }
      return fail(res, "Database error: " + checkErr.message);
    }
    if (existing) return fail(res, "Email already registered", 400);

    // Insert auth
    const { error: authErr } = await supabase.from("users_auth").insert({
      id: userId, email: cleanEmail, password_hash: pwHash
    });
    if (authErr) return fail(res, "Failed to create account: " + authErr.message);

    // Insert profile
    const profile = {
      id: profileId, user_id: userId,
      name: String(name), role: String(role),
      email: cleanEmail, created_at: new Date().toISOString()
    };
    await supabase.from("users_profile").insert(profile);

    // Pre-fill hospital bag
    try {
      const bagItems = DEFAULT_BAG_ITEMS.map(item => ({
        id: crypto.randomUUID(), user_id: userId,
        item_name: item.item_name, category: item.category,
        is_packed: false, is_custom: false,
        created_at: new Date().toISOString()
      }));
      await supabase.from("hospital_bag_checklist").insert(bagItems);
    } catch (_) {}

    logActivity(userId, "signup", `Joined as ${role}`);

    return ok(res, { message: "Registered successfully", user: profile, token: userId }, 201);
  } catch (err: any) {
    console.error("Signup error:", err);
    return fail(res, err?.message || "Signup failed");
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPw = String(password || "").trim();

    if (!cleanEmail || !cleanPw) {
      return fail(res, "Missing email or password", 400);
    }

    const pwHash = hashPw(cleanPw);

    // Admin fast-path
    if (cleanEmail === ADMIN_EMAIL.toLowerCase() &&
        (cleanPw === "225500" || pwHash === ADMIN_PW_HASH)) {
      logActivity(ADMIN_USER_ID, "login", "Admin logged in");
      return ok(res, {
        message: "Logged in successfully",
        token: ADMIN_USER_ID,
        user: { id: ADMIN_PROFILE_ID, user_id: ADMIN_USER_ID, name: "Syam (Admin)", role: "admin", email: ADMIN_EMAIL }
      });
    }

    // Supabase auth lookup
    const { data: authUser, error: authErr } = await supabase
      .from("users_auth").select("*").eq("email", cleanEmail).maybeSingle();

    if (authErr) {
      if (authErr.code === "PGRST205") {
        return fail(res, "Database not set up. Run supabase_schema.sql first.", 503);
      }
      return fail(res, "Database error during login");
    }

    if (!authUser) return fail(res, "Invalid email or password", 401);

    const pwMatch = authUser.password_hash === pwHash || authUser.password_hash === cleanPw;
    if (!pwMatch) return fail(res, "Invalid email or password", 401);

    // Fetch or auto-create profile
    let { data: profile } = await supabase
      .from("users_profile").select("*").eq("user_id", authUser.id).maybeSingle();

    if (!profile) {
      profile = {
        id: crypto.randomUUID(), user_id: authUser.id,
        name: cleanEmail.split("@")[0], role: "wife",
        email: cleanEmail, created_at: new Date().toISOString()
      };
      await supabase.from("users_profile").insert(profile);
    }

    logActivity(authUser.id, "login", "Logged in");
    return ok(res, { message: "Logged in successfully", token: authUser.id, user: profile });
  } catch (err: any) {
    console.error("Login error:", err);
    return fail(res, err?.message || "Login failed");
  }
});

app.get("/api/auth/me", authenticateUser, (req, res) => {
  ok(res, { user: (req as any).user });
});

// ─── SCANS ────────────────────────────────────────────────────────────────────

app.get("/api/scans", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("scans").select("*").eq("user_id", userId).order("scan_date", { ascending: false });
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/scans", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("scans").insert(item).select().single();
    if (error) return fail(res, error.message);
    logActivity(userId, "scan_added", "Added ultrasound scan");
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/scans/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("scans").update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/scans/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { error } = await supabase.from("scans").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Scan deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────

app.get("/api/appointments", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("appointments").select("*").eq("user_id", userId).order("appointment_date", { ascending: true });
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/appointments", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("appointments").insert(item).select().single();
    if (error) return fail(res, error.message);
    logActivity(userId, "appointment_added", "Added appointment");
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/appointments/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("appointments").update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/appointments/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { error } = await supabase.from("appointments").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Appointment deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── FINANCES ─────────────────────────────────────────────────────────────────

app.get("/api/finances", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("finances").select("*").eq("user_id", userId).order("expense_date", { ascending: false });
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/finances", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("finances").insert(item).select().single();
    if (error) return fail(res, error.message);
    logActivity(userId, "finance_added", "Added financial entry");
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/finances/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("finances").update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/finances/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { error } = await supabase.from("finances").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Finance entry deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── SHOPPING LIST ────────────────────────────────────────────────────────────

app.get("/api/shopping-list", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("shopping_list").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/shopping-list", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("shopping_list").insert(item).select().single();
    if (error) return fail(res, error.message);
    logActivity(userId, "shopping_added", "Added shopping item");
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/shopping-list/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("shopping_list").update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/shopping-list/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { error } = await supabase.from("shopping_list").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Shopping item deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── HOSPITAL BAG ─────────────────────────────────────────────────────────────

app.get("/api/hospital-bag", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("hospital_bag_checklist").select("*").eq("user_id", userId).order("category");
    if (error) return fail(res, error.message);

    // If no items exist, seed defaults and return them
    if (!data || data.length === 0) {
      const bagItems = DEFAULT_BAG_ITEMS.map(item => ({
        id: crypto.randomUUID(), user_id: userId,
        item_name: item.item_name, category: item.category,
        is_packed: false, is_custom: false,
        created_at: new Date().toISOString()
      }));
      const { data: inserted } = await supabase.from("hospital_bag_checklist").insert(bagItems).select();
      return ok(res, inserted || []);
    }
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/hospital-bag", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, is_custom: true, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from("hospital_bag_checklist").insert(item).select().single();
    if (error) return fail(res, error.message);
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/hospital-bag/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("hospital_bag_checklist").update(req.body)
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/hospital-bag/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { error } = await supabase.from("hospital_bag_checklist").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Item deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── JOURNAL ──────────────────────────────────────────────────────────────────

app.get("/api/journal", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("journal_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/journal", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("journal_notes").insert(item).select().single();
    if (error) return fail(res, error.message);
    logActivity(userId, "journal_added", "Added journal entry");
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/journal/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("journal_notes").update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/journal/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { error } = await supabase.from("journal_notes").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Journal entry deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── REMINDERS ────────────────────────────────────────────────────────────────

app.get("/api/reminders", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("reminders").select("*").eq("user_id", userId).order("reminder_date", { ascending: true });
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/reminders", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("reminders").insert(item).select().single();
    if (error) return fail(res, error.message);
    logActivity(userId, "reminder_added", "Added reminder");
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/reminders/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("reminders").update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/reminders/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { error } = await supabase.from("reminders").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Reminder deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── BABY GALLERY ─────────────────────────────────────────────────────────────

app.get("/api/baby-gallery", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("baby_gallery").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/baby-gallery", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from("baby_gallery").insert(item).select().single();
    if (error) return fail(res, error.message);
    logActivity(userId, "gallery_added", "Added photo to gallery");
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/baby-gallery/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("baby_gallery").update(req.body)
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/baby-gallery/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { error } = await supabase.from("baby_gallery").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Photo deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── GENERAL FOLDERS ──────────────────────────────────────────────────────────

app.get("/api/folders", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("general_folders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/folders", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from("general_folders").insert(item).select().single();
    if (error) return fail(res, error.message);
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/folders/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("general_folders").update(req.body)
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/folders/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    await supabase.from("general_notes").delete().eq("folder_id", req.params.id).eq("user_id", userId);
    const { error } = await supabase.from("general_folders").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Folder deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── GENERAL NOTES ────────────────────────────────────────────────────────────

app.get("/api/notes", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { folder_id } = req.query;
    let query = supabase.from("general_notes").select("*").eq("user_id", userId);
    if (folder_id) query = query.eq("folder_id", String(folder_id));
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.post("/api/notes", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const item = { id: crypto.randomUUID(), user_id: userId, ...req.body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("general_notes").insert(item).select().single();
    if (error) return fail(res, error.message);
    ok(res, data, 201);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/notes/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("general_notes").update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/notes/:id", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { error } = await supabase.from("general_notes").delete().eq("id", req.params.id).eq("user_id", userId);
    if (error) return fail(res, error.message);
    ok(res, { message: "Note deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

app.get("/api/activity-logs", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("activity_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

app.get("/api/profile", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("users_profile").select("*").eq("user_id", userId).maybeSingle();
    if (error) return fail(res, error.message);
    ok(res, data || (req as any).user);
  } catch (err: any) { return fail(res, err.message); }
});

app.put("/api/profile", authenticateUser, async (req, res) => {
  try {
    const userId = (req as any).user.user_id;
    const { data, error } = await supabase.from("users_profile").update(req.body)
      .eq("user_id", userId).select().single();
    if (error) return fail(res, error.message);
    ok(res, data);
  } catch (err: any) { return fail(res, err.message); }
});

// ─── ADMIN: LIST USERS ───────────────────────────────────────────────────────

app.get("/api/admin/users", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") return fail(res, "Admin access required", 403);
    const { data, error } = await supabase.from("users_profile").select("*").order("created_at");
    if (error) return fail(res, error.message);
    ok(res, data || []);
  } catch (err: any) { return fail(res, err.message); }
});

app.delete("/api/admin/users/:id", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") return fail(res, "Admin access required", 403);
    const { error } = await supabase.from("users_auth").delete().eq("id", req.params.id);
    if (error) return fail(res, error.message);
    ok(res, { message: "User deleted" });
  } catch (err: any) { return fail(res, err.message); }
});

// ─── AI ADVISOR ───────────────────────────────────────────────────────────────

app.post("/api/ai/chat", authenticateUser, async (req, res) => {
  try {
    const { message, history } = req.body || {};
    if (!message) return fail(res, "Message is required", 400);

    const ai = await getAI();
    if (!ai) {
      return ok(res, {
        response: "AI Advisor is not configured. Please add a GEMINI_API_KEY environment variable in your Vercel settings.",
        isError: true
      });
    }

    const systemInstruction = `You are Kunju Baby's AI Pregnancy & Parenting Advisor — a warm, knowledgeable, and supportive companion for expecting parents. 
You provide evidence-based guidance on pregnancy health, baby development, nutrition, emotional well-being, and parenting preparation.
Always be empathetic, encouraging, and remind users to consult their healthcare provider for medical decisions.
Keep responses concise, warm, and practical.`;

    const chat = ai.chats.create({
      model: "gemini-2.0-flash",
      config: { systemInstruction },
      history: (history || []).map((h: any) => ({
        role: h.role,
        parts: [{ text: h.content }]
      }))
    });

    const result = await chat.sendMessage({ message });
    const text = result.text || "";

    ok(res, { response: text });
  } catch (err: any) {
    console.error("AI chat error:", err);
    ok(res, { response: "Sorry, I couldn't process your request. Please try again.", isError: true });
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// ─── Start (local dev only) ───────────────────────────────────────────────────
const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
  startServer();
}

export default app;
