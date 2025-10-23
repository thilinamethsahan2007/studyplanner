export interface Subject {
  id: 'physics' | 'chemistry' | 'combined' | string;
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
  durationMinutes: number;
}

export interface WeeklySummary {
  weekOf: string; // YYYY-MM-DD, the Sunday the week started on
  totalMinutes: number;
  averageMinutesPerDay: number;
  subjectAverages: { [subjectId: string]: number }; // average minutes per day
}