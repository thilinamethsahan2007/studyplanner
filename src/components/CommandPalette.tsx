import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isOpen) return null;

    const commands = [
        { title: 'Go to Today', action: () => navigate('/') },
        { title: 'Go to Weekly Planner', action: () => navigate('/weekly') },
        { title: 'Go to Log Book', action: () => navigate('/logbook') },
        { title: 'Go to Analytics', action: () => navigate('/analytics') },
        { title: 'Close Palette', action: () => setIsOpen(false) },
    ];

    const filtered = commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

    const execute = (action: () => void) => {
        action();
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh]">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg mx-4 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                <div className="flex items-center px-4 border-b border-slate-100 dark:border-slate-700">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input 
                        type="text" 
                        autoFocus
                        className="w-full bg-transparent border-0 px-4 py-4 text-slate-800 dark:text-slate-100 focus:ring-0 placeholder-slate-400"
                        placeholder="Type a command or search..." 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <kbd className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded">ESC</kbd>
                </div>
                <div className="max-h-96 overflow-y-auto p-2">
                    {filtered.map((cmd, i) => (
                        <button
                            key={i}
                            onClick={() => execute(cmd.action)}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-200 focus:outline-none focus:bg-indigo-50"
                        >
                            {cmd.title}
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <p className="p-4 text-center text-slate-500">No commands found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
