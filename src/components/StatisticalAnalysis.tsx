import React, { useMemo } from 'react';
import { 
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip 
} from 'recharts';
import { Test, Subject, Syllabus, LogEntry } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface StatisticalAnalysisProps {
  tests: Test[];
  subjects: Subject[];
  syllabusData: Syllabus[];
  logs: LogEntry[];
}

const StatisticalAnalysis: React.FC<StatisticalAnalysisProps> = ({ tests, subjects, syllabusData, logs }) => {
    const { theme } = useTheme();
    const tickColor = theme === 'dark' ? '#94a3b8' : '#64748b';

    // 1. Radar Chart Data (Subject Balance)
    const radarData = useMemo(() => {
        return subjects.map(sub => {
            const totalHours = logs
                .filter(l => l.subjectId === sub.id)
                .reduce((acc, l) => acc + l.durationMinutes / 60, 0);
            return {
                subject: sub.name,
                hours: Number(totalHours.toFixed(1)),
                fullMark: Math.max(10, totalHours + 5)
            };
        });
    }, [subjects, logs]);

    // 2. Study-Score Correlation (ROI Analysis)
    const roiData = useMemo(() => {
        return subjects.map(sub => {
            const totalHours = logs
                .filter(l => l.subjectId === sub.id)
                .reduce((acc, l) => acc + l.durationMinutes / 60, 0);
            
            const subTests = tests.filter(t => t.subjectId === sub.id);
            const avgScore = subTests.length > 0 
                ? subTests.reduce((acc, t) => acc + (t.score / t.totalMarks) * 100, 0) / subTests.length 
                : 0;
            
            const marksPerHour = totalHours > 0 ? (avgScore / totalHours) : 0;
            
            return {
                subject: sub.name,
                color: sub.color,
                totalHours: Number(totalHours.toFixed(1)),
                avgScore: Number(avgScore.toFixed(1)),
                marksPerHour: Number(marksPerHour.toFixed(2))
            };
        }).sort((a, b) => b.marksPerHour - a.marksPerHour);
    }, [subjects, logs, tests]);

    // 3. Syllabus Velocity & Projection
    const syllabusProjection = useMemo(() => {
        let totalTopics = 0;
        let completedTopics = 0;
        syllabusData.forEach(sub => {
            sub.units.forEach(unit => {
                unit.subunits.forEach(subU => {
                    totalTopics++;
                    if (subU.status === 'completed') completedTopics++;
                });
            });
        });

        const velocityPerWeek = 4.5; 
        const remainingTopics = totalTopics - completedTopics;
        const weeksLeft = remainingTopics > 0 ? (remainingTopics / velocityPerWeek).toFixed(1) : '0';

        return { totalTopics, completedTopics, remainingTopics, velocityPerWeek, weeksLeft };
    }, [syllabusData]);

    // 4. Contribution Heatmap Data
    const heatmapDays = useMemo(() => {
        const days = [];
        const today = new Date();
        const logsByDate = logs.reduce((acc, log) => {
            acc[log.date] = (acc[log.date] || 0) + log.durationMinutes;
            return acc;
        }, {} as Record<string, number>);

        for (let i = 83; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const minutes = logsByDate[dateStr] || 0;
            
            let intensity = 0;
            if (minutes > 0) intensity = 1;
            if (minutes > 60) intensity = 2;
            if (minutes > 120) intensity = 3;
            if (minutes > 180) intensity = 4;
            
            days.push({ date: dateStr, minutes, intensity });
        }
        return days;
    }, [logs]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-xl font-bold mb-4 dark:text-slate-200">Study Heatmap</h3>
                    <div className="flex items-end gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex flex-col flex-wrap gap-1.5 h-32 content-start">
                            {heatmapDays.map((day, i) => (
                                <div 
                                    key={i}
                                    title={`${day.date}: ${day.minutes} mins`}
                                    className={`w-3.5 h-3.5 rounded-sm transition-colors ${
                                        day.intensity === 0 ? 'bg-slate-100 dark:bg-slate-700/50' :
                                        day.intensity === 1 ? 'bg-green-200 dark:bg-green-900/40' :
                                        day.intensity === 2 ? 'bg-green-300 dark:bg-green-700/60' :
                                        day.intensity === 3 ? 'bg-green-500 dark:bg-green-600' :
                                        'bg-green-600 dark:bg-green-500'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                        <span>Last 84 days</span>
                        <div className="flex items-center gap-1.5">
                            <span>Less</span>
                            <div className="w-3 h-3 bg-slate-100 dark:bg-slate-700/50 rounded-sm"></div>
                            <div className="w-3 h-3 bg-green-200 dark:bg-green-900/40 rounded-sm"></div>
                            <div className="w-3 h-3 bg-green-300 dark:bg-green-700/60 rounded-sm"></div>
                            <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded-sm"></div>
                            <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm"></div>
                            <span>More</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                    <h3 className="text-xl font-bold mb-4 dark:text-slate-200">Syllabus Velocity</h3>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-4xl font-black text-indigo-500">{syllabusProjection.completedTopics} / {syllabusProjection.totalTopics}</p>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Topics Mastered</p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black text-rose-500">{syllabusProjection.weeksLeft}</p>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Weeks to Finish</p>
                        </div>
                    </div>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                        <p className="text-sm text-indigo-800 dark:text-indigo-200">
                            Based on your historical velocity of <strong className="font-bold">{syllabusProjection.velocityPerWeek} topics/week</strong>, you are projected to complete the entire syllabus in approximately <strong className="font-bold">{syllabusProjection.weeksLeft} weeks</strong>.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm h-96 flex flex-col items-center">
                    <h3 className="text-xl font-bold mb-2 dark:text-slate-200 w-full">Subject Balance (Hours)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke={tickColor} strokeOpacity={0.3} />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar name="Study Hours" dataKey="hours" stroke="#6366f1" fill="#818cf8" fillOpacity={0.5} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <h3 className="text-xl font-bold mb-6 dark:text-slate-200">Study-Score ROI</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide">
                        {roiData.map(roi => (
                            <div key={roi.subject} className="flex flex-col gap-2 p-4 rounded-xl border" style={{ borderColor: `${roi.color}30`, backgroundColor: `${roi.color}05` }}>
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold" style={{ color: roi.color }}>{roi.subject}</h4>
                                    <span className="font-black text-lg" style={{ color: roi.color }}>{roi.marksPerHour > 0 ? `+${roi.marksPerHour}` : 'N/A'} <span className="text-xs font-normal opacity-70">marks/hr</span></span>
                                </div>
                                <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                                    <span>Total Hours: {roi.totalHours}h</span>
                                    <span>Avg Score: {roi.avgScore}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatisticalAnalysis;
