import { describe, it, expect } from "vitest";
import {
  getDecayRate,
  evaluateProduceSpoilage,
  prioritizeDispatchWave,
  type PerishableProduce,
} from "./spoilageDecay";

describe("getDecayRate", () => {
  it("assigns higher decay constant to tomato than onion", () => {
    const tomatoRate = getDecayRate("Tomato");
    const onionRate = getDecayRate("Onion");
    expect(tomatoRate).toBeGreaterThan(onionRate * 5);
  });

  it("reduces decay constant when produce is refrigerated", () => {
    const ambient = getDecayRate("Tomato", false);
    const refrigerated = getDecayRate("Tomato", true);
    expect(refrigerated).toBeLessThan(ambient);
    expect(refrigerated).toBeCloseTo(ambient * 0.35, 4);
  });
});

describe("evaluateProduceSpoilage", () => {
  const harvestTime = new Date("2026-08-26T00:00:00Z");

  it("evaluates fresh harvest (0 hours elapsed) with 100% quality and low risk", () => {
    const tomato: PerishableProduce = {
      lotCode: "LOT-TOM-01",
      crop: "Tomato",
      grade: "A",
      totalKg: 500,
      unitPriceInr: 28,
      harvestedAt: harvestTime,
    };
    const evalResult = evaluateProduceSpoilage(tomato, harvestTime);
    expect(evalResult.hoursElapsed).toBe(0);
    expect(evalResult.currentQualityScore).toBe(100);
    expect(evalResult.spoilageRiskLevel).toBe("Low");
    expect(evalResult.estimatedLossInr).toBe(0);
  });

  it("degrades tomato quality after 24 hours of ambient transit", () => {
    const evaluationTime = new Date("2026-08-27T00:00:00Z"); // +24 hours
    const tomato: PerishableProduce = {
      lotCode: "LOT-TOM-01",
      crop: "Tomato",
      grade: "A",
      totalKg: 500,
      unitPriceInr: 28,
      harvestedAt: harvestTime,
    };
    const evalResult = evaluateProduceSpoilage(tomato, evaluationTime);
    expect(evalResult.hoursElapsed).toBe(24);
    // 100 * exp(-0.018 * 24) = ~64.9%
    expect(evalResult.currentQualityScore).toBeLessThan(70);
    expect(evalResult.spoilageRiskLevel).toBe("Critical");
    expect(evalResult.estimatedLossInr).toBeGreaterThan(4000);
  });
});

describe("prioritizeDispatchWave", () => {
  const now = new Date("2026-08-26T12:00:00Z");

  it("ranks urgent high-perishables ahead of shelf-stable commodities", () => {
    const lots: PerishableProduce[] = [
      {
        lotCode: "LOT-ONI-01",
        crop: "Onion",
        grade: "A",
        totalKg: 1000,
        unitPriceInr: 32,
        harvestedAt: new Date("2026-08-25T12:00:00Z"), // 24h old, but low decay
      },
      {
        lotCode: "LOT-TOM-01",
        crop: "Tomato",
        grade: "A",
        totalKg: 600,
        unitPriceInr: 28,
        harvestedAt: new Date("2026-08-26T00:00:00Z"), // 12h old, high decay
      },
      {
        lotCode: "LOT-RIC-01",
        crop: "Rice",
        grade: "FAQ",
        totalKg: 2000,
        unitPriceInr: 26,
        harvestedAt: new Date("2026-08-20T00:00:00Z"), // 6 days old, virtually zero decay
      },
    ];

    const prioritized = prioritizeDispatchWave(lots, now);
    expect(prioritized.length).toBe(3);

    // Rank 1 MUST be Tomato due to shorter remaining shelf life
    expect(prioritized[0].lotCode).toBe("LOT-TOM-01");
    expect(prioritized[0].dispatchUrgencyRank).toBe(1);

    // Rice has the longest shelf life, so rank 3
    expect(prioritized[2].lotCode).toBe("LOT-RIC-01");
    expect(prioritized[2].dispatchUrgencyRank).toBe(3);
  });
});
