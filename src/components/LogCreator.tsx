import React, { useState } from 'react';
import { TodoItem, Subject } from '../types';

interface LogCreatorProps {
  loggableTasks: TodoItem[];
  subjects: Subject[];
  onLogTask: (taskId: string, startTime: string, endTime: string) => void;
}

const LogCreator: React.FC<LogCreatorProps> = ({ loggableTasks, subjects, onLogTask }) => {
  const [times, setTimes] = useState<{ [taskId: string]: { start: string; end: string } }>({});

  const handleTimeChange = (taskId: string, type: 'start' | 'end', value: string) => {
    setTimes(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [type]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    const { start, end } = times[taskId] || {};
    if (start && end) {
      onLogTask(taskId, start, end);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Log Your Completed Tasks</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Add start and end times to track your study sessions.</p>
      <div className="space-y-4">
        {loggableTasks.map(task => {
          const subject = subjects.find(s => s.id === task.subjectId);
          const taskTimes = times[task.id] || { start: '', end: '' };
          return (
            <form key={task.id} onSubmit={(e) => handleSubmit(e, task.id)} className="p-4 bg-slate-50 dark:bg-slate-700/60 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{task.title}</p>
                 {subject && (
                   <span className="text-xs font-semibold inline-flex items-center px-2 py-0.5 rounded-full mt-1" style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
                     {subject.name}
                   </span>
                )}
              </div>
              <div className="flex-shrink-0 w-full sm:w-auto flex items-center gap-2">
                <div>
                  <label htmlFor={`start-${task.id}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start</label>
                  <input
                    id={`start-${task.id}`}
                    type="time"
                    value={taskTimes.start}
                    onChange={(e) => handleTimeChange(task.id, 'start', e.target.value)}
                    required
                    className="block w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm px-2 py-1 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor={`end-${task.id}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">End</label>
                  <input
                    id={`end-${task.id}`}
                    type="time"
                    value={taskTimes.end}
                    onChange={(e) => handleTimeChange(task.id, 'end', e.target.value)}
                    required
                    className="block w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm px-2 py-1 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button type="submit" className="self-end px-4 py-1.5 bg-indigo-600 text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition-colors">
                  Log
                </button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
};

export default LogCreator;