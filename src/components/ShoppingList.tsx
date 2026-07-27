import React, { useState, useMemo } from "react";
import { ShoppingItem } from "../types";
import { api } from "../lib/api";
import { 
  ShoppingBag, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  CheckSquare, 
  Square, 
  DollarSign, 
  ArrowUpDown, 
  Layers, 
  AlertTriangle,
  FileText,
  X,
  Store,
  HelpCircle,
  TrendingDown
} from "lucide-react";
import { motion } from "motion/react";

interface ShoppingListProps {
  shoppingItems: ShoppingItem[];
  onRefresh: () => Promise<void>;
  currencySymbol?: string;
}

export default function ShoppingList({ shoppingItems, onRefresh, currencySymbol = "₹" }: ShoppingListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState<'clothing' | 'furniture' | 'toiletries' | 'medical' | 'feeding' | 'transport' | 'other'>('clothing');
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [actualPrice, setActualPrice] = useState("");
  const [vendor, setVendor] = useState("");
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState("");
  const [autoLogFinance, setAutoLogFinance] = useState(true);

  // Search, Filter, Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'pending', 'purchased'
  const [sortBy, setSortBy] = useState("created_at"); // 'price_est', 'priority', 'created_at', 'name'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Submit shopping item
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      item_name: itemName,
      quantity: parseInt(quantity as any) || 1,
      category,
      estimated_price: parseFloat(estimatedPrice) || 0,
      actual_price: parseFloat(actualPrice) || 0,
      vendor,
      priority,
      notes,
      auto_log_to_finances: autoLogFinance
    };

    try {
      if (editingItem) {
        await api.updateShoppingItem(editingItem.id, payload);
      } else {
        await api.createShoppingItem(payload);
      }
      await onRefresh();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save shopping list item.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setItemName(item.item_name);
    setQuantity(item.quantity);
    setCategory(item.category);
    setEstimatedPrice(item.estimated_price.toString());
    setActualPrice(item.actual_price?.toString() || "");
    setVendor(item.vendor || "");
    setPriority(item.priority);
    setNotes(item.notes || "");
    setAutoLogFinance(false); // disable auto-log on edits unless ticked from list
    setIsAdding(true);
  };

  const handleDelete = async (id: string, bypassConfirm = false) => {
    if (!bypassConfirm) {
      setConfirmDeleteId(id);
      return;
    }
    try {
      await api.deleteShoppingItem(id);
      await onRefresh();
    } catch (err: any) {
      console.error("Failed to delete shopping item", err);
    }
  };

  // Quick toggle purchased status directly from ledger
  const handleTogglePurchased = async (item: ShoppingItem) => {
    const newPurchased = !item.purchased;
    const priceToLog = item.actual_price || item.estimated_price || 0;
    
    try {
      await api.updateShoppingItem(item.id, {
        purchased: newPurchased,
        purchase_date: newPurchased ? new Date().toISOString().split("T")[0] : "",
        actual_price: newPurchased && !item.actual_price ? item.estimated_price : item.actual_price,
        auto_log_to_finances: newPurchased // auto log to finances when ticking!
      });
      await onRefresh();
    } catch (err: any) {
      alert("Failed to update purchased status");
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingItem(null);
    setItemName("");
    setQuantity(1);
    setCategory("clothing");
    setEstimatedPrice("");
    setActualPrice("");
    setVendor("");
    setPriority("medium");
    setNotes("");
    setAutoLogFinance(true);
    setError("");
  };

  // Filter & Sort shopping list items
  const processedItems = useMemo(() => {
    let result = shoppingItems.filter((item) => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.vendor.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = filterCategory ? item.category === filterCategory : true;
      const matchesPriority = filterPriority ? item.priority === filterPriority : true;

      let matchesStatus = true;
      if (filterStatus === "pending") matchesStatus = !item.purchased;
      else if (filterStatus === "purchased") matchesStatus = item.purchased;

      return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "price_est") {
        comparison = a.estimated_price - b.estimated_price;
      } else if (sortBy === "name") {
        comparison = a.item_name.localeCompare(b.item_name);
      } else if (sortBy === "priority") {
        const priorityVal = { high: 3, medium: 2, low: 1 };
        comparison = priorityVal[a.priority] - priorityVal[b.priority];
      } else {
        // default: created_at
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [shoppingItems, searchQuery, filterCategory, filterPriority, filterStatus, sortBy, sortOrder]);

  // Overall statistics for budget
  const shoppingStats = useMemo(() => {
    let totalEstimated = 0;
    let totalActual = 0;
    let totalPendingCount = 0;
    let totalPurchasedCount = 0;

    shoppingItems.forEach((item) => {
      const costEst = item.estimated_price * item.quantity;
      totalEstimated += costEst;

      if (item.purchased) {
        totalPurchasedCount += item.quantity;
        totalActual += (item.actual_price || item.estimated_price) * item.quantity;
      } else {
        totalPendingCount += item.quantity;
      }
    });

    return {
      totalEstimated,
      totalActual,
      totalPendingCount,
      totalPurchasedCount
    };
  }, [shoppingItems]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // PDF Exporter
  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const pendingItems = processedItems.filter((item) => !item.purchased);
    const acquiredItems = processedItems.filter((item) => item.purchased);

    // Calculate category estimated distributions
    const catEstimates: Record<string, number> = {
      clothing: 0,
      furniture: 0,
      toiletries: 0,
      medical: 0,
      feeding: 0,
      transport: 0,
      other: 0
    };
    
    processedItems.forEach(item => {
      const cat = item.category || 'other';
      if (catEstimates[cat] !== undefined) {
        catEstimates[cat] += item.estimated_price * item.quantity;
      } else {
        catEstimates['other'] += item.estimated_price * item.quantity;
      }
    });

    const totalEstVal = Object.values(catEstimates).reduce((a, b) => a + b, 0);
    const getCatPct = (cat: string) => {
      const val = catEstimates[cat] || 0;
      return totalEstVal > 0 ? ((val / totalEstVal) * 100).toFixed(1) : "0";
    };

    // Calculate priority breakdown
    const priorityCounts = { high: 0, medium: 0, low: 0 };
    processedItems.forEach(item => {
      if (priorityCounts[item.priority] !== undefined) {
        priorityCounts[item.priority] += item.quantity;
      }
    });
    const totalQty = processedItems.reduce((acc, item) => acc + item.quantity, 0);
    const getPriorityPct = (pri: 'high' | 'medium' | 'low') => {
      return totalQty > 0 ? ((priorityCounts[pri] / totalQty) * 100).toFixed(1) : "0";
    };

    // Create the HTML document
    printWindow.document.write(`
      <html>
        <head>
          <title>Baby Equipment Shopping Report - Kunju Baby</title>
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
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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

            .priority-row {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .priority-card {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 10px 14px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              background: #ffffff;
            }

            .priority-badge-dot {
              display: inline-block;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              margin-right: 6px;
            }

            .priority-badge-dot.high { background-color: #f43f5e; }
            .priority-badge-dot.medium { background-color: #f59e0b; }
            .priority-badge-dot.low { background-color: #64748b; }

            .priority-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #475569;
              display: flex;
              align-items: center;
            }

            .priority-val {
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
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

            .got-icon {
              font-size: 14px;
              font-weight: 800;
              text-align: center;
            }

            .got-icon.yes { color: #10b981; }
            .got-icon.no { color: #94a3b8; }

            .cat-badge {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 3px 6px;
              border-radius: 6px;
              display: inline-block;
            }

            .cat-clothing { background: #dbeafe; color: #1d4ed8; }
            .cat-furniture { background: #e0e7ff; color: #4338ca; }
            .cat-toiletries { background: #e2fbf5; color: #0f766e; }
            .cat-medical { background: #fee2e2; color: #b91c1c; }
            .cat-feeding { background: #fef3c7; color: #b45309; }
            .cat-transport { background: #f3e8ff; color: #6b21a8; }
            .cat-other { background: #f1f5f9; color: #475569; }

            .priority-badge {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 3px 6px;
              border-radius: 6px;
              display: inline-block;
            }

            .pri-high { background: #ffe4e6; color: #be123c; }
            .pri-medium { background: #fef3c7; color: #b45309; }
            .pri-low { background: #f1f5f9; color: #475569; }

            .vendor-span {
              font-size: 11px;
              color: #64748b;
              font-weight: 600;
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <div class="title-section">
                  <h1>Baby Equipment & Gear List</h1>
                  <p>Checklist tracker, price estimates, nurseries, apparel & gear budgets</p>
                </div>
              </div>
              <div class="badge">Kunju Baby Planner</div>
            </div>

            <!-- Key Metric Cards -->
            <div class="grid-metrics">
              <div class="metric-card balance">
                <div class="metric-label">Total Estimated Budget</div>
                <div class="metric-val">${currencySymbol}${shoppingStats.totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div class="metric-card savings">
                <div class="metric-label">Actual Paid So Far</div>
                <div class="metric-val">${currencySymbol}${shoppingStats.totalActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div class="metric-card expenses">
                <div class="metric-label">Equipment Acquired</div>
                <div class="metric-val">${shoppingStats.totalPurchasedCount} <span style="font-size: 12px; opacity: 0.8; font-weight: 600;">/ pending: ${shoppingStats.totalPendingCount}</span></div>
              </div>
            </div>

            <h2 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
              Shopping Analytics Dashboard
            </h2>

            <!-- Visual Charts Row -->
            <div class="dashboard-row">
              <!-- Left Chart: Category Estimated Distribution -->
              <div class="dashboard-card">
                <div class="chart-title">Estimated Budget by Category</div>
                
                <div class="progress-item">
                  <div class="progress-meta">
                    <span>👕 Clothing & Apparel</span>
                    <span>${getCatPct("clothing")}%</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" style="width: ${getCatPct("clothing")}%; background-color: #3b82f6;"></div>
                  </div>
                </div>

                <div class="progress-item">
                  <div class="progress-meta">
                    <span>🛏️ Furniture & Nursery</span>
                    <span>${getCatPct("furniture")}%</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" style="width: ${getCatPct("furniture")}%; background-color: #4f46e5;"></div>
                  </div>
                </div>

                <div class="progress-item">
                  <div class="progress-meta">
                    <span>🧴 Toiletries & Hygiene</span>
                    <span>${getCatPct("toiletries")}%</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" style="width: ${getCatPct("toiletries")}%; background-color: #0d9488;"></div>
                  </div>
                </div>

                <div class="progress-item">
                  <div class="progress-meta">
                    <span>🏥 Medical & Safety</span>
                    <span>${getCatPct("medical")}%</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" style="width: ${getCatPct("medical")}%; background-color: #f43f5e;"></div>
                  </div>
                </div>

                <div class="progress-item">
                  <div class="progress-meta">
                    <span>🍼 Feeding Supplies</span>
                    <span>${getCatPct("feeding")}%</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" style="width: ${getCatPct("feeding")}%; background-color: #f59e0b;"></div>
                  </div>
                </div>

                <div class="progress-item">
                  <div class="progress-meta">
                    <span>🚗 Travel & Transport</span>
                    <span>${getCatPct("transport")}%</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" style="width: ${getCatPct("transport")}%; background-color: #a855f7;"></div>
                  </div>
                </div>

                <div class="progress-item" style="margin-bottom: 0;">
                  <div class="progress-meta">
                    <span>📦 Other Accessories</span>
                    <span>${getCatPct("other")}%</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" style="width: ${getCatPct("other")}%; background-color: #64748b;"></div>
                  </div>
                </div>
              </div>

              <!-- Right Chart: Priority Breakdown -->
              <div class="dashboard-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div class="chart-title">Item Quantities by Priority</div>
                  <div class="priority-row">
                    <div class="priority-card" style="border-left: 4px solid #f43f5e;">
                      <div class="priority-label">
                        <span class="priority-badge-dot high"></span>
                        High Priority
                      </div>
                      <div class="priority-val">${priorityCounts.high} items (${getPriorityPct("high")}%)</div>
                    </div>
                    <div class="priority-card" style="border-left: 4px solid #f59e0b;">
                      <div class="priority-label">
                        <span class="priority-badge-dot medium"></span>
                        Medium Priority
                      </div>
                      <div class="priority-val">${priorityCounts.medium} items (${getPriorityPct("medium")}%)</div>
                    </div>
                    <div class="priority-card" style="border-left: 4px solid #64748b;">
                      <div class="priority-label">
                        <span class="priority-badge-dot low"></span>
                        Low Priority
                      </div>
                      <div class="priority-val">${priorityCounts.low} items (${getPriorityPct("low")}%)</div>
                    </div>
                  </div>
                </div>

                <div style="margin-top: 20px; font-size: 11px; line-height: 1.5; color: #64748b; background: #ffffff; padding: 12px; border-radius: 12px; border: 1px dashed #e2e8f0;">
                  <strong>Note:</strong> Logged price estimates sync seamlessly with budget entries when marked as acquired in the checklist.
                </div>
              </div>
            </div>

            <!-- Section 1: Pending Purchases -->
            <h2 class="section-title" style="margin-top: 36px; color: #b45309; border-bottom: 2px solid #fef3c7;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #d97706;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Pending Purchase Checklist (${pendingItems.length} items)
            </h2>

            <table class="ledger-table">
              <thead>
                <tr>
                  <th style="width: 8%; text-align: center;">Status</th>
                  <th style="width: 32%">Item Description</th>
                  <th style="width: 15%">Category</th>
                  <th style="width: 13%">Priority</th>
                  <th style="width: 14%">Vendor/Store</th>
                  <th style="width: 10%; text-align: right;">Est Price</th>
                  <th style="width: 10%; text-align: right;">Est Total</th>
                </tr>
              </thead>
              <tbody>
                ${pendingItems.length > 0 ? pendingItems.map((item) => `
                  <tr>
                    <td class="got-icon no">⏳</td>
                    <td>
                      <strong style="color: #0f172a;">${item.item_name}</strong>
                      ${item.quantity > 1 ? `<span style="font-size: 11px; color: #64748b; font-weight: bold; margin-left: 4px;">(x${item.quantity})</span>` : ""}
                      ${item.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px; font-style: italic;">"${item.notes}"</div>` : ''}
                    </td>
                    <td>
                      <span class="cat-badge cat-${item.category || 'other'}">
                        ${item.category === 'clothing' ? '👕 Clothing' : 
                          item.category === 'furniture' ? '🛏️ Nursery' : 
                          item.category === 'toiletries' ? '🧴 Toiletry' : 
                          item.category === 'medical' ? '🏥 Medical' : 
                          item.category === 'feeding' ? '🍼 Feeding' : 
                          item.category === 'transport' ? '🚗 Travel' : '📦 Other'}
                      </span>
                    </td>
                    <td>
                      <span class="priority-badge pri-${item.priority}">
                        ${item.priority === 'high' ? '🚨 High' : item.priority === 'medium' ? '⚖️ Med' : '🌱 Low'}
                      </span>
                    </td>
                    <td>
                      <span class="vendor-span">${item.vendor || '—'}</span>
                    </td>
                    <td style="text-align: right; font-weight: 700; color: #475569;">
                      ${currencySymbol}${item.estimated_price.toFixed(2)}
                    </td>
                    <td style="text-align: right; font-weight: 800; color: #475569;">
                      ${currencySymbol}${(item.estimated_price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                `).join("") : `
                  <tr>
                    <td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No pending gear items found.</td>
                  </tr>
                `}
              </tbody>
            </table>

            <!-- Section 2: Acquired Equipment & Gear -->
            <h2 class="section-title" style="margin-top: 36px; color: #0f766e; border-bottom: 2px solid #ccfbf1;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #0d9488;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Acquired Equipment & Gear (${acquiredItems.length} items)
            </h2>

            <table class="ledger-table">
              <thead>
                <tr>
                  <th style="width: 8%; text-align: center;">Status</th>
                  <th style="width: 32%">Item Description</th>
                  <th style="width: 15%">Category</th>
                  <th style="width: 13%">Priority</th>
                  <th style="width: 14%">Vendor/Store</th>
                  <th style="width: 10%; text-align: right;">Est Cost</th>
                  <th style="width: 10%; text-align: right;">Paid Price</th>
                </tr>
              </thead>
              <tbody>
                ${acquiredItems.length > 0 ? acquiredItems.map((item) => `
                  <tr>
                    <td class="got-icon yes">✔</td>
                    <td>
                      <strong style="color: #0f172a;">${item.item_name}</strong>
                      ${item.quantity > 1 ? `<span style="font-size: 11px; color: #64748b; font-weight: bold; margin-left: 4px;">(x${item.quantity})</span>` : ""}
                      ${item.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px; font-style: italic;">"${item.notes}"</div>` : ''}
                    </td>
                    <td>
                      <span class="cat-badge cat-${item.category || 'other'}">
                        ${item.category === 'clothing' ? '👕 Clothing' : 
                          item.category === 'furniture' ? '🛏️ Nursery' : 
                          item.category === 'toiletries' ? '🧴 Toiletry' : 
                          item.category === 'medical' ? '🏥 Medical' : 
                          item.category === 'feeding' ? '🍼 Feeding' : 
                          item.category === 'transport' ? '🚗 Travel' : '📦 Other'}
                      </span>
                    </td>
                    <td>
                      <span class="priority-badge pri-${item.priority}">
                        ${item.priority === 'high' ? '🚨 High' : item.priority === 'medium' ? '⚖️ Med' : '🌱 Low'}
                      </span>
                    </td>
                    <td>
                      <span class="vendor-span">${item.vendor || '—'}</span>
                    </td>
                    <td style="text-align: right; font-weight: 700; color: #475569;">
                      ${currencySymbol}${(item.estimated_price * item.quantity).toFixed(2)}
                    </td>
                    <td style="text-align: right; font-weight: 800; color: #10b981;">
                      +${currencySymbol}${( (item.actual_price || item.estimated_price) * item.quantity ).toFixed(2)}
                    </td>
                  </tr>
                `).join("") : `
                  <tr>
                    <td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No acquired gear items yet.</td>
                  </tr>
                `}
              </tbody>
            </table>

            <div class="footer">
              <span>Prepared with</span>
              <svg class="footer-heart" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span>for Kunju Baby • Equipment & Nursery Planner</span>
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
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Baby Equipment Shopping List
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Preload categories (clothing, crib, stroller) and log price estimates. Purchases can auto-sync as budget expenses!
          </p>
        </div>
        {!isAdding && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-print-shopping-list"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200/55 rounded-xl transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4" /> Download PDF
            </button>
            <button
              id="btn-add-shopping-item"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-650 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" /> Add Equipment
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
              {editingItem ? "Edit Shopping Item" : "Add Baby Equipment Item"}
            </h2>
            <button
              id="btn-close-shop-form"
              onClick={resetForm}
              className="p-1.5 hover:bg-white/30 dark:hover:bg-slate-800/30 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form id="shopping-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Item Name
                </label>
                <input
                  id="input-shop-name"
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Newborn Swaddles, Car Seat, Stroller"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Quantity
                  </label>
                  <input
                    id="input-shop-qty"
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Priority Level
                  </label>
                  <select
                    id="select-shop-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                  >
                    <option value="high">🚨 High Priority</option>
                    <option value="medium">⚖️ Medium Priority</option>
                    <option value="low">🌱 Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Preloaded Category
                </label>
                <select
                  id="select-shop-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                >
                  <option value="clothing">👕 Clothing (0-6 Months sleepsuits etc.)</option>
                  <option value="furniture">🛏️ Furniture (Crib, changer, glider)</option>
                  <option value="toiletries">🧴 Toiletries (Baby baths, sensitive oils)</option>
                  <option value="medical">🏥 Medical (Thermometer, nasal inhaler)</option>
                  <option value="feeding">🍼 Feeding (Bottles, nursing shields)</option>
                  <option value="transport">🚗 Transport (Stroller, infant car seat)</option>
                  <option value="other">📦 Other Accessories</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Est. Single Price ($)
                  </label>
                  <input
                    id="input-shop-est-price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    placeholder="e.g. 45.00"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Actual Single Paid ($) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="input-shop-act-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={actualPrice}
                    onChange={(e) => setActualPrice(e.target.value)}
                    placeholder="e.g. 42.50"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Vendor / Store Link
                </label>
                <div className="relative">
                  <Store className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                  <input
                    id="input-shop-vendor"
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g. Amazon, Mothercare, Bugaboo"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Linking check box to sync with finances */}
            {!editingItem && (
              <div className="bg-white/10 dark:bg-slate-900/15 p-4 rounded-xl border border-white/20 dark:border-slate-800/20 flex items-start gap-3">
                <input 
                  id="checkbox-auto-log"
                  type="checkbox" 
                  checked={autoLogFinance} 
                  onChange={(e) => setAutoLogFinance(e.target.checked)}
                  className="h-4 w-4 text-teal-500 focus:ring-teal-400 border-slate-300 dark:border-slate-700 rounded mt-0.5 cursor-pointer"
                />
                <div className="space-y-1">
                  <label htmlFor="checkbox-auto-log" className="text-xs font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">
                    Auto-log to Financial Tracker when purchased?
                  </label>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    When you check off this item as "purchased", an expense will automatically be added to your finances stashed contributions!
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Notes or Specifications
              </label>
              <textarea
                id="input-shop-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sizes, colors, safety certifications..."
                className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-800/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/20 dark:border-slate-800/30">
              <button
                id="btn-save-shop-item"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
              </button>
              <button
                id="btn-cancel-shop-form"
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
        /* Grid Display & Metrics */
        <div className="space-y-6">
          {/* Summary Dashboard Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Est. Budget</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">{currencySymbol}{shoppingStats.totalEstimated.toFixed(2)}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Actual Paid So Far</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">{currencySymbol}{shoppingStats.totalActual.toFixed(2)}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl">

              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Items Acquired</span>
              <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                {shoppingStats.totalPurchasedCount} <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">pending: {shoppingStats.totalPendingCount}</span>
              </span>
            </div>
          </div>

          {/* Search, filters, sorting controls */}
          <div className="glass-panel p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
              <input
                id="search-shopping"
                type="text"
                placeholder="Search shopping list..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none"
              />
            </div>

            {/* Filter Category */}
            <select
              id="filter-shop-cat"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="clothing">👕 Clothing</option>
              <option value="furniture">🛏️ Furniture</option>
              <option value="toiletries">🧴 Toiletries</option>
              <option value="medical">🏥 Medical</option>
              <option value="feeding">🍼 Feeding</option>
              <option value="transport">🚗 Transport</option>
              <option value="other">📦 Other</option>
            </select>

            {/* Filter Priority */}
            <select
              id="filter-shop-priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="high">🚨 High</option>
              <option value="medium">⚖️ Medium</option>
              <option value="low">🌱 Low</option>
            </select>

            {/* Filter Status */}
            <select
              id="filter-shop-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs focus:outline-none"
            >
              <option value="all">All Items</option>
              <option value="pending">⏳ Pending/Wanted</option>
              <option value="purchased">✅ Acquired/Purchased</option>
            </select>

            {/* Sort by */}
            <select
              id="sort-shop-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-650 text-xs focus:outline-none font-semibold text-slate-800"
            >
              <option value="created_at">📅 Date Added</option>
              <option value="price_est">💲 Price</option>
              <option value="priority">🚨 Priority</option>
              <option value="name">🔤 Item Name</option>
            </select>
          </div>

          {/* List display */}
          {processedItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-2xl border transition-all flex justify-between gap-4 glass-panel ${
                    item.purchased 
                      ? "opacity-60 bg-white/10 dark:bg-slate-900/10" 
                      : item.priority === "high" 
                      ? "border-rose-450 bg-rose-500/5 dark:bg-rose-950/5 hover:border-rose-500" 
                      : "hover:border-white/40 dark:hover:border-slate-850/40"
                  }`}
                >
                  <div className="flex gap-3 min-w-0 flex-1">
                    {/* Tick Checkbox */}
                    <button
                      id={`btn-tick-shop-${item.id}`}
                      onClick={() => handleTogglePurchased(item)}
                      className="p-1 text-slate-400 hover:text-teal-500 rounded-lg self-start shrink-0 cursor-pointer"
                      title={item.purchased ? "Mark pending" : "Mark purchased"}
                    >
                      {item.purchased ? (
                        <CheckSquare className="h-5 w-5 text-teal-600 dark:text-teal-400 fill-teal-50/10" />
                      ) : (
                        <Square className="h-5 w-5 hover:border-slate-400 rounded transition-all text-slate-400 dark:text-slate-500" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-xs ${item.purchased ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
                          {item.item_name} {item.quantity > 1 ? `(x${item.quantity})` : ""}
                        </span>
                        
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${
                          item.priority === "high" ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30" :
                          item.priority === "medium" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30" :
                          "bg-slate-500/15 text-slate-600 dark:text-slate-350 border border-slate-500/30"
                        }`}>
                          {item.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                        <span className="uppercase">{item.category}</span>
                        {item.vendor && (
                          <span className="flex items-center gap-0.5 max-w-xs truncate text-slate-500 dark:text-slate-400">
                            🏢 {item.vendor}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-slate-550 dark:text-slate-400 line-clamp-2 italic">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financial Side Panel */}
                  <div className="flex flex-col justify-between items-end shrink-0 text-right space-y-2">
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {item.purchased ? "Paid" : "Est. Cost"}
                      </span>
                      <span className={`text-xs font-black ${item.purchased ? "text-teal-600 dark:text-teal-400" : "text-slate-700 dark:text-slate-200"}`}>
                        {currencySymbol}{(item.purchased ? (item.actual_price || item.estimated_price) : item.estimated_price).toFixed(2)}
                      </span>
                      {item.purchased && item.actual_price !== undefined && item.actual_price !== item.estimated_price && (
                        <span className="block text-[9px] text-slate-400 dark:text-slate-500">
                          Est: {currencySymbol}{item.estimated_price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {confirmDeleteId === item.id ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-xl border border-rose-200/50">
                          <span className="text-[10px] font-bold text-rose-600">Delete?</span>
                          <button
                            id={`btn-confirm-delete-${item.id}`}
                            onClick={() => handleDelete(item.id, true)}
                            className="text-[10px] font-black text-rose-500 hover:text-rose-700 bg-rose-100/50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            id={`btn-cancel-delete-${item.id}`}
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            id={`btn-edit-shop-${item.id}`}
                            onClick={() => handleEdit(item)}
                            className="p-1 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-white/30 cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            id={`btn-delete-shop-${item.id}`}
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1 text-rose-500 hover:text-rose-650 rounded-lg hover:bg-white/30 cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel text-center py-12 rounded-2xl space-y-2">
              <ShoppingBag className="h-12 w-12 text-slate-300 dark:text-slate-650 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Items Found</h3>
              <p className="text-slate-400 text-xs">There are no shopping checklist items logged in this category or search filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
