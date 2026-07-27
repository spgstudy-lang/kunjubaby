import React, { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import { UserProfile, Scan } from "../types";
import { 
  Sparkles, 
  Search, 
  HelpCircle, 
  Heart, 
  User, 
  CheckCircle, 
  ChevronRight, 
  Bookmark, 
  ThumbsUp, 
  MessageSquare,
  Baby,
  RefreshCw,
  Clock,
  Compass,
  AlertTriangle,
  Send,
  Star,
  Activity,
  Zap,
  Award,
  TrendingUp,
  Layers,
  Flame,
  ShieldCheck,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";

const WEEK_SIZE_GUIDE = [
  { week: 4, name: "Poppy Seed", sizeCm: "0.2 cm", weight: "0.1 g", emoji: "🌱", color: "from-emerald-500 to-teal-700", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 1", desc: "Blastocyst implants into uterine lining." },
  { week: 8, name: "Raspberry", sizeCm: "1.6 cm", weight: "1.0 g", emoji: "🍓", color: "from-rose-500 to-pink-700", image: "https://images.unsplash.com/photo-1577069861033-55d04ace4ef0?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 1", desc: "Tiny hands and facial features forming." },
  { week: 12, name: "Lime / Plum", sizeCm: "5.4 cm", weight: "14 g", emoji: "🍋", color: "from-amber-400 to-lime-600", image: "https://images.unsplash.com/photo-1534531141161-e408e06f9d45?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 1", desc: "Organs formed, reflexes starting." },
  { week: 16, name: "Avocado", sizeCm: "11.6 cm", weight: "100 g", emoji: "🥑", color: "from-emerald-600 to-green-800", image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 2", desc: "Eyes react to light, heartbeat audible." },
  { week: 20, name: "Banana / Mango", sizeCm: "25.6 cm", weight: "300 g", emoji: "🍌", color: "from-yellow-400 to-amber-600", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 2", desc: "Midway scan! Can swallow and hear sounds." },
  { week: 24, name: "Corn Cob", sizeCm: "30.0 cm", weight: "600 g", emoji: "🌽", color: "from-amber-400 to-yellow-600", image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 2", desc: "Lungs developing air sacs, kicks feel strong." },
  { week: 28, name: "Eggplant", sizeCm: "37.6 cm", weight: "1.0 kg", emoji: "🍆", color: "from-purple-600 to-indigo-800", image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 3", desc: "Eyes open & close, dream sleep (REM) starts." },
  { week: 32, name: "Pineapple", sizeCm: "42.4 cm", weight: "1.7 kg", emoji: "🍍", color: "from-amber-500 to-orange-600", image: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 3", desc: "Practicing breathing movements, rapid brain growth." },
  { week: 36, name: "Honeydew Melon", sizeCm: "47.4 cm", weight: "2.6 kg", emoji: "🍈", color: "from-teal-500 to-emerald-700", image: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 3", desc: "Gaining ~200g per week, positioning head down." },
  { week: 40, name: "Watermelon 👶", sizeCm: "51.2 cm", weight: "3.5 kg", emoji: "🍉", color: "from-rose-500 to-emerald-700", image: "https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=400&q=80", trimester: "Trimester 3", desc: "Full term & ready to meet family!" }
];

interface GeneratedName {
  name: string;
  gender: string;
  origin: string;
  meaning: string;
  pronunciation: string;
  whyWeLoveIt: string;
}

interface WeeklyReport {
  sizeComparison: string;
  fetalDevelopment: string;
  motherTips: string;
  partnerTips: string;
}

interface AIAdvisorProps {
  userProfile?: UserProfile;
  scans?: Scan[];
}

export function calculateGestationalAge(userId?: string, scans?: Scan[]) {
  if (userId) {
    const lmp = localStorage.getItem(`kunju_baby_lmp_${userId}`) || "";
    if (lmp) {
      const lmpDate = new Date(lmp);
      const today = new Date();
      const diffTime = today.getTime() - lmpDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        const weeks = Math.floor(diffDays / 7);
        const days = diffDays % 7;
        return {
          weeks: Math.max(1, Math.min(42, weeks)),
          days,
          source: "LMP Date"
        };
      }
    }
  }

  if (scans && scans.length > 0) {
    const sortedScans = [...scans].sort((a, b) => new Date(b.scan_date).getTime() - new Date(a.scan_date).getTime());
    const latestScan = sortedScans[0];
    const scanDate = new Date(latestScan.scan_date);
    const today = new Date();
    const diffTime = today.getTime() - scanDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalScanDays = (latestScan.weeks * 7) + latestScan.days + diffDays;
    const currentWeeks = Math.floor(totalScanDays / 7);
    const currentDays = totalScanDays % 7;
    return {
      weeks: Math.max(1, Math.min(42, currentWeeks)),
      days: currentDays,
      source: "Latest Scan"
    };
  }

  return { weeks: 14, days: 3, source: "Standard Default" };
}

export default function AIAdvisor({ userProfile, scans }: AIAdvisorProps) {
  const [activeTab, setActiveTab] = useState<'names' | 'milestones' | 'chat'>('names');

  // Gestational Age calculation
  const gestAge = useMemo(() => {
    return calculateGestationalAge(userProfile?.user_id, scans);
  }, [userProfile?.user_id, scans]);

  // NAME GENERATOR STATES
  const [gender, setGender] = useState<string>("unisex");
  const [startingLetter, setStartingLetter] = useState<string>("");
  const [meaningTheme, setMeaningTheme] = useState<string>("");
  const [origin, setOrigin] = useState<string>("Indian");
  const [extraTags, setExtraTags] = useState<string>("");
  
  const [generatedNames, setGeneratedNames] = useState<GeneratedName[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);
  const [namesError, setNamesError] = useState("");

  // Saved Names (Favorites list)
  const [favoriteNames, setFavoriteNames] = useState<{name: string, gender: string, meaning: string, origin: string, notes: string, rating: number}[]>(() => {
    const saved = localStorage.getItem("kunju_fav_names");
    return saved ? JSON.parse(saved) : [];
  });

  const [testSurname, setTestSurname] = useState("");
  const [testedName, setTestedName] = useState<GeneratedName | null>(null);

  // WEEKLY REPORT STATES - Defaults to user's calculated Gestational Age
  const [gestWeek, setGestWeek] = useState<number>(gestAge.weeks);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  // AI CHAT STATES - Defaults to user's Gestational Age context
  const [chatQuery, setChatQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string; timestamp: Date }[]>(() => [
    {
      role: 'assistant',
      text: `Hello! I am your AI Maternity & Midwife Assistant. Based on your profile, your calculated Gestational Age is **Week ${gestAge.weeks} + ${gestAge.days} days** (${gestAge.source}). Ask me anything about care remedies, safe exercises, nutrition, or what to expect during Week ${gestAge.weeks}!`,
      timestamp: new Date()
    }
  ]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState("");

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem("kunju_fav_names", JSON.stringify(favoriteNames));
  }, [favoriteNames]);

  // Generate Baby Names via API
  const handleGenerateNames = async () => {
    setLoadingNames(true);
    setNamesError("");
    setGeneratedNames([]);

    try {
      const tagsList = extraTags.split(",").map(t => t.trim()).filter(Boolean);
      const data = await api.generateBabyNames({
        gender,
        startingLetter,
        meaningTheme,
        origin,
        tags: tagsList
      });
      setGeneratedNames(data);
    } catch (err: any) {
      setNamesError(err.message || "Failed to generate baby names via Gemini AI.");
    } finally {
      setLoadingNames(false);
    }
  };

  // Favorite / Save a name
  const toggleFavoriteName = (nameObj: GeneratedName) => {
    const exists = favoriteNames.find(n => n.name.toLowerCase() === nameObj.name.toLowerCase());
    if (exists) {
      setFavoriteNames(favoriteNames.filter(n => n.name.toLowerCase() !== nameObj.name.toLowerCase()));
    } else {
      setFavoriteNames([
        ...favoriteNames,
        {
          name: nameObj.name,
          gender: nameObj.gender,
          meaning: nameObj.meaning,
          origin: nameObj.origin,
          notes: nameObj.whyWeLoveIt,
          rating: 5
        }
      ]);
    }
  };

  // Update notes/ratings on favorites
  const updateFavoriteRating = (index: number, rating: number) => {
    const updated = [...favoriteNames];
    updated[index].rating = rating;
    setFavoriteNames(updated);
  };

  const updateFavoriteNotes = (index: number, notes: string) => {
    const updated = [...favoriteNames];
    updated[index].notes = notes;
    setFavoriteNames(updated);
  };

  const deleteFavorite = (index: number) => {
    const updated = favoriteNames.filter((_, i) => i !== index);
    setFavoriteNames(updated);
  };

  // Calculate Surname Compatibility (Fun rhythm test!)
  const calculateCompatibility = (name: string, surname: string) => {
    if (!name || !surname) return null;
    const combined = `${name} ${surname}`;
    const syllables = (name.length + surname.length) % 3 === 0 ? "Balanced Ryhthm" : "Flowing Sound";
    
    // Fun compatibility rating logic
    let score = 75;
    if (name.slice(-1).toLowerCase() === surname.charAt(0).toLowerCase()) {
      score = 82; // vowel / consonant glide
    } else if ((name.length + surname.length) % 2 === 0) {
      score = 95; // Syllable balance match
    } else {
      score = 88;
    }

    return {
      score,
      syllables,
      combined,
      feedback: `The name "${name}" matches beautifully with the surname "${surname}". The combination flows with a ${syllables.toLowerCase()} and scores a wonderful compatibility index of ${score}%!`
    };
  };

  // Fetch Gestational Report
  const handleFetchReport = async (week: number) => {
    setLoadingReport(true);
    setReportError("");
    setWeeklyReport(null);

    try {
      const data = await api.getAiAdvice(week);
      setWeeklyReport(data);
    } catch (err: any) {
      setReportError(err.message || "Failed to fetch gestational insights.");
    } finally {
      setLoadingReport(false);
    }
  };

  // Auto-sync gestWeek with calculated Gestational Age if changed externally
  useEffect(() => {
    if (gestAge.weeks) {
      setGestWeek(gestAge.weeks);
    }
  }, [gestAge.weeks]);

  // Quick Trigger default report on load or when switching to milestones tab
  useEffect(() => {
    if (activeTab === 'milestones' && !weeklyReport && !loadingReport) {
      handleFetchReport(gestWeek || gestAge.weeks);
    }
  }, [activeTab, gestAge.weeks]);

  // Send Chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    const userMsg = chatQuery;
    setChatQuery("");
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date() }]);
    setLoadingChat(true);
    setChatError("");

    try {
      const contextualQuery = `[Patient Gestational Age: Week ${gestAge.weeks}, Day ${gestAge.days} (${gestAge.source})]\n\n${userMsg}`;
      const data = await api.getAiAdvice(gestWeek || gestAge.weeks, contextualQuery);
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.answer, timestamp: new Date() }]);
    } catch (err: any) {
      setChatError(err.message || "Failed to communicate with AI Advisor.");
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="glass-panel p-4 rounded-3xl flex flex-wrap gap-3 justify-between items-center shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            id="tab-ai-milestones"
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'milestones' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-white/20'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-300" /> Gestational Milestones & Size Guide
          </button>
          <button
            id="tab-ai-names"
            onClick={() => setActiveTab('names')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'names' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-white/20'
            }`}
          >
            <Baby className="h-4 w-4" /> Baby Name Generator
          </button>
          <button
            id="tab-ai-chat"
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'chat' ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-white/20'
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Midwife AI Assistant
          </button>
        </div>

        <span className="text-[10px] bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-400 font-extrabold uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
          <CheckCircle className="h-3.5 w-3.5 text-teal-500 animate-pulse" /> Gemini AI Insights
        </span>
      </div>

      {/* Main Content Area */}
      {activeTab === 'names' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form and Generation controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-5 rounded-2xl space-y-5">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/20 dark:border-slate-800/30 pb-3">
                <Compass className="h-4.5 w-4.5 text-teal-500" /> Filter Criteria
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Gender Choice
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['boy', 'girl', 'unisex'].map((g) => (
                      <button
                        key={g}
                        id={`btn-gender-${g}`}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`py-2 text-xs font-bold capitalize border rounded-xl transition-all cursor-pointer ${
                          gender === g 
                            ? 'bg-teal-500/20 border-teal-550/40 text-teal-700 dark:text-teal-400' 
                            : 'bg-white/10 dark:bg-slate-850/10 border-white/20 dark:border-slate-800/20 text-slate-600 dark:text-slate-300 hover:bg-white/25 dark:hover:bg-slate-800/25'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Cultural Origin
                  </label>
                  <select
                    id="select-name-origin"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-700 dark:text-slate-200 text-xs focus:outline-none"
                  >
                    <option value="Indian">Indian (Malayalam, Sanskrit, Hindi)</option>
                    <option value="Western">Western / European</option>
                    <option value="Arabic">Arabic / Middle Eastern</option>
                    <option value="Latin">Latin / Romanic</option>
                    <option value="Modern Unisex">Modern Trend / Unisex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Starting Letter <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="input-name-letter"
                    type="text"
                    maxLength={1}
                    placeholder="e.g. A, K, S"
                    value={startingLetter}
                    onChange={(e) => setStartingLetter(e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-700 dark:text-slate-200 text-xs focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Meaning / Theme
                  </label>
                  <input
                    id="input-name-theme"
                    type="text"
                    placeholder="e.g. light, brave, leader, nature"
                    value={meaningTheme}
                    onChange={(e) => setMeaningTheme(e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-700 dark:text-slate-200 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Extra Tags <span className="text-slate-400 font-normal">(comma-separated)</span>
                  </label>
                  <input
                    id="input-name-tags"
                    type="text"
                    placeholder="e.g. short, spiritual, celestial"
                    value={extraTags}
                    onChange={(e) => setExtraTags(e.target.value)}
                    className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-700 dark:text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                id="btn-generate-baby-names"
                onClick={handleGenerateNames}
                disabled={loadingNames}
                className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loadingNames ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Generating Names...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> AI Generate 10 Names
                  </>
                )}
              </button>
            </div>

            {/* Surname compatibility checker widget */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-white/20 dark:border-slate-800/30 pb-2">
                Compatibility Rhythm Tester
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Enter your family surname to dynamically test syllable harmony for any generated baby name!
              </p>

              <div className="space-y-3">
                <input
                  id="input-surname-compat"
                  type="text"
                  placeholder="e.g. Thomas, Menon, Nair"
                  value={testSurname}
                  onChange={(e) => setTestSurname(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-700 dark:text-slate-200 text-xs focus:outline-none"
                />

                {testedName && testSurname && (
                  <div className="p-3 bg-teal-500/10 border border-teal-500/25 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-teal-800 dark:text-teal-355">Resulting Match:</span>
                      <span className="bg-teal-500/20 text-teal-700 dark:text-teal-400 px-1.5 py-0.2 rounded">
                        {calculateCompatibility(testedName.name, testSurname)?.score}% compatibility
                      </span>
                    </div>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold text-xs block">
                      {calculateCompatibility(testedName.name, testSurname)?.combined}
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      "{calculateCompatibility(testedName.name, testSurname)?.feedback}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* List display generated names / favorites list */}
          <div className="lg:col-span-2 space-y-6">
            {namesError && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-700 text-xs">
                {namesError}
              </div>
            )}

            {/* Results Grid / Favorites tabs */}
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-white/20 dark:border-slate-800/30 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {generatedNames.length > 0 ? "AI Recommended Baby Names" : `Favorite Baby Names Stash (${favoriteNames.length})`}
                </h3>

                {generatedNames.length > 0 && (
                  <button
                    id="btn-clear-generated"
                    onClick={() => setGeneratedNames([])}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-semibold cursor-pointer"
                  >
                    Show Saved Favorites
                  </button>
                )}
              </div>

              {generatedNames.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {generatedNames.map((item, idx) => {
                    const isFav = favoriteNames.some(n => n.name.toLowerCase() === item.name.toLowerCase());

                    return (
                      <div key={idx} className="p-4 bg-white/20 dark:bg-slate-900/10 border border-white/20 dark:border-slate-800/30 rounded-xl hover:border-white/35 dark:hover:border-slate-800/40 transition-all flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{item.name}</span>
                            <span className="text-[10px] bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-355 px-1.5 py-0.2 rounded font-bold uppercase tracking-wide">
                              {item.gender}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">({item.origin})</span>
                          </div>

                          <p className="text-[11px] text-slate-605 dark:text-slate-300">
                            <span className="font-bold text-slate-700 dark:text-slate-200">Meaning: </span>{item.meaning}
                          </p>
                          <p className="text-[10px] text-slate-400 italic">
                            <span className="font-semibold text-slate-500">Pronunciation: </span>{item.pronunciation}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-1">
                            {item.whyWeLoveIt}
                          </p>
                        </div>

                        <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                          <button
                            id={`btn-fav-name-${idx}`}
                            onClick={() => toggleFavoriteName(item)}
                            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              isFav 
                                ? 'bg-pink-500/20 border-pink-500/40 text-pink-600 dark:text-pink-400' 
                                : 'bg-white/10 dark:bg-slate-850/10 border-white/20 dark:border-slate-800/20 text-slate-650 dark:text-slate-300 hover:bg-white/20'
                            }`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-pink-500 text-pink-500' : ''}`} />
                            {isFav ? "Saved" : "Save Name"}
                          </button>

                          <button
                            id={`btn-test-name-${idx}`}
                            onClick={() => setTestedName(item)}
                            className="px-3 py-1.5 bg-white/10 dark:bg-slate-850/10 border border-white/20 dark:border-slate-800/20 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-white/20 cursor-pointer rounded-lg"
                          >
                            Rhythm test
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Favorites dashboard display with notes / rating sliders! */
                favoriteNames.length > 0 ? (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {favoriteNames.map((fav, index) => (
                      <div key={index} className="p-4 border border-white/20 dark:border-slate-800/30 rounded-xl bg-white/10 dark:bg-slate-900/10 shadow-sm space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{fav.name}</span>
                              <span className="text-[9px] bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30 px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                                {fav.gender}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">({fav.origin})</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">"{fav.meaning}"</p>
                          </div>

                          <button
                            id={`btn-del-fav-name-${index}`}
                            onClick={() => deleteFavorite(index)}
                            className="text-rose-500 hover:text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>

                        {/* Interactive notes and custom star picker */}
                        <div className="space-y-2 pt-2 border-t border-white/10 dark:border-slate-800/20">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1">My Rating:</span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                id={`btn-star-${index}-${star}`}
                                type="button"
                                onClick={() => updateFavoriteRating(index, star)}
                                className="p-0.5 cursor-pointer text-amber-400 hover:scale-110 transition-transform"
                              >
                                <Star className={`h-4.5 w-4.5 ${fav.rating >= star ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                              </button>
                            ))}
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Couple Shared Notes:</span>
                            <textarea
                              id={`input-fav-notes-${index}`}
                              rows={2}
                              value={fav.notes}
                              onChange={(e) => updateFavoriteNotes(index, e.target.value)}
                              placeholder="Write opinions, family responses, or nicknames..."
                              className="w-full p-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-700 dark:text-slate-200 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs space-y-2">
                    <Baby className="h-12 w-12 text-slate-300 dark:text-slate-650 mx-auto fill-slate-500/10" />
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">No favorite names stashed.</h4>
                    <p className="text-slate-400 dark:text-slate-500">Use the AI Name Generator to produce elegant options, then click "Save Name" to start voting.</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* GESTATIONAL WEEKLY PROGRESS TAB */}
      {activeTab === 'milestones' && (
        <div className="space-y-6">
          {/* DEFAULT GESTATIONAL AGE PROFILE BANNER */}
          <div className="glass-panel p-4 rounded-3xl border border-teal-500/30 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-indigo-500/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-teal-500 text-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 block">
                  Current Gestational Age (Default)
                </span>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  Week {gestAge.weeks} + {gestAge.days} Days
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    ({gestAge.source})
                  </span>
                </h4>
              </div>
            </div>

            {gestWeek !== gestAge.weeks && (
              <button
                id="btn-reset-gest-week"
                onClick={() => {
                  setGestWeek(gestAge.weeks);
                  handleFetchReport(gestAge.weeks);
                }}
                className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Jump to My Week ({gestAge.weeks})
              </button>
            )}
          </div>

          {/* VISUAL FRUIT SIZE COMPARISON MATRIX */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/20 dark:border-slate-800/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Visual Gestational Size Progression
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click any developmental stage below to jump to week milestones & AI insights
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
                Week {gestWeek} of 40 ({Math.min(100, Math.round((gestWeek / 40) * 100))}% Complete)
              </span>
            </div>

            {/* Gestational Progress Bar Animation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>Trimester 1 (W1-12)</span>
                <span>Trimester 2 (W13-27)</span>
                <span>Trimester 3 (W28-40)</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (gestWeek / 40) * 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-teal-400 via-emerald-500 to-indigo-600 rounded-full shadow-sm"
                />
              </div>
            </div>

            {/* Scrollable Visual Fruit Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 pt-2">
              {WEEK_SIZE_GUIDE.map((item) => {
                const isCurrent = Math.abs(gestWeek - item.week) <= 2;
                return (
                  <motion.button
                    key={item.week}
                    id={`btn-week-card-${item.week}`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setGestWeek(item.week);
                      handleFetchReport(item.week);
                    }}
                    className={`relative overflow-hidden rounded-2xl p-2.5 flex flex-col items-center text-center transition-all cursor-pointer border ${
                      gestWeek === item.week
                        ? "bg-gradient-to-b from-teal-500/20 to-teal-600/30 border-teal-500 shadow-md ring-2 ring-teal-500/30"
                        : isCurrent
                        ? "bg-white/40 dark:bg-slate-850/40 border-teal-500/40 text-slate-700 dark:text-slate-200"
                        : "bg-white/20 dark:bg-slate-850/20 border-white/20 dark:border-slate-800/20 text-slate-600 dark:text-slate-400 hover:bg-white/30"
                    }`}
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-1.5 shadow-sm border border-white/20">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-1 right-1 text-sm drop-shadow">{item.emoji}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      Wk {item.week}
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate w-full">
                      {item.name.split("/")[0]}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400">
                      {item.sizeCm} • {item.weight}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Week Selector Form */}
            <div className="lg:col-span-1">
              <div className="glass-panel p-5 rounded-2xl space-y-5">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/20 dark:border-slate-800/30 pb-3">
                  <Clock className="h-4.5 w-4.5 text-teal-500" /> Enter Pregnancy Week
                </h2>

                <div className="space-y-4">
                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                    Provide your exact gestational week (1 to 40) to retrieve baby development milestones, size comparisons, and tailor-made tips.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Current Pregnancy Week
                    </label>
                    <input
                      id="input-ai-week"
                      type="number"
                      min={1}
                      max={42}
                      value={gestWeek}
                      onChange={(e) => setGestWeek(parseInt(e.target.value) || 12)}
                      className="w-full px-3 py-2 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-lg text-slate-700 dark:text-slate-200 text-xs focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <button
                  id="btn-fetch-ai-report"
                  onClick={() => handleFetchReport(gestWeek)}
                  disabled={loadingReport}
                  className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loadingReport ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Fetching Milestones...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Load Pregnancy Week {gestWeek} Report
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Report Display */}
            <div className="lg:col-span-2">
              {reportError && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-rose-700 text-xs mb-4">
                  {reportError}
                </div>
              )}

              {weeklyReport ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={gestWeek}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Size Comparison Card with Graphic background */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 p-6 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-2 z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                            Weekly Size Snapshot
                          </span>
                          <span className="text-[10px] font-bold text-teal-200">
                            Trimester {gestWeek <= 12 ? "1" : gestWeek <= 27 ? "2" : "3"}
                          </span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight">Pregnancy Week {gestWeek}</h3>
                        <p className="text-sm font-bold text-teal-50/90 flex items-center gap-2">
                          🍎 Baby is about the size of:{" "}
                          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-white font-black border border-white/30 shadow-inner">
                            {weeklyReport.sizeComparison}
                          </span>
                        </p>
                      </div>

                      <div className="relative shrink-0 z-10 flex items-center justify-center p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md">
                        <Baby className="h-14 w-14 text-white fill-white/20 animate-pulse" />
                      </div>

                      {/* Animated decorative graphics */}
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    </div>

                    {/* Grid for milestones, mother and partner tips */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Milestones Column */}
                      <motion.div
                        whileHover={{ y: -3 }}
                        className="md:col-span-1 glass-panel p-5 rounded-2xl space-y-4 border-t-4 border-teal-500 shadow-sm"
                      >
                        <h4 className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 border-b border-white/20 dark:border-slate-800/30 pb-2 flex items-center gap-1.5">
                          <Activity className="h-4 w-4" /> Fetal Development
                        </h4>
                        <div className="markdown-body text-xs text-slate-650 dark:text-slate-300 leading-relaxed space-y-2">
                          <Markdown>{weeklyReport.fetalDevelopment}</Markdown>
                        </div>
                      </motion.div>

                      {/* Mother Advice Column */}
                      <motion.div
                        whileHover={{ y: -3 }}
                        className="md:col-span-1 glass-panel p-5 rounded-2xl space-y-4 border-t-4 border-rose-400 shadow-sm"
                      >
                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 border-b border-white/20 dark:border-slate-800/30 pb-2 flex items-center gap-1.5">
                          <Heart className="h-4 w-4" /> Advice for Mother
                        </h4>
                        <div className="markdown-body text-xs text-slate-650 dark:text-slate-300 leading-relaxed space-y-2">
                          <Markdown>{weeklyReport.motherTips}</Markdown>
                        </div>
                      </motion.div>

                      {/* Husband support Column */}
                      <motion.div
                        whileHover={{ y: -3 }}
                        className="md:col-span-1 glass-panel p-5 rounded-2xl space-y-4 border-t-4 border-indigo-500 shadow-sm"
                      >
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-white/20 dark:border-slate-800/30 pb-2 flex items-center gap-1.5">
                          <User className="h-4 w-4" /> Support for Partner
                        </h4>
                        <div className="markdown-body text-xs text-slate-650 dark:text-slate-300 leading-relaxed space-y-2">
                          <Markdown>{weeklyReport.partnerTips}</Markdown>
                        </div>
                      </motion.div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-450 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-800 dark:text-amber-400 leading-relaxed italic">
                        Medical Disclaimer: The information provided above is synthesized via generative AI for tracking and developmental support. It does not replace professional midwife care, obstetrician consultations, or medical diagnosis. Please seek physical hospital care for any pregnancy distress.
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                !loadingReport && (
                  <div className="glass-panel p-12 rounded-2xl text-center text-slate-400 dark:text-slate-500 text-xs">
                    Click the Load Pregnancy report button to visualize fetal size, development charts, and partner stashes!
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* MIDWIFE AI CHAT ASSISTANT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick templates column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-450 border-b border-white/20 dark:border-slate-800/30 pb-2 flex items-center gap-1.5">
                <HelpCircle className="h-4.5 w-4.5 text-teal-500" /> Suggested Queries
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Click any standard pregnancy concern to automatically draft your AI query:
              </p>

              <div className="space-y-2.5">
                {[
                  `What should I expect at Week ${gestAge.weeks}?`,
                  `Common symptoms and relief for Week ${gestAge.weeks}?`,
                  `Safe nutrition & foods for Week ${gestAge.weeks}?`,
                  `How can my partner support me at Week ${gestAge.weeks}?`,
                  `Safe prenatal exercises for Week ${gestAge.weeks}?`,
                  "Safe sleeping positions in pregnancy?",
                  "What goes inside a hospital birth plan?"
                ].map((q, i) => (
                  <button
                    key={i}
                    id={`btn-suggested-query-${i}`}
                    onClick={() => setChatQuery(q)}
                    className="w-full text-left p-2.5 bg-white/10 dark:bg-slate-855/10 border border-white/10 dark:border-slate-800/20 text-slate-700 dark:text-slate-200 text-xs rounded-xl font-medium transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate">{q}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-550 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Chat Screen */}
          <div className="lg:col-span-2 glass-panel rounded-2xl flex flex-col h-[550px] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/20 dark:border-slate-800/30 bg-white/10 dark:bg-slate-900/15 flex items-center gap-3 shrink-0">
              <div className="h-10 w-10 bg-teal-500/20 dark:bg-teal-500/30 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 font-extrabold text-sm shrink-0">
                AI
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-none">Kunju Midwife AI</h4>
                <span className="text-[9px] text-teal-600 dark:text-teal-450 font-bold flex items-center gap-1 mt-1">
                  <span className="h-1.5 w-1.5 bg-teal-500 rounded-full animate-pulse"></span> Active Online Care
                </span>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      msg.role === 'user' 
                        ? 'bg-teal-500 text-white' 
                        : 'bg-white/20 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {msg.role === 'user' ? 'ME' : 'AI'}
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 font-sans ${
                      msg.role === 'user'
                        ? 'bg-teal-600 dark:bg-teal-700 text-white rounded-tr-none shadow-sm'
                        : 'bg-white/10 dark:bg-slate-900/10 text-slate-800 dark:text-slate-200 rounded-tl-none border border-white/20 dark:border-slate-800/30 shadow-xs'
                    }`}
                  >
                    <div className="markdown-body">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}

              {loadingChat && (
                <div className="flex gap-3 mr-auto items-center">
                  <div className="h-7 w-7 rounded-full bg-white/20 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black shrink-0">
                    AI
                  </div>
                  <div className="px-4 py-2 bg-white/10 dark:bg-slate-900/10 border border-white/20 dark:border-slate-800/30 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}

              {chatError && (
                <div className="bg-rose-500/15 border-l-4 border-rose-500 p-3 rounded text-rose-700 dark:text-rose-400 text-[10px]">
                  {chatError}
                </div>
              )}
            </div>

            {/* Input Form Footer */}
            <form onSubmit={handleSendChat} className="p-4 border-t border-white/20 dark:border-slate-800/30 bg-transparent shrink-0 flex gap-2">
              <input
                id="input-ai-chat"
                type="text"
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Ask about diet, sleep, kick counting..."
                disabled={loadingChat}
                className="flex-1 px-4 py-2.5 bg-white/20 dark:bg-slate-850/25 border border-white/20 dark:border-slate-800/30 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400/20 disabled:opacity-50"
              />
              <button
                id="btn-send-ai-chat"
                type="submit"
                disabled={loadingChat || !chatQuery.trim()}
                className="p-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
