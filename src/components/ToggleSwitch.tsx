import React from 'react';

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleSwitchProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ options, value, onChange }) => {
  return (
    <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
      {options.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-1 rounded-md text-sm font-semibold transition-colors ${
            value === option.value
              ? 'bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default ToggleSwitch;