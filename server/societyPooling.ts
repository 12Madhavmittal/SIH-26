/**
 * Annadata Direct — RWA Apartment Society Demand Pooling Engine
 *
 * Consolidates micro-consumer orders from residents living in the same
 * residential society into a single wholesale bulk drop node.
 *
 * Benefits:
 * 1. Bulk Price Tier: Families unlock wholesale pricing (-15% discount).
 * 2. Logistics Consolidation: Replaces 20 separate delivery stops with 1 central drop.
 * 3. Urban Carbon Avoidance: Cuts last-mile delivery kilometers by ~65%.
 */

export interface SocietyMemberOrder {
  residentName: string;
  flatNumber: string;
  quantityKg: number;
}

export interface SocietyPoolGroup {
  societyId: string;
  societyName: string;
  locality: string;
  city: string;
  dropLat: number;
  dropLng: number;
  crop: string;
  orders: SocietyMemberOrder[];
  totalPooledKg: number;
  targetMinimumKg: number;
  poolStatus: "OPEN" | "TARGET_MET" | "LOCKED_FOR_DISPATCH";
  baseRetailPricePerKg: number;
  discountedPooledPricePerKg: number;
  totalSocietySavingsInr: number;
  lastMileStopsAvoided: number;
}

export function createSocietyPool(input: {
  societyId: string;
  societyName: string;
  locality: string;
  city: string;
  dropLat: number;
  dropLng: number;
  crop: string;
  targetMinimumKg?: number;
  baseRetailPricePerKg: number;
}): SocietyPoolGroup {
  const target = input.targetMinimumKg ?? 200; // 200 kg minimum pool target
  // Society pooling unlocks 15% wholesale discount
  const discounted = Number((input.baseRetailPricePerKg * 0.85).toFixed(2));

  return {
    ...input,
    targetMinimumKg: target,
    orders: [],
    totalPooledKg: 0,
    poolStatus: "OPEN",
    discountedPooledPricePerKg: discounted,
    totalSocietySavingsInr: 0,
    lastMileStopsAvoided: 0,
  };
}

export function addMemberOrderToPool(
  pool: SocietyPoolGroup,
  order: SocietyMemberOrder
): SocietyPoolGroup {
  if (pool.poolStatus === "LOCKED_FOR_DISPATCH") {
    throw new Error("Cannot join a society pool that is locked for dispatch.");
  }

  const updatedOrders = [...pool.orders, order];
  const totalPooledKg = updatedOrders.reduce((s, o) => s + o.quantityKg, 0);

  const priceDiffPerKg = pool.baseRetailPricePerKg - pool.discountedPooledPricePerKg;
  const totalSocietySavingsInr = Math.round(totalPooledKg * priceDiffPerKg);
  const lastMileStopsAvoided = Math.max(0, updatedOrders.length - 1);

  let poolStatus: SocietyPoolGroup["poolStatus"] = pool.poolStatus;
  if (totalPooledKg >= pool.targetMinimumKg) {
    poolStatus = "TARGET_MET";
  }

  return {
    ...pool,
    orders: updatedOrders,
    totalPooledKg,
    totalSocietySavingsInr,
    lastMileStopsAvoided,
    poolStatus,
  };
}
