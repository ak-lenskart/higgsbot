import type { AnalysisResult, Character, Scene } from '../types/models';
import { ANALYSIS_SYSTEM_PROMPT } from '../data/prompt-templates';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'url'; url: string } }>;
}

async function callClaude(
  apiKey: string,
  system: string,
  messages: ClaudeMessage[],
  maxTokens = 1024
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content
    .filter((c: { type: string }) => c.type === 'text')
    .map((c: { text: string }) => c.text)
    .join('');

  return {
    text,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

export async function analyzeProduct(
  apiKey: string,
  imageUrl: string,
  characters: Character[],
  scenes: Scene[]
): Promise<AnalysisResult> {
  const charSummary = characters.map((c) => ({
    id: c.id,
    name: c.name,
    gender: c.gender,
    style: c.style,
    ageRange: c.ageRange,
    brandAffinity: c.brandAffinity,
  }));

  const sceneSummary = scenes.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
  }));

  const prompt = `Analyze this eyewear product image. Respond with JSON only:

{
  "brand": "vincent_chase" | "hustlr" | "lk_air" | "john_jacobs" | "unknown",
  "productType": "e.g. aviator sunglasses",
  "frameColor": "e.g. gold, black, tortoiseshell",
  "frameStyle": "e.g. round, rectangular, cat-eye, aviator",
  "targetDemographic": "e.g. young urban male",
  "suggestedCharacterIds": ["pick 2-3 character IDs"],
  "suggestedSceneIds": ["pick 3-5 scene IDs"],
  "suggestedClothingColor": "color that contrasts with frame color",
  "reasoning": "brief explanation of choices"
}

Available characters:
${JSON.stringify(charSummary)}

Available scenes:
${JSON.stringify(sceneSummary)}`;

  const result = await callClaude(apiKey, ANALYSIS_SYSTEM_PROMPT, [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: prompt },
      ],
    },
  ]);

  // Parse JSON from response (handle potential markdown wrapping)
  let jsonText = result.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonText);

  return {
    ...parsed,
    tokensUsed: { input: result.inputTokens, output: result.outputTokens },
  };
}

export async function generatePrompts(
  apiKey: string,
  productDescription: string,
  frameColor: string,
  character: Character,
  scene: Scene,
  clothingColor: string
): Promise<string> {
  const prompt = `Write a Higgsfield Soul prompt for this combination:

Product: ${productDescription}, ${frameColor} frame
Character: ${character.name}, ${character.gender}, ${character.ageRange}, ${character.style} style, ${character.skinTone} skin
Scene: ${scene.name} — ${scene.promptFragment}
Clothing color: ${clothingColor} (must contrast with ${frameColor} frame)

MANDATORY RULES:
- Fair / light / porcelain / ivory skin tone — always
- NO eyewear on face, head, or forehead — ever
- Eyes wide open, looking directly into camera
- Wide-angle selfie style — arm extended, slight fisheye, face upper frame, body and location below
- Solid plain ${clothingColor} clothing — no stripes, checks, patterns
- No large earrings, no layered necklaces, no bangles
- Shot on smartphone, ultra-sharp, authentic UGC feel

Write ONLY the prompt (2-3 sentences). No explanations.`;

  const result = await callClaude(
    apiKey,
    'You write concise, vivid Higgsfield Soul prompts. Output ONLY the prompt text.',
    [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    256
  );

  return result.text.trim();
}
