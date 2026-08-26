import { describe, it, expect } from "vitest";
import { getMandiRate, getMandiHistory, normalizeCommodity } from "./mandiEngine";

describe("mandiEngine", () => {
  it("normalizes commodity names", () => {
    expect(normalizeCommodity(" Tomato ")).toBe("tomato");
    expect(normalizeCommodity("Green Chilli")).toBe("green_chilli");
  });

  it("returns a rate for tomato with bundled MandiLens data (no live API key)", async () => {
    const rate = await getMandiRate("Tomato", "Tamil Nadu", "Krishnagiri");
    expect(rate).not.toBeNull();
    expect(rate!.commodity).toBe("Tomato");
    expect(rate!.isLive).toBe(false);
    // Prices must be ₹/kg scale, not ₹/quintal
    expect(rate!.modalPricePerKg).toBeGreaterThan(1);
    expect(rate!.modalPricePerKg).toBeLessThan(500);
    expect(rate!.minPricePerKg).toBeLessThanOrEqual(rate!.modalPricePerKg);
    expect(rate!.maxPricePerKg).toBeGreaterThanOrEqual(rate!.modalPricePerKg);
    expect(rate!.source).toContain("AGMARKNET");
  });

  it("returns a rate for onion in Karnataka via MandiLens", async () => {
    const rate = await getMandiRate("Onion", "Karnataka");
    expect(rate).not.toBeNull();
    expect(rate!.state).toBe("Karnataka");
    expect(rate!.observedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("falls back to static benchmark for uncovered commodity", async () => {
    const rate = await getMandiRate("Groundnut", "Tamil Nadu");
    expect(rate).not.toBeNull();
    expect(rate!.source).toContain("benchmark");
    expect(rate!.modalPricePerKg).toBe(66);
  });

  it("returns null for a commodity with zero coverage", async () => {
    const rate = await getMandiRate("Dragon Fruit", "Tamil Nadu");
    expect(rate).toBeNull();
  });

  it("provides historical observations for forecasting", () => {
    const history = getMandiHistory("Tomato", "Tamil Nadu");
    expect(history.length).toBeGreaterThan(30);
    expect(history[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(history.every((h) => h.pricePerKg > 0)).toBe(true);
    // Dates sorted ascending
    const dates = history.map((h) => h.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("history for unknown commodity/state is empty, not a crash", () => {
    expect(getMandiHistory("Dragon Fruit", "Kerala")).toEqual([]);
  });
});
