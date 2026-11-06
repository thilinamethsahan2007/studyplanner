import { TodoItem } from '../types';

export const getGroqApiKey = (): string => {
  try {
    const metaKey = import.meta.env.VITE_GROQ_API_KEY;
    if (metaKey && typeof metaKey === 'string' && metaKey.trim().length > 0) {
      return metaKey.trim();
    }
  } catch {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      const procKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
      if (procKey && typeof procKey === 'string' && procKey.trim().length > 0) {
        return procKey.trim();
      }
    }
  } catch {
    // ignore
  }

  return '';
};

// Available working Groq models in order of priority
const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

export const VALID_SUBJECT_IDS = [
  'physics',
  'chemistry',
  'combined',
  'microcredentials',
  'exercise',
  'entertainment',
  'personal',
] as const;

export type ValidSubjectId = typeof VALID_SUBJECT_IDS[number];

const SUBJECT_ALIASES: Record<string, ValidSubjectId> = {
  phys: 'physics',
  physics: 'physics',
  chem: 'chemistry',
  chemistry: 'chemistry',
  math: 'combined',
  maths: 'combined',
  mathematics: 'combined',
  combined: 'combined',
  'combined-pure': 'combined',
  'combined-applied': 'combined',
  pure: 'combined',
  applied: 'combined',
  ganiyan: 'combined',
  cert: 'microcredentials',
  certs: 'microcredentials',
  credential: 'microcredentials',
  microcredentials: 'microcredentials',
  programming: 'microcredentials',
  coding: 'microcredentials',
  python: 'microcredentials',
  gym: 'exercise',
  workout: 'exercise',
  exercise: 'exercise',
  fitness: 'exercise',
  running: 'exercise',
  movie: 'entertainment',
  movies: 'entertainment',
  game: 'entertainment',
  gaming: 'entertainment',
  entertainment: 'entertainment',
  personal: 'personal',
  chores: 'personal',
  routine: 'personal',
};

function normalizeSubjectId(rawSubject: string): ValidSubjectId {
  if (!rawSubject) return 'personal';
  const clean = rawSubject.toLowerCase().trim();
  if (VALID_SUBJECT_IDS.includes(clean as ValidSubjectId)) {
    return clean as ValidSubjectId;
  }
  return SUBJECT_ALIASES[clean] || 'personal';
}

function sanitizeTodos(rawTodos: any[]): Partial<TodoItem>[] {
  if (!Array.isArray(rawTodos)) return [];

  return rawTodos
    .map((item): Partial<TodoItem> | null => {
      if (!item || typeof item !== 'object') return null;

      const titleRaw = String(item.title || '').trim();
      if (!titleRaw) return null;

      const subjectId = normalizeSubjectId(item.subjectId);
      const isRecurring = Boolean(item.recurring || item.isRecurring);

      let estimatedMinutes: number | undefined = undefined;
      if (item.estimatedMinutes !== undefined && item.estimatedMinutes !== null) {
        const parsedMins = Math.round(Number(item.estimatedMinutes));
        if (!isNaN(parsedMins) && parsedMins > 0) {
          estimatedMinutes = parsedMins;
        }
      }

      let note = String(item.note || '').trim();
      if (isRecurring && !note.includes('[recurring]')) {
        note = note ? `${note} [recurring]` : '[recurring]';
      }

      return {
        title: titleRaw.charAt(0).toUpperCase() + titleRaw.slice(1),
        subjectId,
        note,
        estimatedMinutes,
        recurring: isRecurring || undefined,
        done: false,
      };
    })
    .filter((item): item is Partial<TodoItem> => item !== null);
}

/**
 * Parses natural language, multi-task commands, shorthands, and Singlish input
 * into structured TodoItem objects using Groq AI.
 */
