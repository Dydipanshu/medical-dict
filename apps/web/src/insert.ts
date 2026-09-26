import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { joinWithContext, processTranscript, type Macro } from "@medical-dict/core";

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

interface Finding {
  label: string;
  from: number; // start of the line's text
  to: number; // end of the line's text
}

function findings(editor: Editor): Finding[] {
  const out: Finding[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "paragraph" && node.attrs.label) {
      out.push({ label: String(node.attrs.label), from: pos + 1, to: pos + node.nodeSize - 1 });
    }
  });
  return out;
}

/**
 * "go to liver …" puts the cursor at the end of the LIVER line;
 * "replace liver …" / "change liver …" selects it so what follows replaces it.
 * Returns the rest of the transcript to insert (all of it if this is not a
 * navigation command).
 */
function navigate(editor: Editor, raw: string): string {
  const m = raw.match(/^\s*(go to|goto|replace|change)\b/i);
  if (!m) return raw;
  const verb = m[1].toLowerCase().replace(" ", "");
  // Word tokens after the verb, with their end offsets in `raw`.
  const tokens = [...raw.slice(m[0].length).matchAll(/[a-z0-9]+/gi)].map((t) => ({
    w: t[0].toLowerCase(),
    end: m[0].length + t.index! + t[0].length,
  }));
  let best: { f: Finding; used: number; len: number } | undefined;
  for (const f of findings(editor)) {
    const target = words(f.label).join("");
    // Compare without spaces so "gallbladder" matches GALL BLADDER.
    for (let k = 1; k <= Math.min(4, tokens.length); k++) {
      const said = tokens.slice(0, k).map((t) => t.w).join("");
      if (said === target && (!best || target.length > best.len)) best = { f, used: k, len: target.length };
    }
  }
  if (!best) return raw;
  const { f, used } = best;
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.setSelection(verb === "goto" ? TextSelection.create(tr.doc, f.to) : TextSelection.create(tr.doc, f.from, f.to));
      return true;
    })
    .scrollIntoView()
    .run();
  return raw.slice(tokens[used - 1].end).replace(/^[\s,.:;-]+/, "");
}

/** Inserts a raw transcript at the cursor (replacing any selection). */
export function insertDictation(editor: Editor, raw: string, macros: Macro[]): string {
  const rest = navigate(editor, raw);
  const processed = processTranscript(rest, { macros });
  if (!processed) return "";
  const { $from, $to } = editor.state.selection;
  const before = $from.parent.textBetween(Math.max(0, $from.parentOffset - 120), $from.parentOffset, "\n", " ");
  const after = $to.parent.textBetween($to.parentOffset, Math.min($to.parent.content.size, $to.parentOffset + 40), "\n", " ");
  const text = joinWithContext(processed, before, after);

  // One transaction, so a single Ctrl+Z undoes the whole dictated segment.
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.deleteSelection();
      text.split("\n").forEach((line, i) => {
        if (i > 0) tr.split(tr.selection.from);
        if (line) tr.insertText(line);
      });
      return true;
    })
    .scrollIntoView()
    .run();
  return text;
}
