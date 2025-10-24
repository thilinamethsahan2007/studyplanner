import React from 'react';

interface CombinedToggleProps {
  mode: 'pure' | 'applied';
  onToggle: (mode: 'pure' | 'applied') => void;
}

const CombinedToggle: React.FC<CombinedToggleProps> = ({ mode, onToggle }) => {
  return (
    <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
      <button
        onClick={() => onToggle('pure')}
        className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${
          mode === 'pure' ? 'bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        Pure
      </button>
      <button
        onClick={() => onToggle('applied')}
        className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${
          mode === 'applied' ? 'bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        Applied
      </button>
    </div>
  );
};

export default CombinedToggle;
