import React, { useEffect, useRef, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { toPng } from 'html-to-image';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  analysisText: string;
  error: string;
  title: string;
}

const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({ isOpen, onClose, isLoading, analysisText, error, title }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `ai-analysis_${safeTitle}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image:', err);
    } finally {
      setIsSaving(false);
    }
  };


  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col h-[80vh]">
        <header className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 id="modal-title" className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        </header>

        <main className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="animate-spin h-8 w-8 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600 dark:text-slate-300 font-semibold">Generating insights...</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">This may take a few moments.</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
               <p className="font-semibold">An Error Occurred</p>
               <p className="text-sm">{error}</p>
            </div>
          )}
          {analysisText && !isLoading && (
            <div ref={contentRef}>
                <MarkdownRenderer text={analysisText} />
            </div>
          )}
        </main>
        
        <footer className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center gap-4 flex-shrink-0">
            {analysisText && !isLoading && !error && (
                <button
                    type="button"
                    onClick={handleSaveAsImage}
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-semibold text-sm rounded-lg shadow-sm hover:bg-indigo-200 dark:hover:bg-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save as Image'}
                </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-semibold text-sm rounded-lg shadow-sm hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 dark:focus:ring-offset-slate-800 transition-colors"
            >
              Close
            </button>
        </footer>
      </div>
       <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AiAnalysisModal;