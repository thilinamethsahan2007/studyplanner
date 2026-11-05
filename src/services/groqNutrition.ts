import { MealType, ParsedMealResponse } from '../types';

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

// Available working Groq models for chat completions
const GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

// ─── Calibrated Realistic Portion Guidelines ─────────────────────────────────
const REALISTIC_PORTION_GUIDELINES = `CRITICAL REALISTIC PORTION & WEIGHT CALIBRATION (DO NOT EXAGGERATE):
1. Rice & Grains:
   - 1 standard level household cup of cooked rice (loose/fluffed) = ~150g (~200 kcal, ~4g protein, ~44g carbs, ~0.5g fat). DO NOT overestimate to dense packed 235g+.
   - 1.2 cups of cooked rice = ~180g (~240 kcal, ~4.8g protein, ~53g carbs).
   - "White rice" without quantity = ~1 to 1.2 cups cooked (~150-180g, ~200-240 kcal).
2. Chicken & Poultry (Home Curries vs Western Cuts):
   - "Pieces of chicken" in curries, stews, and home cooking refer to standard bone-in curry-cut pieces (~35-40g edible cooked meat per piece, ~70-80 kcal, ~10g protein each).
   - DO NOT assume giant western chicken breasts (85-100g each) unless the user explicitly says "chicken breast fillet".
   - 3 pieces of chicken in curry = ~105-115g cooked meat total (~220 kcal, ~28-30g protein).
   - 6 pieces of chicken in curry = ~210-230g cooked meat total (~440 kcal, ~56-60g protein).
3. Fish & Seafood:
   - 1 standard home curry cut or fried fish slice/piece = ~40-50g (~65-85 kcal, ~10-12g protein).
   - 3 pieces of fish = ~120-140g total (~200-240 kcal, ~30-36g protein).
4. Curries, Dhal & Gravies:
   - 1 tablespoon (tbsp) = ~15ml (~15-20 kcal). 3 tbsp chicken curry gravy = ~45-50 kcal. 4 tbsp = ~60 kcal. 5 tbsp beans curry = ~70-80 kcal.
   - If a curry is mentioned without explicit quantity (e.g. "dhal curry"), assume a standard modest home serving of ~2-3 tbsp (~35-45g, ~40-55 kcal).
5. Cooking styles:
   - "Airfried" means very minimal oil used (1-2g oil per serving). Bittergourd (karawila thel dala) air-fried is low-calorie (~40-60 kcal total).
6. Snacks & Bakery:
   - 1 Sri Lankan Chinese roll / savoury roll = ~60-70g (~150-180 kcal).
   - 1 Fish sandwich (tea triangle) = ~60-65g (~140-160 kcal). 2 fish sandwiches = ~280-320 kcal.
   - 1 Milo 180ml tetra pack = standard manufacturer specs (~120 kcal, 3.2g protein, 20g carbs, 3.2g fat).
7. Strict Rule:
   - Always prefer realistic, moderate domestic home-cooking portions rather than oversized restaurant or bodybuilding bulk sizes.`;

function sanitizeItems(rawItems: any[]): ParsedMealResponse['items'] {
  return rawItems.map((it: any) => ({
    name: String(it.name || 'Food Item'),
    portionDescription: String(it.portionDescription || '1 serving'),
    calories: Math.max(0, Math.round(Number(it.calories) || 0)),
    protein: Math.max(0, Math.round((Number(it.protein) || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((Number(it.carbs) || 0) * 10) / 10),
    fat: Math.max(0, Math.round((Number(it.fat) || 0) * 10) / 10),
    fiber: Math.max(0, Math.round((Number(it.fiber) || 0) * 10) / 10),
    confidenceNotes: it.confidenceNotes ? String(it.confidenceNotes) : undefined,
  }));
}

// ─── Groq Chat Completions Helper ───────────────────────────────────────────

async function callGroqChat(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<any | null> {
  let lastErr = '';

  for (const model of GROQ_MODELS) {
    const requestPayload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    };

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastErr = `(${response.status}) ${errText}`;
        console.warn(`Groq API with model ${model} returned error:`, lastErr);
        continue;
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) continue;

      return JSON.parse(rawContent);
    } catch (e: any) {
      lastErr = e?.message || 'Network fetch error';
      console.warn(`Groq call to ${model} failed:`, e);
    }
  }

  throw new Error(`Groq AI request failed. ${lastErr || 'Please check network and API key.'}`);
}

