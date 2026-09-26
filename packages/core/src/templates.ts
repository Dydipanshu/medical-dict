// Starting points for common ultrasound reports, in the layout used by Indian
// USG clinics: a column of organ labels in capitals ("LIVER :") with the
// finding beside it, then IMPRESSION. Pre-filled with normal findings; the
// doctor dictates over whatever is abnormal. "__" marks a measurement to fill in.

export interface ReportTemplate {
  id: string;
  name: string;
  title: string;
  html: string;
  /** Obstetric scans must carry the PCPNDT declaration. */
  pcpndt?: boolean;
}

/** A labelled finding line. Rendered as label column + text column. */
export const f = (label: string, text: string) => `<p data-label="${label}">${text}</p>`;
const line = (text: string) => `<p>${text}</p>`;
const impression = (text: string) => f("IMPRESSION", text) + line("Kindly correlate clinically.");

export const TEMPLATES: ReportTemplate[] = [
  {
    id: "blank",
    name: "Blank report",
    title: "ULTRASOUND REPORT",
    html: `<p></p>`,
  },
  {
    id: "abdomen-male",
    name: "Whole abdomen (male)",
    title: "USG WHOLE ABDOMEN",
    html: [
      f("LIVER", "Normal in size (__ cm) and echotexture. No focal lesion seen. Intrahepatic biliary radicles are not dilated."),
      f("GALL BLADDER", "Well distended. Wall thickness is normal. No calculus or sludge seen."),
      f("CBD", "Normal in calibre."),
      f("PORTAL VEIN", "Normal in calibre."),
      f("PANCREAS", "Normal in size and echotexture. Pancreatic duct is not dilated."),
      f("SPLEEN", "Normal in size (__ cm) and echotexture. No focal lesion seen."),
      f("RIGHT KIDNEY", "Measures __ x __ cm. Normal in size, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      f("LEFT KIDNEY", "Measures __ x __ cm. Normal in size, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      f("URINARY BLADDER", "Well distended. Wall thickness is normal. No calculus or mass seen."),
      f("PROSTATE", "Normal in size (volume __ cc) and echotexture."),
      line("No free fluid in the peritoneal cavity. No significant retroperitoneal lymphadenopathy."),
      impression("No significant abnormality detected."),
    ].join(""),
  },
  {
    id: "abdomen-female",
    name: "Whole abdomen (female)",
    title: "USG WHOLE ABDOMEN",
    html: [
      f("LIVER", "Normal in size (__ cm) and echotexture. No focal lesion seen. Intrahepatic biliary radicles are not dilated."),
      f("GALL BLADDER", "Well distended. Wall thickness is normal. No calculus or sludge seen."),
      f("CBD", "Normal in calibre."),
      f("PORTAL VEIN", "Normal in calibre."),
      f("PANCREAS", "Normal in size and echotexture. Pancreatic duct is not dilated."),
      f("SPLEEN", "Normal in size (__ cm) and echotexture. No focal lesion seen."),
      f("RIGHT KIDNEY", "Measures __ x __ cm. Normal in size, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      f("LEFT KIDNEY", "Measures __ x __ cm. Normal in size, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      f("URINARY BLADDER", "Well distended. Wall thickness is normal. No calculus or mass seen."),
      f("UTERUS", "Anteverted, normal in size (__ x __ x __ cm) and echotexture. No focal lesion seen."),
      f("ENDOMETRIUM", "Central, thickness __ mm."),
      f("OVARIES", "Both ovaries are normal in size and echotexture. No adnexal mass seen."),
      line("No free fluid in the peritoneal cavity or pouch of Douglas. No significant retroperitoneal lymphadenopathy."),
      impression("No significant abnormality detected."),
    ].join(""),
  },
  {
    id: "kub",
    name: "KUB",
    title: "USG KUB",
    html: [
      f("RIGHT KIDNEY", "Measures __ x __ cm. Normal in size, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      f("LEFT KIDNEY", "Measures __ x __ cm. Normal in size, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      f("URETERS", "Not dilated."),
      f("URINARY BLADDER", "Well distended. Wall thickness is normal. No calculus or mass seen."),
      f("PROSTATE", "Normal in size (volume __ cc) and echotexture."),
      f("POST-VOID RESIDUE", "__ ml (insignificant)."),
      impression("No significant abnormality detected."),
    ].join(""),
  },
  {
    id: "pelvis-female",
    name: "Pelvis (female)",
    title: "USG PELVIS",
    html: [
      f("URINARY BLADDER", "Well distended. Wall thickness is normal. No calculus or mass seen."),
      f("UTERUS", "Anteverted, normal in size (__ x __ x __ cm), shape and echotexture. No focal lesion seen."),
      f("ENDOMETRIUM", "Central, thickness __ mm."),
      f("CERVIX", "Normal."),
      f("RIGHT OVARY", "Measures __ x __ cm. Normal in size and echotexture."),
      f("LEFT OVARY", "Measures __ x __ cm. Normal in size and echotexture."),
      f("ADNEXA", "No adnexal mass seen."),
      f("POUCH OF DOUGLAS", "No free fluid."),
      impression("No significant abnormality detected."),
    ].join(""),
  },
  {
    id: "obstetric-early",
    name: "Obstetric (early pregnancy)",
    title: "USG OBSTETRIC (EARLY PREGNANCY)",
    pcpndt: true,
    html: [
      f("LMP", "__ (GA by LMP __ weeks __ days)"),
      f("GESTATIONAL SAC", "Single intrauterine gestational sac seen. Mean sac diameter __ mm."),
      f("YOLK SAC", "Seen, normal."),
      f("FETAL POLE", "Seen. CRL __ mm, corresponding to __ weeks __ days."),
      f("CARDIAC ACTIVITY", "Present. FHR __ bpm."),
      f("ADNEXA", "No adnexal mass. No free fluid."),
      f("EDD BY USG", "__"),
      impression("Single live intrauterine pregnancy of __ weeks __ days."),
    ].join(""),
  },
  {
    id: "obstetric",
    name: "Obstetric (2nd / 3rd trimester)",
    title: "USG OBSTETRIC",
    pcpndt: true,
    html: [
      f("LMP", "__ (GA by LMP __ weeks __ days)"),
      f("FETUS", "Single live intrauterine fetus in __ presentation. Fetal cardiac activity present, FHR __ bpm. Fetal movements seen."),
      `<table><tbody>
        <tr><th><p>Parameter</p></th><th><p>Measurement</p></th><th><p>Gestational age</p></th></tr>
        <tr><td><p>BPD</p></td><td><p>__ mm</p></td><td><p>__ wk __ d</p></td></tr>
        <tr><td><p>HC</p></td><td><p>__ mm</p></td><td><p>__ wk __ d</p></td></tr>
        <tr><td><p>AC</p></td><td><p>__ mm</p></td><td><p>__ wk __ d</p></td></tr>
        <tr><td><p>FL</p></td><td><p>__ mm</p></td><td><p>__ wk __ d</p></td></tr>
      </tbody></table>`,
      f("AVERAGE GA", "__ weeks __ days."),
      f("EFW", "__ g."),
      f("PLACENTA", "__, grade __. Not low lying."),
      f("LIQUOR", "Adequate. AFI __ cm."),
      f("CERVIX", "Length __ cm. Internal os closed."),
      f("EDD BY USG", "__"),
      impression("Single live intrauterine pregnancy of __ weeks __ days."),
    ].join(""),
  },
  {
    id: "thyroid",
    name: "Thyroid / neck",
    title: "USG NECK (THYROID)",
    html: [
      f("RIGHT LOBE", "Measures __ x __ x __ cm. Normal in size and echotexture. No focal nodule."),
      f("LEFT LOBE", "Measures __ x __ x __ cm. Normal in size and echotexture. No focal nodule."),
      f("ISTHMUS", "Thickness __ mm. Normal."),
      f("VASCULARITY", "Normal on colour Doppler."),
      f("LYMPH NODES", "No significant cervical lymphadenopathy."),
      impression("Normal thyroid gland."),
    ].join(""),
  },
];

export function pcpndtDeclaration(doctor: string, patient: string): string {
  const who = doctor.trim() || "__________";
  const her = patient.trim() || "__________";
  return `I, ${who}, declare that while conducting ultrasonography on ${her}, I have neither detected nor disclosed the sex of her foetus to anybody in any manner.`;
}
