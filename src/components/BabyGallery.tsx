import React, { useState, useEffect } from "react";
import {
  Image,
  Upload,
  Plus,
  Trash2,
  X,
  Database,
  CloudCheck,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Heart,
  User
} from "lucide-react";
import { UserProfile, BabyPhoto } from "../types";

interface BabyGalleryProps {
  userProfile: UserProfile | null;
  authToken: string | null;
}

const MILESTONE_PRESETS = [
  "Week 8 Ultrasound",
  "Week 12 Scan",
  "Week 20 Anomaly Scan",
  "Week 28 Bump",
  "Week 32 Bump",
  "Week 36 Bump",
  "Nursery Setup",
  "Hospital Bag Ready",
  "Birth Day 👶",
  "1 Week Old",
  "1 Month Old",
  "3 Months Old",
  "First Smile"
];

export const BabyGallery: React.FC<BabyGalleryProps> = ({ userProfile, authToken }) => {
  const [photos, setPhotos] = useState<BabyPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [storageStatus, setStorageStatus] = useState<{
    supabaseConnected: boolean;
    supabaseUrl?: string | null;
    bucketName: string;
  }>({
    supabaseConnected: false,
    bucketName: "kunjubaby"
  });

  // Filter and Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterMilestone, setFilterMilestone] = useState<string>("all");

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<BabyPhoto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  // Reset confirmation when selected photo changes
  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [selectedPhoto]);

  // Upload Form State
  const [title, setTitle] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [milestoneWeek, setMilestoneWeek] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const getActiveToken = () => {
    return authToken || localStorage.getItem("kunju_baby_token") || localStorage.getItem("authToken") || userProfile?.user_id || "";
  };

  useEffect(() => {
    fetchStorageStatus();
    fetchPhotos();
  }, [authToken, userProfile?.user_id]);

  const fetchStorageStatus = async () => {
    try {
      const res = await fetch("/api/gallery/storage-status");
      if (res.ok) {
        const data = await res.json();
        setStorageStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch storage status", err);
    }
  };

  const fetchPhotos = async () => {
    const token = getActiveToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gallery", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setPhotos(data);
        }
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          setError(errData.error || "Failed to load photos");
        } else {
          setError(`Server error (${res.status}): ${res.statusText}`);
        }
      }
    } catch (err) {
      console.error("Error fetching gallery", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file (PNG, JPG, WEBP)");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        alert("Image size should be less than 15MB");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !imagePreview) {
      alert("Please select an image to upload");
      return;
    }
    if (!title.trim()) {
      alert("Please enter a title for the photo");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadSuccess(null);

    try {
      // Convert image preview to raw base64 string
      const base64Data = imagePreview ? imagePreview.split(",")[1] : "";

      const token = getActiveToken();
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          caption: caption.trim(),
          milestone_week: milestoneWeek,
          fileData: base64Data,
          filename: selectedFile?.name || "photo.jpg",
          mimeType: selectedFile?.type || "image/jpeg"
        })
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const newPhoto = await res.json();
          setPhotos((prev) => [newPhoto, ...prev]);
          setUploadSuccess(
            newPhoto.storage_provider === "supabase"
              ? "Photo uploaded successfully to Supabase Storage Bucket!"
              : "Photo saved to Local Storage!"
          );
        }
        setTimeout(() => {
          setIsUploadOpen(false);
          resetUploadForm();
        }, 1200);
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          setError(errData.error || "Failed to upload photo");
        } else {
          setError(`Upload error (${res.status}): ${res.statusText}`);
        }
      }
    } catch (err) {
      console.error("Upload error", err);
      setError("An error occurred during file upload.");
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setTitle("");
    setCaption("");
    setMilestoneWeek("");
    setSelectedFile(null);
    setImagePreview(null);
    setUploadSuccess(null);
    setError(null);
  };

  const handleDeletePhoto = async (id: string, bypassConfirm = false) => {
    if (!bypassConfirm) {
      if (!confirm("Are you sure you want to delete this photo? This cannot be undone.")) {
        return;
      }
    }

    setDeletingId(id);
    try {
      const token = getActiveToken();
      const res = await fetch(`/api/gallery/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        if (selectedPhoto?.id === id) {
          setSelectedPhoto(null);
        }
      } else {
        alert("Failed to delete photo");
      }
    } catch (err) {
      console.error("Delete error", err);
      alert("Error deleting photo");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    const matchesSearch =
      photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (photo.caption && photo.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (photo.milestone_week && photo.milestone_week.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterMilestone === "all") return matchesSearch;
    if (filterMilestone === "scans") {
      return matchesSearch && photo.milestone_week?.toLowerCase().includes("scan");
    }
    if (filterMilestone === "bump") {
      return matchesSearch && photo.milestone_week?.toLowerCase().includes("bump");
    }
    if (filterMilestone === "newborn") {
      return (
        matchesSearch &&
        (photo.milestone_week?.toLowerCase().includes("birth") ||
          photo.milestone_week?.toLowerCase().includes("week") ||
          photo.milestone_week?.toLowerCase().includes("month"))
      );
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
              <Heart className="w-3.5 h-3.5 fill-pink-200 text-pink-200" />
              <span>Baby Memories & Milestones</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Baby Photo Gallery
            </h1>
            <p className="mt-2 text-pink-100 text-sm sm:text-base max-w-xl">
              Store ultrasound scans, bump progression, and baby milestone photos safely in your cloud gallery.
            </p>

            {/* Storage Provider Status Badge */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {storageStatus.supabaseConnected ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-300/40 text-emerald-100 text-xs font-medium backdrop-blur-md">
                  <Database className="w-4 h-4 text-emerald-300 animate-pulse" />
                  <span>Cloud Bucket Active: <strong className="text-white font-semibold">Supabase Storage ({storageStatus.bucketName})</strong></span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-300/40 text-amber-100 text-xs font-medium backdrop-blur-md">
                  <CloudCheck className="w-4 h-4 text-amber-200" />
                  <span>Storage Mode: <strong className="text-white font-semibold">Local Storage</strong> (Supabase can be connected in Settings)</span>
                </div>
              )}
            </div>
          </div>

          <button
            id="btn-upload-baby-photo"
            onClick={() => {
              resetUploadForm();
              setIsUploadOpen(true);
            }}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white text-rose-600 font-bold hover:bg-rose-50 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Upload Photo</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search photos by title, caption, milestone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Milestone Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterMilestone("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterMilestone === "all"
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All Photos ({photos.length})
          </button>
          <button
            onClick={() => setFilterMilestone("scans")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterMilestone === "scans"
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Ultrasound Scans
          </button>
          <button
            onClick={() => setFilterMilestone("bump")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterMilestone === "bump"
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Bump Updates
          </button>
          <button
            onClick={() => setFilterMilestone("newborn")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterMilestone === "newborn"
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Baby Milestones
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Loading baby photo gallery...
          </p>
        </div>
      ) : error && photos.length === 0 ? (
        <div className="glass-panel p-8 text-center rounded-3xl border-rose-200 dark:border-rose-900/30">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{error}</h3>
          <p className="text-sm text-slate-500 mt-1">
            Please check your server connection or try refreshing.
          </p>
          <button
            onClick={fetchPhotos}
            className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-semibold hover:bg-rose-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {searchQuery || filterMilestone !== "all" ? "No photos match your filter" : "Your Baby Gallery is Empty"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery || filterMilestone !== "all"
              ? "Try clearing your search query or selecting a different milestone filter."
              : "Upload your ultrasound scan images, belly bump progress photos, and baby moments to store them in your Supabase cloud bucket!"}
          </p>
          {!searchQuery && filterMilestone === "all" && (
            <button
              onClick={() => {
                resetUploadForm();
                setIsUploadOpen(true);
              }}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-all shadow-md"
            >
              <Upload className="w-4 h-4" />
              <span>Upload First Photo</span>
            </button>
          )}
        </div>
      ) : (
        /* Photo Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group glass-panel rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col border border-slate-200/80 dark:border-slate-800/80"
            >
              {/* Photo Preview Container */}
              <div
                className="relative aspect-square bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.photo_url}
                  alt={photo.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (photo.storage_path && !target.src.includes("/api/gallery/file")) {
                      target.src = `/api/gallery/file?path=${encodeURIComponent(photo.storage_path)}`;
                    } else if (!target.src.includes("unsplash")) {
                      target.src = "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=600&auto=format&fit=crop&q=80";
                    }
                  }}
                />



                {/* Milestone Badge Overlay */}
                {photo.milestone_week && (
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/90 text-white text-[11px] font-bold shadow-md backdrop-blur-sm">
                      {photo.milestone_week}
                    </span>
                  </div>
                )}

                {/* Hover overlay button */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <div className="p-2.5 bg-white/90 dark:bg-slate-800/90 rounded-full text-slate-800 dark:text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Photo Meta */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base line-clamp-1">
                    {photo.title}
                  </h4>
                  {photo.caption && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {photo.caption}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                    <User className="w-3.5 h-3.5 text-rose-500" />
                    {photo.user_name || "Family"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(photo.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Details Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Photo View Box */}
            <div className="md:w-3/5 bg-slate-950 flex items-center justify-center p-4 min-h-[300px] md:min-h-[480px]">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.title}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (selectedPhoto.storage_path && !target.src.includes("/api/gallery/file")) {
                    target.src = `/api/gallery/file?path=${encodeURIComponent(selectedPhoto.storage_path)}`;
                  } else if (!target.src.includes("unsplash")) {
                    target.src = "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=600&auto=format&fit=crop&q=80";
                  }
                }}
              />
            </div>

            {/* Photo Sidebar details */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {selectedPhoto.milestone_week && (
                    <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold">
                      {selectedPhoto.milestone_week}
                    </span>
                  )}
                  {selectedPhoto.storage_provider === "supabase" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <Database className="w-3.5 h-3.5" />
                      Supabase Bucket
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                      <CloudCheck className="w-3.5 h-3.5" />
                      Local Storage
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {selectedPhoto.title}
                </h2>

                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Uploaded on {new Date(selectedPhoto.created_at).toLocaleString()} by{" "}
                  <strong className="text-slate-700 dark:text-slate-300">{selectedPhoto.user_name || "Family Member"}</strong>
                </p>

                {selectedPhoto.storage_path && (
                  <div className="mt-3 p-3 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      Datewise Bucket Path
                    </p>
                    <code className="text-[11px] text-slate-700 dark:text-slate-300 font-mono break-all">
                      kunjubaby/{selectedPhoto.storage_path}
                    </code>
                  </div>
                )}

                {selectedPhoto.caption && (
                  <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                      Caption / Notes
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                      {selectedPhoto.caption}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <a
                  href={selectedPhoto.photo_url}
                  download={selectedPhoto.title || "baby-photo"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>

                {isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-rose-500 mr-1">Confirm delete?</span>
                    <button
                      onClick={() => handleDeletePhoto(selectedPhoto.id, true)}
                      disabled={deletingId === selectedPhoto.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      {deletingId === selectedPhoto.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Yes"
                      )}
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-pink-500/10 text-rose-500 rounded-2xl">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Upload Baby Photo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {storageStatus.supabaseConnected
                    ? "Will be stored datewise (YYYY/MM/DD) in your Supabase bucket"
                    : "Will be saved datewise in local storage"}
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-xs text-teal-700 dark:text-teal-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0 text-teal-500" />
              <span>Images are saved in datewise subfolders (<strong className="font-mono">YYYY/MM/DD/user_id/...</strong>) in your Supabase bucket.</span>
            </div>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Upload Drag-and-Drop Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Photo <span className="text-rose-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/40">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {imagePreview ? (
                    <div className="relative aspect-video max-h-48 mx-auto rounded-xl overflow-hidden shadow-md">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/70 text-white rounded-full hover:bg-slate-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center justify-center gap-2">
                      <Upload className="w-8 h-8 text-rose-500 animate-bounce" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Click or drag image here
                      </p>
                      <p className="text-xs text-slate-400">
                        Supports PNG, JPG, WEBP up to 15MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Photo Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. First Ultrasound Scan 👶"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              {/* Milestone Preset Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Milestone / Stage (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto">
                  {MILESTONE_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setMilestoneWeek(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        milestoneWeek === preset
                          ? "bg-rose-500 text-white shadow-sm font-bold"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom milestone (e.g., Week 24 Bump)"
                  value={milestoneWeek}
                  onChange={(e) => setMilestoneWeek(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Caption / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Baby was waving and kick count was super active today!"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading to Storage...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Photo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
