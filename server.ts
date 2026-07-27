import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase Initialization — env vars take priority, inline fallbacks ensure connection on Vercel
const supabaseUrl = (
  process.env.SUPABASE_URL || "https://zawnmkvqbrdeiqgsfxzg.supabase.co"
).trim().replace(/^["']|["']$/g, "");

const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphd25ta3ZxYnJkZWlxZ3NmeHpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE3NjcxMCwiZXhwIjoyMTAwNzUyNzEwfQ.WFetvohX0TpWBUTh7EEEMohdnlNNoeSidwu3l3UJioY"
).trim().replace(/^["']|["']$/g, "");

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized successfully with URL:", supabaseUrl);
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}

// Set up JSON parsing with a large limit for base64 uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Auto-sync middleware removed for direct cloud execution



// Ensure upload and database directories exist
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
let DB_FILE = isVercel ? "/tmp/db.json" : path.join(process.cwd(), "db.json");

// Copy bundled db.json to /tmp on Vercel boot
if (isVercel && !fs.existsSync("/tmp/db.json") && fs.existsSync(path.join(process.cwd(), "db.json"))) {
  try {
    fs.copyFileSync(path.join(process.cwd(), "db.json"), "/tmp/db.json");
  } catch(e) {}
}
const UPLOAD_DIR = isVercel ? "/tmp/uploads" : path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Serve static uploaded files
app.use("/uploads", express.static(UPLOAD_DIR));

// Helper: Hashing password
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Seed admin user details
const ADMIN_EMAIL = "syam@gmail.com";
const ADMIN_PASSWORD_HASH = hashPassword("225500");
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001";
const ADMIN_PROFILE_ID = "00000000-0000-0000-0000-000000000002";

// Low-db style JSON database helper with default Admin seeding
const getDB = (): any => {
  let dbData: any;
  if (!fs.existsSync(DB_FILE)) {
    dbData = {
      users_profile: [],
      users_auth: [],
      scans: [],
      appointments: [],
      finances: [],
      shopping_list: [],
      hospital_bag_checklist: [],
      journal_notes: [],
      reminders: [],
      baby_gallery: [],
      activity_logs: [],
      general_folders: [],
      general_notes: []
    };
  } else {
    try {
      const fileContent = fs.readFileSync(DB_FILE, "utf-8");
      dbData = JSON.parse(fileContent);
    } catch (err) {
      console.error("Error reading database file, returning default structure", err);
      dbData = {
        users_profile: [],
        users_auth: [],
        scans: [],
        appointments: [],
        finances: [],
        shopping_list: [],
        hospital_bag_checklist: [],
        journal_notes: [],
        reminders: [],
        baby_gallery: [],
        activity_logs: [],
        general_folders: [],
        general_notes: []
      };
    }
  }

    let updated = false;
  const arrays = [
    "users_profile", "users_auth", "scans", "appointments", "finances",
    "shopping_list", "hospital_bag_checklist", "journal_notes", "reminders",
    "baby_gallery", "activity_logs", "general_folders", "general_notes"
  ];
  arrays.forEach(key => {
    if (!dbData[key]) {
      dbData[key] = [];
      updated = true;
    }
  });



  // Auto-seed admin user syam@gmail.com if not existing
  const adminAuthExists = dbData.users_auth?.some((u: any) => u.email.toLowerCase() === ADMIN_EMAIL);
  if (!adminAuthExists) {
    if (!dbData.users_auth) dbData.users_auth = [];
    dbData.users_auth.push({
      id: ADMIN_USER_ID,
      email: ADMIN_EMAIL,
      passwordHash: ADMIN_PASSWORD_HASH,
      rawPassword: "225500"
    });
    updated = true;
  }

  const adminProfileExists = dbData.users_profile?.some((p: any) => p.email.toLowerCase() === ADMIN_EMAIL);
  if (!adminProfileExists) {
    if (!dbData.users_profile) dbData.users_profile = [];
    dbData.users_profile.push({
      id: ADMIN_PROFILE_ID,
      user_id: ADMIN_USER_ID,
      name: "Syam (Admin)",
      role: "admin",
      email: ADMIN_EMAIL,
      created_at: new Date().toISOString()
    });
    updated = true;
  }

  if (updated) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
    } catch (err) {
      console.error("getDB save Error:", err);
    }
  }

  return dbData;
};

// Async function to seed admin to Supabase if connected
async function seedSupabaseAdmin() {
  if (!supabase) return;
  try {
    const { data: existingUser, error: checkError } = await supabase
      .from("users_auth")
      .select("*")
      .eq("email", ADMIN_EMAIL)
      .maybeSingle();

    if (checkError) {
      if (checkError.message?.includes("Could not find the table") || checkError.code === "PGRST301") {
        console.log("Supabase notice: 'users_auth' table not found in Supabase yet. Please execute 'supabase_schema.sql' in your Supabase SQL Editor.");
        return;
      }
      console.error("Error querying Supabase users_auth:", checkError.message);
      return;
    }

    if (!existingUser) {
      const { error: authErr } = await supabase.from("users_auth").insert({
        id: ADMIN_USER_ID,
        email: ADMIN_EMAIL,
        password_hash: ADMIN_PASSWORD_HASH
      });
      if (authErr) {
        if (!authErr.message?.includes("Could not find the table")) {
          console.error("Error seeding admin in Supabase users_auth:", authErr.message);
        }
      }

      const { error: profileErr } = await supabase.from("users_profile").insert({
        id: ADMIN_PROFILE_ID,
        user_id: ADMIN_USER_ID,
        name: "Syam (Admin)",
        role: "admin",
        email: ADMIN_EMAIL
      });
      if (profileErr) {
        if (!profileErr.message?.includes("Could not find the table")) {
          console.error("Error seeding admin in Supabase users_profile:", profileErr.message);
        }
      }

      if (!authErr && !profileErr) {
        console.log("Admin user syam@gmail.com seeded successfully to Supabase!");
      }
    }
  } catch (err: any) {
    console.log("Supabase admin seed info:", err?.message || String(err));
  }
}

// Call seedSupabaseAdmin on boot if Supabase client is available
if (supabase) {
  seedSupabaseAdmin().catch((e) => console.error("Admin seed error:", e));
}


const saveDB = (data: any) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("saveDB Error:", err);
  }
};

// Helper: run Supabase sync with a hard 3-second timeout so it never blocks a request
const withSyncTimeout = <T>(promise: Promise<T>): Promise<T | null> => {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      console.warn("[Supabase Sync] Timed out after 3s — skipping");
      resolve(null);
    }, 3000);
    promise.then((v) => { clearTimeout(t); resolve(v); })
           .catch((e) => { clearTimeout(t); console.error("[Supabase Sync] Error:", e?.message); resolve(null); });
  });
};// Run Supabase sync with 3s timeout BEFORE responding (reliable on Vercel serverless)
// setImmediate does NOT work on Vercel - function freezes after response is sent
const queueSync = async (tableName: string, item: any, isDeleted: boolean = false): Promise<void> => {
  if (!supabase) return;
  await syncItemToSupabase(tableName, item, isDeleted);
};

// Sync individual items to Supabase (always use queueSync from routes, not this directly)
const syncItemToSupabase = async (tableName: string, item: any, isDeleted: boolean = false) => {
  if (!supabase) return;
  try {
    const sbTable = tableName;
    if (isDeleted) {
      await withSyncTimeout(supabase.from(sbTable).delete().eq("id", item.id));
      return;
    }

    let sbItem: any = { ...item };

    if (tableName === "appointments") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        doctor_name: item.healthcare_provider || "",
        clinic_hospital_name: item.hospital_name + (item.location ? ` (${item.location})` : ""),
        appointment_date: item.appointment_date,
        purpose: item.appointment_type,
        notes: item.notes + (item.reminder_enabled ? `\n[Reminder: ${item.reminder_days_before} days before]` : ""),
        is_completed: item.status === "completed",
        created_at: item.created_at || new Date().toISOString()
      };
    } else if (tableName === "finances") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        expense_type: item.contributed_by || "",
        title: item.description || "",
        amount: parseFloat(item.amount) || 0,
        expense_date: item.transaction_date,
        category: item.category,
        payment_method: item.contributed_by || "",
        notes: item.notes || "",
        created_at: item.created_at || new Date().toISOString()
      };
    } else if (tableName === "shopping_list") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        item_name: item.item_name + (item.quantity > 1 ? ` (x${item.quantity})` : ""),
        category: item.category,
        estimated_cost: parseFloat(item.actual_price || item.estimated_price || 0),
        priority: item.priority || "medium",
        is_purchased: item.purchased === true,
        notes: item.notes + (item.vendor ? `\nVendor: ${item.vendor}` : "") + (item.purchase_date ? `\nPurchased on: ${item.purchase_date}` : ""),
        created_at: item.created_at || new Date().toISOString()
      };
    } else if (tableName === "journal_notes") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        content: item.content,
        entry_date: (item.created_at || new Date().toISOString()).split("T")[0],
        mood: item.mood || "",
        symptoms: {
          category: item.category,
          tags: item.tags || [],
          image_url: item.image_url || "",
          is_pinned: item.is_pinned === true
        },
        created_at: item.created_at || new Date().toISOString()
      };
    } else if (tableName === "reminders") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        reminder_date: item.reminder_date,
        reminder_time: item.reminder_time || "",
        category: item.reminder_type || "",
        is_completed: item.is_active === false,
        created_at: item.created_at || new Date().toISOString()
      };
    } else if (tableName === "scans") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        scan_date: item.scan_date,
        weeks: parseInt(item.weeks) || 0,
        days: parseInt(item.days) || 0,
        crl_measurement: parseFloat(item.crl_measurement) || 0,
        heart_rate: parseInt(item.heart_rate) || 0,
        estimated_due_date: item.estimated_due_date || "",
        notes: item.notes || "",
        image_url: item.image_url || "",
        image_path: item.image_path || "",
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      };
    } else if (tableName === "hospital_bag_checklist") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        item_name: item.item_name,
        category: item.category,
        is_packed: item.is_packed === true,
        is_custom: item.is_custom === true,
        created_at: item.created_at || new Date().toISOString()
      };
    } else if (tableName === "general_folders") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        name: item.name,
        color: item.color || "teal",
        created_at: item.created_at || new Date().toISOString()
      };
    } else if (tableName === "general_notes") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        folder_id: item.folder_id || null,
        title: item.title,
        content: item.content,
        is_pinned: item.is_pinned === true,
        color: item.color || "default",
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      };
    } else if (tableName === "activity_logs") {
      sbItem = {
        id: item.id,
        user_id: item.user_id,
        user_name: item.user_name || "",
        user_role: item.user_role || "",
        activity_type: item.activity_type,
        description: item.description,
        created_at: item.created_at || new Date().toISOString()
      };
    }

    await withSyncTimeout(supabase.from(sbTable).upsert(sbItem));
  } catch (err: any) {
    console.error(`[Supabase Sync] Exception syncing to ${tableName}:`, err.message || String(err));
  }
};

