import React from 'react';
import { TodoItem, Subject } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface TodoListProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  subjects: Subject[];
  onStartPomodoro: (task: TodoItem) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, subjects, onStartPomodoro }) => {
    
  // Sort todos so incomplete ones are at the top
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.done === b.done) return 0;
    return a.done ? 1 : -1;
  });

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {sortedTodos.map(todo => {
          const subject = subjects.find(s => s.id === todo.subjectId);
          const isStudyTask = ['physics', 'chemistry', 'combined'].includes(todo.subjectId);
          
          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              key={todo.id}
              className={`flex items-start p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 ${todo.done ? 'bg-slate-100/30 dark:bg-slate-900/30 border-white/20 dark:border-slate-800/30 opacity-60' : 'bg-white/70 dark:bg-slate-800/70 border-white/60 dark:border-slate-700/60 shadow-lg shadow-black/5 hover:shadow-black/10 hover:bg-white/80 dark:hover:bg-slate-800/90'}`}
            >
              <div className="flex-shrink-0 mr-4 pt-0.5">
                <button 
                  onClick={() => onToggle(todo.id)}
                  className={`flex items-center justify-center h-6 w-6 rounded-full border-2 transition-all duration-300 ${todo.done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                >
                  {todo.done && (
                    <motion.svg 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      className="w-3 h-3 text-white" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  )}
                </button>
              </div>
              <div className="flex-1">
                <p className={`text-lg font-medium transition-all duration-300 ${todo.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                  {todo.title}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {subject && (
                     <span 
                        className={`text-xs font-bold inline-flex items-center px-2.5 py-1 rounded-full uppercase tracking-wider ${!todo.done ? 'shadow-sm' : 'opacity-50'}`} 
                        style={{ backgroundColor: `${subject.color}25`, color: subject.color, boxShadow: !todo.done ? `0 0 10px ${subject.color}15` : 'none' }}
                     >
                       <svg className="w-2 h-2 mr-1.5" fill="currentColor" viewBox="0 0 8 8">
                         <circle cx="4" cy="4" r="4" />
                       </svg>
                       {subject.name}
                     </span>
                  )}
                  {todo.note && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{todo.note}</p>
                  )}
                </div>
              </div>
              {isStudyTask && !todo.done && (
                  <button 
                      onClick={() => onStartPomodoro(todo)} 
                      className="ml-4 p-2 text-indigo-500 hover:text-white hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] rounded-full transition-all focus:outline-none"
                      aria-label={`Start Pomodoro for ${todo.title}`}
                      title="Start Pomodoro Timer"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
       {todos.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center py-10 text-slate-500 dark:text-slate-400"
          >
            <div className="mx-auto h-16 w-16 mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-300">All clear! No tasks for today.</p>
            <p className="text-sm mt-1">Type your plans above to get started.</p>
          </motion.div>
        )}
    </div>
  );
};

export default TodoList;