
import React, { useState, useMemo } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Test, Subject, Syllabus, LogEntry, WeeklySummary } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import ToggleSwitch from '../components/ToggleSwitch';
import SyllabusAnalysis from '../components/SyllabusAnalysis';
import AiAnalysisModal from '../components/AiAnalysisModal';
import { getAnalyticsInsights } from '../services/geminiService';
import { calculateOverallProgress } from '../utils/progress';

interface AnalyticsPageProps {
  tests: Test[];
  subjects: Subject[];
  syllabusData: Syllabus[];
  logs: LogEntry[];
  weeklySummaries: WeeklySummary[];
}

const formatDuration = (minutes: number): string => {
    if (minutes < 1) return '0m';
    if (minutes < 60) {
        return `${Math.round(minutes)}m`;
    }
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const EmptyState: React.FC<{title: string, message: string}> = ({title, message}) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm text-center h-96 flex flex-col justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mt-4">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400">{message}</p>
    </div>
);

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ tests, subjects, syllabusData, logs, weeklySummaries }) => {
  const { theme } = useTheme();
  const [analysisMode, setAnalysisMode] = useState<'marks' | 'syllabus' | 'logs'>('marks');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState({ isLoading: false, text: '', error: '' });

  const tickColor = theme === 'dark' ? '#94a3b8' : '#334155';
  const tooltipStyle = theme === 'dark'
      ? { background: "#1e293b", border: "1px solid #334155", borderRadius: "0.75rem" }
      : { background: "white", border: "1px solid #e2e8f0", borderRadius: "0.75rem" };

    const getProgressData = () => {
        const academicSubjects = subjects.filter(s => ['physics', 'chemistry', 'combined'].includes(s.id));
        const progressItems: { id: string; name: string; color: string; progress: number }[] = [];

        const physicsSubject = academicSubjects.find(s => s.id === 'physics');
        if (physicsSubject) {
            const syllabus = syllabusData.find(s => s.subjectId === 'physics');
            progressItems.push({
                ...physicsSubject,
                progress: calculateOverallProgress(syllabus),
            });
        }

        const chemistrySubject = academicSubjects.find(s => s.id === 'chemistry');
        if (chemistrySubject) {
            const syllabus = syllabusData.find(s => s.subjectId === 'chemistry');
            progressItems.push({
                ...chemistrySubject,
                progress: calculateOverallProgress(syllabus),
            });
        }

        const combinedSubject = academicSubjects.find(s => s.id === 'combined');
        if (combinedSubject) {
            const pureSyllabus = syllabusData.find(s => s.subjectId === 'combined');
            const appliedSyllabus = syllabusData.find(s => s.subjectId === 'combined-applied');
            progressItems.push({
                id: 'combined-pure',
                name: 'Pure Maths',
                color: combinedSubject.color,
                progress: calculateOverallProgress(pureSyllabus),
            });
            progressItems.push({
                id: 'combined-applied',
                name: 'Applied Maths',
                color: combinedSubject.color,
                progress: calculateOverallProgress(appliedSyllabus),
            });
        }
        
        return progressItems;
    };

    const progressData = useMemo(getProgressData, [syllabusData, subjects]);

    const handleAiAnalysis = async () => {
        setAiAnalysis({ isLoading: true, text: '', error: '' });
        setIsAiModalOpen(true);
        
        let data;
        switch(analysisMode) {
            case 'marks':
                data = { tests };
                break;
            case 'syllabus':
                data = { progressData };
                break;
            case 'logs':
                data = { logs, weeklySummaries };
                break;
        }

        try {
            const insights = await getAnalyticsInsights(analysisMode, data);
            setAiAnalysis({ isLoading: false, text: insights, error: '' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setAiAnalysis({ isLoading: false, text: '', error: errorMessage });
        }
    };

  const MarkAnalysisView = () => {
    if (!tests || tests.length === 0) {
      return <EmptyState title="No Test Data Yet" message="Add some test results in the CMS to see your progress!" />;
    }

    const academicSubjects = subjects.filter(s => ['physics', 'chemistry', 'combined'].includes(s.id));

    const subjectAverages = academicSubjects.map(subject => {
        const subjectTests = tests.filter(t => t.subjectId === subject.id);
        if (subjectTests.length === 0) return null;
        const totalScore = subjectTests.reduce((acc, t) => acc + (t.score / t.total) * 100, 0);
        const average = totalScore / subjectTests.length;
        return { name: subject.name, average, color: subject.color };
    }).filter((s): s is { name: string; average: number; color: string; } => s !== null);

    const chartData = tests
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((test) => {
            const subject = subjects.find(s => s.id === test.subjectId);
            const score = (test.score / test.total) * 100;
            const dateLabel = new Date(test.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const uniqueName = `${dateLabel} - ${test.name}`;
            return {
                date: test.date,
                name: uniqueName,
                [subject?.name || 'Unknown']: score,
            };
        });

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xl font-bold mb-4 dark:text-slate-200">Average Score by Subject</h3>
            {subjectAverages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {subjectAverages.map(sub => (
                        <div key={sub.name} className="text-center p-4 rounded-lg" style={{backgroundColor: `${sub.color}20`}}>
                            <p className="font-semibold" style={{color: sub.color}}>{sub.name}</p>
                            <p className="text-3xl font-bold tracking-tight" style={{color: sub.color}}>{sub.average.toFixed(1)}%</p>
                        </div>
                    ))}
                </div>
            ) : <p className="text-slate-500 dark:text-slate-400 text-center py-4">No test data available.</p>}
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm h-[28rem]">
          <h2 className="text-xl font-bold mb-4 dark:text-slate-200">Test Score Trends</h2>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} vertical={false} />
              <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={Math.max(0, Math.floor(chartData.length / 12) - 1)}
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickFormatter={(value) => value.split(' - ')[0]}
              />
              <YAxis unit="%" domain={[0, 100]} tick={{ fill: tickColor }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                labelStyle={{ color: tickColor, fontWeight: 'bold' }}
                labelFormatter={(label) => label.split(' - ').join(': ')}
              />
              <Legend wrapperStyle={{paddingTop: '80px'}} iconSize={12} formatter={(value) => <span style={{color: tickColor}}>{value}</span>} />
              {academicSubjects.map(subject => (
                  <Line key={subject.id} type="monotone" dataKey={subject.name} stroke={subject.color} strokeWidth={2} connectNulls dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 2 }}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
  
    const LogAnalysisView = () => {
        if ((!logs || logs.length === 0) && (!weeklySummaries || weeklySummaries.length === 0)) {
            return <EmptyState title="No Log Data Yet" message="Complete some tasks on the 'Today' page to see your time analysis!" />;
        }
        
        const categoryMap = {
          study: { name: 'Study', color: '#4f46e5' },
          exercise: { name: 'Exercise', color: subjects.find(s => s.id === 'exercise')?.color || '#f97316' },
          entertainment: { name: 'Entertainment', color: subjects.find(s => s.id === 'entertainment')?.color || '#ec4899' },
          personal: { name: 'Personal', color: subjects.find(s => s.id === 'personal')?.color || '#6b7280' },
        };

        const currentWeekData = logs.reduce((acc, log) => {
            const academicIds = ['physics', 'chemistry', 'combined'];
            let categoryKey: keyof typeof categoryMap = academicIds.includes(log.subjectId) ? 'study' : (log.subjectId as keyof typeof categoryMap) || 'personal';
            if (!categoryMap[categoryKey]) categoryKey = 'personal';
            acc[categoryKey] = (acc[categoryKey] || 0) + log.durationMinutes;
            return acc;
        }, {} as { [key in keyof typeof categoryMap]?: number });

        const pieData = Object.entries(currentWeekData).map(([key, value]) => ({
            name: categoryMap[key as keyof typeof categoryMap].name, value: value || 0, color: categoryMap[key as keyof typeof categoryMap].color,
        }));
        
        const historicalData = weeklySummaries.concat([{
            weekOf: 'current', totalMinutes: logs.reduce((sum, log) => sum + log.durationMinutes, 0), averageMinutesPerDay: 0,
            subjectAverages: logs.reduce((acc: {[id: string]: number}, log) => {
                acc[log.subjectId] = (acc[log.subjectId] || 0) + log.durationMinutes;
                return acc;
            }, {})
        }]).reduce<Record<string, { total: number; days: number }>>((acc, summary) => {
            Object.entries(summary.subjectAverages).forEach(([subjectId, minutes]) => {
                const academicIds = ['physics', 'chemistry', 'combined'];
                let categoryKey = academicIds.includes(subjectId) ? 'study' : subjectId;
                if (!Object.keys(categoryMap).includes(categoryKey)) categoryKey = 'personal';
                if (!acc[categoryKey]) acc[categoryKey] = { total: 0, days: 0 };
                acc[categoryKey].total += minutes;
                acc[categoryKey].days += (summary.weekOf === 'current' ? (new Date().getDay() || 7) : 7);
            });
            return acc;
        }, {});

        const barData = Object.entries(historicalData).map(([key, data]) => ({
            name: categoryMap[key as keyof typeof categoryMap].name,
            "Daily Average": data.days > 0 ? (data.total / data.days) : 0,
            fill: categoryMap[key as keyof typeof categoryMap].color,
        }));

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm h-[28rem]">
                    <h2 className="text-xl font-bold mb-4 dark:text-slate-200">This Week's Time Distribution</h2>
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                             <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {pieData.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatDuration(Number(value))} />
                            <Legend wrapperStyle={{paddingTop: '20px', position: 'relative'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm h-[28rem]">
                     <h2 className="text-xl font-bold mb-4 dark:text-slate-200">Historical Daily Average</h2>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} horizontal={false} />
                            <XAxis type="number" tickFormatter={(value) => formatDuration(Number(value))} tick={{ fill: tickColor }} />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fill: tickColor }} />
                            <Tooltip formatter={(value) => formatDuration(Number(value))} cursor={{ fill: theme === 'dark' ? 'rgba(100, 116, 139, 0.3)' : 'rgba(203, 213, 225, 0.5)' }} contentStyle={tooltipStyle} />
                            <Bar dataKey="Daily Average" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )
    }

  const toggleOptions = [
    { value: 'marks', label: 'Marks' },
    { value: 'syllabus', label: 'Progress' },
    { value: 'logs', label: 'Time' },
  ];

  const getPageDescription = () => {
      switch(analysisMode) {
          case 'marks': return 'Visualizing your test performance over time.';
          case 'syllabus': return 'Tracking your overall syllabus completion.';
          case 'logs': return 'Analyzing how you spend your time.';
          default: return '';
      }
  }

  return (
    <>
    <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        isLoading={aiAnalysis.isLoading}
        analysisText={aiAnalysis.text}
        error={aiAnalysis.error}
        title={`AI Insights on Your ${analysisMode.charAt(0).toUpperCase() + analysisMode.slice(1)}`}
    />
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">{getPageDescription()}</p>
        </div>
        <div className="flex items-center gap-4">
            <ToggleSwitch 
            options={toggleOptions} 
            value={analysisMode} 
            onChange={(val) => setAnalysisMode(val as 'marks' | 'syllabus' | 'logs')} 
            />
            <button
                onClick={handleAiAnalysis}
                className="p-2.5 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors"
                title="Get AI Insights"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.476-1.476L12.938 18l1.188-.648a2.25 2.25 0 011.476-1.476L16.25 15l.648 1.188a2.25 2.25 0 011.476 1.476L19.562 18l-1.188.648a2.25 2.25 0 01-1.476 1.476z" />
                </svg>
            </button>
        </div>
      </div>
      
      {analysisMode === 'marks' && <MarkAnalysisView />}
      {analysisMode === 'syllabus' && <SyllabusAnalysis progressData={progressData} />}
      {analysisMode === 'logs' && <LogAnalysisView />}
    </div>
    </>
  );
};

export default AnalyticsPage;
