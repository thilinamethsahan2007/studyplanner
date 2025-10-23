import React, { useState, useEffect, useRef } from 'react';
import { generateStudyAid } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { toPng } from 'html-to-image';

interface AiHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  unitName: string;
  subunitName: string;
}

type ModalState = 'select' | 'loading' | 'result' | 'error';

const AiHelperModal: React.FC<AiHelperModalProps> = ({ isOpen, onClose, subjectName, unitName, subunitName }) => {
  const [mode, setMode] = useState<ModalState>('select');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode('select');
      setResult('');
      setError('');
    }
  }, [isOpen]);
  
  const handleGenerate = async (aidType: 'notes' | 'quiz') => {
    setMode('loading');
    try {
      const response = await generateStudyAid(subjectName, unitName, subunitName, aidType);
      setResult(response);
      setMode('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setMode('error');
    }
  };

  const handleSaveAsImage = async () => {
    if (!contentRef.current) {
      console.error("Content element not found for saving image.");
      return;
    }
    setIsSaving(true);
    try {
      const dataUrl = await toPng(contentRef.current, {
        cacheBust: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
        style: {
          padding: '24px',
        }
      });
      const link = document.createElement('a');
      const safeSubunitName = subunitName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `study-aid_${safeSubunitName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image:', err);
    } finally {
      setIsSaving(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col h-[80vh]">
        <header className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 flex justify-between items-start">
            <div>
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">AI Study Helper</h2>
                 <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-md">Topic: {subunitName}</p>
            </div>
             <button
              type="button"
              onClick={onClose}
              className="p-2 -mt-2 -mr-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </header>

        <main className="p-4 sm:p-6 flex-1 overflow-y-auto">
            {mode === 'select' && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <h3 className="text-lg font-semibold mb-4">What would you like to generate?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                        <button onClick={() => handleGenerate('notes')} className="p-6 bg-slate-100 dark:bg-slate-700/60 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                            <span className="font-semibold">Study Notes</span>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Get key concepts summarized.</p>
                        </button>
                        <button onClick={() => handleGenerate('quiz')} className="p-6 bg-slate-100 dark:bg-slate-700/60 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                             <span className="font-semibold">Create a Quiz</span>
                             <p className="text-sm text-slate-500 dark:text-slate-400">Test your knowledge.</p>
                        </button>
                    </div>
                </div>
            )}
            {mode === 'loading' && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <svg className="animate-spin h-8 w-8 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-slate-600 dark:text-slate-300 font-semibold">Generating content...</p>
                </div>
            )}
             {mode === 'error' && (
                <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
                   <p className="font-semibold">An Error Occurred</p>
                   <p className="text-sm">{error}</p>
                   <button onClick={() => setMode('select')} className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg shadow-sm hover:bg-slate-200">
                        Try Again
                    </button>
                </div>
            )}
            {mode === 'result' && (
                <div ref={contentRef}>
                    <MarkdownRenderer text={result} />
                </div>
            )}
        </main>
        {mode === 'result' && (
             <footer className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                <button
                type="button"
                onClick={() => setMode('select')}
                className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-semibold text-sm rounded-lg shadow-sm hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 dark:focus:ring-offset-slate-800 transition-colors"
                >
                Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsImage}
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save as Image'}
                </button>
            </footer>
        )}
      </div>
      <style>{`
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in-scale { animation: fadeInScale 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AiHelperModal;