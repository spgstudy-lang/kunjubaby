import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { UserProfile, Scan, Appointment, Finance, ShoppingItem, HospitalBagItem, Reminder, ActivityLog } from "../types";
import { 
  Baby, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  ClipboardList, 
  Plus, 
  BookOpen, 
  Bell, 
  TrendingUp, 
  RefreshCw, 
  Activity, 
  Heart, 
  ArrowRight,
  Clock,
  Image as ImageIcon
} from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  user: UserProfile;
  onNavigate: (tab: string) => void;
  scans: Scan[];
  appointments: Appointment[];
  finances: Finance[];
  shoppingItems: ShoppingItem[];
  bagItems: HospitalBagItem[];
  reminders: Reminder[];
  activities: ActivityLog[];
  onRefreshAll: () => Promise<void>;
  currencySymbol?: string;
}

export default function Dashboard({
  user,
  onNavigate,
  scans,
  appointments,
  finances,
  shoppingItems,
  bagItems,
  reminders,
  activities,
  onRefreshAll,
  currencySymbol = "₹"
}: DashboardProps) {
  // Local state for LMP to calculate dynamic gestational age
  const [lmp, setLmp] = useState<string>(() => {
    return localStorage.getItem(`kunju_baby_lmp_${user.user_id}`) || "";
  });
  const [isLmpEditing, setIsLmpEditing] = useState(false);
  const [tempLmp, setTempLmp] = useState(lmp);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pregnancy calculations based on LMP
  const calculatePregnancyStats = () => {
    if (!lmp) {
      // Fallback to latest scan data if available, else standard placeholders
      if (scans.length > 0) {
        const latestScan = scans[0]; // scans are sorted latest first
        const scanDate = new Date(latestScan.scan_date);
        const today = new Date();
        const diffTime = today.getTime() - scanDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const totalScanDays = (latestScan.weeks * 7) + latestScan.days + diffDays;
        const currentWeeks = Math.floor(totalScanDays / 7);
        const currentDays = totalScanDays % 7;
        
        // Calculate due date
        let dueDate: Date;
        if (latestScan.estimated_due_date) {
          dueDate = new Date(latestScan.estimated_due_date);
        } else {
          // Standard is 40 weeks (280 days) from LMP. If they were X weeks at scan, remaining is 280 - totalScanDays
          const lmpApprox = new Date(scanDate.getTime() - ((latestScan.weeks * 7) + latestScan.days) * 24 * 60 * 60 * 1000);
          dueDate = new Date(lmpApprox.getTime() + 280 * 24 * 60 * 60 * 1000);
        }
        
        const daysRemaining = Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          weeks: currentWeeks,
          days: currentDays,
          daysRemaining,
          dueDate: dueDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
          source: "latest_scan"
        };
      }
      return null;
    }

    const lmpDate = new Date(lmp);
    const today = new Date();
    const diffTime = today.getTime() - lmpDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;

    // 280 days from LMP is Estimated Due Date (EDD)
    const dueDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      weeks,
      days,
      daysRemaining,
      dueDate: dueDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
      source: "lmp"
    };
  };

  const handleSaveLmp = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(`kunju_baby_lmp_${user.user_id}`, tempLmp);
    setLmp(tempLmp);
    setIsLmpEditing(false);
  };

  const stats = calculatePregnancyStats();

  // Financial Stats
  const calculateFinancialStats = () => {
    let totalSavings = 0;
    let husbandTotal = 0;
    let wifeTotal = 0;

    finances.forEach((f) => {
      if (f.category === "savings") {
        totalSavings += f.amount;
        if (f.contributed_by === "husband") husbandTotal += f.amount;
        else if (f.contributed_by === "wife") wifeTotal += f.amount;
        else {
          husbandTotal += f.amount / 2;
          wifeTotal += f.amount / 2;
        }
      } else {
        // Purchases/Medical Expenses reduce savings if they came out of budget
        totalSavings -= f.amount;
      }
    });

    return {
      totalSavings,
      husbandTotal,
      wifeTotal
    };
  };

  const finStats = calculateFinancialStats();

  // Shopping Stats
  const totalShoppingItems = shoppingItems.length;
  const purchasedShoppingItems = shoppingItems.filter((s) => s.purchased).length;
  const shoppingProgress = totalShoppingItems > 0 ? Math.round((purchasedShoppingItems / totalShoppingItems) * 100) : 0;

  // Hospital Bag Stats
  const totalBagItems = bagItems.length;
  const packedBagItems = bagItems.filter((b) => b.is_packed).length;
  const bagProgress = totalBagItems > 0 ? Math.round((packedBagItems / totalBagItems) * 100) : 0;

  // Upcoming appointments (next 7 days)
  const getUpcomingAppointments = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return appointments.filter((appt) => {
      const apptDate = new Date(appt.appointment_date);
      return apptDate >= today && apptDate <= nextWeek && appt.status === "scheduled";
    });
  };

  const upcomingAppts = getUpcomingAppointments();

  // Today's active reminders
  const getTodaysReminders = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    return reminders.filter((rem) => rem.reminder_date === todayStr && rem.is_active);
  };

  const todaysReminders = getTodaysReminders();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshAll();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
              Kunju Baby's Family Hub
            </h1>
            <span className="animate-pulse bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Live Tracker
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-300">{user.name}</span> (
            {user.role === "husband" ? "👨 Husband / Partner" : "👩‍🦰 Wife / Mother-to-be"}
            ). Keep track of your pregnancy milestones together!
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-refresh-dashboard"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white/20 border border-white/30 dark:border-slate-800/30 rounded-xl backdrop-blur-md transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            id="btn-set-lmp"
            onClick={() => {
              setTempLmp(lmp);
              setIsLmpEditing(!isLmpEditing);
            }}
            className="px-4 py-2 text-sm font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 bg-white/40 dark:bg-slate-850/40 backdrop-blur-md border border-white/40 dark:border-slate-700/40 rounded-xl transition-all cursor-pointer"
          >
            {lmp ? "Update LMP Date" : "Set LMP (Last Period)"}
          </button>
        </div>
      </div>

      {/* LMP Setting Form (Expandable) */}
      {isLmpEditing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass-panel p-6 rounded-3xl"
        >
          <form onSubmit={handleSaveLmp} className="flex flex-col sm:flex-row items-end gap-4 max-w-lg">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Last Menstrual Period (LMP) Date
              </label>
              <input
                id="input-lmp-date"
                type="date"
                required
                value={tempLmp}
                onChange={(e) => setTempLmp(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>
            <div className="flex gap-2">
              <button
                id="btn-save-lmp"
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-lg transition-all cursor-pointer"
              >
                Save
              </button>
              <button
                id="btn-cancel-lmp"
                type="button"
                onClick={() => setIsLmpEditing(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
          <p className="text-xs text-slate-400 mt-2">
            Providing your Last Menstrual Period date allows the app to dynamically calculate your baby's gestational age (weeks and days) and estimated due date.
          </p>
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pregnancy Week Card */}
          <div className="bg-gradient-to-br from-teal-500/85 to-emerald-600/85 backdrop-blur-lg border border-white/20 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
            {/* Ambient Background Circle */}
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                  <Baby className="h-3.5 w-3.5 fill-white" /> Gestational Age
                </div>
                {stats ? (
                  <div>
                    <h2 className="text-4xl font-black font-sans leading-none">
                      {stats.weeks} Weeks, {stats.days} Days
                    </h2>
                    <p className="text-emerald-50 mt-1 font-medium">
                      Estimated Due Date: <span className="font-bold underline underline-offset-4">{stats.dueDate}</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-black font-sans">Gestational age not set</h2>
                    <p className="text-emerald-50 mt-1 text-sm">
                      Set your LMP above or log a scan to calculate your baby's age.
                    </p>
                  </div>
                )}
              </div>
              
              {stats && (
                <div className="shrink-0 bg-white/15 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/15 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold">{stats.daysRemaining}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Days to Due Date</span>
                </div>
              )}
            </div>

            {stats && stats.weeks > 0 && (
              <div className="mt-6 pt-5 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍉</span>
                  <span>
                    Baby size is roughly like a <span className="font-semibold text-emerald-100">Week {stats.weeks} fetal size</span>.
                  </span>
                </div>
                <button
                  id="btn-navigate-ai-advisor"
                  onClick={() => onNavigate("ai")}
                  className="inline-flex items-center gap-1.5 font-bold hover:underline group cursor-pointer"
                >
                  View AI Development Insights
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Actions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <button
              id="btn-quick-gallery"
              onClick={() => onNavigate("gallery")}
              className="glass-panel p-4 rounded-3xl hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl mb-2.5 group-hover:scale-110 transition-transform">
                <ImageIcon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Baby Gallery</span>
            </button>

            <button
              id="btn-quick-scan"
              onClick={() => onNavigate("scans")}
              className="glass-panel p-4 rounded-3xl hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl mb-2.5 group-hover:scale-110 transition-transform">
                <Baby className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Add Scan</span>
            </button>

            <button
              id="btn-quick-appt"
              onClick={() => onNavigate("appointments")}
              className="glass-panel p-4 rounded-3xl hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl mb-2.5 group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Appointments</span>
            </button>

            <button
              id="btn-quick-finance"
              onClick={() => onNavigate("finances")}
              className="glass-panel p-4 rounded-3xl hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
            >
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl mb-2.5 group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Log Finance</span>
            </button>

            <button
              id="btn-quick-journal"
              onClick={() => onNavigate("journal")}
              className="glass-panel p-4 rounded-3xl hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center text-center group cursor-pointer col-span-2 sm:col-span-1"
            >
              <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl mb-2.5 group-hover:scale-110 transition-transform">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Write Journal</span>
            </button>
          </div>

          {/* Quick Metrics Progress Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Shopping Progress */}
            <div className="glass-panel p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-sky-500/10 text-sky-500 p-2 rounded-xl">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Shopping Progress</span>
                </div>
                <span className="text-sm font-black text-sky-600 dark:text-sky-400">{shoppingProgress}%</span>
              </div>
              <div className="w-full bg-slate-100/50 dark:bg-slate-800/50 rounded-full h-2">
                <div 
                  className="bg-sky-500 h-2 rounded-full transition-all duration-500 shadow-sm" 
                  style={{ width: `${shoppingProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>{purchasedShoppingItems} of {totalShoppingItems} purchased</span>
                <button
                  id="btn-nav-shopping-dash"
                  onClick={() => onNavigate("shopping")}
                  className="font-bold hover:underline text-teal-600 dark:text-teal-400"
                >
                  Manage items
                </button>
              </div>
            </div>

            {/* Hospital Bag Progress */}
            <div className="glass-panel p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-rose-500/10 text-rose-500 p-2 rounded-xl">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Hospital Bag Packed</span>
                </div>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">{bagProgress}%</span>
              </div>
              <div className="w-full bg-slate-100/50 dark:bg-slate-800/50 rounded-full h-2">
                <div 
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500 shadow-sm" 
                  style={{ width: `${bagProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>{packedBagItems} of {totalBagItems} packed</span>
                <button
                  id="btn-nav-hospital-bag-dash"
                  onClick={() => onNavigate("hospital-bag")}
                  className="font-bold hover:underline text-rose-600 dark:text-rose-400"
                >
                  Pack items
                </button>
              </div>
            </div>
          </div>

          {/* Savings Summary Widget */}
          <div className="glass-panel p-5 rounded-3xl">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-500" /> Financial Savings Snapshot
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/30 dark:bg-slate-900/30 p-3 rounded-2xl border border-white/40 dark:border-slate-800/40">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Total Savings</span>
                <span className={`text-lg font-extrabold ${finStats.totalSavings >= 0 ? "text-slate-800 dark:text-slate-100" : "text-rose-600"}`}>
                  {currencySymbol}{finStats.totalSavings.toFixed(2)}
                </span>
              </div>
              <div className="bg-white/30 dark:bg-slate-900/30 p-3 rounded-2xl border border-white/40 dark:border-slate-800/40">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Husband Saved</span>
                <span className="text-lg font-extrabold text-slate-700 dark:text-slate-300">
                  {currencySymbol}{finStats.husbandTotal.toFixed(2)}
                </span>
              </div>
              <div className="bg-white/30 dark:bg-slate-900/30 p-3 rounded-2xl border border-white/40 dark:border-slate-800/40">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Wife Saved</span>
                <span className="text-lg font-extrabold text-slate-700 dark:text-slate-300">
                  {currencySymbol}{finStats.wifeTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          {/* Today's Reminders */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-white/20 dark:border-slate-800/30 pb-3">
              <Bell className="h-4 w-4 text-amber-500" /> Today's Reminders
            </h3>
            {todaysReminders.length > 0 ? (
              <div className="space-y-2">
                {todaysReminders.map((rem) => (
                  <div key={rem.id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">{rem.title}</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{rem.description}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-white/40 dark:bg-slate-800/40 border border-amber-100/20 px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {rem.reminder_time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                🎉 No active reminders for today!
              </div>
            )}
            <button
              id="btn-navigate-reminders"
              onClick={() => onNavigate("reminders")}
              className="w-full text-center py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 border border-white/50 dark:border-slate-700/50 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              Configure Reminders
            </button>
          </div>

          {/* Upcoming Appointments (Next 7 Days) */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-white/20 dark:border-slate-800/30 pb-3">
              <Calendar className="h-4 w-4 text-purple-500" /> Upcoming (7 Days)
            </h3>
            {upcomingAppts.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppts.map((appt) => (
                  <div key={appt.id} className="p-3 border border-white/30 dark:border-slate-800/30 rounded-2xl hover:border-purple-200 transition-all bg-white/20 dark:bg-slate-900/10">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{appt.appointment_type.toUpperCase()}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/15">
                        Scheduled
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-1 mt-1.5">
                      <p>📅 {new Date(appt.appointment_date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      <p>📍 {appt.hospital_name || appt.location || "Not Specified"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                🗓️ No appointments scheduled in the next 7 days.
              </div>
            )}
            <button
              id="btn-navigate-appointments"
              onClick={() => onNavigate("appointments")}
              className="w-full text-center py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 border border-white/50 dark:border-slate-700/50 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              Schedule Appointment
            </button>
          </div>

          {/* Recent Activity Feed */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-white/20 dark:border-slate-800/30 pb-3">
              <Activity className="h-4 w-4 text-emerald-500" /> Family Activity Log
            </h3>
            {activities.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {activities.slice(0, 5).map((log) => (
                  <div key={log.id} className="text-xs border-b border-white/20 dark:border-slate-800/20 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-500">
                        {log.user_role === "wife" ? "👩‍🦰" : "👨"} {log.user_name}
                      </span>
                      <span>{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">{log.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                🌾 No recent family activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
