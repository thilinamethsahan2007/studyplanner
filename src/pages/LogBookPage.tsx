import React from 'react';
import { LogEntry, Subject, WeeklySummary } from '../types';
import { Award } from 'lucide-react';

interface LogBookPageProps {
  logs: LogEntry[];
  weeklySummaries: WeeklySummary[];
  subjects: Subject[];
}

const formatDuration = (minutes: number): string => {
    if (minutes < 1) return '0m';
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Add timeZone to ensure the date is parsed correctly regardless of user's timezone.
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

const isSundayDate = (dateString: string) => {
    const parts = dateString.split('T')[0].split('-').map(Number);
    if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, parts[2]).getDay() === 0;
    }
    return new Date(dateString).getDay() === 0;
};


const CategoryHeader: React.FC<{ category: string; totalMinutes: number }> = ({ category, totalMinutes }) => {
  const getInfo = () => {
    switch (category) {
      case 'study':
        return {
          title: 'Study Sessions',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          color: 'text-indigo-600 dark:text-indigo-400',
        };
      case 'microcredentials':
        return {
          title: 'Micro Credentials',
          icon: <Award className="h-5 w-5" />,
          color: 'text-amber-600 dark:text-amber-400',
        };
      case 'exercise':
        return {
          title: 'Exercise',
          icon: (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
          color: 'text-orange-600 dark:text-orange-400',
        };
      case 'entertainment':
        return {
          title: 'Entertainment',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-pink-600 dark:text-pink-400',
        };
      case 'personal':
      default:
        return {
          title: 'Personal Activities',
          icon: (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
          color: 'text-slate-600 dark:text-slate-400',
        };
    }
  };
  const info = getInfo();

  return (
    <div className="flex items-center justify-between">
      <div className={`flex items-center gap-2 font-semibold text-sm ${info.color}`}>
        {info.icon}
        <span>{info.title}</span>
      </div>
      <span className="font-bold text-sm text-slate-600 dark:text-slate-300">{formatDuration(totalMinutes)}</span>
    </div>
  );
};


const LogBookPage: React.FC<LogBookPageProps> = ({ logs, weeklySummaries, subjects }) => {

    const groupedLogsByDate = logs.reduce((acc, log) => {
        const date = log.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(log);
        return acc;
    }, {} as { [date: string]: LogEntry[] });

    const sortedDates = Object.keys(groupedLogsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const currentWeekTotal = logs.reduce((sum, log) => sum + log.durationMinutes, 0);

    // Active study logs excluding Sunday rest day (averages over Mon - Sat)
    const currentStudyLogs = logs.filter(log => !isSundayDate(log.date));
    const currentStudyTotal = currentStudyLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
    const todayDayOfWeek = new Date().getDay();
    const elapsedStudyDays = todayDayOfWeek === 0 ? 6 : Math.max(1, todayDayOfWeek);
    const currentDailyAverage = Math.round(currentStudyTotal / elapsedStudyDays);

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <div>
                <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm mb-2 tracking-tight">Log Book</h1>
                <p className="text-slate-500 dark:text-slate-400">Your weekly study journal and historical performance.</p>
            </div>

            {/* Current Week Section */}
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Current Week</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sunday is observed as your rest day (averages computed over Mon–Sat).</p>
                    </div>
                    <div className="text-left sm:text-right mt-3 sm:mt-0 flex flex-wrap items-center gap-4 sm:gap-6">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Daily Average (Mon–Sat)</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatDuration(currentDailyAverage)}</p>
                        </div>
                        <div className="border-l border-slate-200 dark:border-slate-700 pl-4 sm:pl-6">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Logged Time</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatDuration(currentWeekTotal)}</p>
                        </div>
                    </div>
                </div>

                {sortedDates.length > 0 ? (
                    <div className="space-y-8">
                        {sortedDates.map(date => {
                             const dailyLogs = groupedLogsByDate[date];
                             const categorizedLogs = dailyLogs.reduce((acc, log) => {
                               const academicIds = ['physics', 'chemistry', 'combined'];
                               let categoryKey = 'personal'; // Default category
     
                               if (academicIds.includes(log.subjectId)) {
                                 categoryKey = 'study';
                               } else if (['exercise', 'entertainment', 'personal', 'microcredentials'].includes(log.subjectId)) {
                                 categoryKey = log.subjectId;
                               }
     
                               if (!acc[categoryKey]) {
                                 acc[categoryKey] = [];
                               }
                               acc[categoryKey].push(log);
                               return acc;
                             }, {} as { [category: string]: LogEntry[] });
     
                             const sortedCategoryKeys = Object.keys(categorizedLogs).sort((a,b) => {
                                 const order = ['study', 'microcredentials', 'exercise', 'entertainment', 'personal'];
                                 return order.indexOf(a) - order.indexOf(b);
                             });

                            return (
                                <div key={date}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="font-semibold text-slate-600 dark:text-slate-300">{formatDate(date)}</h3>
                                        {isSundayDate(date) && (
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50">
                                                Rest Day ☕
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        {sortedCategoryKeys.map(categoryKey => {
                                            const categoryLogs = categorizedLogs[categoryKey];
                                            const categoryTotalMinutes = categoryLogs.reduce((sum, log) => sum + log.durationMinutes, 0);
                                            
                                            return (
                                            <div key={categoryKey}>
                                                <CategoryHeader category={categoryKey} totalMinutes={categoryTotalMinutes} />
                                                <div className="pl-7 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 ml-2.5 mt-2">
                                                {categoryLogs.map(log => {
                                                    const subject = subjects.find(s => s.id === log.subjectId);
                                                    return (
                                                    <div key={log.id} className="pt-2 pl-4 relative">
                                                        <div className="absolute -left-[5px] top-5 h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-800"></div>

                                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                                        <div>
                                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{log.todoItemTitle}</p>
                                                            {subject && log.subjectId !== categoryKey && (
                                                            <span className="text-xs font-semibold inline-flex items-center px-2 py-0.5 rounded-full mt-1" style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
                                                                {subject.name}
                                                            </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400 self-end sm:self-center">
                                                            <span>{log.startTime} - {log.endTime}</span>
                                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-base w-16 text-right">{formatDuration(log.durationMinutes)}</span>
                                                        </div>
                                                        </div>
                                                    </div>
                                                    )
                                                })}
                                                </div>
                                            </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p>No study sessions logged for this week yet.</p>
                        <p className="text-sm">Complete a task on the "Today" page to log a session.</p>
                    </div>
                )}
            </div>

            {/* Weekly History Section */}
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Weekly History</h2>
                {weeklySummaries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {weeklySummaries.sort((a,b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()).map(summary => {
                            const subjectAverages = Object.entries(summary.subjectAverages).sort(([, a], [, b]) => (b as number) - (a as number));
                            return (
                                <div key={summary.weekOf} className="p-4 bg-slate-50 dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <p className="font-semibold text-slate-700 dark:text-slate-200">Week of {formatDate(summary.weekOf)}</p>
                                    <div className="my-3 text-center">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Average Daily Study (Mon – Sat)</p>
                                        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{formatDuration(summary.averageMinutesPerDay)}</p>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        {subjectAverages.slice(0, 3).map(([subjectId, avgMins]) => {
                                            const subject = subjects.find(s => s.id === subjectId);
                                            return (
                                                <div key={subjectId} className="flex justify-between items-center">
                                                    <span className="font-medium text-slate-600 dark:text-slate-300">{subject?.name || 'Unknown'}</span>
                                                    <span className="font-semibold text-slate-500 dark:text-slate-400">{formatDuration(avgMins as number)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p>No weekly summaries have been generated yet.</p>
                        <p className="text-sm">Complete a week of logging to see your first summary here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogBookPage;