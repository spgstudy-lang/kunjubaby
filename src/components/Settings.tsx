import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { CURRENCIES, CurrencyOption } from "../lib/currencies";
import { 
  Settings as SettingsIcon, 
  Coins, 
  Calculator, 
  Moon, 
  Sun, 
  Database, 
  CloudUpload,
  User, 
  ShieldCheck, 
  Download, 
  Check, 
  AlertCircle, 
  RefreshCw,
  FileCode,
  Copy,
  CheckCircle2,
  Power,
  UserPlus,
  Trash2,
  Users,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff
} from "lucide-react";
import { motion } from "motion/react";

interface SettingsProps {
  user: UserProfile;
  currentCurrencyCode: string;
  onCurrencyChange: (currencyCode: string) => void;
  calcOpen: boolean;
  onToggleCalc: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onRefreshAllData: () => Promise<void>;
}

export default function Settings({
  user,
  currentCurrencyCode,
  onCurrencyChange,
  calcOpen,
  onToggleCalc,
  darkMode,
  onToggleDarkMode,
  onRefreshAllData
}: SettingsProps) {
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [schemaText, setSchemaText] = useState("");
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Admin user management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"husband" | "wife" | "admin">("husband");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Factory Reset state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Supabase sync states
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; syncCount?: number } | null>(null);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/supabase/sync-all", {
        method: "POST"
      });
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server returned non-JSON response (${res.status})`);
      }
      const data = await res.json();
      if (res.ok) {
        setSyncResult({
          success: true,
          message: data.message || "Successfully synchronized local data with Supabase!",
          syncCount: data.syncCount
        });
        if (onRefreshAllData) {
          onRefreshAllData();
        }
      } else {
        setSyncResult({
          success: false,
          message: data.error || "Sync failed. Please try again."
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || "An unexpected error occurred during sync."
      });
    } finally {
      setSyncing(false);
    }
  };

  // Check Supabase connection on load (for all users)
  const checkSupabase = async () => {
    setCheckingDb(true);
    try {
      const res = await fetch("/api/supabase/status");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setSupabaseStatus(data);
      } else {
        setSupabaseStatus({
          configured: false,
          connected: false,
          message: "Database engine operational via local JSON stash."
        });
      }
    } catch (err) {
      console.error("Failed to fetch Supabase status:", err);
      setSupabaseStatus({
        configured: false,
        connected: false,
        message: "Database engine operational via local JSON stash."
      });
    } finally {
      setCheckingDb(false);
    }
  };

  // Fetch admin users list if user is admin
  const fetchUsers = async () => {
    if (user.role !== "admin") return;
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("kunju_baby_token") || localStorage.getItem("authToken")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error("Failed to fetch admin users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSchemaSql = async () => {
    try {
      const res = await fetch("/api/supabase/schema");
      if (res.ok) {
        const text = await res.text();
        setSchemaText(text);
        setShowSqlModal(true);
      }
    } catch (err) {
      console.error("Failed to load schema SQL:", err);
    }
  };

  useEffect(() => {
    if (user.role === "admin") {
      checkSupabase();
      fetchUsers();
    }
  }, [user.role]);

  const copySql = () => {
    if (schemaText) {
      navigator.clipboard.writeText(schemaText);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    }
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setUserMsg({ type: "error", text: "Please fill in all required user fields." });
      return;
    }

    setCreatingUser(true);
    setUserMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.user_id}`
        },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole
        })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server returned non-JSON error (${res.status})`);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setUserMsg({ type: "success", text: `User account "${data.name}" (${data.email}) created successfully!` });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("husband");
      fetchUsers();
    } catch (err: any) {
      setUserMsg({ type: "error", text: err.message || "Failed to create user" });
    } finally {
      setCreatingUser(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (targetUserId: string, targetName: string, targetEmail: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${targetName}" (${targetEmail})?\n\nThis will permanently delete their account and profile.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${targetUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.user_id}` }
      });
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server returned non-JSON response (${res.status})`);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setUserMsg({ type: "success", text: `User "${targetName}" deleted successfully.` });
      fetchUsers();
    } catch (err: any) {
      setUserMsg({ type: "error", text: err.message || "Failed to delete user" });
    }
  };

  // Factory Reset Handler
  const handleFactoryReset = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== "RESET") {
      setResetMsg({ type: "error", text: 'Please type "RESET" in capital letters to confirm.' });
      return;
    }

    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch("/api/admin/factory-reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${user.user_id}` }
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server returned non-JSON response (${res.status})`);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute factory reset");
      }

      setResetMsg({ type: "success", text: "Factory reset complete! All local & Supabase cloud data has been erased." });
      setResetConfirmInput("");
      setTimeout(async () => {
        setShowResetModal(false);
        await onRefreshAllData();
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setResetMsg({ type: "error", text: err.message || "Factory reset failed" });
    } finally {
      setResetting(false);
    }
  };

  const selectedCurrency = CURRENCIES.find((c) => c.code === currentCurrencyCode) || CURRENCIES[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl">
              <SettingsIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                App Preferences & Settings
              </h1>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Configure currency, floating tools, user controls, and system preferences
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-settings-refresh-all"
          onClick={onRefreshAllData}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer w-max"
        >
          <RefreshCw className="h-4 w-4" /> Sync All Stashes
        </button>
      </div>

      {/* SECTION 1: MULTIPLE CURRENCY OPTIONS */}
      <div className="glass-panel p-6 rounded-3xl space-y-5">
        <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                Multiple Currency Options
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select your preferred family budget currency. Updates all financial & shopping totals instantly.
              </p>
            </div>
          </div>

          <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-3 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5">
            <span>Active:</span>
            <span className="text-base">{selectedCurrency.flag}</span>
            <span>{selectedCurrency.code} ({selectedCurrency.symbol})</span>
          </div>
        </div>

        {/* Currency Grid Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CURRENCIES.map((curr) => {
            const isSelected = curr.code === currentCurrencyCode;
            return (
              <button
                key={curr.code}
                id={`currency-opt-${curr.code}`}
                onClick={() => onCurrencyChange(curr.code)}
                className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 font-bold shadow-md"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{curr.flag}</span>
                  <div>
                    <span className="text-xs font-extrabold block text-slate-800 dark:text-slate-100">
                      {curr.code}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                      {curr.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {curr.symbol}
                  </span>
                  {isSelected && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Currency Live Preview Card */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap justify-between items-center gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Sample Formatted Financial Display
            </span>
            <div className="text-xl font-mono font-black text-emerald-400">
              {selectedCurrency.symbol} 1,250.00
            </div>
          </div>
          <div className="text-xs text-slate-300 font-semibold max-w-sm">
            All savings, purchases, medical bills, and shopping list estimates are converted to display in{" "}
            <span className="text-teal-300 font-bold">{selectedCurrency.name}</span>.
          </div>
        </div>
      </div>

      {/* SECTION 2: FLOATING CALCULATOR TOGGLE & PREFERENCES */}
      <div className="glass-panel p-6 rounded-3xl space-y-5">
        <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                Floating Calculator Widget
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Interactive mini math & baby estimator widget accessible across any screen in the application.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${calcOpen ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
              {calcOpen ? "Calculator ON" : "Calculator OFF"}
            </span>
            <button
              id="btn-toggle-calc-settings"
              onClick={onToggleCalc}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                calcOpen ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  calcOpen ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Power className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <span className="font-bold block text-slate-800 dark:text-slate-200">
                ON/OFF Power Toggle
              </span>
              <span className="text-slate-500 dark:text-slate-400 block">
                Turn the calculator on or off anytime using the toggle above or the calculator icon in the main header.
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <Calculator className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <span className="font-bold block text-slate-800 dark:text-slate-200">
                Medical & Baby Math Tools
              </span>
              <span className="text-slate-500 dark:text-slate-400 block">
                Includes Last Menstrual Period (LMP) +280 days due date estimator, weight converter (kg ↔ lbs), and tax adders.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: DARK MODE & APPEARANCE */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                Theme & Appearance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch between eye-safe dark mode and clean daylight theme
              </p>
            </div>
          </div>

          <button
            id="btn-toggle-darkmode-settings"
            onClick={onToggleDarkMode}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            {darkMode ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" /> Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-purple-500" /> Switch to Dark Mode
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 4: USER PROFILE & FAMILY ACCOUNT */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-3 border-b border-dashed border-slate-200 dark:border-slate-800 pb-4">
          <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Family Account Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Logged in as collaborative partner in Kunju Baby's family stashes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Full Name</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{user.name}</span>
          </div>

          <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Email Address</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{user.email}</span>
          </div>

          <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Family Role</span>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 5: ADMIN PANEL - USER CREATION & DELETION + FACTORY RESET (ADMIN ONLY) */}
      {user.role === "admin" && (
        <div className="space-y-8">
          {/* USER MANAGEMENT CARD */}
          <div className="glass-panel p-6 rounded-3xl space-y-6 border-2 border-indigo-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                      Admin Panel: User Management
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                      Admin Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create new user accounts, assign roles, and manage active family credentials
                  </p>
                </div>
              </div>

              <button
                id="btn-refresh-users-list"
                onClick={fetchUsers}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? "animate-spin" : ""}`} /> Refresh Users
              </button>
            </div>

            {userMsg && (
              <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                userMsg.type === "success" 
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" 
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30"
              }`}>
                {userMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{userMsg.text}</span>
              </div>
            )}

            {/* CREATE NEW USER FORM */}
            <form onSubmit={handleCreateUser} className="bg-slate-50/60 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                <UserPlus className="h-4 w-4 text-indigo-500" />
                <span>Create New User Account</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="admin-create-name"
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Email Address *
                  </label>
                  <input
                    id="admin-create-email"
                    type="email"
                    required
                    placeholder="e.g. john@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Password *
                  </label>
                  <input
                    id="admin-create-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Family Role
                  </label>
                  <select
                    id="admin-create-role"
                    value={newUserRole}
                    onChange={(e: any) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-semibold"
                  >
                    <option value="husband">👨 Husband</option>
                    <option value="wife">👩‍🦰 Wife</option>
                    <option value="admin">🛡️ Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  id="btn-admin-submit-create-user"
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" /> {creatingUser ? "Creating Account..." : "Create User"}
                </button>
              </div>
            </form>

            {/* ACTIVE USERS TABLE / LIST */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Registered Family Accounts ({usersList.length})
              </span>

              {usersList.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 dark:bg-slate-900/70 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-3">User Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Password</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Joined Date</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 bg-white/40 dark:bg-slate-900/40">
                      {usersList.map((u) => {
                        const isMainAdmin = u.email.toLowerCase() === "syam@gmail.com";
                        const isSelf = u.user_id === user.user_id;
                        const isPassVisible = showPasswords[u.id] || false;
                        const displayPass = u.password || (isMainAdmin ? "225500" : "••••••••");

                        return (
                          <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                            <td className="p-3 font-extrabold text-slate-800 dark:text-slate-100">
                              {u.name} {isSelf && <span className="text-[10px] text-indigo-500 font-bold">(You)</span>}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                              {u.email}
                            </td>
                            <td className="p-3 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className={isPassVisible ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400"}>
                                  {isPassVisible ? displayPass : "••••••••"}
                                </span>
                                <button
                                  id={`btn-toggle-pass-${u.id}`}
                                  type="button"
                                  onClick={() => setShowPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                  className="p-1 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                                  title={isPassVisible ? "Hide Password" : "Show Password"}
                                >
                                  {isPassVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                u.role === "admin" 
                                  ? "bg-purple-500/10 text-purple-600 border border-purple-500/20" 
                                  : u.role === "husband" 
                                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" 
                                  : "bg-teal-500/10 text-teal-600 border border-teal-500/20"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">
                              {new Date(u.created_at || Date.now()).toLocaleDateString()}
                            </td>
                            <td className="p-3 text-center">
                              {isMainAdmin || isSelf ? (
                                <span className="text-[10px] text-slate-400 italic">Protected</span>
                              ) : (
                                <button
                                  id={`btn-delete-user-${u.id}`}
                                  onClick={() => handleDeleteUser(u.user_id, u.name, u.email)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                                  title="Delete User Account"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 text-xs text-slate-400 rounded-2xl text-center">
                  Loading user accounts...
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: DATABASE & SUPABASE CONNECTION STATUS (ADMIN ONLY) */}
          <div className="glass-panel p-6 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dashed border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    Supabase & Database Status
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Full-stack persistence status and schema auto-seed details
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-test-db-connection"
                  onClick={checkSupabase}
                  disabled={checkingDb}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${checkingDb ? "animate-spin" : ""}`} /> Test Connection
                </button>
                <button
                  id="btn-view-sql-schema"
                  onClick={fetchSchemaSql}
                  className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-teal-500/20"
                >
                  <FileCode className="h-3.5 w-3.5" /> View SQL Schema
                </button>
              </div>
            </div>

            {/* Database Status Info Cards */}
            {supabaseStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Supabase Configured:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      supabaseStatus.configured ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    }`}>
                      {supabaseStatus.configured ? "YES" : "LOCAL STASH ENGINE"}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    {supabaseStatus.message}
                  </p>
                </div>

                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Default Admin Account:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Auto-Seeded
                    </span>
                  </div>
                  <div className="space-y-0.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    <div>Email: <span className="font-bold text-emerald-600 dark:text-emerald-400">syam@gmail.com</span></div>
                    <div>Password: <span className="font-bold text-emerald-600 dark:text-emerald-400">225500</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 rounded-2xl">
                Checking database connection status...
              </div>
            )}

            {/* Supabase Sync Trigger Panel */}
            {supabaseStatus && supabaseStatus.configured && (
              <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-teal-500/5 dark:from-indigo-500/10 dark:to-teal-500/10 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <CloudUpload className="h-4 w-4 text-indigo-500" /> Force Full Database Sync
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sync all of your offline/local transactions, baby scans, appointments, notes, and reminders up to your cloud Supabase database.
                    </p>
                  </div>
                  <button
                    id="btn-sync-all-data"
                    onClick={handleSyncAll}
                    disabled={syncing}
                    className="self-start sm:self-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-500/10 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing..." : "Sync All Now"}
                  </button>
                </div>

                {syncResult && (
                  <div className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 ${
                    syncResult.success 
                      ? "bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30" 
                      : "bg-rose-50/80 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30"
                  }`}>
                    {syncResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-extrabold">{syncResult.success ? "Sync Succeeded!" : "Sync Failed"}</p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">{syncResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 7: FACTORY RESET DANGER ZONE (ADMIN ONLY) */}
          <div className="p-6 bg-rose-500/5 dark:bg-rose-950/10 border-2 border-rose-500/30 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-rose-700 dark:text-rose-400">
                    Factory Reset System & Database
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Permanently erase all baby data, financial records, shopping items, and custom users across local and Supabase cloud DB.
                  </p>
                </div>
              </div>

              <button
                id="btn-open-factory-reset-modal"
                onClick={() => {
                  setResetConfirmInput("");
                  setResetMsg(null);
                  setShowResetModal(true);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer w-max shrink-0"
              >
                <AlertTriangle className="h-4 w-4" /> Factory Reset Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FACTORY RESET CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                  Confirm Factory Reset
                </h3>
                <span className="text-xs font-bold text-rose-600">Irreversible Action</span>
              </div>
            </div>

            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <p className="font-extrabold text-rose-700 dark:text-rose-300">
                ⚠️ WARNING: THIS WILL ERASE ALL APP DATA
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                <li>All ultrasound scans & measurements</li>
                <li>All medical appointments & due date logs</li>
                <li>All financial transactions & savings funds</li>
                <li>All baby shopping list items & prices</li>
                <li>All hospital bag checklists</li>
                <li>All journal notes, photos & reminders</li>
                <li>All custom created user accounts</li>
                <li>All Supabase cloud database tables</li>
              </ul>
            </div>

            {resetMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                resetMsg.type === "success" 
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30" 
                  : "bg-rose-500/10 text-rose-600 border border-rose-500/30"
              }`}>
                {resetMsg.text}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Type <span className="font-black font-mono text-rose-600">RESET</span> to confirm factory reset:
              </label>
              <input
                id="input-confirm-factory-reset"
                type="text"
                placeholder="Type RESET here"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                id="btn-cancel-factory-reset"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-execute-factory-reset"
                onClick={handleFactoryReset}
                disabled={resetting || resetConfirmInput.trim().toUpperCase() !== "RESET"}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-rose-600/20"
              >
                <RotateCcw className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`} />
                {resetting ? "Resetting Everything..." : "Yes, Factory Reset All Data"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* SQL SCHEMA MODAL DIALOG */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-extrabold text-sm">
                <FileCode className="h-5 w-5 text-teal-500" />
                <span>Supabase SQL Schema Script (`supabase_schema.sql`)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-copy-sql"
                  onClick={copySql}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {copiedSchema ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedSchema ? "Copied!" : "Copy SQL"}
                </button>
                <button
                  id="btn-close-sql-modal"
                  onClick={() => setShowSqlModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed">
              <pre className="whitespace-pre-wrap">{schemaText}</pre>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

