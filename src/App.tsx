import React, { useState, useEffect, useRef } from "react";
import { 
  Scan, 
  Appointment, 
  Finance, 
  ShoppingItem, 
  HospitalBagItem, 
  JournalNote, 
  Reminder, 
  UserProfile,
  ActivityLog,
  GeneralFolder,
  GeneralNote
} from "./types";
import { api } from "./lib/api";

// View Components
import Dashboard from "./components/Dashboard";
import ScanArchive from "./components/ScanArchive";
import AppointmentManager from "./components/AppointmentManager";
import FinancialTracker from "./components/FinancialTracker";
import ShoppingList from "./components/ShoppingList";
import HospitalBag from "./components/HospitalBag";
import RemindersManager from "./components/RemindersManager";
import JournalNotebook from "./components/JournalNotebook";
import GeneralNotes from "./components/GeneralNotes";
import AIAdvisor from "./components/AIAdvisor";
import { BabyGallery } from "./components/BabyGallery";
import Settings from "./components/Settings";
import FloatingCalculator from "./components/FloatingCalculator";
import Auth from "./components/Auth";
import { getCurrencyByCode } from "./lib/currencies";

// Icon Assets
import { 
  Heart, 
  LayoutDashboard, 
  Image as ImageIcon,
  Layers, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  Luggage, 
  Bell, 
  Clock,
  BookOpen, 
  Sparkles, 
  LogOut, 
  User, 
  Menu, 
  X, 
  Sun, 
  Moon,
  Users,
  Activity,
  FolderOpen,
  Settings as SettingsIcon,
  Calculator as CalculatorIcon
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // APP DATA STASH STATE
  const [scans, setScans] = useState<Scan[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [hospitalBag, setHospitalBag] = useState<HospitalBagItem[]>([]);
  const [journalNotes, setJournalNotes] = useState<JournalNote[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // UX STATE
  const [loadingData, setLoadingData] = useState(false);
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("kunju_dark_mode") === "true";
  });
  const [currencyCode, setCurrencyCode] = useState<string>(() => {
    return localStorage.getItem("kunju_currency_code") || "INR";
  });
  const [calcOpen, setCalcOpen] = useState<boolean>(() => {
    return localStorage.getItem("kunju_calc_open") !== "false";
  });

  const [ringingReminder, setRingingReminder] = useState<Reminder | null>(null);
  const [triggeredAlarms, setTriggeredAlarms] = useState<Record<string, string>>({});

  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);

  const currencySymbol = getCurrencyByCode(currencyCode).symbol;

  useEffect(() => {
    localStorage.setItem("kunju_currency_code", currencyCode);
  }, [currencyCode]);

  useEffect(() => {
    localStorage.setItem("kunju_calc_open", String(calcOpen));
  }, [calcOpen]);


  // Load and verify auth token on boot
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("kunju_baby_token");
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch (err) {
          console.error("Token invalid, removing from storage", err);
          api.logout();
        }
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  // Sync data whenever user logs in or views refresh
  const syncData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [
        fetchedScans,
        fetchedAppointments,
        fetchedFinances,
        fetchedShopping,
        fetchedHospital,
        fetchedJournal,
        fetchedReminders,
        fetchedActivities
      ] = await Promise.all([
        api.getScans(),
        api.getAppointments(),
        api.getFinances(),
        api.getShoppingList(),
        api.getHospitalBag(),
        api.getJournal(),
        api.getReminders(),
        api.getActivities()
      ]);

      setScans(fetchedScans);
      setAppointments(fetchedAppointments);
      setFinances(fetchedFinances);
      setShoppingList(fetchedShopping);
      setHospitalBag(fetchedHospital);
      setJournalNotes(fetchedJournal);
      setReminders(fetchedReminders);
      setActivityLogs(fetchedActivities);
    } catch (err) {
      console.error("Failed to load application data stashes", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      syncData();
    }
  }, [user]);

  // Save and apply dark mode class
  useEffect(() => {
    localStorage.setItem("kunju_dark_mode", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // ALARM CLOCK LOGIC & SOUND GENERATOR
  const playAlarmSound = () => {
    try {
      if (alarmIntervalRef.current) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      let isBeep = true;
      alarmIntervalRef.current = setInterval(() => {
        if (!audioCtxRef.current) return;
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }

        if (isBeep) {
          // Play professional dual-frequency high-pitched baby alarm chime
          const osc1 = audioCtxRef.current.createOscillator();
          const osc2 = audioCtxRef.current.createOscillator();
          const gainNode = audioCtxRef.current.createGain();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(880, audioCtxRef.current.currentTime); // A5 note

          osc2.type = "sine";
          osc2.frequency.setValueAtTime(1100, audioCtxRef.current.currentTime); // C#6 harmonious high frequency

          gainNode.gain.setValueAtTime(0.18, audioCtxRef.current.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.35);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(audioCtxRef.current.destination);

          osc1.start();
          osc2.start();
          osc1.stop(audioCtxRef.current.currentTime + 0.4);
          osc2.stop(audioCtxRef.current.currentTime + 0.4);
        }
        isBeep = !isBeep;
      }, 500);
    } catch (e) {
      console.warn("Failed to generate alarm audio chime:", e);
    }
  };

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  const handleDismissAlarm = async () => {
    if (!ringingReminder) return;
    const rem = ringingReminder;
    stopAlarmSound();
    setRingingReminder(null);

    // If it's a one-shot reminder, mark it inactive on backend
    if (rem.frequency === "once") {
      try {
        await api.updateReminder(rem.id, { is_active: false });
        await syncData();
      } catch (err) {
        console.error("Failed to deactivate completed single alarm:", err);
      }
    }
  };

  const handleSnoozeAlarm = () => {
    if (!ringingReminder) return;
    const rem = ringingReminder;
    stopAlarmSound();
    setRingingReminder(null);

    // Temp local snooze: clear triggered flag for this item in 5 minutes so it rings again
    setTimeout(() => {
      setTriggeredAlarms((prev) => {
        const copy = { ...prev };
        delete copy[rem.id];
        return copy;
      });
    }, 5 * 60 * 1000);
  };

  // Alarm clock checker loop (checks once every 15 seconds)
  useEffect(() => {
    if (!user || reminders.length === 0 || ringingReminder) return;

    const checkActiveAlarms = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
      const currentDate = String(now.getDate()).padStart(2, "0");
      const todayDateStr = `${currentYear}-${currentMonth}-${currentDate}`;

      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMins = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMins}`;

      const dayMinuteKey = `${todayDateStr}_${currentTimeStr}`;

      for (const rem of reminders) {
        if (!rem.is_active) continue;

        // Skip if already triggered in this minute
        if (triggeredAlarms[rem.id] === dayMinuteKey) continue;

        // Compare target hours/minutes
        if (rem.reminder_time !== currentTimeStr) continue;

        // Compare target date / recurrence rules
        let isTodayMatch = false;
        if (rem.frequency === "once" && rem.reminder_date === todayDateStr) {
          isTodayMatch = true;
        } else if (rem.frequency === "daily") {
          isTodayMatch = true;
        } else if (rem.frequency === "weekly") {
          const remDayOfWeek = new Date(rem.reminder_date + "T00:00:00").getDay();
          if (remDayOfWeek === now.getDay()) isTodayMatch = true;
        } else if (rem.frequency === "monthly") {
          const remDayOfMonth = new Date(rem.reminder_date + "T00:00:00").getDate();
          if (remDayOfMonth === now.getDate()) isTodayMatch = true;
        }

        if (isTodayMatch) {
          // Play alarm
          setRingingReminder(rem);
          setTriggeredAlarms((prev) => ({
            ...prev,
            [rem.id]: dayMinuteKey,
          }));
          playAlarmSound();
          break; // trigger one at a time
        }
      }
    };

    checkActiveAlarms();
    const interval = setInterval(checkActiveAlarms, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [user, reminders, triggeredAlarms, ringingReminder]);

  // Clean up any ringing sound when app unmounts
  useEffect(() => {
    return () => {
      stopAlarmSound();
    };
  }, []);

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to sign out from the family stashes?")) {
      api.logout();
      setUser(null);
      setActiveView("dashboard");
    }
  };

  // Nav configuration
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "gallery", label: "Baby Gallery", icon: ImageIcon },
    { id: "scans", label: "Baby Scans", icon: Layers },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "finances", label: "Family Finances", icon: DollarSign },
    { id: "shopping", label: "Shopping List", icon: ShoppingBag },
    { id: "hospital-bag", label: "Hospital Bag", icon: Luggage },
    { id: "reminders", label: "Active Alarms", icon: Bell },
    { id: "journal", label: "Family Journal", icon: BookOpen },
    { id: "notes", label: "General Notes", icon: FolderOpen },
    { id: "ai", label: "AI Names & Guide", icon: Sparkles },
    { id: "settings", label: "App Preferences", icon: SettingsIcon },
  ];

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="bg-emerald-500 p-3 rounded-full shadow">
            <Heart className="h-8 w-8 text-white fill-white" />
          </div>
          <span className="text-xl font-bold text-slate-700">Kunju Baby's is waking up...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 relative overflow-hidden ${
      darkMode ? "bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/40 text-slate-100" : "bg-gradient-to-br from-blue-50 via-teal-50 to-pink-50 text-slate-800"
    }`}>
      {/* Visual Decorative Elements */}
      <div className="absolute top-[-100px] left-[200px] w-[300px] h-[300px] bg-teal-200/20 dark:bg-teal-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] right-0 w-[400px] h-[400px] bg-pink-200/20 dark:bg-pink-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
      {/* HEADER NAV FOR MOBILE */}
      <header className={`lg:hidden px-4 py-3 border-b flex justify-between items-center z-30 sticky top-0 backdrop-blur-lg ${
        darkMode ? "bg-slate-900/40 border-slate-800/40" : "bg-white/40 border-white/40 shadow-sm"
      }`}>
        <div className="flex items-center gap-2">
          <button
            id="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            className={`p-1 rounded-lg ${darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 font-sans font-black text-emerald-500 tracking-tight text-sm">
            <Heart className="h-4 w-4 fill-emerald-500" /> Kunju Baby's
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="mobile-calc-toggle"
            onClick={() => setCalcOpen(!calcOpen)}
            className={`p-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 text-xs font-semibold ${
              calcOpen 
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
                : "hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800"
            }`}
            title="Toggle Floating Calculator"
          >
            <CalculatorIcon className="h-4 w-4" />
          </button>
          <button
            id="mobile-dark-toggle"
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 rounded-xl cursor-pointer ${darkMode ? "hover:bg-slate-800 text-amber-400" : "hover:bg-slate-100 text-slate-500"}`}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
            user.role === "wife" 
              ? "bg-pink-50 border-pink-100 text-pink-700" 
              : "bg-blue-50 border-blue-100 text-blue-700"
          }`}>
            {user.role}
          </span>
        </div>
      </header>

      <div className="flex relative z-10">
        {/* MOBILE SIDEBAR OVERLAY DRAWER */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Back backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black z-40 lg:hidden"
              />
              
              {/* Side slide bar */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className={`fixed top-0 bottom-0 left-0 w-64 z-50 flex flex-col justify-between p-5 lg:hidden border-r shadow-2xl backdrop-blur-xl ${
                  darkMode ? "bg-slate-900/40 border-slate-800/40" : "bg-white/40 border-white/40"
                }`}
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-3 border-dashed border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-sans font-black text-teal-800 dark:text-teal-400 tracking-tight text-sm">
                      <Heart className="h-4 w-4 fill-emerald-500 text-teal-500" /> Kunju Baby's
                    </div>
                    <button
                      id="close-sidebar-btn"
                      onClick={() => setSidebarOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Profile info */}
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 backdrop-blur-md ${
                    darkMode ? "bg-slate-800/40 border-slate-700/40" : "bg-white/40 border-white/40 shadow-sm"
                  }`}>
                    <div className="h-9 w-9 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg shadow-teal-500/20">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold block truncate">{user.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold block mt-0.5">{user.role} stashes</span>
                    </div>
                  </div>

                  {/* Navigation list */}
                  <nav className="space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = activeView === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`mob-nav-${item.id}`}
                          onClick={() => {
                            setActiveView(item.id);
                            setSidebarOpen(false);
                          }}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer border ${
                            active 
                              ? "bg-white/60 dark:bg-slate-800/60 text-teal-700 dark:text-teal-400 shadow-sm border-white/50 dark:border-slate-700/50 font-extrabold" 
                              : darkMode 
                                ? "text-slate-400 hover:text-teal-400 hover:bg-slate-800/30 border-transparent" 
                                : "text-slate-600 hover:text-teal-600 hover:bg-white/30 border-transparent"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="space-y-3 pt-4 border-t border-dashed border-slate-100 dark:border-slate-800">
                  <button
                    id="mob-logout-btn"
                    onClick={handleLogout}
                    className="w-full py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out Account
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* DESKTOP PERMANENT LEFT SIDEBAR */}
        <aside className={`hidden lg:flex flex-col justify-between w-64 h-screen p-5 sticky top-0 shrink-0 border-r backdrop-blur-xl z-10 ${
          darkMode ? "bg-slate-950/40 border-slate-800/40" : "bg-white/40 border-white/40"
        }`}>
          <div className="space-y-6">
            <div className="border-b pb-3 border-dashed border-slate-100/50 dark:border-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-2 font-sans font-bold tracking-tight text-teal-800 dark:text-teal-400 text-base">
                <div className="w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
                  <Heart className="h-4.5 w-4.5 text-white fill-white" />
                </div>
                <span>Kunju Baby's</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  id="desktop-calc-toggle"
                  onClick={() => setCalcOpen(!calcOpen)}
                  className={`p-1.5 rounded-xl cursor-pointer transition-all ${
                    calcOpen 
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
                      : "hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800"
                  }`}
                  title="Toggle Floating Calculator ON/OFF"
                >
                  <CalculatorIcon className="h-4 w-4" />
                </button>

                <button
                  id="desktop-dark-toggle"
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-1.5 rounded-xl cursor-pointer ${darkMode ? "hover:bg-slate-800 text-amber-400" : "hover:bg-slate-100 text-slate-500"}`}
                  title="Toggle Dark Mode"
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Couple Profile Banner */}
            <div className={`p-3.5 rounded-2xl border flex items-center gap-3 backdrop-blur-md ${
              darkMode ? "bg-slate-900/40 border-slate-800/40" : "bg-white/40 border-white/40 shadow-sm"
            }`}>
              <div className="h-10 w-10 bg-gradient-to-tr from-teal-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md border-2 border-white/80">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-extrabold block truncate">{user.name}</span>
                <span className={`text-[9px] font-black uppercase tracking-wider block mt-1 px-1.5 py-0.2 rounded-md w-max border ${
                  user.role === "wife" 
                    ? "bg-pink-50 border-pink-100 text-pink-700" 
                    : "bg-blue-50 border-blue-100 text-blue-700"
                }`}>
                  {user.role} (Mother-to-be)
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`desk-nav-${item.id}`}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full py-2 px-3.5 rounded-xl text-xs font-extrabold flex items-center gap-3.5 transition-all cursor-pointer border ${
                      active 
                        ? "bg-white/60 dark:bg-slate-800/60 text-teal-700 dark:text-teal-400 shadow-sm border-white/50 dark:border-slate-700/50" 
                        : darkMode 
                          ? "text-slate-400 hover:text-teal-400 hover:bg-slate-800/30 border-transparent" 
                          : "text-slate-600 hover:text-teal-600 hover:bg-white/30 border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-4 pt-4 border-t border-dashed border-slate-100/50 dark:border-slate-800/50">
            {/* Couple Sync/Share indicator */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold px-2 py-1">
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              <span>Collaborative family stashes</span>
            </div>

            <button
              id="desk-logout-btn"
              onClick={handleLogout}
              className={`w-full py-2 text-rose-500 text-xs font-bold flex items-center justify-center gap-2 rounded-xl transition-all border border-rose-100 hover:bg-rose-50 cursor-pointer ${
                darkMode ? "border-slate-800 hover:bg-rose-950/20" : ""
              }`}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out Account
            </button>
          </div>
        </aside>

        {/* MAIN BODY WRAPPER */}
        <main className="flex-1 w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Synchronizing Data Loader Overlay */}
          {loadingData && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/20 text-emerald-600 text-xs font-semibold px-4 py-2.5 rounded-xl animate-pulse">
              <Activity className="h-4 w-4 animate-spin" /> Synchronizing baby database stashes...
            </div>
          )}

          {/* VIEW SWITCHER ROUTER */}
          <div className="transition-all duration-300">
            {activeView === "dashboard" && (
              <Dashboard 
                user={user}
                onNavigate={(v: string) => setActiveView(v)}
                scans={scans} 
                appointments={appointments} 
                finances={finances} 
                shoppingItems={shoppingList} 
                bagItems={hospitalBag} 
                reminders={reminders}
                activities={activityLogs}
                onRefreshAll={syncData}
                currencySymbol={currencySymbol}
              />
            )}

            {activeView === "gallery" && (
              <BabyGallery
                userProfile={user}
                authToken={localStorage.getItem("kunju_baby_token") || localStorage.getItem("authToken") || user?.user_id}
              />
            )}

            {activeView === "scans" && (
              <ScanArchive 
                scans={scans} 
                onRefresh={syncData} 
              />
            )}

            {activeView === "appointments" && (
              <AppointmentManager 
                appointments={appointments} 
                onRefresh={syncData} 
              />
            )}

            {activeView === "finances" && (
              <FinancialTracker 
                finances={finances} 
                onRefresh={syncData} 
                currencySymbol={currencySymbol}
              />
            )}

            {activeView === "shopping" && (
              <ShoppingList 
                shoppingItems={shoppingList} 
                onRefresh={syncData} 
                currencySymbol={currencySymbol}
              />
            )}

            {activeView === "hospital-bag" && (
              <HospitalBag 
                bagItems={hospitalBag} 
                onRefresh={syncData} 
              />
            )}

            {activeView === "reminders" && (
              <RemindersManager 
                reminders={reminders} 
                onRefresh={syncData} 
              />
            )}

            {activeView === "journal" && (
              <JournalNotebook 
                entries={journalNotes} 
                onRefresh={syncData} 
              />
            )}

            {activeView === "notes" && (
              <GeneralNotes 
                onRefreshAll={syncData} 
              />
            )}

            {activeView === "ai" && (
              <AIAdvisor userProfile={user} scans={scans} />
            )}

            {activeView === "settings" && (
              <Settings
                user={user}
                currentCurrencyCode={currencyCode}
                onCurrencyChange={(code) => setCurrencyCode(code)}
                calcOpen={calcOpen}
                onToggleCalc={() => setCalcOpen(!calcOpen)}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                onRefreshAllData={syncData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating Calculator Overlay */}
      <FloatingCalculator
        isOpen={calcOpen}
        onToggle={() => setCalcOpen(!calcOpen)}
        currencySymbol={currencySymbol}
      />

      {/* PROFESSIONAL SMARTPHONE ALARM RINGING MODAL */}
      <AnimatePresence>
        {ringingReminder && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden relative"
            >
              {/* Pulsing glow background */}
              <div className="absolute inset-0 bg-teal-500/5 animate-pulse pointer-events-none" />
              
              <div className="text-center space-y-6 relative z-10">
                {/* Glowing Animated Alarm Bell */}
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center bg-teal-500/10 rounded-full border border-teal-500/25">
                  <motion.div
                    animate={{ rotate: [-10, 10, -10, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                  >
                    <Bell className="h-10 w-10 text-teal-600 dark:text-teal-400 fill-teal-500/10" />
                  </motion.div>
                  {/* Ripple rings */}
                  <span className="absolute inset-0 border border-teal-500/30 rounded-full animate-ping opacity-75" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 px-3 py-1 rounded-full uppercase tracking-wider">
                    ⏰ Live Active Alarm
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                    {ringingReminder.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {ringingReminder.description || "Take action for your baby stash schedule!"}
                  </p>
                </div>

                {/* Alarm Time display */}
                <div className="bg-slate-50 dark:bg-slate-850 py-3.5 px-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 text-teal-500" />
                  <span className="text-lg font-black tracking-wider text-slate-700 dark:text-slate-300">
                    {ringingReminder.reminder_time}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2.5">
                  <button
                    id="alarm-dismiss-btn"
                    onClick={handleDismissAlarm}
                    className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-teal-500/15 cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    Dismiss Alarm
                  </button>
                  <button
                    id="alarm-snooze-btn"
                    onClick={handleSnoozeAlarm}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-2xl cursor-pointer transition-colors"
                  >
                    Snooze 5 Minutes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
