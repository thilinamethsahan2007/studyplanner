import { JournalEntry } from '../types';

const STORAGE_KEY = 'sp_journal_entries';
const PIN_KEY = 'sp_journal_pin';

export const getJournalEntries = (): JournalEntry[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to load journals', e);
    }
    return [];
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