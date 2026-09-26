import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  ShadingType,
  Paragraph,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import type { JSONContent } from "@tiptap/react";
import { pcpndtDeclaration } from "@medical-dict/core";
import type { Report, Settings } from "./storage";

type Block = Paragraph | Table;

const FONT = "Calibri";
const SIZE = 22; // half-points: 11 pt
const LABEL_TWIPS = 2640; // label column width, ~4.7 cm (fits "URINARY BLADDER :")
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const RULE = { style: BorderStyle.SINGLE, size: 8, color: "111111" };

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

function runs(content: JSONContent[] = [], forceBold = false): ParagraphChild[] {
  return content.flatMap((n) => {
    if (n.type === "hardBreak") return [new TextRun({ text: "", break: 1 })];
    if (n.type !== "text") return [];
    const marks = new Set((n.marks ?? []).map((m) => m.type));
    return [
      new TextRun({
        text: n.text ?? "",
        bold: forceBold || marks.has("bold"),
        italics: marks.has("italic"),
        underline: marks.has("underline") ? {} : undefined,
        strike: marks.has("strike"),
      }),
    ];
  });
}

function blocks(nodes: JSONContent[] = [], list?: { ordered: boolean; level: number }): Block[] {
  return nodes.flatMap((n): Block[] => {
    const alignment = ALIGN[(n.attrs?.textAlign as string) ?? ""];
    switch (n.type) {
      case "paragraph": {
        const label = n.attrs?.label as string | null;
        if (label) {
          const isImpression = label === "IMPRESSION";
          // Label, tab to the text column, hanging indent so wrapped lines align with the text.
          return [
            new Paragraph({
              indent: { left: LABEL_TWIPS, hanging: LABEL_TWIPS },
              tabStops: [{ type: TabStopType.LEFT, position: LABEL_TWIPS }],
              spacing: { before: isImpression ? 240 : 0, after: 120 },
              children: [
                new TextRun({ text: `${label} :`, bold: true, underline: isImpression ? {} : undefined }),
                new TextRun({ text: "\t" }),
                ...runs(n.content, isImpression),
              ],
            }),
          ];
        }
        return [
          new Paragraph({
            children: runs(n.content),
            alignment,
            spacing: { after: 120 },
            ...(list ? (list.ordered ? { numbering: { reference: "num", level: list.level } } : { bullet: { level: list.level } }) : {}),
          }),
        ];
      }
      case "heading":
        return [new Paragraph({ children: runs(n.content, true), heading: HeadingLevel.HEADING_3, alignment, spacing: { before: 200, after: 100 } })];
      case "bulletList":
      case "orderedList":
        return (n.content ?? []).flatMap((li) => blocks(li.content, { ordered: n.type === "orderedList", level: list ? list.level + 1 : 0 }));
      case "table":
        return [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: (n.content ?? []).map(
              (row) =>
                new TableRow({
                  children: (row.content ?? []).map((cell) => {
                    const header = cell.type === "tableHeader";
                    const content = header ? boldCell(cell.content) : cell.content;
                    return new TableCell({
                      children: blocks(content).filter((b): b is Paragraph => b instanceof Paragraph),
                      columnSpan: (cell.attrs?.colspan as number) || 1,
                      margins: { top: 50, bottom: 10, left: 110, right: 110 },
                      shading: header ? { fill: "F1F1EF", type: ShadingType.CLEAR, color: "auto" } : undefined,
                    });
                  }),
                }),
            ),
          }),
          new Paragraph({ text: "" }),
        ];
      default:
        return n.content ? blocks(n.content, list) : [];
    }
  });
}

/** Header cells: make their text bold. */
function boldCell(content: JSONContent[] = []): JSONContent[] {
  return content.map((p) => ({ ...p, content: (p.content ?? []).map((t) => ({ ...t, marks: [...(t.marks ?? []), { type: "bold" }] })) }));
}

function patientTable(r: Report): Table {
  const p = r.patient;
  // Word draws rules reliably only when they are set on the cells: a rule above
  // the first row and below the last, nothing else.
  const cell = (label: string, value: string, row: number, rowCount: number) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      margins: { top: 30, bottom: 30, left: 0, right: 80 },
      borders: { top: row === 0 ? RULE : NONE, bottom: row === rowCount - 1 ? RULE : NONE, left: NONE, right: NONE },
      children: [
        new Paragraph({
          spacing: { before: 40, after: 40 },
          children: label ? [new TextRun({ text: `${label} : `, bold: true }), new TextRun(value || "")] : [],
        }),
      ],
    });
  const rows: [string, string, string, string][] = [
    ["Name", p.name, "Age / Sex", [p.age, p.sex].filter(Boolean).join(" / ")],
    ["Ref. by", p.referredBy, "Date", p.date],
    ["Reg. No.", p.patientId, "", ""],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: RULE, bottom: RULE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
    rows: rows.map(([a, b, c, d], i) => new TableRow({ children: [cell(a, b, i, rows.length), cell(c, d, i, rows.length)] })),
  });
}

export async function exportDocx(report: Report, doc: JSONContent, settings: Settings) {
  const letterhead: Block[] = settings.preprintedLetterhead
    ? // Leave the top of the page empty for pre-printed stationery.
      [new Paragraph({ text: "", spacing: { before: Math.round(settings.letterheadSpaceMm * 56.7) } })]
    : [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: settings.clinicName, bold: true, size: 34 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: settings.clinicAddress, size: 20 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: settings.clinicContact, size: 20 })] }),
      ];
  const signature: Block[] = [
    new Paragraph({ text: "", spacing: { before: 720 } }),
    ...[
      [settings.doctorName, true],
      [settings.doctorQualification, false],
      [settings.doctorDesignation, false],
      [settings.registrationNo ? `Reg. No. ${settings.registrationNo}` : "", false],
    ]
      .filter(([t]) => t)
      .map(([t, bold]) => new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: String(t), bold: !!bold })] })),
  ];
  const declaration: Block[] = report.pcpndt
    ? [
        new Paragraph({
          spacing: { before: 360 },
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 6 } },
          children: [
            new TextRun({ text: "Declaration (PCPNDT Act): ", bold: true, size: 20 }),
            new TextRun({ text: pcpndtDeclaration(settings.doctorName, report.patient.name), size: 20 }),
          ],
        }),
      ]
    : [];

  const file = new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    numbering: {
      config: [
        {
          reference: "num",
          levels: [0, 1, 2].map((level) => ({ level, format: "decimal" as const, text: `%${level + 1}.`, alignment: AlignmentType.START })),
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 800, bottom: 900, left: 1000, right: 1000 } } },
        footers: settings.disclaimer.trim()
          ? { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: settings.disclaimer, size: 16, color: "555555" })] })] }) }
          : undefined,
        children: [
          ...letterhead,
          patientTable(report),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 280, after: 200 },
            children: [new TextRun({ text: report.title, bold: true, underline: {}, size: 26 })],
          }),
          ...blocks(doc.content),
          ...declaration,
          ...signature,
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(file);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const who = report.patient.name.trim().replace(/[^\w\- ]+/g, "") || "report";
  a.download = `${who} - ${report.title}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
