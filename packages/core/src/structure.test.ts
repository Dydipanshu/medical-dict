import { test } from "node:test";
import assert from "node:assert/strict";
import { checkStructured, hasDictation, numbersIn, type ReportLine } from "./structure.ts";

const LIVER_DEFAULT = "Normal in size (__ cm) and echotexture. No focal lesion seen.";
const KIDNEY_DEFAULT = "Measures __ x __ cm. Normal in size and echotexture. No calculus or hydronephrosis.";

const report = (dictation: string): ReportLine[] => [
  { label: "LIVER", text: LIVER_DEFAULT, origin: "template" },
  { label: "RIGHT KIDNEY", text: KIDNEY_DEFAULT, origin: "template" },
  { label: null, text: "No free fluid in the peritoneal cavity.", origin: "fixed" },
  { label: "IMPRESSION", text: "No significant abnormality detected.", origin: "template" },
  { label: null, text: "Kindly correlate clinically.", origin: "fixed" },
  { label: null, text: dictation, origin: "dictation" },
];

test("numbersIn normalises trailing zeros", () => {
  assert.deepEqual(numbersIn("16.20 cm and 4 x 10.0 mm"), ["16.2", "4", "10"]);
});

test("a clean answer passes and marks changed lines", () => {
  const input = report("Liver is mildly enlarged, 16.2 cm, with grade I fatty change.");
  const out = checkStructured(input, {
    lines: [
      { label: "LIVER", text: "Mildly enlarged (16.2 cm) with increased echogenicity, suggestive of grade I fatty infiltration." },
      { label: "RIGHT KIDNEY", text: KIDNEY_DEFAULT },
      { label: null, text: "No free fluid in the peritoneal cavity." },
      { label: "IMPRESSION", text: "Grade I fatty liver with mild hepatomegaly." },
      { label: null, text: "Kindly correlate clinically." },
    ],
    unplaced: [],
    warnings: [],
  });
  assert.equal(out.lines.find((l) => l.label === "LIVER")?.changed, true);
  assert.equal(out.lines.find((l) => l.label === "RIGHT KIDNEY")?.changed, false);
  assert.equal(out.lines.find((l) => l.label === "IMPRESSION")?.text, "Grade I fatty liver with mild hepatomegaly.");
  assert.deepEqual(
    out.lines.map((l) => l.label ?? l.text),
    ["LIVER", "RIGHT KIDNEY", "No free fluid in the peritoneal cavity.", "IMPRESSION", "Kindly correlate clinically."],
  );
  assert.deepEqual(out.warnings, ["2 blanks (__) still to fill in."]);
});

test("a line with an invented measurement is reverted", () => {
  const input = report("Right kidney has a 6 mm calculus in the lower pole.");
  const out = checkStructured(input, {
    lines: [
      { label: "LIVER", text: LIVER_DEFAULT },
      { label: "RIGHT KIDNEY", text: "Measures 10.4 x 4.6 cm. A 6 mm calculus is seen in the lower pole." },
      { label: "IMPRESSION", text: "Right renal calculus of 6 mm." },
    ],
    unplaced: [],
    warnings: [],
  });
  const kidney = out.lines.find((l) => l.label === "RIGHT KIDNEY");
  assert.equal(kidney?.text, KIDNEY_DEFAULT);
  assert.equal(kidney?.reverted, true);
  assert.ok(out.warnings.some((w) => w.includes("10.4, 4.6") && w.includes("RIGHT KIDNEY")));
  assert.ok(out.warnings.some((w) => w.includes("not in the result: 6")) === false);
});

test("a dropped dictated number raises a warning", () => {
  const input = report("Spleen normal. Liver 16.2 cm.");
  const out = checkStructured(input, {
    lines: [
      { label: "LIVER", text: "Normal in size and echotexture." },
      { label: "RIGHT KIDNEY", text: KIDNEY_DEFAULT },
      { label: "IMPRESSION", text: "No significant abnormality detected." },
    ],
    unplaced: [],
    warnings: [],
  });
  assert.ok(out.warnings.some((w) => w.includes("not in the result: 16.2")));
});

