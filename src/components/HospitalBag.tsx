import React, { useState, useMemo } from "react";
import { HospitalBagItem } from "../types";
import { api } from "../lib/api";
import { 
  ClipboardList, 
  Trash2, 
  Edit3, 
  Plus, 
  CheckSquare, 
  Square, 
  X, 
  Baby, 
  User, 
  Heart, 
  FileText, 
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HospitalBagProps {
  bagItems: HospitalBagItem[];
  onRefresh: () => Promise<void>;
}

export default function HospitalBag({ bagItems, onRefresh }: HospitalBagProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<HospitalBagItem | null>(null);

  // Form states
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<'mother' | 'baby' | 'documents' | 'other'>('baby');

  const [loading, setLoading] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<'all' | 'mother' | 'baby' | 'documents' | 'other'>('all');

  // Custom confirmation modal states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<HospitalBagItem | null>(null);

  // Submit hospital bag item
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      item_name: itemName,
      category,
      is_packed: editingItem ? editingItem.is_packed : false
    };

    try {
      if (editingItem) {
        await api.updateHospitalBagItem(editingItem.id, payload);
      } else {
        await api.createHospitalBagItem(payload);
      }
      await onRefresh();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save hospital bag item.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: HospitalBagItem) => {
    setEditingItem(item);
    setItemName(item.item_name);
    setCategory(item.category);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    const item = bagItems.find(i => i.id === id);
    if (item) {
      setItemToDelete(item);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteHospitalBagItem(itemToDelete.id);
      await onRefresh();
    } catch (err: any) {
      alert("Failed to delete hospital bag item");
    } finally {
      setItemToDelete(null);
    }
  };

  // Quick toggle packed status
  const handleTogglePacked = async (item: HospitalBagItem) => {
    try {
      await api.updateHospitalBagItem(item.id, { is_packed: !item.is_packed });
      await onRefresh();
    } catch (err: any) {
      alert("Failed to update packing status");
    }
  };

  // Prepopulate standard recommendations using backend endpoint
  const handleLoadDefaults = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setShowResetConfirm(false);
    setPopulating(true);
    try {
      await api.resetHospitalBag();
      await onRefresh();
    } catch (err: any) {
      alert("Failed to pre-populate list: " + err.message);
    } finally {
      setPopulating(false);
    }
  };

  const confirmClearAll = async () => {
    setShowClearAllConfirm(false);
    setPopulating(true);
    try {
      await api.clearHospitalBag();
      await onRefresh();
    } catch (err: any) {
      alert("Failed to clear hospital bag checklist: " + err.message);
    } finally {
      setPopulating(false);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingItem(null);
    setItemName("");
    setCategory("baby");
    setError("");
  };

  // Filter items
  const filteredItems = useMemo(() => {
    if (activeTab === "all") return bagItems;
    return bagItems.filter(item => item.category === activeTab);
  }, [bagItems, activeTab]);

  // Calculations
  const stats = useMemo(() => {
    const total = bagItems.length;
    const packed = bagItems.filter(i => i.is_packed).length;
    const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
    return { total, packed, percentage };
  }, [bagItems]);

  const categoryStats = (cat: string) => {
    const items = bagItems.filter(i => i.category === cat);
    const total = items.length;
    const packed = items.filter(i => i.is_packed).length;
    const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
    return { total, packed, percentage };
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "mother": return "text-pink-600 bg-pink-50 border-pink-100";
      case "baby": return "text-blue-600 bg-blue-50 border-blue-100";
      case "documents": return "text-amber-600 bg-amber-50 border-amber-100";
      default: return "text-emerald-600 bg-emerald-50 border-emerald-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-teal-500" /> Hospital Bag Packing List
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Pack with confidence for labor, delivery, and post-partum recovery. Use the quick-sync checklist to share packed statuses between parents.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            id="btn-load-defaults"
            disabled={populating}
            onClick={handleLoadDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 dark:text-teal-400 bg-white/40 dark:bg-slate-850/40 hover:bg-white/60 rounded-xl transition-all border border-white/50 dark:border-slate-700/50 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${populating ? "animate-spin" : ""}`} /> Load Recommendations
          </button>

          {bagItems.length > 0 && (
            <button
              id="btn-clear-all"
              disabled={populating}
              onClick={() => setShowClearAllConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-800 dark:text-rose-400 bg-rose-50/45 dark:bg-rose-950/20 hover:bg-rose-100 rounded-xl transition-all border border-rose-200/50 dark:border-rose-900/30 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete All
            </button>
          )}

          {!isAdding && (
            <button
              id="btn-add-bag-item"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-650 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Custom Item
            </button>
          )}
        </div>
      </div>

      {/* Progress Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Overall Progress Card */}
        <div className="col-span-2 lg:col-span-1 glass-panel p-4 rounded-2xl flex flex-col justify-between space-y-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Overall Progress</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.percentage}%</span>
            <span className="text-xs text-slate-400 font-semibold">({stats.packed}/{stats.total})</span>
          </div>
          <div className="w-full bg-slate-150/40 dark:bg-slate-800/40 h-2 rounded-full overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.percentage}%` }} />
          </div>
        </div>

        {/* Mother Progress Card */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between space-y-3">
          <span className="text-[10px] uppercase font-bold text-pink-400 block tracking-wide">For Mother</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">{categoryStats("mother").percentage}%</span>
            <span className="text-[10px] text-slate-400 font-semibold">({categoryStats("mother").packed}/{categoryStats("mother").total})</span>
          </div>
          <div className="w-full bg-pink-100/30 dark:bg-pink-950/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-pink-500 h-full rounded-full" style={{ width: `${categoryStats("mother").percentage}%` }} />
          </div>
        </div>

        {/* Baby Progress Card */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between space-y-3">
          <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wide">For Baby</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">{categoryStats("baby").percentage}%</span>
            <span className="text-[10px] text-slate-400 font-semibold">({categoryStats("baby").packed}/{categoryStats("baby").total})</span>
          </div>
          <div className="w-full bg-blue-100/30 dark:bg-blue-950/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${categoryStats("baby").percentage}%` }} />
          </div>
        </div>

        {/* Documents Card */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between space-y-3">
          <span className="text-[10px] uppercase font-bold text-amber-500 block tracking-wide">Documents</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">{categoryStats("documents").percentage}%</span>
            <span className="text-[10px] text-slate-400 font-semibold">({categoryStats("documents").packed}/{categoryStats("documents").total})</span>
          </div>
          <div className="w-full bg-amber-100/30 dark:bg-amber-950/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${categoryStats("documents").percentage}%` }} />
          </div>
        </div>

        {/* Partner Card */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between space-y-3">
          <span className="text-[10px] uppercase font-bold text-teal-400 block tracking-wide">Partner</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">{categoryStats("other").percentage}%</span>
            <span className="text-[10px] text-slate-400 font-semibold">({categoryStats("other").packed}/{categoryStats("other").total})</span>
          </div>
          <div className="w-full bg-emerald-100/30 dark:bg-emerald-950/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${categoryStats("other").percentage}%` }} />
          </div>
        </div>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-5 rounded-3xl"
        >
          <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
              {editingItem ? "Edit Hospital Bag Item" : "Add Custom Bag Checklist Item"}
            </h3>
            <button
              id="btn-close-bag-form"
              onClick={resetForm}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <form id="bag-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-2 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Item Description
                </label>
                <input
                  id="input-bag-item-name"
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Toothbrush, Swaddle blankets, Camera battery charger"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Category Checklist
                </label>
                <select
                  id="select-bag-item-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                >
                  <option value="mother">🤰 Mother / Laboring Parent</option>
                  <option value="baby">👶 Newborn Baby</option>
                  <option value="documents">📋 Essential Documents / Birth Plan</option>
                  <option value="other">👨 Husband / Birth Partner</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-50">
              <button
                id="btn-save-bag"
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : editingItem ? "Update Item" : "Add to Bag"}
              </button>
              <button
                id="btn-cancel-bag"
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Checklist List Feed */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-white/20 dark:border-slate-800/30 bg-white/20 dark:bg-slate-900/10 p-2 overflow-x-auto gap-1">
          <button
            id="tab-bag-all"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer border ${
              activeTab === "all" ? "bg-white/60 dark:bg-slate-800/60 text-teal-700 dark:text-teal-400 shadow-sm border-white/50 dark:border-slate-700/50" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent"
            }`}
          >
            All Items ({bagItems.length})
          </button>
          <button
            id="tab-bag-mother"
            onClick={() => setActiveTab("mother")}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer border ${
              activeTab === "mother" ? "bg-white/60 dark:bg-slate-800/60 text-pink-600 dark:text-pink-400 shadow-sm border-white/50 dark:border-slate-700/50" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent"
            }`}
          >
            For Mother ({bagItems.filter(i => i.category === "mother").length})
          </button>
          <button
            id="tab-bag-baby"
            onClick={() => setActiveTab("baby")}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer border ${
              activeTab === "baby" ? "bg-white/60 dark:bg-slate-800/60 text-blue-600 dark:text-blue-400 shadow-sm border-white/50 dark:border-slate-700/50" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent"
            }`}
          >
            For Baby ({bagItems.filter(i => i.category === "baby").length})
          </button>
          <button
            id="tab-bag-docs"
            onClick={() => setActiveTab("documents")}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer border ${
              activeTab === "documents" ? "bg-white/60 dark:bg-slate-800/60 text-amber-600 dark:text-amber-400 shadow-sm border-white/50 dark:border-slate-700/50" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent"
            }`}
          >
            Documents ({bagItems.filter(i => i.category === "documents").length})
          </button>
          <button
            id="tab-bag-other"
            onClick={() => setActiveTab("other")}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer border ${
              activeTab === "other" ? "bg-white/60 dark:bg-slate-800/60 text-teal-700 dark:text-teal-400 shadow-sm border-white/50 dark:border-slate-700/50" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent"
            }`}
          >
            Partner ({bagItems.filter(i => i.category === "other").length})
          </button>
        </div>

        {filteredItems.length > 0 ? (
          <div className="divide-y divide-white/10 dark:divide-slate-800/20 max-h-[500px] overflow-y-auto">
            {filteredItems.map((item) => {
              const badgeColors = getCategoryColor(item.category);
              const isPacked = item.is_packed;

              return (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-4 transition-all hover:bg-white/30 dark:hover:bg-slate-800/10 ${
                    isPacked ? "bg-white/10 dark:bg-slate-900/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      id={`btn-pack-toggle-${item.id}`}
                      onClick={() => handleTogglePacked(item)}
                      className="text-slate-400 hover:text-emerald-500 transition-colors shrink-0 cursor-pointer"
                    >
                      {isPacked ? (
                        <CheckSquare className="h-5 w-5 text-emerald-500 fill-emerald-50" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <span className={`text-xs font-bold block truncate ${
                        isPacked ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"
                      }`}>
                        {item.item_name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase tracking-wide border ${badgeColors}`}>
                          {item.category === "other" ? "Partner" : item.category}
                        </span>
                        {item.is_custom && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded font-semibold uppercase">Custom</span>
                        )}
                        {item.packed_date && (
                          <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Packed {new Date(item.packed_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-3 shrink-0">
                    <button
                      id={`btn-edit-bag-${item.id}`}
                      onClick={() => handleEdit(item)}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      id={`btn-delete-bag-${item.id}`}
                      onClick={() => handleDelete(item.id)}
                      className="p-1 hover:bg-slate-100 text-rose-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 text-xs">
            <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2 fill-slate-50" />
            <h3 className="text-slate-700 font-bold mb-1">Checklist is Empty</h3>
            <span>No items found for this checklist. Click "Load Recommendations" or add your custom items.</span>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6"
            >
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto border border-teal-100 dark:border-teal-900/30">
                  <RefreshCw className="h-5 w-5 animate-spin-slow" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Load Recommended Items?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    This will restore standard recommended items into your hospital bag checklist. Your custom items will be preserved.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    id="btn-confirm-reset"
                    onClick={confirmReset}
                    className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Load Recommendations
                  </button>
                  <button
                    id="btn-cancel-reset"
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Item Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6"
            >
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Delete Bag Item?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-300">"{itemToDelete.item_name}"</span>? This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    id="btn-confirm-delete"
                    onClick={confirmDelete}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Delete Item
                  </button>
                  <button
                    id="btn-cancel-delete"
                    onClick={() => setItemToDelete(null)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearAllConfirm && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6"
            >
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Delete All Packing Items?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-300">all {bagItems.length} items</span> from your checklist? This will clear your entire list and cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    id="btn-confirm-clear-all"
                    onClick={confirmClearAll}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Delete All
                  </button>
                  <button
                    id="btn-cancel-clear-all"
                    onClick={() => setShowClearAllConfirm(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
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
