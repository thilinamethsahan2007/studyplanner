import React from 'react';
import { TodoItem, Subject } from '../types';

interface TodoListProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  subjects: Subject[];
  onStartPomodoro: (task: TodoItem) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, subjects, onStartPomodoro }) => {
    
  return (
    <div className="space-y-2">
      {todos.map(todo => {
        const subject = subjects.find(s => s.id === todo.subjectId);
        const isStudyTask = ['physics', 'chemistry', 'combined'].includes(todo.subjectId);
        
        return (
          <div
            key={todo.id}
            className="flex items-start p-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
          >
            <div className="flex-shrink-0 mr-4 pt-1">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => onToggle(todo.id)}
                className="h-6 w-6 rounded-md border-slate-300 dark:bg-slate-900 dark:border-slate-600 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <p className={`text-lg font-medium ${todo.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                {todo.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {subject && (
                   <span className="text-xs font-semibold inline-flex items-center px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
                     <svg className="w-2.5 h-2.5 mr-1.5" fill="currentColor" viewBox="0 0 8 8">
                       <circle cx="4" cy="4" r="3" />
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
                    className="ml-4 p-2 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                    aria-label={`Start Pomodoro for ${todo.title}`}
                    title="Start Pomodoro Timer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            )}
          </div>
        )
      })}
       {todos.length === 0 && (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="mt-2">All clear! No tasks for today.</p>
            <p className="text-sm">Type your plans above to get started.</p>
          </div>
        )}
    </div>
  );
};

export default TodoList;