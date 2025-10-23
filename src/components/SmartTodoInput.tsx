import React, { useState } from 'react';
import { generateTodoSuggestions } from '../services/geminiService';
import { TodoItem } from '../types';

interface SmartTodoInputProps {
  onAddTodos: (newTodos: Partial<TodoItem>[]) => void;
}

const SmartTodoInput: React.FC<SmartTodoInputProps> = ({ onAddTodos }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const suggestions = await generateTodoSuggestions(inputText);
      if (suggestions && suggestions.length > 0) {
        onAddTodos(suggestions);
        setInputText(''); // Clear input on success
      } else {
        // Handle cases where AI doesn't return any tasks
        setError("Could not generate tasks from the text. Please try rephrasing.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-8">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={2}
            className="w-full p-4 pr-28 sm:pr-32 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
            placeholder="Plan your day... e.g., 'Finish mechanics tute and read chemistry chapter 5'"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="absolute top-1/2 right-3 sm:right-4 -translate-y-1/2 flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all disabled:bg-indigo-300 dark:disabled:bg-indigo-800 dark:disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="hidden sm:inline">Adding...</span>
              </>
            ) : (
                <>
                    <span className="sm:hidden">Add</span>
                    <span className="hidden sm:inline">Add Tasks</span>
                </>
            )}
          </button>
        </div>
      </form>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
};

export default SmartTodoInput;