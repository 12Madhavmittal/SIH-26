import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  deliveryPlans,
  farmerProfiles,
  impactSnapshots,
  InsertUser,
  lotContributions,
  marketplaceOrders,
  organizationProfiles,
  produceListings,
  traceabilityLots,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
  const listingId = await ensureDemoListing({
    crop: input.crop,
    availableKg: totalKg,
    minOrderKg: 5,
    directPricePerKg: 28,
    marketReferencePerKg: 22.5,
    conventionalPricePerKg: 42,
  });
  if (!listingId) return { stored: false };
  const lotCode = `DEMO-${input.crop.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
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
  return { stored: true, lotCode, totalKg, contributorCount: input.contributions.length };
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