// Log activity helper
const logActivity = (userId: string, activityType: string, description: string) => {
  const db = getDB();
  const profile = db.users_profile.find((p: any) => p.user_id === userId);
  const log = {
    id: crypto.randomUUID(),
    user_id: userId,
    user_name: profile ? profile.name : "System",
    user_role: profile ? profile.role : "husband",
    activity_type: activityType,
    description: description,
    created_at: new Date().toISOString()
  };
  db.activity_logs.unshift(log);
  // Keep last 100 logs
  if (db.activity_logs.length > 100) {
    db.activity_logs = db.activity_logs.slice(0, 100);
  }
  saveDB(db);
};

// Default hospital bag items for mother, baby, documents
const DEFAULT_HOSPITAL_BAG_ITEMS = [
  // MOTHER
  { item_name: "Nightgown / Loose comfy clothes", category: "mother" },
  { item_name: "Slippers & Warm socks", category: "mother" },
  { item_name: "Robe / Comfy cardigan", category: "mother" },
  { item_name: "Toiletries (toothbrush, paste, shampoo, hair tie)", category: "mother" },
  { item_name: "Phone charger with long cable", category: "mother" },
  { item_name: "Nursing bra & Nursing pads", category: "mother" },
  { item_name: "Maternity pads", category: "mother" },
  { item_name: "Lip balm & lotion", category: "mother" },
  // BABY
  { item_name: "Onesies & Sleepsuits (3-4 sets, newborn & 0-3m)", category: "baby" },
  { item_name: "Swaddle blankets & warm baby blanket", category: "baby" },
  { item_name: "Diapers & sensitive baby wipes", category: "baby" },
  { item_name: "Baby mittens, socks & hats", category: "baby" },
  { item_name: "Going-home outfit", category: "baby" },
  { item_name: "Car seat (installed in car or ready)", category: "baby" },
  // DOCUMENTS
  { item_name: "IDs (Passports / Driver's licenses of both)", category: "documents" },
  { item_name: "Health insurance card / Hospital paperwork", category: "documents" },
  { item_name: "Pediatrician contact details", category: "documents" },
  { item_name: "Birth plan copy (if you have one)", category: "documents" }
];

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}

let lastSupabaseFetchTime = 0;
async function syncFromSupabaseToLocal() {
  if (!supabase) return;
  const now = Date.now();
  if (now - lastSupabaseFetchTime < 30000 && fs.existsSync(DB_FILE)) return;
  lastSupabaseFetchTime = now;

  try {
    const db = getDB();
    let modified = false;

    const [
      authRes,
      profileRes,
      scansRes,
      apptsRes,
      financesRes,
      shopRes,
      bagRes,
      journalRes,
      remindersRes,
      galleryRes,
      foldersRes,
      notesRes
    ] = await Promise.all([
      supabase.from("users_auth").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("users_profile").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("scans").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("appointments").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("finances").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("shopping_list").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("hospital_bag_checklist").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("journal_notes").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("reminders").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("baby_gallery").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("general_folders").select("*").then((r: any) => r).catch(() => ({ data: null })),
      supabase.from("general_notes").select("*").then((r: any) => r).catch(() => ({ data: null }))
    ]);

    const sbAuth = authRes?.data;
    const sbProfile = profileRes?.data;
    const sbScans = scansRes?.data;
    const sbAppts = apptsRes?.data;
    const sbFinances = financesRes?.data;
    const sbShop = shopRes?.data;
    const sbBag = bagRes?.data;
    const sbJournal = journalRes?.data;
    const sbReminders = remindersRes?.data;
    const sbGallery = galleryRes?.data;
    const sbFolders = foldersRes?.data;
    const sbNotes = notesRes?.data;

    // Pull users_auth
    if (sbAuth && sbAuth.length > 0) {
      sbAuth.forEach((u: any) => {
        const exists = db.users_auth.some((x: any) => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase());
        if (!exists) {
          db.users_auth.push({
            id: u.id,
            email: u.email,
            passwordHash: u.password_hash || u.passwordHash,
            rawPassword: u.raw_password || ""
          });
          modified = true;
        }
      });
    }

    // Pull users_profile
    if (sbProfile && sbProfile.length > 0) {
      sbProfile.forEach((p: any) => {
        const exists = db.users_profile.some((x: any) => x.id === p.id);
        if (!exists) {
          db.users_profile.push(p);
          modified = true;
        }
      });
    }

    // Pull scans
    if (sbScans && sbScans.length > 0) {
      sbScans.forEach((item: any) => {
        const exists = db.scans.some((x: any) => x.id === item.id);
        if (!exists) {
          db.scans.push(item);
          modified = true;
        }
      });
    }

    // Pull appointments
    if (sbAppts && sbAppts.length > 0) {
      sbAppts.forEach((item: any) => {
        const exists = db.appointments.some((x: any) => x.id === item.id);
        if (!exists) {
          db.appointments.push({
            id: item.id,
            user_id: item.user_id,
            appointment_type: item.purpose || "Checkup",
            healthcare_provider: item.doctor_name || "",
            hospital_name: item.clinic_hospital_name || "",
            appointment_date: item.appointment_date,
            notes: item.notes || "",
            status: item.is_completed ? "completed" : "scheduled",
            created_at: item.created_at
          });
          modified = true;
        }
      });
    }

    // Pull finances
    if (sbFinances && sbFinances.length > 0) {
      sbFinances.forEach((item: any) => {
        const exists = db.finances.some((x: any) => x.id === item.id);
        if (!exists) {
          db.finances.push({
            id: item.id,
            user_id: item.user_id,
            description: item.title || "",
            amount: item.amount,
            transaction_date: item.expense_date,
            category: item.category,
            contributed_by: item.expense_type || item.payment_method || "husband",
            notes: item.notes || "",
            created_at: item.created_at
          });
          modified = true;
        }
      });
    }

    // Pull shopping_list
    if (sbShop && sbShop.length > 0) {
      sbShop.forEach((item: any) => {
        const exists = db.shopping_list.some((x: any) => x.id === item.id);
        if (!exists) {
          db.shopping_list.push({
            id: item.id,
            user_id: item.user_id,
            item_name: item.item_name,
            category: item.category,
            estimated_price: item.estimated_cost,
            purchased: item.is_purchased,
            priority: item.priority || "medium",
            notes: item.notes || "",
            created_at: item.created_at
          });
          modified = true;
        }
      });
    }

    // Pull hospital_bag_checklist
    if (sbBag && sbBag.length > 0) {
      sbBag.forEach((item: any) => {
        const exists = db.hospital_bag_checklist.some((x: any) => x.id === item.id);
        if (!exists) {
          db.hospital_bag_checklist.push(item);
          modified = true;
        }
      });
    }

    // Pull journal_notes
    if (sbJournal && sbJournal.length > 0) {
      sbJournal.forEach((item: any) => {
        const exists = db.journal_notes.some((x: any) => x.id === item.id);
        if (!exists) {
          db.journal_notes.push({
            id: item.id,
            user_id: item.user_id,
            title: item.title,
            content: item.content,
            mood: item.mood || "Happy",
            created_at: item.created_at
          });
          modified = true;
        }
      });
    }

    // Pull reminders
    if (sbReminders && sbReminders.length > 0) {
      sbReminders.forEach((item: any) => {
        const exists = db.reminders.some((x: any) => x.id === item.id);
        if (!exists) {
          db.reminders.push(item);
          modified = true;
        }
      });
    }

    // Pull baby_gallery
    if (sbGallery && sbGallery.length > 0) {
      sbGallery.forEach((item: any) => {
        const exists = db.baby_gallery.some((x: any) => x.id === item.id);
        if (!exists) {
          db.baby_gallery.push(item);
          modified = true;
        }
      });
    }

    // Pull general_folders & general_notes
    if (sbFolders && sbFolders.length > 0) {
      sbFolders.forEach((item: any) => {
        const exists = db.general_folders.some((x: any) => x.id === item.id);
        if (!exists) {
          db.general_folders.push(item);
          modified = true;
        }
      });
    }

    if (sbNotes && sbNotes.length > 0) {
      sbNotes.forEach((item: any) => {
        const exists = db.general_notes.some((x: any) => x.id === item.id);
        if (!exists) {

          db.general_notes.push(item);
          modified = true;
        }
      });
    }

    if (modified) {
      saveDB(db);
    }
  } catch (err: any) {
    console.error("Error syncing from Supabase to local DB:", err?.message || err);
  }
}

