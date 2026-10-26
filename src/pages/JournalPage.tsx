import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { getJournalEntries, getJournalPin, setJournalPin, deleteJournalEntry } from '../services/journalClient';
import JournalModal from '../components/JournalModal';
import { 
    Lock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
    CheckCircle2, ArrowLeft, Plus, Edit3, Trash2, History, Sparkles 
} from 'lucide-react';

function getTodayString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const JournalPage: React.FC = () => {
    const todayStr = getTodayString();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [hasPinSet, setHasPinSet] = useState(false);
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    
    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    // Modal state for creating / editing forgotten days
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
    
    useEffect(() => {
        const existingPin = getJournalPin();
        setHasPinSet(!!existingPin);
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        const existingPin = getJournalPin();
        
        if (!existingPin) {
            if (pinInput.length >= 4) {
                setJournalPin(pinInput);
                setHasPinSet(true);
                setIsAuthenticated(true);
                setEntries(await getJournalEntries());
            }
        } else {
            if (pinInput === existingPin) {
                setIsAuthenticated(true);
                setEntries(await getJournalEntries());
            } else {
                alert("Incorrect PIN");
            }
        }
    };

    // Calendar Navigation
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

    // Open modal to write/backfill entry
    const handleOpenWriteModal = (targetDate?: string) => {
        setModalInitialDate(targetDate || todayStr);
        setIsModalOpen(true);
    };

    // Handle delete entry
    const handleDeleteEntry = async (date: string) => {
        if (!window.confirm(`Are you sure you want to delete the journal entry for ${date}?`)) return;
        await deleteJournalEntry(date);
        const fresh = await getJournalEntries();
        setEntries(fresh);
        setSelectedEntry(null);
    };

    // Compute unjournaled forgotten days in the past 7 days
    const getForgottenDays = () => {
        const today = new Date();
        const forgotten: { dateStr: string; label: string }[] = [];
        for (let i = 1; i <= 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${day}`;
            const hasEntry = entries.some(e => e.date === dateStr);
            if (!hasEntry) {
                const label = i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                forgotten.push({ dateStr, label });
            }
        }
        return forgotten;
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
                <div className="flex items-center justify-between mb-2">
                    <button 
                        onClick={() => setSelectedEntry(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-bold transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" /> Back to Calendar
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleOpenWriteModal(selectedEntry.date)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-bold transition-colors"
                        >
                            <Edit3 className="w-4 h-4" /> Edit Entry
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDeleteEntry(selectedEntry.date)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-6 md:p-10 shadow-xl border border-white/40 dark:border-slate-700/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    
                    <div className="flex items-center gap-3 text-indigo-500 mb-8 mt-2">
                        <CalendarIcon className="w-6 h-6" />
                        <span className="font-black text-2xl tracking-tight">
                            {new Date(selectedEntry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    
                    <p className="text-slate-700 dark:text-slate-300 text-xl leading-relaxed whitespace-pre-wrap font-medium mb-10">
                        {selectedEntry.content}
                    </p>

                    {selectedEntry.photos && selectedEntry.photos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                            {selectedEntry.photos.map((p, i) => (
                                <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 dark:ring-white/10">
                                    <img src={p} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" alt="Journal memory" />
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedEntry.completedTasks && selectedEntry.completedTasks.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/50">
                            <h4 className="font-black text-slate-400 dark:text-slate-500 text-sm uppercase tracking-widest mb-4">Work Completed on this day</h4>
                            <div className="flex flex-wrap gap-2.5">
                                {selectedEntry.completedTasks.map((task, i) => (
                                    <span key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/50">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        {task.title}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <JournalModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialDate={modalInitialDate}
                    onSaved={async () => {
                        const fresh = await getJournalEntries();
                        setEntries(fresh);
                        if (modalInitialDate) {
                            const updated = fresh.find(e => e.date === modalInitialDate);
                            setSelectedEntry(updated || null);
                        }
                    }}
                />
            </div>
        );
    }

    const forgottenDays = getForgottenDays();

    return (
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-6 pb-12 h-full">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm tracking-tight">
                        Private Diary
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Select any day to view, write, or backfill forgotten entries.
                    </p>
                </div>
                
                <div className="flex items-center gap-2.5">
                    <button 
                        type="button"
                        onClick={() => handleOpenWriteModal()} 
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all active:scale-95 text-sm"
                    >
                        <Plus className="w-4 h-4" /> Add / Backfill Entry
                    </button>
                    <button 
                        type="button"
                        onClick={() => setIsAuthenticated(false)} 
                        className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm"
                    >
                        <Lock className="w-4 h-4" /> Lock
                    </button>
                </div>
            </div>

            {/* Forgotten Days Quick-Backfill Banner */}
            {forgottenDays.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                        <History className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold">
                            Unjournaled days this week ({forgottenDays.length}):
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {forgottenDays.slice(0, 4).map(f => (
                            <button
                                key={f.dateStr}
                                type="button"
                                onClick={() => handleOpenWriteModal(f.dateStr)}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-sm flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3 text-amber-600" /> {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Calendar Container */}
            <div className="flex-1 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-xl shadow-black/5 border border-white/50 dark:border-slate-600/50 p-6 md:p-8 flex flex-col">
                
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={prevMonth} 
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button 
                            type="button"
                            onClick={nextMonth} 
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
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
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const isPast = dateStr < todayStr;
                        const isToday = dateStr === todayStr;
                        const entry = getEntryForDate(dayNum);

                        // If an entry exists, show the diary card that opens the viewer
                        if (entry) {
                            return (
                                <button
                                    key={dayNum}
                                    type="button"
                                    onClick={() => setSelectedEntry(entry)}
                                    className="relative flex flex-col items-center justify-center bg-white/70 dark:bg-indigo-900/30 backdrop-blur-md hover:bg-white/90 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-2xl md:rounded-3xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/5 border border-white/60 dark:border-indigo-500/40 group p-2 min-h-[64px] md:min-h-[84px]"
                                    title={`View journal for ${dateStr}`}
                                >
                                    <span className="text-lg md:text-2xl">{dayNum}</span>
                                    <div className="absolute bottom-2 md:bottom-3 flex gap-1 mt-1">
                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 group-hover:animate-bounce"></div>
                                    </div>
                                    {isToday && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>}
                                </button>
                            );
                        }

                        // Forgotten past day or today (No entry yet) -> Clickable to backfill!
                        if (isPast || isToday) {
                            return (
                                <button
                                    key={dayNum}
                                    type="button"
                                    onClick={() => handleOpenWriteModal(dateStr)}
                                    title={isToday ? "Write today's journal" : `Backfill forgotten entry for ${dateStr}`}
                                    className={`relative flex flex-col items-center justify-center font-semibold rounded-2xl md:rounded-3xl border transition-all hover:scale-105 active:scale-95 p-2 min-h-[64px] md:min-h-[84px] group ${
                                        isToday 
                                            ? 'border-indigo-300 dark:border-indigo-600/50 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 shadow-sm'
                                            : 'border-dashed border-slate-300/80 dark:border-slate-700/60 bg-white/20 dark:bg-slate-800/20 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-indigo-400 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    <span className="text-lg md:text-xl font-bold">{dayNum}</span>
                                    <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 mt-0.5">
                                        <Plus className="w-2.5 h-2.5" /> Write
                                    </span>
                                    {isToday && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                                    )}
                                </button>
                            );
                        }

                        // Future day
                        return (
                            <div
                                key={dayNum}
                                className="relative flex items-center justify-center text-slate-300 dark:text-slate-600 font-semibold rounded-2xl md:rounded-3xl border border-transparent bg-slate-50/20 dark:bg-slate-900/20 p-2 min-h-[64px] md:min-h-[84px] opacity-40 cursor-not-allowed"
                            >
                                <span className="text-lg md:text-xl">{dayNum}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal for adding/backfilling journal */}
            <JournalModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialDate={modalInitialDate}
                onSaved={async () => {
                    const fresh = await getJournalEntries();
                    setEntries(fresh);
                }}
            />
        </div>
    );
};

export default JournalPage;
