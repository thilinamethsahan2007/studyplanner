import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className={`p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200 focus:outline-none flex items-center justify-center press-scale ${className}`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-slate-600" />
      ) : (
        <Sun className="w-4 h-4 text-amber-400" />
      )}
    </button>
  );
};

export default ThemeSwitcher;
