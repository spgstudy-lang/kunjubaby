import React, { useState, useMemo } from "react";
import { Reminder } from "../types";
import { api } from "../lib/api";
import { 
  Bell, 
  Trash2, 
  Edit3, 
  Plus, 
  Clock, 
  Calendar, 
  CheckCircle, 
  X, 
  AlertCircle,
  TrendingUp,
  Tag,
  Coffee,
  Heart,
  Droplet
} from "lucide-react";
import { motion } from "motion/react";

interface RemindersManagerProps {
  reminders: Reminder[];
  onRefresh: () => Promise<void>;
}

export default function RemindersManager({ reminders, onRefresh }: RemindersManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remDate, setRemDate] = useState("");
  const [remTime, setRemTime] = useState("");
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [reminderType, setReminderType] = useState<'appointment' | 'scan' | 'checkup' | 'purchase' | 'custom' | 'medication' | 'supplement'>('medication');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Category Icon & Color selector based on reminder_type
  const getCatDetails = (cat: string) => {
    switch (cat) {
      case "medication":
        return { label: "Pills / Medication", icon: Heart, color: "text-rose-600 bg-rose-50 border-rose-100" };
      case "supplement":
        return { label: "Prenatal Supplements", icon: Droplet, color: "text-blue-600 bg-blue-50 border-blue-100" };
      case "appointment":
      case "checkup":
        return { label: "Clinic Visit Checkup", icon: Calendar, color: "text-purple-600 bg-purple-50 border-purple-100" };
      case "scan":
        return { label: "Ultrasound Scan", icon: Coffee, color: "text-amber-600 bg-amber-50 border-amber-100" };
      case "purchase":
        return { label: "Family Shopping", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
      default:
        return { label: "General Reminder", icon: Bell, color: "text-slate-600 bg-slate-50 border-slate-100" };
    }
  };

  // Submit reminder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      title,
      description,
      reminder_date: remDate,
      reminder_time: remTime,
      frequency,
      reminder_type: reminderType,
      is_active: isActive
    };

    try {
      if (editingReminder) {
        await api.updateReminder(editingReminder.id, payload);
      } else {
        await api.createReminder(payload);
      }
      await onRefresh();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save reminder.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rem: Reminder) => {
    setEditingReminder(rem);
    setTitle(rem.title);
    setDescription(rem.description || "");
    setRemDate(rem.reminder_date);
    setRemTime(rem.reminder_time);
    setFrequency(rem.frequency);
    setReminderType(rem.reminder_type || "medication");
    setIsActive(rem.is_active);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await api.deleteReminder(id);
      await onRefresh();
    } catch (err: any) {
      alert("Failed to delete reminder: " + err.message);
    }
  };

  // Toggle active/inactive status
  const handleToggleActive = async (rem: Reminder) => {
    try {
      await api.updateReminder(rem.id, { is_active: !rem.is_active });
      await onRefresh();
    } catch (err: any) {
      alert("Failed to toggle alarm active status: " + err.message);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingReminder(null);
    setTitle("");
    setDescription("");
    setRemDate("");
    setRemTime("");
    setFrequency("once");
    setReminderType("medication");
    setIsActive(true);
    setError("");
  };

  // Group reminders into Today, Upcoming, and Expired (Inactive)
  const groupedReminders = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayList: Reminder[] = [];
    const upcomingList: Reminder[] = [];
    const inactiveList: Reminder[] = [];

    reminders.forEach((rem) => {
      if (!rem.is_active) {
        inactiveList.push(rem);
      } else if (rem.reminder_date === todayStr || rem.frequency === "daily") {
        todayList.push(rem);
      } else if (rem.reminder_date > todayStr || rem.frequency === "weekly" || rem.frequency === "monthly") {
        upcomingList.push(rem);
      } else {
        // Expired once-off active
        inactiveList.push(rem);
      }
    });

    // Sort chronologically
    const sortTime = (a: Reminder, b: Reminder) => a.reminder_time.localeCompare(b.reminder_time);
    todayList.sort(sortTime);
    upcomingList.sort((a, b) => {
      const d = a.reminder_date.localeCompare(b.reminder_date);
      return d !== 0 ? d : sortTime(a, b);
    });

    return {
      today: todayList,
      upcoming: upcomingList,
      inactive: inactiveList
    };
  }, [reminders]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Family Alarms & Reminders Manager
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Setup medical alarms, hydration timers, vitamins reminders, and midwife meeting alarms. Sync alerts with your partner.
          </p>
        </div>

        {!isAdding && (
          <button
            id="btn-add-reminder"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-650 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Setup Alarm
          </button>
        )}
      </div>

      {/* Adding/Editing Form View */}
      {isAdding ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-3xl"
        >
          <div className="flex justify-between items-center border-b border-white/20 dark:border-slate-800/30 pb-3 mb-5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              {editingReminder ? "Edit Reminder Settings" : "Configure Family Alarm / Pill Reminder"}
            </h2>
            <button
              id="btn-close-rem-form"
              onClick={resetForm}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form id="reminder-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Reminder / Pill Name
                </label>
                <input
                  id="input-rem-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Folic Acid vitamins, Water hydration, Call midwife clinic"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alarm Category
                  </label>
                  <select
                    id="select-rem-type"
                    value={reminderType}
                    onChange={(e) => setReminderType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                  >
                    <option value="medication">💊 Medication / Pills</option>
                    <option value="supplement">🍼 Prenatal Vitamins</option>
                    <option value="appointment">🩺 Clinic Checkups</option>
                    <option value="scan">🤰 Ultrasound Scan</option>
                    <option value="purchase">🛒 Baby Purchases</option>
                    <option value="custom">🔔 Custom Alarm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Frequency
                  </label>
                  <select
                    id="select-rem-frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily / Every Day</option>
                    <option value="weekly">Weekly / Once a Week</option>
                    <option value="monthly">Monthly / Once a Month</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Calendar Date
                  </label>
                  <input
                    id="input-rem-date"
                    type="date"
                    required
                    value={remDate}
                    onChange={(e) => setRemDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alarm Clock Time
                  </label>
                  <input
                    id="input-rem-time"
                    type="time"
                    required
                    value={remTime}
                    onChange={(e) => setRemTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Instruction / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="input-rem-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Take after dinner with dynamic fruit juices..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/20 dark:bg-slate-900/20 p-3 rounded-xl border border-white/30 dark:border-slate-800/20 w-max">
              <input
                id="checkbox-rem-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-teal-500 focus:ring-teal-400/20 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable alarm right now?</span>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/20 dark:border-slate-800/30">
              <button
                id="btn-save-reminder"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : editingReminder ? "Update Alarm Setting" : "Publish Active Alarm"}
              </button>
              <button
                id="btn-cancel-reminder"
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        /* Reminders display stashes */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TODAY ALARMS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-white/20 dark:border-slate-800/30 pb-2">
              <Clock className="h-4 w-4 text-teal-500" /> Today's Active Alarms ({groupedReminders.today.length})
            </h3>

            {groupedReminders.today.length > 0 ? (
              <div className="space-y-3">
                {groupedReminders.today.map((rem) => {
                  const details = getCatDetails(rem.reminder_type);
                  const Icon = details.icon;

                  return (
                    <div 
                      key={rem.id} 
                      className={`p-4 rounded-2xl transition-all space-y-3 glass-panel ${
                        rem.is_active ? "hover:scale-[1.01]" : "opacity-60"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-lg border backdrop-blur-md ${details.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className={`font-bold text-xs ${rem.is_active ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-550 line-through"}`}>
                            {rem.title}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-75">
                          <input 
                            id={`toggle-item-rem-${rem.id}`}
                            type="checkbox" 
                            checked={rem.is_active} 
                            onChange={() => handleToggleActive(rem)}
                            className="sr-only peer" 
                          />
                          <div className="w-8 h-4 bg-slate-250/50 dark:bg-slate-800/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                      </div>

                      {rem.description && (
                        <p className="text-[11px] text-slate-650 dark:text-slate-400 italic">"{rem.description}"</p>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-white/15 dark:border-slate-800/15">
                        <span className="font-bold flex items-center gap-0.5">
                          ⏰ {rem.reminder_time}
                        </span>
                        <span className="uppercase font-bold tracking-wide text-slate-450">
                          {rem.frequency === "once" ? "Once" : `${rem.frequency}`}
                        </span>
                      </div>

                      <div className="flex justify-end gap-2 pt-1 text-[11px] font-bold">
                        <button
                          id={`btn-edit-rem-today-${rem.id}`}
                          onClick={() => handleEdit(rem)}
                          className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <span className="text-slate-200 dark:text-slate-700">|</span>
                        <button
                          id={`btn-delete-rem-today-${rem.id}`}
                          onClick={() => handleDelete(rem.id)}
                          className="text-rose-500 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 glass-panel border-dashed rounded-2xl text-xs text-slate-400 space-y-2">
                <Bell className="h-6 w-6 mx-auto text-slate-300" />
                <span>No alarms scheduled for today.</span>
              </div>
            )}
          </div>

          {/* UPCOMING ALARMS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-white/20 dark:border-slate-800/30 pb-2">
              <Calendar className="h-4 w-4 text-blue-500" /> Upcoming Reminders ({groupedReminders.upcoming.length})
            </h3>

            {groupedReminders.upcoming.length > 0 ? (
              <div className="space-y-3">
                {groupedReminders.upcoming.map((rem) => {
                  const details = getCatDetails(rem.reminder_type);
                  const Icon = details.icon;

                  return (
                    <div 
                      key={rem.id} 
                      className={`p-4 rounded-2xl transition-all space-y-3 glass-panel ${
                        rem.is_active ? "hover:scale-[1.01]" : "opacity-60"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-lg border backdrop-blur-md ${details.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className={`font-bold text-xs ${rem.is_active ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-550 line-through"}`}>
                            {rem.title}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-75">
                          <input 
                            id={`toggle-item-rem-up-${rem.id}`}
                            type="checkbox" 
                            checked={rem.is_active} 
                            onChange={() => handleToggleActive(rem)}
                            className="sr-only peer" 
                          />
                          <div className="w-8 h-4 bg-slate-250/50 dark:bg-slate-800/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                      </div>

                      {rem.description && (
                        <p className="text-[11px] text-slate-650 dark:text-slate-400 italic">"{rem.description}"</p>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-white/15 dark:border-slate-800/15">
                        <span className="font-bold flex items-center gap-0.5">
                          📅 {new Date(rem.reminder_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {rem.reminder_time}
                        </span>
                        <span className="uppercase font-bold tracking-wide text-slate-450">
                          {rem.frequency}
                        </span>
                      </div>

                      <div className="flex justify-end gap-2 pt-1 text-[11px] font-bold">
                        <button
                          id={`btn-edit-rem-upcoming-${rem.id}`}
                          onClick={() => handleEdit(rem)}
                          className="text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <span className="text-slate-200 dark:text-slate-700">|</span>
                        <button
                          id={`btn-delete-rem-upcoming-${rem.id}`}
                          onClick={() => handleDelete(rem.id)}
                          className="text-rose-500 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 glass-panel border-dashed rounded-2xl text-xs text-slate-400 space-y-2">
                <Calendar className="h-6 w-6 mx-auto text-slate-300" />
                <span>No upcoming calendar alerts.</span>
              </div>
            )}
          </div>

          {/* INACTIVE / SILENCED ALARMS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-white/20 dark:border-slate-800/30 pb-2">
              <AlertCircle className="h-4 w-4 text-slate-450" /> Silenced / Expired Alarms ({groupedReminders.inactive.length})
            </h3>

            {groupedReminders.inactive.length > 0 ? (
              <div className="space-y-3">
                {groupedReminders.inactive.map((rem) => {
                  const details = getCatDetails(rem.reminder_type);
                  const Icon = details.icon;

                  return (
                    <div 
                      key={rem.id} 
                      className="p-4 rounded-2xl border border-white/10 dark:border-slate-800/10 transition-all space-y-3 glass-panel opacity-60"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-lg border backdrop-blur-md ${details.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-bold text-xs text-slate-450 dark:text-slate-550 line-through">
                            {rem.title}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-75">
                          <input 
                            id={`toggle-item-rem-in-${rem.id}`}
                            type="checkbox" 
                            checked={rem.is_active} 
                            onChange={() => handleToggleActive(rem)}
                            className="sr-only peer" 
                          />
                          <div className="w-8 h-4 bg-slate-250/50 dark:bg-slate-800/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                      </div>

                      {rem.description && (
                        <p className="text-[11px] text-slate-450 dark:text-slate-500 italic">"{rem.description}"</p>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-white/15 dark:border-slate-800/15">
                        <span className="font-semibold flex items-center gap-0.5 text-slate-450">
                          📅 {new Date(rem.reminder_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {rem.reminder_time}
                        </span>
                        <span className="uppercase font-bold tracking-wide text-slate-450">
                          Inactive
                        </span>
                      </div>

                      <div className="flex justify-end gap-2 pt-1 text-[11px] font-semibold">
                        <button
                          id={`btn-edit-rem-inactive-${rem.id}`}
                          onClick={() => handleEdit(rem)}
                          className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <span className="text-slate-200 dark:text-slate-700">|</span>
                        <button
                          id={`btn-delete-rem-inactive-${rem.id}`}
                          onClick={() => handleDelete(rem.id)}
                          className="text-rose-550 hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 glass-panel border-dashed rounded-2xl text-xs text-slate-400 space-y-2">
                <AlertCircle className="h-6 w-6 mx-auto text-slate-300" />
                <span>No silenced alarms found.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
