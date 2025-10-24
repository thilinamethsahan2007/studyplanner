import React from 'react';
import ProgressDisplay from './ProgressDisplay';

interface ProgressDataItem {
    id: string;
    name: string;
    color: string;
    progress: number;
}
interface SyllabusAnalysisProps {
    progressData: ProgressDataItem[];
}

const SyllabusAnalysis: React.FC<SyllabusAnalysisProps> = ({ progressData }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {progressData.map(item => (
                <ProgressDisplay 
                    key={item.id}
                    title={item.name}
                    progress={item.progress}
                    color={item.color}
                />
            ))}
             {progressData.length === 0 && (
                <p className="md:col-span-2 text-center text-slate-500 dark:text-slate-400 py-8">
                    Syllabus data not available.
                </p>
            )}
        </div>
    );
};

export default SyllabusAnalysis;
