import React, { useState, useEffect, useMemo } from "react";
import { GeneralFolder, GeneralNote } from "../types";
import { api } from "../lib/api";
import { 
  Folder, 
  FolderPlus, 
  FolderOpen, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Pin, 
  X, 
  ChevronRight, 
  Copy, 
  Check, 
  MoreVertical,
  Calendar,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GeneralNotesProps {
  onRefreshAll?: () => Promise<void>;
}

export default function GeneralNotes({ onRefreshAll }: GeneralNotesProps) {
  // Database states
  const [folders, setFolders] = useState<GeneralFolder[]>([]);
  const [notes, setNotes] = useState<GeneralNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI Selection states
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all" | "uncategorized">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<GeneralNote | null>(null);

  // Form states - Note
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GeneralNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteFolderId, setNoteFolderId] = useState<string>("");
  const [noteIsPinned, setNoteIsPinned] = useState(false);
  const [noteColor, setNoteColor] = useState("default");

  // Form states - Folder
  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<GeneralFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("teal");

  // Copy success indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Note color options
  const colorOptions = [
    { id: "default", label: "Default", bg: "bg-white/40 dark:bg-slate-800/40 border-slate-250/20 dark:border-slate-700/30" },
    { id: "teal", label: "Mint", bg: "bg-teal-500/10 border-teal-500/20 text-teal-800 dark:text-teal-400" },
    { id: "rose", label: "Blush", bg: "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-400" },
    { id: "sky", label: "Ocean", bg: "bg-sky-500/10 border-sky-500/20 text-sky-850 dark:text-sky-400" },
    { id: "amber", label: "Warm Honey", bg: "bg-amber-500/10 border-amber-500/20 text-amber-850 dark:text-amber-400" },
    { id: "violet", label: "Lavender", bg: "bg-violet-500/10 border-violet-500/20 text-violet-855 dark:text-violet-400" }
  ];

  // Folder color options
  const folderColors = [
    { id: "teal", label: "Teal", text: "text-teal-500", bg: "bg-teal-500", border: "border-teal-500/20" },
    { id: "rose", label: "Rose", text: "text-rose-500", bg: "bg-rose-500", border: "border-rose-500/20" },
    { id: "sky", label: "Sky", text: "text-sky-500", bg: "bg-sky-500", border: "border-sky-500/20" },
    { id: "amber", label: "Amber", text: "text-amber-500", bg: "bg-amber-500", border: "border-amber-500/20" },
    { id: "violet", label: "Violet", text: "text-violet-500", bg: "bg-violet-500", border: "border-violet-500/20" },
    { id: "slate", label: "Slate", text: "text-slate-500", bg: "bg-slate-500", border: "border-slate-500/20" }
  ];

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [fetchedFolders, fetchedNotes] = await Promise.all([
        api.getFolders(),
        api.getNotes()
      ]);
      setFolders(fetchedFolders);
      setNotes(fetchedNotes);
      setError("");
    } catch (err: any) {
      console.error("Error fetching notes data:", err);
      setError("Unable to sync note stashes. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter notes based on folder selection and search query
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // Folder Match
      let folderMatch = true;
      if (selectedFolderId === "uncategorized") {
        folderMatch = note.folder_id === null || note.folder_id === "";
      } else if (selectedFolderId !== "all") {
        folderMatch = note.folder_id === selectedFolderId;
      }

      // Search Query Match
      const searchLower = searchQuery.toLowerCase();
      const searchMatch = 
        note.title.toLowerCase().includes(searchLower) || 
        note.content.toLowerCase().includes(searchLower);

      return folderMatch && searchMatch;
    });
  }, [notes, selectedFolderId, searchQuery]);

  // Handle Note Submission (Create or Edit)
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) {
      setError("Please fill out either a note title or some contents");
      return;
    }

    try {
      const payload = {
        title: noteTitle.trim() || "Untitled Note",
        content: noteContent,
        folder_id: noteFolderId === "" || noteFolderId === "null" ? null : noteFolderId,
        is_pinned: noteIsPinned,
        color: noteColor
      };

      if (editingNote) {
        await api.updateNote(editingNote.id, payload);
      } else {
        await api.createNote(payload);
      }

      await fetchAllData();
      if (onRefreshAll) await onRefreshAll();
      closeNoteForm();
    } catch (err: any) {
      setError("Failed to stash note. Please try again.");
    }
  };

  // Open note form for editing
  const openEditNote = (note: GeneralNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteFolderId(note.folder_id || "");
    setNoteIsPinned(note.is_pinned || false);
    setNoteColor(note.color || "default");
    setNoteFormOpen(true);
  };

  const closeNoteForm = () => {
    setNoteFormOpen(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteFolderId("");
    setNoteIsPinned(false);
    setNoteColor("default");
  };

  // Delete note
  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this general note?")) return;
    try {
      await api.deleteNote(id);
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
      await fetchAllData();
      if (onRefreshAll) await onRefreshAll();
    } catch (err) {
      alert("Failed to delete note");
    }
  };

  // Toggle Pinned Status Direct
  const handleTogglePinDirect = async (note: GeneralNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateNote(note.id, { is_pinned: !note.is_pinned });
      await fetchAllData();
    } catch (err) {
      console.error("Failed to pin note", err);
    }
  };

  // Copy note content
  const handleCopyNoteContent = (note: GeneralNote, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Folder Submission (Create or Edit)
  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      const payload = {
        name: folderName.trim(),
        color: folderColor
      };

      if (editingFolder) {
        await api.updateFolder(editingFolder.id, payload);
      } else {
        await api.createFolder(payload);
      }

      await fetchAllData();
      closeFolderForm();
    } catch (err) {
      setError("Failed to save folder stashes.");
    }
  };

  const openEditFolder = (folder: GeneralFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderColor(folder.color || "teal");
    setFolderFormOpen(true);
  };

  const closeFolderForm = () => {
    setFolderFormOpen(false);
    setEditingFolder(null);
    setFolderName("");
    setFolderColor("teal");
  };

  // Delete Folder
  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this folder? Notes inside will not be deleted but moved to Uncategorized.")) return;
    try {
      await api.deleteFolder(id);
      if (selectedFolderId === id) {
        setSelectedFolderId("all");
      }
      await fetchAllData();
    } catch (err) {
      alert("Failed to delete folder");
    }
  };

  // Helpers
  const getFolderColorClass = (colorId?: string) => {
    const fColor = folderColors.find(c => c.id === colorId) || folderColors[0];
    return fColor.text;
  };

  const getFolderBgClass = (colorId?: string) => {
    const fColor = folderColors.find(c => c.id === colorId) || folderColors[0];
    return fColor.bg;
  };

  const getNoteBgClass = (colorId?: string) => {
    const nColor = colorOptions.find(c => c.id === colorId) || colorOptions[0];
    return nColor.bg;
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight font-sans flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-teal-500" /> General Family Notes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Create persistent checklists, general ideas, baby nursery brainstorms, or medical details categorized cleanly inside directories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-add-folder"
            onClick={() => setFolderFormOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/35 transition-all cursor-pointer"
          >
            <FolderPlus className="h-4 w-4" /> New Folder
          </button>
          
          <button
            id="btn-add-note"
            onClick={() => {
              setNoteFolderId(selectedFolderId !== "all" && selectedFolderId !== "uncategorized" ? selectedFolderId : "");
              setNoteFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Write General Note
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 p-3.5 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Panel - Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: Folders Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-4 rounded-2xl space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
              Directories
            </h3>

            <div className="space-y-1">
              <button
                id="folder-all"
                onClick={() => setSelectedFolderId("all")}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                  selectedFolderId === "all"
                    ? "bg-white/60 dark:bg-slate-800/60 text-teal-700 dark:text-teal-400 shadow-sm border-white/50 dark:border-slate-700/50"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/20 dark:hover:bg-slate-800/20 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> All Stashed Notes
                </span>
                <span className="text-[10px] opacity-60 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-md font-semibold">
                  {notes.length}
                </span>
              </button>

              <button
                id="folder-uncategorized"
                onClick={() => setSelectedFolderId("uncategorized")}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                  selectedFolderId === "uncategorized"
                    ? "bg-white/60 dark:bg-slate-800/60 text-teal-700 dark:text-teal-400 shadow-sm border-white/50 dark:border-slate-700/50"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/20 dark:hover:bg-slate-800/20 border-transparent"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-slate-400" /> Uncategorized
                </span>
                <span className="text-[10px] opacity-60 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-md font-semibold">
                  {notes.filter(n => !n.folder_id).length}
                </span>
              </button>
            </div>

            {folders.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-dashed border-slate-150 dark:border-slate-800">
                <span className="text-[9px] font-black tracking-wide text-slate-400 uppercase block px-1 mb-1">
                  Custom folders
                </span>
                {folders.map((folder) => {
                  const isActive = selectedFolderId === folder.id;
                  const colorClass = getFolderColorClass(folder.color);
                  const count = notes.filter(n => n.folder_id === folder.id).length;

                  return (
                    <div
                      key={folder.id}
                      className="group flex items-center justify-between rounded-xl transition-all relative"
                    >
                      <button
                        id={`folder-${folder.id}`}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={`w-full text-left py-2 pl-3 pr-8 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                          isActive
                            ? "bg-white/60 dark:bg-slate-800/60 text-teal-700 dark:text-teal-400 shadow-sm border-white/50 dark:border-slate-700/50"
                            : "text-slate-600 dark:text-slate-400 hover:bg-white/20 dark:hover:bg-slate-800/20 border-transparent"
                        }`}
                      >
                        <Folder className={`h-4 w-4 shrink-0 ${colorClass}`} />
                        <span className="truncate">{folder.name}</span>
                        <span className="text-[10px] ml-auto opacity-60 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-md font-semibold shrink-0">
                          {count}
                        </span>
                      </button>

                      <div className="absolute right-1 top-0 bottom-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-1.5">
                        <button
                          id={`btn-edit-folder-${folder.id}`}
                          onClick={(e) => openEditFolder(folder, e)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title="Edit Folder"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          id={`btn-delete-folder-${folder.id}`}
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded text-rose-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Folder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Notes Grid Board */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Search bar & statistics */}
          <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute inset-y-0 left-3 h-4 w-4 text-slate-400 my-auto" />
              <input
                id="search-notes"
                type="text"
                placeholder="Search note titles or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400/30"
              />
            </div>

            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Showing {filteredNotes.length} of {notes.length} notes
            </div>
          </div>

          {/* Notes display board */}
          {loading ? (
            <div className="glass-panel text-center py-16 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto" />
              <p className="text-slate-400 text-xs">Accessing cabinet stashes...</p>
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => {
                const bgClass = getNoteBgClass(note.color);
                const folder = folders.find(f => f.id === note.folder_id);

                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`glass-panel p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-slate-350/40 dark:hover:border-slate-750/50 group ${bgClass} ${
                      note.is_pinned ? "ring-2 ring-teal-500/20 border-teal-400/40 dark:border-teal-500/30" : ""
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        {folder ? (
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${getFolderColorClass(folder.color)} bg-white/50 dark:bg-slate-900/50 ${folder.color === "teal" ? "border-teal-200/50" : folder.color === "rose" ? "border-rose-200/50" : "border-slate-200/50"}`}>
                            {folder.name}
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border text-slate-400 border-slate-150/50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                            General Note
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`btn-pin-note-${note.id}`}
                            onClick={(e) => handleTogglePinDirect(note, e)}
                            className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                              note.is_pinned ? "text-teal-500 opacity-100" : "text-slate-400"
                            }`}
                            title={note.is_pinned ? "Unpin Note" : "Pin Note"}
                          >
                            <Pin className={`h-3 w-3 ${note.is_pinned ? "fill-current" : ""}`} />
                          </button>

                          <button
                            id={`btn-copy-note-${note.id}`}
                            onClick={(e) => handleCopyNoteContent(note, e)}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Copy to Clipboard"
                          >
                            {copiedId === note.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>

                      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {note.title}
                      </h3>

                      <p className="text-slate-600 dark:text-slate-350 text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap font-sans">
                        {note.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[9px] text-slate-400 font-semibold shrink-0">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          id={`btn-quick-edit-note-${note.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditNote(note);
                          }}
                          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          id={`btn-quick-delete-note-${note.id}`}
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          className="text-rose-500 hover:text-rose-600 font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel text-center py-16 space-y-3">
              <FileText className="h-12 w-12 text-slate-400/80 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Notes Found</h3>
              <p className="text-slate-400 text-xs max-w-xs mx-auto">There are no notes categorized here or matching your keywords. Create one to keep track of family details!</p>
              <button
                id="btn-empty-add-note"
                onClick={() => setNoteFormOpen(true)}
                className="inline-flex items-center gap-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create First Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX DIALOG: Read Note Modal */}
      <AnimatePresence>
        {selectedNote && (
          <div id="note-lightbox-overlay" className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800 p-6 space-y-4"
            >
              <button
                id="btn-close-note-lightbox"
                onClick={() => setSelectedNote(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                {selectedNote.folder_id ? (
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getFolderColorClass(folders.find(f => f.id === selectedNote.folder_id)?.color)} bg-white/50 dark:bg-slate-900/50`}>
                    {folders.find(f => f.id === selectedNote.folder_id)?.name}
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border text-slate-400 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    General Uncategorized Note
                  </span>
                )}
                
                {selectedNote.is_pinned && (
                  <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Pin className="h-2.5 w-2.5 fill-current" /> Pinned
                  </span>
                )}
              </div>

              <h2 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                {selectedNote.title}
              </h2>

              <p className="text-slate-650 dark:text-slate-300 text-xs leading-relaxed max-h-[300px] overflow-y-auto pr-1 whitespace-pre-line font-sans border-t border-b border-slate-100 dark:border-slate-800 py-3">
                {selectedNote.content}
              </p>

              <div className="flex justify-between items-center text-[10px] text-slate-450 dark:text-slate-500 font-semibold">
                <span>📅 Last modified: {new Date(selectedNote.updated_at).toLocaleString()}</span>
                
                <div className="flex items-center gap-3">
                  <button
                    id="btn-lightbox-copy"
                    onClick={(e) => handleCopyNoteContent(selectedNote, e)}
                    className="text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === selectedNote.id ? "Copied!" : "Copy content"}
                  </button>
                  <button
                    id="btn-lightbox-edit"
                    onClick={() => {
                      const noteToEdit = selectedNote;
                      setSelectedNote(null);
                      openEditNote(noteToEdit);
                    }}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Edit Note
                  </button>
                  <button
                    id="btn-lightbox-delete"
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="text-rose-500 hover:text-rose-600 cursor-pointer font-bold"
                  >
                    Delete Note
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FORM MODAL: Write/Edit Note */}
      <AnimatePresence>
        {noteFormOpen && (
          <div id="note-form-overlay" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass-panel p-6 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  {editingNote ? "Edit Note Stash" : "Write New Family Note"}
                </h2>
                <button
                  id="btn-close-note-form"
                  onClick={closeNoteForm}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleNoteSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Note Title
                  </label>
                  <input
                    id="input-note-title"
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Nursery paint ideas, Doctor contact details"
                    className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Organize into Folder
                    </label>
                    <select
                      id="select-note-folder"
                      value={noteFolderId}
                      onChange={(e) => setNoteFolderId(e.target.value)}
                      className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-xl text-slate-700 dark:text-slate-300 text-xs focus:outline-none"
                    >
                      <option value="">📁 Keep Uncategorized</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>📁 {f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Card Aesthetic / Tag Tint
                    </label>
                    <select
                      id="select-note-color"
                      value={noteColor}
                      onChange={(e) => setNoteColor(e.target.value)}
                      className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-xl text-slate-700 dark:text-slate-300 text-xs focus:outline-none"
                    >
                      {colorOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white/5 dark:bg-slate-850/15 border border-white/10 dark:border-slate-800/20 rounded-xl p-3 h-10">
                  <input
                    id="checkbox-note-pinned"
                    type="checkbox"
                    checked={noteIsPinned}
                    onChange={(e) => setNoteIsPinned(e.target.checked)}
                    className="rounded border-slate-300 text-teal-500 focus:ring-teal-400/20"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pin to top of grid?</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Note Content
                  </label>
                  <textarea
                    id="input-note-content"
                    rows={8}
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write anything you want... can copy-paste medical lists, phone numbers, baby nursery budgets, thoughts, links..."
                    className="w-full px-3 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400/30 font-sans"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    id="btn-save-note"
                    type="submit"
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    {editingNote ? "Update Stash" : "Add to Stashes"}
                  </button>
                  <button
                    id="btn-cancel-note"
                    type="button"
                    onClick={closeNoteForm}
                    className="px-4 py-2 bg-white/10 dark:bg-slate-850/35 hover:bg-white/20 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FORM MODAL: Create/Edit Folder */}
      <AnimatePresence>
        {folderFormOpen && (
          <div id="folder-form-overlay" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass-panel p-5 rounded-2xl max-w-sm w-full space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  {editingFolder ? "Edit Directory" : "Create New Directory"}
                </h2>
                <button
                  id="btn-close-folder-form"
                  onClick={closeFolderForm}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleFolderSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Folder Name
                  </label>
                  <input
                    id="input-folder-name"
                    type="text"
                    required
                    maxLength={30}
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="e.g. Nursery Ideas, Lab Reports, To-Do lists"
                    className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Accent Color Theme
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {folderColors.map((color) => {
                      const isSelected = folderColor === color.id;
                      return (
                        <button
                          key={color.id}
                          id={`btn-color-pick-${color.id}`}
                          type="button"
                          onClick={() => setFolderColor(color.id)}
                          className={`h-8 w-8 rounded-full cursor-pointer transition-all flex items-center justify-center text-white ${color.bg} ${
                            isSelected ? "ring-2 ring-offset-2 ring-teal-500 dark:ring-teal-400 scale-105" : "hover:scale-105"
                          }`}
                          title={color.label}
                        >
                          {isSelected && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    id="btn-save-folder"
                    type="submit"
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    {editingFolder ? "Update Folder" : "Create Folder"}
                  </button>
                  <button
                    id="btn-cancel-folder"
                    type="button"
                    onClick={closeFolderForm}
                    className="px-4 py-2 bg-white/10 dark:bg-slate-850/35 hover:bg-white/20 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
