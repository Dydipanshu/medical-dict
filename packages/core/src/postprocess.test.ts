import { test } from "node:test";
import assert from "node:assert/strict";
import { joinWithContext, processTranscript } from "./postprocess.ts";
import { DEFAULT_MACROS } from "./macros.ts";

const p = (s: string) => processTranscript(s, { macros: DEFAULT_MACROS });

test("measurements and units", () => {
  assert.equal(p("Right kidney measures 10.2 by 4.5 centimeters."), "Right kidney measures 10.2 x 4.5 cm.");
  assert.equal(p("CBD is 4 millimetres"), "CBD is 4 mm");
  assert.equal(p("uterus 8 point 2 into 4 into 3 point 5 cms"), "Uterus 8.2 x 4 x 3.5 cm");
  assert.equal(p("FHR 142 beats per minute"), "FHR 142 bpm");
  assert.equal(p("estimated fetal weight 2500 grams"), "Estimated fetal weight 2500 g");
  assert.equal(p("peak systolic velocity 45 centimeters per second"), "Peak systolic velocity 45 cm/s");
});

test("words without numbers are left alone", () => {
  assert.equal(p("measured in centimeters"), "Measured in centimeters");
  assert.equal(p("stand by the patient"), "Stand by the patient");
});

test("spoken punctuation and line commands", () => {
  assert.equal(p("liver is normal full stop spleen is normal"), "Liver is normal. Spleen is normal");
  assert.equal(p("Liver is normal. Full stop."), "Liver is normal.");
  assert.equal(p("impression colon normal study"), "Impression: normal study");
  assert.equal(p("gas in the sigmoid colon"), "Gas in the sigmoid colon");
  assert.equal(p("liver normal new line spleen normal"), "Liver normal\nSpleen normal");
  assert.equal(p("liver normal. New paragraph. Spleen normal."), "Liver normal.\n\nSpleen normal.");
  assert.equal(p("calculus open bracket 5 mm close bracket"), "Calculus (5 mm)");
  assert.equal(p("liver comma spleen"), "Liver, spleen");
});

test("macros expand", () => {
  assert.equal(p("Insert normal spleen."), "Spleen is normal in size and echotexture. No focal lesion seen.");
  assert.equal(
    p("Insert normal CBD. Insert clinical correlation."),
    "CBD is normal in calibre. Portal vein is normal in calibre. Kindly correlate clinically.",
  );
  assert.equal(p("the insert shows"), "The insert shows");
});

test("hallucinations dropped", () => {
  assert.equal(p("Thank you."), "");
  assert.equal(p(" you "), "");
});

test("joinWithContext", () => {
  assert.equal(joinWithContext("Normal in size.", "The liver is"), " normal in size.");
  assert.equal(joinWithContext("Normal in size.", "Liver: "), "Normal in size.");
  assert.equal(joinWithContext("normal in size.", "Liver:"), " Normal in size.");
  assert.equal(joinWithContext("Spleen is normal.", "Liver is normal."), " Spleen is normal.");
  assert.equal(joinWithContext("CBD is 4 mm.", "the"), " CBD is 4 mm.");
  assert.equal(joinWithContext("spleen", ""), "Spleen");
  assert.equal(joinWithContext("\nSpleen", "Liver."), "\nSpleen");
});

test("joinWithContext mid-sentence fill-in", () => {
  assert.equal(joinWithContext("12.", "Normal in calibre (", " mm)."), "12");
  assert.equal(joinWithContext("12.", "Normal in calibre (", "mm)."), "12 ");
  assert.equal(joinWithContext("Mildly enlarged.", "Liver is", " Spleen normal."), " mildly enlarged.");
  assert.equal(joinWithContext("Grossly", "Liver is", "normal."), " grossly ");
});

test("bare numbers survive", () => {
  assert.equal(p("14.5."), "14.5.");
  assert.equal(p("12"), "12");
});

test("segment starting with spoken punctuation after punctuation", () => {
  assert.equal(joinWithContext(". The gall bladder is normal.", "16.2 cm."), " The gall bladder is normal.");
  assert.equal(joinWithContext(". Spleen normal.", "Liver is enlarged"), ". Spleen normal.");
  assert.equal(joinWithContext(".", "Liver normal."), "");
});

test("grades in Roman numerals", () => {
  assert.equal(p("Grade 1 fatty liver"), "Grade I fatty liver");
  assert.equal(p("grade two hydronephrosis"), "Grade II hydronephrosis");
  assert.equal(p("placenta posterior, grade 3."), "Placenta posterior, grade III.");
  assert.equal(p("grade I fatty liver"), "Grade I fatty liver");
  assert.equal(p("grade 2.5"), "Grade 2.5");
});

test("'write' misheard for 'right' before anatomy", () => {
  assert.equal(p("Write renal calculus of 6 mm."), "Right renal calculus of 6 mm.");
  assert.equal(p("calculus in the write kidney"), "Calculus in the write kidney".replace("write", "right"));
  assert.equal(p("please write the report"), "Please write the report");
});

test("split ultrasound compounds are joined", () => {
  assert.equal(p("normal in size and echo texture"), "Normal in size and echotexture");
  assert.equal(p("a hypo echoic lesion"), "A hypoechoic lesion");
  assert.equal(p("An echoic cyst"), "Anechoic cyst");
  assert.equal(p("increased echo genicity"), "Increased echogenicity");
  assert.equal(p("an echo was heard"), "An echo was heard");
});
