import React, { useState, useEffect } from 'react';
import { JournalEntry, Day } from '../types';
import { saveJournalEntry, getJournalEntry } from '../services/journalClient';
import apiClient from '../services/apiClient';
import { X, Image as ImageIcon, CheckCircle2, Calendar, History, Sparkles } from 'lucide-react';
import { playSuccessChime } from '../utils/sound';

interface JournalModalProps {
    isOpen: boolean;
    onClose: () => void;
    day?: Day | null;
    initialDate?: string;
    onSaved?: (entry: JournalEntry) => void;
}

function getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function shiftDateStr(dateStr: string, deltaDays: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + deltaDays);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        width = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas to Blob failed'));
                }, 'image/jpeg', 0.6); // 60% quality JPEG
            };
        };
        reader.onerror = error => reject(error);
    });
};

const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, day, initialDate, onSaved }) => {
    const todayStr = getTodayDateString();
    const yesterdayStr = shiftDateStr(todayStr, -1);
    const twoDaysAgoStr = shiftDateStr(todayStr, -2);

    const [selectedDate, setSelectedDate] = useState<string>(initialDate || day?.date || todayStr);
    const [content, setContent] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [completedTasks, setCompletedTasks] = useState<{ title: string; subjectId: string }[]>([]);
    const [isExistingEntry, setIsExistingEntry] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Synchronize initial date when modal opens
    useEffect(() => {
        if (isOpen) {
            const dateToUse = initialDate || day?.date || todayStr;
            setSelectedDate(dateToUse);
        }
    }, [isOpen, initialDate, day, todayStr]);

    // Load data for currently selected date
    useEffect(() => {
        if (!isOpen || !selectedDate) return;

        let isCancelled = false;

        const loadDateData = async () => {
            try {
                const existing = await getJournalEntry(selectedDate);
                if (isCancelled) return;

                if (existing) {
                    setContent(existing.content || '');
                    setPhotos(existing.photos || []);
                    setCompletedTasks(existing.completedTasks || []);
                    setIsExistingEntry(true);
                } else {
                    setContent('');
                    setPhotos([]);
                    setIsExistingEntry(false);

                    // Try to populate completed tasks for this date
                    if (day && day.date === selectedDate && day.items) {
                        setCompletedTasks(
                            day.items.filter(i => i.done).map(i => ({ title: i.title, subjectId: i.subjectId }))
                        );
                    } else {
                        // Query past todos for this forgotten date
                        try {
                            const pastDays = await apiClient.getWeekTodos(selectedDate, selectedDate);
                            if (isCancelled) return;
                            const matchedDay = pastDays.find(d => d.date === selectedDate);
                            if (matchedDay && matchedDay.items) {
                                setCompletedTasks(
                                    matchedDay.items.filter(i => i.done).map(i => ({ title: i.title, subjectId: i.subjectId }))
                                );
                            } else {
                                setCompletedTasks([]);
                            }
                        } catch {
                            setCompletedTasks([]);
                        }
                    }
                }
                setIsSaved(false);
            } catch (err) {
                console.error("Failed to load journal entry for date", err);
            }
        };

        loadDateData();

        return () => {
            isCancelled = true;
        };
    }, [isOpen, selectedDate, day]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const newPhotos: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const compressedBlob = await compressImage(file);
                const formData = new FormData();
                formData.append('file', compressedBlob, 'upload.jpg');
                formData.append('upload_preset', 'splanner');

                const res = await fetch('https://api.cloudinary.com/v1_1/nb8n7zxk/image/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.secure_url) {
                    newPhotos.push(data.secure_url);
                } else {
                    // Fallback to base64 if Cloudinary preset is invalid
                    const b64 = await new Promise<string>((resB64) => {
                        const r = new FileReader();
                        r.onloadend = () => resB64(r.result as string);
                        r.readAsDataURL(compressedBlob);
                    });
                    newPhotos.push(b64);
                }
            } catch (err) {
                console.warn("Cloudinary upload failed, using local blob/base64 fallback:", err);
                try {
                    const compressedBlob = await compressImage(file);
                    const b64 = await new Promise<string>((resB64) => {
                        const r = new FileReader();
                        r.onloadend = () => resB64(r.result as string);
                        r.readAsDataURL(compressedBlob);
                    });
                    newPhotos.push(b64);
                } catch (fallbackErr) {
                    console.error("Failed image fallback conversion", fallbackErr);
                }
            }
        }
        
        setPhotos(prev => [...prev, ...newPhotos]);
        setIsUploading(false);
    };

    const handleSave = async () => {
        if (!content.trim() || isUploading) return;

        const entry: JournalEntry = {
            id: `journal-${selectedDate}-${Date.now()}`,
            date: selectedDate,
            content: content.trim(),
            photos,
            completedTasks
        };

        await saveJournalEntry(entry);
        setIsSaved(true);
        playSuccessChime();
        onSaved?.(entry);

        setTimeout(() => {
            onClose();
        }, 1200);
    };

    if (!isOpen) return null;

    const isPastDate = selectedDate < todayStr;
    const isToday = selectedDate === todayStr;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex flex-col md:items-center justify-end md:justify-center animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                    {isPastDate ? 'Backfill Forgotten Day' : 'How was your day?'}
                                </h2>
                                {isPastDate && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                        <History className="w-3 h-3" /> Forgotten Date
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
                                {isPastDate ? (
                                    <span>Writing reflections for <strong className="text-indigo-600 dark:text-indigo-400">{formatDisplayDate(selectedDate)}</strong>.</span>
                                ) : (
                                    <span>You completed <strong className="text-indigo-500">{completedTasks.length} tasks</strong> today.</span>
                                )}
                            </p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    {/* Date Selector Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
                            Journal For:
                        </span>
                        
                        <button
                            type="button"
                            onClick={() => setSelectedDate(todayStr)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isToday
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            Today
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedDate(yesterdayStr)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                selectedDate === yesterdayStr
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            Yesterday
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedDate(twoDaysAgoStr)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                selectedDate === twoDaysAgoStr
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            2 Days Ago
                        </button>

                        {/* Custom Date Picker */}
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <input 
                                type="date"
                                value={selectedDate}
                                max={todayStr}
                                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                                title="Pick any past forgotten date"
                            />
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                    {/* Forgotten Day Banner */}
                    {isPastDate && (
                        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-medium">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>{isExistingEntry ? 'Editing existing entry for this day.' : 'Writing an entry for a forgotten day.'}</span>
                            </div>
                            <span className="font-bold underline">{formatDisplayDate(selectedDate)}</span>
                        </div>
                    )}

                    {/* Tasks Completed Pill tags */}
                    {completedTasks.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                                Completed Tasks on {formatDisplayDate(selectedDate)}:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {completedTasks.map((t, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                        {t.title}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Content Textarea */}
                    <textarea 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={
                            isPastDate
                                ? `What happened on ${formatDisplayDate(selectedDate)}? Reflect on your achievements, feelings, and memories...`
                                : "Write your thoughts here..."
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-5 min-h-[180px] text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-500/20 resize-none font-medium text-base sm:text-lg leading-relaxed shadow-inner"
                    />

                    {/* Photos */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Memories & Photos</h3>
                            <label className="cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors">
                                <ImageIcon className="w-4 h-4" />
                                Add Photo
                                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={isUploading} />
                                {isUploading && <span className="ml-2 animate-pulse text-xs">Uploading...</span>}
                            </label>
                        </div>
                        
                        {photos.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {photos.map((p, i) => (
                                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-sm group">
                                        <img src={p} className="w-full h-full object-cover" alt="journal memory" />
                                        <button 
                                            type="button"
                                            onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 rounded-b-3xl">
                    <button 
                        type="button"
                        onClick={handleSave}
                        disabled={!content.trim() || isUploading}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaved ? (
                            <><CheckCircle2 className="w-6 h-6" /> Saved!</>
                        ) : isExistingEntry ? (
                            'Update Entry'
                        ) : isPastDate ? (
                            `Save Entry for ${formatDisplayDate(selectedDate)}`
                        ) : (
                            'Save Entry'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JournalModal;
