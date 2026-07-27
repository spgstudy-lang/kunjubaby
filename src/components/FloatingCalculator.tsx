import React, { useState } from "react";
import { 
  Calculator, 
  X, 
  Minus, 
  Maximize2, 
  Minimize2, 
  Delete, 
  Sparkles, 
  Calendar, 
  Scale, 
  Percent, 
  Power,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FloatingCalculatorProps {
  isOpen: boolean;
  onToggle: () => void;
  currencySymbol?: string;
}

export default function FloatingCalculator({ isOpen, onToggle, currencySymbol = "₹" }: FloatingCalculatorProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "baby">("standard");
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);

  // Baby Math States
  // 1. LMP Due Date Estimator
  const [lmpDate, setLmpDate] = useState("");
  const [estimatedDueDate, setEstimatedDueDate] = useState<string | null>(null);

  // 2. Weight Converter
  const [weightKg, setWeightKg] = useState("");
  const [weightLbs, setWeightLbs] = useState("");

  // Standard Calculator Key Handlers
  const handleNum = (num: string) => {
    if (display === "0" || display === "Error") {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOp = (op: string) => {
    if (display === "Error") return;
    setEquation(`${display} ${op} `);
    setDisplay("0");
  };

  const handleClear = () => {
    setDisplay("0");
  };

  const handleAllClear = () => {
    setDisplay("0");
    setEquation("");
  };

  const handleBackspace = () => {
    if (display.length === 1 || display === "Error") {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handlePercent = () => {
    try {
      const val = parseFloat(display);
      if (!isNaN(val)) {
        setDisplay((val / 100).toString());
      }
    } catch {
      setDisplay("Error");
    }
  };

  const handleEquals = () => {
    if (!equation || display === "Error") return;
    const fullExpr = equation + display;
    try {
      // Clean and sanitize string before evaluating
      const sanitized = fullExpr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/[^0-9+\-*/.%() ]/g, "");
      
      // Safe evaluation using Function
      // eslint-disable-next-line no-new-func
      const res = new Function(`return ${sanitized}`)();
      if (res === undefined || isNaN(res) || !isFinite(res)) {
        setDisplay("Error");
      } else {
        // Format to max 6 decimals if float
        const resultStr = Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(4)).toString();
        setEquation(fullExpr + " =");
        setDisplay(resultStr);
      }
    } catch {
      setDisplay("Error");
    }
  };

  // Quick Tax/Tip Adder
  const handleApplyTax = (percent: number) => {
    const current = parseFloat(display);
    if (!isNaN(current)) {
      const added = current + (current * (percent / 100));
      setEquation(`${current} + ${percent}% =`);
      setDisplay(parseFloat(added.toFixed(2)).toString());
    }
  };

  // LMP Due Date Calculator (+280 Days)
  const calculateLmpDueDate = (dateStr: string) => {
    setLmpDate(dateStr);
    if (!dateStr) {
      setEstimatedDueDate(null);
      return;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 280); // Naegele's rule approx (+280 days)
      setEstimatedDueDate(d.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      }));
    } else {
      setEstimatedDueDate(null);
    }
  };

  // Weight Conversions
  const handleKgChange = (val: string) => {
    setWeightKg(val);
    const kg = parseFloat(val);
    if (!isNaN(kg)) {
      setWeightLbs((kg * 2.20462).toFixed(2));
    } else {
      setWeightLbs("");
    }
  };

  const handleLbsChange = (val: string) => {
    setWeightLbs(val);
    const lbs = parseFloat(val);
    if (!isNaN(lbs)) {
      setWeightKg((lbs / 2.20462).toFixed(2));
    } else {
      setWeightKg("");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-6 right-6 z-50 w-80 sm:w-88 shadow-2xl rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl transition-all"
      >
        {/* Calculator Title Header Bar */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-200" />
            <span className="text-xs font-black tracking-wide uppercase">Kunju Calculator</span>
            <span className="bg-emerald-400/30 text-emerald-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-300/30">
              ON
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="calc-minimize-btn"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/20 rounded-lg transition-all text-white cursor-pointer"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              id="calc-power-off-btn"
              onClick={onToggle}
              className="p-1 hover:bg-rose-500/80 bg-white/10 rounded-lg transition-all text-white cursor-pointer"
              title="Turn Off Calculator"
            >
              <Power className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* If Minimized, show quick status bar only */}
        {isMinimized ? (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Quick Display:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {currencySymbol} {display}
            </span>
          </div>
        ) : (
          <div>
            {/* Mode Selector Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-1">
              <button
                id="calc-tab-standard"
                onClick={() => setActiveTab("standard")}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "standard"
                    ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Calculator className="h-3.5 w-3.5" /> Standard Math
              </button>
              <button
                id="calc-tab-baby"
                onClick={() => setActiveTab("baby")}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "baby"
                    ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Baby & Medical
              </button>
            </div>

            {/* TAB 1: STANDARD CALCULATOR */}
            {activeTab === "standard" && (
              <div className="p-4 space-y-3">
                {/* Screen Display */}
                <div className="bg-slate-900 text-white rounded-xl p-3 text-right shadow-inner border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-mono h-4 overflow-hidden truncate">
                    {equation || "\u00A0"}
                  </div>
                  <div className="text-2xl font-mono font-bold tracking-wider text-emerald-400 overflow-x-auto truncate">
                    {display}
                  </div>
                </div>

                {/* Quick Tax / Percentage Adders */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="font-semibold flex items-center gap-1">
                    <Percent className="h-3 w-3 text-teal-500" /> Quick Add Tax:
                  </span>
                  <div className="flex gap-1">
                    <button
                      id="calc-tax-5"
                      onClick={() => handleApplyTax(5)}
                      className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 cursor-pointer"
                    >
                      +5%
                    </button>
                    <button
                      id="calc-tax-12"
                      onClick={() => handleApplyTax(12)}
                      className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 cursor-pointer"
                    >
                      +12%
                    </button>
                    <button
                      id="calc-tax-18"
                      onClick={() => handleApplyTax(18)}
                      className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 cursor-pointer"
                    >
                      +18%
                    </button>
                  </div>
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {/* Row 1 */}
                  <button
                    id="calc-key-ac"
                    onClick={handleAllClear}
                    className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all cursor-pointer"
                  >
                    AC
                  </button>
                  <button
                    id="calc-key-c"
                    onClick={handleClear}
                    className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition-all cursor-pointer"
                  >
                    C
                  </button>
                  <button
                    id="calc-key-bs"
                    onClick={handleBackspace}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Delete className="h-3.5 w-3.5" />
                  </button>
                  <button
                    id="calc-key-div"
                    onClick={() => handleOp("÷")}
                    className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-sm transition-all cursor-pointer"
                  >
                    ÷
                  </button>

                  {/* Row 2 */}
                  <button onClick={() => handleNum("7")} className="calc-btn">7</button>
                  <button onClick={() => handleNum("8")} className="calc-btn">8</button>
                  <button onClick={() => handleNum("9")} className="calc-btn">9</button>
                  <button
                    id="calc-key-mul"
                    onClick={() => handleOp("×")}
                    className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-sm transition-all cursor-pointer"
                  >
                    ×
                  </button>

                  {/* Row 3 */}
                  <button onClick={() => handleNum("4")} className="calc-btn">4</button>
                  <button onClick={() => handleNum("5")} className="calc-btn">5</button>
                  <button onClick={() => handleNum("6")} className="calc-btn">6</button>
                  <button
                    id="calc-key-sub"
                    onClick={() => handleOp("-")}
                    className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-sm transition-all cursor-pointer"
                  >
                    -
                  </button>

                  {/* Row 4 */}
                  <button onClick={() => handleNum("1")} className="calc-btn">1</button>
                  <button onClick={() => handleNum("2")} className="calc-btn">2</button>
                  <button onClick={() => handleNum("3")} className="calc-btn">3</button>
                  <button
                    id="calc-key-add"
                    onClick={() => handleOp("+")}
                    className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-sm transition-all cursor-pointer"
                  >
                    +
                  </button>

                  {/* Row 5 */}
                  <button onClick={() => handleNum("0")} className="calc-btn">0</button>
                  <button onClick={() => handleNum(".")} className="calc-btn">.</button>
                  <button onClick={handlePercent} className="calc-btn">%</button>
                  <button
                    id="calc-key-eq"
                    onClick={handleEquals}
                    className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                  >
                    =
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: BABY & MEDICAL MATH TOOLS */}
            {activeTab === "baby" && (
              <div className="p-4 space-y-4 text-xs">
                {/* 1. LMP Due Date Estimator */}
                <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-xl border border-teal-100 dark:border-teal-900/40 space-y-2">
                  <div className="flex items-center justify-between text-teal-800 dark:text-teal-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Due Date Estimator (LMP + 280)
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                      Last Menstrual Period (LMP) Date
                    </label>
                    <input
                      id="input-calc-lmp"
                      type="date"
                      value={lmpDate}
                      onChange={(e) => calculateLmpDueDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  {estimatedDueDate && (
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs font-bold flex justify-between items-center">
                      <span>Estimated Due Date:</span>
                      <span className="font-extrabold">{estimatedDueDate}</span>
                    </div>
                  )}
                </div>

                {/* 2. Weight Converter (Kg ↔ Lbs) */}
                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-2">
                  <div className="flex items-center justify-between text-purple-800 dark:text-purple-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5" /> Baby Weight Converter
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                        Kilograms (kg)
                      </label>
                      <input
                        id="input-calc-kg"
                        type="number"
                        placeholder="e.g. 3.2"
                        value={weightKg}
                        onChange={(e) => handleKgChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                        Pounds (lbs)
                      </label>
                      <input
                        id="input-calc-lbs"
                        type="number"
                        placeholder="e.g. 7.05"
                        value={weightLbs}
                        onChange={(e) => handleLbsChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
