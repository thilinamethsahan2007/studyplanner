import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, TodoItem, Day } from '../types';
import { saveJournalEntry, getJournalEntries } from '../services/journalClient';
import { X, Image as ImageIcon, CheckCircle2, Lock } from 'lucide-react';
import { playSuccessChime } from '../utils/sound';

interface JournalModalProps {
    isOpen: boolean;
    onClose: () => void;
    day: Day;
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
                        height = MAX_HEIGHT;
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

const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, day }) => {

    const [content, setContent] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [isSaved, setIsSaved] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    useEffect(() => {
        if (isOpen && day) {
            // Check if entry already exists for today
            const fetchEntries = async () => {
                const entries = await getJournalEntries();
                const existing = entries.find(e => e.date === day.date);
                if (existing) {
                    setContent(existing.content);
                    setPhotos(existing.photos || []);
                } else {
                    setContent('');
                    setPhotos([]);
                }
                setIsSaved(false);
            };
            fetchEntries();
        }
    }, [isOpen, day]);

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
                }
            } catch (err) {
                console.error("Cloudinary upload error", err);
            }
        }
        
        setPhotos(prev => [...prev, ...newPhotos]);
        setIsUploading(false);
    };

    const handleSave = () => {
        const completedTasks = (day.items || []).filter(i => i.done).map(i => ({ title: i.title, subjectId: i.subjectId }));
        const entry: JournalEntry = {
            id: "journal-" + Date.now(),
            date: day.date,
            content,
            photos,
            completedTasks
        };
        saveJournalEntry(entry);
        setIsSaved(true);
        playSuccessChime();
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    if (!isOpen) return null;

    const completedCount = (day.items || []).filter(i => i.done).length;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex flex-col md:items-center justify-end md:justify-center animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">How was your day?</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            You completed <strong className="text-indigo-500">{completedCount} tasks</strong> today.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                    <textarea 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Write your thoughts here..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-5 min-h-[200px] text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-500/20 resize-none font-medium text-lg leading-relaxed shadow-inner"
                    />

                    {/* Photos */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300">Memories</h3>
                            <label className="cursor-pointer flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors">
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
                        onClick={handleSave}
                        disabled={!content.trim() || isUploading}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaved ? <><CheckCircle2 className="w-6 h-6" /> Saved!</> : 'Save Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JournalModal;