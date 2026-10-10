// POST /api/structure: sends the report body (no patient name, age or ID) to
// Claude, which moves free dictation into the right organ lines and writes the
// impression. GET reports whether a key is configured. The browser checks the
// answer again with checkStructured() before the doctor sees it.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = () => process.env.STRUCTURE_MODEL || "claude-sonnet-5-5";
const MAX_LINES = 80;
const MAX_CHARS = 12000;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;
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

export const SYSTEM = `You help radiologists in India finish ultrasound (USG) reports. The doctor has dictated findings freely, and you place each finding in the right line of the report and write the impression. A wrong word on a medical report can harm a patient, so you follow these rules exactly.

The report comes as numbered lines. Each line has an origin:
- template: the clinic's pre-filled normal text for that organ.
- edited: the doctor already changed this line. Keep it unless the dictation adds to it.
- dictation: free speech from the doctor. Move its content into the right lines. These lines are removed from the final report once placed.
- fixed: a standard sentence of the clinic, such as "Kindly correlate clinically." Keep it exactly.

Rules:
1. Never add a finding, measurement, number, side (right or left), grade or diagnosis that the doctor did not dictate and that is not already in the report.
2. Do not change numbers. Do not turn words into digits or digits into words. Keep units as dictated (cm, mm, ml, cc).
3. When the dictation is about an organ, write that organ's line from the dictation. If the dictation contradicts the template text (the template says "No calculus" but the doctor dictated a calculus), the dictation wins: remove the contradicted sentence. Keep template sentences that the dictation does not contradict.
4. Fill a "__" blank only with a number the doctor dictated for that exact organ. Otherwise leave "__" as it is.
5. Lines for organs the doctor did not mention stay exactly as they are, character for character.
6. IMPRESSION: if the doctor dictated an impression, use theirs. Otherwise summarise the abnormal dictated findings in standard radiology phrasing, most significant first, for example "Grade I fatty liver with mild hepatomegaly." If nothing abnormal was dictated, keep the existing impression.
7. Write in report style: short clinical sentences, Roman numerals for grades, Indian and British spelling (calibre, oedema, haemorrhage).
8. Dictation that does not belong to any line in the report and is not a general finding goes in "unplaced". Never drop dictated content.
9. A general finding with no organ line (for example free fluid or lymph nodes) becomes an unlabelled line, placed before IMPRESSION.
10. In "warnings", list what the doctor must check: contradictions, unclear side, a measurement you could not place, dictation that seems cut off. Keep each warning to one short sentence. Leave it empty when there is nothing to check.

Return every non-dictation line in its original order with its label exactly as given, plus any new unlabelled lines.`;

export const TOOL = {
  name: "write_structured_report",
  description: "Return the finished report lines.",
  input_schema: {
    type: "object",
    properties: {
      lines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: ["string", "null"], description: "The organ label exactly as given, or null for an unlabelled line." },
            text: { type: "string" },
          },
          required: ["label", "text"],
        },
      },
      unplaced: { type: "array", items: { type: "string" } },
      warnings: { type: "array", items: { type: "string" } },
    },
    required: ["lines", "unplaced", "warnings"],
  },
} as const;

interface InLine {
  label: string | null;
  text: string;
  origin: string;
}

export function userMessage(title: string, lines: InLine[]): string {
  const body = lines.map((l, i) => `${i + 1}. [${l.origin}] ${l.label ? `${l.label}: ` : ""}${l.text}`).join("\n");
  return `Report: ${title}\n\n${body}`;
}

function parse(body: unknown): { title: string; lines: InLine[] } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { title?: unknown; lines?: unknown };
  if (!Array.isArray(b.lines) || b.lines.length === 0 || b.lines.length > MAX_LINES) return null;
  const origins = new Set(["template", "edited", "dictation", "fixed"]);
  const lines: InLine[] = [];
  for (const l of b.lines) {
    if (!l || typeof l !== "object") return null;
    const { label, text, origin } = l as Record<string, unknown>;
    if (typeof text !== "string" || typeof origin !== "string" || !origins.has(origin)) return null;
    if (label !== null && typeof label !== "string") return null;
    lines.push({ label: label ? label.slice(0, 60) : null, text: text.slice(0, 2000), origin });
  }
  const title = typeof b.title === "string" ? b.title.slice(0, 120) : "Ultrasound report";
  if (lines.reduce((n, l) => n + l.text.length, 0) > MAX_CHARS) return null;
  return { title, lines };
}

export async function GET(): Promise<Response> {
  return json({ configured: !!process.env.ANTHROPIC_API_KEY });
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "AI structuring is not set up on this server" }, 503);

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (limited(ip)) return json({ error: "Too many requests. Try again in a few minutes." }, 429, { "retry-after": "60" });

  let input: ReturnType<typeof parse>;
  try {
    input = parse(await req.json());
  } catch {
    input = null;
  }
  if (!input) return json({ error: "The report could not be read" }, 400);

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL(),
      max_tokens: 4096,
      temperature: 0,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: userMessage(input.title, input.lines) }],
    }),
  });

  if (!res.ok) {
    const status = res.status === 429 || res.status === 529 ? 503 : 502;
    return json({ error: "The AI service is busy. Try again in a moment." }, status);
  }
  const data = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[] };
  const call = data.content?.find((c) => c.type === "tool_use" && c.name === TOOL.name);
  if (!call?.input) return json({ error: "The AI did not return a report" }, 502);
  return json({ model: MODEL(), result: call.input });
}
