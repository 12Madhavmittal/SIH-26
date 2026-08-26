import { describe, it, expect } from "vitest";
import { generateCropForecast, type HistoryPoint } from "./demandForecast";

function syntheticHistory(days: number, basePrice: number, driftPerDay = 0): HistoryPoint[] {
  return Array.from({ length: days }, (_, i) => ({
    date: `2026-08-${String(1 + i).padStart(2, "0")}`,
    pricePerKg: Number((basePrice + i * driftPerDay).toFixed(2)),
    arrivalsTonnes: 10,
  }));
}

describe("generateCropForecast", () => {
  it("returns a graceful limited-data response with empty forecast", () => {
    const f = generateCropForecast("Tomato", "Tamil Nadu", [], 1000);
    expect(f.dataQuality).toBe("none");
    expect(f.weeklyForecast).toHaveLength(0);
    expect(f.decision.action).toBe("BALANCED_LISTING");
  });

  it("produces exactly 7 forecast days for good history", () => {
    const f = generateCropForecast("Tomato", "Tamil Nadu", syntheticHistory(60, 24), 1000);
    expect(f.dataQuality).toBe("good");
    expect(f.weeklyForecast).toHaveLength(7);
    for (const p of f.weeklyForecast) {
      expect(p.lowerBoundPerKg).toBeLessThan(p.predictedPricePerKg);
      expect(p.upperBoundPerKg).toBeGreaterThan(p.predictedPricePerKg);
      expect(p.confidencePercent).toBeGreaterThanOrEqual(60);
      expect(p.confidencePercent).toBeLessThanOrEqual(90);
    }
  });

  it("confidence decreases with horizon", () => {
    const f = generateCropForecast("Onion", "Tamil Nadu", syntheticHistory(60, 30), 800);
    const conf = f.weeklyForecast.map((p) => p.confidencePercent);
    expect(conf[6]).toBeLessThanOrEqual(conf[0]);
  });

  it("falling arrivals trend triggers LIST_IMMEDIATELY when price will drop >6%", () => {
    // Rising arrivals over time -> negative elasticity -> falling price
    const history: HistoryPoint[] = Array.from({ length: 60 }, (_, i) => ({
      date: `2026-07-${String(1 + (i % 28)).padStart(2, "0")}`,
      pricePerKg: 25,
      arrivalsTonnes: 5 + i * 0.5, // strong upward arrival trend
    }));
    const f = generateCropForecast("Tomato", "Tamil Nadu", history, 1000);
    expect(f.arrivalTrendPercent).toBeGreaterThan(20);
    expect(f.decision.action).toBe("LIST_IMMEDIATELY");
    expect(f.decision.recommendedListingKg).toBe(950);
  });

  it("recommended listing kg never exceeds stock", () => {
    const f = generateCropForecast("Potato", "Tamil Nadu", syntheticHistory(40, 20), 500);
    expect(f.decision.recommendedListingKg).toBeLessThanOrEqual(500);
  });

  it("is deterministic — same inputs give identical output", () => {
    const h = syntheticHistory(45, 22, 0.05);
    const fixedDate = new Date("2026-08-26T00:00:00Z");
    const a = generateCropForecast("Tomato", "Tamil Nadu", h, 900, fixedDate);
    const b = generateCropForecast("Tomato", "Tamil Nadu", h, 900, fixedDate);
    expect(a).toEqual(b);
  });
});
