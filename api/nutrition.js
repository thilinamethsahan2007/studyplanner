export default async function handler(req, res) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { text, mealType = 'meal' } = body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Meal description text is required' });
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      '';

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in server environment variables.',
        needsKey: true,
      });
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

    const prompt = `Parse this food log entry: "${text.trim()}". The target meal category is ${mealType}.`;

    const requestPayload = {
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
    };

    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError = null;
    let data = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        if (response.ok) {
          data = await response.json();
          break;
        } else {
          lastError = await response.text();
        }
      } catch (err) {
        lastError = err?.message || 'Network fetch error';
      }
    }

    if (!data) {
      return res.status(502).json({ error: lastError || 'Failed to call Gemini model.' });
    }

    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      return res.status(500).json({ error: 'Empty response from Gemini' });
    }

    const parsed = JSON.parse(rawContent);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
