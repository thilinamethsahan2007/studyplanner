import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Zap,
  Loader2,
  Coffee,
  Sun,
  Moon,
  Apple,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  History,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Info,
  Repeat,
  X,
  Calculator,
  Check,
  RotateCcw,
  Download,
  Upload,
  AlertCircle,
  FileJson,
  CheckCircle2,
} from 'lucide-react';
import { MealType, FoodItem, DayLog, NutritionTargets, ParsedMealResponse, DayMeals } from '../types';
import {
  loadNutritionTargets,
  saveNutritionTargets,
  loadAllLogs,
  saveAllLogs,
  getOrCreateDayLog,
  exportDataAsJson,
  importDataFromJson,
  fetchNutritionTargetsFromSupabase,
  saveNutritionTargetsToSupabase,
  fetchAllLogsFromSupabase,
  saveDayLogToSupabase,
  saveAllLogsToSupabase,
  deleteDayLogFromSupabase,
} from '../services/nutritionStore';
import {
  getTodayDateString,
  getTimeSuggestedMeal,
  formatDisplayDate,
  shiftDate,
  sumNutrients,
  sumDayNutrients,
  DEFAULT_TARGETS,
} from '../utils/nutrition';
import { parseMealWithGemini } from '../services/geminiNutrition';

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  onQuickEdit?: () => void;
}

const NutritionToast: React.FC<{ toast: ToastMessage | null; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => onDismiss(), 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3.5 shadow-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200">
      <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5 leading-snug line-clamp-2">
            {toast.description}
          </p>
        )}
        {toast.onQuickEdit && (
          <button
            onClick={() => {
              toast.onQuickEdit?.();
              onDismiss();
            }}
            className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300 hover:text-emerald-500 dark:hover:text-emerald-200 flex items-center gap-1 cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
            <span>Review & Edit Portions</span>
          </button>
        )}
      </div>
      <button onClick={onDismiss} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── MacroSummaryCard ────────────────────────────────────────────────────────

const MacroSummaryCard: React.FC<{
  meals: DayMeals;
  targets: NutritionTargets;
  onOpenTargets: () => void;
}> = ({ meals, targets, onOpenTargets }) => {
  const totals = sumDayNutrients(meals);

  const calConsumed = Math.round(totals.calories);
  const calBudget = targets.dailyCalories;
  const calRemaining = calBudget - calConsumed;
  const calPercent = Math.min(100, Math.round((calConsumed / (calBudget || 1)) * 100));

  const macros = [
    { label: 'Protein', consumed: Math.round(totals.protein), goal: targets.proteinGrams, color: 'blue' },
    { label: 'Carbs', consumed: Math.round(totals.carbs), goal: targets.carbsGrams, color: 'amber' },
    { label: 'Fats', consumed: Math.round(totals.fat), goal: targets.fatGrams, color: 'rose' },
    { label: 'Fiber', consumed: Math.round(totals.fiber), goal: targets.fiberGrams, color: 'teal' },
  ];

  const barColors: Record<string, string> = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-400',
    rose: 'bg-rose-500',
    teal: 'bg-teal-500',
  };

  const labelColors: Record<string, string> = {
    blue: 'text-blue-500 dark:text-blue-400',
    amber: 'text-amber-500 dark:text-amber-400',
    rose: 'text-rose-500 dark:text-rose-400',
    teal: 'text-teal-500 dark:text-teal-400',
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm">
      {/* Top Header Tag */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
        <span className="text-[11px] sm:text-xs font-bold tracking-widest text-slate-500 dark:text-slate-300 uppercase">
          Daily Calorie & Macro Countdown
        </span>
      </div>

      {/* Center Big Dual Numbers */}
      <div className="flex items-baseline justify-center gap-3 sm:gap-6 my-2">
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
              {calConsumed.toLocaleString()}
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-400">kcal</span>
          </div>
          <span className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1">
            Consumed
          </span>
        </div>

        <span className="text-3xl sm:text-5xl font-black text-slate-300 dark:text-slate-500 self-center -mt-4">:</span>

        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl sm:text-6xl font-black font-mono tabular-nums tracking-tight ${calRemaining < 0 ? 'text-amber-500 dark:text-amber-400' : 'text-indigo-500 dark:text-blue-400'}`}>
              {calRemaining >= 0 ? calRemaining.toLocaleString() : `+${Math.abs(calRemaining).toLocaleString()}`}
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-400">
              {calRemaining >= 0 ? 'left' : 'over'}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1">
            {calRemaining >= 0 ? 'Remaining' : 'Over Budget'}
          </span>
        </div>
      </div>

      {/* Subtitle */}
      <div className="text-center mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        <span>Target is </span>
        <strong className="text-slate-900 dark:text-white font-mono">{calBudget.toLocaleString()} kcal</strong>. That's{' '}
        <strong className="text-indigo-500 dark:text-blue-400 font-bold font-mono">{calPercent}%</strong> consumed so far.
        <button
          onClick={onOpenTargets}
          className="ml-2 text-xs font-semibold text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 underline cursor-pointer"
        >
          Adjust Target
        </button>
      </div>

      {/* 4 Macro Bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
        {macros.map((m) => {
          const pct = Math.min(100, Math.round((m.consumed / (m.goal || 1)) * 100));
          return (
            <div key={m.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${labelColors[m.color]}`}>{m.label}</span>
                <span className="text-[11px] font-mono text-slate-400">{pct}%</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-black text-slate-900 dark:text-white font-mono">{m.consumed}g</span>
                <span className="text-[10px] text-slate-400">/ {m.goal}g</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`${barColors[m.color]} h-full rounded-full transition-all`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── QuickLogBar ─────────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  { label: '🍳 3 Eggs & Toast', text: '3 scrambled eggs cooked in 1 tbsp olive oil, 2 slices whole wheat toast with butter, and a medium banana', meal: 'breakfast' as MealType },
  { label: '🥗 Chicken & Rice Bowl', text: '180g grilled chicken breast, 1 cup cooked jasmine rice, and 1.5 cups steamed broccoli with garlic', meal: 'lunch' as MealType },
  { label: '🥩 Salmon & Sweet Potato', text: '6 oz wild salmon fillet pan seared, 1 medium baked sweet potato, and grilled asparagus with 1 tsp butter', meal: 'dinner' as MealType },
  { label: '🥤 Protein Shake & Almonds', text: '1 scoop whey protein isolate in 300ml almond milk, 1 banana, and 28g raw almonds', meal: 'snacks' as MealType },
];

