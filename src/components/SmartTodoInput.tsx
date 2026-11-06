import React, { useState } from 'react';
import { generateTodoSuggestions } from '../services/smartParser';
import { TodoItem } from '../types';
import { Zap, Loader2, Repeat, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartTodoInputProps {
  onAddTodos: (newTodos: Partial<TodoItem>[]) => void;
}

const SmartTodoInput: React.FC<SmartTodoInputProps> = ({ onAddTodos }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);

    try {
      const suggestions = await generateTodoSuggestions(inputText);
      if (suggestions && suggestions.length > 0) {
        onAddTodos(suggestions);
        setInputText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const isRecurringActive = Boolean(inputText.match(/(?:^|\s)\.r(?:\s|$)/i));

  return (
    <div className="mb-6 w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl sm:rounded-full border border-slate-200/80 dark:border-white/10 p-1.5 shadow-sm transition-all focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10">
          <div className="pl-3.5 pr-2 text-blue-500 dark:text-blue-400">
            <Zap className="w-5 h-5" />
          </div>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 min-w-0 bg-transparent border-0 px-2 py-2.5 sm:py-3 focus:outline-none focus:ring-0 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium"
            placeholder="Type tasks, e.g. 'mechanics tute 1.5h, 10 chem questions, 30m gym workout every day'..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="flex items-center gap-1.5 justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-xl sm:rounded-full px-5 py-2.5 font-semibold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-500/25 press-scale"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Parsing...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {isRecurringActive && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="mt-2.5 mx-3 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-xs font-medium flex items-center gap-2 backdrop-blur-md w-fit shadow-sm"
          >
            <Repeat className="w-3.5 h-3.5 text-blue-500 animate-spin-slow shrink-0" />
            <span>
              <strong className="font-semibold">Recurring Habit Active:</strong> Injects into every day of this week (Mon – Sun)
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartTodoInput;
