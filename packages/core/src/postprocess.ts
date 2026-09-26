// Turns raw speech-to-text output into report-ready text:
// spoken commands ("new line", "full stop"), macros ("insert normal liver"),
// measurement formatting ("4.5 by 3.2 centimetres" -> "4.5 x 3.2 cm") and
// capitalisation/spacing relative to the text already before the cursor.

export interface Macro {
  /** What the doctor says after "insert" / "macro", e.g. "normal liver". */
  name: string;
  /** Text inserted. Use "\n" for a line break. */
  text: string;
}

export interface ProcessOptions {
  macros?: Macro[];
}

// Whisper produces these on silence/noise. Drop a segment that is only this.
const HALLUCINATIONS = [
  "thank you",
  "thanks for watching",
  "thank you for watching",
  "thank you very much",
  "you",
  "bye",
  "okay",
  "subtitles by the amara.org community",
  "please subscribe",
];

const MACRO_OPEN = "\u0001";
const MACRO_CLOSE = "\u0002";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Words before "colon" that mean the anatomical colon, not the punctuation mark.
const COLON_ANATOMY = /\b(sigmoid|transverse|ascending|descending|the|of|right|left|entire|proximal|distal)\s*$/i;

interface Command {
  re: RegExp;
  out: string;
}

// Order matters: longer phrases first.
const COMMANDS: Command[] = [
  { re: /\b(new|next) paragraph\b[.,]?/gi, out: "\n\n" },
  { re: /\b(new|next) line\b[.,]?/gi, out: "\n" },
  { re: /\bfull[\s-]?stop\b[.,]?/gi, out: "." },
  { re: /\bquestion mark\b[.,]?/gi, out: "?" },
  { re: /\bsemi[\s-]?colon\b[.,]?/gi, out: ";" },
  { re: /\bcomma\b[.,]?/gi, out: "," },
  { re: /\bopen (bracket|parenthesis|parentheses)\b[.,]?/gi, out: " (" },
  { re: /\bclose (bracket|parenthesis|parentheses)\b[.,]?/gi, out: ")" },
  { re: /\b(forward )?slash\b[.,]?/gi, out: "/" },
  { re: /\bhyphen\b[.,]?/gi, out: "-" },
];

const UNITS: [RegExp, string][] = [
  [/cubic (centimet(?:er|re)s?)/gi, "cc"],
  [/centimet(?:er|re)s? per second/gi, "cm/s"],
  [/beats? per minute/gi, "bpm"],
  [/centimet(?:er|re)s?|cms\b/gi, "cm"],
  [/millimet(?:er|re)s?/gi, "mm"],
  [/millilit(?:er|re)s?|mls\b/gi, "ml"],
  [/grams?\b|gms\b/gi, "g"],
];

export function isHallucination(raw: string): boolean {
  const t = raw.toLowerCase().replace(/[^a-z0-9. ]/g, "").replace(/\.+$/, "").trim();
  return t === "" || HALLUCINATIONS.includes(t);
}

/** Converts a raw transcript segment into text to insert (may contain "\n"). */
export function processTranscript(raw: string, opts: ProcessOptions = {}): string {
  if (isHallucination(raw)) return "";
  let t = " " + raw.trim() + " ";

  // Macros: "insert normal liver" / "macro normal liver".
  const macros = [...(opts.macros ?? [])].sort((a, b) => b.name.length - a.name.length);
  const expansions: string[] = [];
  for (const m of macros) {
    const words = m.name.trim().split(/\s+/).map(escapeRegex).join("[\\s,.-]+");
    if (!words) continue;
    const re = new RegExp(`\\b(?:insert|macro)[\\s,]+${words}\\b[.,!]?`, "gi");
    t = t.replace(re, () => {
      expansions.push(m.text);
      return ` ${MACRO_OPEN}${expansions.length - 1}${MACRO_CLOSE} `;
    });
  }

  // "colon" is punctuation unless it follows an anatomical qualifier.
  t = t.replace(/\bcolon\b[.,]?/gi, (match, offset: number, whole: string) =>
    COLON_ANATOMY.test(whole.slice(0, offset)) ? match : ":",
  );
  for (const c of COMMANDS) t = t.replace(c.re, c.out);

  // "4 point 5" -> "4.5"
  t = t.replace(/(\d)\s+point\s+(\d)/gi, "$1.$2");
  // Units only after a number (so "grams" in prose is untouched).
  for (const [re, unit] of UNITS) {
    t = t.replace(new RegExp(`(\\d)\\s*(?:${re.source})`, re.flags), `$1 ${unit}`);
  }
  // Dimensions: "4.5 by 3.2" / "4.5 into 3.2" / "4.5 X 3.2" -> "4.5 x 3.2"
  t = t.replace(/(\d)\s*(?:by|into|x|×|times)\s*(?=\d)/gi, "$1 x ");

  // Put the macro expansions back (after formatting so they're left verbatim).
  t = t.replace(new RegExp(`${MACRO_OPEN}(\\d+)${MACRO_CLOSE}`, "g"), (_, i) => expansions[Number(i)]);

  return tidy(t);
}