const QuickLogBar: React.FC<{
  currentDate: string;
  activeMealType: MealType;
  onSelectDate: (date: string) => void;
  onSelectMealType: (type: MealType) => void;
  onItemsLogged: (targetDate: string, mealType: MealType, items: FoodItem[], rawText: string) => void;
}> = ({ currentDate, activeMealType, onSelectDate, onSelectMealType, onItemsLogged }) => {
  const [inputText, setInputText] = useState('');
  const [targetLogDate, setTargetLogDate] = useState<string>(currentDate);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectedDateHint, setDetectedDateHint] = useState<{ label: string; date: string } | null>(null);

  const todayStr = getTodayDateString();
  const yesterdayStr = shiftDate(todayStr, -1);
  const twoDaysAgoStr = shiftDate(todayStr, -2);

  useEffect(() => { setTargetLogDate(currentDate); }, [currentDate]);

  useEffect(() => {
    const lower = inputText.toLowerCase();
    if (lower.includes('yesterday') && targetLogDate !== yesterdayStr) {
      setDetectedDateHint({ label: 'Yesterday', date: yesterdayStr });
    } else if ((lower.includes('2 days ago') || lower.includes('day before yesterday')) && targetLogDate !== twoDaysAgoStr) {
      setDetectedDateHint({ label: '2 days ago', date: twoDaysAgoStr });
    } else {
      setDetectedDateHint(null);
    }
  }, [inputText, targetLogDate, yesterdayStr, twoDaysAgoStr]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data: ParsedMealResponse = await parseMealWithGemini(query, activeMealType);

      if (!data.items || data.items.length === 0) {
        throw new Error('No nutritional items could be determined. Please refine proportions.');
      }

      const newFoodItems: FoodItem[] = data.items.map((item, idx) => ({
        id: `food-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: item.name,
        portionDescription: item.portionDescription || '1 serving',
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fat: Number(item.fat) || 0,
        fiber: Number(item.fiber) || 0,
        confidenceNotes: item.confidenceNotes,
        loggedAt: new Date().toISOString(),
      }));

      onItemsLogged(targetLogDate, activeMealType, newFoodItems, query);
      setInputText('');
      setDetectedDateHint(null);
    } catch (err: any) {
      console.error('Error logging food:', err);
      setErrorMsg(err?.message || 'Could not parse meal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const mealButtons: Array<{ id: MealType; label: string; icon: React.ReactNode }> = [
    { id: 'breakfast', label: 'Breakfast', icon: <Coffee className="w-3.5 h-3.5" /> },
    { id: 'lunch', label: 'Lunch', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'dinner', label: 'Dinner', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'snacks', label: 'Snacks', icon: <Apple className="w-3.5 h-3.5" /> },
  ];

  const { relative: targetDateRelative } = formatDisplayDate(targetLogDate);

  return (
    <div id="quick-log-section" className="space-y-3">
      {/* Target Date & Meal Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Meal Category Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          {mealButtons.map((btn) => {
            const isActive = activeMealType === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => onSelectMealType(btn.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filter Strip */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { setTargetLogDate(todayStr); onSelectDate(todayStr); }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                targetLogDate === todayStr
                  ? 'bg-amber-500 text-white font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { setTargetLogDate(yesterdayStr); onSelectDate(yesterdayStr); }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                targetLogDate === yesterdayStr
                  ? 'bg-amber-500 text-white font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Yesterday
            </button>
          </div>

          <label
            htmlFor="nutrition-target-log-date-picker"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-2xl text-slate-600 dark:text-slate-300 cursor-pointer font-medium text-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{targetDateRelative || targetLogDate}</span>
            <input
              id="nutrition-target-log-date-picker"
              type="date"
              max={todayStr}
              value={targetLogDate}
              onChange={(e) => {
                if (e.target.value) {
                  setTargetLogDate(e.target.value);
                  onSelectDate(e.target.value);
                }
              }}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* Detected keyword hint */}
      {detectedDateHint && (
        <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 rounded-xl text-xs text-amber-700 dark:text-amber-300">
          <span>
            Detected <strong>"{detectedDateHint.label.toLowerCase()}"</strong>. Switch entry to {detectedDateHint.label}?
          </span>
          <button
            type="button"
            onClick={() => {
              setTargetLogDate(detectedDateHint.date);
              onSelectDate(detectedDateHint.date);
              setDetectedDateHint(null);
            }}
            className="font-bold text-amber-600 dark:text-amber-400 underline flex items-center gap-1 cursor-pointer hover:text-amber-500 dark:hover:text-amber-300 shrink-0"
          >
            <span>Switch</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* The Input Bar */}
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-500/30 focus-within:border-indigo-400 focus-within:shadow-[0_0_25px_rgba(99,102,241,0.15)] dark:focus-within:shadow-[0_0_25px_rgba(99,102,241,0.25)] rounded-2xl p-2 transition-all shadow-sm">
          <div className="pl-3 pr-2 text-indigo-500 dark:text-indigo-400">
            <Zap className="w-5 h-5 fill-indigo-500/20 text-indigo-500 dark:text-indigo-400" />
          </div>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type '3 scrambled eggs with avocado and 2 slices toast' or '200g chicken breast'..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none py-1.5 px-1"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="shrink-0 flex items-center gap-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all cursor-pointer ml-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Parsing</span>
              </>
            ) : (
              <span>Add</span>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 px-3 py-2 rounded-xl">
            {errorMsg}
          </div>
        )}
      </form>

      {/* Quick Example Prompt Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Try:
        </span>
        {EXAMPLE_PROMPTS.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setInputText(ex.text);
              onSelectMealType(ex.meal);
            }}
            className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 transition-all cursor-pointer"
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── MealSectionCard ─────────────────────────────────────────────────────────

const MEAL_CONFIG: Record<
  MealType,
  { title: string; subtitle: string; icon: React.ReactNode; dotColor: string; pillLight: string; pillDark: string }
> = {
  breakfast: {
    title: 'Breakfast',
    subtitle: 'Morning meal & fuel',
    icon: <Coffee className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
    dotColor: 'bg-amber-400',
    pillLight: 'bg-amber-50 text-amber-700 border-amber-200',
    pillDark: 'dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40',
  },
  lunch: {
    title: 'Lunch',
    subtitle: 'Midday nutrition',
    icon: <Sun className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
    dotColor: 'bg-emerald-400',
    pillLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pillDark: 'dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40',
  },
  dinner: {
    title: 'Dinner',
    subtitle: 'Evening sustenance',
    icon: <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
    dotColor: 'bg-indigo-400',
    pillLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    pillDark: 'dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40',
  },
  snacks: {
    title: 'Snacks & Bites',
    subtitle: 'Pre/post workout & between meals',
    icon: <Apple className="w-4 h-4 text-rose-500 dark:text-rose-400" />,
    dotColor: 'bg-rose-400',
    pillLight: 'bg-rose-50 text-rose-700 border-rose-200',
    pillDark: 'dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/40',
  },
};

const MealSectionCard: React.FC<{
  mealType: MealType;
  items: FoodItem[];
  onEditItem: (mealType: MealType, item: FoodItem) => void;
  onDeleteItem: (mealType: MealType, itemId: string) => void;
  onQuickAdd: (mealType: MealType) => void;
}> = ({ mealType, items, onEditItem, onDeleteItem, onQuickAdd }) => {
  const [isOpen, setIsOpen] = useState(true);
  const config = MEAL_CONFIG[mealType];
  const totals = sumNutrients(items);

  return (
    <div
      id={`meal-${mealType}`}
      className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm transition-all"
    >
      {/* Header Bar */}
      <div
        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0">
            {config.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {config.title}
              </h4>
              <span className="text-xs text-slate-400 font-medium">
                ({items.length} {items.length === 1 ? 'item' : 'items'})
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate hidden sm:block">
              {config.subtitle}
            </p>
          </div>
        </div>

        {/* Aggregated Totals & Toggle */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-base font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {Math.round(totals.calories)}{' '}
              <span className="text-xs font-normal text-slate-400">kcal</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium tabular-nums font-mono hidden md:flex items-center gap-2 justify-end">
              <span className="text-blue-500 dark:text-blue-400 font-semibold">{Math.round(totals.protein)}g P</span>
              <span>·</span>
              <span className="text-amber-500 dark:text-amber-400 font-semibold">{Math.round(totals.carbs)}g C</span>
              <span>·</span>
              <span className="text-rose-500 dark:text-rose-400 font-semibold">{Math.round(totals.fat)}g F</span>
              {totals.fiber > 0 && (
                <>
                  <span>·</span>
                  <span className="text-teal-500 dark:text-teal-400 font-semibold">{Math.round(totals.fiber)}g Fib</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Items List */}
      {isOpen && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-3">
          {items.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-400">
                No food logged yet for {config.title.toLowerCase()}.
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onQuickAdd(mealType); }}
                className="mt-2 text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add meal here</span>
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group p-4 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all shadow-sm"
              >
                {/* Left side */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-500/80 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                        {item.name}
                      </span>
                      <Repeat className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 opacity-70" />
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.pillLight} ${config.pillDark}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}></span>
                        <span>{item.portionDescription}</span>
                      </span>

                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums flex items-center gap-1.5">
                        <span className="text-blue-500 dark:text-blue-400 font-semibold">{item.protein}g P</span>
                        <span>/</span>
                        <span className="text-amber-500 dark:text-amber-400 font-semibold">{item.carbs}g C</span>
                        <span>/</span>
                        <span className="text-rose-500 dark:text-rose-400 font-semibold">{item.fat}g F</span>
                        {item.fiber > 0 && (
                          <>
                            <span>/</span>
                            <span className="text-teal-500 dark:text-teal-400 font-semibold">{item.fiber}g Fib</span>
                          </>
                        )}
                      </span>

                      {item.confidenceNotes && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 italic hidden sm:flex items-center gap-1 ml-1">
                          <Info className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>{item.confidenceNotes}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700 w-full sm:w-auto">
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 dark:text-white font-mono tabular-nums">
                      {Math.round(item.calories)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">kcal</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditItem(mealType, item)}
                      aria-label="Edit item"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Edit portion or nutrition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(mealType, item.id)}
                      aria-label="Delete item"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {items.length > 0 && (
            <div className="pt-1 text-right">
              <button
                type="button"
                onClick={() => onQuickAdd(mealType)}
                className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add more to {config.title}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── ItemEditModal ───────────────────────────────────────────────────────────

const ItemEditModal: React.FC<{
  isOpen: boolean;
  item: FoodItem | null;
  mealType: MealType;
  onClose: () => void;
  onSave: (mealType: MealType, updatedItem: FoodItem) => void;
}> = ({ isOpen, item, mealType, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [portion, setPortion] = useState('');
  const [calories, setCalories] = useState<number>(0);
  const [protein, setProtein] = useState<number>(0);
  const [carbs, setCarbs] = useState<number>(0);
  const [fat, setFat] = useState<number>(0);
  const [fiber, setFiber] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setPortion(item.portionDescription || '');
      setCalories(item.calories || 0);
      setProtein(item.protein || 0);
      setCarbs(item.carbs || 0);
      setFat(item.fat || 0);
      setFiber(item.fiber || 0);
      setNotes(item.confidenceNotes || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const computedCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const diff = Math.abs(computedCalories - calories);

  const handleAutoAlignCalories = () => setCalories(computedCalories);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updated: FoodItem = {
      ...item,
      name: name.trim(),
      portionDescription: portion.trim() || '1 serving',
      calories: Math.max(0, Number(calories) || 0),
      protein: Math.max(0, Number(protein) || 0),
      carbs: Math.max(0, Number(carbs) || 0),
      fat: Math.max(0, Number(fat) || 0),
      fiber: Math.max(0, Number(fiber) || 0),
      confidenceNotes: notes.trim() || undefined,
    };

    onSave(mealType, updated);
    onClose();
  };

  const inputClass = "w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Nutrition Item</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">Logged under {mealType}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Food Item Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Portion / Quantity Description</label>
            <input type="text" value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="e.g. 2 large eggs, 150g, 1 cup cooked" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Protein (g)</label>
              <input type="number" step="0.1" min="0" value={protein} onChange={(e) => setProtein(parseFloat(e.target.value) || 0)} className={`${inputClass} font-mono tabular-nums`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-500 dark:text-amber-400 mb-1">Carbs (g)</label>
              <input type="number" step="0.1" min="0" value={carbs} onChange={(e) => setCarbs(parseFloat(e.target.value) || 0)} className={`${inputClass} font-mono tabular-nums`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-rose-500 dark:text-rose-400 mb-1">Fat (g)</label>
              <input type="number" step="0.1" min="0" value={fat} onChange={(e) => setFat(parseFloat(e.target.value) || 0)} className={`${inputClass} font-mono tabular-nums`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-teal-500 dark:text-teal-400 mb-1">Fiber (g)</label>
              <input type="number" step="0.1" min="0" value={fiber} onChange={(e) => setFiber(parseFloat(e.target.value) || 0)} className={`${inputClass} font-mono tabular-nums`} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-900 dark:text-white">Calories (kcal)</label>
              {diff > 15 && (
                <button type="button" onClick={handleAutoAlignCalories} className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer">
                  <Calculator className="w-3 h-3" />
                  <span>Set to {computedCalories} kcal</span>
                </button>
              )}
            </div>
            <input type="number" min="0" value={calories} onChange={(e) => setCalories(parseInt(e.target.value, 10) || 0)} className={`${inputClass} text-base font-mono tabular-nums font-bold`} />
            <div className="mt-1 text-[11px] text-slate-400">Formula: (P×4) + (C×4) + (F×9) = {computedCalories} kcal</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Notes (Optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Cooked with spray oil, USDA standard" className={inputClass} />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/30">
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── TargetsModal ────────────────────────────────────────────────────────────

const PRESETS = [
  { name: 'Balanced', desc: '40% Carbs · 30% Protein · 30% Fat', cRatio: 0.4, pRatio: 0.3, fRatio: 0.3 },
  { name: 'High Protein', desc: '35% Carbs · 40% Protein · 25% Fat', cRatio: 0.35, pRatio: 0.4, fRatio: 0.25 },
  { name: 'Low Carb', desc: '20% Carbs · 45% Protein · 35% Fat', cRatio: 0.2, pRatio: 0.45, fRatio: 0.35 },
  { name: 'Keto Focused', desc: '5% Carbs · 25% Protein · 70% Fat', cRatio: 0.05, pRatio: 0.25, fRatio: 0.7 },
];

const TargetsModal: React.FC<{
  isOpen: boolean;
  targets: NutritionTargets;
  onClose: () => void;
  onSaveTargets: (newTargets: NutritionTargets) => void;
}> = ({ isOpen, targets, onClose, onSaveTargets }) => {
  const [dailyCalories, setDailyCalories] = useState(targets.dailyCalories);
  const [proteinGrams, setProteinGrams] = useState(targets.proteinGrams);
  const [carbsGrams, setCarbsGrams] = useState(targets.carbsGrams);
  const [fatGrams, setFatGrams] = useState(targets.fatGrams);
  const [fiberGrams, setFiberGrams] = useState(targets.fiberGrams);

  if (!isOpen) return null;

  const applyPreset = (pRatio: number, cRatio: number, fRatio: number) => {
    setProteinGrams(Math.round((dailyCalories * pRatio) / 4));
    setCarbsGrams(Math.round((dailyCalories * cRatio) / 4));
    setFatGrams(Math.round((dailyCalories * fRatio) / 9));
  };

  const computedCalories = Math.round(proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTargets({
      dailyCalories: Math.max(500, Number(dailyCalories) || 2000),
      proteinGrams: Math.max(10, Number(proteinGrams) || 100),
      carbsGrams: Math.max(10, Number(carbsGrams) || 150),
      fatGrams: Math.max(10, Number(fatGrams) || 50),
      fiberGrams: Math.max(5, Number(fiberGrams) || 25),
    });
    onClose();
  };

  const handleResetDefault = () => {
    setDailyCalories(DEFAULT_TARGETS.dailyCalories);
    setProteinGrams(DEFAULT_TARGETS.proteinGrams);
    setCarbsGrams(DEFAULT_TARGETS.carbsGrams);
    setFatGrams(DEFAULT_TARGETS.fatGrams);
    setFiberGrams(DEFAULT_TARGETS.fiberGrams);
  };

  const inputClass = "w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Nutrition Targets</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Adjust daily calorie budget and macronutrient split</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Daily Calorie Target (kcal)</label>
            <input type="number" step="50" min="800" max="10000" value={dailyCalories} onChange={(e) => setDailyCalories(parseInt(e.target.value, 10) || 0)} required className={`${inputClass} text-base font-bold font-mono tabular-nums focus:border-amber-400`} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Preset Macro Splits</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p.pRatio, p.cRatio, p.fRatio)}
                  className="p-2.5 text-left bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Protein (g)</label>
              <input type="number" min="0" value={proteinGrams} onChange={(e) => setProteinGrams(parseInt(e.target.value, 10) || 0)} className={`${inputClass} font-mono tabular-nums font-bold focus:border-blue-500`} />
              <span className="text-[10px] text-slate-400 mt-0.5 block">{Math.round(proteinGrams * 4)} kcal</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-500 dark:text-amber-400 mb-1">Carbs (g)</label>
              <input type="number" min="0" value={carbsGrams} onChange={(e) => setCarbsGrams(parseInt(e.target.value, 10) || 0)} className={`${inputClass} font-mono tabular-nums font-bold focus:border-amber-500`} />
              <span className="text-[10px] text-slate-400 mt-0.5 block">{Math.round(carbsGrams * 4)} kcal</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-rose-500 dark:text-rose-400 mb-1">Fats (g)</label>
              <input type="number" min="0" value={fatGrams} onChange={(e) => setFatGrams(parseInt(e.target.value, 10) || 0)} className={`${inputClass} font-mono tabular-nums font-bold focus:border-rose-500`} />
              <span className="text-[10px] text-slate-400 mt-0.5 block">{Math.round(fatGrams * 9)} kcal</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-teal-500 dark:text-teal-400 mb-1">Fiber (g)</label>
              <input type="number" min="0" value={fiberGrams} onChange={(e) => setFiberGrams(parseInt(e.target.value, 10) || 0)} className={`${inputClass} font-mono tabular-nums font-bold focus:border-teal-500`} />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Digestive</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Total macro calories:</span>
            <span className="font-mono tabular-nums font-bold text-amber-500 dark:text-amber-400">{computedCalories} kcal</span>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <button type="button" onClick={handleResetDefault} className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/30">
                <Check className="w-3.5 h-3.5" />
                <span>Save Targets</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── HistoryExportModal ──────────────────────────────────────────────────────

const HistoryExportModal: React.FC<{
  isOpen: boolean;
  logs: Record<string, DayLog>;
  targets: NutritionTargets;
  currentDate: string;
  onSelectDate: (date: string) => void;
  onImportSuccess: (importedLogs: Record<string, DayLog>, targets?: NutritionTargets) => void;
  onClearDay: (date: string) => void;
  onClose: () => void;
}> = ({ isOpen, logs, targets, currentDate, onSelectDate, onImportSuccess, onClearDay, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const todayStr = getTodayDateString();
  const [customPastDate, setCustomPastDate] = useState<string>(shiftDate(todayStr, -1));

  if (!isOpen) return null;

  const sortedDates = Object.keys(logs).sort().reverse();

  const handleExport = () => {
    const jsonString = exportDataAsJson(logs, targets);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `macroflow_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDataFromJson(content);
      if (res.success && res.logs) {
        onImportSuccess(res.logs, res.targets);
        setImportStatus('Data imported successfully!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus(`Import failed: ${res.error || 'Invalid file format'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleJumpToPastDate = (date: string) => {
    onSelectDate(date);
    onClose();
  };

  const inputClass = "w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Log Past Days & History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Missed logging a day? Add what you ate for previous dates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {importStatus && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${importStatus.includes('failed') ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'}`}>
              <AlertCircle className="w-4 h-4" />
              <span>{importStatus}</span>
            </div>
          )}

          {/* Quick Add For Past Day */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Log a Missed Day</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Select which day you want to record meals for, and the app will switch to that day's log so you can enter your food items.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[-1, -2, -3].map((offset) => {
                const date = shiftDate(todayStr, offset);
                const labels = ['Yesterday', '2 Days Ago', '3 Days Ago'];
                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => handleJumpToPastDate(date)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-white bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors cursor-pointer"
                  >
                    {labels[-offset - 1]} ({date})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Or specific date:</span>
              <input
                type="date"
                max={todayStr}
                value={customPastDate}
                onChange={(e) => setCustomPastDate(e.target.value)}
                className="px-3 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleJumpToPastDate(customPastDate)}
                className="px-3.5 py-1 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-500/30"
              >
                <span>Go to this day</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Export / Import Strip */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <button
              onClick={handleExport}
              className="flex-1 min-w-[140px] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Export All Logs</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-w-[140px] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Import JSON File</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Saved Days History */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Saved Log Days ({sortedDates.length})
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {sortedDates.map((dateStr) => {
                const dayLog = logs[dateStr];
                const totals = sumDayNutrients(dayLog.meals);
                const { main, relative } = formatDisplayDate(dateStr);
                const isSelected = dateStr === currentDate;
                const totalItemsCount =
                  (dayLog.meals.breakfast?.length || 0) +
                  (dayLog.meals.lunch?.length || 0) +
                  (dayLog.meals.dinner?.length || 0) +
                  (dayLog.meals.snacks?.length || 0);

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleJumpToPastDate(dateStr)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500 shadow-md shadow-indigo-500/10 dark:shadow-indigo-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{main}</span>
                        {relative && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                            {relative}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums font-mono mt-0.5">
                        <span className="font-bold text-slate-900 dark:text-white">{Math.round(totals.calories)} kcal</span>
                        {' · '}
                        <span className="text-blue-500 dark:text-blue-400">P: {Math.round(totals.protein)}g</span>
                        {' · '}
                        <span className="text-amber-500 dark:text-amber-400">C: {Math.round(totals.carbs)}g</span>
                        {' · '}
                        <span className="text-rose-500 dark:text-rose-400">F: {Math.round(totals.fat)}g</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-400 dark:hover:text-indigo-300">
                        {isSelected ? 'Viewing' : 'Open'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Clear all logs for ${dateStr}?`)) {
                            onClearDay(dateStr);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Clear this day's entries"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-400">
          <span>All past entries saved locally.</span>
          <button onClick={onClose} className="px-4 py-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── NutritionPage (Main) ────────────────────────────────────────────────────

const NutritionPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<string>(() => getTodayDateString());
  const [logs, setLogs] = useState<Record<string, DayLog>>(() => loadAllLogs());
  const [targets, setTargets] = useState<NutritionTargets>(() => loadNutritionTargets());
  const [activeMealType, setActiveMealType] = useState<MealType>(() => getTimeSuggestedMeal());

  // Modal state
  const [editingItemState, setEditingItemState] = useState<{ mealType: MealType; item: FoodItem } | null>(null);
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Initial sync from Supabase (with fallback to local storage)
  useEffect(() => {
    let isMounted = true;
    const syncFromRemote = async () => {
      try {
        const [remoteLogs, remoteTargets] = await Promise.all([
          fetchAllLogsFromSupabase(),
          fetchNutritionTargetsFromSupabase(),
        ]);
        if (!isMounted) return;

        if (remoteLogs && Object.keys(remoteLogs).length > 0) {
          setLogs((prev) => {
            const merged = { ...prev, ...remoteLogs };
            saveAllLogs(merged);
            return merged;
          });
        }
        if (remoteTargets) {
          setTargets(remoteTargets);
          saveNutritionTargets(remoteTargets);
        }
      } catch (e) {
        console.warn('Initial Supabase nutrition sync check:', e);
      }
    };
    syncFromRemote();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync to local storage & Supabase
  useEffect(() => {
    saveAllLogs(logs);
    saveAllLogsToSupabase(logs);
  }, [logs]);

  useEffect(() => {
    saveNutritionTargets(targets);
    saveNutritionTargetsToSupabase(targets);
  }, [targets]);

  const currentDayLog = getOrCreateDayLog(logs, currentDate);

  // Date navigator helpers
  const todayStr = getTodayDateString();
  const isToday = currentDate === todayStr;
  const { main: dateMain, relative: dateRelative } = formatDisplayDate(currentDate);

  // Handlers
  const handleItemsLogged = (targetDate: string, mealType: MealType, newItems: FoodItem[], rawText: string) => {
    setLogs((prev) => {
      const day = getOrCreateDayLog(prev, targetDate);
      const updatedMeals = {
        ...day.meals,
        [mealType]: [...(day.meals[mealType] || []), ...newItems],
      };
      return { ...prev, [targetDate]: { ...day, meals: updatedMeals } };
    });

    if (targetDate !== currentDate) setCurrentDate(targetDate);

    const firstItem = newItems[0];
    const totalCals = newItems.reduce((acc, it) => acc + it.calories, 0);

    setToast({
      id: String(Date.now()),
      title: `Added ${newItems.length} item${newItems.length > 1 ? 's' : ''} to ${mealType.toUpperCase()}`,
      description: `+${Math.round(totalCals)} kcal for ${targetDate} (${newItems.map((i) => i.name).join(', ')})`,
      onQuickEdit: firstItem ? () => setEditingItemState({ mealType, item: firstItem }) : undefined,
    });
  };

  const handleSaveEditedItem = (mealType: MealType, updatedItem: FoodItem) => {
    setLogs((prev) => {
      const day = getOrCreateDayLog(prev, currentDate);
      const mealList = day.meals[mealType] || [];
      const index = mealList.findIndex((i) => i.id === updatedItem.id);

      let updatedList: FoodItem[];
      if (index >= 0) {
        updatedList = [...mealList];
        updatedList[index] = updatedItem;
      } else {
        updatedList = [...mealList, updatedItem];
      }

      return { ...prev, [currentDate]: { ...day, meals: { ...day.meals, [mealType]: updatedList } } };
    });
  };

  const handleDeleteItem = (mealType: MealType, itemId: string) => {
    setLogs((prev) => {
      const day = getOrCreateDayLog(prev, currentDate);
      const updatedMeal = (day.meals[mealType] || []).filter((i) => i.id !== itemId);
      return { ...prev, [currentDate]: { ...day, meals: { ...day.meals, [mealType]: updatedMeal } } };
    });
  };

  const handleClearDay = (dateStr: string) => {
    setLogs((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
    deleteDayLogFromSupabase(dateStr);
  };

  const handleQuickAdd = (mealType: MealType) => {
    setActiveMealType(mealType);
    const logSection = document.getElementById('quick-log-section');
    if (logSection) {
      logSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = logSection.querySelector('input');
      input?.focus();
    }
  };

  return (
    <div className="space-y-7 max-w-4xl mx-auto">
      {/* Date Navigator */}
      <div className="space-y-3 pb-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Date Display & Nav */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setCurrentDate(shiftDate(currentDate, -1))}
                aria-label="Previous day"
                title="Previous day"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {!isToday && (
                <button
                  onClick={() => setCurrentDate(todayStr)}
                  className="px-2.5 py-1 text-xs font-bold text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Today
                </button>
              )}
              <button
                onClick={() => setCurrentDate(shiftDate(currentDate, 1))}
                aria-label="Next day"
                title="Next day"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span>{dateMain}</span>
                {dateRelative && (
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isToday
                      ? 'text-indigo-500 dark:text-blue-400 bg-indigo-50 dark:bg-blue-950/60 border-indigo-200 dark:border-blue-800/50'
                      : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/50'
                  }`}>
                    {dateRelative}
                  </span>
                )}
              </h2>
            </div>
          </div>

          {/* Right: Quick buttons */}
          <div className="flex items-center gap-2 text-xs text-slate-400 self-end sm:self-auto">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors font-semibold"
            >
              <History className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Missed a Day?</span>
            </button>

            <label
              htmlFor="nutrition-date-picker"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors font-semibold"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Calendar</span>
              <input
                id="nutrition-date-picker"
                type="date"
                max={todayStr}
                value={currentDate}
                onChange={(e) => { if (e.target.value) setCurrentDate(e.target.value); }}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {/* Past Date Banner */}
        {!isToday && (
          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600/40 rounded-2xl text-xs text-amber-700 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-600 dark:text-amber-400">Past Date Journal:</span>
              <span>{dateMain} ({dateRelative}) — Meals logged will be added to this day.</span>
            </div>
            <button
              onClick={() => setCurrentDate(todayStr)}
              className="font-bold text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-white hover:underline flex items-center gap-1 shrink-0 ml-3 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Today</span>
            </button>
          </div>
        )}
      </div>

      {/* Macro Summary */}
      <MacroSummaryCard
        meals={currentDayLog.meals}
        targets={targets}
        onOpenTargets={() => setIsTargetsModalOpen(true)}
      />

      {/* Quick Log Bar */}
      <QuickLogBar
        currentDate={currentDate}
        activeMealType={activeMealType}
        onSelectDate={(d) => setCurrentDate(d)}
        onSelectMealType={(type) => setActiveMealType(type)}
        onItemsLogged={handleItemsLogged}
      />

      {/* Meal Sections */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {currentDate === getTodayDateString() ? "Today's Meals" : `${currentDate} Meals`}
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Click any meal to collapse or expand
          </span>
        </div>

        {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((mt) => (
          <MealSectionCard
            key={mt}
            mealType={mt}
            items={currentDayLog.meals[mt] || []}
            onEditItem={(m, item) => setEditingItemState({ mealType: m, item })}
            onDeleteItem={handleDeleteItem}
            onQuickAdd={handleQuickAdd}
          />
        ))}
      </div>

      {/* Modals */}
      <ItemEditModal
        isOpen={Boolean(editingItemState)}
        item={editingItemState?.item || null}
        mealType={editingItemState?.mealType || 'breakfast'}
        onClose={() => setEditingItemState(null)}
        onSave={handleSaveEditedItem}
      />

      <TargetsModal
        isOpen={isTargetsModalOpen}
        targets={targets}
        onClose={() => setIsTargetsModalOpen(false)}
        onSaveTargets={(t) => setTargets(t)}
      />

      <HistoryExportModal
        isOpen={isHistoryModalOpen}
        logs={logs}
        targets={targets}
        currentDate={currentDate}
        onSelectDate={(d) => setCurrentDate(d)}
        onImportSuccess={(impLogs, impTargets) => {
          setLogs(impLogs);
          if (impTargets) setTargets(impTargets);
        }}
        onClearDay={handleClearDay}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Toast */}
      <NutritionToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default NutritionPage;
