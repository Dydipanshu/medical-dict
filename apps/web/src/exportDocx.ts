import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import type { JSONContent } from "@tiptap/react";
import type { Report, Settings } from "./storage";

type Block = Paragraph | Table;

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

function runs(content: JSONContent[] = []): ParagraphChild[] {
  return content.flatMap((n) => {
    if (n.type === "hardBreak") return [new TextRun({ text: "", break: 1 })];
    if (n.type !== "text") return [];
    const marks = new Set((n.marks ?? []).map((m) => m.type));
    return [
      new TextRun({
        text: n.text ?? "",
        bold: marks.has("bold"),
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
      case "paragraph":
        return [
          new Paragraph({
            children: runs(n.content),
            alignment,
            spacing: { after: 100 },
            ...(list ? (list.ordered ? { numbering: { reference: "num", level: list.level } } : { bullet: { level: list.level } }) : {}),
          }),
        ];
      case "heading":
        return [
          new Paragraph({
            children: runs(n.content),
            heading: n.attrs?.level === 1 ? HeadingLevel.HEADING_1 : n.attrs?.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            alignment,
            spacing: { before: 200, after: 100 },
          }),
        ];
      case "bulletList":
      case "orderedList":
        return (n.content ?? []).flatMap((li) =>
          blocks(li.content, { ordered: n.type === "orderedList", level: list ? list.level + 1 : 0 }),
        );
      case "table":
        return [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: (n.content ?? []).map(
              (row) =>
                new TableRow({
                  children: (row.content ?? []).map(
                    (cell) =>
                      new TableCell({
                        children: blocks(cell.content).filter((b): b is Paragraph => b instanceof Paragraph),
                        columnSpan: (cell.attrs?.colspan as number) || 1,
                      }),
                  ),
                }),
            ),
          }),
          new Paragraph({ text: "" }),
        ];
      case "horizontalRule":
        return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } } })];
      default:
        return n.content ? blocks(n.content, list) : [];
    }
  });
}

function patientTable(r: Report): Table {
  const p = r.patient;
  const cell = (label: string, value: string) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value || "")] })],
    });
  const rows: [string, string, string, string][] = [
    ["Patient name", p.name, "Date", p.date],
    ["Age / Sex", [p.age, p.sex].filter(Boolean).join(" / "), "Patient ID", p.patientId],
    ["Referred by", p.referredBy, "", ""],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([a, b, c, d]) => new TableRow({ children: [cell(a, b), c ? cell(c, d) : new TableCell({ children: [new Paragraph("")] })] })),
  });
}

export async function exportDocx(report: Report, doc: JSONContent, settings: Settings) {
  const letterhead: Block[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: settings.clinicName, bold: true, size: 32 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: settings.clinicAddress, size: 20 })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: settings.clinicContact, size: 20 })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "0F766E", space: 4 } },
      spacing: { after: 200 },
    }),
  ];
  const signature: Block[] = [
    new Paragraph({ text: "", spacing: { before: 600 } }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: settings.doctorName, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(settings.doctorQualification)] }),
  ];
  const file = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
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
        properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
        children: [
          ...letterhead,
          patientTable(report),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 200 },
            children: [new TextRun({ text: report.title, bold: true, underline: {}, size: 26 })],
          }),
          ...blocks(doc.content),
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
