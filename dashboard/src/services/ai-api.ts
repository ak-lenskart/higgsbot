import type { AnalysisResult, Character, Scene } from '../types/models';
import { ANALYSIS_SYSTEM_PROMPT } from '../data/prompt-templates';

export type AIProvider = 'claude' | 'gemini' | 'groq';

// ─── Claude ────────────────────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userText: string,
  imageUrl?: string,
  maxTokens = 1024
): Promise<string> {
  const contentParts: unknown[] = [];
  if (imageUrl) {
    contentParts.push({ type: 'image', source: { type: 'url', url: imageUrl } });
  }
  contentParts.push({ type: 'text', text: userText });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentParts }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content
    .filter((c: { type: string }) => c.type === 'text')
    .map((c: { text: string }) => c.text)
    .join('');
}

// ─── Gemini ────────────────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userText: string,
  imageUrl?: string,
  maxTokens = 1024
): Promise<string> {
  const parts: unknown[] = [];
  if (imageUrl) {
    // Fetch image and convert to base64 for Gemini
    try {
      const imgRes = await fetch(imageUrl);
      const blob = await imgRes.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      parts.push({ inline_data: { mime_type: blob.type || 'image/jpeg', data: base64 } });
    } catch {
      // If image fetch fails, proceed without image
    }
  }
  parts.push({ text: userText });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Groq ──────────────────────────────────────────────────────────────────

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userText: string,
  imageUrl?: string,
  maxTokens = 1024
): Promise<string> {
  const userContent: unknown[] = [];
  if (imageUrl) {
    userContent.push({ type: 'image_url', image_url: { url: imageUrl } });
  }
  userContent.push({ type: 'text', text: userText });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: imageUrl ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: imageUrl ? userContent : userText },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Unified caller ────────────────────────────────────────────────────────

async function callAI(
  provider: AIProvider,
  apiKey: string,
  systemPrompt: string,
  userText: string,
  imageUrl?: string,
  maxTokens = 1024
): Promise<string> {
  switch (provider) {
    case 'claude':  return callClaude(apiKey, systemPrompt, userText, imageUrl, maxTokens);
    case 'gemini':  return callGemini(apiKey, systemPrompt, userText, imageUrl, maxTokens);
    case 'groq':    return callGroq(apiKey, systemPrompt, userText, imageUrl, maxTokens);
  }
}

function extractJSON(text: string): string {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  }
  return t;
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function analyzeProduct(
  provider: AIProvider,
  apiKey: string,
  imageUrl: string,
  characters: Character[],
  scenes: Scene[]
): Promise<AnalysisResult> {
  const charSummary = characters.map((c) => ({
    id: c.id, name: c.name, gender: c.gender, style: c.style,
    ageRange: c.ageRange, brandAffinity: c.brandAffinity,
  }));

  const sceneSummary = scenes.map((s) => ({
    id: s.id, name: s.name, category: s.category,
  }));

  const userText = `Analyze this eyewear product image. Respond with JSON only:

{
  "brand": "vincent_chase" | "hustlr" | "lk_air" | "john_jacobs" | "unknown",
  "productType": "e.g. aviator sunglasses",
  "frameColor": "e.g. gold, black, tortoiseshell",
  "frameStyle": "e.g. round, rectangular, cat-eye, aviator",
  "targetDemographic": "e.g. young urban male",
  "suggestedCharacterIds": ["pick 2-3 character IDs from list below"],
  "suggestedSceneIds": ["pick 3-5 scene IDs from list below"],
  "suggestedClothingColor": "color that contrasts with frame color",
  "reasoning": "brief explanation"
}

Available characters:
${JSON.stringify(charSummary)}

Available scenes:
${JSON.stringify(sceneSummary)}`;

  const text = await callAI(provider, apiKey, ANALYSIS_SYSTEM_PROMPT, userText, imageUrl, 1024);
  const parsed = JSON.parse(extractJSON(text));
  return { ...parsed, tokensUsed: { input: 0, output: 0 } };
}

export async function generatePrompts(
  provider: AIProvider,
  apiKey: string,
  productDescription: string,
  frameColor: string,
  character: Character,
  scene: Scene,
  clothingColor: string
): Promise<string> {
  const userText = `Write a Higgsfield Soul prompt for this combination:

Product: ${productDescription}, ${frameColor} frame
Character: ${character.name}, ${character.gender}, ${character.ageRange}, ${character.style} style, ${character.skinTone} skin
Scene: ${scene.name} — ${scene.promptFragment}
Clothing color: ${clothingColor}

MANDATORY RULES:
- NO eyewear on face, head, or forehead — ever
- Eyes wide open, looking directly into camera
- Wide-angle selfie style — arm extended, slight fisheye, face upper frame
- Solid plain ${clothingColor} clothing — no patterns
- Shot on smartphone, ultra-sharp, authentic UGC feel

Write ONLY the prompt (2-3 sentences). No explanations.`;

  return callAI(
    provider, apiKey,
    'You write concise, vivid Higgsfield Soul prompts. Output ONLY the prompt text.',
    userText, undefined, 256
  );
}
