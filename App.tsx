
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import TodoPage from './pages/TodoPage';
import SubjectPage from './pages/SubjectPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CmsPage from './pages/CmsPage';
import LogBookPage from './pages/LogBookPage';
import { mockSubjects } from './mockData';
import { Syllabus, Test, Class, LogEntry, WeeklySummary, Day } from './types';
import ThemeSwitcher from './components/ThemeSwitcher';
import apiService from './services/apiService';

const NavIcon = ({ path, label }: { path: string; label: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

const getSubjectIconPath = (subjectId: string): string => {
    switch (subjectId) {
        case 'physics':
            return 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z';
        case 'chemistry':
            return 'M6 3v4c0 1.1.9 2 2 2h8a2 2 0 002-2V3M6 3l-1.5 1.5M6 3h12m-12 0L4.5 4.5M18 3l1.5 1.5M18 3l-1.5-1.5M8 9v11a2 2 0 002 2h4a2 2 0 002-2V9H8z';
        case 'combined':
            return 'M3 3v18h18M5 16l4-4 3 3 5-7';
        default:
            return 'M12 6.253v11.494m-9-5.747l9 5.747 9-5.747-9-5.747z';
    }
};

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); // Sunday - 0, Monday - 1, ...
    const diff = d.getDate() - day;
    d.setHours(0, 0, 0, 0);
    return new Date(d.setDate(diff));
};

