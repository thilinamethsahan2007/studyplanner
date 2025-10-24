
import { GoogleGenAI, Type } from "@google/genai";
import { TodoItem } from "../types";

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn("Gemini API key not found. AI features will be disabled. Make sure to set the API_KEY environment variable.");
}

const getAi = (): GoogleGenAI => {
    if (!ai) {
        throw new Error("AI features are not configured. API key is missing.");
    }
    return ai;
};

export const generateTodoSuggestions = async (text: string): Promise<Partial<TodoItem>[]> => {
  if (!ai) {
    console.warn("AI features are not configured. Returning mock data.");
    return Promise.resolve([
        { title: "Mock: Review Physics chapter 5", subjectId: "physics", note: "AI features are disabled." },
        { title: "Mock: Complete Chemistry homework", subjectId: "chemistry", note: "Configure API key." }
    ]);
  }

  const model = "gemini-2.5-flash";
  const validSubjectIds = ['physics', 'chemistry', 'combined', 'exercise', 'entertainment', 'personal'];
  
  const systemInstruction = `You are an intelligent daily planner assistant. Your task is to analyze the user's text and extract any actionable to-do items. Convert these items into a structured JSON array based on the provided schema.

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
`;

  try {
    const gemini = getAi();
    const response = await gemini.models.generateContent({
      model,
      contents: text,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'A concise title for the to-do item.' },
              subjectId: { type: Type.STRING, description: `The subject ID. Must be one of: ${validSubjectIds.join(', ')}.` },
              note: { type: Type.STRING, description: 'Any extra details. Can be empty.' },
            },
            required: ['title', 'subjectId'],
          },
        },
      }
    });

    const jsonString = response.text;
    const suggestions = JSON.parse(jsonString);
    
    if (!Array.isArray(suggestions)) {
        throw new Error("AI response was not a valid array.");
    }

    return suggestions.map(s => ({
        title: s.title || "Untitled Task",
        subjectId: validSubjectIds.includes(s.subjectId) ? s.subjectId : 'personal',
        note: s.note || "",
    }));

  } catch (error) {
    console.error("Error generating todo suggestions:", error);
    throw new Error("Failed to get suggestions from AI.");
  }
};

export const getAnalyticsInsights = async (
  mode: 'marks' | 'syllabus' | 'logs',
  data: any
): Promise<string> => {
  const gemini = getAi();
  const model = "gemini-2.5-pro";

  let content = `You are an expert academic coach for a Sri Lankan A/L student. Analyze the following data and provide actionable insights, encouragement, and suggestions for improvement. Format your response in clear, easy-to-read markdown. Be encouraging and supportive in your tone.`;

  switch (mode) {
    case 'marks':
      content += `\nAnalyze these test results. The score is a percentage. Look for trends, strengths, and weaknesses across subjects. Provide specific advice on how to improve.\nTest Data: ${JSON.stringify(data.tests)}`;
      break;
    case 'syllabus':
       content += `\nAnalyze this syllabus completion data. The progress is a percentage. Identify which subjects are well-progressed and which are lagging. Suggest a strategy to balance the workload and catch up on incomplete topics.\nSyllabus Progress Data: ${JSON.stringify(data.progressData)}`;
      break;
    case 'logs':
      content += `\nAnalyze this student's time logs for the current week and their historical weekly summaries. Durations are in minutes. Identify patterns in their study habits, time allocation between study and other activities (exercise, entertainment). Provide suggestions for optimizing their schedule for better productivity and well-being.\nCurrent Week Logs: ${JSON.stringify(data.logs)}\nHistorical Summaries: ${JSON.stringify(data.weeklySummaries)}`;
      break;
  }
  
  try {
    const response = await gemini.models.generateContent({
      model,
      contents: content
    });
    return response.text;
  } catch (error) {
    console.error("Error getting analytics insights:", error);
    throw new Error("Failed to get insights from AI.");
  }
};

export const generateStudyAid = async (
  subjectName: string,
  unitName: string,
  subunitName: string,
  aidType: 'notes' | 'quiz'
): Promise<string> => {
  const gemini = getAi();
  const model = "gemini-2.5-pro";
  
  const promptBase = `You are an expert academic tutor for a Sri Lankan GCE A/L student studying in the physical science stream. The student needs help with the topic "${subunitName}" from the unit "${unitName}" in the subject "${subjectName}".`;

  let specificPrompt = '';
  if (aidType === 'notes') {
    specificPrompt = `Please generate concise, well-structured study notes for this topic. The notes should be in markdown format, using headings, bold text, and lists to make them easy to read and understand. Focus on the most important concepts, formulas, and definitions.`;
  } else { // quiz
    specificPrompt = `Please create a short multiple-choice quiz with 4 questions to test the student's understanding of this topic. For each question, provide 4 options (A, B, C, D) and then provide a separate answer key at the very end with brief explanations for the correct answers. Format the entire response in markdown.`;
  }
  
  const content = `${promptBase}\n\n${specificPrompt}`;

  try {
    const response = await gemini.models.generateContent({
      model,
      contents: content
    });
    return response.text;
  } catch (error) {
    console.error("Error generating study aid:", error);
    throw new Error("Failed to generate content from AI.");
  }
};
