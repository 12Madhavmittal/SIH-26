import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  coldChainTelemetry,
  deliveryPlans,
  driverTrips,
  escrowAccounts,
  farmerProfiles,
  impactSnapshots,
  InsertUser,
  lotContributions,
  marketplaceOrders,
  orderDisputes,
  organizationProfiles,
  produceListings,
  proofOfDeliveries,
  societyPoolOrders,
  societyPools,
  traceabilityLots,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { generateLotCode, verifyWeights } from "./lotTraceability";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getLiveListings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(produceListings).where(eq(produceListings.listingStatus, "live")).limit(24);
}

type DemoListingInput = {
  crop: string;
  availableKg: number;
  minOrderKg: number;
  directPricePerKg: number;
  marketReferencePerKg: number;
  conventionalPricePerKg: number;
};

const DEMO_FPO_NAME = "Annadata Demo FPO Workspace";

function insertId(result: unknown) {
  const value = (result as { insertId?: number } | [{ insertId?: number }]) as any;
  return Number(Array.isArray(value) ? value[0]?.insertId : value?.insertId);
}

async function ensureDemoFpo() {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await db.select().from(organizationProfiles).where(eq(organizationProfiles.displayName, DEMO_FPO_NAME)).limit(1);
  if (existing[0]) return existing[0].id;
  const result = await db.insert(organizationProfiles).values({
    organizationType: "fpo",
    displayName: DEMO_FPO_NAME,
    verificationStatus: "pending",
    verificationReference: "DEMO-ONBOARDING-RECORD",
    state: "Tamil Nadu",
    district: "Krishnagiri",
  });
  return insertId(result);
}

async function ensureDemoListing(input: DemoListingInput) {
  const db = await getDb();
  const fpoId = await ensureDemoFpo();
  if (!db || !fpoId) return undefined;
  const existing = await db.select().from(produceListings).where(and(eq(produceListings.fpoId, fpoId), eq(produceListings.crop, input.crop))).limit(1);
  if (existing[0]) return existing[0].id;
  const result = await db.insert(produceListings).values({
    fpoId,
    crop: input.crop,
    availableKg: input.availableKg,
    minOrderKg: input.minOrderKg,
    directPricePerKg: String(input.directPricePerKg),
    marketReferencePerKg: String(input.marketReferencePerKg),
    conventionalPricePerKg: String(input.conventionalPricePerKg),
    listingStatus: "live",
  });
  return insertId(result);
}

export async function createDemoListing(input: DemoListingInput) {
  const listingId = await ensureDemoListing(input);
  return { stored: Boolean(listingId), listingId };
}

export async function persistDemoReservation(input: {
  crop: string;
  quantityKg: number;
  totalInr: number;
  buyerType: "consumer" | "bulk";
  directPricePerKg: number;
  marketReferencePerKg: number;
  conventionalPricePerKg: number;
}) {
  const db = await getDb();
  if (!db) return { stored: false };
  const listingId = await ensureDemoListing({
    crop: input.crop,
    availableKg: 10000,
    minOrderKg: 1,
    directPricePerKg: input.directPricePerKg,
    marketReferencePerKg: input.marketReferencePerKg,
    conventionalPricePerKg: input.conventionalPricePerKg,
  });
  if (!listingId) return { stored: false };
  await db.insert(marketplaceOrders).values({
    listingId,
    quantityKg: input.quantityKg,
    totalInr: String(input.totalInr),
    buyerType: input.buyerType,
    orderStatus: "consolidated",
  });
  const existingPlan = await db.select().from(deliveryPlans).where(eq(deliveryPlans.planCode, "SOUTH-CHN-07")).limit(1);
  if (!existingPlan[0]) {
    await db.insert(deliveryPlans).values({
      planCode: "SOUTH-CHN-07",
      vehicleType: "Electric LCV",
      capacityKg: 1200,
      plannedLoadKg: 984,
      baselineKm: "86",
      optimizedKm: "54",
      estimatedCostInr: "1790",
      estimatedEmissionsKg: "15.1",
      planStatus: "ready",
    });
  }
  await db.insert(impactSnapshots).values({
    scope: "demo-reservation",
    directTradeValueInr: String(input.totalInr),
    buyerSavingsInr: String(Math.max(0, (input.conventionalPricePerKg - input.directPricePerKg) * input.quantityKg)),
    farmerIncomeUpliftPercent: "34",
    wasteAvoidedKg: "0",
    routeKmAvoided: "32",
    emissionsAvoidedKg: "9",
  });
  return { stored: true, listingId };
}

