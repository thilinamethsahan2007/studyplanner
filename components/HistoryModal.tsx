import React, { useState, useMemo, useEffect } from 'react';
import { LogEntry, Subject } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  subjects: Subject[];
}

const formatDuration = (minutes: number): string => {
    if (minutes < 1) return '0m';
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, logs, subjects }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const logsByDate = useMemo(() => {
    return logs.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {} as { [date: string]: LogEntry[] });
  }, [logs]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const changeMonth = (offset: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for days before the start of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`pad-start-${i}`} className="p-2"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasLogs = !!logsByDate[dateStr];
      const isSelected = selectedDate === dateStr;
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      
      const dayClasses = `
        relative flex items-center justify-center h-12 w-12 rounded-full cursor-pointer transition-colors
        ${isSelected ? 'bg-indigo-600 text-white font-bold' : ''}
        ${!isSelected && isToday ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold' : ''}
        ${!isSelected && !isToday ? 'hover:bg-slate-100 dark:hover:bg-slate-700' : ''}
      `;

      days.push(
        <div key={day} className="flex items-center justify-center p-1">
          <button onClick={() => setSelectedDate(dateStr)} className={dayClasses}>
            {day}
            {hasLogs && !isSelected && (
              <span className="absolute bottom-1.5 h-1.5 w-1.5 bg-green-500 rounded-full"></span>
            )}
             {hasLogs && isSelected && (
              <span className="absolute bottom-1.5 h-1.5 w-1.5 bg-white rounded-full"></span>
            )}
          </button>
        </div>
      );
    }
    return days;
  };

  const selectedLogs = selectedDate ? logsByDate[selectedDate] || [] : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Task History</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Calendar View */}
          <div className="w-full md:w-3/5 lg:w-2/3 p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h3 className="text-lg font-semibold w-40 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 flex-1">
              {generateCalendarGrid()}
            </div>
          </div>
          {/* Details View */}
          <div className="w-full md:w-2/5 lg:w-1/3 p-6 overflow-y-auto">
            {selectedDate ? (
              <div>
                <h3 className="font-bold text-lg mb-4">{new Date(selectedDate.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                {selectedLogs.length > 0 ? (
                  <ul className="space-y-4">
                    {selectedLogs.map(log => {
                      const subject = subjects.find(s => s.id === log.subjectId);
                      return (
                        <li key={log.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{log.todoItemTitle}</p>
                          <div className="flex justify-between items-center mt-1 text-sm">
                            {subject ? (
                               <span className="text-xs font-semibold inline-flex items-center px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
                                 {subject.name}
                               </span>
                            ) : <span></span>}
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{formatDuration(log.durationMinutes)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-center text-slate-500 dark:text-slate-400 pt-16">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <p className="mt-2 font-semibold">No tasks logged</p>
                    <p className="text-sm">No activities were recorded on this day.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-500 dark:text-slate-400 flex flex-col justify-center h-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="mt-2 font-semibold">Select a Date</p>
                <p className="text-sm">Click on a date in the calendar to view your logged tasks.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-fade-in-scale { animation: fadeInScale 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default HistoryModal;
