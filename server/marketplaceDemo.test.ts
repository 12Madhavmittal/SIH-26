import { describe, expect, it } from "vitest";
import {
  aggregateLot,
  calculatePriceComparison,
  compareRoutePlans,
  createDemoOrder,
  recommendListing,
} from "./marketplaceDemo";

describe("marketplace calculations", () => {
  it("shows buyer savings and farmer uplift without hiding the direct-trade components", () => {
    const result = calculatePriceComparison({
      directBuyerPrice: 28,
      farmerDirectEarnings: 20.5,
      fpoServices: 2.1,
      logistics: 3.4,
      qualityAndPacking: 2,
      conventionalBuyerPrice: 42,
      farmerConventionalEarnings: 13.4,
    });

    expect(result).toEqual({ buyerSavings: 14, farmerUpliftPercent: 53, directFarmerSharePercent: 73 });
  });

  it("keeps each farmer contribution visible when an FPO lot is aggregated", () => {
    const result = aggregateLot([
      { farmerCode: "A", harvestCluster: "X", contributedKg: 120, grade: "A", harvestedOn: "25 Aug" },
      { farmerCode: "B", harvestCluster: "X", contributedKg: 180, grade: "A", harvestedOn: "25 Aug" },
      { farmerCode: "A", harvestCluster: "X", contributedKg: 20, grade: "A", harvestedOn: "25 Aug" },
    ]);

    expect(result).toEqual({ totalKg: 320, distinctFarmers: 2 });
  });

  it("converts demand and supply inputs into an explainable listing recommendation", () => {
    const result = recommendListing({ recentOrdersKg: 440, committedBulkKg: 260, arrivalTrendPercent: -6, plannedSupplyKg: 760 });

    expect(result).toEqual({ forecastKg: 742, recommendedKg: 683, surplusKg: 18, risk: "Balanced" });
  });

  it("reports the distance, cost, emissions, and efficiency gained from the consolidated route", () => {
    const result = compareRoutePlans({
      baselineKm: 86,
      optimizedKm: 54,
      baselineCost: 2650,
      optimizedCost: 1790,
      baselineEmissionsKg: 24.1,
      optimizedEmissionsKg: 15.1,
    });

    expect(result).toEqual({ baselineKm: 86, optimizedKm: 54, kmSaved: 32, costSaved: 860, emissionsSavedKg: 9, routeEfficiencyPercent: 37 });
  });

  it("creates a buyer-ready reservation and puts a bulk buyer into the correct delivery cluster", () => {
    const result = createDemoOrder("tomato-grade-a", 25, "bulk");

    expect(result).toMatchObject({
      listing: "Sun-ripened tomato",
      quantityKg: 25,
      total: 700,
      buyerType: "bulk",
      routedTo: "South Chennai bulk cluster",
    });
  });

  it("rejects a reservation below a traceable lot's stated minimum order", () => {
    expect(() => createDemoOrder("tomato-grade-a", 2, "consumer")).toThrow("Minimum order is 5 kg");
  });
});