// ─── Single Meal Parser (AI only) ───────────────────────────────────────────

async function callGroqSingleMeal(
  trimmed: string,
  mealType: MealType,
  apiKey: string
): Promise<ParsedMealResponse | null> {
  const systemPrompt = `You are an expert clinical dietitian and food scientist specializing in realistic dietary tracking and domestic home cooking.
Analyze the user's natural language meal description which can include food names, proportions, quantities, cooking styles, or weights.
Deconstruct it into individual ingredients/components with REALISTIC, ACCURATE, UN-EXAGGERATED portion estimates.

${REALISTIC_PORTION_GUIDELINES}

For each item return:
- name: string (e.g. "Cooked Red Rice", "Chicken Curry Pieces", "Whole Wheat Toast")
- portionDescription: string with realistic weight (e.g. "1.2 cups (~180g)", "3 curry pieces (~110g cooked)", "1 slice (~35g)")
- calories: number (in kcal)
- protein: number (in grams, rounded to 1 decimal)
- carbs: number (in grams, rounded to 1 decimal)
- fat: number (in grams, rounded to 1 decimal)
- fiber: number (in grams, rounded to 1 decimal)
- confidenceNotes: string (brief rationale or assumptions)

Rules:
- 1g Protein = 4 kcal, 1g Carbs = 4 kcal, 1g Fat = 9 kcal. Total calories should be consistent within ±10%.
- Return every distinct food as its own item.
- Return ONLY valid JSON with this exact structure: { "items": [...], "summaryNote": "..." }`;

  const userPrompt = `Parse this food log entry: "${trimmed}". The target meal category is ${mealType}.`;

  const parsed = await callGroqChat(systemPrompt, userPrompt, apiKey);
  if (!parsed) return null;

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  if (items.length > 0) {
    return {
      success: true,
      items: sanitizeItems(items),
      summaryNote: parsed.summaryNote,
      fallbackMode: false,
    };
  }
  return null;
}

// ─── Multi-Meal Parser (AI only) ────────────────────────────────────────────
// Accepts input like:
//   Breakfast: 1.2 cups of red rice, 3 pieces of chicken...
//   Lunch: white rice, fish curry...
//   Dinner: ...
//   Snacks: ...
// Returns a map of MealType -> ParsedMealResponse

export type MultiMealResult = Partial<Record<MealType, ParsedMealResponse>>;

const MEAL_LABEL_REGEX = /\b(breakfast|lunch|dinner|snacks?)\s*[:：]/gi;

/** Detect whether the input contains meal-category labels like "Breakfast:", "Lunch:" etc. */
export function hasMultiMealLabels(text: string): boolean {
  const matches = text.match(MEAL_LABEL_REGEX);
  return !!matches && matches.length >= 1;
}

/** Split text by meal labels into { mealType: description } */
function splitByMealLabels(text: string): Partial<Record<MealType, string>> {
  const result: Partial<Record<MealType, string>> = {};

  const labelPositions: Array<{ type: MealType; index: number; fullMatch: string }> = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(MEAL_LABEL_REGEX.source, 'gi');
  while ((match = re.exec(text)) !== null) {
    let rawType = match[1].toLowerCase();
    if (rawType === 'snack') rawType = 'snacks';
    labelPositions.push({
      type: rawType as MealType,
      index: match.index,
      fullMatch: match[0],
    });
  }

  for (let i = 0; i < labelPositions.length; i++) {
    const startOfContent = labelPositions[i].index + labelPositions[i].fullMatch.length;
    const endOfContent = i + 1 < labelPositions.length ? labelPositions[i + 1].index : text.length;
    const content = text.slice(startOfContent, endOfContent).trim().replace(/[.]+$/, '').trim();
    if (content) {
      result[labelPositions[i].type] = content;
    }
  }

  return result;
}

