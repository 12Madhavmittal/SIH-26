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
  phone?: string;
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

/** In-memory fallback registry of society pools */
const memoryPools = new Map<string, SocietyPoolGroup>();

export function getMemoryPool(poolId: string): SocietyPoolGroup | undefined {
  return memoryPools.get(poolId);
}

export function setMemoryPool(pool: SocietyPoolGroup): void {
  memoryPools.set(pool.societyId, pool);
}

export function calculateTieredDiscount(totalKg: number, basePrice: number): { discountPercent: number; pricePerKg: number } {
  let discountPercent = 0;
  if (totalKg >= 250) {
    discountPercent = 15;
  } else if (totalKg >= 100) {
    discountPercent = 8;
  }
  const pricePerKg = Number((basePrice * (1 - discountPercent / 100)).toFixed(2));
  return { discountPercent, pricePerKg };
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

  const pool: SocietyPoolGroup = {
    ...input,
    targetMinimumKg: target,
    orders: [],
    totalPooledKg: 0,
    poolStatus: "OPEN",
    discountedPooledPricePerKg: discounted,
    totalSocietySavingsInr: 0,
    lastMileStopsAvoided: 0,
  };
  setMemoryPool(pool);
  return pool;
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

  const { pricePerKg: discountedPrice } = calculateTieredDiscount(totalPooledKg, pool.baseRetailPricePerKg);
  const effectivePrice = Math.min(pool.discountedPooledPricePerKg, discountedPrice);
  const priceDiffPerKg = pool.baseRetailPricePerKg - effectivePrice;
  const totalSocietySavingsInr = Math.round(totalPooledKg * priceDiffPerKg);
  const lastMileStopsAvoided = Math.max(0, updatedOrders.length - 1);

  let poolStatus: SocietyPoolGroup["poolStatus"] = pool.poolStatus;
  if (totalPooledKg >= pool.targetMinimumKg) {
    poolStatus = "TARGET_MET";
  }

  const updatedPool: SocietyPoolGroup = {
    ...pool,
    orders: updatedOrders,
    totalPooledKg,
    discountedPooledPricePerKg: effectivePrice,
    totalSocietySavingsInr,
    lastMileStopsAvoided,
    poolStatus,
  };
  setMemoryPool(updatedPool);
  return updatedPool;
}

