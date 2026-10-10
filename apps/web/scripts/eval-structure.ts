// Runs realistic dictations through the real model and checks the result.
// Usage: ANTHROPIC_API_KEY=... node --experimental-strip-types scripts/eval-structure.ts
// Each case says which lines must change and what they must contain, and which
// lines must stay exactly as they were. checkStructured() then reports anything
// the model invented or dropped.
import { checkStructured, type ModelReport, type ReportLine } from "../../../packages/core/src/structure.ts";
import { SYSTEM, TOOL, userMessage } from "../api/structure.ts";

const T = {
  LIVER: "Normal in size (__ cm) and echotexture. No focal lesion seen. Intrahepatic biliary radicles are not dilated.",
  "GALL BLADDER": "Well distended. Wall thickness is normal. No calculus or sludge seen.",
  SPLEEN: "Normal in size (__ cm) and echotexture. No focal lesion seen.",
  "RIGHT KIDNEY": "Measures __ x __ cm. Normal in size, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis.",
  "LEFT KIDNEY": "Measures __ x __ cm. Normal in size, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis.",
  "URINARY BLADDER": "Well distended. Wall thickness is normal. No calculus or mass seen.",
  IMPRESSION: "No significant abnormality detected.",
};

const abdomen = (dictation: string): ReportLine[] => [
  ...Object.entries(T).map(([label, text]) => ({ label, text, origin: "template" as const })),
  { label: null, text: "Kindly correlate clinically.", origin: "fixed" },
  { label: null, text: dictation, origin: "dictation" },
];

interface Case {
  name: string;
  lines: ReportLine[];
  contains: Record<string, string[]>;
  unchanged: string[];
}

const CASES: Case[] = [
  {
    name: "fatty liver with measurement",
    lines: abdomen("Liver is mildly enlarged measuring 16.2 cm with increased echogenicity suggestive of grade I fatty infiltration."),
    contains: { LIVER: ["16.2"], IMPRESSION: ["fatty"] },
    unchanged: ["GALL BLADDER", "SPLEEN", "RIGHT KIDNEY", "LEFT KIDNEY", "URINARY BLADDER"],
  },
  {
    name: "renal calculus contradicts template",
    lines: abdomen("Right kidney measures 10.4 x 4.6 cm. There is a 6 mm calculus in the lower pole. No hydronephrosis."),
    contains: { "RIGHT KIDNEY": ["10.4", "4.6", "6 mm", "calculus"], IMPRESSION: ["calculus"] },
    unchanged: ["LIVER", "LEFT KIDNEY", "GALL BLADDER"],
  },
  {
    name: "gallstones and sludge",
    lines: abdomen("Gall bladder shows multiple calculi, largest 8 mm, with sludge. Wall thickness normal."),
    contains: { "GALL BLADDER": ["8 mm", "calculi"], IMPRESSION: ["cholelithiasis|calculi"] },
    unchanged: ["LIVER", "SPLEEN", "RIGHT KIDNEY"],
  },
  {
    name: "two organs and spoken impression",
    lines: abdomen("Spleen is enlarged 14.5 cm. Left kidney 9.8 by 4.2 cm normal. Impression splenomegaly."),
    contains: { SPLEEN: ["14.5"], "LEFT KIDNEY": ["9.8", "4.2"], IMPRESSION: ["splenomegaly"] },
    unchanged: ["LIVER", "RIGHT KIDNEY", "GALL BLADDER"],
  },
  {
    name: "normal study keeps the impression",
    lines: abdomen("All organs normal. Bladder well distended."),
    contains: { IMPRESSION: ["no significant abnormality"] },
    unchanged: ["LIVER", "GALL BLADDER", "SPLEEN", "RIGHT KIDNEY", "LEFT KIDNEY"],
  },
  {
    name: "general finding with no organ line",
    lines: abdomen("Mild free fluid in the pelvis. Liver normal size 13 cm."),
    contains: { LIVER: ["13"] },
    unchanged: ["GALL BLADDER", "SPLEEN", "RIGHT KIDNEY"],
  },
];

async function ask(lines: ReportLine[]): Promise<ModelReport> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.STRUCTURE_MODEL || "claude-sonnet-5-5",
      max_tokens: 4096,
      temperature: 0,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: userMessage("USG WHOLE ABDOMEN", lines) }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; input?: ModelReport }[] };
  const call = data.content.find((c) => c.type === "tool_use");
  if (!call?.input) throw new Error("no tool call");
  return call.input;
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY first.");
  process.exit(1);
}

let passed = 0;
for (const c of CASES) {
  const out = checkStructured(c.lines, await ask(c.lines));
  const problems: string[] = [];
  for (const [label, needles] of Object.entries(c.contains)) {
    const text = (out.lines.find((l) => l.label === label)?.text ?? "").toLowerCase();
    for (const n of needles) if (!n.split("|").some((alt) => text.includes(alt.toLowerCase()))) problems.push(`${label} is missing "${n}"`);
  }
  for (const label of c.unchanged) if (out.lines.find((l) => l.label === label)?.changed) problems.push(`${label} changed but nothing was dictated for it`);
  for (const l of out.lines) if (l.reverted) problems.push(`${l.label} had an invented number`);
  for (const w of out.warnings) if (w.includes("not in the result")) problems.push(w);
  if (problems.length === 0) passed++;
  console.log(`${problems.length ? "FAIL" : "pass"}  ${c.name}`);
  for (const p of problems) console.log(`      ${p}`);
}
console.log(`\n${passed}/${CASES.length} cases passed`);
