import * as FileSystem from 'expo-file-system/legacy';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '';
const MODEL   = 'claude-haiku-4-5-20251001';

export interface AnalyzedItem {
  name:     string;
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
}

export interface AnalysisResult {
  description: string;
  items:       AnalyzedItem[];
}

export async function analyzeFood(imageUri: string, mimeType = 'image/jpeg'): Promise<AnalysisResult> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 1024,
      messages: [{
        role:    'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          {
            type: 'text',
            text: 'Analyze this food image. Return ONLY a valid JSON object — no markdown, no code fences, no extra text. Shape: {"description":"brief visual description","items":[{"name":"food name","calories":number,"protein":number,"carbs":number,"fat":number}]}. Estimate realistic portion sizes from what is visible. All macro values are in grams, calories in kcal.',
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message ?? `Server error ${res.status}`);
  }

  const data  = await res.json();
  const text: string = data.content?.[0]?.text ?? '';
  const clean = text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();
  return JSON.parse(clean) as AnalysisResult;
}
