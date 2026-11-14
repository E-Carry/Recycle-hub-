// Rio AI's LLM replies via OpenRouter. The key stays server-side (.env);
// the browser only ever talks to POST /api/rio/chat.
const SYSTEM = `You are Rio AI, the assistant on the Recycle Hub website (India).
Recycle Hub buys scrap (plastic, paper, metal, e-waste) from households and shops ("sourcing" users),
picks it up on a booked slot, pays the seller, and sells processed raw material to industrial buyers.
Answer only questions about Recycle Hub, recycling, pickups, payments, rates, accounts and orders.
For anything else, politely say you can only help with Recycle Hub.
Prefer the reference facts below when they apply. Never invent prices, dates, phone numbers or policies;
if you don't know, say so and point to recycle.hub.pvt.ltd@gmail.com.
Reply in under 120 words, plain text. You may use **bold** for key terms; no other markdown.`;

const str = (s, max) => typeof s === 'string' && s.trim() && s.length <= max;

function messages({ message, history, facts }) {
  const ref = (Array.isArray(facts) ? facts : [])
    .filter((f) => f && str(f.q, 500) && str(f.a, 3000)).slice(0, 3)
    .map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n');
  const past = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && str(m.content, 3000))
    .slice(-8).map((m) => ({ role: m.role, content: m.content }));
  while (past[0] && past[0].role !== 'user') past.shift(); // some chat templates reject assistant-first
  return [
    { role: 'system', content: SYSTEM + (ref ? `\n\nReference facts:\n${ref}` : '') },
    ...past,
    { role: 'user', content: message },
  ];
}

async function chat(input, { env = process.env, fetch = globalThis.fetch } = {}) {
  const key = env.OPENROUTER_API_KEY;
  if (!key) return { status: 503, body: { error: 'Rio LLM not configured' } };
  if (!input || !str(input.message, 500)) return { status: 400, body: { error: 'message must be 1-500 chars' } };

  const base = env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'Recycle Hub',
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
        messages: messages(input),
        max_tokens: 400,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(25000),
    });
    const data = await res.json().catch(() => ({}));
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!res.ok || !reply) {
      console.error('[rio-llm] upstream', res.status, data?.error?.message || 'empty reply');
      return { status: 502, body: { error: 'LLM unavailable' } };
    }
    return { status: 200, body: { reply } };
  } catch (err) {
    console.error('[rio-llm]', err.message);
    return { status: 502, body: { error: 'LLM unavailable' } };
  }
}

module.exports = { chat };
