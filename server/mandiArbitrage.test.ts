import { describe, it, expect } from "vitest";
import {
  calculateMultiMandiArbitrage,
  type MandiOption,
} from "./mandiArbitrage";

describe("calculateMultiMandiArbitrage", () => {
  const originHub = { name: "Krishnagiri FPO Hub", lat: 12.5104, lng: 78.2137 };

  const mandis: MandiOption[] = [
    {
      mandiName: "Krishnagiri Uzhavar Sandhai",
      district: "Krishnagiri",
      state: "Tamil Nadu",
      lat: 12.518,
      lng: 78.216,
      modalPricePerKg: 20.0,
      cessPercent: 1.0,
    },
    {
      mandiName: "Kolar APMC Mandi",
      district: "Kolar",
      state: "Karnataka",
      lat: 13.136,
      lng: 78.129,
      modalPricePerKg: 24.5,
      cessPercent: 1.5,
    },
    {
      mandiName: "Chennai Koyambedu Terminal Market",
      district: "Chennai",
      state: "Tamil Nadu",
      lat: 13.069,
      lng: 80.194,
      modalPricePerKg: 31.0,
      cessPercent: 2.0,
    },
  ];

  it("throws when zero mandis are provided", () => {
    expect(() =>
      calculateMultiMandiArbitrage("Tomato", 1000, originHub, [], 28.0)
    ).toThrow("At least one target mandi");
  });

  it("calculates transport and cess deductions across near and distant markets", () => {
    const analysis = calculateMultiMandiArbitrage("Tomato", 1000, originHub, mandis, 28.0);
    expect(analysis.mandiComparisons.length).toBe(3);

    // Koyambedu is further (~230km) so transport cost is significantly higher than local mandi
    const local = analysis.mandiComparisons.find((m) => m.mandiName.includes("Krishnagiri"))!;
    const koyambedu = analysis.mandiComparisons.find((m) => m.mandiName.includes("Koyambedu"))!;

    expect(koyambedu.distanceKm).toBeGreaterThan(200);
    expect(koyambedu.estimatedTransportCostInr).toBeGreaterThan(local.estimatedTransportCostInr);
  });

  it("accurately demonstrates Annadata Direct price advantage over conventional mandi realization", () => {
    // Direct platform offers ₹28/kg farmgate (zero middleman cut)
    const analysis = calculateMultiMandiArbitrage("Tomato", 1000, originHub, mandis, 28.0);

    expect(analysis.directPlatformAdvantage.directPayoutInr).toBe(28000);
    expect(analysis.directPlatformAdvantage.extraEarningVsBestMandiInr).toBeGreaterThan(0);
    expect(analysis.directPlatformAdvantage.recommendedChannel).toBe("ANNADATA_DIRECT");
  });
});
