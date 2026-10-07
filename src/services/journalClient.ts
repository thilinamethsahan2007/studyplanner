import { JournalEntry } from '../types';

const STORAGE_KEY = 'sp_journal_entries';
const PIN_KEY = 'sp_journal_pin';

const MOCK_ENTRY: JournalEntry = {
    id: 'journal-mock-1',
    date: '2026-10-06',
    content: "Today was actually a really productive day! I finally managed to wrap my head around the Mechanics concepts that were bothering me yesterday.\n\nI spent a solid 2 hours on the combined math tutorial and managed to solve 15 out of the 20 questions completely on my own without looking at the marking scheme! Feeling much more confident about the upcoming term test.\n\nTook a 30 min walk outside as well to clear my head. Note to self: drink more water during study sessions!",
    photos: ["https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600"],
    completedTasks: [
        { title: "Mechanics Tute 4", subjectId: "physics" },
        { title: "Read Theory notes", subjectId: "chemistry" },
        { title: "Straight line past papers", subjectId: "combined" }
    ]
};

export const getJournalEntries = (): JournalEntry[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to load journals', e);
    }
    return [MOCK_ENTRY];
};

export const saveJournalEntry = (entry: JournalEntry) => {
    const entries = getJournalEntries();
    const existingIndex = entries.findIndex(e => e.date === entry.date);
    if (existingIndex >= 0) {
        entries[existingIndex] = entry;
    } else {
        entries.push(entry);
    }
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const getJournalPin = (): string | null => {
    return localStorage.getItem(PIN_KEY);
};

export const setJournalPin = (pin: string) => {
    localStorage.setItem(PIN_KEY, pin);
};