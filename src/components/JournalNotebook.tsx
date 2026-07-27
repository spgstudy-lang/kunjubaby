import React, { useState, useMemo } from "react";
import { JournalNote } from "../types";
import { api } from "../lib/api";
import { 
  BookOpen, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Calendar, 
  X, 
  Upload, 
  Camera, 
  Tag, 
  Smile, 
  Heart, 
  ShieldAlert, 
  Bookmark,
  ChevronRight,
  Pin
} from "lucide-react";
import { motion } from "motion/react";

interface JournalNotebookProps {
  entries: JournalNote[];
  onRefresh: () => Promise<void>;
}

export default function JournalNotebook({ entries, onRefresh }: JournalNotebookProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalNote | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalNote | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<'pregnancy' | 'baby' | 'feelings' | 'memory' | 'planning' | 'general'>('pregnancy');
  const [mood, setMood] = useState<'happy' | 'anxious' | 'tired' | 'excited' | 'overwhelmed'>('excited');
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Category visual helper
  const getCatBadge = (cat: string) => {
    switch (cat) {
      case "pregnancy":
        return { label: "Pregnancy Progress", style: "bg-blue-500/15 text-blue-750 dark:text-blue-400 border-blue-500/30" };
      case "baby":
        return { label: "Baby Milestones", style: "bg-teal-500/15 text-teal-750 dark:text-teal-400 border-teal-500/30" };
      case "feelings":
        return { label: "Moods & Feelings", style: "bg-pink-500/15 text-pink-750 dark:text-pink-400 border-pink-500/30" };
      case "memory":
        return { label: "Sweet Memories", style: "bg-purple-500/15 text-purple-750 dark:text-purple-400 border-purple-500/30" };
      case "general":
        return { label: "General Note", style: "bg-slate-500/15 text-slate-750 dark:text-slate-300 border-slate-500/30" };
      default:
        return { label: "Birth Planning", style: "bg-amber-500/15 text-amber-750 dark:text-amber-400 border-amber-500/30" };
    }
  };

  const getMoodEmoji = (m: string) => {
    switch (m) {
      case "happy": return "😊 Happy";
      case "anxious": return "😟 Anxious";
      case "tired": return "🥱 Tired";
      case "overwhelmed": return "🤯 Overwhelmed";
      default: return "🤩 Excited";
    }
  };

  // Image Upload handler
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
      } catch (err: any) {
        setError("Failed to upload bump photo.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit journal entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      title,
      content,
      category,
      mood,
      tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
      image_url: imageUrl,
      is_pinned: isPinned
    };

    try {
      if (editingEntry) {
        await api.updateJournalNote(editingEntry.id, payload);
      } else {
        await api.createJournalNote(payload);
      }
      await onRefresh();
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to save journal entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: JournalNote) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setCategory(entry.category);
    setMood(entry.mood || "excited");
    setContent(entry.content);
    setImageUrl(entry.image_url || "");
    setTagsInput(entry.tags ? entry.tags.join(", ") : "");
    setIsPinned(entry.is_pinned || false);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this diary entry?")) return;
    try {
      await api.deleteJournalNote(id);
      await onRefresh();
      if (selectedEntry?.id === id) setSelectedEntry(null);
    } catch (err: any) {
      alert("Failed to delete entry");
    }
  };

  const handlePinToggle = async (entry: JournalNote) => {
    try {
      await api.updateJournalNote(entry.id, { is_pinned: !entry.is_pinned });
      await onRefresh();
    } catch (err: any) {
      alert("Failed to toggle pin status");
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingEntry(null);
    setTitle("");
    setCategory("pregnancy");
    setMood("excited");
    setContent("");
    setImageUrl("");
    setTagsInput("");
    setIsPinned(false);
    setError("");
  };

  // Filter journal entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            entry.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filterCategory ? entry.category === filterCategory : true;

      return matchesSearch && matchesCategory;
    });
  }, [entries, searchQuery, filterCategory]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Family Journal & Bump Notebook
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Write down mood changes, physical symptoms, kick-count milestones, and snap bump photos to build a memorable digital memory book.
          </p>
        </div>

        {!isAdding && (
          <button
            id="btn-add-journal"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Write Diary Entry
          </button>
        )}
      </div>

      {/* Main Grid Content */}
      {isAdding ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-2xl"
        >
          <div className="flex justify-between items-center border-b border-white/20 dark:border-slate-800/30 pb-3 mb-5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-250 uppercase tracking-wide">
              {editingEntry ? "Edit Diary Entry" : "Write New Journal Post"}
            </h2>
            <button
              id="btn-close-journal-form"
              onClick={resetForm}
              className="p-1.5 hover:bg-white/20 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form id="journal-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Entry Title
                </label>
                <input
                  id="input-entry-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Heard the heartbeat today!, First kicks felt!"
                  className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Category Type
                  </label>
                  <select
                    id="select-entry-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  >
                    <option value="pregnancy">🤰 Pregnancy Progress</option>
                    <option value="baby">👶 Baby Milestones</option>
                    <option value="feelings">💓 Moods & Feelings</option>
                    <option value="memory">✨ Sweet Memories</option>
                    <option value="planning">📋 Birth Planning</option>
                    <option value="general">📝 General Note</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Current Mood
                  </label>
                  <select
                    id="select-entry-mood"
                    value={mood}
                    onChange={(e) => setMood(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  >
                    <option value="excited">🤩 Excited</option>
                    <option value="happy">😊 Happy</option>
                    <option value="anxious">😟 Anxious</option>
                    <option value="tired">🥱 Tired</option>
                    <option value="overwhelmed">🤯 Overwhelmed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tags comma separated & Pinned checkbox */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Comma Separated Tags <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="input-entry-tags"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="heartbeat, scan, kicks, third-trimester..."
                  className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-850/15 border border-white/15 dark:border-slate-800/25 rounded-xl p-3 h-[45px]">
                <input
                  id="checkbox-entry-pinned"
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-slate-300 text-teal-500 focus:ring-teal-400/20"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pin to top of feed?</span>
              </div>
            </div>

            {/* Photo Attachment Container */}
            <div className="bg-white/10 dark:bg-slate-900/10 p-4 rounded-xl border border-dashed border-white/20 dark:border-slate-800/30">
              <label className="block text-xs font-bold text-slate-650 dark:text-slate-300 mb-2">
                Bump Diary Progress Photo
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-white/20 dark:border-slate-800/35 bg-white/10 shadow-sm shrink-0">
                    <img src={imageUrl} alt="Bump Diary" className="h-28 w-28 object-cover" />
                    <button
                      id="btn-remove-journal-photo"
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white p-1 rounded-full transition-all cursor-pointer z-10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="h-28 w-28 bg-white/5 dark:bg-slate-900/20 rounded-lg border border-white/15 dark:border-slate-800/25 flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <Camera className="h-8 w-8" />
                    <span className="text-[10px] font-bold mt-1 uppercase">No Photo</span>
                  </div>
                )}

                <div className="flex-1 w-full text-center sm:text-left">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                    Upload weekly baby bump progress picture
                  </span>
                  <input
                    id="input-journal-photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    id="btn-trigger-journal-upload"
                    type="button"
                    disabled={uploading}
                    onClick={() => document.getElementById("input-journal-photo")?.click()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/20 dark:border-slate-800/30 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/10 hover:bg-white/20 rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Select Bump Photo"}
                  </button>
                </div>
              </div>
            </div>

            {/* Rich text-like body */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Diary Content
              </label>
              <textarea
                id="input-entry-content"
                required
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe how you felt today. Physical symptoms, kick intensities, nursery preparation thoughts..."
                className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/10 dark:border-slate-800/25">
              <button
                id="btn-save-journal"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : editingEntry ? "Update Journal Entry" : "Publish Journal Entry"}
              </button>
              <button
                id="btn-cancel-journal-form"
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 bg-white/10 dark:bg-slate-800/30 hover:bg-white/20 dark:hover:bg-slate-700/30 text-slate-650 dark:text-slate-300 font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        /* Journal display grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Journal Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filter and Search */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
                <input
                  id="search-journal"
                  type="text"
                  placeholder="Search journal entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                />
              </div>

              <select
                id="filter-journal-cat"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-700 dark:text-slate-300 text-xs focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="pregnancy">🤰 Pregnancy Progress</option>
                <option value="baby">👶 Baby Milestones</option>
                <option value="feelings">💓 Moods & Feelings</option>
                <option value="memory">✨ Sweet Memories</option>
                <option value="planning">📋 Birth Planning</option>
                <option value="general">📝 General Note</option>
              </select>
            </div>

            {/* Notebook Feed */}
            {filteredEntries.length > 0 ? (
              <div className="space-y-6">
                {filteredEntries.map((entry) => {
                  const badge = getCatBadge(entry.category);

                  return (
                    <div 
                      key={entry.id} 
                      className={`glass-panel rounded-2xl border transition-all overflow-hidden flex flex-col md:flex-row hover:border-white/40 dark:hover:border-slate-800/40 ${
                        entry.is_pinned 
                          ? "border-teal-500/40 dark:border-teal-400/40 ring-2 ring-teal-500/10" 
                          : "border-white/10 dark:border-slate-800/20"
                      }`}
                    >
                      {entry.image_url && (
                        <div className="md:w-48 h-48 md:h-auto bg-slate-900/10 dark:bg-slate-950/20 shrink-0 overflow-hidden relative">
                          <img 
                            src={entry.image_url} 
                            alt="Bump Progress" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-3 left-3 bg-slate-900/60 backdrop-blur border border-white/15 p-1 rounded-lg text-[10px] font-black text-white uppercase tracking-wide">
                            Bump Shot
                          </div>
                        </div>
                      )}

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase tracking-wide ${badge.style}`}>
                                {badge.label}
                              </span>
                              <span className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-400 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">
                                {getMoodEmoji(entry.mood || "excited")}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                id={`btn-pin-${entry.id}`}
                                onClick={() => handlePinToggle(entry)}
                                className={`p-1 rounded hover:bg-white/20 transition-colors cursor-pointer ${
                                  entry.is_pinned ? "text-teal-500" : "text-slate-400"
                                }`}
                                title={entry.is_pinned ? "Unpin entry" : "Pin to top"}
                              >
                                <Pin className="h-4 w-4 fill-current" />
                              </button>
                              <span className="text-slate-450 dark:text-slate-500 text-[10px] font-semibold flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {new Date(entry.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                              </span>
                            </div>
                          </div>

                          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                            {entry.title}
                          </h3>

                          <p className="text-slate-605 dark:text-slate-300 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap font-sans">
                            {entry.content}
                          </p>
                        </div>

                        {/* Tags and Controls */}
                        <div className="flex justify-between items-center pt-3 border-t border-white/20 dark:border-slate-800/30 text-[10px]">
                          {/* Tags list */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {entry.tags && entry.tags.map((tag, idx) => (
                              <span key={idx} className="bg-white/10 dark:bg-slate-850/15 border border-white/15 dark:border-slate-800/25 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded font-semibold">
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-3 font-semibold text-xs shrink-0 pl-2">
                            <button
                              id={`btn-read-entry-${entry.id}`}
                              onClick={() => setSelectedEntry(entry)}
                              className="text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-0.5 cursor-pointer"
                            >
                              Expand <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              id={`btn-edit-entry-${entry.id}`}
                              onClick={() => handleEdit(entry)}
                              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              id={`btn-delete-entry-${entry.id}`}
                              onClick={() => handleDelete(entry.id)}
                              className="text-rose-500 hover:text-rose-600 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-panel text-center py-12 space-y-2">
                <BookOpen className="h-12 w-12 text-slate-400 dark:text-slate-550 mx-auto fill-slate-500/10" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Entries Recorded</h3>
                <p className="text-slate-400 dark:text-slate-500 text-xs">There are no journal entries stashed under this category or matching keywords.</p>
              </div>
            )}
          </div>

          {/* RIGHT: Memory Album Snapshot Column */}
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-white/20 dark:border-slate-800/30 pb-3">
                <Camera className="h-4.5 w-4.5 text-teal-500" /> Bump Progress Album
              </h3>

              {entries.filter(e => e.image_url).length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {entries.filter(e => e.image_url).map((entry) => (
                    <div 
                      key={entry.id} 
                      onClick={() => setSelectedEntry(entry)}
                      className="aspect-square bg-slate-900 rounded-xl overflow-hidden relative group cursor-pointer border border-white/10 dark:border-slate-800/20"
                    >
                      <img 
                        src={entry.image_url} 
                        alt={entry.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white">
                        Open Diary
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-550 text-xs leading-relaxed">
                  📸 No progress photos stashed. Snap weekly bump shots to see your pregnancy timeline!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Diary Entry Lightbox Modal */}
      {selectedEntry && (
        <div id="diary-lightbox" className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/20 dark:border-slate-800/30">
            <button
              id="btn-close-diary-lightbox"
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 bg-white/25 hover:bg-white/35 text-slate-700 dark:text-slate-300 p-2 rounded-full transition-all cursor-pointer z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {selectedEntry.image_url && (
              <div className="h-64 bg-slate-900 overflow-hidden relative">
                <img src={selectedEntry.image_url} alt={selectedEntry.title} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-teal-300">Bump Progression shot</span>
                </div>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-550 font-semibold flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded border ${getCatBadge(selectedEntry.category).style}`}>
                    {getCatBadge(selectedEntry.category).label}
                  </span>
                  <span className="bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold">
                    {getMoodEmoji(selectedEntry.mood || "excited")}
                  </span>
                </div>
                <span>📅 Published {new Date(selectedEntry.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                {selectedEntry.title}
              </h2>

              <p className="text-slate-605 dark:text-slate-300 text-xs leading-relaxed max-h-[250px] overflow-y-auto pr-1 whitespace-pre-line font-sans">
                {selectedEntry.content}
              </p>

              {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pt-2 border-t border-white/20 dark:border-slate-800/30 text-[10px]">
                  {selectedEntry.tags.map((tag, idx) => (
                    <span key={idx} className="bg-white/10 dark:bg-slate-850/15 border border-white/15 dark:border-slate-800/25 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-bold">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
