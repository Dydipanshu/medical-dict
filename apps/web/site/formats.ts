// SEO copy for each report format page (/usg-report-format/<slug>).
// Doctors search for these formats by name, so each page carries the full text.

export interface FormatMeta {
  templateId: string;
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
}

export const FORMATS: FormatMeta[] = [
  {
    templateId: "abdomen-male",
    slug: "whole-abdomen-male",
    h1: "USG whole abdomen report format (male)",
    title: "USG Whole Abdomen Report Format (Male) – Normal Findings | USGScribe",
    description:
      "Normal USG whole abdomen report format for male patients: liver, gall bladder, CBD, portal vein, pancreas, spleen, kidneys, bladder and prostate. Copy it or dictate it by voice.",
    intro:
      "A standard normal-study format for ultrasound of the whole abdomen in a male patient, covering the solid organs, biliary system, kidneys, urinary bladder and prostate. Blanks marked __ are the measurements you fill in.",
  },
  {
    templateId: "abdomen-female",
    slug: "whole-abdomen-female",
    h1: "USG whole abdomen report format (female)",
    title: "USG Whole Abdomen Report Format (Female) – Normal Findings | USGScribe",
    description:
      "Normal USG whole abdomen report format for female patients, including uterus, endometrial thickness and ovaries. Copy the format or dictate it by voice in USGScribe.",
    intro:
      "The female whole abdomen format adds the uterus, endometrium and ovaries to the upper abdominal organs and kidneys. Blanks marked __ are the measurements you fill in.",
  },
  {
    templateId: "kub",
    slug: "kub",
    h1: "USG KUB report format",
    title: "USG KUB Report Format – Kidneys, Ureters, Bladder | USGScribe",
    description:
      "Normal USG KUB report format with kidney measurements, ureters, urinary bladder and post-void residual volume. Copy it or dictate it by voice.",
    intro:
      "Ultrasound of the kidneys, ureters and bladder (KUB), commonly asked for in suspected renal calculi and urinary symptoms. Includes post-void residual urine volume.",
  },
  {
    templateId: "pelvis-female",
    slug: "pelvis-female",
    h1: "USG pelvis report format (female)",
    title: "USG Pelvis Report Format (Female) – Uterus, Ovaries, Endometrium | USGScribe",
    description:
      "Normal female pelvic ultrasound report format: uterus size, endometrial thickness, cervix, both ovaries, adnexa and pouch of Douglas.",
    intro:
      "A transabdominal pelvic ultrasound format for the uterus, endometrium, cervix, ovaries and adnexa, with the pouch of Douglas and urinary bladder.",
  },
  {
    templateId: "obstetric-early",
    slug: "early-pregnancy",
    h1: "USG early pregnancy report format",
    title: "Early Pregnancy USG Report Format – Gestational Sac, CRL, FHR | USGScribe",
    description:
      "First-trimester (early pregnancy) ultrasound report format: gestational sac, mean sac diameter, yolk sac, fetal pole, CRL, cardiac activity and EDD.",
    intro:
      "For first-trimester scans: intrauterine gestational sac, yolk sac, fetal pole with crown-rump length, cardiac activity and the expected date of delivery by ultrasound.",
  },
  {
    templateId: "obstetric",
    slug: "obstetric-second-third-trimester",
    h1: "USG obstetric report format (2nd and 3rd trimester)",
    title: "Obstetric USG Report Format – BPD, HC, AC, FL, AFI, EFW | USGScribe",
    description:
      "Second and third trimester obstetric ultrasound report format with a fetal biometry table (BPD, HC, AC, FL), estimated fetal weight, placenta, liquor (AFI) and cervix.",
    intro:
      "Growth-scan format for the second and third trimester, with a biometry table for BPD, HC, AC and FL, average gestational age, estimated fetal weight, placental position and grade, liquor and cervical length.",
  },
  {
    templateId: "thyroid",
    slug: "thyroid-neck",
    h1: "USG thyroid (neck) report format",
    title: "USG Thyroid Report Format – Lobes, Isthmus, Nodules, Doppler | USGScribe",
    description:
      "Normal thyroid ultrasound report format: right and left lobe dimensions, isthmus thickness, nodules, colour Doppler vascularity and cervical lymph nodes.",
    intro:
      "Neck ultrasound format for the thyroid gland: dimensions of both lobes, isthmus thickness, echotexture, nodules, colour Doppler vascularity and cervical lymph nodes.",
  },
];
