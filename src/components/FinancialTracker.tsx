import React, { useState, useMemo } from "react";
import { Finance } from "../types";
import { api } from "../lib/api";
import { 
  DollarSign, 
  TrendingUp, 
  User, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Download, 
  X, 
  PiggyBank, 
  ShoppingBag, 
  Heart,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { motion } from "motion/react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

interface FinancialTrackerProps {
  finances: Finance[];
  onRefresh: () => Promise<void>;
  currencySymbol?: string;
}

export default function FinancialTracker({ finances, onRefresh, currencySymbol = "₹" }: FinancialTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Finance | null>(null);

  // Form states
  const [transDate, setTransDate] = useState("");
  const [amount, setAmount] = useState("");
  const [contributedBy, setContributedBy] = useState<'husband' | 'wife' | 'both'>('both');
  const [category, setCategory] = useState<'savings' | 'purchase' | 'medical' | 'other'>('savings');
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterContributor, setFilterContributor] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Color constants
  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

  // Submit transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      transaction_date: transDate,
      amount: parseFloat(amount) || 0,
      contributed_by: contributedBy,
      category,
      description,
      notes
    };

    try {
      if (editingTransaction) {
        await api.updateFinance(editingTransaction.id, payload);
      } else {
        await api.createFinance(payload);
      }
      await onRefresh();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save financial transaction.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fin: Finance) => {
    setEditingTransaction(fin);
    setTransDate(fin.transaction_date);
    setAmount(fin.amount.toString());
    setContributedBy(fin.contributed_by);
    setCategory(fin.category);
    setDescription(fin.description);
    setNotes(fin.notes || "");
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    try {
      await api.deleteFinance(id);
      await onRefresh();
    } catch (err: any) {
      alert("Failed to delete financial entry");
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingTransaction(null);
    setTransDate("");
    setAmount("");
    setContributedBy("both");
    setCategory("savings");
    setDescription("");
    setNotes("");
    setError("");
  };

  // Filtered finances list
  const filteredFinances = useMemo(() => {
    return finances.filter((item) => {
      const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.notes.toLowerCase().includes(searchQuery.toLowerCase());

      const transTime = new Date(item.transaction_date).getTime();
      const matchesStart = startDate ? transTime >= new Date(startDate).getTime() : true;
      const matchesEnd = endDate ? transTime <= new Date(endDate).getTime() : true;

      const matchesContributor = filterContributor ? item.contributed_by === filterContributor : true;
      const matchesCategory = filterCategory ? item.category === filterCategory : true;

      return matchesSearch && matchesStart && matchesEnd && matchesContributor && matchesCategory;
    });
  }, [finances, searchQuery, startDate, endDate, filterContributor, filterCategory]);

  // Calculations for Financial Dashboard
  const metrics = useMemo(() => {
    let totalSavings = 0;
    let totalPurchases = 0;
    let totalMedical = 0;
    let totalOther = 0;

    let husbandSavingsCont = 0;
    let wifeSavingsCont = 0;

    finances.forEach((f) => {
      if (f.category === "savings") {
        totalSavings += f.amount;
        if (f.contributed_by === "husband") husbandSavingsCont += f.amount;
        else if (f.contributed_by === "wife") wifeSavingsCont += f.amount;
        else {
          husbandSavingsCont += f.amount / 2;
          wifeSavingsCont += f.amount / 2;
        }
      } else {
        if (f.category === "purchase") totalPurchases += f.amount;
        else if (f.category === "medical") totalMedical += f.amount;
        else totalOther += f.amount;
      }
    });

    const currentBalance = totalSavings - (totalPurchases + totalMedical + totalOther);

    return {
      totalSavings, // all-time saved
      totalPurchases,
      totalMedical,
      totalOther,
      currentBalance, // savings minus expenses
      husbandSavingsCont,
      wifeSavingsCont
    };
  }, [finances]);

  // Chart Data: Contributions Pie
  const pieData = useMemo(() => {
    return [
      { name: "Husband Contribution", value: metrics.husbandSavingsCont },
      { name: "Wife Contribution", value: metrics.wifeSavingsCont }
    ].filter(item => item.value > 0);
  }, [metrics]);

  // Chart Data: Monthly Savings & Expenses Breakdown
  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, { month: string; savings: number; expenses: number }> = {};

    finances.forEach((f) => {
      // Get Year-Month (e.g. 2026-07)
      const dateObj = new Date(f.transaction_date);
      if (isNaN(dateObj.getTime())) return;
      
      const monthStr = dateObj.toLocaleString("en-US", { month: "short", year: "2-digit" });
      
      if (!monthsMap[monthStr]) {
        monthsMap[monthStr] = { month: monthStr, savings: 0, expenses: 0 };
      }

      if (f.category === "savings") {
        monthsMap[monthStr].savings += f.amount;
      } else {
        monthsMap[monthStr].expenses += f.amount;
      }
    });

    // Sort by month/year order (chronological)
    return Object.values(monthsMap).reverse(); // reverse to keep chronological if grouped descending
  }, [finances]);

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ["ID", "Transaction Date", "Amount", "Contributed By", "Category", "Description", "Notes"];
    const rows = filteredFinances.map((f) => [
      f.id,
      f.transaction_date,
      f.amount,
      f.contributed_by,
      f.category,
      `"${(f.description || "").replace(/"/g, '""')}"`,
      `"${(f.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kunju_baby_finances_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Exporter
  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Calculate distributions
    const totalExp = metrics.totalPurchases + metrics.totalMedical + metrics.totalOther;
    const totalAll = metrics.totalSavings + totalExp;
    const getPct = (val: number) => totalAll > 0 ? ((val / totalAll) * 100).toFixed(1) : "0";

    const savPct = getPct(metrics.totalSavings);
    const purPct = getPct(metrics.totalPurchases);
    const medPct = getPct(metrics.totalMedical);
    const othPct = getPct(metrics.totalOther);

    // Calculate maximum amount for bar height (timeline chart)
    const activeMonthlyData = monthlyData.slice(0, 6);
    const maxVal = Math.max(...activeMonthlyData.map(d => Math.max(d.savings, d.expenses)), 100);

    // Create the HTML document
    printWindow.document.write(`
      <html>
        <head>
          <title>Baby Fund Financial Report - Kunju Baby</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
            
            @media print {
              body {
                background: #ffffff !important;
                color: #0f172a !important;
                padding: 0 !important;
                margin: 0.8cm !important;
              }
              .no-print { display: none; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            
            body {
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
              padding: 30px;
              color: #1e293b;
              background-color: #fafbfd;
              max-width: 900px;
              margin: 0 auto;
            }

            .container {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 24px;
              padding: 32px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
            }

            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px dashed #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 28px;
            }

            .header-left {
              display: flex;
              align-items: center;
              gap: 16px;
            }

            .header-logo {
              width: 48px;
              height: 48px;
              background: #f0fdf4;
              border-radius: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #10b981;
            }

            .title-section h1 {
              font-size: 21px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
              letter-spacing: -0.02em;
            }

            .title-section p {
              font-size: 12px;
              color: #64748b;
              margin: 3px 0 0 0;
              font-weight: 500;
            }

            .badge {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #0f766e;
              background: #f0fdfa;
              border: 1px solid #ccfbf1;
              padding: 6px 14px;
              border-radius: 9999px;
            }

            .grid-metrics {
              display: grid;
              grid-template-cols: repeat(3, 1fr);
              gap: 16px;
              margin-bottom: 28px;
            }

            .metric-card {
              border-radius: 18px;
              padding: 20px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border: 1px solid rgba(0, 0, 0, 0.05);
            }

            .metric-card.balance {
              background: linear-gradient(135deg, #0d9488 0%, #115e59 100%);
              color: #ffffff;
            }

            .metric-card.savings {
              background: linear-gradient(135deg, #10b981 0%, #047857 100%);
              color: #ffffff;
            }

            .metric-card.expenses {
              background: linear-gradient(135deg, #f43f5e 0%, #be123c 100%);
              color: #ffffff;
            }

            .metric-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              opacity: 0.9;
            }

            .metric-val {
              font-size: 28px;
              font-weight: 800;
              margin-top: 6px;
              letter-spacing: -0.03em;
            }

            .section-title {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #334155;
              margin: 28px 0 14px 0;
              display: flex;
              align-items: center;
              gap: 8px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 6px;
            }

            .dashboard-row {
              display: grid;
              grid-template-cols: 1.1fr 0.9fr;
              gap: 20px;
              margin-bottom: 28px;
            }

            .dashboard-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              padding: 20px;
            }

            .chart-title {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #475569;
              letter-spacing: 0.05em;
              margin-bottom: 14px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }

            .progress-item {
              margin-bottom: 12px;
            }

            .progress-meta {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: 600;
              color: #475569;
              margin-bottom: 4px;
            }

            .progress-bg {
              background: #e2e8f0;
              height: 7px;
              border-radius: 9999px;
              overflow: hidden;
            }

            .progress-fill {
              height: 100%;
              border-radius: 9999px;
            }

            .coparent-row {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-top: 14px;
            }

            .coparent-side {
              flex: 1;
              padding: 10px 14px;
              border-radius: 10px;
              border: 1px solid #e2e8f0;
              background: #ffffff;
              text-align: center;
            }

            .coparent-name {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
            }

            .coparent-amount {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }

            .ledger-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            .ledger-table th {
              background: #f1f5f9;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #475569;
              padding: 10px 14px;
              text-align: left;
              border-bottom: 2px solid #cbd5e1;
            }

            .ledger-table td {
              font-size: 12px;
              padding: 10px 14px;
              border-bottom: 1px solid #f1f5f9;
              color: #334155;
            }

            .ledger-table tr:nth-child(even) {
              background-color: #fafbfd;
            }

            .cat-badge {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 3px 6px;
              border-radius: 6px;
              display: inline-block;
            }

            .cat-savings { background: #dcfce7; color: #15803d; }
            .cat-purchase { background: #dbeafe; color: #1d4ed8; }
            .cat-medical { background: #fee2e2; color: #b91c1c; }
            .cat-other { background: #fef3c7; color: #b45309; }

            .contr-badge {
              font-size: 11px;
              font-weight: 600;
              color: #64748b;
            }

            .footer {
              text-align: center;
              font-size: 10px;
              font-weight: 600;
              color: #94a3b8;
              margin-top: 40px;
              border-top: 1px solid #f1f5f9;
              padding-top: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <div class="title-section">
                  <h1>Baby Fund Financial Report</h1>
                  <p>Pregnancy savings, stroller shopping, medical expenses & co-parent logs</p>
                </div>
              </div>
              <div class="badge">Kunju Baby Planner</div>
            </div>

            <!-- Key Metric Cards -->
            <div class="grid-metrics">
              <div class="metric-card balance">
                <div class="metric-label">Current Fund Balance</div>
                <div class="metric-val">${currencySymbol}${metrics.currentBalance.toLocaleString()}</div>
              </div>
              <div class="metric-card savings">
                <div class="metric-label">All-time Savings</div>
                <div class="metric-val">${currencySymbol}${metrics.totalSavings.toLocaleString()}</div>
              </div>
              <div class="metric-card expenses">
                <div class="metric-label">Total Baby Expenses</div>
                <div class="metric-val">${currencySymbol}${totalExp.toLocaleString()}</div>
              </div>
            </div>

            <h2 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
              Financial Analytics Dashboard
            </h2>

            <!-- Visual Charts Row -->
            <div class="dashboard-row">
              <!-- Left Chart: Monthly savings vs expenses timeline -->
              <div class="dashboard-card">
                <div class="chart-title">
                  <span>Monthly Savings vs Expenses Timeline</span>
                  <span style="font-size: 9px; color: #94a3b8; text-transform: none;">Active History</span>
                </div>
                ${activeMonthlyData.length > 0 ? `
                  <svg width="100%" height="180" viewBox="0 0 450 180" style="overflow: visible;">
                    <!-- Grid Lines -->
                    <line x1="40" y1="20" x2="430" y2="20" stroke="#f1f5f9" stroke-width="1" />
                    <line x1="40" y1="75" x2="430" y2="75" stroke="#f1f5f9" stroke-width="1" />
                    <line x1="40" y1="130" x2="430" y2="130" stroke="#e2e8f0" stroke-width="1.5" />
                    
                    <!-- Y Axis values -->
                    <text x="10" y="24" fill="#94a3b8" font-size="9" font-weight="700">${currencySymbol}${Math.round(maxVal).toLocaleString()}</text>
                    <text x="10" y="79" fill="#94a3b8" font-size="9" font-weight="700">${currencySymbol}${Math.round(maxVal / 2).toLocaleString()}</text>
                    <text x="10" y="134" fill="#94a3b8" font-size="9" font-weight="700">${currencySymbol}0</text>

                    <!-- Render bars -->
                    ${activeMonthlyData.map((d, i) => {
                      const barWidth = 14;
                      const barGap = 4;
                      const groupWidth = (barWidth * 2) + barGap;
                      const barX = 65 + (i * 62);
                      
                      const savHeight = maxVal > 0 ? (d.savings / maxVal) * 110 : 0;
                      const expHeight = maxVal > 0 ? (d.expenses / maxVal) * 110 : 0;
                      
                      const savY = 130 - savHeight;
                      const expY = 130 - expHeight;

                      return `
                        <!-- Savings Bar (Teal) -->
                        <rect x="${barX}" y="${savY}" width="${barWidth}" height="${savHeight}" rx="3" fill="#10b981" />
                        <!-- Expenses Bar (Rose) -->
                        <rect x="${barX + barWidth + barGap}" y="${expY}" width="${barWidth}" height="${expHeight}" rx="3" fill="#f43f5e" />
                        <!-- Month Label -->
                        <text x="${barX + barWidth}" y="150" fill="#475569" font-size="10" font-weight="700" text-anchor="middle">${d.month}</text>
                      `;
                    }).join("")}
                    
                    <!-- Legend -->
                    <rect x="150" y="165" width="8" height="8" rx="2" fill="#10b981" />
                    <text x="164" y="172" fill="#475569" font-size="9" font-weight="700">Savings</text>
                    <rect x="230" y="165" width="8" height="8" rx="2" fill="#f43f5e" />
                    <text x="244" y="172" fill="#475569" font-size="9" font-weight="700">Expenses</text>
                  </svg>
                ` : `
                  <div style="height: 140px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px;">No monthly transactions logged yet.</div>
                `}
              </div>

              <!-- Right Chart: Category Distribution and Co-parent contribution -->
              <div class="dashboard-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div class="chart-title">Category Distribution</div>
                  
                  <div class="progress-item">
                    <div class="progress-meta">
                      <span>💰 Savings Deposits</span>
                      <span>${savPct}%</span>
                    </div>
                    <div class="progress-bg">
                      <div class="progress-fill" style="width: ${savPct}%; background-color: #10b981;"></div>
                    </div>
                  </div>

                  <div class="progress-item">
                    <div class="progress-meta">
                      <span>🛒 Baby Purchases</span>
                      <span>${purPct}%</span>
                    </div>
                    <div class="progress-bg">
                      <div class="progress-fill" style="width: ${purPct}%; background-color: #3b82f6;"></div>
                    </div>
                  </div>

                  <div class="progress-item">
                    <div class="progress-meta">
                      <span>🏥 Medical / Scans</span>
                      <span>${medPct}%</span>
                    </div>
                    <div class="progress-bg">
                      <div class="progress-fill" style="width: ${medPct}%; background-color: #f43f5e;"></div>
                    </div>
                  </div>

                  <div class="progress-item" style="margin-bottom: 0;">
                    <div class="progress-meta">
                      <span>⭐ Other Expenses</span>
                      <span>${othPct}%</span>
                    </div>
                    <div class="progress-bg">
                      <div class="progress-fill" style="width: ${othPct}%; background-color: #f59e0b;"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <div class="chart-title" style="margin-top: 18px; margin-bottom: 4px;">Co-Parent Savings Fund</div>
                  <div class="coparent-row">
                    <div class="coparent-side" style="border-left: 3.5px solid #0d9488;">
                      <div class="coparent-name">Husband</div>
                      <div class="coparent-amount">${currencySymbol}${metrics.husbandSavingsCont.toLocaleString()}</div>
                    </div>
                    <div class="coparent-side" style="border-left: 3.5px solid #ec4899;">
                      <div class="coparent-name">Wife</div>
                      <div class="coparent-amount">${currencySymbol}${metrics.wifeSavingsCont.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detailed Ledger Table -->
            <h2 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
              Transaction Ledger History
            </h2>

            <table class="ledger-table">
              <thead>
                <tr>
                  <th style="width: 15%">Date</th>
                  <th style="width: 20%">Category</th>
                  <th style="width: 20%">Contributor</th>
                  <th style="width: 30%">Description</th>
                  <th style="width: 15%; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${filteredFinances.length > 0 ? filteredFinances.map((f) => `
                  <tr>
                    <td>${new Date(f.transaction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>
                      <span class="cat-badge cat-${f.category}">
                        ${f.category === 'savings' ? '💰 Savings' : f.category === 'purchase' ? '🛒 Purchase' : f.category === 'medical' ? '🏥 Medical' : '⭐ Other'}
                      </span>
                    </td>
                    <td>
                      <span class="contr-badge">
                        ${f.contributed_by === 'husband' ? '👨 Husband' : f.contributed_by === 'wife' ? '👩 Wife' : '🧑‍🤝‍🧑 Shared'}
                      </span>
                    </td>
                    <td>
                      <strong style="color: #0f172a;">${f.description}</strong>
                      ${f.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 1px;">${f.notes}</div>` : ''}
                    </td>
                    <td style="text-align: right; font-weight: 800; color: ${f.category === 'savings' ? '#10b981' : '#f43f5e'};">
                      ${f.category === 'savings' ? '+' : '-'}${currencySymbol}${f.amount.toLocaleString()}
                    </td>
                  </tr>
                `).join("") : `
                  <tr>
                    <td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No transactions found matching your filters.</td>
                  </tr>
                `}
              </tbody>
            </table>

            <div class="footer">
              <span>Prepared with</span>
              <svg class="footer-heart" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span>for Kunju Baby • Pregnancy Planner Dashboard</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
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
            Financial Budget & Savings Tracker
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Build your baby fund! Log savings deposits, medical expenses, stroller/nursery shopping receipts, and monitor contributions.
          </p>
        </div>
        {!isAdding && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 border border-white/50 dark:border-slate-700/50 rounded-xl transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              id="btn-export-pdf"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 border border-white/50 dark:border-slate-700/50 rounded-xl transition-all cursor-pointer"
            >
              <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
              </svg>
              <span>Download PDF</span>
            </button>
            <button
              id="btn-add-finance"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" /> Log Transaction
            </button>
          </div>
        )}
      </div>

      {/* Adding/Editing View */}
      {isAdding ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-3xl"
        >
          <div className="flex justify-between items-center border-b border-white/20 dark:border-slate-800/30 pb-3 mb-5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              {editingTransaction ? "Edit Transaction Entry" : "Log New Financial Transaction"}
            </h2>
            <button
              id="btn-close-finance-form"
              onClick={resetForm}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form id="finance-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Transaction Date
                </label>
                <input
                  id="input-trans-date"
                  type="date"
                  required
                  value={transDate}
                  onChange={(e) => setTransDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Amount ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                  <input
                    id="input-trans-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 150.00"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Contributed By / Paid By
                </label>
                <select
                  id="select-trans-contrib"
                  value={contributedBy}
                  onChange={(e) => setContributedBy(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option value="both">Both (Shared Fund)</option>
                  <option value="husband">Husband</option>
                  <option value="wife">Wife</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Category
                </label>
                <select
                  id="select-trans-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                >
                  <option value="savings">💰 Savings / Baby Fund Deposit</option>
                  <option value="purchase">🛒 Baby Equipment / Purchase</option>
                  <option value="medical">🏥 Medical Bills / Healthcare Clinic</option>
                  <option value="other">📦 Other Baby Expense</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Description / Item Name
              </label>
              <input
                id="input-trans-desc"
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Nursery Crib purchase, Monthly savings stash..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Post-Transaction Notes
              </label>
              <textarea
                id="input-trans-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Vendor links, extra details, store details..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/20 dark:border-slate-800/30">
              <button
                id="btn-save-finance"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : editingTransaction ? "Update Transaction" : "Save Transaction"}
              </button>
              <button
                id="btn-cancel-finance-form"
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
        /* Dashboard Charts & List Panel */
        <div className="space-y-6">
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>All-Time Stashed</span>
                <div className="bg-teal-500/15 text-teal-600 dark:text-teal-400 p-1 rounded-lg">
                  <PiggyBank className="h-4.5 w-4.5" />
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-sans">
                {currencySymbol}{metrics.totalSavings.toFixed(2)}
              </h2>
              <span className="text-[10px] font-semibold text-teal-500 flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" /> Cumulative Fund Stash
              </span>
            </div>

            <div className="glass-panel p-5 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Total Purchases</span>
                <div className="bg-blue-500/15 text-blue-600 dark:text-blue-400 p-1 rounded-lg">
                  <ShoppingBag className="h-4.5 w-4.5" />
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-sans">
                {currencySymbol}{metrics.totalPurchases.toFixed(2)}
              </h2>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Nursery equipment & gear expenses</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Healthcare & Medical</span>
                <div className="bg-purple-500/15 text-purple-600 dark:text-purple-400 p-1 rounded-lg">
                  <Heart className="h-4.5 w-4.5" />
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-sans">
                {currencySymbol}{metrics.totalMedical.toFixed(2)}
              </h2>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Midwife, ultrasound & GP costs</span>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white p-5 rounded-2xl border border-white/10 dark:border-slate-800/35 shadow-sm space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Baby Balance</span>
              <h2 className="text-xl font-black font-sans">
                {currencySymbol}{metrics.currentBalance.toFixed(2)}
              </h2>

              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${metrics.currentBalance >= 0 ? "text-teal-400" : "text-rose-400"}`}>
                {metrics.currentBalance >= 0 ? (
                  <><ArrowUpRight className="h-3 w-3" /> Budget is in surplus</>
                ) : (
                  <><ArrowDownRight className="h-3 w-3" /> Budget is in deficit</>
                )}
              </span>
            </div>
          </div>

          {/* Visual Charts: Recharts Pie & Bar */}
          {finances.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contributions Pie Chart */}
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Savings Contribution Breakdown (Husband vs Wife)
                </h3>
                <div className="h-64">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      No savings logs recorded yet to display contribution split.
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly Breakdown Chart */}
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Monthly Budget Breakdown (Savings vs Expenses)
                </h3>
                <div className="h-64">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="savings" name="Deposited Savings" fill="#0d9488" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Shopping & Medical Costs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      Not enough transaction history to draw a monthly breakdown.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filtering controls panel */}
          <div className="glass-panel p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
              <input
                id="search-finances"
                type="text"
                placeholder="Search transaction..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none"
              />
            </div>

            {/* Contributor filter */}
            <select
              id="filter-contrib"
              value={filterContributor}
              onChange={(e) => setFilterContributor(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs focus:outline-none"
            >
              <option value="">All Contributors</option>
              <option value="both">Both (Shared)</option>
              <option value="husband">Husband</option>
              <option value="wife">Wife</option>
            </select>

            {/* Category filter */}
            <select
              id="filter-cat"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="savings">Savings Fund</option>
              <option value="purchase">Nursery Purchase</option>
              <option value="medical">Medical / Healthcare</option>
              <option value="other">Other Baby Expense</option>
            </select>

            {/* Date starts */}
            <input
              id="fin-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs focus:outline-none"
            />

            {/* Date ends */}
            <input
              id="fin-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs focus:outline-none"
            />
          </div>

          {/* Transactions Ledger List */}
          {filteredFinances.length > 0 ? (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/20 dark:bg-slate-900/20 border-b border-white/10 dark:border-slate-800/10 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="p-4">Date</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Contributor</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/15 dark:divide-slate-800/15 text-xs">
                    {filteredFinances.map((item) => (
                      <tr key={item.id} className="hover:bg-white/30 dark:hover:bg-slate-850/10 transition-colors">
                        <td className="p-4 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(item.transaction_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="p-4">
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-200 block">{item.description}</span>
                            {item.notes && <span className="text-[10px] text-slate-450 dark:text-slate-400 block max-w-xs truncate italic">"{item.notes}"</span>}
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                            item.category === "savings" ? "bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30" :
                            item.category === "purchase" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30" :
                            item.category === "medical" ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30" :
                            "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30"
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap uppercase tracking-wider text-[9px]">
                          {item.contributed_by === "husband" ? "👨 Husband" : item.contributed_by === "wife" ? "👩‍🦰 Wife" : "🤝 Both"}
                        </td>
                        <td className={`p-4 text-right font-black text-sm whitespace-nowrap ${
                          item.category === "savings" ? "text-teal-600 dark:text-teal-400" : "text-amber-650 dark:text-amber-500"
                        }`}>
                          {item.category === "savings" ? "+" : "-"}{currencySymbol}{item.amount.toFixed(2)}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            <button
                              id={`btn-edit-fin-${item.id}`}
                              onClick={() => handleEdit(item)}
                              className="p-1 text-slate-500 hover:text-teal-600 rounded-lg transition-all hover:bg-white/40 cursor-pointer"
                              title="Edit transaction"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              id={`btn-delete-fin-${item.id}`}
                              onClick={() => handleDelete(item.id)}
                              className="p-1 text-rose-500 hover:text-rose-650 rounded-lg transition-all hover:bg-white/40 cursor-pointer"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-panel text-center py-12 rounded-2xl space-y-2">
              <PiggyBank className="h-12 w-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350">No Transactions Found</h3>
              <p className="text-slate-400 text-xs">There are no financial transactions matching your filters or recorded in your fund yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
