import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { getJournalEntries, getJournalPin, setJournalPin } from '../services/journalClient';
import { Lock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react';

const JournalPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [hasPinSet, setHasPinSet] = useState(false);
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    
    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    
    useEffect(() => {
        const existingPin = getJournalPin();
        setHasPinSet(!!existingPin);
    }, []);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        const existingPin = getJournalPin();
        
        if (!existingPin) {
            if (pinInput.length >= 4) {
                setJournalPin(pinInput);
                setHasPinSet(true);
                setIsAuthenticated(true);
                setEntries(getJournalEntries());
            }
        } else {
            if (pinInput === existingPin) {
                setIsAuthenticated(true);
                setEntries(getJournalEntries());
            } else {
                alert("Incorrect PIN");
            }
        }
    };

    // Calendar Logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const getEntryForDate = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return entries.find(e => e.date === dateStr);
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

    if (selectedEntry) {
        return (
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button 
                    onClick={() => setSelectedEntry(null)}
                    className="self-start flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-bold transition-colors mb-4"
                >
                    <ArrowLeft className="w-5 h-5" /> Back to Calendar
                </button>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    
                    <div className="flex items-center gap-3 text-indigo-500 mb-8 mt-2">
                        <CalendarIcon className="w-6 h-6" />
                        <span className="font-black text-2xl tracking-tight">
                            {new Date(selectedEntry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    
                    <p className="text-slate-700 dark:text-slate-300 text-xl leading-relaxed whitespace-pre-wrap font-medium mb-10">
                        {selectedEntry.content}
                    </p>

                    {selectedEntry.photos && selectedEntry.photos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                            {selectedEntry.photos.map((p, i) => (
                                <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 dark:ring-white/10">
                                    <img src={p} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedEntry.completedTasks && selectedEntry.completedTasks.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/50">
                            <h4 className="font-black text-slate-400 dark:text-slate-500 text-sm uppercase tracking-widest mb-4">Work Completed</h4>
                            <div className="flex flex-wrap gap-2.5">
                                {selectedEntry.completedTasks.map((task, i) => (
                                    <span key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/50">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        {task.title}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 pb-12 h-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Private Diary</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Select a highlighted day to view its journal entry.</p>
                </div>
                <button onClick={() => setIsAuthenticated(false)} className="shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                    <Lock className="w-4 h-4" /> Lock
                </button>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col">
                
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <ChevronRight className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 md:gap-4 flex-1 auto-rows-fr">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center font-bold text-xs md:text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                            {day}
                        </div>
                    ))}
                    
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="rounded-2xl" />
                    ))}
                    
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const entry = getEntryForDate(dayNum);
                        const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;

                        if (entry) {
                            return (
                                <button
                                    key={dayNum}
                                    onClick={() => setSelectedEntry(entry)}
                                    className="relative flex flex-col items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold rounded-2xl md:rounded-3xl transition-all hover:scale-105 active:scale-95 shadow-sm border border-indigo-200 dark:border-indigo-500/30 group p-2 min-h-[60px] md:min-h-[80px]"
                                >
                                    <span className="text-lg md:text-2xl">{dayNum}</span>
                                    <div className="absolute bottom-2 md:bottom-3 flex gap-1 mt-1">
                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 group-hover:animate-bounce"></div>
                                    </div>
                                    {isToday && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>}
                                </button>
                            );
                        }

                        return (
                            <div
                                key={dayNum}
                                className={`relative flex items-center justify-center text-slate-400 dark:text-slate-600 font-semibold rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-2 min-h-[60px] md:min-h-[80px] ${isToday ? 'ring-2 ring-rose-500/50 text-slate-700 dark:text-slate-300' : ''}`}
                            >
                                <span className="text-lg md:text-xl">{dayNum}</span>
                                {isToday && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default JournalPage;