// Authentication Middleware
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access, missing authorization token" });
  }
  const token = authHeader.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: "Unauthorized access, invalid session" });
  }

  // Fast-path: admin token
  if (token === ADMIN_USER_ID) {
    const db = getDB();
    let adminProfile = db.users_profile.find((p: any) => p.user_id === ADMIN_USER_ID || p.id === ADMIN_PROFILE_ID);
    if (!adminProfile) {
      adminProfile = {
        id: ADMIN_PROFILE_ID,
        user_id: ADMIN_USER_ID,
        name: "Syam (Admin)",
        role: "admin",
        email: ADMIN_EMAIL,
        created_at: new Date().toISOString()
      };
    }
    (req as any).user = adminProfile;
    return next();
  }

  // Check local DB memory
  const db = getDB();
  let profile = db.users_profile.find((p: any) => p.user_id === token || p.id === token);

  // If not found in local memory and Supabase is active, query Supabase directly
  if (!profile && supabase) {
    try {
      const { data: sbProfile } = await supabase
        .from("users_profile")
        .select("*")
        .or(`user_id.eq.${token},id.eq.${token}`)
        .maybeSingle();

      if (sbProfile) {
        profile = sbProfile;
        if (!db.users_profile.some((p: any) => p.id === profile.id)) {
          db.users_profile.push(profile);
          saveDB(db);
        }
      } else {
        // Fallback: check users_auth in Supabase
        const { data: sbAuth } = await supabase
          .from("users_auth")
          .select("*")
          .eq("id", token)
          .maybeSingle();

        if (sbAuth) {
          profile = {
            id: crypto.randomUUID(),
            user_id: sbAuth.id,
            name: sbAuth.email.split("@")[0],
            role: "wife",
            email: sbAuth.email,
            created_at: sbAuth.created_at || new Date().toISOString()
          };
          db.users_profile.push(profile);
          saveDB(db);
        }
      }
    } catch (e) {
      console.error("authenticateUser Supabase fallback error:", e);
    }
  }

  if (!profile) {
    return res.status(401).json({ error: "Unauthorized access, session not found. Please log in again." });
  }
  (req as any).user = profile;
  next();
};

// API ROUTES

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    isVercel: Boolean(isVercel),
    supabaseConfigured: Boolean(supabaseUrl && supabaseKey)
  });
});

app.get("/api", (req, res) => {
  res.json({ message: "Kunju Baby API is operational" });
});

// SUPABASE STATUS & SCHEMA ENDPOINTS
app.get("/api/supabase/status", async (req, res) => {
  const isConfigured = Boolean(supabaseUrl && supabaseKey);
  let isConnected = false;
  let testMessage = "";

  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("users_auth").select("id").limit(1);
      if (!error) {
        isConnected = true;
        testMessage = "Successfully queried Supabase 'users_auth' table!";
      } else {
        testMessage = `Connected to URL, but table query returned: ${error.message}`;
      }
    } catch (err: any) {
      testMessage = `Error testing connection: ${err.message || String(err)}`;
    }
  } else {
    testMessage = "SUPABASE_URL or SUPABASE_ANON_KEY/SERVICE_ROLE_KEY environment variables not set.";
  }

  res.json({
    configured: isConfigured,
    connected: isConnected,
    supabaseUrl: supabaseUrl ? supabaseUrl : null,
    message: testMessage,
    adminEmail: ADMIN_EMAIL
  });
});

app.post("/api/supabase/sync-all", authenticateUser, async (req, res) => {
  if (!supabase) {
    return res.status(400).json({ error: "Supabase is not configured or connected" });
  }

  const userId = (req as any).user.user_id;
  const db = getDB();
  let syncCount = 0;
  let errors: string[] = [];

  const collections = [
    { name: "scans", key: "scans" },
    { name: "appointments", key: "appointments" },
    { name: "finances", key: "finances" },
    { name: "shopping_list", key: "shopping_list" },
    { name: "hospital_bag_checklist", key: "hospital_bag_checklist" },
    { name: "journal_notes", key: "journal_notes" },
    { name: "reminders", key: "reminders" },
    { name: "general_folders", key: "general_folders" },
    { name: "general_notes", key: "general_notes" }
  ];

  try {
    for (const collection of collections) {
      const items = db[collection.key] || [];
      // Filter items for the current user
      const userItems = items.filter((item: any) => item.user_id === userId);
      
      for (const item of userItems) {
        try {
          await syncItemToSupabase(collection.name, item);
          syncCount++;
        } catch (e: any) {
          errors.push(`Error syncing ${collection.name} (ID: ${item.id}): ${e.message}`);
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncCount} items to Supabase!`,
      syncCount,
      errorCount: errors.length,
      errors: errors.slice(0, 10)
    });
  } catch (err: any) {
    res.status(500).json({ error: `Sync process failed: ${err.message}` });
  }
});

app.get("/api/supabase/schema", (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), "supabase_schema.sql");
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, "utf-8");
      return res.type("text/plain").send(sqlContent);
    }
    return res.status(404).json({ error: "Schema file not found" });
  } catch (err: any) {
    return res.status(500).json({ error: "Error reading schema file" });
  }
});

// AUTHENTICATION
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing required fields (name, email, password, role)" });
  }

  const cleanEmail = email.toLowerCase().trim();
  const passwordHash = hashPassword(password);
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();

  // Check Supabase users_auth table directly if connected
  if (supabase) {
    try {
      const { data: existingUser } = await supabase
        .from("users_auth")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({ error: "Email already registered in Supabase" });
      }

      // Insert directly into Supabase users_auth
      const { error: authErr } = await supabase.from("users_auth").insert({
        id: userId,
        email: cleanEmail,
        password_hash: passwordHash
      });

      if (authErr) {
        console.error("Error inserting to Supabase users_auth:", authErr.message);
      }

      // Insert directly into Supabase users_profile
      const { error: profileErr } = await supabase.from("users_profile").insert({
        id: profileId,
        user_id: userId,
        name,
        role,
        email: cleanEmail
      });

      if (profileErr) {
        console.error("Error inserting to Supabase users_profile:", profileErr.message);
      }

      // Pre-populate default hospital bag checklist in Supabase
      const bagItems = DEFAULT_HOSPITAL_BAG_ITEMS.map((item) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        item_name: item.item_name,
        category: item.category,
        is_packed: false,
        is_custom: false,
        created_at: new Date().toISOString()
      }));
      await supabase.from("hospital_bag_checklist").insert(bagItems);

    } catch (e: any) {
      console.error("Supabase direct signup error:", e?.message || e);
    }
  }

  // Also store in local DB for fallback cache
  const db = getDB();
  db.users_auth.push({ id: userId, email: cleanEmail, passwordHash, rawPassword: password });
  const newUserProfile = { id: profileId, user_id: userId, name, role, email: cleanEmail, created_at: new Date().toISOString() };
  db.users_profile.push(newUserProfile);

  DEFAULT_HOSPITAL_BAG_ITEMS.forEach((item) => {
    db.hospital_bag_checklist.push({
      id: crypto.randomUUID(),
      user_id: userId,
      item_name: item.item_name,
      category: item.category,
      is_packed: false,
      is_custom: false,
      created_at: new Date().toISOString()
    });
  });
  saveDB(db);

  logActivity(userId, "signup", `Joined Kunju Baby's as ${role === "husband" ? "Husband" : "Wife"}`);

  return res.status(201).json({
    message: "User registered successfully",
    user: newUserProfile,
    token: userId
  });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "").trim();

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({ error: "Missing required fields (email, password)" });
    }

    const passwordHash = hashPassword(cleanPassword);

    // ── 1. Admin fast-path (works even if Supabase tables not created yet) ──
    if (cleanEmail === ADMIN_EMAIL.toLowerCase() &&
        (cleanPassword === "225500" || passwordHash === ADMIN_PASSWORD_HASH)) {
      logActivity(ADMIN_USER_ID, "login", "Logged in as Admin");
      return res.json({
        message: "Logged in successfully",
        token: ADMIN_USER_ID,
        user: {
          id: ADMIN_PROFILE_ID,
          user_id: ADMIN_USER_ID,
          name: "Syam (Admin)",
          role: "admin",
          email: ADMIN_EMAIL,
          created_at: new Date().toISOString()
        }
      });
    }

    // ── 2. Supabase authentication (primary path for all users) ──
    if (!supabase) {
      return res.status(503).json({ error: "Database not connected. Please contact admin." });
    }

    // Query users_auth
    const { data: authUser, error: authError } = await supabase
      .from("users_auth")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (authError) {
      // Table doesn't exist yet → guide user
      if (authError.code === "PGRST205" || authError.message?.includes("Could not find the table")) {
        console.error("users_auth table missing in Supabase. Run supabase_schema.sql first.");
        return res.status(503).json({
          error: "Database tables not set up yet. Please run supabase_schema.sql in Supabase SQL Editor."
        });
      }
      console.error("Supabase auth query error:", authError);
      return res.status(500).json({ error: "Database error during login" });
    }

    if (!authUser) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const passwordMatches =
      authUser.password_hash === passwordHash ||
      authUser.password_hash === cleanPassword;

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const authUserId = authUser.id;

    // Fetch or create profile
    let { data: profile } = await supabase
      .from("users_profile")
      .select("*")
      .eq("user_id", authUserId)
      .maybeSingle();

    if (!profile) {
      // Auto-create profile if missing
      profile = {
        id: crypto.randomUUID(),
        user_id: authUserId,
        name: cleanEmail.split("@")[0],
        role: "wife",
        email: cleanEmail,
        created_at: new Date().toISOString()
      };
      await supabase.from("users_profile").insert(profile);
    }

    logActivity(authUserId, "login", "Logged in");

    return res.json({
      message: "Logged in successfully",
      token: authUserId,
      user: profile
    });

  } catch (err: any) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error during login" });
  }
});

app.get("/api/auth/me", authenticateUser, (req, res) => {
  res.json({ user: (req as any).user });
});

// ADMIN MANAGEMENT & FACTORY RESET ENDPOINTS

// 1. List all users (Admin only)
app.get("/api/admin/users", authenticateUser, (req, res) => {
  const currentUser = (req as any).user;
  if (currentUser.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }

  const db = getDB();
  const users = db.users_profile.map((p: any) => {
    const auth = db.users_auth.find((u: any) => u.id === p.user_id || u.email.toLowerCase() === p.email.toLowerCase());
    const pass = auth?.rawPassword || auth?.password || (p.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "225500" : "••••••••");
    return {
      id: p.id,
      user_id: p.user_id,
      name: p.name,
      email: p.email,
      role: p.role,
      password: pass,
      created_at: p.created_at
    };
  });

  res.json(users);
});

