import React, { useState } from 'react';
import { generateTodoSuggestions } from '../services/smartParser';
import { TodoItem } from '../types';
import { Zap, Loader2 } from 'lucide-react';

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

  return (
    <div className="mb-8 w-full">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 p-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
            <div className="pl-4 pr-2 text-indigo-500 dark:text-indigo-400">
                <Zap className="w-5 h-5" />
            </div>
            <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-0 px-2 py-3 focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                placeholder="Type 'finish mechanics tute'..."
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="mr-1 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-5 py-2.5 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Add</span>}
            </button>
        </div>
      </form>
    </div>
  );
};

export default SmartTodoInput;