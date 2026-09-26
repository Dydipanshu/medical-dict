// Whisper uses the prompt as "previous text": it biases spelling, vocabulary and
// style. Keep it short (Whisper only reads the last ~224 tokens).
export const BASE_PROMPT =
  "Ultrasound report. Liver normal in size and echotexture, no intrahepatic biliary radicle dilatation. " +
  "Gall bladder well distended, no calculus. CBD 4 mm, portal vein 11 mm. Right kidney 10.2 x 4.5 cm, " +
  "corticomedullary differentiation maintained, no hydronephrosis. Hepatomegaly, cholelithiasis, " +
  "grade I fatty liver, hypoechoic, hyperechoic, anechoic, heterogeneous, calibre, oedema. " +
  "Endometrial thickness 8 mm. BPD, HC, AC, FL, AFI, CRL, FHR 142 bpm, liquor adequate. Impression:";

export function buildPrompt(customVocabulary = ""): string {
  const extra = customVocabulary.trim();
  // Custom words go last so they sit closest to the audio and are never truncated.
  return extra ? `${BASE_PROMPT} ${extra}` : BASE_PROMPT;
}
