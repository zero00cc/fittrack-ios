// Supabase Edge Function — analyze-food
// Proxies food-photo analysis to Anthropic so the API key never reaches the client.
//
// Required secrets (set once via Supabase Dashboard → Edge Functions → Secrets, or CLI):
//   supabase secrets set ANTHROPIC_KEY=sk-ant-...
//
// Rate limit: DAILY_LIMIT calls per user per calendar day (UTC).
//
// Deploy:
//   supabase functions deploy analyze-food --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 20;
const MODEL       = 'claude-haiku-4-5-20251001';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  // ── Authenticate ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const today = new Date().toISOString().slice(0, 10);

  const { data: limitRow } = await admin
    .from('api_call_log')
    .select('call_count')
    .eq('user_id', user.id)
    .eq('fn_name', 'analyze-food')
    .eq('call_date', today)
    .maybeSingle();

  const currentCount = limitRow?.call_count ?? 0;
  if (currentCount >= DAILY_LIMIT) {
    return json({ error: `Daily limit of ${DAILY_LIMIT} food analyses reached. Try again tomorrow.` }, 429);
  }

  // Increment counter
  await admin.from('api_call_log').upsert(
    { user_id: user.id, fn_name: 'analyze-food', call_date: today, call_count: currentCount + 1 },
    { onConflict: 'user_id,fn_name,call_date' },
  );

  // ── Parse request ─────────────────────────────────────────────────────────
  const { imageBase64, mimeType = 'image/jpeg' } = await req.json().catch(() => ({}));
  if (!imageBase64) return json({ error: 'Missing imageBase64 in request body' }, 400);

  // ── Call Anthropic ────────────────────────────────────────────────────────
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         Deno.env.get('ANTHROPIC_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 1024,
      messages: [{
        role:    'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
          {
            type: 'text',
            text: 'Analyze this food image. Return ONLY a valid JSON object — no markdown, no code fences, no extra text. Shape: {"description":"brief visual description","items":[{"name":"food name","calories":number,"protein":number,"carbs":number,"fat":number}]}. Estimate realistic portion sizes from what is visible. All macro values are in grams, calories in kcal.',
          },
        ],
      }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}));
    return json({ error: err.error?.message ?? `Anthropic error ${anthropicRes.status}` }, 502);
  }

  const data  = await anthropicRes.json();
  const text: string = data.content?.[0]?.text ?? '';
  const clean = text.replace(/^```(?:json)?\n?|\n?```$/g, '').trim();

  try {
    return json(JSON.parse(clean));
  } catch {
    return json({ error: 'Failed to parse AI response' }, 502);
  }
});