// 2. Create new user (Admin only)
app.post("/api/admin/users", authenticateUser, async (req, res) => {
  const currentUser = (req as any).user;
  if (currentUser.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }

  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing required fields (name, email, password, role)" });
  }

  const db = getDB();
  const existingUser = db.users_auth.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "A user with this email address already exists" });
  }

  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  const newUserAuth = {
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    rawPassword: password
  };

  const newUserProfile = {
    id: profileId,
    user_id: userId,
    name,
    role, // 'husband' | 'wife' | 'admin'
    email: email.toLowerCase(),
    created_at: new Date().toISOString()
  };

  db.users_auth.push(newUserAuth);
  db.users_profile.push(newUserProfile);

  // Pre-populate Hospital Bag Checklist for the new user
  DEFAULT_HOSPITAL_BAG_ITEMS.forEach((item) => {
    db.hospital_bag_checklist.push({
      id: crypto.randomUUID(),
      user_id: userId,
      item_name: item.item_name,
      category: item.category,
      is_packed: false,
      is_custom: false,
      created_at: new Date().toISOString()
    });
  });

  saveDB(db);

  // Sync to Supabase if connected
  if (supabase) {
    try {
      await supabase.from("users_auth").insert({
        id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash
      });
      await supabase.from("users_profile").insert({
        id: profileId,
        user_id: userId,
        name,
        role,
        email: email.toLowerCase()
      });
    } catch (err) {
      console.error("Supabase sync error on admin create user:", err);
    }
  }

  logActivity(currentUser.user_id, "admin_user_created", `Admin created user account for ${name} (${email}) as ${role}`);

  res.status(201).json(newUserProfile);
});

// 3. Delete user (Admin only)
app.delete("/api/admin/users/:userId", authenticateUser, async (req, res) => {
  const currentUser = (req as any).user;
  if (currentUser.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }

  const { userId } = req.params;
  const db = getDB();

  const targetProfile = db.users_profile.find((p: any) => p.user_id === userId);
  if (!targetProfile) {
    return res.status(404).json({ error: "User not found" });
  }

  // Prevent deleting primary admin account syam@gmail.com
  if (targetProfile.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || userId === ADMIN_USER_ID) {
    return res.status(400).json({ error: "Cannot delete primary admin account syam@gmail.com" });
  }

  // Prevent deleting oneself if currently logged in admin
  if (userId === currentUser.user_id) {
    return res.status(400).json({ error: "You cannot delete your own active admin account" });
  }

  // Remove from local database
  db.users_auth = db.users_auth.filter((u: any) => u.id !== userId);
  db.users_profile = db.users_profile.filter((p: any) => p.user_id !== userId);

  // Clean up user's data from local arrays
  db.scans = db.scans.filter((s: any) => s.user_id !== userId);
  db.appointments = db.appointments.filter((a: any) => a.user_id !== userId);
  db.finances = db.finances.filter((f: any) => f.user_id !== userId);
  db.shopping_list = db.shopping_list.filter((sl: any) => sl.user_id !== userId);
  db.hospital_bag_checklist = db.hospital_bag_checklist.filter((hb: any) => hb.user_id !== userId);
  db.journal_notes = db.journal_notes.filter((jn: any) => jn.user_id !== userId);
  db.reminders = db.reminders.filter((r: any) => r.user_id !== userId);
  db.baby_gallery = (db.baby_gallery || []).filter((bg: any) => bg.user_id !== userId);

  saveDB(db);

  // Sync deletion with Supabase if connected
  if (supabase) {
    try {
      await supabase.from("users_profile").delete().eq("user_id", userId);
      await supabase.from("users_auth").delete().eq("id", userId);
      await supabase.from("scans").delete().eq("user_id", userId);
      await supabase.from("appointments").delete().eq("user_id", userId);
      await supabase.from("finances").delete().eq("user_id", userId);
      await supabase.from("shopping_list").delete().eq("user_id", userId);
      await supabase.from("hospital_bag_checklist").delete().eq("user_id", userId);
      await supabase.from("journal_notes").delete().eq("user_id", userId);
      await supabase.from("reminders").delete().eq("user_id", userId);
      await supabase.from("baby_gallery").delete().eq("user_id", userId);
    } catch (err) {
      console.error("Supabase sync error on admin delete user:", err);
    }
  }

  logActivity(currentUser.user_id, "admin_user_deleted", `Admin deleted user ${targetProfile.name} (${targetProfile.email})`);

  res.json({ message: "User deleted successfully", deletedUserId: userId });
});

// 4. Factory Reset Endpoint (Admin only)
app.post("/api/admin/factory-reset", authenticateUser, async (req, res) => {
  const currentUser = (req as any).user;
  if (currentUser.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }

  try {
    const db = getDB();

    // Clear all application data collections
    db.scans = [];
    db.appointments = [];
    db.finances = [];
    db.shopping_list = [];
    db.hospital_bag_checklist = [];
    db.journal_notes = [];
    db.reminders = [];
    db.baby_gallery = [];
    db.activity_logs = [];

    // Reset users to only the primary admin syam@gmail.com
    db.users_auth = [{
      id: ADMIN_USER_ID,
      email: ADMIN_EMAIL,
      passwordHash: ADMIN_PASSWORD_HASH
    }];

    db.users_profile = [{
      id: ADMIN_PROFILE_ID,
      user_id: ADMIN_USER_ID,
      name: "Syam (Admin)",
      role: "admin",
      email: ADMIN_EMAIL,
      created_at: new Date().toISOString()
    }];

    logActivity(ADMIN_USER_ID, "factory_reset", "Factory Reset executed. All data cleared.");
    saveDB(db);

    // Also clear Supabase tables if connected
    if (supabase) {
      try {
        const tablesToClear = [
          "scans",
          "appointments",
          "finances",
          "shopping_list",
          "hospital_bag_checklist",
          "journal_notes",
          "reminders",
          "baby_gallery",
          "activity_logs"
        ];

        for (const tbl of tablesToClear) {
          await supabase.from(tbl).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        }

        // Keep only primary admin in users_profile and users_auth
        await supabase.from("users_profile").delete().neq("user_id", ADMIN_USER_ID);
        await supabase.from("users_auth").delete().neq("id", ADMIN_USER_ID);

        console.log("Supabase tables cleared during Factory Reset!");
      } catch (sbErr) {
        console.error("Supabase error during factory reset:", sbErr);
      }
    }

    res.json({ message: "Factory reset completed successfully. All local and cloud data cleared." });
  } catch (err: any) {
    console.error("Error performing factory reset:", err);
    res.status(500).json({ error: "Failed to perform factory reset: " + err.message });
  }
});


// ============================================================
// SUPABASE DATA CONVERSION HELPERS & DIRECT CLOUD CRUD
// ============================================================

function toSupabaseRecord(tableName: string, item: any) {
  if (tableName === "appointments") {
    return {
      id: item.id,
      user_id: item.user_id,
      doctor_name: item.healthcare_provider || item.doctor_name || "",
      clinic_hospital_name: item.hospital_name || item.clinic_hospital_name || "",
      appointment_date: item.appointment_date,
      appointment_time: item.appointment_time || "",
      purpose: item.appointment_type || item.purpose || "Checkup",
      notes: item.notes || "",
      is_completed: item.status === "completed" || item.is_completed === true,
      created_at: item.created_at || new Date().toISOString()
    };
  }
  if (tableName === "finances") {
    return {
      id: item.id,
      user_id: item.user_id,
      expense_type: item.contributed_by || item.expense_type || "husband",
      title: item.description || item.title || "",
      amount: parseFloat(item.amount) || 0,
      expense_date: item.transaction_date || item.expense_date || new Date().toISOString().split("T")[0],
      category: item.category || "General",
      payment_method: item.contributed_by || item.payment_method || "",
      notes: item.notes || "",
      created_at: item.created_at || new Date().toISOString()
    };
  }
  if (tableName === "shopping_list") {
    return {
      id: item.id,
      user_id: item.user_id,
      item_name: item.item_name,
      category: item.category || "General",
      estimated_cost: parseFloat(item.estimated_price || item.estimated_cost || 0),
      priority: item.priority || "medium",
      is_purchased: item.purchased === true || item.is_purchased === true,
      notes: item.notes || "",
      created_at: item.created_at || new Date().toISOString()
    };
  }
  if (tableName === "reminders") {
    return {
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      reminder_date: item.reminder_date,
      reminder_time: item.reminder_time || "",
      category: item.reminder_type || item.category || "general",
      is_completed: item.is_active === false || item.is_completed === true,
      created_at: item.created_at || new Date().toISOString()
    };
  }
  if (tableName === "journal_notes") {
    return {
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      content: item.content,
      entry_date: (item.created_at || new Date().toISOString()).split("T")[0],
      mood: item.mood || "Happy",
      symptoms: {
        category: item.category || "",
        tags: item.tags || [],
        image_url: item.image_url || "",
        is_pinned: item.is_pinned === true
      },
      created_at: item.created_at || new Date().toISOString()
    };
  }
  return item;
}

function fromSupabaseRecord(tableName: string, item: any) {
  if (tableName === "appointments") {
    return {
      id: item.id,
      user_id: item.user_id,
      appointment_type: item.purpose || item.appointment_type || "Checkup",
      healthcare_provider: item.doctor_name || item.healthcare_provider || "",
      hospital_name: item.clinic_hospital_name || item.hospital_name || "",
      appointment_date: item.appointment_date,
      notes: item.notes || "",
      status: item.is_completed ? "completed" : (item.status || "scheduled"),
      created_at: item.created_at
    };
  }
  if (tableName === "finances") {
    return {
      id: item.id,
      user_id: item.user_id,
      description: item.title || item.description || "",
      amount: item.amount || 0,
      transaction_date: item.expense_date || item.transaction_date,
      category: item.category || "General",
      contributed_by: item.expense_type || item.contributed_by || "husband",
      notes: item.notes || "",
      created_at: item.created_at
    };
  }
  if (tableName === "shopping_list") {
    return {
      id: item.id,
      user_id: item.user_id,
      item_name: item.item_name,
      category: item.category,
      estimated_price: item.estimated_cost || item.estimated_price || 0,
      purchased: item.is_purchased === true || item.purchased === true,
      priority: item.priority || "medium",
      notes: item.notes || "",
      created_at: item.created_at
    };
  }
  if (tableName === "reminders") {
    return {
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      reminder_date: item.reminder_date,
      reminder_time: item.reminder_time || "",
      reminder_type: item.category || item.reminder_type || "general",
      is_active: item.is_completed !== true && item.is_active !== false,
      created_at: item.created_at
    };
  }
  if (tableName === "journal_notes") {
    return {
      id: item.id,
      user_id: item.user_id,
      title: item.title,
      content: item.content,
      mood: item.mood || "Happy",
      category: item.symptoms?.category || item.category || "General",
      tags: item.symptoms?.tags || item.tags || [],
      image_url: item.symptoms?.image_url || item.image_url || "",
      is_pinned: item.symptoms?.is_pinned || item.is_pinned || false,
      created_at: item.created_at
    };
  }
  return item;
}

