// Supabase Edge Function — generate-report
// Proxies AI fitness-report generation to Anthropic so the API key never reaches the client.
//
// Required secrets:
//   supabase secrets set ANTHROPIC_KEY=sk-ant-...
//
// Rate limit: DAILY_LIMIT calls per user per calendar day (UTC).
//
// Deploy:
//   supabase functions deploy generate-report --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 5;
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
    .eq('fn_name', 'generate-report')
    .eq('call_date', today)
    .maybeSingle();

  const currentCount = limitRow?.call_count ?? 0;
  if (currentCount >= DAILY_LIMIT) {
    return json({ error: `Daily limit of ${DAILY_LIMIT} reports reached. Try again tomorrow.` }, 429);
  }

  await admin.from('api_call_log').upsert(
    { user_id: user.id, fn_name: 'generate-report', call_date: today, call_count: currentCount + 1 },
    { onConflict: 'user_id,fn_name,call_date' },
  );

  // ── Parse request ─────────────────────────────────────────────────────────
  const { prompt } = await req.json().catch(() => ({}));
  if (!prompt || typeof prompt !== 'string') return json({ error: 'Missing prompt in request body' }, 400);

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
      max_tokens: 1200,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}));
    return json({ error: err.error?.message ?? `Anthropic error ${anthropicRes.status}` }, 502);
  }

  const data = await anthropicRes.json();
  const text = (data.content?.[0]?.text ?? '').trim();
  return json({ text });
});