export async function parseTodosWithGroq(inputText: string): Promise<Partial<TodoItem>[]> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('Groq API key is not configured.');
  }

  const trimmed = inputText.trim();
  if (!trimmed) return [];

  const systemPrompt = `You are an expert Sri Lankan G.C.E. Advanced Level (A/L) study planner and productivity assistant.
Deconstruct the user's input into separate, actionable todo items with precision.

User input can be:
- Single task: e.g. "complete mechanics tute 4"
- Multi-task comma/and separated: e.g. "revise organic chemistry reactions for 1.5h, 10 integration questions, 30m gym leg day every day"
- Shorthand commands:
  * .p (Physics)
  * .c (Chemistry)
  * .m (Combined Mathematics - Pure or Applied)
  * .mc (Microcredentials / Coding / Certifications)
  * .ex (Exercise / Fitness / Workout)
  * .e (Entertainment / Leisure / Movies)
  * .pv (Personal / Life / Chores)
  * .est <hours|mins> (Estimated time, e.g. .est 1.5 = 90 mins, .est 45 = 45 mins)
  * .r (Recurring daily habit)
- Singlish / Sinhala phrases:
  * "ganiyan" / "ganan" -> combined
  * "chem" -> chemistry
  * "physics practicals" -> physics
  * "padam karanna" -> study task

Available subjectId values (MUST be strictly one of these):
1. "physics": Mechanics, Oscillations & Waves, Thermal Physics, Gravitational/Electrostatic/Magnetic Fields, Current Electricity, Electronics, Properties of Matter, Radiation.
2. "chemistry": Atomic Structure & Bonding, Moles, Energetics, s/p/d block elements, Organic Chemistry, Kinetics, Equilibrium, Electrochemistry, Industrial Chemistry.
3. "combined": Combined Mathematics:
   - Pure Math: Algebra, Quadratics, Trig, Limits, Differentiation/Calculus, Integration, Straight Line, Circle, Permutations, Series, Complex Numbers, Matrices.
   - Applied Math: Vectors, Coplanar Forces, Straight line motion, Projectiles, Friction, Relative Motion, Newton's Laws, Work Energy Power, Circular Motion, Probability, SHM, Centre of Mass, Statistics.
4. "microcredentials": Programming, Python, Web development, Machine Learning, Coursera, Udemy, online certificates.
5. "exercise": Gym, workouts, running, jogging, cardio, pushups, sports, swimming, yoga.
6. "entertainment": Movies, gaming, Netflix, YouTube, anime, leisure reading, music.
7. "personal": Sleep, waking early, hydration, chores, diary/journaling, errands, family, medical.

Instructions:
1. Split multiple tasks into separate items in the "todos" array.
2. For each task provide:
   - "title": Clean, concise, capitalized action title (strip away shorthand prefixes like .p or .est from the title text).
   - "subjectId": One of the 7 exact subject IDs above.
   - "estimatedMinutes": Realistic integer minutes (e.g. 90 for 1.5 hours, 45 for 45m). Set null if no duration is indicated.
   - "recurring": Boolean. True if the user indicates a daily habit, recurring, every day, or .r.
   - "note": Additional context or chapter/topic notes, or empty string.

Return ONLY valid JSON matching this schema:
{
  "todos": [
    {
      "title": "string",
      "subjectId": "physics" | "chemistry" | "combined" | "microcredentials" | "exercise" | "entertainment" | "personal",
      "estimatedMinutes": number | null,
      "recurring": boolean,
      "note": "string"
    }
  ]
}`;

  let lastError = '';

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: trimmed },
          ],
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = `(${response.status}) ${errText}`;
        console.warn(`Groq model ${model} failed for todos:`, lastError);
        continue;
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) continue;

      const parsed = JSON.parse(rawContent);
      const rawTodos = parsed.todos || parsed.items || (Array.isArray(parsed) ? parsed : []);
      const sanitized = sanitizeTodos(rawTodos);

      if (sanitized.length > 0) {
        return sanitized;
      }
    } catch (err: any) {
      lastError = err?.message || 'Network fetch error';
      console.warn(`Groq call to ${model} for todos failed:`, err);
    }
  }

  throw new Error(`Groq todo parsing failed: ${lastError || 'Unknown error'}`);
}
