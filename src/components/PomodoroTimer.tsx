import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TodoItem } from '../types';

interface PomodoroTimerProps {
  isOpen: boolean;
  task: TodoItem | null;
  duration: number; // in minutes
  onClose: () => void;
  onLog: (task: TodoItem, startTime: Date, endTime: Date) => void;
  onDurationChange: (newDuration: number) => void;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  isOpen,
  task,
  duration,
  onClose,
  onLog,
  onDurationChange,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(duration * 60);
  const [isActive, setIsActive] = useState(false);
  const startTimeRef = useRef<Date | null>(null);

  const totalSeconds = duration * 60;

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setSecondsLeft(duration * 60);
    startTimeRef.current = null;
  }, [duration]);

  useEffect(() => {
    resetTimer();
  }, [duration, task, resetTimer]);

  useEffect(() => {
    // FIX: Use ReturnType<typeof setTimeout> for setInterval return type to be compatible with browser environments.
    let interval: ReturnType<typeof setTimeout> | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(seconds => seconds - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      if (task && startTimeRef.current) {
        onLog(task, startTimeRef.current, new Date());
        // Sound notification
        new Audio('https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3').play();
      }
      resetTimer();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft, onLog, task, resetTimer]);
  
  const handleToggle = () => {
    if (!isActive && secondsLeft === totalSeconds) { // Starting for the first time
      startTimeRef.current = new Date();
    }
    setIsActive(!isActive);
  };
  
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
      aria-labelledby="pomodoro-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <div className="p-8 text-center">
          <h2 id="pomodoro-title" className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 truncate">{task?.title || 'Study Session'}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Focus on your task. You can do it!</p>

          <div className="relative w-64 h-64 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700"/>
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray="339.292"
                strokeDashoffset={339.292 - (progress / 100) * 339.292}
                strokeLinecap="round"
                className="text-indigo-600 dark:text-indigo-400 transition-all duration-1000 linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-bold text-slate-800 dark:text-slate-100 tracking-tighter">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-8">
            <button onClick={handleToggle} className="w-32 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 text-lg">
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button onClick={resetTimer} className="p-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full bg-slate-100 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 dark:focus:ring-offset-slate-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9a9 9 0 0114.13-5.22M20 15a9 9 0 01-14.13 5.22" />
                </svg>
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <label htmlFor="duration-input">Session duration:</label>
            <input
                id="duration-input"
                type="number"
                value={duration}
                onChange={(e) => onDurationChange(Number(e.target.value))}
                className="w-16 p-1 text-center bg-slate-100 dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                min="1"
                max="120"
                disabled={isActive}
            />
            <span>minutes</span>
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PomodoroTimer;