const App: React.FC = () => {
  const [syllabusData, setSyllabusData] = useState<Syllabus[]>([]);
  const [testsData, setTestsData] = useState<Test[]>([]);
  const [classesData, setClassesData] = useState<Class[]>([]);
  const [logsData, setLogsData] = useState<LogEntry[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [day, setDay] = useState<Day | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [syllabus, tests, classes, logs, summaries, todayTodos] = await Promise.all([
                apiService.getSyllabus(),
                apiService.getTests(),
                apiService.getClasses(),
                apiService.getLogs(),
                apiService.getWeeklySummaries(),
                apiService.getTodayTodos(),
            ]);

            // --- Weekly Log Processing Logic ---
            const today = new Date();
            const startOfThisWeek = getStartOfWeek(today);

            const logsToProcess = logs.filter(log => new Date(log.date) < startOfThisWeek);
            const currentWeekLogs = logs.filter(log => new Date(log.date) >= startOfThisWeek);

            if (logsToProcess.length > 0) {
                const weeksToSummarize: { [weekStartString: string]: LogEntry[] } = logsToProcess.reduce((acc, log) => {
                    const logDate = new Date(log.date);
                    const weekStart = getStartOfWeek(logDate);
                    const weekStartString = weekStart.toISOString().split('T')[0];
                    
                    if (!acc[weekStartString]) acc[weekStartString] = [];
                    acc[weekStartString].push(log);
                    return acc;
                }, {} as { [weekStartString: string]: LogEntry[] });

                const newSummaries: WeeklySummary[] = Object.entries(weeksToSummarize).map(([weekStartDate, weekLogs]) => {
                    const totalMinutes = weekLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
                    
                    const subjectTotals = weekLogs.reduce((subAcc, log) => {
                       subAcc[log.subjectId] = (subAcc[log.subjectId] || 0) + log.durationMinutes;
                       return subAcc;
                    }, {} as { [subjectId: string]: number });
                    
                    const subjectAverages: { [subjectId: string]: number } = {};
                    for (const subjectId in subjectTotals) {
                        subjectAverages[subjectId] = Math.round(subjectTotals[subjectId] / 7);
                    }

                    return {
                        weekOf: weekStartDate,
                        totalMinutes,
                        averageMinutesPerDay: Math.round(totalMinutes / 7),
                        subjectAverages,
                    };
                });
                
                const updatedSummaries = [...summaries, ...newSummaries];
                setLogsData(currentWeekLogs);
                setWeeklySummaries(updatedSummaries);
                
                // Save the processed data
                await apiService.saveLogs(currentWeekLogs);
                await apiService.saveWeeklySummaries(updatedSummaries);

            } else {
                setLogsData(logs);
                setWeeklySummaries(summaries);
            }

            setSyllabusData(syllabus);
            setTestsData(tests);
            setClassesData(classes);
            setDay(todayTodos);

        } catch (error) {
            console.error("Failed to load initial data", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, []);

  const handleSyllabusChange = async (newSyllabus: Syllabus[]) => {
      setSyllabusData(newSyllabus);
      try {
          await apiService.saveSyllabus(newSyllabus);
      } catch (error) {
          console.error("Failed to save syllabus data", error);
      }
  };

  const handleTestsChange = async (newTests: Test[]) => {
      setTestsData(newTests);
      try {
          await apiService.saveTests(newTests);
      } catch (error) {
          console.error("Failed to save tests data", error);
      }
  };

  const handleClassesChange = async (newClasses: Class[]) => {
      setClassesData(newClasses);
      try {
          await apiService.saveClasses(newClasses);
      } catch (error) {
          console.error("Failed to save classes data", error);
      }
  };
  
  const handleLogsChange = async (newLogs: LogEntry[]) => {
      setLogsData(newLogs);
      try {
          await apiService.saveLogs(newLogs);
      } catch (error) {
          console.error("Failed to save logs data", error);
      }
  };

  const handleDayChange = async (newDay: Day) => {
      setDay(newDay);
      try {
          await apiService.saveTodayTodos(newDay);
      } catch (error) {
          console.error("Failed to save today's todos", error);
      }
  };

  const academicSubjects = mockSubjects.filter(s => ['physics', 'chemistry', 'combined'].includes(s.id));
  const logbookIconPath = "M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 5h8v2H8v-2z";

  const mobileNavLinks = [
    { to: "/", title: "Today", path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    ...academicSubjects.map(subject => ({
      to: `/subjects/${subject.id}`,
      title: subject.name,
      path: getSubjectIconPath(subject.id),
    })),
    { to: "/logbook", title: "Log Book", path: logbookIconPath },
    { to: "/analytics", title: "Analytics", path: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { to: "/cms", title: "CMS", path: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" }
  ];

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen w-screen bg-slate-100 dark:bg-slate-900">
            <div className="text-center">
                <div className="text-indigo-600 dark:text-indigo-400 font-bold text-4xl mb-2">SP</div>
                 <p className="text-slate-600 dark:text-slate-300">Loading Study Planner...</p>
            </div>
        </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex flex-col md:flex-row h-screen bg-slate-100 dark:bg-slate-800 font-sans">
        {/* Desktop Sidebar */}
        <nav className="w-20 bg-white border-r border-slate-200 hidden md:flex flex-col items-center py-6 dark:bg-slate-900 dark:border-slate-700">
          <div className="text-indigo-600 dark:text-indigo-400 font-bold text-xl mb-6">SP</div>
          <div className="flex flex-col space-y-4">
            <NavLink to="/" className={({ isActive }) => `p-3 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}`} title="Today">
              <NavIcon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Today" />
            </NavLink>
            {academicSubjects.map(subject => (
              <NavLink key={subject.id} to={`/subjects/${subject.id}`} className={({ isActive }) => `p-3 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}`} title={subject.name}>
                <NavIcon path={getSubjectIconPath(subject.id)} label={subject.name} />
              </NavLink>
            ))}
            <NavLink to="/logbook" className={({ isActive }) => `p-3 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}`} title="Log Book">
              <NavIcon path={logbookIconPath} label="Log Book" />
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `p-3 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}`} title="Analytics">
              <NavIcon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" label="Analytics" />
            </NavLink>
          </div>
          <div className="mt-auto">
             <NavLink to="/cms" className={({ isActive }) => `p-3 rounded-lg ${isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}`} title="CMS">
              <NavIcon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" label="CMS" />
            </NavLink>
          </div>
        </nav>
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto pb-24 md:pb-8">
          <Routes>
            <Route path="/" element={<TodoPage day={day} onDayChange={handleDayChange} classes={classesData} logs={logsData} onLogsChange={handleLogsChange} />} />
            <Route 
              path="/subjects/:subjectId" 
              element={<SubjectPage syllabusData={syllabusData} subjects={mockSubjects} onSyllabusChange={handleSyllabusChange} />} 
            />
             <Route path="/logbook" element={<LogBookPage logs={logsData} weeklySummaries={weeklySummaries} subjects={mockSubjects} />} />
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
        </main>
        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-center z-50 h-16 shadow-lg dark:bg-slate-900 dark:border-slate-700">
           {mobileNavLinks.map(link => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => `flex flex-col items-center justify-center text-center p-1 w-full h-full ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} title={link.title}>
                    <NavIcon path={link.path} label={link.title} />
                    <span className="text-xs mt-1 truncate">{link.title === "Combined Maths" ? "Maths" : link.title}</span>
                </NavLink>
            ))}
        </nav>
        <ThemeSwitcher />
      </div>
    </HashRouter>
  );
};

export default App;
