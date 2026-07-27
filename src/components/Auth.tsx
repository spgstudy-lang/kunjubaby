import React, { useState } from "react";
import { api } from "../lib/api";
import { UserProfile } from "../types";
import { Heart, User, Key, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface AuthProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'husband' | 'wife'>('wife');
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Hardcoded admin credentials for instant client-side login
  const ADMIN_EMAIL = "syam@gmail.com";
  const ADMIN_PIN = "225500";
  const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001";
  const ADMIN_PROFILE: UserProfile = {
    id: "00000000-0000-0000-0000-000000000002",
    user_id: ADMIN_USER_ID,
    name: "Syam (Admin)",
    role: "admin",
    email: ADMIN_EMAIL,
    created_at: new Date().toISOString()
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Please fill in both email and password.");
      setLoading(false);
      return;
    }

    // ADMIN INSTANT LOGIN - bypasses API entirely
    if (isLogin && cleanEmail === ADMIN_EMAIL && cleanPassword === ADMIN_PIN) {
      localStorage.setItem("kunju_baby_token", ADMIN_USER_ID);
      localStorage.setItem("authToken", ADMIN_USER_ID);
      setSuccessMsg("Welcome back, Admin!");
      // Also try to notify the server in background (fire-and-forget)
      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      }).catch(() => {});
      setTimeout(() => {
        setLoading(false);
        onAuthSuccess(ADMIN_PROFILE);
      }, 300);
      return;
    }

    // For all other users, call API with a 5-second timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      if (isLogin) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok) {
          if (contentType.includes("application/json")) {
            const errData = await res.json();
            throw new Error(errData.error || "Invalid credentials");
          }
          throw new Error(`Server error (${res.status})`);
        }
        if (!contentType.includes("application/json")) {
          throw new Error("Server returned unexpected response");
        }
        const result = await res.json();
        localStorage.setItem("kunju_baby_token", result.token);
        localStorage.setItem("authToken", result.token);
        onAuthSuccess(result.user);
      } else {
        if (!cleanName) {
          setError("Please enter your name.");
          setLoading(false);
          return;
        }
        const res = await api.signup({ name: cleanName, email: cleanEmail, password: cleanPassword, role });
        setSuccessMsg("Account created! Logging you in...");
        setTimeout(() => {
          onAuthSuccess(res.user);
        }, 1000);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Server is taking too long to respond. Please try again.");
      } else {
        setError(err.message || "Something went wrong. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div id="auth-page" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="bg-emerald-500 p-3 rounded-full shadow-md shadow-emerald-200">
            <Heart className="h-8 w-8 text-white fill-white" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-slate-800 font-sans">
            Kunju Baby's
          </span>
        </div>
        <h2 className="mt-6 text-center text-sm text-slate-500 font-medium tracking-wide uppercase">
          Pregnancy & Family Planning Tracker
        </h2>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 rounded-2xl sm:px-10">
          <div className="flex justify-center mb-6 border-b border-slate-100 pb-4">
            <button
              id="tab-login"
              className={`w-1/2 py-2 text-sm font-semibold border-b-2 transition-all ${
                isLogin
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
            >
              Sign In
            </button>
            <button
              id="tab-signup"
              className={`w-1/2 py-2 text-sm font-semibold border-b-2 transition-all ${
                !isLogin
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => {
                setIsLogin(false);
                setError("");
              }}
            >
              Register
            </button>
          </div>

          <form id="auth-form" className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div id="auth-error" className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-lg flex gap-2 items-center text-rose-700 text-sm">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div id="auth-success" className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-lg flex gap-2 items-center text-emerald-700 text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Full Name
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="input-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 text-sm transition-all"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 text-sm transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  id="input-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-500 text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  What is your role?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    id="role-wife"
                    type="button"
                    onClick={() => setRole("wife")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition-all ${
                      role === "wife"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-500/20"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl mb-1">👩‍🦰</span>
                    Wife (Mother-to-be)
                  </button>
                  <button
                    id="role-husband"
                    type="button"
                    onClick={() => setRole("husband")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition-all ${
                      role === "husband"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-500/20"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xl mb-1">👨</span>
                    Husband (Partner)
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                id="btn-submit-auth"
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Family Account"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              id="btn-toggle-auth-mode"
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccessMsg("");
              }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 cursor-pointer"
            >
              {isLogin
                ? "First time here? Register your family account"
                : "Already have a family account? Sign in"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
