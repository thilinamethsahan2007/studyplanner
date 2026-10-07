import { Syllabus, Test, Class, Day, LogEntry, WeeklySummary, Unit, Subunit, TodoItem } from '../types';
import { mockSyllabus, mockTests, mockClasses, mockLogs, mockWeeklySummaries } from '../mockData';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const checkSupabase = () => {
    if (!supabase) {
        console.warn('Supabase not configured. Using mock/local data.');
        return false;
    }
    return true;
};

// --- SYLLABUS ---
export const getSyllabus = async (): Promise<Syllabus[]> => {
    if (!checkSupabase()) return mockSyllabus;

    const [sylRes, unitRes, subRes] = await Promise.all([
        supabase.from('syllabus').select('*'),
        supabase.from('syllabus_units').select('*'),
        supabase.from('syllabus_subunits').select('*')
    ]);

    if (sylRes.error || !sylRes.data || sylRes.data.length === 0) {
        await saveSyllabus(mockSyllabus);
        return mockSyllabus;
    }

    const subunits = subRes.data || [];
    const units = unitRes.data || [];
    const syllabuses = sylRes.data || [];

    return syllabuses.map((s: any) => {
        const myUnits = units.filter((u: any) => u.subject_id === s.subject_id).map((u: any) => {
            const mySubunits = subunits.filter((sub: any) => sub.unit_id === u.id).map((sub: any) => ({
                id: sub.id,
                name: sub.name,
                sinhala_name: sub.sinhala_name,
                tuteDone: sub.tute_done,
                pastDone: sub.past_done
            }));

            return {
                id: u.id,
                name: u.name,
                sinhala_name: u.sinhala_name,
                status: u.status,
                subunits: mySubunits
            };
        });

        return {
            subjectId: s.subject_id,
            combinedMode: s.combined_mode,
            units: myUnits
        };
    });
};

export const saveSyllabus = async (data: Syllabus[]): Promise<void> => {
    if (!checkSupabase()) return;

    // Supabase cascade delete will wipe syllabus_units and syllabus_subunits automatically!
    await supabase.from('syllabus').delete().neq('subject_id', 'dummy');

    if (data.length === 0) return;

    // 1. Insert Syllabus parents
    const syllabusRows = data.map(s => ({
        subject_id: s.subjectId,
        combined_mode: s.combinedMode
    }));
    await supabase.from('syllabus').insert(syllabusRows);

    // 2. Insert Units
    const unitRows: any[] = [];
    const subunitRows: any[] = [];

    data.forEach(s => {
        s.units.forEach(u => {
            unitRows.push({
                id: u.id,
                subject_id: s.subjectId,
                name: u.name,
                sinhala_name: u.sinhala_name,
                status: u.status || 'not-started'
            });

            u.subunits.forEach(sub => {
                subunitRows.push({
                    id: sub.id,
                    unit_id: u.id,
                    name: sub.name,
                    sinhala_name: sub.sinhala_name,
                    tute_done: sub.tuteDone || false,
                    past_done: sub.pastDone || false
                });
            });
        });
    });

    if (unitRows.length > 0) {
        // Supabase limits inserts to ~1000 rows, but syllabus is typically ~200 rows max.
        await supabase.from('syllabus_units').insert(unitRows);
    }
    if (subunitRows.length > 0) {
        await supabase.from('syllabus_subunits').insert(subunitRows);
    }
};

// --- TESTS ---
export const getTests = async (): Promise<Test[]> => {
    if (!checkSupabase()) return mockTests;
    const { data, error } = await supabase.from('tests').select('*');
    if (error || !data || data.length === 0 && mockTests.length > 0) return mockTests;
    return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        subjectId: row.subject_id,
        date: row.date,
        score: row.score,
        total: row.total
    }));
};

export const saveTests = async (data: Test[]): Promise<void> => {
    if (!checkSupabase()) return;
    await supabase.from('tests').delete().neq('id', 'dummy');
    if (data.length > 0) {
        await supabase.from('tests').insert(data.map(t => ({
            id: t.id,
            name: t.name,
            subject_id: t.subjectId,
            date: t.date,
            score: t.score,
            total: t.total
        })));
    }
};

// --- CLASSES ---
export const getClasses = async (): Promise<Class[]> => {
    if (!checkSupabase()) return mockClasses;
    const { data, error } = await supabase.from('classes').select('*');
    if (error || !data) return mockClasses;
    return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        weekday: row.weekday,
        start: row.start_time,
        end: row.end_time
    }));
};

export const saveClasses = async (data: Class[]): Promise<void> => {
    if (!checkSupabase()) return;
    await supabase.from('classes').delete().neq('id', 'dummy');
    if (data.length > 0) {
        await supabase.from('classes').insert(data.map(c => ({
            id: c.id,
            name: c.name,
            weekday: c.weekday,
            start_time: c.start,
            end_time: c.end
        })));
    }
};

// --- TODOS ---
const getTodayDateString = (): string => new Date().toISOString().split('T')[0];

