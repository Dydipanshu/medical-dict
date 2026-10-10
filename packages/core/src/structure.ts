// AI report structuring: the doctor dictates freely, a language model moves each
// finding into the right organ line and writes the impression. The model's output
// is never trusted as is. checkStructured() compares it with what was actually in
// the report and dictation, and undoes anything that could put a wrong fact on a
// medical report: invented numbers, lost labels, lost lines.

/** Where a line came from, so the model knows what it may rewrite. */
export type LineOrigin = "template" | "edited" | "dictation" | "fixed";

export interface ReportLine {
  label: string | null;
  text: string;
  origin: LineOrigin;
}

export interface StructuredLine {
  label: string | null;
  text: string;
}

/** What the model returns. */
export interface ModelReport {
  lines: StructuredLine[];
  unplaced: string[];
  warnings: string[];
}

export interface CheckedLine extends StructuredLine {
  changed: boolean;
  /** The model's text was rejected and the original line kept. */
  reverted?: boolean;
}

export interface CheckedReport {
  lines: CheckedLine[];
  /** Dictated text the model could not place. Kept so nothing is lost. */
  unplaced: string[];
  /** Things the doctor must look at before signing. */
  warnings: string[];
}

const NUM = /\d+(?:\.\d+)?/g;

/** Numbers in a piece of text, normalised so "16.20" and "16.2" match. */
export function numbersIn(text: string): string[] {
  return (text.match(NUM) ?? []).map((n) => String(Number(n)));
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Turns the model's answer into a report that is safe to show the doctor.
 * - Every labelled line of the original report comes back exactly once, in its
 *   original order. A missing one is restored; an unknown label is not trusted.
 * - A line that contains a number found nowhere in the report or the dictation
 *   is reverted to its original text.
 * - A number the doctor dictated that does not appear anywhere in the result
 *   raises a warning.
 * A blank report has no labelled lines, so there the model may create them.
 */
export function checkStructured(input: ReportLine[], out: ModelReport): CheckedReport {
  const warnings = [...out.warnings.map(norm).filter(Boolean)];
  const unplaced = out.unplaced.map(norm).filter(Boolean);

  const known = new Set<string>();
  for (const l of input) for (const n of numbersIn(l.text)) known.add(n);

  const original = new Map<string, ReportLine>();
  for (const l of input) if (l.label && !original.has(l.label)) original.set(l.label, l);

  const freeform = original.size === 0;
  const byLabel = new Map<string, StructuredLine>();
  const created: CheckedLine[] = [];
  const unlabelled: StructuredLine[] = [];
  for (const l of out.lines) {
    const text = norm(l.text);
    if (!l.label) {
      if (text) unlabelled.push({ label: null, text });
      continue;
    }
    const label = l.label.trim();
    if (freeform) {
      if (!text || created.some((x) => x.label === label)) continue;
      const invented = numbersIn(text).filter((n) => !known.has(n));
      if (invented.length) {
        unplaced.push(`${label}: ${text}`);
        warnings.push(`The AI wrote ${invented.join(", ")} in ${label}, which was not dictated. That line was not added.`);
      } else created.push({ label, text, changed: true });
      continue;
    }
    if (!original.has(label)) {
      if (text) unplaced.push(`${label}: ${text}`);
      warnings.push(`The AI added a "${label}" line that is not in this report. Its text is listed under unplaced findings.`);
      continue;
    }
    if (!byLabel.has(label)) byLabel.set(label, { label, text });
  }

  const fixedTexts = new Set(input.filter((l) => !l.label && l.origin === "fixed").map((l) => norm(l.text)));
  const keptUnlabelled = new Map<string, StructuredLine>();
  for (const l of unlabelled) keptUnlabelled.set(l.text, l);

  const lines: CheckedLine[] = [];
  for (const l of input) {
    if (l.label) {
      if (lines.some((x) => x.label === l.label)) continue;
      const got = byLabel.get(l.label);
      if (!got) {
        lines.push({ label: l.label, text: l.text, changed: false });
        warnings.push(`The AI left out the ${l.label} line. It is kept unchanged.`);
        continue;
      }
      const invented = numbersIn(got.text).filter((n) => !known.has(n));
      if (invented.length) {
        lines.push({ label: l.label, text: l.text, changed: false, reverted: true });
        warnings.push(`The AI wrote ${invented.join(", ")} in ${l.label}, which was not dictated. That line is kept as it was.`);
        continue;
      }
      lines.push({ label: l.label, text: got.text, changed: norm(got.text) !== norm(l.text) });
    } else if (l.origin === "fixed") {
      const t = norm(l.text);
      lines.push({ label: null, text: l.text, changed: false });
      keptUnlabelled.delete(t);
    }
  }

  lines.push(...created);

  for (const [text] of keptUnlabelled) {
    if (fixedTexts.has(text)) continue;
    const invented = numbersIn(text).filter((n) => !known.has(n));
    if (invented.length) {
      warnings.push(`The AI wrote a line with ${invented.join(", ")}, which was not dictated. It was removed.`);
      continue;
    }
    const impressionAt = lines.findIndex((x) => x.label === "IMPRESSION");
    const line = { label: null, text, changed: true };
    if (impressionAt >= 0) lines.splice(impressionAt, 0, line);
    else lines.push(line);
  }

  const dictated = new Set<string>();
  for (const l of input) if (l.origin === "dictation" || l.origin === "edited") for (const n of numbersIn(l.text)) dictated.add(n);
  const present = new Set<string>();
  for (const l of lines) for (const n of numbersIn(l.text)) present.add(n);
  for (const u of unplaced) for (const n of numbersIn(u)) present.add(n);
  const dropped = [...dictated].filter((n) => !present.has(n));
  if (dropped.length) warnings.push(`These dictated numbers are not in the result: ${dropped.join(", ")}. Check the report before applying.`);

  const blanks = lines.reduce((n, l) => n + (l.text.match(/_{2,}/g) ?? []).length, 0);
  if (blanks) warnings.push(`${blanks} blank${blanks > 1 ? "s" : ""} (__) still to fill in.`);

  return { lines, unplaced, warnings: [...new Set(warnings)] };
}

/** True when there is free dictation that needs structuring. */
export function hasDictation(lines: ReportLine[]): boolean {
  return lines.some((l) => l.origin === "dictation" && norm(l.text).length > 0);
}
