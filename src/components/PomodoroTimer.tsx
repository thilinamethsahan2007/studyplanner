import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TodoItem } from '../types';
import { playSuccessChime, toggleAmbientNoise } from '../utils/sound';
import { Headphones, X, RotateCcw, Play, Pause } from 'lucide-react';

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
  const [ambientNoise, setAmbientNoise] = useState(false);
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
    if (!isOpen && ambientNoise) {
        toggleAmbientNoise(false);
        setAmbientNoise(false);
    }
  }, [isOpen, ambientNoise]);

  useEffect(() => {
    toggleAmbientNoise(ambientNoise);
  }, [ambientNoise]);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout> | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(seconds => seconds - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      if (task && startTimeRef.current) {
        onLog(task, startTimeRef.current, new Date());
        playSuccessChime();
      }
      resetTimer();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft, onLog, task, resetTimer]);
  
  const handleToggle = () => {
    if (!isActive && secondsLeft === totalSeconds) { 
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
      className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-700 animate-in fade-in"
      aria-labelledby="pomodoro-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Animated Zen Background */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }}></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/15 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }}></div>
      </div>
      
      {/* Zen UI Container */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-6">
        
        {/* Header Controls */}
        <div className="absolute top-8 left-8 right-8 flex justify-between items-center text-white/50">
            <button 
                onClick={() => setAmbientNoise(!ambientNoise)} 
                className={`p-3 rounded-2xl transition-all duration-300 ${ambientNoise ? 'bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'hover:bg-white/10 hover:text-white'}`}
                title="Toggle Ambient Noise (Deep Rain)"
            >
                <Headphones className="w-6 h-6" />
            </button>
            <button onClick={onClose} className="p-3 rounded-2xl hover:bg-white/10 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="text-center mb-16 mt-20">
            <h2 id="pomodoro-title" className="text-3xl font-bold text-white tracking-tight mb-2 drop-shadow-sm">
                {task?.title || 'Zen Session'}
            </h2>
            <p className="text-blue-400 font-semibold text-xs tracking-wider uppercase">
                {isActive ? 'Deep Focus Active' : 'Ready to Focus?'}
            </p>
        </div>

        {/* Massive Timer Ring */}
        <div className="relative w-80 h-80 mx-auto mb-14 drop-shadow-2xl">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray="339.292"
              strokeDashoffset={339.292 - (progress / 100) * 339.292}
              strokeLinecap="round"
              className="text-blue-500 transition-all duration-1000 ease-linear"
              style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <span className="text-7xl font-bold tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-5 mb-10">
          <button 
            onClick={handleToggle} 
            className={`flex items-center justify-center gap-3 w-48 py-3.5 font-bold rounded-2xl shadow-xl focus:outline-none focus:ring-4 focus:ring-white/20 transition-all duration-300 text-base press-scale ${
                isActive 
                ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20' 
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/30'
            }`}
          >
            {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            {isActive ? 'Pause' : 'Start Focus'}
          </button>

          <button 
            onClick={resetTimer} 
            title="Reset Timer"
            className="p-3.5 text-white/50 hover:text-white rounded-2xl bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20 transition-all duration-300 press-scale"
          >
              <RotateCcw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Settings */}
        <div className="flex items-center justify-center gap-3 text-xs font-semibold text-white/60 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
          <label htmlFor="duration-input">Duration:</label>
          <input
              id="duration-input"
              type="number"
              value={duration}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              className="w-14 p-0.5 text-center bg-transparent border-b border-white/30 focus:outline-none focus:border-blue-400 text-white transition-colors font-bold"
              min="1"
              max="120"
              disabled={isActive}
          />
          <span>minutes</span>
        </div>

      </div>
    </div>
  );
};

export default PomodoroTimer;