/** Fixes spacing around punctuation/newlines and sentence capitalisation. */
export function tidy(s: string): string {
  let t = s;
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/ *\n */g, "\n");
  t = t.replace(/\s+([.,;:?!)%])/g, "$1");
  t = t.replace(/\(\s+/g, "(");
  // Duplicate punctuation from Whisper + a spoken "full stop": "normal.." / "normal,."
  t = t.replace(/[.,;:]+([.?!])/g, "$1");
  t = t.replace(/([.?!]),/g, "$1");
  t = t.replace(/,{2,}/g, ",");
  // Space after punctuation when followed by a letter (not decimals like 4.5).
  t = t.replace(/([,;:?!])(?=[A-Za-z(])/g, "$1 ");
  t = t.replace(/([a-z0-9)])\.(?=[A-Z(])/g, "$1. ");
  // Punctuation directly after a newline is left over from a command: drop it.
  t = t.replace(/\n[.,;]+/g, "\n");
  // Capitalise the start of sentences and lines.
  t = t.replace(/(^\s*|[.?!]\s+|\n\s*)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
  return t.replace(/^ +| +$/g, "").replace(/^ +/gm, "");
}

/**
 * Adjusts a processed segment so it joins cleanly between `before` and `after`
 * (the text around the cursor): adds spaces where needed, lowercases the first
 * word when continuing a sentence, and drops Whisper's trailing full stop when
 * the text is dropped into the middle of a sentence (e.g. filling in "__ mm").
 */
export function joinWithContext(text: string, before: string, after = ""): string {
  if (!text) return text;
  const prev = before.replace(/[ \t]+$/, "");
  const hadTrailingSpace = prev.length !== before.length;
  const last = prev.slice(-1);
  let out = text;
  // A segment that begins with a spoken "full stop"/"comma" when the previous one
  // already ended in punctuation: "16.2 cm." + ". The gall bladder" -> no "..".
  if (/[.,;:?!]$/.test(prev) && /^[.,;:]/.test(out)) out = out.replace(/^[.,;:]+\s*/, "");
  if (!out) return out;
  const startsNewline = out.startsWith("\n");
  const startsPunct = /^[.,;:?!)]/.test(out);
  const sentenceStart = prev === "" || /[.?!:\n]$/.test(prev);
  if (!sentenceStart && !startsNewline) {
    // Continuing a sentence: "the liver is" + "Normal in size." -> "normal in size."
    out = out.replace(/^([A-Z])([a-z])/, (_, a, b) => a.toLowerCase() + b);
  } else if (!startsNewline) {
    out = out.replace(/^([a-z])/, (c) => c.toUpperCase());
  }
  if (prev !== "" && last !== "\n" && !startsNewline && !startsPunct && !hadTrailingSpace && !/[(\/-]$/.test(prev)) {
    out = " " + out;
  }

  const next = after.replace(/^[ \t]+/, "");
  if (next && !out.endsWith("\n")) {
    // Mid-sentence insert: "(" + "12." + " mm)" -> "(12 mm)"
    if (/^[a-z0-9(),;:.]/.test(next)) out = out.replace(/\.$/, "");
    if (after === next && /^[A-Za-z0-9(]/.test(next)) out += " ";
  }
  return out;
}
