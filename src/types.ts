export interface Subject {
  id: 'physics' | 'chemistry' | 'combined' | 'microcredentials' | string;
  name: string;
  sinhala_name: string;
  color: string;
}

export interface Subunit {
  id: string;
  name: string;
  sinhala_name: string;
  tuteDone?: boolean;
  pastDone?: boolean;
}

export interface Unit {
  id:string;
  name: string;
  sinhala_name: string;
  subunits: Subunit[];
  status?: 'not-started' | 'ongoing' | 'completed';
}

export interface Syllabus {
  subjectId: 'physics' | 'chemistry' | 'combined' | 'combined-applied' | string;
  units: Unit[];
  combinedMode?: 'pure' | 'applied' | null;
}

export interface TodoItem {
  id: string;
  title: string;
  subjectId: string;
  note: string;
  done: boolean;
  estimatedMinutes?: number;
  recurring?: boolean;
}

export interface Day {
  date: string;
  items: TodoItem[];
}

export interface Test {
    id: string;
    name: string;
    subjectId: string;
    date: string;
    score: number;
    total: number;
}

export interface Class {
    id: string;
    name: string;
    weekday: number;
    start: string;
    end: string;
}

export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  todoItemId: string;
  todoItemTitle: string;
  subjectId: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakMinutes?: number;
  durationMinutes: number;
}

export interface WeeklySummary {
  weekOf: string; // YYYY-MM-DD, the Monday the week started on (Mon-Sat study, Sunday rest)
  totalMinutes: number;
  averageMinutesPerDay: number;
  subjectAverages: { [subjectId: string]: number }; // average minutes per day
}
export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  photos: string[]; // Base64 data URLs
  completedTasks: { title: string, subjectId: string }[];
}

// --- Nutrition / Calorie Tracking Types ---
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface FoodItem {
  id: string;
  name: string;
  portionDescription: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidenceNotes?: string;
  loggedAt: string;
}

export interface DayMeals {
  breakfast: FoodItem[];
  lunch: FoodItem[];
  dinner: FoodItem[];
  snacks: FoodItem[];
}

export interface DayLog {
  date: string;
  meals: DayMeals;
  notes?: string;
}

export interface NutritionTargets {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
}

export interface ParsedMealResponse {
  success: boolean;
  items: Array<{
    name: string;
    portionDescription: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    confidenceNotes?: string;
  }>;
  summaryNote?: string;
  fallbackMode?: boolean;
}
