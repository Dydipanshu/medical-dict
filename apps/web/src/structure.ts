import type { JSONContent } from "@tiptap/react";
import { TEMPLATES, checkStructured, type CheckedReport, type ModelReport, type ReportLine } from "@medical-dict/core";

// Bridges the editor and AI structuring: reads the report into labelled lines,
// sends them to /api/structure, and builds the new document once the doctor
// accepts. Tables and other non-text blocks are never sent and never changed.

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

function textOf(node: JSONContent): string {
  return (node.content ?? []).map((c) => (c.type === "text" ? (c.text ?? "") : c.type === "hardBreak" ? " " : textOf(c))).join("");
}

function templateText(templateId: string) {
  const labelled = new Map<string, string>();
  const fixed = new Set<string>();
  const tpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return { labelled, fixed };
  const doc = new DOMParser().parseFromString(tpl.html, "text/html");
  for (const p of doc.querySelectorAll("p")) {
    const text = squash(p.textContent ?? "");
    if (!text) continue;
    const label = p.getAttribute("data-label");
    if (label) labelled.set(label, text);
    else fixed.add(text);
  }
  return { labelled, fixed };
}

/** A block the AI must not touch, and the labelled line it sat after. */
interface Kept {
  node: JSONContent;
  after: string | null;
}

export interface Snapshot {
  lines: ReportLine[];
  nodes: Map<string, JSONContent>;
  kept: Kept[];
}

export function snapshot(doc: JSONContent, templateId: string): Snapshot {
  const tpl = templateText(templateId);
  const lines: ReportLine[] = [];
  const nodes = new Map<string, JSONContent>();
  const kept: Kept[] = [];
  let lastLabel: string | null = null;
  for (const node of doc.content ?? []) {
    if (node.type !== "paragraph" && node.type !== "heading") {
      kept.push({ node, after: lastLabel });
      continue;
    }
    const text = squash(textOf(node));
    if (!text) continue;
    const label = (node.attrs?.label as string | null | undefined) ?? null;
    if (label) {
      lines.push({ label, text, origin: tpl.labelled.get(label) === text ? "template" : "edited" });
      nodes.set(`L:${label}`, node);
      lastLabel = label;
    } else {
      lines.push({ label: null, text, origin: tpl.fixed.has(text) ? "fixed" : "dictation" });
      nodes.set(`T:${text}`, node);
    }
  }
  return { lines, nodes, kept };
}

/** Something worth sending: free dictation, or an organ line the doctor changed. */
export function worthStructuring(lines: ReportLine[]): boolean {
  return lines.some((l) => l.origin === "dictation" || l.origin === "edited");
}

export async function aiAvailable(): Promise<boolean> {
  try {
    const r = await fetch("/api/structure");
    return r.ok && (await r.json()).configured === true;
  } catch {
    return false;
  }
}

export async function requestStructure(title: string, lines: ReportLine[], signal?: AbortSignal): Promise<CheckedReport> {
  const res = await fetch("/api/structure", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, lines }),
    signal,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; result?: ModelReport };
  if (!res.ok || !body.result) throw new Error(body.error ?? "Structuring failed. Try again.");
  const r = body.result;
  const safe: ModelReport = {
    lines: Array.isArray(r.lines) ? r.lines.filter((l) => l && typeof l.text === "string") : [],
    unplaced: Array.isArray(r.unplaced) ? r.unplaced.filter((u) => typeof u === "string") : [],
    warnings: Array.isArray(r.warnings) ? r.warnings.filter((w) => typeof w === "string") : [],
  };
  return checkStructured(lines, safe);
}

const para = (label: string | null, text: string): JSONContent => ({
  type: "paragraph",
  attrs: label ? { label } : {},
  content: text ? [{ type: "text", text }] : [],
});

/** The new document. Unchanged lines reuse their original node, so bold or italic survives. */
export function buildDoc(snap: Snapshot, result: CheckedReport, includeUnplaced: boolean): JSONContent {
  const out: JSONContent[] = [];
  const keptAt = (after: string | null) => snap.kept.filter((k) => k.after === after).map((k) => k.node);
  out.push(...keptAt(null));
  for (const l of result.lines) {
    const original = snap.nodes.get(l.label ? `L:${l.label}` : `T:${l.text}`);
    if (l.label === "IMPRESSION" && includeUnplaced) for (const u of result.unplaced) out.push(para(null, u));
    out.push(!l.changed && original ? original : para(l.label, l.text));
    if (l.label) out.push(...keptAt(l.label));
  }
  if (includeUnplaced && !result.lines.some((l) => l.label === "IMPRESSION")) for (const u of result.unplaced) out.push(para(null, u));
  const placed = new Set(out);
  for (const k of snap.kept) if (!placed.has(k.node)) out.push(k.node);
  return { type: "doc", content: out.length ? out : [para(null, "")] };
}
