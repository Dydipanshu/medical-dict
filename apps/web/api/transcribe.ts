// POST /api/transcribe — forwards audio to Groq's free Whisper API so the key
// never reaches the browser. GET reports whether a key is configured.
// Written against the Web Fetch API so it runs on Vercel, in the Vite dev server
// and in server.ts unchanged.

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_FIELDS = ["model", "language", "prompt", "response_format", "temperature"];

// Simple per-IP limit so a public demo can't burn through the shared free quota.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 120;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

export async function GET(): Promise<Response> {
  return json({ configured: !!process.env.GROQ_API_KEY });
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return json({ error: "Server has no GROQ_API_KEY configured" }, 503);

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (limited(ip)) return json({ error: "Too many requests, slow down a little" }, 429, { "retry-after": "30" });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) return json({ error: "Audio too large" }, 413);

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return json({ error: "Expected multipart form data" }, 400);
  }
  const file = incoming.get("file");
  if (!(file instanceof Blob) || file.size === 0) return json({ error: "Missing audio file" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Audio too large" }, 413);

  const out = new FormData();
  out.append("file", file, "audio.wav");
  for (const f of ALLOWED_FIELDS) {
    const v = incoming.get(f);
    if (typeof v === "string") out.append(f, v.slice(0, 2000));
  }
  if (!out.has("model")) out.append("model", "whisper-large-v3-turbo");

  const res = await fetch(GROQ_URL, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: out });
  const headers: Record<string, string> = { "content-type": "application/json" };
  const retry = res.headers.get("retry-after");
  if (retry) headers["retry-after"] = retry;
  return new Response(await res.text(), { status: res.status, headers });
}
