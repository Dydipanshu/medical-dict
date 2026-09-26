// Starting points for common ultrasound reports. Pre-filled with normal findings
// (the usual clinic workflow): the doctor dictates over whatever is abnormal.
// Values shown as "__" are measurements to fill in.

export interface ReportTemplate {
  id: string;
  name: string;
  title: string;
  html: string;
}

const s = (label: string, text: string) => `<p><strong>${label}:</strong> ${text}</p>`;

const impression = `<h3>IMPRESSION</h3><p></p>`;

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
      s("Liver", "Normal in size (__ cm), shape and echotexture. No focal lesion seen. Intrahepatic biliary radicles are not dilated."),
      s("Gall bladder", "Well distended. Wall thickness is normal. No calculus or sludge seen within."),
      s("CBD", "Normal in calibre (__ mm)."),
      s("Portal vein", "Normal in calibre (__ mm)."),
      s("Pancreas", "Normal in size and echotexture. Pancreatic duct is not dilated."),
      s("Spleen", "Normal in size (__ cm) and echotexture. No focal lesion seen."),
      s("Right kidney", "Measures __ x __ cm. Normal in size, shape and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      s("Left kidney", "Measures __ x __ cm. Normal in size, shape and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      s("Urinary bladder", "Well distended. Wall thickness is normal. No calculus or mass seen within."),
      s("Prostate", "Normal in size (volume __ cc) and echotexture."),
      `<p>No free fluid seen in the peritoneal cavity. No significant lymphadenopathy.</p>`,
      impression,
    ].join(""),
  },
  {
    id: "abdomen-female",
    name: "Whole abdomen (female)",
    title: "USG WHOLE ABDOMEN",
    html: [
      s("Liver", "Normal in size (__ cm), shape and echotexture. No focal lesion seen. Intrahepatic biliary radicles are not dilated."),
      s("Gall bladder", "Well distended. Wall thickness is normal. No calculus or sludge seen within."),
      s("CBD", "Normal in calibre (__ mm)."),
      s("Portal vein", "Normal in calibre (__ mm)."),
      s("Pancreas", "Normal in size and echotexture. Pancreatic duct is not dilated."),
      s("Spleen", "Normal in size (__ cm) and echotexture. No focal lesion seen."),
      s("Right kidney", "Measures __ x __ cm. Normal in size, shape and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      s("Left kidney", "Measures __ x __ cm. Normal in size, shape and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      s("Urinary bladder", "Well distended. Wall thickness is normal. No calculus or mass seen within."),
      s("Uterus", "Anteverted, normal in size (__ x __ x __ cm) and echotexture. Endometrial thickness __ mm. No focal lesion seen."),
      s("Ovaries", "Both ovaries are normal in size and echotexture. No adnexal mass seen."),
      `<p>No free fluid seen in the peritoneal cavity or pouch of Douglas.</p>`,
      impression,
    ].join(""),
  },
  {
    id: "kub",
    name: "KUB",
    title: "USG KUB",
    html: [
      s("Right kidney", "Measures __ x __ cm. Normal in size, shape and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      s("Left kidney", "Measures __ x __ cm. Normal in size, shape and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis."),
      s("Ureters", "Not dilated."),
      s("Urinary bladder", "Well distended. Wall thickness is normal. No calculus or mass seen within."),
      s("Post-void residual", "__ ml."),
      impression,
    ].join(""),
  },
  {
    id: "pelvis-female",
    name: "Pelvis (female)",
    title: "USG PELVIS",
    html: [
      s("Uterus", "Anteverted, normal in size (__ x __ x __ cm), shape and echotexture. No focal lesion seen."),
      s("Endometrium", "Central, thickness __ mm."),
      s("Cervix", "Normal."),
      s("Right ovary", "Measures __ x __ cm. Normal in size and echotexture."),
      s("Left ovary", "Measures __ x __ cm. Normal in size and echotexture."),
      s("Adnexa", "No adnexal mass seen."),
      s("Pouch of Douglas", "No free fluid."),
      s("Urinary bladder", "Well distended. No calculus or mass seen within."),
      impression,
    ].join(""),
  },
  {
    id: "obstetric-early",
    name: "Obstetric (early pregnancy)",
    title: "USG OBSTETRIC (EARLY PREGNANCY)",
    html: [
      s("LMP", "__"),
      s("Gestational sac", "Single intrauterine gestational sac seen. Mean sac diameter __ mm."),
      s("Yolk sac", "Seen."),
      s("Fetal pole", "Seen. CRL __ mm, corresponding to __ weeks __ days."),
      s("Cardiac activity", "Present. FHR __ bpm."),
      s("Adnexa", "No adnexal mass. No free fluid."),
      s("EDD by USG", "__"),
      impression,
    ].join(""),
  },
  {
    id: "obstetric",
    name: "Obstetric (2nd / 3rd trimester)",
    title: "USG OBSTETRIC",
    html: [
      s("LMP", "__"),
      `<p>Single live intrauterine fetus in __ presentation. Fetal cardiac activity present, FHR __ bpm. Fetal movements seen.</p>`,
      `<h3>BIOMETRY</h3>`,
      `<table><tbody>
        <tr><th><p>Parameter</p></th><th><p>Measurement</p></th><th><p>Gestational age</p></th></tr>
        <tr><td><p>BPD</p></td><td><p>__ mm</p></td><td><p>__ wk __ d</p></td></tr>
        <tr><td><p>HC</p></td><td><p>__ mm</p></td><td><p>__ wk __ d</p></td></tr>
        <tr><td><p>AC</p></td><td><p>__ mm</p></td><td><p>__ wk __ d</p></td></tr>
        <tr><td><p>FL</p></td><td><p>__ mm</p></td><td><p>__ wk __ d</p></td></tr>
      </tbody></table>`,
      s("Average gestational age", "__ weeks __ days."),
      s("Estimated fetal weight", "__ g."),
      s("Placenta", "__, grade __. Not low lying."),
      s("Liquor", "Adequate. AFI __ cm."),
      s("Cervix", "Length __ cm. Internal os closed."),
      s("EDD by USG", "__"),
      impression,
    ].join(""),
  },
  {
    id: "thyroid",
    name: "Thyroid / neck",
    title: "USG NECK (THYROID)",
    html: [
      s("Right lobe", "Measures __ x __ x __ cm. Normal in size and echotexture. No focal nodule."),
      s("Left lobe", "Measures __ x __ x __ cm. Normal in size and echotexture. No focal nodule."),
      s("Isthmus", "Thickness __ mm. Normal."),
      s("Vascularity", "Normal on colour Doppler."),
      s("Lymph nodes", "No significant cervical lymphadenopathy."),
      impression,
    ].join(""),
  },
];