// SCANS
app.get("/api/scans", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("scans").select("*").eq("user_id", userId).order("scan_date", { ascending: false });
      if (!error && data) {
        const scansWithProxy = data.map((s: any) => {
          if (s.image_path) {
            return { ...s, image_url: `/api/gallery/file?path=${encodeURIComponent(s.image_path)}` };
          }
          return s;
        });
        return res.json(scansWithProxy);
      }
    } catch (e) {
      console.error("Supabase scans get error:", e);
    }
  }
  const db = getDB();
  const scans = (db.scans || []).filter((s: any) => s.user_id === userId);
  scans.sort((a: any, b: any) => new Date(b.scan_date).getTime() - new Date(a.scan_date).getTime());
  res.json(scans);
});

app.post("/api/scans", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { scan_date, weeks, days, crl_measurement, heart_rate, estimated_due_date, notes, image_url, image_path } = req.body;
  if (!scan_date) {
    return res.status(400).json({ error: "Scan date is required" });
  }

  const newScan = {
    id: crypto.randomUUID(),
    user_id: userId,
    scan_date,
    weeks: parseInt(weeks) || 0,
    days: parseInt(days) || 0,
    crl_measurement: parseFloat(crl_measurement) || 0,
    heart_rate: parseInt(heart_rate) || 0,
    estimated_due_date: estimated_due_date || "",
    notes: notes || "",
    image_url: image_url || "",
    image_path: image_path || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from("scans").insert(newScan);
    } catch (e) {
      console.error("Supabase scans insert error:", e);
    }
  }

  const db = getDB();
  db.scans.push(newScan);
  saveDB(db);

  logActivity(userId, "scan_added", `Added a new baby ultrasound scan for ${weeks} weeks, ${days} days`);
  res.status(201).json(newScan);
});

app.put("/api/scans/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  const db = getDB();
  const scanIndex = db.scans.findIndex((s: any) => s.id === id && s.user_id === userId);
  const existing = scanIndex !== -1 ? db.scans[scanIndex] : {};

  const updatedScan = {
    ...existing,
    ...req.body,
    id,
    user_id: userId,
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from("scans").upsert(updatedScan);
    } catch (e) {
      console.error("Supabase scans update error:", e);
    }
  }

  if (scanIndex !== -1) {
    db.scans[scanIndex] = updatedScan;
  } else {
    db.scans.push(updatedScan);
  }
  saveDB(db);

  res.json(updatedScan);
});

app.delete("/api/scans/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from("scans").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase scans delete error:", e);
    }
  }
  const db = getDB();
  db.scans = db.scans.filter((s: any) => s.id !== id);
  saveDB(db);
  res.json({ message: "Scan deleted successfully" });
});

// APPOINTMENTS
app.get("/api/appointments", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("appointments").select("*").eq("user_id", userId).order("appointment_date", { ascending: true });
      if (!error && data) {
        const formatted = data.map((item: any) => fromSupabaseRecord("appointments", item));
        return res.json(formatted);
      }
    } catch (e) {
      console.error("Supabase appointments get error:", e);
    }
  }
  const db = getDB();
  const appointments = (db.appointments || []).filter((a: any) => a.user_id === userId);
  appointments.sort((a: any, b: any) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
  res.json(appointments);
});

app.post("/api/appointments", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { appointment_type, appointment_date, hospital_name, location, healthcare_provider, notes, reminder_enabled, reminder_days_before, status } = req.body;
  if (!appointment_type || !appointment_date) {
    return res.status(400).json({ error: "Appointment type and date/time are required" });
  }

  const newAppointment = {
    id: crypto.randomUUID(),
    user_id: userId,
    appointment_type,
    appointment_date,
    hospital_name: hospital_name || "",
    location: location || "",
    healthcare_provider: healthcare_provider || "",
    notes: notes || "",
    reminder_enabled: reminder_enabled === true,
    reminder_days_before: parseInt(reminder_days_before) || 1,
    status: status || "scheduled",
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("appointments", newAppointment);
      await supabase.from("appointments").insert(sbItem);
    } catch (e) {
      console.error("Supabase appointments insert error:", e);
    }
  }

  const db = getDB();
  db.appointments.push(newAppointment);
  saveDB(db);

  logActivity(userId, "appointment_added", `Scheduled a ${appointment_type} appointment for ${new Date(appointment_date).toLocaleDateString()}`);
  res.status(201).json(newAppointment);
});

app.put("/api/appointments/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  const db = getDB();
  const appIndex = db.appointments.findIndex((a: any) => a.id === id && a.user_id === userId);
  const existing = appIndex !== -1 ? db.appointments[appIndex] : {};

  const updatedAppointment = {
    ...existing,
    ...req.body,
    id,
    user_id: userId
  };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("appointments", updatedAppointment);
      await supabase.from("appointments").upsert(sbItem);
    } catch (e) {
      console.error("Supabase appointments update error:", e);
    }
  }

  if (appIndex !== -1) {
    db.appointments[appIndex] = updatedAppointment;
  } else {
    db.appointments.push(updatedAppointment);
  }
  saveDB(db);

  res.json(updatedAppointment);
});

app.delete("/api/appointments/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from("appointments").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase appointments delete error:", e);
    }
  }
  const db = getDB();
  db.appointments = db.appointments.filter((a: any) => a.id !== id);
  saveDB(db);
  res.json({ message: "Appointment deleted successfully" });
});

// FINANCES
app.get("/api/finances", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("finances").select("*").eq("user_id", userId).order("expense_date", { ascending: false });
      if (!error && data) {
        const formatted = data.map((item: any) => fromSupabaseRecord("finances", item));
        return res.json(formatted);
      }
    } catch (e) {
      console.error("Supabase finances get error:", e);
    }
  }
  const db = getDB();
  const finances = (db.finances || []).filter((f: any) => f.user_id === userId);
  finances.sort((a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  res.json(finances);
});

app.post("/api/finances", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { transaction_date, amount, contributed_by, category, description, notes } = req.body;
  if (!transaction_date || !amount || !contributed_by || !category) {
    return res.status(400).json({ error: "Missing transaction details (date, amount, contributed_by, category)" });
  }

  const newTransaction = {
    id: crypto.randomUUID(),
    user_id: userId,
    transaction_date,
    amount: parseFloat(amount) || 0,
    contributed_by,
    category,
    description: description || "",
    notes: notes || "",
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("finances", newTransaction);
      await supabase.from("finances").insert(sbItem);
    } catch (e) {
      console.error("Supabase finances insert error:", e);
    }
  }

  const db = getDB();
  db.finances.push(newTransaction);
  saveDB(db);

  logActivity(userId, "finance_logged", `Logged ${category === "savings" ? "Savings" : "Expense"} of ${newTransaction.amount} contributed by ${contributed_by}`);
  res.status(201).json(newTransaction);
});

app.put("/api/finances/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  const db = getDB();
  const fIndex = db.finances.findIndex((f: any) => f.id === id && f.user_id === userId);
  const existing = fIndex !== -1 ? db.finances[fIndex] : {};

  const updatedTransaction = {
    ...existing,
    ...req.body,
    id,
    user_id: userId
  };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("finances", updatedTransaction);
      await supabase.from("finances").upsert(sbItem);
    } catch (e) {
      console.error("Supabase finances update error:", e);
    }
  }

  if (fIndex !== -1) {
    db.finances[fIndex] = updatedTransaction;
  } else {
    db.finances.push(updatedTransaction);
  }
  saveDB(db);

  res.json(updatedTransaction);
});

app.delete("/api/finances/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from("finances").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase finances delete error:", e);
    }
  }
  const db = getDB();
  db.finances = db.finances.filter((f: any) => f.id !== id);
  saveDB(db);
  res.json({ message: "Transaction deleted successfully" });
});

// SHOPPING LIST
app.get("/api/shopping", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("shopping_list").select("*").eq("user_id", userId);
      if (!error && data) {
        const formatted = data.map((item: any) => fromSupabaseRecord("shopping_list", item));
        return res.json(formatted);
      }
    } catch (e) {
      console.error("Supabase shopping get error:", e);
    }
  }
  const db = getDB();
  const items = (db.shopping_list || []).filter((s: any) => s.user_id === userId);
  res.json(items);
});

app.post("/api/shopping", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { item_name, category, estimated_price, priority, notes } = req.body;
  if (!item_name) {
    return res.status(400).json({ error: "Item name is required" });
  }

  const newItem = {
    id: crypto.randomUUID(),
    user_id: userId,
    item_name,
    category: category || "general",
    estimated_price: parseFloat(estimated_price) || 0,
    purchased: false,
    priority: priority || "medium",
    notes: notes || "",
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("shopping_list", newItem);
      await supabase.from("shopping_list").insert(sbItem);
    } catch (e) {
      console.error("Supabase shopping insert error:", e);
    }
  }

  const db = getDB();
  db.shopping_list.push(newItem);
  saveDB(db);

  logActivity(userId, "shopping_added", `Added "${item_name}" to shopping list`);
  res.status(201).json(newItem);
});

app.put("/api/shopping/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  const db = getDB();
  const sIndex = db.shopping_list.findIndex((s: any) => s.id === id && s.user_id === userId);
  const existing = sIndex !== -1 ? db.shopping_list[sIndex] : {};

  const updatedItem = {
    ...existing,
    ...req.body,
    id,
    user_id: userId
  };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("shopping_list", updatedItem);
      await supabase.from("shopping_list").upsert(sbItem);
    } catch (e) {
      console.error("Supabase shopping update error:", e);
    }
  }

  if (sIndex !== -1) {
    db.shopping_list[sIndex] = updatedItem;
  } else {
    db.shopping_list.push(updatedItem);
  }
  saveDB(db);

  res.json(updatedItem);
});

