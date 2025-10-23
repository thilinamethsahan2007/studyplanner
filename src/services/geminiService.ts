import { GoogleGenAI, Type } from "@google/genai";
import { TodoItem } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled. Make sure to set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateTodoSuggestions = async (text: string): Promise<Partial<TodoItem>[]> => {
  if (!API_KEY) {
    console.error("Cannot call Gemini API without an API key.");
    // Return a mock response if API key is not available
    return Promise.resolve([
        { title: "Mock: Review Physics chapter 5", subjectId: "physics", note: "This is a mock response as API key is missing." },
        { title: "Mock: Complete Chemistry homework", subjectId: "chemistry", note: "Please provide an API_KEY." }
    ]);
  }

  const model = "gemini-2.5-flash";
  const validSubjectIds = ['physics', 'chemistry', 'combined', 'exercise', 'entertainment', 'personal'];

  try {
    const response = await ai.models.generateContent({
      model,
      contents: text,
      config: {
        systemInstruction: `You are an intelligent daily planner assistant. Your task is to analyze the user's text and extract any actionable to-do items. Convert these items into a structured JSON array based on the provided schema.

The user is a student, but their schedule can include academic tasks, exercise, entertainment, and personal chores. Use this information to correctly assign the subjectId for each task:

- **Academic Subjects:**
  - subjectId: 'physics', name: 'Physics' (Sinhala: 'භෞතික විද්‍යාව'). Covers topics like Mechanics, Waves, Thermal Physics, etc.
  - subjectId: 'chemistry', name: 'Chemistry' (Sinhala: 'රසායන විද්‍යාව'). Covers topics like Atomic Structure, Organic Chemistry, etc.
  - subjectId: 'combined', name: 'Combined Maths' (Sinhala: 'සංයුක්ත ගණිතය'). Covers topics like Calculus, Algebra, Trigonometry, etc.

- **Non-Academic Activities:**
  - subjectId: 'exercise', name: 'Exercise'. For physical activities like 'go for a run', 'gym session', 'play cricket'.
  - subjectId: 'entertainment', name: 'Entertainment'. For leisure activities like 'watch a movie', 'play video games', 'read a novel'.
  - subjectId: 'personal', name: 'Personal'. For chores and other personal tasks like 'do laundry', 'buy groceries', 'call a friend'.

The 'subjectId' field in your response MUST be one of ${validSubjectIds.map(id => `'${id}'`).join(', ')}. Do not use any other values. If a task doesn't fit any category, classify it as 'personal'.
The language of the output 'title' and 'note' fields should match the language of the user's input text.
`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'A concise title for the to-do item.',
              },
              subjectId: {
                type: Type.STRING,
                description: `The subject ID for the task. It is absolutely required to be one of: ${validSubjectIds.map(id => `'${id}'`).join(', ')}.`,
              },
              note: {
                type: Type.STRING,
                description: 'Any extra details or notes for the task. Can be an empty string.',
              },
            },
            required: ['title', 'subjectId'],
          },
        },
      },
    });

    const jsonString = response.text;
    const suggestions = JSON.parse(jsonString);
    
    // Basic validation
    if (!Array.isArray(suggestions)) {
        throw new Error("AI response is not an array.");
    }

    return suggestions.map(s => ({
        title: s.title || "Untitled Task",
        subjectId: validSubjectIds.includes(s.subjectId) ? s.subjectId : 'personal',
        note: s.note || "",
    }));

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get suggestions from AI.");
  }
};