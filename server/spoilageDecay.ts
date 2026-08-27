/**
 * Annadata Direct — Perishable Shelf-Life Spoilage & Dispatch Priority Engine
 *
 * Implements exponential decay kinetics for agricultural produce:
 *   Quality(t) = Q_0 * e^(-k * t)
 *
 * where:
 *   - Q_0: Initial quality index (100.0) at harvest
 *   - k: Crop-specific deterioration constant (per hour)
 *   - t: Elapsed time in hours since harvest / cold storage exit
 *
 * Calculates:
 * 1. Remaining shelf-life in hours before dropping below marketable threshold (e.g., Q < 70%).
 * 2. Economic spoilage risk penalty (₹/kg value loss).
 * 3. Priority ranking for dispatch wave sequencing (highest deterioration risk dispatched first).
 */

export interface PerishableProduce {
  lotCode: string;
  crop: string;
  grade: "A" | "B" | "Organic" | string;
  totalKg: number;
  unitPriceInr: number;
  harvestedAt: Date | string;
  isRefrigerated?: boolean;
}

export interface SpoilageEvaluation {
  lotCode: string;
  crop: string;
  hoursElapsed: number;
  currentQualityScore: number; // 0 to 100
  decayRatePerHour: number;
  remainingShelfLifeHours: number;
  spoilageRiskLevel: "Critical" | "High" | "Moderate" | "Low";
  estimatedLossInr: number;
  dispatchUrgencyRank: number; // Lower number = higher priority
}

// Deterioration constant 'k' (per hour at ambient tropical temperature ~28-32°C)
const BASE_DECAY_RATES: Record<string, number> = {
  tomato: 0.018,       // ~48-72h shelf life
  strawberry: 0.045,   // ~24h shelf life
  banana: 0.015,       // ~4-5 days shelf life
  green_chilli: 0.012, // ~5-6 days
  onion: 0.0015,       // Months shelf life (very stable)
  potato: 0.0012,      // Months shelf life (very stable)
  groundnut: 0.0008,   // Dry commodity
  rice: 0.0002,        // Dry grain
  wheat: 0.0002,       // Dry grain
};

const DEFAULT_DECAY_RATE = 0.010;
const MIN_MARKETABLE_QUALITY = 70.0; // below 70, considered degraded/discounted

export function getDecayRate(crop: string, isRefrigerated: boolean = false): number {
  const key = crop.trim().toLowerCase().replace(/\s+/g, "_");
  const baseRate = BASE_DECAY_RATES[key] ?? DEFAULT_DECAY_RATE;
  // Cold storage reduces enzymatic and microbial decay by ~65%
  return isRefrigerated ? baseRate * 0.35 : baseRate;
}

export function evaluateProduceSpoilage(
  produce: PerishableProduce,
  evaluatedAt: Date = new Date()
): SpoilageEvaluation {
  const harvestDate = typeof produce.harvestedAt === "string" ? new Date(produce.harvestedAt) : produce.harvestedAt;
  const elapsedMs = Math.max(0, evaluatedAt.getTime() - harvestDate.getTime());
  const hoursElapsed = Number((elapsedMs / (1000 * 60 * 60)).toFixed(1));

  const k = getDecayRate(produce.crop, produce.isRefrigerated);

  // Quality(t) = 100 * e^(-k * t)
  const quality = Number((100 * Math.exp(-k * hoursElapsed)).toFixed(1));

  // Time remaining until Quality drops to MIN_MARKETABLE_QUALITY (70)
  // 70 = 100 * e^(-k * t_limit)  =>  t_limit = -ln(0.7) / k
  const maxMarketableHours = -Math.log(MIN_MARKETABLE_QUALITY / 100) / k;
  const remainingHours = Number(Math.max(0, maxMarketableHours - hoursElapsed).toFixed(1));

  let riskLevel: SpoilageEvaluation["spoilageRiskLevel"] = "Low";
  if (quality < 70) riskLevel = "Critical";
  else if (quality < 80) riskLevel = "High";
  else if (quality < 90) riskLevel = "Moderate";

  // Financial value loss: Value * (1 - Q(t) / 100)
  const totalLotValue = produce.totalKg * produce.unitPriceInr;
  const estimatedLossInr = Math.round(totalLotValue * Math.max(0, 1 - quality / 100));

  return {
    lotCode: produce.lotCode,
    crop: produce.crop,
    hoursElapsed,
    currentQualityScore: quality,
    decayRatePerHour: Number(k.toFixed(4)),
    remainingShelfLifeHours: remainingHours,
    spoilageRiskLevel: riskLevel,
    estimatedLossInr,
    dispatchUrgencyRank: 0, // Assigned during batch sorting
  };
}

/**
 * Prioritizes a batch of lots for dispatch so that the highest perishable risks
 * are scheduled in earlier delivery waves.
 */
export function prioritizeDispatchWave(
  lots: PerishableProduce[],
  evaluatedAt: Date = new Date()
): SpoilageEvaluation[] {
  const evaluations = lots.map((l) => evaluateProduceSpoilage(l, evaluatedAt));

  // Sort: Lowest remaining shelf life first, then lowest quality score
  evaluations.sort((a, b) => {
    if (a.remainingShelfLifeHours !== b.remainingShelfLifeHours) {
      return a.remainingShelfLifeHours - b.remainingShelfLifeHours;
    }
    return a.currentQualityScore - b.currentQualityScore;
  });

  // Assign 1-indexed ranks
  return evaluations.map((item, idx) => ({
    ...item,
    dispatchUrgencyRank: idx + 1,
  }));
}