export const getTodayTodos = async (): Promise<Day> => {
    const todayStr = getTodayDateString();
    if (!checkSupabase()) return { date: todayStr, items: [] };

    const { data, error } = await supabase.from('todos').select('*');
    if (error || !data) return { date: todayStr, items: [] };

    const allTodos = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        subjectId: row.subject_id,
        note: row.note,
        done: row.done,
        _date: row.date
    }));

    const todaysItems = allTodos.filter(t => t._date === todayStr);
    const unfinishedPrevious = allTodos.filter(t => new Date(t._date) < new Date(todayStr) && !t.done);

    const items = [
        ...unfinishedPrevious.map(t => { const { _date, ...rest } = t; return rest; }), 
        ...todaysItems.map(t => { const { _date, ...rest } = t; return rest; })
    ];

    return { date: todayStr, items };
};

export const saveTodayTodos = async (day: Day): Promise<void> => {
    if (!checkSupabase()) return;
    if (day.items.length > 0) {
        const rows = day.items.map(t => ({
            id: t.id,
            date: day.date,
            title: t.title,
            subject_id: t.subjectId,
            note: t.note,
            done: t.done
        }));
        await supabase.from('todos').upsert(rows);
    }
};

export const getWeekTodos = async (startDate: string, endDate: string): Promise<Day[]> => {
    if (!checkSupabase()) return [];
    const { data, error } = await supabase.from('todos').select('*').gte('date', startDate).lte('date', endDate);
    if (error || !data) return [];
    const daysMap: Record<string, TodoItem[]> = {};
    data.forEach((row: any) => {
        if (!daysMap[row.date]) daysMap[row.date] = [];
        daysMap[row.date].push({
            id: row.id,
            title: row.title,
            subjectId: row.subject_id,
            note: row.note,
            done: row.done
        });
    });
    return Object.keys(daysMap).map(date => ({ date, items: daysMap[date] }));
};
export const saveWeekTodos = async (days: Day[]): Promise<void> => {
    if (!checkSupabase()) return;
    const rows: any[] = [];
    days.forEach(day => {
        day.items.forEach(t => {
            rows.push({
                id: t.id,
                date: day.date,
                title: t.title,
                subject_id: t.subjectId,
                note: t.note,
                done: t.done
            });
        });
    });
    if (rows.length > 0) {
        await supabase.from('todos').upsert(rows);
    }
};
// --- LOGS ---
export const getLogs = async (): Promise<LogEntry[]> => {
    if (!checkSupabase()) return mockLogs;
    const { data, error } = await supabase.from('logs').select('*');
    if (error || !data) return mockLogs;
    return data.map((row: any) => ({
        id: row.id,
        date: row.date,
        todoItemId: row.todo_item_id,
        todoItemTitle: row.todo_item_title,
        subjectId: row.subject_id,
        startTime: row.start_time,
        endTime: row.end_time,
        durationMinutes: row.duration_minutes
    }));
};

export const saveLogs = async (data: LogEntry[]): Promise<void> => {
    if (!checkSupabase()) return;
    await supabase.from('logs').delete().neq('id', 'dummy');
    if (data.length > 0) {
        await supabase.from('logs').insert(data.map(l => ({
            id: l.id,
            date: l.date,
            todo_item_id: l.todoItemId,
            todo_item_title: l.todoItemTitle,
            subject_id: l.subjectId,
            start_time: l.startTime,
            end_time: l.endTime,
            duration_minutes: l.durationMinutes
        })));
    }
};

// --- WEEKLY SUMMARIES ---
export const getWeeklySummaries = async (): Promise<WeeklySummary[]> => {
    if (!checkSupabase()) return mockWeeklySummaries;

    const [wsRes, subRes] = await Promise.all([
        supabase.from('weekly_summaries').select('*'),
        supabase.from('weekly_summary_subjects').select('*')
    ]);

    if (wsRes.error || !wsRes.data) return mockWeeklySummaries;

    const subs = subRes.data || [];

    return wsRes.data.map((row: any) => {
        const mySubs = subs.filter((s: any) => s.week_of === row.week_of);
        const subjectAverages: { [key: string]: number } = {};
        mySubs.forEach((s: any) => {
            subjectAverages[s.subject_id] = s.average_minutes;
        });

        return {
            weekOf: row.week_of,
            totalMinutes: row.total_minutes,
            averageMinutesPerDay: row.average_minutes_per_day,
            subjectAverages
        };
    });
};

export const saveWeeklySummaries = async (data: WeeklySummary[]): Promise<void> => {
    if (!checkSupabase()) return;

    await supabase.from('weekly_summaries').delete().neq('week_of', 'dummy'); // cascades

    if (data.length === 0) return;

    const parentRows = data.map(s => ({
        week_of: s.weekOf,
        total_minutes: s.totalMinutes,
        average_minutes_per_day: s.averageMinutesPerDay
    }));
    await supabase.from('weekly_summaries').insert(parentRows);

    const childRows: any[] = [];
    data.forEach(s => {
        for (const [subjId, avgMins] of Object.entries(s.subjectAverages)) {
            childRows.push({
                id: `${s.weekOf}-${subjId}`,
                week_of: s.weekOf,
                subject_id: subjId,
                average_minutes: avgMins
            });
        }
    });

    if (childRows.length > 0) {
        await supabase.from('weekly_summary_subjects').insert(childRows);
    }
};

const apiClient = {
    getSyllabus, saveSyllabus, getTests, saveTests, getClasses, saveClasses,
    getTodayTodos, saveTodayTodos, getWeekTodos, saveWeekTodos, getLogs, saveLogs, getWeeklySummaries, saveWeeklySummaries,
};

export default apiClient;


