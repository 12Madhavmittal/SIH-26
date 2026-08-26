/**
 * Annadata Direct — Vernacular Voice Listing Parser
 *
 * Converts transcribed farmer speech into a structured draft listing.
 * Supports Hinglish/Hindi word forms, Tamil transliterations, and English.
 * Deterministic rule-based extraction (number units, crop keywords, grade
 * keywords) so it works offline with zero LLM dependency.
 */

export interface ParsedListing {
  crop: string | null;
  quantityKg: number | null;
  grade: string;
  harvestCluster: string | null;
  confidence: "high" | "medium" | "low";
  matchedPhrases: string[];
}

// Number words across Hindi (transliterated), Tamil (transliterated), English.
const NUMBER_WORDS: Record<string, number> = {
  // Hindi
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, panch: 5, paanch: 5, chah: 6, cheh: 6,
  saat: 7, ath: 8, nau: 9, das: 10, bees: 20, tees: 30, chaudas: 40, pachas: 50,
  saau: 100, hazaar: 1000,
  // Tamil transliteration
  onru: 1, irandu: 2, moonru: 3, naalu: 4, anju: 5, aaru: 6, ezhu: 7, ettu: 8,
  onbadu: 9, pattu: 10, nooru: 100, aayiram: 1000,
};

const CROP_KEYWORDS: Record<string, string[]> = {
  tomato: ["tamatar", "thakkali", "tomato", "tomatoes"],
  onion: ["pyaz", "pyaaz", "onion", "onions", "vengayam"],
  potato: ["aloo", "aalu", "potato", "potatoes", "urulai"],
  banana: ["kela", "kele", "banana", "bananas", "vazhai"],
  rice: ["chawal", "dhaan", "rice", "paddy", "arisi"],
  wheat: ["gehu", "wheat", "godhumai"],
  chilli: ["mirchi", "mirch", "chilli", "chilies", "milagai"],
  groundnut: ["moongfali", "groundnut", "groundnuts", "verkusenellu"],
};

const UNIT_PATTERNS = [
  { unit: "kg", regex: /(\d+)\s*(?:kg|kgs|kilogram(?:s)?|kilo(?:s)?)\b/i },
  { unit: "quintal", regex: /(\d+)\s*(?:quintal|quintals|kvintal)\b/i },
  { unit: "tonne", regex: /(\d+)\s*(?:ton|tons|tonne|tonnes)\b/i },
];

const GRADE_PATTERNS: { grade: string; regex: RegExp }[] = [
  { grade: "A", regex: /\b(?:a[- ]?grade|grade[- ]?a|best quality|badhiya|accha quality)\b/i },
  { grade: "B", regex: /\b(?:b[- ]?grade|grade[- ]?b|average quality|theek quality)\b/i },
  { grade: "Organic", regex: /\b(?:organic|jaivik|desi kheti)\b/i },
];

function extractQuantity(text: string): { kg: number | null; phrase: string | null } {
  for (const { unit, regex } of UNIT_PATTERNS) {
    const m = text.match(regex);
    if (m) {
      const n = Number(m[1]);
      const factor = unit === "quintal" ? 100 : unit === "tonne" ? 1000 : 1;
      return { kg: n * factor, phrase: m[0] };
    }
  }
  return { kg: null, phrase: null };
}

function extractNumberWordQuantity(text: string): { kg: number | null; phrase: string | null } {
  // Pattern like "do sau kilo" (two hundred kilos) handled by scanning pairs.
  const words = text.toLowerCase().split(/[\s,]+/);
  let value: number | null = null;
  let consumed: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w in NUMBER_WORDS) {
      const next = words[i + 1];
      const nextNext = words[i + 2];
      if ((next === "sau" || next === "nooru") && nextNext && (nextNext.includes("kg") || nextNext.includes("kilo"))) {
        value = NUMBER_WORDS[w] * 100;
        consumed = [w, next, nextNext];
        break;
      }
      if (next && (next.startsWith("kg") || next.startsWith("kilo"))) {
        value = NUMBER_WORDS[w];
        consumed = [w, next];
        break;
      }
      // e.g., "das hazaar kg" = 10,000
      if (next === "hazaar" && nextNext?.startsWith("kg")) {
        value = NUMBER_WORDS[w] * 1000;
        consumed = [w, next, nextNext];
        break;
      }
    }
  }
  return value === null ? { kg: null, phrase: null } : { kg: value, phrase: consumed.join(" ") };
}

function extractCrop(text: string): { crop: string | null; phrase: string | null } {
  const lower = text.toLowerCase();
  for (const [crop, keywords] of Object.entries(CROP_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return { crop, phrase: kw };
    }
  }
  return { crop: null, phrase: null };
}

function extractGrade(text: string): { grade: string; phrase: string | null } {
  for (const { grade, regex } of GRADE_PATTERNS) {
    const m = text.match(regex);
    if (m) return { grade, phrase: m[0] };
  }
  return { grade: "A", phrase: null }; // default assumption
}

function extractCluster(text: string): { cluster: string | null; phrase: string | null } {
  // Match "<ProperNoun> cluster|gaon|village|area" directly; prepositions are
  // unreliable in Hinglish word order.
  const m = text.match(/([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:cluster|gaon|village|area)\b/);
  if (m) return { cluster: m[1], phrase: m[0] };
  return { cluster: null, phrase: null };
}

export function parseVoiceListing(transcript: string): ParsedListing {
  const matchedPhrases: string[] = [];
  const numeric = extractQuantity(transcript);
  if (numeric.kg !== null) matchedPhrases.push(numeric.phrase!);

  const wordQty = numeric.kg === null ? extractNumberWordQuantity(transcript) : { kg: null, phrase: null };
  if (wordQty.kg !== null) matchedPhrases.push(wordQty.phrase!);

  const cropHit = extractCrop(transcript);
  if (cropHit.crop) matchedPhrases.push(cropHit.phrase!);

  const gradeHit = extractGrade(transcript);
  if (gradeHit.phrase) matchedPhrases.push(gradeHit.phrase);

  const clusterHit = extractCluster(transcript);
  if (clusterHit.cluster) matchedPhrases.push(clusterHit.phrase!);

  const quantityKg = numeric.kg ?? wordQty.kg;

  let confidence: ParsedListing["confidence"] = "low";
  const signals = (cropHit.crop ? 1 : 0) + (quantityKg !== null ? 1 : 0);
  if (signals === 2) confidence = "high";
  else if (signals === 1) confidence = "medium";

  return {
    crop: cropHit.crop,
    quantityKg,
    grade: gradeHit.grade,
    harvestCluster: clusterHit.cluster,
    confidence,
    matchedPhrases,
  };
}
