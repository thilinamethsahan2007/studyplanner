import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TodoPage from './pages/TodoPage';
import WeeklyPlannerPage from './pages/WeeklyPlannerPage';
import SubjectPage from './pages/SubjectPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LogBookPage from './pages/LogBookPage';
import CmsPage from './pages/CmsPage';
import JournalPage from './pages/JournalPage';
import NutritionPage from './pages/NutritionPage';
import { mockSubjects } from './mockData';
import { Syllabus, Test, Class, LogEntry, WeeklySummary, Day } from './types';
import CommandPalette from './components/CommandPalette';
import apiClient from './services/apiClient';
import ThemeSwitcher from './components/ThemeSwitcher';
// Lucide Icons
import { LayoutDashboard, CalendarDays, BookOpen, BookHeart, BarChart2, Settings, FlaskConical, Atom, Calculator, Dumbbell, Gamepad2, Award, Menu, X, UtensilsCrossed } from 'lucide-react';


const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0,0,0,0);
    return start;
};

const getSubjectIcon = (id: string) => {
    switch(id) {
        case 'physics': return <Atom className="w-4 h-4 text-sky-500" />;
        case 'chemistry': return <FlaskConical className="w-4 h-4 text-fuchsia-500" />;
        case 'combined': return <Calculator className="w-4 h-4 text-emerald-500" />;
        case 'microcredentials': return <Award className="w-4 h-4 text-amber-500" />;
        case 'exercise': return <Dumbbell className="w-4 h-4 text-orange-500" />;
        case 'entertainment': return <Gamepad2 className="w-4 h-4 text-rose-500" />;
        default: return <BookOpen className="w-4 h-4 text-slate-400" />;
    }
}

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick?: () => void }> = ({ to, icon, label, onClick }) => (
    <NavLink 
        to={to} 
        onClick={onClick}
        className={({ isActive }) => `flex items-center px-3.5 py-2.5 rounded-xl transition-all duration-200 press-scale ${
            isActive 
            ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/25 font-semibold' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
        }`}
    >
        <div className="shrink-0">{icon}</div>
        <span className="ml-3 text-sm whitespace-nowrap overflow-hidden transition-all">{label}</span>
    </NavLink>
);