export async function assembleDemoLot(input: {
  crop: string;
  grade: string;
  contributions: Array<{ farmerCode: string; harvestCluster: string; contributedKg: number }>;
}) {
  const db = await getDb();
  const fpoId = await ensureDemoFpo();
  if (!db || !fpoId) return { stored: false };
  const totalKg = input.contributions.reduce((sum, item) => sum + item.contributedKg, 0);
  const weightCheck = verifyWeights(input.contributions, totalKg);
  const listingId = await ensureDemoListing({
    crop: input.crop,
    availableKg: totalKg,
    minOrderKg: 5,
    directPricePerKg: 28,
    marketReferencePerKg: 22.5,
    conventionalPricePerKg: 42,
  });
  if (!listingId) return { stored: false };
  const lotCode = generateLotCode({
    fpoCode: "ANN",
    crop: input.crop,
    grade: input.grade,
    totalKg,
  });
  const lotResult = await db.insert(traceabilityLots).values({
    listingId,
    fpoId,
    lotCode,
    totalKg,
    grade: input.grade,
    lotStatus: "consolidated",
  });
  const lotId = insertId(lotResult);
  for (const contribution of input.contributions) {
    let farmer = (await db.select().from(farmerProfiles).where(eq(farmerProfiles.farmerCode, contribution.farmerCode)).limit(1))[0];
    if (!farmer) {
      const farmerResult = await db.insert(farmerProfiles).values({
        fpoId,
        farmerCode: contribution.farmerCode,
        harvestCluster: contribution.harvestCluster,
        verificationStatus: "pending",
      });
      const farmerId = insertId(farmerResult);
      farmer = { id: farmerId } as typeof farmer;
    }
    await db.insert(lotContributions).values({
      lotId,
      farmerId: farmer.id,
      contributedKg: contribution.contributedKg,
      grade: input.grade,
    });
  }
  return { stored: true, lotCode, totalKg, contributorCount: input.contributions.length, weightCheck };
}

export async function lookupLotTraceability(lotCode: string) {
  const db = await getDb();
  if (!db) return { found: false as const, reason: "database-unavailable" };
  const lot = (
    await db.select().from(traceabilityLots).where(eq(traceabilityLots.lotCode, lotCode)).limit(1)
  )[0];
  if (!lot) return { found: false as const, reason: "lot-not-found" };

  const contributions = await db
    .select({
      farmerCode: farmerProfiles.farmerCode,
      harvestCluster: farmerProfiles.harvestCluster,
      contributedKg: lotContributions.contributedKg,
      grade: lotContributions.grade,
      harvestedAt: lotContributions.harvestedAt,
    })
    .from(lotContributions)
    .innerJoin(farmerProfiles, eq(lotContributions.farmerId, farmerProfiles.id))
    .where(eq(lotContributions.lotId, lot.id));

  const listing = (await db.select().from(produceListings).where(eq(produceListings.id, lot.listingId)).limit(1))[0];
  const weightCheck = verifyWeights(
    contributions.map((c) => ({
      farmerCode: c.farmerCode,
      harvestCluster: c.harvestCluster,
      contributedKg: c.contributedKg,
    })),
    lot.totalKg,
  );

  return {
    found: true as const,
    lot: {
      lotCode: lot.lotCode,
      crop: listing?.crop ?? "",
      grade: lot.grade,
      totalKg: lot.totalKg,
      packedAt: lot.packedAt,
      status: lot.lotStatus,
      createdAt: lot.createdAt,
    },
    contributors: contributions,
    weightCheck,
  };
}

