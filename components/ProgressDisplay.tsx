import React from 'react';

const ProgressDisplay: React.FC<{ title: string; progress: number; color: string; }> = ({ title, progress, color }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
            <p className="text-sm font-bold" style={{ color }}>{progress}%</p>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="h-2 rounded-full" style={{ width: `${progress}%`, backgroundColor: color }}></div>
        </div>
    </div>
);

export default ProgressDisplay;
