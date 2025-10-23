import React from 'react';
import { Unit } from '../types';

interface SubunitChecklistProps {
  subjectId: string;
  unit: Unit;
  onSubunitChange: (unitId: string, subunitId: string, field: 'tuteDone' | 'pastDone', value: boolean) => void;
  onAiHelp: (unitName: string, subunitName: string) => void;
}

const SubunitChecklist: React.FC<SubunitChecklistProps> = ({ subjectId, unit, onSubunitChange, onAiHelp }) => {
  
  const calculateProgress = () => {
    const totalTasks = unit.subunits.reduce((acc, sub) => {
        if (sub.tuteDone !== undefined) acc++;
        if (sub.pastDone !== undefined) acc++;
        return acc;
    }, 0);

    if (totalTasks === 0) return 100;

    const completedTasks = unit.subunits.reduce((acc, sub) => {
        if (sub.tuteDone) acc++;
        if (sub.pastDone) acc++;
        return acc;
    }, 0);

    return Math.round((completedTasks / totalTasks) * 100);
  };

  const progress = calculateProgress();
  
  const getStatusInfo = (status: Unit['status']) => {
    switch (status) {
      case 'completed': return { text: 'Completed', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/50' };
      case 'ongoing': return { text: 'Ongoing', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/50' };
      default: return { text: 'Not Started', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-200 dark:bg-slate-700' };
    }
  };

  const statusInfo = getStatusInfo(unit.status);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{unit.name}</h3>
          <p className="text-md sm:text-lg font-medium text-slate-500 dark:text-slate-400">{unit.sinhala_name}</p>
        </div>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      <div className="mb-6">
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="text-right text-sm text-slate-500 dark:text-slate-400 mt-1">{progress}% Complete</p>
      </div>

      <div className="space-y-4 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2">
        {unit.subunits.map((subunit) => {
            const allDone = subjectId === 'chemistry' ? subunit.pastDone : subunit.tuteDone && subunit.pastDone;
            return (
                <div key={subunit.id} className="p-4 bg-slate-50 dark:bg-slate-700/60 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex-grow">
                        <p className={`font-semibold ${allDone ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{subunit.name}</p>
                        <p className={`text-sm ${allDone ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{subunit.sinhala_name}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center justify-between w-full sm:w-auto sm:justify-start sm:gap-4 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-600">
                        <button
                            onClick={() => onAiHelp(unit.name, subunit.name)}
                            className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors rounded-full"
                            title="AI Helper"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.476-1.476L12.938 18l1.188-.648a2.25 2.25 0 011.476-1.476L16.25 15l.648 1.188a2.25 2.25 0 011.476 1.476L19.562 18l-1.188.648a2.25 2.25 0 01-1.476 1.476z" />
                            </svg>
                        </button>
                        {subunit.tuteDone !== undefined && (
                             <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={subunit.tuteDone}
                                    onChange={(e) => onSubunitChange(unit.id, subunit.id, 'tuteDone', e.target.checked)}
                                    className="h-5 w-5 rounded border-slate-300 dark:bg-slate-900 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                                />
                                Tutorial
                            </label>
                        )}
                         {subunit.pastDone !== undefined && (
                             <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={subunit.pastDone}
                                    onChange={(e) => onSubunitChange(unit.id, subunit.id, 'pastDone', e.target.checked)}
                                    className="h-5 w-5 rounded border-slate-300 dark:bg-slate-900 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                                />
                                Past Papers
                            </label>
                        )}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default SubunitChecklist;