export async function getPersistedOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketplaceOrders).limit(100);
}

export async function updatePersistedOrderStatus(orderId: number, orderStatus: "placed" | "consolidated" | "routed" | "delivered" | "cancelled") {
  const db = await getDb();
  if (!db) return { stored: false };
  await db.update(marketplaceOrders).set({ orderStatus }).where(eq(marketplaceOrders.id, orderId));
  return { stored: true };
}

export async function getDeliveryPlanRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveryPlans).limit(100);
}

export async function updateDeliveryPlanStatus(planId: number, planStatus: "draft" | "ready" | "in_transit" | "completed") {
  const db = await getDb();
  if (!db) return { stored: false };
  await db.update(deliveryPlans).set({ planStatus }).where(eq(deliveryPlans.id, planId));
  return { stored: true };
}

export async function getImpactSnapshotRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(impactSnapshots).limit(100);
}

/* ------------------- Escrow Persistence ------------------- */

export async function persistEscrowAccount(input: {
  escrowId: string;
  orderId: string;
  buyerId: string;
  fpoId: string;
  transporterId?: string;
  totalAmountInr: number;
  fpoAmountInr: number;
  logisticsAmountInr: number;
  platformFeeInr?: number;
  status: "INITIATED" | "FUNDS_LOCKED" | "DISPATCH_ADVANCE_RELEASED" | "DELIVERY_CONFIRMED" | "SETTLED_COMPLETE" | "DISPUTED_HOLD" | "REFUNDED";
}) {
  const db = await getDb();
  if (!db) return { stored: false };
  const existing = await db.select().from(escrowAccounts).where(eq(escrowAccounts.escrowId, input.escrowId)).limit(1);
  if (existing[0]) {
    await db.update(escrowAccounts).set({
      status: input.status,
      transporterId: input.transporterId ?? existing[0].transporterId,
      updatedAt: new Date(),
    }).where(eq(escrowAccounts.escrowId, input.escrowId));
    return { stored: true, updated: true };
  }
  await db.insert(escrowAccounts).values({
    escrowId: input.escrowId,
    orderId: input.orderId,
    buyerId: input.buyerId,
    fpoId: input.fpoId,
    transporterId: input.transporterId,
    totalAmountInr: String(input.totalAmountInr),
    fpoAmountInr: String(input.fpoAmountInr),
    logisticsAmountInr: String(input.logisticsAmountInr),
    platformFeeInr: String(input.platformFeeInr ?? 0),
    status: input.status,
    fundLockedAt: input.status === "FUNDS_LOCKED" ? new Date() : undefined,
  });
  return { stored: true, updated: false };
}

export async function getPersistedEscrow(escrowId: string) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.select().from(escrowAccounts).where(eq(escrowAccounts.escrowId, escrowId)).limit(1);
  return res[0] ?? null;
}

/* ------------------- Society Pooling Persistence ------------------- */

export async function persistSocietyPool(input: {
  poolId: string;
  societyName: string;
  clusterLocation: string;
  crop: string;
  targetKg: number;
  currentKg?: number;
  basePricePerKg: number;
  currentPricePerKg: number;
  cutoffTime: Date;
  status?: "OPEN" | "TARGET_MET" | "DISPATCHED" | "DELIVERED" | "EXPIRED";
}) {
  const db = await getDb();
  if (!db) return { stored: false };
  const existing = await db.select().from(societyPools).where(eq(societyPools.poolId, input.poolId)).limit(1);
  if (existing[0]) {
    await db.update(societyPools).set({
      currentKg: input.currentKg ?? existing[0].currentKg,
      currentPricePerKg: String(input.currentPricePerKg),
      status: input.status ?? existing[0].status,
    }).where(eq(societyPools.poolId, input.poolId));
    return { stored: true, updated: true };
  }
  await db.insert(societyPools).values({
    poolId: input.poolId,
    societyName: input.societyName,
    clusterLocation: input.clusterLocation,
    crop: input.crop,
    targetKg: input.targetKg,
    currentKg: input.currentKg ?? 0,
    basePricePerKg: String(input.basePricePerKg),
    currentPricePerKg: String(input.currentPricePerKg),
    cutoffTime: input.cutoffTime,
    status: input.status ?? "OPEN",
  });
  return { stored: true, updated: false };
}

