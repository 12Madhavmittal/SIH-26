import { describe, it, expect, beforeEach } from "vitest";
import {
  createSocietyPool,
  addMemberOrderToPool,
  type SocietyPoolGroup,
} from "./societyPooling";

describe("createSocietyPool", () => {
  it("initializes an open society pool with 15% wholesale discount", () => {
    const pool = createSocietyPool({
      societyId: "SOC-ADYAR-01",
      societyName: "Adyar Palm Meadows RWA",
      locality: "Adyar",
      city: "Chennai",
      dropLat: 12.9906,
      dropLng: 80.2206,
      crop: "Tomato",
      baseRetailPricePerKg: 28.0,
      targetMinimumKg: 200,
    });

    expect(pool.poolStatus).toBe("OPEN");
    expect(pool.discountedPooledPricePerKg).toBe(23.8); // 28 * 0.85
    expect(pool.totalPooledKg).toBe(0);
    expect(pool.orders.length).toBe(0);
  });
});

describe("addMemberOrderToPool", () => {
  let pool: SocietyPoolGroup;

  beforeEach(() => {
    pool = createSocietyPool({
      societyId: "SOC-ADYAR-01",
      societyName: "Adyar Palm Meadows RWA",
      locality: "Adyar",
      city: "Chennai",
      dropLat: 12.9906,
      dropLng: 80.2206,
      crop: "Tomato",
      baseRetailPricePerKg: 28.0,
      targetMinimumKg: 100,
    });
  });

  it("accumulates orders and unlocks TARGET_MET when threshold is crossed", () => {
    pool = addMemberOrderToPool(pool, { residentName: "Priya", flatNumber: "A-102", quantityKg: 40 });
    expect(pool.poolStatus).toBe("OPEN");
    expect(pool.totalPooledKg).toBe(40);
    expect(pool.lastMileStopsAvoided).toBe(0);

    pool = addMemberOrderToPool(pool, { residentName: "Vikram", flatNumber: "B-404", quantityKg: 70 });
    expect(pool.totalPooledKg).toBe(110);
    expect(pool.poolStatus).toBe("TARGET_MET"); // >= 100 kg
    expect(pool.lastMileStopsAvoided).toBe(1); // 2 orders into 1 drop
    expect(pool.totalSocietySavingsInr).toBeGreaterThan(400);
  });

  it("throws if adding order to locked pool", () => {
    pool.poolStatus = "LOCKED_FOR_DISPATCH";
    expect(() =>
      addMemberOrderToPool(pool, { residentName: "Rohan", flatNumber: "C-201", quantityKg: 20 })
    ).toThrow("locked for dispatch");
  });
});