export async function parseMultiMealWithGroq(text: string): Promise<MultiMealResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Please enter food or meal text to analyze.');

  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error('Groq API key is not configured. Set VITE_GROQ_API_KEY in your .env file.');

  const sections = splitByMealLabels(trimmed);
  const mealTypes = Object.keys(sections) as MealType[];

  if (mealTypes.length === 0) {
    throw new Error('No meal labels found. Use format: Breakfast: ..., Lunch: ..., Dinner: ..., Snacks: ...');
  }

  // Build a single combined prompt so we only make ONE API call for all meals to conserve quota
  const systemPrompt = `You are an expert clinical dietitian and food scientist specializing in realistic dietary tracking and domestic home cooking.
The user will give you food descriptions for multiple meal categories in a day.
For EACH meal category, deconstruct the foods into individual items with REALISTIC, ACCURATE, UN-EXAGGERATED portion estimates.

${REALISTIC_PORTION_GUIDELINES}

For each item return:
- name: string (e.g. "Cooked Red Rice", "Chicken Curry Pieces", "Fish Curry Slice")
- portionDescription: string with realistic weight (e.g. "1.2 cups (~180g)", "3 curry pieces (~110g cooked)", "5 tbsp (~75g)")
- calories: number (kcal)
- protein: number (grams, rounded to 1 decimal)
- carbs: number (grams, rounded to 1 decimal)
- fat: number (grams, rounded to 1 decimal)
- fiber: number (grams, rounded to 1 decimal)
- confidenceNotes: string (brief rationale)

Rules:
- 1g Protein = 4 kcal, 1g Carbs = 4 kcal, 1g Fat = 9 kcal. Total calories should be consistent within ±10%.
- "tbsp of curry" means tablespoons of that specific curry (gravy + ingredients).
- Return every distinct food as its own item.
- Return ONLY valid JSON with this structure:
{
  "meals": {
    "breakfast": { "items": [...], "summaryNote": "..." },
    "lunch": { "items": [...], "summaryNote": "..." },
    "dinner": { "items": [...], "summaryNote": "..." },
    "snacks": { "items": [...], "summaryNote": "..." }
  }
}
Only include the meal categories that are provided in the input.`;

  const mealDescriptions = mealTypes
    .map((mt) => `${mt.charAt(0).toUpperCase() + mt.slice(1)}: ${sections[mt]}`)
    .join('\n');
  const userPrompt = `Parse these meal entries:\n${mealDescriptions}`;

  const parsed = await callGroqChat(systemPrompt, userPrompt, apiKey);
  if (!parsed || !parsed.meals) {
    throw new Error('Could not parse meals. Please try again.');
  }

  const result: MultiMealResult = {};
  for (const mt of mealTypes) {
    const mealData = parsed.meals[mt];
    if (mealData && Array.isArray(mealData.items) && mealData.items.length > 0) {
      result[mt] = {
        success: true,
        items: sanitizeItems(mealData.items),
        summaryNote: mealData.summaryNote,
        fallbackMode: false,
      };
    }
  }

  return result;
}

// ─── Single Meal Dispatcher (AI only, no fallback DB) ───────────────────────

export async function parseMealWithGroq(
  text: string,
  mealType: MealType
): Promise<ParsedMealResponse> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Please enter food or meal text to analyze.');
  }

  // 1. Try secure Vercel Serverless Function first (/api/nutrition)
  try {
    const apiRes = await fetch('/api/nutrition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: trimmed, mealType }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        return {
          success: true,
          items: sanitizeItems(data.items),
          summaryNote: data.summaryNote,
          fallbackMode: false,
        };
      }
    }
  } catch (apiErr) {
    console.info('Serverless /api/nutrition not reachable, falling back to direct client dispatch.');
  }

  // 2. Direct client-side Groq call (AI only — no local fallback)
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('Groq API key is not configured. Set VITE_GROQ_API_KEY in your .env file.');
  }

  const directResult = await callGroqSingleMeal(trimmed, mealType, apiKey);
  if (directResult) {
    return directResult;
  }

  throw new Error('Could not parse meal with AI. Please check your Groq API key and try again.');
}
