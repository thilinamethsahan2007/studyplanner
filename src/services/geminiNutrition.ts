import { MealType, ParsedMealResponse } from '../types';

const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ||
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
  '';

// ─── Offline Heuristic Fallback Parser ──────────────────────────────────────

function fallbackEstimate(text: string): ParsedMealResponse['items'] {
  const lower = text.toLowerCase();
  const items: ParsedMealResponse['items'] = [];

  if (lower.includes('egg')) {
    const countMatch = lower.match(/(\d+)\s*(?:large\s*)?egg/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 2;
    items.push({
      name: 'Eggs (Scrambled / Boiled)',
      portionDescription: `${count} whole egg${count > 1 ? 's' : ''}`,
      calories: count * 74,
      protein: count * 6.3,
      carbs: count * 0.4,
      fat: count * 5.0,
      fiber: 0,
      confidenceNotes: 'Standard USDA whole egg estimate',
    });
  }

  if (lower.includes('toast') || lower.includes('bread') || lower.includes('roti') || lower.includes('chapati')) {
    const isRoti = lower.includes('roti') || lower.includes('chapati');
    const countMatch = lower.match(/(\d+)\s*(?:slice|piece|roti|chapati)?s?/);
    const count = countMatch ? parseInt(countMatch[1], 10) : 2;
    items.push({
      name: isRoti ? 'Roti / Flatbread' : 'Toast / Bread',
      portionDescription: `${count} ${isRoti ? 'roti' : 'slice'}${count > 1 ? 's' : ''}`,
      calories: count * (isRoti ? 110 : 80),
      protein: count * (isRoti ? 3.0 : 3.5),
      carbs: count * (isRoti ? 20 : 15),
      fat: count * (isRoti ? 2.0 : 1.0),
      fiber: count * (isRoti ? 2.5 : 1.5),
      confidenceNotes: 'Standard whole grain portion estimate',
    });
  }

  if (lower.includes('avocado')) {
    const isHalf = lower.includes('half') || lower.includes('1/2');
    items.push({
      name: 'Avocado',
      portionDescription: isHalf ? '1/2 medium avocado (~75g)' : '1 whole avocado (~150g)',
      calories: isHalf ? 120 : 240,
      protein: isHalf ? 1.5 : 3.0,
      carbs: isHalf ? 6.0 : 12.0,
      fat: isHalf ? 11.0 : 22.0,
      fiber: isHalf ? 5.0 : 10.0,
      confidenceNotes: 'Heart-healthy monounsaturated fats & fiber',
    });
  }

  if (lower.includes('chicken')) {
    const isCurry = lower.includes('curry');
    items.push({
      name: isCurry ? 'Chicken Curry' : 'Grilled Chicken Breast',
      portionDescription: '1 medium portion (~180g)',
      calories: isCurry ? 260 : 280,
      protein: isCurry ? 32 : 52,
      carbs: isCurry ? 4 : 0,
      fat: isCurry ? 12 : 6,
      fiber: isCurry ? 1 : 0,
      confidenceNotes: 'Lean poultry estimate',
    });
  }

  if (lower.includes('rice')) {
    items.push({
      name: 'Cooked Rice',
      portionDescription: '1 cup cooked (~160g)',
      calories: 215,
      protein: 4.5,
      carbs: 45,
      fat: 0.5,
      fiber: 1.5,
      confidenceNotes: 'Standard cooked grain portion',
    });
  }

  if (lower.includes('dhal') || lower.includes('dal') || lower.includes('lentil')) {
    items.push({
      name: 'Dhal / Lentil Curry',
      portionDescription: '1 cup cooked (~200g)',
      calories: 230,
      protein: 16,
      carbs: 40,
      fat: 1.5,
      fiber: 15,
      confidenceNotes: 'High-fiber plant protein',
    });
  }

  if (lower.includes('banana')) {
    items.push({
      name: 'Banana',
      portionDescription: '1 medium banana (~118g)',
      calories: 105,
      protein: 1.3,
      carbs: 27,
      fat: 0.3,
      fiber: 3.1,
      confidenceNotes: 'Fresh raw fruit',
    });
  }

  if (lower.includes('milk') || lower.includes('tea') || lower.includes('coffee')) {
    const isTea = lower.includes('tea') || lower.includes('coffee');
    items.push({
      name: isTea ? 'Tea / Coffee with Milk' : 'Cow Milk (Whole / 2%)',
      portionDescription: '1 cup / 240ml',
      calories: isTea ? 65 : 130,
      protein: isTea ? 2.5 : 8,
      carbs: isTea ? 7 : 12,
      fat: isTea ? 2.5 : 5,
      fiber: 0,
      confidenceNotes: 'Standard dairy beverage estimate',
    });
  }

  if (lower.includes('shake') || lower.includes('protein powder') || lower.includes('whey')) {
    items.push({
      name: 'Whey Protein Shake',
      portionDescription: '1 scoop (~30g)',
      calories: 120,
      protein: 24,
      carbs: 2.5,
      fat: 1.5,
      fiber: 0,
      confidenceNotes: 'Standard whey protein isolate / concentrate',
    });
  }

  if (items.length === 0) {
    items.push({
      name: text.length > 40 ? text.slice(0, 40) + '...' : text,
      portionDescription: '1 standard serving',
      calories: 320,
      protein: 14,
      carbs: 38,
      fat: 12,
      fiber: 3,
      confidenceNotes: 'Estimated composite average meal',
    });
  }

  return items;
}

// ─── Gemini AI Meal Parsing ──────────────────────────────────────────────────

export async function parseMealWithGemini(
  text: string,
  mealType: MealType
): Promise<ParsedMealResponse> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Please enter food or meal text to analyze.');
  }

  if (!GEMINI_API_KEY) {
    console.warn('VITE_GEMINI_API_KEY is not configured. Using heuristic estimation.');
    return {
      success: true,
      items: fallbackEstimate(trimmed),
      summaryNote: 'Calculated using standard USDA nutritional references.',
      fallbackMode: true,
    };
  }

  const systemInstruction = `You are an expert clinical dietitian and food scientist.
Analyze the user's natural language meal description which can include food names, proportions, quantities, cooking styles, or weights.
Deconstruct it into individual ingredients/components. For each item return:
- name: string (e.g. "Scrambled Eggs", "Whole Wheat Toast", "Cooked Basmati Rice")
- portionDescription: string (e.g. "2 large eggs (100g)", "1 slice (35g)", "1 cup cooked (160g)")
- calories: number (in kcal)
- protein: number (in grams)
- carbs: number (in grams)
- fat: number (in grams)
- fiber: number (in grams)
- confidenceNotes: string (brief rationale or assumptions)

Rules:
- 1g Protein = 4 kcal, 1g Carbs = 4 kcal, 1g Fat = 9 kcal. Total calories should be consistent within ±10%.
- Return every distinct food as its own item.
- Return ONLY valid JSON adhering to the specified schema.`;

  const prompt = `Parse this food log entry: "${trimmed}". The target meal category is ${mealType}.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemInstruction}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              items: {
                type: 'ARRAY',
                description: 'List of individual food components parsed from the text',
                items: {
                  type: 'OBJECT',
                  properties: {
                    name: { type: 'STRING' },
                    portionDescription: { type: 'STRING' },
                    calories: { type: 'NUMBER' },
                    protein: { type: 'NUMBER' },
                    carbs: { type: 'NUMBER' },
                    fat: { type: 'NUMBER' },
                    fiber: { type: 'NUMBER' },
                    confidenceNotes: { type: 'STRING' },
                  },
                  required: ['name', 'portionDescription', 'calories', 'protein', 'carbs', 'fat', 'fiber'],
                },
              },
              summaryNote: { type: 'STRING' },
            },
            required: ['items'],
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Gemini API error (${response.status}):`, errorText);
      return {
        success: true,
        items: fallbackEstimate(trimmed),
        summaryNote: 'Fallback estimation used due to network or API limit.',
        fallbackMode: true,
      };
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      throw new Error('Empty response from AI parser');
    }

    const parsed = JSON.parse(rawContent);
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    if (items.length === 0) {
      return {
        success: true,
        items: fallbackEstimate(trimmed),
        summaryNote: 'No distinct items found; used heuristic fallback.',
        fallbackMode: true,
      };
    }

    return {
      success: true,
      items: items.map((it: any) => ({
        name: String(it.name || 'Food Item'),
        portionDescription: String(it.portionDescription || '1 serving'),
        calories: Math.max(0, Math.round(Number(it.calories) || 0)),
        protein: Math.max(0, Math.round((Number(it.protein) || 0) * 10) / 10),
        carbs: Math.max(0, Math.round((Number(it.carbs) || 0) * 10) / 10),
        fat: Math.max(0, Math.round((Number(it.fat) || 0) * 10) / 10),
        fiber: Math.max(0, Math.round((Number(it.fiber) || 0) * 10) / 10),
        confidenceNotes: it.confidenceNotes ? String(it.confidenceNotes) : undefined,
      })),
      summaryNote: parsed.summaryNote,
      fallbackMode: false,
    };
  } catch (err: any) {
    console.warn('Gemini parser call failed, falling back to local heuristic:', err);
    return {
      success: true,
      items: fallbackEstimate(trimmed),
      summaryNote: 'Offline heuristic estimator used.',
      fallbackMode: true,
    };
  }
}
