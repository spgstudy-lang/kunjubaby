import React, { useState, useMemo } from "react";
import { Scan } from "../types";
import { api } from "../lib/api";
import { 
  Baby, 
  Calendar, 
  Heart, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Download, 
  X, 
  Upload, 
  Activity,
  FileText,
  Clock,
  ArrowRight
} from "lucide-react";
import { motion } from "motion/react";

interface ScanArchiveProps {
  scans: Scan[];
  onRefresh: () => Promise<void>;
}

export default function ScanArchive({ scans, onRefresh }: ScanArchiveProps) {
  // UI states
  const [isAdding, setIsAdding] = useState(false);
  const [editingScan, setEditingScan] = useState<Scan | null>(null);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  // Form states
  const [scanDate, setScanDate] = useState("");
  const [lmpDate, setLmpDate] = useState(""); // to auto-calculate weeks & days
  const [weeks, setWeeks] = useState(0);
  const [days, setDays] = useState(0);
  const [crlMeasurement, setCrlMeasurement] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [estimatedDueDate, setEstimatedDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePath, setImagePath] = useState("");
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Calculate weeks and days based on LMP in Add Form
  const handleLmpChange = (lmp: string) => {
    setLmpDate(lmp);
    if (!lmp || !scanDate) return;

    const lmpD = new Date(lmp);
    const scanD = new Date(scanDate);
    const diffTime = scanD.getTime() - lmpD.getTime();
    if (diffTime < 0) return; // invalid date sequence

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const calculatedWeeks = Math.floor(diffDays / 7);
    const calculatedDays = diffDays % 7;

    setWeeks(calculatedWeeks);
    setDays(calculatedDays);

    // Calculate EDD: LMP + 280 days
    const edd = new Date(lmpD.getTime() + 280 * 24 * 60 * 60 * 1000);
    setEstimatedDueDate(edd.toISOString().split("T")[0]);
  };

  // Image base64 and upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError("Image must be smaller than 15MB");
      return;
    }

    setUploading(true);
    setError("");

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(",")[1];
      try {
        const res = await api.uploadImage(file.name, base64Data, file.type);
        setImageUrl(res.imageUrl);
        setImagePath(res.imagePath);
      } catch (err: any) {
        setError("Failed to upload image. Try again.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit scan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      scan_date: scanDate,
      weeks,
      days,
      crl_measurement: parseFloat(crlMeasurement) || 0,
      heart_rate: parseInt(heartRate) || 0,
      estimated_due_date: estimatedDueDate,
      notes,
      image_url: imageUrl,
      image_path: imagePath
    };

    try {
      if (editingScan) {
        await api.updateScan(editingScan.id, payload);
      } else {
        await api.createScan(payload);
      }
      await onRefresh();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save scan record.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (scan: Scan) => {
    setEditingScan(scan);
    setScanDate(scan.scan_date);
    setWeeks(scan.weeks);
    setDays(scan.days);
    setCrlMeasurement(scan.crl_measurement?.toString() || "");
    setHeartRate(scan.heart_rate?.toString() || "");
    setEstimatedDueDate(scan.estimated_due_date || "");
    setNotes(scan.notes || "");
    setImageUrl(scan.image_url || "");
    setImagePath(scan.image_path || "");
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scan record?")) return;
    try {
      await api.deleteScan(id);
      await onRefresh();
      if (selectedScan?.id === id) setSelectedScan(null);
    } catch (err: any) {
      alert("Failed to delete scan: " + err.message);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingScan(null);
    setScanDate("");
    setLmpDate("");
    setWeeks(0);
    setDays(0);
    setCrlMeasurement("");
    setHeartRate("");
    setEstimatedDueDate("");
    setNotes("");
    setImageUrl("");
    setImagePath("");
    setError("");
  };

  // Filter & Search Scans
  const filteredScans = useMemo(() => {
    return scans.filter((scan) => {
      // search query matches notes
      const matchesSearch = scan.notes.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            scan.weeks.toString().includes(searchQuery);

      // date filter
      const scanTime = new Date(scan.scan_date).getTime();
      const matchesStart = startDate ? scanTime >= new Date(startDate).getTime() : true;
      const matchesEnd = endDate ? scanTime <= new Date(endDate).getTime() : true;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [scans, searchQuery, startDate, endDate]);

  // Export Scan Details to PDF/Print
  const handlePrintScan = (scan: Scan) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Baby Ultrasound Scan Report - Week ${scan.weeks}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
            
            @media print {
              body {
                background: #ffffff !important;
                color: #1e293b !important;
                padding: 0 !important;
                margin: 1.5cm !important;
              }
              .no-print { display: none; }
              .page-break { page-break-before: always; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            
            body {
              font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
              padding: 40px;
              color: #1e293b;
              background-color: #fafbfd;
              max-width: 900px;
              margin: 0 auto;
            }

            .container {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 24px;
              padding: 40px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
            }

            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px dashed #e2e8f0;
              padding-bottom: 24px;
              margin-bottom: 32px;
            }

            .header-left {
              display: flex;
              align-items: center;
              gap: 16px;
            }

            .header-logo {
              width: 52px;
              height: 52px;
              background: #fff1f2;
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #f43f5e;
            }

            .title-section h1 {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
              letter-spacing: -0.025em;
            }

            .title-section p {
              font-size: 13px;
              color: #64748b;
              margin: 4px 0 0 0;
              font-weight: 500;
            }

            .badge {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #14b8a6;
              background: #f0fdfa;
              border: 1px solid #ccfbf1;
              padding: 6px 14px;
              border-radius: 9999px;
            }

            .section-title {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.07em;
              color: #475569;
              margin: 0 0 16px 0;
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .section-title svg {
              color: #14b8a6;
            }

            .grid-container {
              display: grid;
              grid-template-cols: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 32px;
            }

            .metric-card {
              background: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 16px;
              padding: 16px 20px;
              display: flex;
              align-items: center;
              gap: 16px;
              transition: all 0.2s ease;
            }

            .metric-icon {
              width: 44px;
              height: 44px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #0d9488;
              background: #f0fdfa;
            }

            .metric-info {
              display: flex;
              flex-direction: column;
            }

            .metric-label {
              font-size: 11px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }

            .metric-val {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }

            .notes-block {
              background: #f8fafc;
              border-radius: 16px;
              border-left: 4px solid #14b8a6;
              padding: 20px;
              margin-bottom: 32px;
            }

            .notes-title {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #14b8a6;
              letter-spacing: 0.05em;
              margin-bottom: 8px;
            }

            .notes-content {
              font-size: 14px;
              line-height: 1.6;
              color: #334155;
              font-weight: 500;
            }

            .sonogram-section {
              text-align: center;
              margin-top: 32px;
              page-break-inside: avoid;
            }

            .sonogram-frame {
              display: inline-block;
              background: #090d16;
              padding: 16px;
              border-radius: 20px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.15);
              border: 1px solid #1e293b;
              max-width: 100%;
            }

            .sonogram-img {
              max-width: 100%;
              max-height: 400px;
              border-radius: 10px;
              object-fit: contain;
              display: block;
              margin: 0 auto;
            }

            .sonogram-meta {
              color: #94a3b8;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-top: 12px;
            }

            .footer {
              text-align: center;
              font-size: 12px;
              font-weight: 600;
              color: #94a3b8;
              margin-top: 48px;
              border-top: 1px solid #f1f5f9;
              padding-top: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }

            .footer-heart {
              color: #f43f5e;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-left">
                <div class="header-logo">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <div class="title-section">
                  <h1>Ultrasound Sonogram Report</h1>
                  <p>Kunju Baby's Development Journey</p>
                </div>
              </div>
              <div class="badge">Keepsake Record</div>
            </div>

            <h2 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              Biometric Overview & Timeline
            </h2>

            <div class="grid-container">
              <div class="metric-card">
                <div class="metric-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                </div>
                <div class="metric-info">
                  <div class="metric-label">Scan Date</div>
                  <div class="metric-val">${new Date(scan.scan_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-icon" style="color: #f43f5e; background: #fff1f2;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <div class="metric-info">
                  <div class="metric-label">Gestational Age</div>
                  <div class="metric-val">${scan.weeks}w, ${scan.days}d</div>
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v16h16"/><path d="m5 19 6-6 4 4 6-8"/></svg>
                </div>
                <div class="metric-info">
                  <div class="metric-label">Crown-Rump Length (CRL)</div>
                  <div class="metric-val">${scan.crl_measurement ? `${scan.crl_measurement} mm` : "N/A"}</div>
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-icon" style="color: #f43f5e; background: #fff1f2;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <div class="metric-info">
                  <div class="metric-label">Fetal Heart Rate</div>
                  <div class="metric-val">${scan.heart_rate ? `${scan.heart_rate} BPM` : "N/A"}</div>
                </div>
              </div>

              <div class="metric-card" style="grid-column: span 2;">
                <div class="metric-icon" style="color: #6366f1; background: #e0e7ff;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22V2"/><path d="M7 22V2"/><path d="M12 22V2"/></svg>
                </div>
                <div class="metric-info">
                  <div class="metric-label">Estimated Due Date (EDD)</div>
                  <div class="metric-val">${scan.estimated_due_date ? new Date(scan.estimated_due_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Not Calculated"}</div>
                </div>
              </div>
            </div>

            <div class="notes-block">
              <div class="notes-title">Clinical & Personal Notes</div>
              <div class="notes-content">${scan.notes || "No notes logged for this ultrasound scan."}</div>
            </div>

            ${scan.image_url ? `
              <div class="sonogram-section">
                <div class="sonogram-frame">
                  <img src="${scan.image_url}" class="sonogram-img" referrerPolicy="no-referrer" />
                  <div class="sonogram-meta">Week ${scan.weeks} Ultrasound Scan Sonogram</div>
                </div>
              </div>
            ` : ""}

            <div class="footer">
              <span>Prepared with</span>
              <svg class="footer-heart" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span>for Kunju Baby • Pregnancy & Family Planner</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Ultrasound Baby Scan Archive
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Log baby's development, track measurements (CRL), heart rates, and keep a digital album of ultrasound scans.
          </p>
        </div>
        {!isAdding && (
          <button
            id="btn-add-scan"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-650 rounded-xl transition-all shrink-0 shadow-sm cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Log New Scan
          </button>
        )}
      </div>

      {/* Main Grid: Form OR Search/List */}
      {isAdding ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-3xl"
        >
          <div className="flex justify-between items-center border-b border-white/20 dark:border-slate-800/30 pb-3 mb-5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              {editingScan ? "Edit Scan Details" : "Log New Ultrasound Scan"}
            </h2>
            <button
              id="btn-close-form"
              onClick={resetForm}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form id="scan-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Scan Date
                </label>
                <input
                  id="input-scan-date"
                  type="date"
                  required
                  value={scanDate}
                  onChange={(e) => {
                    setScanDate(e.target.value);
                    if (lmpDate) handleLmpChange(lmpDate);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Last Menstrual Period (LMP) <span className="text-slate-400 font-normal">(Auto-calculates Weeks/Days)</span>
                </label>
                <input
                  id="input-scan-lmp"
                  type="date"
                  value={lmpDate}
                  onChange={(e) => handleLmpChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Weeks
                  </label>
                  <input
                    id="input-scan-weeks"
                    type="number"
                    min="0"
                    required
                    value={weeks || ""}
                    onChange={(e) => setWeeks(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Days
                  </label>
                  <input
                    id="input-scan-days"
                    type="number"
                    min="0"
                    max="6"
                    required
                    value={days || ""}
                    onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Estimated Due Date (EDD)
                </label>
                <input
                  id="input-scan-edd"
                  type="date"
                  value={estimatedDueDate}
                  onChange={(e) => setEstimatedDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  CRL Measurement <span className="text-slate-400 font-normal">(Crown-Rump Length, mm)</span>
                </label>
                <input
                  id="input-scan-crl"
                  type="number"
                  step="0.01"
                  value={crlMeasurement}
                  onChange={(e) => setCrlMeasurement(e.target.value)}
                  placeholder="e.g., 42.5"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Fetal Heart Rate <span className="text-slate-400 font-normal">(BPM)</span>
                </label>
                <input
                  id="input-scan-hr"
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="e.g., 150"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Scan Notes & Observations
              </label>
              <textarea
                id="input-scan-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did the doctor or midwife say? Any movements felt? Double heartbeats?"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>

            {/* Image Upload Workflow */}
            <div className="bg-white/10 dark:bg-slate-900/15 p-4 rounded-xl border border-dashed border-white/45 dark:border-slate-800/45">
              <label className="block text-xs font-bold text-slate-650 dark:text-slate-300 mb-2">
                Ultrasound Image
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-white/25 dark:border-slate-800/25 bg-white/40 dark:bg-slate-850/40 shadow-sm shrink-0">
                    <img src={imageUrl} alt="Ultrasound Preview" className="h-28 w-28 object-cover" />
                    <button
                      id="btn-remove-photo"
                      type="button"
                      onClick={() => {
                        setImageUrl("");
                        setImagePath("");
                      }}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="h-28 w-28 bg-white/20 dark:bg-slate-800/30 rounded-lg border border-white/20 dark:border-slate-800/30 flex flex-col items-center justify-center text-slate-400 dark:text-slate-550 shrink-0">
                    <Baby className="h-8 w-8" />
                    <span className="text-[10px] font-bold mt-1 uppercase">No Photo</span>
                  </div>
                )}

                <div className="flex-1 w-full text-center sm:text-left">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                    Upload JPEG or PNG scan photos
                  </span>
                  <input
                    id="input-scan-photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    id="btn-trigger-upload"
                    type="button"
                    disabled={uploading}
                    onClick={() => document.getElementById("input-scan-photo")?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/45 dark:border-slate-700/45 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-850/50 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Select Ultrasound Photo"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/20 dark:border-slate-800/30">
              <button
                id="btn-save-scan"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : editingScan ? "Update Scan Record" : "Save Scan Record"}
              </button>
              <button
                id="btn-cancel-form"
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 text-slate-650 dark:text-slate-300 font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Filtering and Search Controls */}
          <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative w-full md:flex-1">
              <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
              <input
                id="search-scans"
                type="text"
                placeholder="Search scans (e.g. week number, notes keyword)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>

            {/* Date Range Filters */}
            <div className="flex w-full md:w-auto items-center gap-2">
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs focus:outline-none"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs focus:outline-none"
              />
              {(startDate || endDate) && (
                <button
                  id="btn-clear-date-filter"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Scans Album/List View */}
          {filteredScans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredScans.map((scan) => (
                <div 
                  key={scan.id} 
                  className="glass-panel rounded-2xl overflow-hidden flex flex-col hover:shadow-md transition-all group"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                    {scan.image_url ? (
                      <img 
                        src={scan.image_url} 
                        alt={`Scan Week ${scan.weeks}`} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (scan.image_path && !target.src.includes("/api/gallery/file")) {
                            target.src = `/api/gallery/file?path=${encodeURIComponent(scan.image_path)}`;
                          }
                        }}
                      />
                    ) : (
                      <div className="text-center text-slate-500 p-4">
                        <Baby className="h-10 w-10 text-slate-600 mx-auto opacity-45 fill-slate-700" />
                        <span className="text-[10px] font-black uppercase tracking-wider mt-2 block opacity-45">No Ultrasound Image</span>
                      </div>
                    )}
                    
                    {/* Badge Weeks/Days */}
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md border border-white/10 text-white px-3 py-1 rounded-xl text-xs font-black">
                      {scan.weeks}w, {scan.days}d
                    </div>

                    {scan.image_url && (
                      <button
                        id={`btn-view-lightbox-${scan.id}`}
                        onClick={() => setSelectedScan(scan)}
                        className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md border border-white/10 text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        Enlarge Photo
                      </button>
                    )}
                  </div>

                  {/* Content Container */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold">
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-450">
                          <Calendar className="h-3 w-3" /> 
                          {new Date(scan.scan_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        {scan.estimated_due_date && (
                          <span className="text-teal-600 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.5 rounded">
                            Due: {new Date(scan.estimated_due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-white/20 dark:bg-slate-900/20 p-2.5 rounded-xl border border-white/10 dark:border-slate-800/10">
                        <div className="flex items-center gap-1 text-slate-650 dark:text-slate-300">
                          <Activity className="h-3.5 w-3.5 text-teal-500" />
                          <span>CRL: <span className="font-extrabold text-slate-800 dark:text-slate-100">{scan.crl_measurement ? `${scan.crl_measurement} mm` : "N/A"}</span></span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-650 dark:text-slate-300">
                          <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-50/10" />
                          <span>HR: <span className="font-extrabold text-slate-800 dark:text-slate-100">{scan.heart_rate ? `${scan.heart_rate} BPM` : "N/A"}</span></span>
                        </div>
                      </div>

                      <p className="text-slate-600 dark:text-slate-300 text-xs line-clamp-3">
                        {scan.notes || <span className="text-slate-400 dark:text-slate-500 italic">No notes logged for this scan.</span>}
                      </p>
                    </div>

                    {/* Action Panel */}
                    <div className="flex justify-between items-center pt-3 border-t border-white/10 dark:border-slate-800/10 text-xs font-semibold">
                      <button
                        id={`btn-print-scan-${scan.id}`}
                        onClick={() => handlePrintScan(scan)}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" /> PDF
                      </button>
                      <div className="flex gap-3">
                        <button
                          id={`btn-edit-scan-${scan.id}`}
                          onClick={() => handleEdit(scan)}
                          className="text-teal-650 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-350 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          id={`btn-delete-scan-${scan.id}`}
                          onClick={() => handleDelete(scan.id)}
                          className="text-rose-550 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-350 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel text-center py-12 rounded-2xl space-y-3">
              <Baby className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto fill-slate-50/10" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Scans Found</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                {searchQuery || startDate || endDate
                  ? "We couldn't find any scans matching your criteria. Try adjusting your search query or filters."
                  : "You haven't logged any ultrasound baby scans yet. Click 'Log New Scan' to save your first memory!"}
              </p>
              {(searchQuery || startDate || endDate) && (
                <button
                  id="btn-reset-search-scans"
                  onClick={() => {
                    setSearchQuery("");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-teal-650 hover:text-teal-700 bg-teal-500/15 rounded-lg cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedScan && (
        <div id="lightbox" className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-white/10">
            <button
              id="btn-close-lightbox"
              onClick={() => setSelectedScan(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full transition-all cursor-pointer z-10"
            >
              <X className="h-5 w-5" />
            </button>
            
            <img 
              src={selectedScan.image_url} 
              alt={`Scan Week ${selectedScan.weeks}`} 
              className="w-full max-h-[75vh] object-contain"
            />
            
            <div className="p-5 bg-slate-950 text-white border-t border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-sm">Week {selectedScan.weeks}, Day {selectedScan.days} ultrasound scan</h3>
                  <p className="text-xs text-slate-400 mt-1">Logged on {new Date(selectedScan.scan_date).toLocaleDateString()}</p>
                </div>
                <button
                  id="btn-print-lightbox"
                  onClick={() => handlePrintScan(selectedScan)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Export Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
