import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry } from '../types';
import { getJournalEntries, getJournalPin, setJournalPin } from '../services/journalClient';
import { Lock, Unlock, Calendar, Image as ImageIcon, CheckCircle2, MoreVertical, Trash2 } from 'lucide-react';

const JournalPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [hasPinSet, setHasPinSet] = useState(false);
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    
    // Auth Check
    useEffect(() => {
        const existingPin = getJournalPin();
        setHasPinSet(!!existingPin);
    }, []);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        const existingPin = getJournalPin();
        
        if (!existingPin) {
            // Setting a new PIN
            if (pinInput.length >= 4) {
                setJournalPin(pinInput);
                setHasPinSet(true);
                setIsAuthenticated(true);
                setEntries(getJournalEntries());
            }
        } else {
            // Verifying existing PIN
            if (pinInput === existingPin) {
                setIsAuthenticated(true);
                setEntries(getJournalEntries());
            } else {
                alert("Incorrect PIN");
            }
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <form onSubmit={handleAuth} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
                        {hasPinSet ? 'Enter PIN' : 'Setup Journal PIN'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                        {hasPinSet ? 'Unlock your private diary.' : 'Create a 4+ digit PIN to lock your entries.'}
                    </p>
                    
                    <input 
                        type="password" 
                        value={pinInput}
                        onChange={e => setPinInput(e.target.value)}
                        placeholder="••••"
                        className="w-full text-center text-3xl tracking-[1em] font-black bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl py-4 focus:ring-0 focus:border-indigo-500 outline-none transition-colors mb-6 text-slate-800 dark:text-white"
                        autoFocus
                    />
                    
                    <button 
                        type="submit" 
                        disabled={pinInput.length < 4}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                    >
                        {hasPinSet ? 'Unlock' : 'Save PIN & Unlock'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-8 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Private Diary</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Your thoughts, memories, and daily progress.</p>
                </div>
                <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                    <Lock className="w-4 h-4" /> Lock
                </button>
            </div>

            {entries.length === 0 ? (
                <div className="text-center py-20">
                    <BookHeartIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">No entries yet</h3>
                    <p className="text-slate-500">Wait until 9:00 PM today to write your first entry!</p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {entries.map(entry => (
                        <div key={entry.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                            
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3 text-indigo-500">
                                    <Calendar className="w-5 h-5" />
                                    <span className="font-black text-lg">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>
                            
                            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-wrap font-medium mb-8">
                                {entry.content}
                            </p>

                            {entry.photos && entry.photos.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    {entry.photos.map((p, i) => (
                                        <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-md">
                                            <img src={p} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {entry.completedTasks && entry.completedTasks.length > 0 && (
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                                    <h4 className="font-bold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider mb-3">Work Completed</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {entry.completedTasks.map((task, i) => (
                                            <span key={i} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                {task.title}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Quick mock icon for empty state
const BookHeartIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M12 13s-2.5-3.5-2.5-5A2.5 2.5 0 0 1 12 6a2.5 2.5 0 0 1 2.5 2c0 1.5-2.5 5-2.5 5Z"/></svg>
);

export default JournalPage;