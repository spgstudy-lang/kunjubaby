import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY");
  console.log("URL:", supabaseUrl);
  console.log("Key:", supabaseKey ? "Present" : "Missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Attempting a simple query
    const { data, error } = await supabase.from("users_auth").select("id").limit(1);
    if (error) {
      console.error("Error connecting to Supabase:", error.message);
      process.exit(1);
    }
    console.log("Successfully connected to Supabase!");
  } catch (err) {
    console.error("Failed to connect to Supabase:", err);
    process.exit(1);
  }
}

testConnection();