app.delete("/api/shopping/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from("shopping_list").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase shopping delete error:", e);
    }
  }
  const db = getDB();
  db.shopping_list = db.shopping_list.filter((s: any) => s.id !== id);
  saveDB(db);
  res.json({ message: "Shopping item deleted successfully" });
});

// HOSPITAL BAG CHECKLIST
app.get("/api/hospital-bag", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("hospital_bag_checklist").select("*").eq("user_id", userId);
      if (!error && data) {
        return res.json(data);
      }
    } catch (e) {
      console.error("Supabase hospital bag get error:", e);
    }
  }
  const db = getDB();
  const items = (db.hospital_bag_checklist || []).filter((h: any) => h.user_id === userId);
  res.json(items);
});

app.post("/api/hospital-bag", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { item_name, category } = req.body;
  if (!item_name || !category) {
    return res.status(400).json({ error: "Item name and category are required" });
  }

  const newItem = {
    id: crypto.randomUUID(),
    user_id: userId,
    item_name,
    category,
    is_packed: false,
    is_custom: true,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from("hospital_bag_checklist").insert(newItem);
    } catch (e) {
      console.error("Supabase hospital bag insert error:", e);
    }
  }

  const db = getDB();
  db.hospital_bag_checklist.push(newItem);
  saveDB(db);

  res.status(201).json(newItem);
});

app.put("/api/hospital-bag/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  const db = getDB();
  const hIndex = db.hospital_bag_checklist.findIndex((h: any) => h.id === id && h.user_id === userId);
  const existing = hIndex !== -1 ? db.hospital_bag_checklist[hIndex] : {};

  const updatedItem = {
    ...existing,
    ...req.body,
    id,
    user_id: userId
  };

  if (supabase) {
    try {
      await supabase.from("hospital_bag_checklist").upsert(updatedItem);
    } catch (e) {
      console.error("Supabase hospital bag update error:", e);
    }
  }

  if (hIndex !== -1) {
    db.hospital_bag_checklist[hIndex] = updatedItem;
  } else {
    db.hospital_bag_checklist.push(updatedItem);
  }
  saveDB(db);

  res.json(updatedItem);
});

app.delete("/api/hospital-bag/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from("hospital_bag_checklist").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase hospital bag delete error:", e);
    }
  }
  const db = getDB();
  db.hospital_bag_checklist = db.hospital_bag_checklist.filter((h: any) => h.id !== id);
  saveDB(db);
  res.json({ message: "Item deleted successfully" });
});

// JOURNAL NOTES
app.get("/api/journal", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("journal_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (!error && data) {
        const formatted = data.map((item: any) => fromSupabaseRecord("journal_notes", item));
        return res.json(formatted);
      }
    } catch (e) {
      console.error("Supabase journal get error:", e);
    }
  }
  const db = getDB();
  const notes = (db.journal_notes || []).filter((j: any) => j.user_id === userId);
  notes.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(notes);
});

app.post("/api/journal", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { title, content, mood } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required" });
  }

  const newNote = {
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    content,
    mood: mood || "Happy",
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("journal_notes", newNote);
      await supabase.from("journal_notes").insert(sbItem);
    } catch (e) {
      console.error("Supabase journal insert error:", e);
    }
  }

  const db = getDB();
  db.journal_notes.unshift(newNote);
  saveDB(db);

  logActivity(userId, "journal_added", `Added journal note: "${title}"`);
  res.status(201).json(newNote);
});

app.put("/api/journal/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  const db = getDB();
  const jIndex = db.journal_notes.findIndex((j: any) => j.id === id && j.user_id === userId);
  const existing = jIndex !== -1 ? db.journal_notes[jIndex] : {};

  const updatedNote = {
    ...existing,
    ...req.body,
    id,
    user_id: userId
  };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("journal_notes", updatedNote);
      await supabase.from("journal_notes").upsert(sbItem);
    } catch (e) {
      console.error("Supabase journal update error:", e);
    }
  }

  if (jIndex !== -1) {
    db.journal_notes[jIndex] = updatedNote;
  } else {
    db.journal_notes.unshift(updatedNote);
  }
  saveDB(db);

  res.json(updatedNote);
});

app.delete("/api/journal/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from("journal_notes").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase journal delete error:", e);
    }
  }
  const db = getDB();
  db.journal_notes = db.journal_notes.filter((j: any) => j.id !== id);
  saveDB(db);
  res.json({ message: "Journal entry deleted successfully" });
});

// GENERAL FOLDERS & NOTES
app.get("/api/notes/folders", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("general_folders").select("*").eq("user_id", userId);
      if (!error && data) return res.json(data);
    } catch (e) {
      console.error("Supabase folders get error:", e);
    }
  }
  const db = getDB();
  res.json((db.general_folders || []).filter((f: any) => f.user_id === userId));
});

app.post("/api/notes/folders", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: "Folder name is required" });

  const newFolder = {
    id: crypto.randomUUID(),
    user_id: userId,
    name,
    color: color || "teal",
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from("general_folders").insert(newFolder);
    } catch (e) {
      console.error("Supabase folder insert error:", e);
    }
  }

  const db = getDB();
  db.general_folders.push(newFolder);
  saveDB(db);
  res.status(201).json(newFolder);
});

app.put("/api/notes/folders/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  const db = getDB();
  const fIndex = db.general_folders.findIndex((f: any) => f.id === id && f.user_id === userId);
  const existing = fIndex !== -1 ? db.general_folders[fIndex] : {};

  const updatedFolder = { ...existing, ...req.body, id, user_id: userId };

  if (supabase) {
    try {
      await supabase.from("general_folders").upsert(updatedFolder);
    } catch (e) {
      console.error("Supabase folder update error:", e);
    }
  }

  if (fIndex !== -1) db.general_folders[fIndex] = updatedFolder;
  else db.general_folders.push(updatedFolder);
  saveDB(db);
  res.json(updatedFolder);
});

app.delete("/api/notes/folders/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from("general_folders").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase folder delete error:", e);
    }
  }
  const db = getDB();
  db.general_folders = db.general_folders.filter((f: any) => f.id !== id);
  saveDB(db);
  res.json({ message: "Folder deleted successfully" });
});

app.get("/api/notes", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("general_notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
      if (!error && data) return res.json(data);
    } catch (e) {
      console.error("Supabase notes get error:", e);
    }
  }
  const db = getDB();
  const notes = (db.general_notes || []).filter((n: any) => n.user_id === userId);
  res.json(notes);
});

app.post("/api/notes", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { title, content, folder_id, is_pinned, color } = req.body;
  if (!title && !content) return res.status(400).json({ error: "Title or content is required" });

  const newNote = {
    id: crypto.randomUUID(),
    user_id: userId,
    folder_id: folder_id || null,
    title: title || "Untitled Note",
    content: content || "",
    is_pinned: is_pinned === true,
    color: color || "default",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from("general_notes").insert(newNote);
    } catch (e) {
      console.error("Supabase note insert error:", e);
    }
  }

  const db = getDB();
  db.general_notes.push(newNote);
  saveDB(db);
  res.status(201).json(newNote);
});

app.put("/api/notes/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  const db = getDB();
  const nIndex = db.general_notes.findIndex((n: any) => n.id === id && n.user_id === userId);
  const existing = nIndex !== -1 ? db.general_notes[nIndex] : {};

  const updatedNote = { ...existing, ...req.body, id, user_id: userId, updated_at: new Date().toISOString() };

  if (supabase) {
    try {
      await supabase.from("general_notes").upsert(updatedNote);
    } catch (e) {
      console.error("Supabase note update error:", e);
    }
  }

  if (nIndex !== -1) db.general_notes[nIndex] = updatedNote;
  else db.general_notes.push(updatedNote);
  saveDB(db);
  res.json(updatedNote);
});

app.delete("/api/notes/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from("general_notes").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase note delete error:", e);
    }
  }
  const db = getDB();
  db.general_notes = db.general_notes.filter((n: any) => n.id !== id);
  saveDB(db);
  res.json({ message: "Note deleted successfully" });
});

// REMINDERS
app.get("/api/reminders", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  if (supabase) {
    try {
      const { data, error } = await supabase.from("reminders").select("*").eq("user_id", userId).order("reminder_date", { ascending: true });
      if (!error && data) {
        const formatted = data.map((item: any) => fromSupabaseRecord("reminders", item));
        return res.json(formatted);
      }
    } catch (e) {
      console.error("Supabase reminders get error:", e);
    }
  }
  const db = getDB();
  const reminders = (db.reminders || []).filter((r: any) => r.user_id === userId);
  res.json(reminders);
});

app.post("/api/reminders", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { reminder_type, title, description, reminder_date, reminder_time, frequency } = req.body;
  if (!title || !reminder_date) {
    return res.status(400).json({ error: "Title and reminder date are required" });
  }

  const newReminder = {
    id: crypto.randomUUID(),
    user_id: userId,
    reminder_type: reminder_type || "custom",
    title,
    description: description || "",
    reminder_date,
    reminder_time: reminder_time || "09:00",
    frequency: frequency || "once",
    is_active: true,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("reminders", newReminder);
      await supabase.from("reminders").insert(sbItem);
    } catch (e) {
      console.error("Supabase reminder insert error:", e);
    }
  }

  const db = getDB();
  db.reminders.push(newReminder);
  saveDB(db);

  logActivity(userId, "reminder_added", `Set a reminder: "${title}" for ${reminder_date}`);
  res.status(201).json(newReminder);
});

app.put("/api/reminders/:id", authenticateUser, async (req, res) => {
  const userId = (req as any).user.user_id || (req as any).user.id;
  const { id } = req.params;
  const db = getDB();
  const remIndex = db.reminders.findIndex((r: any) => r.id === id && r.user_id === userId);
  const existing = remIndex !== -1 ? db.reminders[remIndex] : {};

  const updatedReminder = { ...existing, ...req.body, id, user_id: userId };

  if (supabase) {
    try {
      const sbItem = toSupabaseRecord("reminders", updatedReminder);
      await supabase.from("reminders").upsert(sbItem);
    } catch (e) {
      console.error("Supabase reminder update error:", e);
    }
  }

  if (remIndex !== -1) db.reminders[remIndex] = updatedReminder;
  else db.reminders.push(updatedReminder);
  saveDB(db);

  res.json(updatedReminder);
});

