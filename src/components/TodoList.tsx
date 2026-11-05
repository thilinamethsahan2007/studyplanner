import React from 'react';
import { TodoItem, Subject } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, Play, Check } from 'lucide-react';

interface TodoListProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  subjects: Subject[];
  onStartPomodoro: (task: TodoItem) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, subjects, onStartPomodoro }) => {
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Sort todos so incomplete ones are at the top
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.done === b.done) return 0;
    return a.done ? 1 : -1;
  });

  return (
    <div className="space-y-2.5">
      <AnimatePresence>
        {sortedTodos.map(todo => {
          const subject = subjects.find(s => s.id === todo.subjectId);
          const isStudyTask = ['physics', 'chemistry', 'combined', 'microcredentials'].includes(todo.subjectId);
          const isRecurring = Boolean(todo.recurring || todo.note?.includes('[recurring]'));
          const cleanNote = todo.note ? todo.note.replace(/\[recurring\]/g, '').trim() : '';

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              key={todo.id}
              className={`flex items-start p-3.5 sm:p-4 rounded-2xl border backdrop-blur-xl transition-all duration-200 ${
                todo.done 
                  ? 'bg-slate-100/40 dark:bg-slate-900/30 border-slate-200/50 dark:border-white/5 opacity-55' 
                  : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {/* Apple Circular Checkbox */}
              <div className="flex-shrink-0 mr-3.5 pt-0.5">
                <button 
                  onClick={() => onToggle(todo.id)}
                  aria-label={todo.done ? "Mark as incomplete" : "Mark as complete"}
                  className={`flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 transition-all duration-200 press-scale ${
                    todo.done 
                      ? 'bg-blue-500 border-blue-500 shadow-sm shadow-blue-500/30' 
                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 bg-white/40 dark:bg-slate-800/40'
                  }`}
                >
                  {todo.done && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.15 }}>
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </motion.div>
                  )}
                </button>
              </div>

              {/* Task Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm sm:text-base font-medium leading-relaxed transition-all duration-200 ${
                    todo.done 
                      ? 'line-through text-slate-400 dark:text-slate-500' 
                      : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {todo.title}
                  </p>
                  {isRecurring && (
                    <span 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-semibold" 
                      title="Daily Recurring Habit"
                    >
                      <Repeat className="w-3 h-3 animate-spin-slow" />
                      <span>Daily</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {subject && (
                    <span 
                      className="text-[11px] font-semibold inline-flex items-center px-2.5 py-0.5 rounded-full border backdrop-blur-sm"
                      style={{ 
                        backgroundColor: `${subject.color}18`, 
                        borderColor: `${subject.color}35`,
                        color: subject.color 
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: subject.color }} />
                      {subject.name}
                    </span>
                  )}
                  {cleanNote && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">{cleanNote}</p>
                  )}
                  {todo.estimatedMinutes && (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 flex items-center gap-1">
                      <span>⏳</span>
                      <span>{formatTime(todo.estimatedMinutes)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Pomodoro Launch */}
              {isStudyTask && !todo.done && (
                <button 
                  onClick={() => onStartPomodoro(todo)} 
                  className="ml-2 sm:ml-4 p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all press-scale shrink-0"
                  aria-label={`Start Pomodoro for ${todo.title}`}
                  title="Start Focus Timer"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {todos.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="text-center py-12 text-slate-400 dark:text-slate-500"
        >
          <div className="mx-auto h-12 w-12 mb-3 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Check className="h-6 w-6 stroke-[2.5]" />
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">All clear! No tasks for today.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Use the bar above to add what you want to achieve.</p>
        </motion.div>
      )}
    </div>
  );
};

export default TodoList;