export async function persistSocietyPoolOrder(input: {
  poolId: string;
  residentName: string;
  flatNumber: string;
  phone: string;
  quantityKg: number;
  pricePerKgAtOrder: number;
  totalInr: number;
}) {
  const db = await getDb();
  if (!db) return { stored: false };
  await db.insert(societyPoolOrders).values({
    poolId: input.poolId,
    residentName: input.residentName,
    flatNumber: input.flatNumber,
    phone: input.phone,
    quantityKg: input.quantityKg,
    pricePerKgAtOrder: String(input.pricePerKgAtOrder),
    totalInr: String(input.totalInr),
    paymentStatus: "PAID_ESCROW",
  });
  return { stored: true };
}

export async function getPersistedSocietyPool(poolId: string) {
  const db = await getDb();
  if (!db) return null;
  const pool = (await db.select().from(societyPools).where(eq(societyPools.poolId, poolId)).limit(1))[0];
  if (!pool) return null;
  const orders = await db.select().from(societyPoolOrders).where(eq(societyPoolOrders.poolId, poolId));
  return { ...pool, orders };
}

/* ------------------- Disputes Persistence ------------------- */

export async function persistOrderDispute(input: {
  disputeId: string;
  orderId: string;
  escrowId?: string;
  claimantRole: "buyer" | "fpo" | "transporter";
  disputeType: "TRANSIT_SPOILAGE" | "WEIGHT_DISCREPANCY" | "GRADE_MISMATCH" | "DELAYED_DELIVERY" | "TEMPERATURE_BREACH";
  claimedAmountInr: number;
  description: string;
  evidenceUrls?: string[];
}) {
  const db = await getDb();
  if (!db) return { stored: false };
  await db.insert(orderDisputes).values({
    disputeId: input.disputeId,
    orderId: input.orderId,
    escrowId: input.escrowId,
    claimantRole: input.claimantRole,
    disputeType: input.disputeType,
    claimedAmountInr: String(input.claimedAmountInr),
    description: input.description,
    evidenceUrls: input.evidenceUrls ? JSON.stringify(input.evidenceUrls) : null,
    status: "OPEN",
  });
  return { stored: true };
}

export async function getPersistedDisputes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderDisputes).limit(100);
}

/* ------------------- Driver & Telemetry Persistence ------------------- */

export async function persistProofOfDelivery(input: {
  podCode: string;
  tripCode: string;
  stopId: string;
  recipientName: string;
  deliveredKg: number;
  conditionGrade: string;
  signatureBase64?: string;
  photoUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
}) {
  const db = await getDb();
  if (!db) return { stored: false };
  await db.insert(proofOfDeliveries).values({
    podCode: input.podCode,
    tripCode: input.tripCode,
    stopId: input.stopId,
    recipientName: input.recipientName,
    deliveredKg: input.deliveredKg,
    conditionGrade: input.conditionGrade,
    signatureBase64: input.signatureBase64,
    photoUrl: input.photoUrl,
    gpsLat: input.gpsLat ? String(input.gpsLat) : null,
    gpsLng: input.gpsLng ? String(input.gpsLng) : null,
  });
  return { stored: true };
}

export async function persistTelemetryLog(input: {
  sensorId: string;
  tripCode: string;
  temperatureCelsius: number;
  humidityPercent: number;
  doorOpen: number;
  batteryPercent: number;
  isAlertBreached: number;
}) {
  const db = await getDb();
  if (!db) return { stored: false };
  await db.insert(coldChainTelemetry).values({
    sensorId: input.sensorId,
    tripCode: input.tripCode,
    temperatureCelsius: String(input.temperatureCelsius),
    humidityPercent: String(input.humidityPercent),
    doorOpen: input.doorOpen,
    batteryPercent: input.batteryPercent,
    isAlertBreached: input.isAlertBreached,
  });
  return { stored: true };
}