app.delete("/api/reminders/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    try {
      await supabase.from("reminders").delete().eq("id", id);
    } catch (e) {
      console.error("Supabase reminder delete error:", e);
    }
  }
  const db = getDB();
  db.reminders = db.reminders.filter((r: any) => r.id !== id);
  saveDB(db);
  res.json({ message: "Reminder deleted successfully" });
});

// ACTIVITY LOGS
app.get("/api/activities", authenticateUser, async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (!error && data) return res.json(data);
    } catch (e) {
      console.error("Supabase activity logs error:", e);
    }
  }
  const db = getDB();
  res.json(db.activity_logs || []);
});


// IMAGE UPLOAD WORKFLOW
app.post("/api/upload", authenticateUser, async (req, res) => {
  const { filename, fileData, mimeType } = req.body; // fileData is base64
  const user = (req as any).user;
  if (!filename || !fileData) {
    return res.status(400).json({ error: "Filename and base64 fileData are required" });
  }

  try {
    const buffer = Buffer.from(fileData, "base64");
    const extension = path.extname(filename) || ".png";
    const cleanExt = extension.startsWith(".") ? extension : `.${extension}`;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateFolder = `${year}/${month}/${day}`;

    // Supabase datewise path
    const uniqueFileName = `scans/${dateFolder}/${user?.user_id || 'general'}/${Date.now()}-${crypto.randomUUID()}${cleanExt}`;

    let imageUrl = "";
    let imagePath = "";

    const sbResult = await uploadToSupabaseStorageBucket(uniqueFileName, buffer, mimeType);
    if (sbResult) {
      imageUrl = sbResult.publicUrl;
      imagePath = sbResult.storagePath;
    } else {
      const localSubDir = path.join(UPLOAD_DIR, "scans", year.toString(), month, day);
      if (!fs.existsSync(localSubDir)) {
        fs.mkdirSync(localSubDir, { recursive: true });
      }
      const localFileName = `${Date.now()}-${crypto.randomUUID()}${cleanExt}`;
      const filePath = path.join(localSubDir, localFileName);
      fs.writeFileSync(filePath, buffer);
      imageUrl = `/uploads/scans/${year}/${month}/${day}/${localFileName}`;
      imagePath = `uploads/scans/${year}/${month}/${day}/${localFileName}`;
    }

    res.json({
      imageUrl,
      imagePath
    });
  } catch (error) {
    console.error("Error writing upload", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// SUPABASE STORAGE BUCKET HELPER FOR BABY GALLERY
async function uploadToSupabaseStorageBucket(storageFileName: string, buffer: Buffer, mimeType?: string) {
  if (!supabase) return null;
  const BUCKET_NAME = "kunjubaby";
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (!listError) {
      const bucketExists = buckets?.some((b: any) => b.name === BUCKET_NAME);
      if (!bucketExists) {
        try {
          await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        } catch (bErr) {
          console.log("Notice on Supabase createBucket:", bErr);
        }
      }
    }

    const contentType = mimeType || "image/jpeg";
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(storageFileName, buffer, {
      contentType,
      upsert: true
    });

    if (error) {
      console.error("Supabase Storage bucket upload error:", error.message);
      return null;
    }

    let publicUrl = "";
    // Try creating signed URL (valid for 10 years)
    try {
      const { data: signedData } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(storageFileName, 60 * 60 * 24 * 365 * 10);
      if (signedData?.signedUrl) {
        publicUrl = signedData.signedUrl;
      }
    } catch (sErr) {
      console.log("Notice on signedUrl:", sErr);
    }

    if (!publicUrl) {
      const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storageFileName);
      publicUrl = publicUrlData?.publicUrl || "";
    }

    if (!publicUrl) {
      publicUrl = `/api/gallery/file?path=${encodeURIComponent(data.path)}`;
    }

    return {
      publicUrl,
      storagePath: data.path
    };
  } catch (err: any) {
    console.error("Failed Supabase bucket upload:", err.message || err);
    return null;
  }
}

// PROXY FILE ROUTE FOR SUPABASE & LOCAL STORAGE
app.get("/api/gallery/file", async (req, res) => {
  const filePath = (req.query.path as string) || "";
  if (!filePath) {
    return res.status(400).json({ error: "Path is required" });
  }

  // 1. Try downloading from Supabase storage bucket
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.from("kunjubaby").download(filePath);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        const ext = path.extname(filePath).toLowerCase();
        let mime = "image/jpeg";
        if (ext === ".png") mime = "image/png";
        else if (ext === ".webp") mime = "image/webp";
        else if (ext === ".gif") mime = "image/gif";

        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(buffer);
      }
    } catch (sbErr) {
      console.error("Supabase download file error:", sbErr);
    }
  }

  // 2. Fallback to local uploads directory
  const cleanPath = filePath.replace(/^uploads\//, "");
  const localPath = path.join(UPLOAD_DIR, cleanPath);
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  res.status(404).json({ error: "File not found" });
});

// BABY PHOTO GALLERY ENDPOINTS
app.get("/api/gallery/storage-status", (req, res) => {
  res.json({
    supabaseConnected: !!supabase,
    supabaseUrl: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^\/]+).*/, "$1") : null,
    bucketName: "kunjubaby"
  });
});

app.get("/api/gallery", authenticateUser, async (req, res) => {
  const db = getDB();
  if (!db.deleted_photos) db.deleted_photos = [];
  const deletedPhotos = db.deleted_photos;

  const localPhotos = (db.baby_gallery || []).filter((p: any) => !deletedPhotos.includes(p.id));
  let photos = [...localPhotos];

  if (supabase) {
    try {
      const { data: sbPhotos, error } = await supabase.from("baby_gallery").select("*").order("created_at", { ascending: false });
      if (!error && sbPhotos && sbPhotos.length > 0) {
        const photoMap = new Map();
        localPhotos.forEach((p: any) => photoMap.set(p.id, p));
        sbPhotos.forEach((p: any) => {
          if (!deletedPhotos.includes(p.id)) {
            photoMap.set(p.id, p);
          }
        });
        photos = Array.from(photoMap.values());
        db.baby_gallery = photos;
        saveDB(db);
      }
    } catch (err) {
      console.error("Supabase error fetching gallery photos:", err);
    }
  }

  photos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const photosWithProxy = photos.map((p: any) => {
    if (p.storage_path) {
      return {
        ...p,
        photo_url: `/api/gallery/file?path=${encodeURIComponent(p.storage_path)}`
      };
    }
    return p;
  });

  res.json(photosWithProxy);
});

app.post("/api/gallery", authenticateUser, async (req, res) => {
  const user = (req as any).user;
  const { title, caption, milestone_week, fileData, filename, mimeType, photo_url } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  if (!fileData && !photo_url) {
    return res.status(400).json({ error: "Please select an image file to upload or provide a photo URL" });
  }

  let finalPhotoUrl = photo_url || "";
  let storagePath = "";
  let storageProvider: "supabase" | "local" = "local";

  if (fileData) {
    try {
      const buffer = Buffer.from(fileData, "base64");
      const ext = path.extname(filename || "photo.jpg") || ".jpg";
      const cleanExt = ext.startsWith(".") ? ext : `.${ext}`;

      // Datewise hierarchy: YYYY/MM/DD
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const dateFolder = `${year}/${month}/${day}`;

      // Supabase datewise path: YYYY/MM/DD/<user_id>/<timestamp-uuid>.jpg
      const uniqueFileName = `${dateFolder}/${user.user_id}/${Date.now()}-${crypto.randomUUID()}${cleanExt}`;

      const sbResult = await uploadToSupabaseStorageBucket(uniqueFileName, buffer, mimeType);
      if (sbResult) {
        finalPhotoUrl = sbResult.publicUrl;
        storagePath = sbResult.storagePath;
        storageProvider = "supabase";
      } else {
        const localSubDir = path.join(UPLOAD_DIR, "gallery", year.toString(), month, day);
        if (!fs.existsSync(localSubDir)) {
          fs.mkdirSync(localSubDir, { recursive: true });
        }
        const localFileName = `${Date.now()}-${crypto.randomUUID()}${cleanExt}`;
        const filePath = path.join(localSubDir, localFileName);
        fs.writeFileSync(filePath, buffer);
        finalPhotoUrl = `/uploads/gallery/${year}/${month}/${day}/${localFileName}`;
        storagePath = `uploads/gallery/${year}/${month}/${day}/${localFileName}`;
        storageProvider = "local";
      }
    } catch (err: any) {
      console.error("Error processing gallery image upload:", err);
      return res.status(500).json({ error: "Failed to process image upload" });
    }
  }

  const db = getDB();
  const newPhoto = {
    id: crypto.randomUUID(),
    user_id: user.user_id,
    user_name: user.name || (user.role === 'husband' ? 'Husband' : 'Wife'),
    title: title.trim(),
    caption: caption ? caption.trim() : "",
    photo_url: finalPhotoUrl,
    storage_path: storagePath,
    storage_provider: storageProvider,
    milestone_week: milestone_week || "",
    created_at: new Date().toISOString()
  };

  if (!db.baby_gallery) db.baby_gallery = [];
  db.baby_gallery.unshift(newPhoto);
  saveDB(db);

  if (supabase) {
    try {
      await supabase.from("baby_gallery").insert({
        id: newPhoto.id,
        user_id: newPhoto.user_id,
        title: newPhoto.title,
        caption: newPhoto.caption,
        photo_url: newPhoto.photo_url,
        storage_path: newPhoto.storage_path,
        storage_provider: newPhoto.storage_provider,
        milestone_week: newPhoto.milestone_week,
        created_at: newPhoto.created_at
      });
    } catch (sbErr) {
      console.error("Supabase error saving gallery record:", sbErr);
    }
  }

  logActivity(
    user.user_id,
    "baby_photo_uploaded",
    `Uploaded baby photo "${newPhoto.title}" (${storageProvider === 'supabase' ? 'Supabase Storage Bucket' : 'Local Storage'})`
  );

  res.status(201).json(newPhoto);
});

