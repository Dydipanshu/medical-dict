import type { Editor } from "@tiptap/react";
import { joinWithContext, processTranscript, type Macro } from "@medical-dict/core";

/** Inserts a raw transcript at the cursor (replacing any selection). */
export function insertDictation(editor: Editor, raw: string, macros: Macro[]): string {
  const processed = processTranscript(raw, { macros });
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
