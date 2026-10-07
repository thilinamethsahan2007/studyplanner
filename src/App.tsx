import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import TodoPage from './pages/TodoPage';
import WeeklyPlannerPage from './pages/WeeklyPlannerPage';
import SubjectPage from './pages/SubjectPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LogBookPage from './pages/LogBookPage';
import CmsPage from './pages/CmsPage';
import JournalPage from './pages/JournalPage';
import { mockSubjects } from './mockData';
import { Syllabus, Test, Class, LogEntry, WeeklySummary, Day } from './types';
import ThemeSwitcher from './components/ThemeSwitcher';
import CommandPalette from './components/CommandPalette';
import apiClient from './services/apiClient';
// Lucide Icons
import { LayoutDashboard, CalendarDays, BookOpen, BarChart2, Settings, FlaskConical, Atom, Calculator, Dumbbell, Gamepad2, Menu, X } from 'lucide-react';


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
        case 'physics': return <Atom className="w-5 h-5" />;
        case 'chemistry': return <FlaskConical className="w-5 h-5" />;
        case 'combined': return <Calculator className="w-5 h-5" />;
        case 'exercise': return <Dumbbell className="w-5 h-5" />;
        case 'entertainment': return <Gamepad2 className="w-5 h-5" />;
        default: return <BookOpen className="w-5 h-5" />;
    }
}

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick?: () => void }> = ({ to, icon, label, onClick }) => (
    <NavLink 
        to={to} 
        onClick={onClick}
        className={({ isActive }) => `flex items-center p-3 md:px-3 md:py-2.5 rounded-xl transition-all duration-300 ${
            isActive 
            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
    >
        <div className="shrink-0">{icon}</div>
        <span className="ml-3 font-medium whitespace-nowrap overflow-hidden transition-all">{label}</span>
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

                    const newSummaries: WeeklySummary[] = Object.entries(weeksToSummarize).map(([weekStartDate, weekLogs]) => {
                        const totalMinutes = weekLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
                        const subjectMinutes = weekLogs.reduce((acc, log) => {
                            acc[log.subjectId] = (acc[log.subjectId] || 0) + log.durationMinutes;
                            return acc;
                        }, {} as { [subjectId: string]: number });
                        
                        return {
                            id: `summary-${weekStartDate}`,
                            weekOf: weekStartDate,
                            totalMinutes,
                            averageMinutesPerDay: Math.round(totalMinutes / 7),
                            subjectAverages: Object.fromEntries(Object.entries(subjectMinutes).map(([k, v]) => [k, Math.round(v / 7)]))
                        };
                    });

                    const updatedSummaries = [...summaries, ...newSummaries];
                    setLogsData(currentWeekLogs);
                    setWeeklySummaries(updatedSummaries);
                    await apiClient.saveLogs(currentWeekLogs);
                    await apiClient.saveWeeklySummaries(updatedSummaries);
                } else {
                    setLogsData(logs);
                    setWeeklySummaries(summaries);
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

    return (
        <HashRouter>
            <div className="flex h-screen bg-white dark:bg-slate-950 md:bg-slate-200 md:dark:bg-black p-0 pt-14 md:p-3 md:pt-3 gap-0 md:gap-3 font-sans overflow-hidden">
                
                {/* Arc-style Floating Sidebar (Desktop) */}
                <nav className="hidden md:flex w-64 flex-col bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 relative z-10">
                    <div className="p-5 flex items-center gap-3 border-b border-black/5 dark:border-white/5 bg-white/30 dark:bg-black/20">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl shadow-lg flex items-center justify-center text-white font-black text-lg">
                            SP
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">Tracker</h1>
                            
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1.5 scrollbar-hide">
                        <SidebarLink to="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Today" />
                        <SidebarLink to="/weekly" icon={<CalendarDays className="w-5 h-5" />} label="Weekly" />
                        
                        <div className="my-3 border-t border-black/5 dark:border-white/5" />
                        <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Curriculum</div>
                        
                        {academicSubjects.map(subject => (
                            <SidebarLink key={subject.id} to={`/subjects/${subject.id}`} icon={getSubjectIcon(subject.id)} label={subject.name} />
                        ))}
                        
                        <div className="my-3 border-t border-black/5 dark:border-white/5" />
                        <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tracking</div>
                        
                        <SidebarLink to="/logbook" icon={<BookOpen className="w-5 h-5" />} label="Log Book" />
                        <SidebarLink to="/journal" icon={<BookOpen className="w-5 h-5" />} label="Diary" />
                        <SidebarLink to="/analytics" icon={<BarChart2 className="w-5 h-5" />} label="Analytics" />
                    </div>
                    
                    <div className="p-3 border-t border-black/5 dark:border-white/5 bg-white/30 dark:bg-black/20 flex gap-2">
                        <div className="flex-1">
                            <SidebarLink to="/cms" icon={<Settings className="w-5 h-5" />} label="Settings" />
                        </div>
                        <ThemeSwitcher />
                    </div>
                </nav>

                {/* Mobile Header & Overlay Menu */}
                <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10 z-40 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg shadow-sm flex items-center justify-center text-white font-black text-sm">TR</div>
                        <span className="font-bold text-slate-800 dark:text-slate-100">Tracker</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeSwitcher />
                        <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Mobile Full-Screen Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 bg-slate-200/90 dark:bg-black/90 backdrop-blur-2xl z-50 flex flex-col p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-end mb-8">
                            <button onClick={() => setMobileMenuOpen(false)} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-xl">
                                <X className="w-6 h-6 text-slate-800 dark:text-slate-200" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                            <SidebarLink to="/" icon={<LayoutDashboard className="w-6 h-6" />} label="Today" onClick={() => setMobileMenuOpen(false)} />
                                                        <div className="my-4 border-t border-black/10 dark:border-white/10" />
                            {academicSubjects.map(subject => (
                                <SidebarLink key={subject.id} to={`/subjects/${subject.id}`} icon={getSubjectIcon(subject.id)} label={subject.name} onClick={() => setMobileMenuOpen(false)} />
                            ))}
                            <div className="my-4 border-t border-black/10 dark:border-white/10" />
                            <SidebarLink to="/logbook" icon={<BookOpen className="w-6 h-6" />} label="Log Book" onClick={() => setMobileMenuOpen(false)} />
                            <SidebarLink to="/journal" icon={<BookOpen className="w-6 h-6" />} label="Diary" onClick={() => setMobileMenuOpen(false)} />
                            <SidebarLink to="/analytics" icon={<BarChart2 className="w-6 h-6" />} label="Analytics" onClick={() => setMobileMenuOpen(false)} />
                            <SidebarLink to="/cms" icon={<Settings className="w-6 h-6" />} label="Settings" onClick={() => setMobileMenuOpen(false)} />
                        </div>
                    </div>
                )}

                {/* Main Viewport Window */}
                <main className="flex-1 relative bg-white dark:bg-slate-950 rounded-none md:rounded-[2rem] shadow-none md:shadow-2xl ring-0 md:ring-1 ring-black/5 md:dark:ring-white/10 overflow-hidden flex flex-col ">
                    <CommandPalette />
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 w-full h-full relative z-0 scrollbar-hide">
                        <Routes>
                            <Route path="/weekly" element={<WeeklyPlannerPage />} />
                            <Route path="/" element={<TodoPage day={day} onDayChange={handleDayChange} classes={classesData} logs={logsData} onLogsChange={handleLogsChange} />} />
                            <Route 
                                path="/subjects/:subjectId" 
                                element={<SubjectPage syllabusData={syllabusData} subjects={mockSubjects} onSyllabusChange={handleSyllabusChange} />} 
                            />
                            <Route path="/logbook" element={<LogBookPage logs={logsData} weeklySummaries={weeklySummaries} subjects={mockSubjects} />} />
                            <Route path="/journal" element={<JournalPage />} />
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
                    </div>
                </main>
            </div>
        </HashRouter>
    );
};

export default App;
