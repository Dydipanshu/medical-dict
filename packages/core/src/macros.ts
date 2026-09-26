import type { Macro } from "./postprocess.ts";

// Spoken as "insert <name>" (or "macro <name>"). Clinics can add their own in settings.
export const DEFAULT_MACROS: Macro[] = [
  {
    name: "normal liver",
    text: "Liver is normal in size, shape and echotexture. No focal lesion seen. Intrahepatic biliary radicles are not dilated.",
  },
  {
    name: "fatty liver",
    text: "Liver is normal in size and shows diffusely increased echogenicity, suggestive of grade I fatty infiltration. No focal lesion seen.",
  },
  {
    name: "normal gallbladder",
    text: "Gall bladder is well distended. Wall thickness is normal. No calculus or sludge seen within.",
  },
  {
    name: "normal CBD",
    text: "CBD is normal in calibre. Portal vein is normal in calibre.",
  },
  {
    name: "normal pancreas",
    text: "Pancreas is normal in size and echotexture. Pancreatic duct is not dilated.",
  },
  {
    name: "normal spleen",
    text: "Spleen is normal in size and echotexture. No focal lesion seen.",
  },
  {
    name: "normal kidneys",
    text: "Both kidneys are normal in size, shape, position and echotexture. Corticomedullary differentiation is maintained. No calculus or hydronephrosis seen on either side.",
  },
  {
    name: "normal bladder",
    text: "Urinary bladder is well distended. Wall thickness is normal. No calculus or mass seen within.",
  },
  {
    name: "normal prostate",
    text: "Prostate is normal in size and echotexture.",
  },
  {
    name: "normal uterus",
    text: "Uterus is anteverted, normal in size and echotexture. Endometrial echo is central. No focal lesion seen.",
  },
  {
    name: "normal ovaries",
    text: "Both ovaries are normal in size and echotexture. No adnexal mass seen.",
  },
  {
    name: "no free fluid",
    text: "No free fluid seen in the peritoneal cavity.",
  },
  {
    name: "normal thyroid",
    text: "Both lobes of thyroid and isthmus are normal in size and echotexture. No focal nodule seen. Vascularity is normal on colour Doppler.",
  },
  {
    name: "normal study",
    text: "No significant abnormality detected.",
  },
  {
    name: "clinical correlation",
    text: "Kindly correlate clinically.",
  },
];