test("a missing label is restored and an unknown label is not trusted", () => {
  const input = report("Gall bladder shows a 12 mm calculus.");
  const out = checkStructured(input, {
    lines: [
      { label: "LIVER", text: LIVER_DEFAULT },
      { label: "GALL BLADDER", text: "A 12 mm calculus is seen." },
      { label: "IMPRESSION", text: "Cholelithiasis." },
    ],
    unplaced: [],
    warnings: [],
  });
  assert.equal(out.lines.find((l) => l.label === "RIGHT KIDNEY")?.text, KIDNEY_DEFAULT);
  assert.equal(out.lines.some((l) => l.label === "GALL BLADDER"), false);
  assert.deepEqual(out.unplaced, ["GALL BLADDER: A 12 mm calculus is seen."]);
  assert.ok(out.warnings.some((w) => w.includes("left out the RIGHT KIDNEY")));
  assert.ok(out.warnings.some((w) => w.includes('added a "GALL BLADDER"')));
  assert.ok(!out.warnings.some((w) => w.includes("not in the result")));
});

test("duplicate labels keep the first answer", () => {
  const input = report("Liver 15 cm.");
  const out = checkStructured(input, {
    lines: [
      { label: "LIVER", text: "Normal in size (15 cm) and echotexture." },
      { label: "LIVER", text: "Enlarged." },
      { label: "RIGHT KIDNEY", text: KIDNEY_DEFAULT },
      { label: "IMPRESSION", text: "No significant abnormality detected." },
    ],
    unplaced: [],
    warnings: [],
  });
  assert.equal(out.lines.filter((l) => l.label === "LIVER").length, 1);
  assert.equal(out.lines.find((l) => l.label === "LIVER")?.text, "Normal in size (15 cm) and echotexture.");
});

test("a new unlabelled line goes before the impression unless it invents a number", () => {
  const input = report("Mild ascites. Bowel loops normal.");
  const out = checkStructured(input, {
    lines: [
      { label: "LIVER", text: LIVER_DEFAULT },
      { label: "RIGHT KIDNEY", text: KIDNEY_DEFAULT },
      { label: null, text: "Mild ascites is seen." },
      { label: null, text: "Free fluid of 200 ml." },
      { label: "IMPRESSION", text: "Mild ascites." },
    ],
    unplaced: [],
    warnings: [],
  });
  const at = out.lines.findIndex((l) => l.text === "Mild ascites is seen.");
  assert.ok(at >= 0 && at < out.lines.findIndex((l) => l.label === "IMPRESSION"));
  assert.equal(out.lines.some((l) => l.text.includes("200")), false);
  assert.ok(out.warnings.some((w) => w.includes("200")));
});

test("a blank report may get new labelled lines, without invented numbers", () => {
  const input: ReportLine[] = [{ label: null, text: "Liver 16.2 cm, fatty. Spleen normal. Impression fatty liver.", origin: "dictation" }];
  const out = checkStructured(input, {
    lines: [
      { label: "LIVER", text: "Measures 16.2 cm, with fatty infiltration." },
      { label: "SPLEEN", text: "Normal in size (11 cm)." },
      { label: "IMPRESSION", text: "Fatty liver." },
    ],
    unplaced: [],
    warnings: [],
  });
  assert.deepEqual(out.lines.map((l) => l.label), ["LIVER", "IMPRESSION"]);
  assert.deepEqual(out.unplaced, ["SPLEEN: Normal in size (11 cm)."]);
  assert.ok(out.warnings.some((w) => w.includes("11") && w.includes("SPLEEN")));
});

test("hasDictation only counts free dictation", () => {
  assert.equal(hasDictation(report("")), false);
  assert.equal(hasDictation(report("Liver 15 cm.")), true);
});
