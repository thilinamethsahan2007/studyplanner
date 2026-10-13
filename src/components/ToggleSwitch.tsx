import React from 'react';
import { motion } from 'framer-motion';

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleSwitchProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  layoutId?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  options,
  value,
  onChange,
  layoutId = 'toggle-pill',
}) => {
  return (
    <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative px-4 py-1 rounded-md text-sm font-semibold transition-colors ${
            value === option.value
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          {value === option.value && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-white dark:bg-slate-900 rounded-md shadow-sm"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ToggleSwitch;