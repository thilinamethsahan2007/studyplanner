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
      process.env.GROQ_API_KEY ||
      process.env.VITE_GROQ_API_KEY ||
      '';

    if (!apiKey) {
      return res.status(500).json({
        error: 'GROQ_API_KEY is not configured in server environment variables.',
        needsKey: true,
      });
    }

    const systemPrompt = `You are an expert clinical dietitian and food scientist specializing in realistic dietary tracking and domestic home cooking.
Analyze the user's natural language meal description which can include food names, proportions, quantities, cooking styles, or weights.
Deconstruct it into individual ingredients/components with REALISTIC, ACCURATE, UN-EXAGGERATED portion estimates.

CRITICAL REALISTIC PORTION & WEIGHT CALIBRATION (DO NOT EXAGGERATE):
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
   - Always prefer realistic, moderate domestic home-cooking portions rather than oversized restaurant or bodybuilding bulk sizes.

For each item return:
- name: string (e.g. "Cooked Red Rice", "Chicken Curry Pieces", "Fish Curry Slice")
- portionDescription: string with realistic weight (e.g. "1.2 cups (~180g)", "3 curry pieces (~110g cooked)", "5 tbsp (~75g)")
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

    const userPrompt = `Parse this food log entry: "${text.trim()}". The target meal category is ${mealType}.`;

    const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
    let lastError = null;

    for (const model of models) {
      try {
        const requestPayload = {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        };

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          lastError = await response.text();
          continue;
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;
        if (!rawContent) continue;

        const parsed = JSON.parse(rawContent);
        return res.status(200).json(parsed);
      } catch (err) {
        lastError = err?.message || 'Error communicating with Groq';
      }
    }

    return res.status(502).json({ error: lastError || 'Failed to call Groq API.' });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}