app.delete("/api/gallery/:id", authenticateUser, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  const db = getDB();

  if (!db.deleted_photos) db.deleted_photos = [];
  if (!db.deleted_photos.includes(id)) {
    db.deleted_photos.push(id);
  }

  if (!db.baby_gallery) db.baby_gallery = [];
  const index = db.baby_gallery.findIndex((p: any) => p.id === id);

  let photo: any = null;
  if (index !== -1) {
    photo = db.baby_gallery[index];
    if (photo.storage_provider === "supabase" && photo.storage_path && supabase) {
      try {
        await supabase.storage.from("kunjubaby").remove([photo.storage_path]);
      } catch (err) {
        console.error("Error removing file from Supabase bucket:", err);
      }
    } else if (photo.storage_provider === "local" && photo.storage_path) {
      try {
        const fullPath = path.join(process.cwd(), photo.storage_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.error("Error deleting local image file:", err);
      }
    }
    db.baby_gallery.splice(index, 1);
  }

  saveDB(db);

  if (supabase) {
    try {
      await supabase.from("baby_gallery").delete().eq("id", id);
    } catch (sbErr) {
      console.error("Supabase error deleting gallery record:", sbErr);
    }
  }

  logActivity(user.user_id, "baby_photo_deleted", `Deleted photo "${photo ? photo.title : 'gallery item'}"`);

  res.json({ message: "Photo deleted successfully", id });
});


// GEMINI AI ADVISOR & BABY NAME GENERATOR
// Helper for resilient Gemini API calls with retries and model fallbacks
async function callGeminiWithFallback(contents: any, config?: any) {
  if (!ai) {
    throw new Error("Gemini AI is not configured. Please set GEMINI_API_KEY.");
  }

  // List of models to attempt in priority order
  const candidateModels = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastErr: any = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      console.warn(`Gemini model ${modelName} call failed:`, err?.message || err);
      lastErr = err;
      // Brief pause before trying next candidate model
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  throw lastErr || new Error("All Gemini model attempts failed.");
}

app.post("/api/ai/baby-names", authenticateUser, async (req, res) => {
  const { gender, startingLetter, meaningTheme, origin, tags } = req.body;
  if (!ai) {
    return res.status(503).json({ error: "Gemini AI is not configured. Please set GEMINI_API_KEY." });
  }

  try {
    const prompt = `Generate a comprehensive list of 10 unique and beautiful baby names with the following criteria:
    - Gender: ${gender || "Any"}
    - Starting Letter: ${startingLetter || "Any"}
    - Meaning/Theme: ${meaningTheme || "Beautiful, strong, kind"}
    - Cultural Origin: ${origin || "Any"}
    - Additional Preferences: ${tags ? tags.join(", ") : "None"}

    Return the list as a valid JSON array of objects, where each object has these exact fields:
    "name" (string), "gender" (string), "origin" (string), "meaning" (string), "pronunciation" (string), "whyWeLoveIt" (string).
    Do NOT include markdown wrapping or backticks like \`\`\`json. Return ONLY raw valid JSON code.`;

    const response = await callGeminiWithFallback(prompt, {
      responseMimeType: "application/json"
    });

    let text = response.text || "[]";
    // Strip possible markdown backticks if returned despite prompt
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    const names = JSON.parse(text);
    res.json(names);
  } catch (error: any) {
    console.error("Error generating baby names via Gemini", error);
    
    // Provide a rich curated fallback list of baby names if AI service is temporarily unavailable
    const fallbackNames = [
      {
        name: "Aarav",
        gender: "boy",
        origin: "Indian (Sanskrit)",
        meaning: "Peaceful, wisdom, musical note",
        pronunciation: "AH-ruhv",
        whyWeLoveIt: "A timeless, melodious name signifying deep calm and wisdom."
      },
      {
        name: "Ananya",
        gender: "girl",
        origin: "Indian (Malayalam / Sanskrit)",
        meaning: "Unique, matchless, one of a kind",
        pronunciation: "Ah-NUN-yah",
        whyWeLoveIt: "Short, modern, and expressive of the precious uniqueness of your child."
      },
      {
        name: "Kian",
        gender: "unisex",
        origin: "Modern / Gaelic",
        meaning: "Grace of God, ancient, king",
        pronunciation: "KEE-uhn",
        whyWeLoveIt: "Clean, snappy, and works beautifully across diverse cultures."
      },
      {
        name: "Diya",
        gender: "girl",
        origin: "Indian",
        meaning: "Bright lamp, divine light",
        pronunciation: "DEE-yah",
        whyWeLoveIt: "Radiates warmth, happiness, and eternal guidance."
      },
      {
        name: "Dev",
        gender: "boy",
        origin: "Indian (Sanskrit)",
        meaning: "Divine, godlike, shining one",
        pronunciation: "DAY-v",
        whyWeLoveIt: "Strong single-syllable name with high resonance."
      },
      {
        name: "Ila",
        gender: "girl",
        origin: "Sanskrit / Latin",
        meaning: "Earth, moonlight, beauty",
        pronunciation: "EE-lah",
        whyWeLoveIt: "Minimalist, organic, and grounded in nature."
      },
      {
        name: "Rohan",
        gender: "boy",
        origin: "Indian",
        meaning: "Ascending, blossom, healer",
        pronunciation: "ROH-hun",
        whyWeLoveIt: "Full of vitality and optimistic forward energy."
      },
      {
        name: "Tara",
        gender: "girl",
        origin: "Malayalam / Sanskrit",
        meaning: "Star, shining light",
        pronunciation: "TAH-rah",
        whyWeLoveIt: "Celestial, delicate, and easily pronounced globally."
      },
      {
        name: "Vihaan",
        gender: "boy",
        origin: "Indian",
        meaning: "Dawn, beginning of a new era",
        pronunciation: "Vee-HAHN",
        whyWeLoveIt: "Symbolizes the radiant new morning your baby brings into your home."
      },
      {
        name: "Zara",
        gender: "unisex",
        origin: "Arabic / Modern",
        meaning: "Blooming flower, radiance, princess",
        pronunciation: "ZAH-rah",
        whyWeLoveIt: "Chic, universal, and wonderfully upbeat."
      }
    ];

    res.json(fallbackNames);
  }
});

app.post("/api/ai/advisor", authenticateUser, async (req, res) => {
  const { currentWeek, query } = req.body;
  if (!ai) {
    return res.status(503).json({ error: "Gemini AI is not configured. Please set GEMINI_API_KEY." });
  }

  try {
    let prompt = "";
    if (query) {
      prompt = `You are an expert, warm, and highly supportive pregnancy advisor and midwife assistant for "Kunju Baby's" App.
      The user is currently in Week ${currentWeek || "unspecified"} of pregnancy and is asking:
      "${query}"

      Provide a helpful, detailed, and reassuring response. If appropriate, share 2-3 practical tips or bullet points.
      Include a standard, gentle medical disclaimer at the end in italics stating that this advice is for educational and tracking purposes and they should always consult their midwife or doctor.
      Keep the formatting clean using markdown.`;
    } else {
      prompt = `You are an expert pregnancy and fetal development advisor. The parent is currently in Week ${currentWeek} of pregnancy.
      Provide a highly detailed breakdown for Week ${currentWeek} including:
      1. Baby's Size Comparison (e.g., fruit/vegetable size) and length/weight estimates.
      2. Key Fetal Development Milestones occurring in week ${currentWeek}.
      3. Tips for the Mother (common symptoms to expect, nutrition advice, comfort tips).
      4. Tips for the Husband/Partner (how they can support the mother specifically this week).

      Structure the response as a JSON object with these exact keys:
      "sizeComparison" (string - e.g. "Size of a peach"),
      "fetalDevelopment" (string - markdown formatted list),
      "motherTips" (string - markdown formatted list),
      "partnerTips" (string - markdown formatted list).

      Do NOT include markdown wrapping or backticks like \`\`\`json. Return ONLY raw valid JSON.`;
    }

    const response = await callGeminiWithFallback(prompt, {
      responseMimeType: query ? "text/plain" : "application/json"
    });

    let text = response.text || "";
    if (query) {
      res.json({ answer: text.trim() });
    } else {
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const data = JSON.parse(text);
      res.json(data);
    }
  } catch (error: any) {
    console.error("Error fetching AI advice via Gemini", error);

    if (query) {
      res.json({
        answer: `Thank you for asking about "${query}". While our AI service is experiencing high traffic, here is some general midwife advice:\n\n- Stay well-hydrated and rest whenever you feel fatigued.\n- Keep track of any unusual symptoms and share them with your healthcare provider.\n\n*Medical Disclaimer: This advice is for informational tracking purposes. Please consult your midwife or doctor for personalized healthcare.*`
      });
    } else {
      const weekNum = currentWeek || 12;
      res.json({
        sizeComparison: `Size of a lime or plum (~5-6 cm long)`,
        fetalDevelopment: `- Baby's reflexes are developing rapidly.\n- Fingernails and toe buds are beginning to form.\n- Facial features are becoming more distinct.\n- Vital organs are performing complex functions.`,
        motherTips: `- Morning sickness may begin to subside as you near the second trimester.\n- Keep eating nutrient-dense, small frequent meals.\n- Stay hydrated with water and electrolyte-rich fluids.`,
        partnerTips: `- Offer reassuring foot or back massages.\n- Help out with daily household tasks and meal preparation.\n- Attend prenatal checkups and ultrasound scans together.`
      });
    }
  }
});

// Catch-all 404 for unmatched API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl || req.url} not found` });
});

// BUILD AND START CONFIGURATION FOR EXPRESS + VITE
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});


// Global Express Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Express Error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: err?.message || "Internal server error",
      details: String(err?.stack || err)
    });
  }
});

const startServer = async () => {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !isVercel) {
    const { createServer: createViteServer } = await import("vi" + "te");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (!isVercel) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!isVercel) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
};

startServer();

export default app;
