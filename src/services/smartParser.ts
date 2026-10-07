import { TodoItem } from "../types";
import { mockSyllabus } from "../mockData";

// Hardcoded base keywords for generic matching
const categoryKeywords: Record<string, string[]> = {
    physics: ['physics', 'mechanics', 'waves', 'thermal', 'electricity', 'magnetic', 'matter', 'radiation', 'f=ma', 'velocity', 'acceleration', 'force', 'energy', 'power', 'momentum', 'phys'],
    chemistry: ['chemistry', 'chem', 'organic', 'inorganic', 'physical', 'atomic', 'structure', 'bonding', 'moles', 'titration', 'kinetics', 'equilibrium', 'electrochemistry', 'polymer'],
    combined: ['math', 'maths', 'combined', 'calculus', 'algebra', 'trig', 'geometry', 'stat', 'probability', 'integration', 'differentiation', 'vectors'],
    exercise: ['exercise', 'run', 'jog', 'walk', 'gym', 'workout', 'swim', 'cricket', 'football', 'basketball', 'sport', 'train', 'yoga', 'stretch', 'push up', 'pull up'],
    entertainment: ['entertainment', 'movie', 'film', 'watch', 'game', 'play', 'read', 'music', 'listen', 'relax', 'chill', 'youtube', 'netflix', 'tv'],
};

// Dynamically inject all syllabus topics (both English and Sinhala) into the keyword dictionary
mockSyllabus.forEach(subjectSyllabus => {
    // Map combined-applied back to the primary 'combined' subject ID
    const subjectId = subjectSyllabus.subjectId.startsWith('combined') ? 'combined' : subjectSyllabus.subjectId;
    
    if (!categoryKeywords[subjectId]) {
        categoryKeywords[subjectId] = [];
    }

    subjectSyllabus.units.forEach(unit => {
        if (unit.name) categoryKeywords[subjectId].push(unit.name.toLowerCase());
        if (unit.sinhala_name) categoryKeywords[subjectId].push(unit.sinhala_name.toLowerCase());
        
        unit.subunits.forEach(subunit => {
            if (subunit.name) categoryKeywords[subjectId].push(subunit.name.toLowerCase());
            if (subunit.sinhala_name) categoryKeywords[subjectId].push(subunit.sinhala_name.toLowerCase());
        });
    });
});

const SHORTHAND_MAP: Record<string, string> = {
    'py': 'physics',
    'com': 'combined',
    'ch': 'chemistry',
    'p': 'personal',
    'pr': 'personal',
    'ex': 'exercise',
    'en': 'entertainment'
};

export const generateTodoSuggestions = async (text: string): Promise<Partial<TodoItem>[]> => {
    // 0. Check for explicit shorthand mode
    if (text.trim().startsWith('.')) {
        const results: Partial<TodoItem>[] = [];
        const tokens = text.split(/(?=\.[a-zA-Z]+\s)/);
        
        tokens.forEach(token => {
            const match = token.trim().match(/^\.([a-zA-Z]+)\s+(.*)/);
            if (match) {
                const code = match[1].toLowerCase();
                const content = match[2];
                const subjectId = SHORTHAND_MAP[code] || 'personal';
                
                const items = content.split(',').map(s => s.trim()).filter(s => s.length > 0);
                items.forEach(item => {
                    results.push({
                        title: item.charAt(0).toUpperCase() + item.slice(1),
                        subjectId: subjectId,
                        note: ''
                    });
                });
            }
        });
        
        if (results.length > 0) return results;
    }

    // 1. Split the text into separate tasks.
    const splitRegex = /(?:\b(?:and|then|also)\b|\s*,\s*|\s*\.\s*|\s*;\s*)/i;
    let rawTasks = text.split(splitRegex)
        .map(t => t.trim())
        .filter(t => t.length > 2); // Ignore empty fragments

    const suggestions = rawTasks.map(taskText => {
        let assignedCategory = 'personal';
        const lowerText = taskText.toLowerCase();

        // 2. Keyword matching for categorization
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => {
                // For very short generic keywords, ensure word boundaries to avoid false positives (e.g., "run" inside "brunch")
                // For long phrases from the syllabus, substring match is fine.
                if (keyword.length <= 5) {
                    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    return new RegExp(`\\b${escaped}\\b`, 'i').test(lowerText);
                } else {
                    return lowerText.includes(keyword);
                }
            })) {
                assignedCategory = category;
                break;
            }
        }

        // 3. Clean up the title
        const title = taskText.charAt(0).toUpperCase() + taskText.slice(1);

        return {
            title: title,
            subjectId: assignedCategory,
            note: ''
        };
    });

    // Simulate a tiny delay so it feels "smart"
    await new Promise(resolve => setTimeout(resolve, 400));

    return suggestions;
};
