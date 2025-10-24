import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';

interface EditLogModalProps {
  isOpen: boolean;
  log: LogEntry | null;
  onClose: () => void;
  onUpdate: (updatedLog: LogEntry) => void;
  onDelete: (logId: string) => void;
}

const EditLogModal: React.FC<EditLogModalProps> = ({ isOpen, log, onClose, onUpdate, onDelete }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (log) {
      setStartTime(log.startTime);
      setEndTime(log.endTime);
      setError('');
    }
  }, [log]);
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!log) return;
    
    if (!startTime || !endTime) {
      setError('Both start and end times are required.');
      return;
    }
    
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    
    if (end <= start) {
      setError("End time must be after start time.");
      return;
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    onUpdate({ ...log, startTime, endTime, durationMinutes });
    setError('');
    onClose();
  };

  const handleDelete = () => {
    if (log && window.confirm('Are you sure you want to delete this log entry? This action cannot be undone.')) {
        onDelete(log.id);
        onClose();
    }
  }

  if (!isOpen || !log) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <form onSubmit={handleSubmit} className="p-8">
          <h2 id="modal-title" className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Edit Log Entry</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 truncate">{log.todoItemTitle}</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="edit-start-time" className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">Start Time</label>
              <input
                id="edit-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="block w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <div>
              <label htmlFor="edit-end-time" className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">End Time</label>
              <input
                id="edit-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="block w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex justify-between items-center">
            <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-semibold text-sm rounded-lg shadow-sm hover:bg-red-200 dark:hover:bg-red-900/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-800 transition-colors"
            >
                Delete
            </button>
            <div className="flex gap-4">
                <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-semibold text-sm rounded-lg shadow-sm hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 dark:focus:ring-offset-slate-800 transition-colors"
                >
                Cancel
                </button>
                <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors"
                >
                Save Changes
                </button>
            </div>
          </div>
        </form>
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

export default EditLogModal;
