import { Extension } from "@tiptap/react";

// A finding line carries its organ label ("LIVER") as a paragraph attribute.
// CSS draws the label in a column to the left with a hanging indent, the way
// USG reports are laid out. Pressing Enter starts a plain, unlabelled line.
export const FindingLabel = Extension.create({
  name: "findingLabel",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          label: {
            default: null,
            keepOnSplit: false,
            parseHTML: (el) => el.getAttribute("data-label"),
            renderHTML: (attrs) => (attrs.label ? { "data-label": attrs.label, class: "finding" } : {}),
          },
        },
      },
    ];
  },
});
