import React, { useState, useMemo } from "react";
import { Appointment } from "../types";
import { api } from "../lib/api";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  User, 
  Hospital, 
  Clock, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  FileText,
  X
} from "lucide-react";
import { motion } from "motion/react";

interface AppointmentManagerProps {
  appointments: Appointment[];
  onRefresh: () => Promise<void>;
}

export default function AppointmentManager({ appointments, onRefresh }: AppointmentManagerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isAdding, setIsAdding] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  // Form states
  const [apptType, setApptType] = useState<'midwife' | 'ultrasound' | 'scan' | 'checkup' | 'other'>('midwife');
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [location, setLocation] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(1);
  const [status, setStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Calendar navigation states
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper: color-code by appointment type
  const getTypeColor = (type: string) => {
    switch (type) {
      case "midwife": return "bg-teal-500/10 dark:bg-teal-500/15 border-teal-500/30 text-teal-700 dark:text-teal-400 hover:border-teal-400/40";
      case "ultrasound": return "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400 hover:border-blue-400/40";
      case "scan": return "bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-400 hover:border-sky-400/40";
      case "checkup": return "bg-purple-500/10 dark:bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-400 hover:border-purple-400/40";
      default: return "bg-white/10 dark:bg-slate-800/15 border-white/15 dark:border-slate-800/25 text-slate-700 dark:text-slate-300 hover:border-slate-400/40";
    }
  };

  const getTypeIndicator = (type: string) => {
    switch (type) {
      case "midwife": return "bg-teal-500";
      case "ultrasound": return "bg-blue-500";
      case "scan": return "bg-sky-500";
      case "checkup": return "bg-purple-500";
      default: return "bg-slate-500";
    }
  };

  // Submit appointment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fullIsoDate = new Date(`${apptDate}T${apptTime}`).toISOString();

    const payload = {
      appointment_type: apptType,
      appointment_date: fullIsoDate,
      hospital_name: hospitalName,
      location,
      healthcare_provider: provider,
      notes,
      reminder_enabled: reminderEnabled,
      reminder_days_before: reminderDays,
      status
    };

    try {
      if (editingAppt) {
        await api.updateAppointment(editingAppt.id, payload);
      } else {
        await api.createAppointment(payload);
      }
      await onRefresh();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to schedule appointment.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    setApptType(appt.appointment_type);
    
    const d = new Date(appt.appointment_date);
    const dateStr = d.toISOString().split("T")[0];
    const timeStr = d.toTimeString().split(" ")[0].substring(0, 5);
    
    setApptDate(dateStr);
    setApptTime(timeStr);
    setHospitalName(appt.hospital_name || "");
    setLocation(appt.location || "");
    setProvider(appt.healthcare_provider || "");
    setNotes(appt.notes || "");
    setReminderEnabled(appt.reminder_enabled);
    setReminderDays(appt.reminder_days_before || 1);
    setStatus(appt.status);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return;
    try {
      await api.deleteAppointment(id);
      await onRefresh();
    } catch (err: any) {
      alert("Failed to delete appointment: " + err.message);
    }
  };

  const handleToggleCompleted = async (appt: Appointment) => {
    const newStatus = appt.status === "completed" ? "scheduled" : "completed";
    try {
      await api.updateAppointment(appt.id, { status: newStatus });
      await onRefresh();
    } catch (err: any) {
      alert("Failed to update status");
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingAppt(null);
    setApptType("midwife");
    setApptDate("");
    setApptTime("");
    setHospitalName("");
    setLocation("");
    setProvider("");
    setNotes("");
    setReminderEnabled(true);
    setReminderDays(1);
    setStatus("scheduled");
    setError("");
  };

  // Calendar days grid generation
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const daysArray: { day: number; isCurrentMonth: boolean; dateString: string }[] = [];

    // Fill preceding month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateString = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      daysArray.push({ day: d, isCurrentMonth: false, dateString });
    }

    // Fill current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      daysArray.push({ day: i, isCurrentMonth: true, dateString });
    }

    // Fill succeeding month days
    const remainingSlots = 42 - daysArray.length; // 6 rows of 7 days
    for (let i = 1; i <= remainingSlots; i++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateString = `${y}-${String(m + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      daysArray.push({ day: i, isCurrentMonth: false, dateString });
    }

    return daysArray;
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCalendarDayClick = (dateStr: string) => {
    setApptDate(dateStr);
    setApptTime("09:00");
    setIsAdding(true);
  };

  // Group appointments by date for the calendar
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      const d = new Date(appt.appointment_date);
      const dateStr = d.toISOString().split("T")[0];
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(appt);
    });
    return map;
  }, [appointments]);

  // Split appointments into upcoming and past
  const splitAppointments = useMemo(() => {
    const today = new Date();
    const upcoming: Appointment[] = [];
    const completedOrPast: Appointment[] = [];

    appointments.forEach((appt) => {
      const apptDate = new Date(appt.appointment_date);
      if (appt.status === "completed" || appt.status === "cancelled" || apptDate < today) {
        completedOrPast.push(appt);
      } else {
        upcoming.push(appt);
      }
    });

    // Sort upcoming ascending (closest first)
    upcoming.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
    // Sort past descending (newest first)
    completedOrPast.sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

    return { upcoming, completedOrPast };
  }, [appointments]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Midwife & Healthcare Appointments
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Keep track of clinic visits, midwife checkups, scan sessions, and add notes or results from appointments.
          </p>
        </div>

        {!isAdding && (
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="bg-white/10 dark:bg-slate-800/30 p-1 rounded-xl flex">
              <button
                id="btn-view-list"
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "list" 
                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm" 
                    : "text-slate-450 hover:text-slate-755 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                List View
              </button>
              <button
                id="btn-view-calendar"
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "calendar" 
                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm" 
                    : "text-slate-455 hover:text-slate-755 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Calendar
              </button>
            </div>

            <button
              id="btn-add-appt"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" /> Book Clinic Visit
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Form OR Dashboard */}
      {isAdding ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-2xl"
        >
          <div className="flex justify-between items-center border-b border-white/20 dark:border-slate-800/30 pb-3 mb-5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              {editingAppt ? "Edit Appointment Visit" : "Schedule Clinic Visit / Midwife Appt"}
            </h2>
            <button
              id="btn-close-appt-form"
              onClick={resetForm}
              className="p-1.5 hover:bg-white/20 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form id="appt-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-500/15 border-l-4 border-rose-500 p-3 rounded text-rose-700 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Appointment Type
                </label>
                <select
                  id="select-appt-type"
                  value={apptType}
                  onChange={(e) => setApptType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                >
                  <option value="midwife">Midwife Checkup</option>
                  <option value="ultrasound">Ultrasound Scan</option>
                  <option value="scan">Nuchal / Growth Scan</option>
                  <option value="checkup">Doctor Checkup / GP</option>
                  <option value="other">Other Visit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Visit Date
                  </label>
                  <input
                    id="input-appt-date"
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Visit Time
                  </label>
                  <input
                    id="input-appt-time"
                    type="time"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-850 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Healthcare Provider / Clinician
                </label>
                <div className="relative">
                  <User className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                  <input
                    id="input-appt-provider"
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. Midwife Sarah Jones"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Hospital / Clinic Name
                </label>
                <div className="relative">
                  <Hospital className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                  <input
                    id="input-appt-hospital"
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g. St. Mary's Maternity Wing"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Location Address
                </label>
                <div className="relative">
                  <MapPin className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                  <input
                    id="input-appt-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. 1st Floor, Room 104"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Visit Status
                </label>
                <select
                  id="select-appt-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                >
                  <option value="scheduled">Scheduled / Booked</option>
                  <option value="completed">Completed / Attended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Reminder Options */}
            <div className="bg-white/10 dark:bg-slate-850/10 p-4 rounded-xl border border-white/10 dark:border-slate-800/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Enable Automated Reminder</span>
                <p className="text-[11px] text-slate-400 dark:text-slate-550">Generate a reminder notification prior to the appointment date.</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    id="toggle-appt-reminder"
                    type="checkbox" 
                    checked={reminderEnabled} 
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                </label>

                {reminderEnabled && (
                  <select
                    id="select-reminder-days"
                    value={reminderDays}
                    onChange={(e) => setReminderDays(parseInt(e.target.value) || 1)}
                    className="px-2.5 py-1.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none"
                  >
                    <option value="1">1 Day Before</option>
                    <option value="3">3 Days Before</option>
                    <option value="7">1 Week Before</option>
                  </select>
                )}
              </div>
            </div>

            {/* Notes Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Notes, Prescriptions or Questions to Ask
              </label>
              <textarea
                id="input-appt-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="List questions you want to ask the midwife (e.g., diet, supplements) or record weight, measurements, or blood pressure outcomes from the visit."
                className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/20 dark:border-slate-800/30">
              <button
                id="btn-save-appt"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Scheduling..." : editingAppt ? "Update Visit Info" : "Schedule Visit"}
              </button>
              <button
                id="btn-cancel-appt-form"
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 bg-white/10 dark:bg-slate-800/30 hover:bg-white/20 dark:hover:bg-slate-700/30 text-slate-650 dark:text-slate-300 font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      ) : viewMode === "calendar" ? (
        /* Calendar Monthly View */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel p-5 rounded-2xl space-y-4"
        >
          {/* Calendar Header Navigator */}
          <div className="flex justify-between items-center pb-3 border-b border-white/20 dark:border-slate-800/30">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-sans">
              {currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
            <div className="flex gap-2">
              <button
                id="btn-prev-month"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white/10 text-slate-500 dark:text-slate-400 rounded-lg border border-white/15 dark:border-slate-800/30 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                id="btn-next-month"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white/10 text-slate-500 dark:text-slate-400 rounded-lg border border-white/15 dark:border-slate-800/30 transition-all cursor-pointer"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[10px] uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarData.map((slot, i) => {
              const dayAppts = appointmentsByDate[slot.dateString] || [];
              const isToday = slot.dateString === new Date().toISOString().split("T")[0];

              return (
                <div
                  key={i}
                  id={`calendar-day-${slot.dateString}`}
                  onClick={() => handleCalendarDayClick(slot.dateString)}
                  className={`min-h-[85px] p-1.5 border rounded-xl flex flex-col justify-between transition-all cursor-pointer text-left ${
                    slot.isCurrentMonth 
                      ? "bg-white/40 dark:bg-slate-900/40 border-white/20 dark:border-slate-800/30 text-slate-700 dark:text-slate-350 hover:bg-white/50 dark:hover:bg-slate-850/50 hover:border-white/30" 
                      : "bg-white/10 dark:bg-slate-950/20 border-white/5 dark:border-slate-900/10 text-slate-300/50 dark:text-slate-600/50"
                  } ${isToday ? "ring-2 ring-teal-500/20 bg-teal-500/10 border-teal-500/30" : ""}`}
                >
                  <span className={`text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full ${isToday ? "text-teal-600 dark:text-teal-400 bg-teal-500/10 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                    {slot.day}
                  </span>
                  
                  {/* Appointment indicator list */}
                  <div className="space-y-1 mt-1">
                    {dayAppts.map((appt) => (
                      <div
                        key={appt.id}
                        onClick={(e) => {
                          e.stopPropagation(); // don't trigger day click
                          handleEdit(appt);
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded border leading-tight font-bold truncate flex items-center gap-1 shadow-sm ${getTypeColor(appt.appointment_type)}`}
                        title={`${appt.appointment_type.toUpperCase()} with ${appt.healthcare_provider || "clinician"}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getTypeIndicator(appt.appointment_type)}`} />
                        <span className="truncate">{appt.appointment_type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming appointments card */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-500" /> Upcoming Visits ({splitAppointments.upcoming.length})
            </h3>
            
            {splitAppointments.upcoming.length > 0 ? (
              <div className="space-y-4">
                {splitAppointments.upcoming.map((appt) => (
                  <div 
                    key={appt.id} 
                    className="glass-panel p-5 rounded-2xl space-y-4 relative"
                  >
                    {/* Color Type Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${getTypeIndicator(appt.appointment_type)}`} />
                        <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wide">
                          {appt.appointment_type} Check
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-toggle-done-${appt.id}`}
                          onClick={() => handleToggleCompleted(appt)}
                          className="px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 bg-white/5 hover:bg-teal-500/10 border border-white/10 dark:border-slate-800/25 hover:border-teal-500/20 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                          title="Mark completed"
                        >
                          <CheckCircle className="h-3 w-3" /> Mark Completed
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-650 dark:text-slate-350 mt-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <span>{new Date(appt.appointment_date).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {appt.healthcare_provider && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          <span className="truncate">{appt.healthcare_provider}</span>
                        </div>
                      )}
                      {(appt.hospital_name || appt.location) && (
                        <div className="flex items-center gap-1.5 sm:col-span-2">
                          <Hospital className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          <span className="truncate">
                            {appt.hospital_name} {appt.location ? `(${appt.location})` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {appt.notes && (
                      <div className="text-xs bg-white/10 dark:bg-slate-850/15 p-3 rounded-xl border border-white/5 dark:border-slate-800/10 text-slate-600 dark:text-slate-300 space-y-1">
                        <span className="font-bold text-[10px] uppercase text-slate-400 dark:text-slate-500 block">Doctor Questions / notes</span>
                        <p className="line-clamp-3 leading-relaxed">{appt.notes}</p>
                      </div>
                    )}

                    {appt.reminder_enabled && (
                      <div className="text-[10px] font-semibold text-teal-650 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shrink-0">
                        <AlertCircle className="h-3 w-3" /> Auto Reminder: {appt.reminder_days_before} day{appt.reminder_days_before > 1 ? "s" : ""} before
                      </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-white/10 dark:border-slate-800/25 pt-3 text-xs">
                      <button
                        id={`btn-edit-appt-list-${appt.id}`}
                        onClick={() => handleEdit(appt)}
                        className="text-teal-600 dark:text-teal-400 hover:text-teal-500 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        id={`btn-delete-appt-list-${appt.id}`}
                        onClick={() => handleDelete(appt.id)}
                        className="text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel text-center py-10 rounded-2xl space-y-2">
                <CalendarIcon className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Upcoming Appts</h3>
                <p className="text-slate-400 dark:text-slate-500 text-xs">You have no upcoming midwifes or checkups scheduled.</p>
              </div>
            )}
          </div>

          {/* Past/completed appointments card */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-teal-500" /> Completed & Historic Visits ({splitAppointments.completedOrPast.length})
            </h3>

            {splitAppointments.completedOrPast.length > 0 ? (
              <div className="space-y-3">
                {splitAppointments.completedOrPast.map((appt) => (
                  <div 
                    key={appt.id} 
                    className="glass-panel p-4 rounded-xl flex items-center justify-between"
                  >
                    <div className="space-y-1 flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`h-1.5 w-1.5 rounded-full ${getTypeIndicator(appt.appointment_type)}`} />
                        <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide truncate">
                          {appt.appointment_type}
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                          appt.status === "completed" ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {new Date(appt.appointment_date).toLocaleDateString()} with {appt.healthcare_provider || "GP"}
                      </p>
                      {appt.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate italic">"{appt.notes}"</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <button
                        id={`btn-edit-past-appt-${appt.id}`}
                        onClick={() => handleEdit(appt)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white/5 border border-white/10 dark:border-slate-800/30 rounded-lg cursor-pointer"
                        title="Edit appointment details"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`btn-delete-past-appt-${appt.id}`}
                        onClick={() => handleDelete(appt.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-600 bg-white/5 border border-white/10 dark:border-slate-800/30 rounded-lg cursor-pointer"
                        title="Delete appointment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel text-center py-10 rounded-2xl space-y-2">
                <CheckCircle className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">No History</h3>
                <p className="text-slate-400 dark:text-slate-500 text-xs">No clinic visits or appointments have been marked complete yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
