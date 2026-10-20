import { DayLog, DayMeals, FoodItem, MealType, NutritionTargets } from '../types';
import { DEFAULT_TARGETS, getInitialSeedData, getTodayDateString } from '../utils/nutrition';
import { supabase } from './apiClient';

const LOGS_STORAGE_KEY = 'macroflow_logs_v1';
const TARGETS_STORAGE_KEY = 'macroflow_targets_v1';

// ─── LocalStorage Helpers ───────────────────────────────────────────────────

export function loadNutritionTargets(): NutritionTargets {
  try {
    const raw = localStorage.getItem(TARGETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.dailyCalories === 'number') {
        return {
          dailyCalories: parsed.dailyCalories,
          proteinGrams: parsed.proteinGrams || 150,
          carbsGrams: parsed.carbsGrams || 220,
          fatGrams: parsed.fatGrams || 70,
          fiberGrams: parsed.fiberGrams || 30,
        };
      }
    }
  } catch (e) {
    console.error('Error loading targets from localStorage', e);
  }
  return DEFAULT_TARGETS;
}

export function saveNutritionTargets(targets: NutritionTargets): void {
  try {
    localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targets));
  } catch (e) {
    console.error('Error saving targets to localStorage', e);
  }
}

export function loadAllLogs(): Record<string, DayLog> {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading logs from localStorage', e);
  }

  // If no logs found, initialize with today's seed data
  const todayStr = getTodayDateString();
  const seed = getInitialSeedData(todayStr);
  const initialMap: Record<string, DayLog> = { [todayStr]: seed };
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(initialMap));
  } catch {}
  return initialMap;
}

export function saveAllLogs(logs: Record<string, DayLog>): void {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving logs to localStorage', e);
  }
}

export function getOrCreateDayLog(logs: Record<string, DayLog>, dateStr: string): DayLog {
  if (logs[dateStr]) {
    const log = logs[dateStr];
    return {
      date: dateStr,
      meals: {
        breakfast: Array.isArray(log.meals?.breakfast) ? log.meals.breakfast : [],
        lunch: Array.isArray(log.meals?.lunch) ? log.meals.lunch : [],
        dinner: Array.isArray(log.meals?.dinner) ? log.meals.dinner : [],
        snacks: Array.isArray(log.meals?.snacks) ? log.meals.snacks : [],
      },
      notes: log.notes,
    };
  }

  return {
    date: dateStr,
    meals: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    },
  };
}

// ─── Supabase Cloud Sync ────────────────────────────────────────────────────

export async function fetchNutritionTargetsFromSupabase(): Promise<NutritionTargets | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('nutrition_targets')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) return null;

    return {
      dailyCalories: Number(data.daily_calories) || DEFAULT_TARGETS.dailyCalories,
      proteinGrams: Number(data.protein_grams) || DEFAULT_TARGETS.proteinGrams,
      carbsGrams: Number(data.carbs_grams) || DEFAULT_TARGETS.carbsGrams,
      fatGrams: Number(data.fat_grams) || DEFAULT_TARGETS.fatGrams,
      fiberGrams: Number(data.fiber_grams) || DEFAULT_TARGETS.fiberGrams,
    };
  } catch (err) {
    console.warn('Could not query nutrition_targets from Supabase (table may not exist yet):', err);
    return null;
  }
}

export async function saveNutritionTargetsToSupabase(targets: NutritionTargets): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('nutrition_targets').upsert({
      id: 'default',
      daily_calories: targets.dailyCalories,
      protein_grams: targets.proteinGrams,
      carbs_grams: targets.carbsGrams,
      fat_grams: targets.fatGrams,
      fiber_grams: targets.fiberGrams,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not save nutrition targets to Supabase:', err);
  }
}

export async function fetchAllLogsFromSupabase(): Promise<Record<string, DayLog> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('nutrition_logs').select('*');
    if (error || !data || data.length === 0) return null;

    const logsMap: Record<string, DayLog> = {};
    data.forEach((row: any) => {
      const rawMeals = row.meals || {};
      logsMap[row.date] = {
        date: row.date,
        meals: {
          breakfast: Array.isArray(rawMeals.breakfast) ? rawMeals.breakfast : [],
          lunch: Array.isArray(rawMeals.lunch) ? rawMeals.lunch : [],
          dinner: Array.isArray(rawMeals.dinner) ? rawMeals.dinner : [],
          snacks: Array.isArray(rawMeals.snacks) ? rawMeals.snacks : [],
        },
        notes: row.notes || undefined,
      };
    });

    return logsMap;
  } catch (err) {
    console.warn('Could not query nutrition_logs from Supabase (table may not exist yet):', err);
    return null;
  }
}

export async function saveDayLogToSupabase(dayLog: DayLog): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('nutrition_logs').upsert({
      date: dayLog.date,
      meals: dayLog.meals,
      notes: dayLog.notes || null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not save day log to Supabase:', err);
  }
}

export async function saveAllLogsToSupabase(logs: Record<string, DayLog>): Promise<void> {
  if (!supabase) return;
  try {
    const rows = Object.values(logs).map((l) => ({
      date: l.date,
      meals: l.meals,
      notes: l.notes || null,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      await supabase.from('nutrition_logs').upsert(rows);
    }
  } catch (err) {
    console.warn('Could not sync all logs to Supabase:', err);
  }
}

export async function deleteDayLogFromSupabase(dateStr: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('nutrition_logs').delete().eq('date', dateStr);
  } catch (err) {
    console.warn('Could not delete day log from Supabase:', err);
  }
}

// ─── Import / Export ────────────────────────────────────────────────────────

export function exportDataAsJson(logs: Record<string, DayLog>, targets: NutritionTargets): string {
  const payload = {
    app: 'MacroFlow',
    exportedAt: new Date().toISOString(),
    targets,
    logs,
  };
  return JSON.stringify(payload, null, 2);
}

export function importDataFromJson(jsonStr: string): {
  success: boolean;
  logs?: Record<string, DayLog>;
  targets?: NutritionTargets;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid file format.' };
    }

    let importedLogs: Record<string, DayLog> = {};
    if (parsed.logs && typeof parsed.logs === 'object') {
      importedLogs = parsed.logs;
    }

    let importedTargets: NutritionTargets | undefined;
    if (parsed.targets && typeof parsed.targets.dailyCalories === 'number') {
      importedTargets = parsed.targets;
    }

    return {
      success: true,
      logs: importedLogs,
      targets: importedTargets,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to parse JSON file' };
  }
}