const App: React.FC = () => {
    // ... State from original App.tsx
    const [syllabusData, setSyllabusData] = useState<Syllabus[]>([]);
    const [testsData, setTestsData] = useState<Test[]>([]);
    const [classesData, setClassesData] = useState<Class[]>([]);
    const [logsData, setLogsData] = useState<LogEntry[]>([]);
    const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
    const [day, setDay] = useState<Day | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [leftMenuOpen, setLeftMenuOpen] = useState(false);
    const [rightMenuOpen, setRightMenuOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [syllabus, tests, classes, logs, summaries, todayTodos] = await Promise.all([
                    apiClient.getSyllabus(),
                    apiClient.getTests(),
                    apiClient.getClasses(),
                    apiClient.getLogs(),
                    apiClient.getWeeklySummaries(),
                    apiClient.getTodayTodos(),
                ]);

                // Weekly Log Processing
                const today = new Date();
                const startOfThisWeek = getStartOfWeek(today);

                let currentWeekLogs = logs.filter(log => new Date(log.date) >= startOfThisWeek);
                let pastLogs = logs.filter(log => new Date(log.date) < startOfThisWeek);
                
                if (pastLogs.length > 0) {
                    const weeksToSummarize = pastLogs.reduce((acc, log) => {
                        const logDate = new Date(log.date);
                        const weekStart = getStartOfWeek(logDate);
                        const weekStartStr = weekStart.toISOString().split('T')[0];
                        if (!acc[weekStartStr]) {
                            acc[weekStartStr] = [];
                        }
                        acc[weekStartStr].push(log);
                        return acc;
                    }, {} as { [weekStartString: string]: LogEntry[] });

                    const isSundayDate = (dateStr: string) => {
                        const parts = dateStr.split('T')[0].split('-').map(Number);
                        if (parts.length === 3) {
                            return new Date(parts[0], parts[1] - 1, parts[2]).getDay() === 0;
                        }
                        return new Date(dateStr).getDay() === 0;
                    };

                    const STUDY_DAYS_PER_WEEK = 6; // Monday through Saturday (Sunday is rest day)

                    // Normalize any existing summaries in database if they were previously divided by 7
                    const normalizeSummary = (s: WeeklySummary): WeeklySummary => {
                        const isDividedBy7 = s.totalMinutes > 0 && Math.abs(s.averageMinutesPerDay - Math.round(s.totalMinutes / 7)) <= 1;
                        if (!isDividedBy7) return s;
                        return {
                            ...s,
                            averageMinutesPerDay: Math.round(s.totalMinutes / STUDY_DAYS_PER_WEEK),
                            subjectAverages: Object.fromEntries(
                                Object.entries(s.subjectAverages || {}).map(([k, v]) => [k, Math.round((v * 7) / STUDY_DAYS_PER_WEEK)])
                            )
                        };
                    };

                    const normalizedExisting = summaries.map(normalizeSummary);

                    const newSummaries: WeeklySummary[] = Object.entries(weeksToSummarize).map(([weekStartDate, weekLogs]) => {
                        // Exclude Sunday logs since Sunday is user's rest day
                        const studyLogs = weekLogs.filter(log => !isSundayDate(log.date));
                        const totalMinutes = studyLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
                        const subjectMinutes = studyLogs.reduce((acc, log) => {
                            acc[log.subjectId] = (acc[log.subjectId] || 0) + log.durationMinutes;
                            return acc;
                        }, {} as { [subjectId: string]: number });
                        
                        return {
                            id: `summary-${weekStartDate}`,
                            weekOf: weekStartDate,
                            totalMinutes,
                            averageMinutesPerDay: Math.round(totalMinutes / STUDY_DAYS_PER_WEEK),
                            subjectAverages: Object.fromEntries(
                                Object.entries(subjectMinutes).map(([k, v]) => [k, Math.round(v / STUDY_DAYS_PER_WEEK)])
                            )
                        };
                    });

                    const updatedSummaries = [...normalizedExisting, ...newSummaries];
                    setLogsData(currentWeekLogs);
                    setWeeklySummaries(updatedSummaries);
                    await apiClient.saveLogs(currentWeekLogs);
                    await apiClient.saveWeeklySummaries(updatedSummaries);
                } else {
                    const STUDY_DAYS_PER_WEEK = 6;
                    const normalizedExisting = summaries.map(s => {
                        const isDividedBy7 = s.totalMinutes > 0 && Math.abs(s.averageMinutesPerDay - Math.round(s.totalMinutes / 7)) <= 1;
                        if (!isDividedBy7) return s;
                        return {
                            ...s,
                            averageMinutesPerDay: Math.round(s.totalMinutes / STUDY_DAYS_PER_WEEK),
                            subjectAverages: Object.fromEntries(
                                Object.entries(s.subjectAverages || {}).map(([k, v]) => [k, Math.round((v * 7) / STUDY_DAYS_PER_WEEK)])
                            )
                        };
                    });
                    setLogsData(logs);
                    setWeeklySummaries(normalizedExisting);
                }

                setSyllabusData(syllabus);
                setTestsData(tests);
                setClassesData(classes);
                
                const todayStr = new Date().toISOString().split('T')[0];
                const newDay = todayTodos || { date: todayStr, items: [] };
                setDay(newDay);

            } catch (error) {
                console.error("Failed to load initial data", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const handleSyllabusChange = async (newData: Syllabus[]) => {
        setSyllabusData(newData);
        await apiClient.saveSyllabus(newData);
    };

    const handleTestsChange = async (newData: Test[]) => {
        setTestsData(newData);
        await apiClient.saveTests(newData);
    };

    const handleClassesChange = async (newData: Class[]) => {
        setClassesData(newData);
        await apiClient.saveClasses(newData);
    };
    
    const handleLogsChange = async (newLogs: LogEntry[]) => {
        setLogsData(newLogs);
        await apiClient.saveLogs(newLogs);
    }

    const handleDayChange = async (newDay: Day) => {
        setDay(newDay);
        await apiClient.saveTodayTodos(newDay);
    };

    const academicSubjects = mockSubjects.filter(s => ['physics', 'chemistry', 'combined'].includes(s.id));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-slate-200 dark:bg-black">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/50 flex items-center justify-center mb-4">
                        <span className="text-white font-black text-2xl">TR</span>
                    </div>
                     <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase text-sm">Initializing Space...</p>
                </div>
            </div>
        );
    }

    const AnimatedRoutes: React.FC = () => {
        const location = useLocation();

        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                    <Routes location={location} key={location.pathname}>
                        <Route path="/weekly" element={<WeeklyPlannerPage />} />
                        <Route path="/" element={<TodoPage day={day} onDayChange={handleDayChange} classes={classesData} logs={logsData} onLogsChange={handleLogsChange} />} />
                        <Route 
                            path="/subjects/:subjectId" 
                            element={<SubjectPage syllabusData={syllabusData} subjects={mockSubjects} onSyllabusChange={handleSyllabusChange} />} 
                        />
                        <Route path="/logbook" element={<LogBookPage logs={logsData} weeklySummaries={weeklySummaries} subjects={mockSubjects} />} />
                        <Route path="/journal" element={<JournalPage />} />
                        <Route path="/nutrition" element={<NutritionPage />} />
                        <Route path="/analytics" element={<AnalyticsPage tests={testsData} subjects={mockSubjects} syllabusData={syllabusData} logs={logsData} weeklySummaries={weeklySummaries} />} />
                        <Route 
                            path="/cms" 
                            element={<CmsPage 
                                subjects={mockSubjects} 
                                syllabus={syllabusData}
                                tests={testsData}
                                classes={classesData}
                                onSyllabusChange={handleSyllabusChange}
                                onTestsChange={handleTestsChange}
                                onClassesChange={handleClassesChange}
                            />} 
                        />
                    </Routes>
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <HashRouter>
            <div className="flex h-screen w-screen bg-[#f8f9fc] dark:bg-[#07090e] font-sans overflow-hidden">
                
                {/* Desktop Sleek Apple-style Sidebar */}
                <nav className="hidden md:flex w-64 flex-col bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10 shrink-0 h-screen z-20">
                    {/* Brand Header */}
                    <div className="p-4 px-5 flex items-center gap-3 border-b border-slate-200/80 dark:border-white/10">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600 shadow-sm shadow-blue-500/25 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            🎯
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-tight truncate">Tracker</h1>
                            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-tight">Study & Health Suite</p>
                        </div>
                    </div>
                    
                    {/* Nav Links */}
                    <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-1 scrollbar-hide">
                        <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Planning</div>
                        <SidebarLink to="/" icon={<LayoutDashboard className="w-4 h-4 text-blue-500" />} label="Today" />
                        <SidebarLink to="/weekly" icon={<CalendarDays className="w-4 h-4 text-indigo-500" />} label="Weekly" />
                        
                        <div className="my-2 border-t border-slate-200/70 dark:border-white/10" />
                        <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Curriculum</div>
                        
                        {academicSubjects.map(subject => (
                            <SidebarLink key={subject.id} to={`/subjects/${subject.id}`} icon={getSubjectIcon(subject.id)} label={subject.name} />
                        ))}
                        
                        <div className="my-2 border-t border-slate-200/70 dark:border-white/10" />
                        <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tracking</div>
                        
                        <SidebarLink to="/logbook" icon={<BookOpen className="w-4 h-4 text-emerald-500" />} label="Log Book" />
                        <SidebarLink to="/journal" icon={<BookHeart className="w-4 h-4 text-rose-500" />} label="Diary" />
                        <SidebarLink to="/nutrition" icon={<UtensilsCrossed className="w-4 h-4 text-amber-500" />} label="Nutrition" />
                        <SidebarLink to="/analytics" icon={<BarChart2 className="w-4 h-4 text-violet-500" />} label="Analytics" />
                    </div>
                    
                    {/* Footer */}
                    <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/20 flex items-center gap-2">
                        <div className="flex-1">
                            <SidebarLink to="/cms" icon={<Settings className="w-4 h-4 text-slate-500" />} label="Settings" />
                        </div>
                        <ThemeSwitcher className="shrink-0" />
                    </div>
                </nav>

                {/* Main Viewport Window */}
                <main className="flex-1 relative bg-transparent overflow-hidden flex flex-col h-screen">
                    {/* Mobile Top Bar */}
                    <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/10 shrink-0 z-30">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm flex items-center justify-center text-white text-xs font-bold">
                                🎯
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">Tracker</span>
                        </div>
                        <ThemeSwitcher />
                    </div>

                    <CommandPalette />

                    <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-8 sm:p-6 lg:p-8 w-full h-full relative z-0 scrollbar-hide">
                        <div className="max-w-6xl mx-auto w-full">
                            <AnimatedRoutes />
                        </div>
                    </div>
                </main>

                {/* Mobile Native Bottom Glass Dock */}
                <div className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-full shadow-2xl z-40 flex items-center justify-around px-2">
                    <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all press-scale ${isActive ? 'text-blue-500 dark:text-blue-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                        <LayoutDashboard className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px]">Today</span>
                    </NavLink>
                    <NavLink to="/weekly" className={({ isActive }) => `flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all press-scale ${isActive ? 'text-blue-500 dark:text-blue-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                        <CalendarDays className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px]">Weekly</span>
                    </NavLink>
                    <NavLink to="/journal" className={({ isActive }) => `flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all press-scale ${isActive ? 'text-blue-500 dark:text-blue-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                        <BookHeart className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px]">Diary</span>
                    </NavLink>
                    <button onClick={() => setLeftMenuOpen(true)} className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all press-scale ${leftMenuOpen ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500'}`}>
                        <BookOpen className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px]">Subjects</span>
                    </button>
                    <button onClick={() => setRightMenuOpen(true)} className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all press-scale ${rightMenuOpen ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500'}`}>
                        <Menu className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px]">More</span>
                    </button>
                </div>

                {/* Mobile Left Menu (Subjects) */}
                {leftMenuOpen && (
                    <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex flex-col p-5 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white tracking-tight">Subjects</h2>
                            <button onClick={() => setLeftMenuOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                            {academicSubjects.map(subject => (
                                <SidebarLink key={subject.id} to={`/subjects/${subject.id}`} icon={getSubjectIcon(subject.id)} label={subject.name} onClick={() => setLeftMenuOpen(false)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Mobile Right Menu (Tools) */}
                {rightMenuOpen && (
                    <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex flex-col p-5 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white tracking-tight">Menu</h2>
                            <button onClick={() => setRightMenuOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                            <SidebarLink to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Today" onClick={() => setRightMenuOpen(false)} />
                            <SidebarLink to="/weekly" icon={<CalendarDays className="w-5 h-5" />} label="Weekly Planner" onClick={() => setRightMenuOpen(false)} />
                            <SidebarLink to="/analytics" icon={<BarChart2 className="w-5 h-5" />} label="Analytics" onClick={() => setRightMenuOpen(false)} />
                            <SidebarLink to="/logbook" icon={<BookOpen className="w-5 h-5" />} label="Log Book" onClick={() => setRightMenuOpen(false)} />
                            <SidebarLink to="/journal" icon={<BookHeart className="w-5 h-5" />} label="Diary" onClick={() => setRightMenuOpen(false)} />
                            <SidebarLink to="/nutrition" icon={<UtensilsCrossed className="w-5 h-5" />} label="Nutrition" onClick={() => setRightMenuOpen(false)} />
                            <div className="my-3 border-t border-white/10" />
                            <SidebarLink to="/cms" icon={<Settings className="w-5 h-5" />} label="Settings" onClick={() => setRightMenuOpen(false)} />
                        </div>
                    </div>
                )}
            </div>
        </HashRouter>
    );
};

export default App;
