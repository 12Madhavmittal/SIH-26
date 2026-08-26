import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "fpo", "logistics"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organizationProfiles = mysqlTable("organizationProfiles", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId"),
  organizationType: mysqlEnum("organizationType", ["farmer", "fpo", "buyer", "logistics"]).notNull(),
  displayName: varchar("displayName", { length: 200 }).notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  verificationReference: varchar("verificationReference", { length: 128 }),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("organization_type_idx").on(table.organizationType)]);

export const farmerProfiles = mysqlTable("farmerProfiles", {
  id: int("id").autoincrement().primaryKey(),
  fpoId: int("fpoId"),
  farmerCode: varchar("farmerCode", { length: 64 }).notNull().unique(),
  harvestCluster: varchar("harvestCluster", { length: 160 }).notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("farmer_fpo_idx").on(table.fpoId)]);

export const produceListings = mysqlTable("produceListings", {
  id: int("id").autoincrement().primaryKey(),
  fpoId: int("fpoId").notNull(),
  crop: varchar("crop", { length: 120 }).notNull(),
  variety: varchar("variety", { length: 120 }),
  grade: varchar("grade", { length: 64 }),
  availableKg: int("availableKg").notNull(),
  minOrderKg: int("minOrderKg").notNull(),
  directPricePerKg: decimal("directPricePerKg", { precision: 10, scale: 2 }).notNull(),
  marketReferencePerKg: decimal("marketReferencePerKg", { precision: 10, scale: 2 }),
  conventionalPricePerKg: decimal("conventionalPricePerKg", { precision: 10, scale: 2 }),
  listingStatus: mysqlEnum("listingStatus", ["draft", "live", "reserved", "sold_out"]).default("draft").notNull(),
  availableFrom: timestamp("availableFrom"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("listing_fpo_idx").on(table.fpoId), index("listing_status_idx").on(table.listingStatus)]);

export const traceabilityLots = mysqlTable("traceabilityLots", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull(),
  fpoId: int("fpoId").notNull(),
  lotCode: varchar("lotCode", { length: 96 }).notNull().unique(),
  totalKg: int("totalKg").notNull(),
  grade: varchar("grade", { length: 64 }),
  packedAt: timestamp("packedAt"),
  lotStatus: mysqlEnum("lotStatus", ["open", "consolidated", "in_transit", "delivered"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("lot_listing_idx").on(table.listingId), index("lot_fpo_idx").on(table.fpoId)]);

export const lotContributions = mysqlTable("lotContributions", {
  id: int("id").autoincrement().primaryKey(),
  lotId: int("lotId").notNull(),
  farmerId: int("farmerId").notNull(),
  contributedKg: int("contributedKg").notNull(),
  grade: varchar("grade", { length: 64 }),
  harvestedAt: timestamp("harvestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("contribution_lot_idx").on(table.lotId), index("contribution_farmer_idx").on(table.farmerId)]);

export const marketplaceOrders = mysqlTable("marketplaceOrders", {
  id: int("id").autoincrement().primaryKey(),
  buyerOrganizationId: int("buyerOrganizationId"),
  listingId: int("listingId").notNull(),
  lotId: int("lotId"),
  quantityKg: int("quantityKg").notNull(),
  totalInr: decimal("totalInr", { precision: 12, scale: 2 }).notNull(),
  buyerType: mysqlEnum("buyerType", ["consumer", "bulk"]).notNull(),
  orderStatus: mysqlEnum("orderStatus", ["placed", "consolidated", "routed", "delivered", "cancelled"]).default("placed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("order_listing_idx").on(table.listingId), index("order_status_idx").on(table.orderStatus)]);

export const deliveryPlans = mysqlTable("deliveryPlans", {
  id: int("id").autoincrement().primaryKey(),
  planCode: varchar("planCode", { length: 96 }).notNull().unique(),
  vehicleType: varchar("vehicleType", { length: 120 }).notNull(),
  capacityKg: int("capacityKg").notNull(),
  plannedLoadKg: int("plannedLoadKg").notNull(),
  baselineKm: decimal("baselineKm", { precision: 10, scale: 2 }).notNull(),
  optimizedKm: decimal("optimizedKm", { precision: 10, scale: 2 }).notNull(),
  estimatedCostInr: decimal("estimatedCostInr", { precision: 12, scale: 2 }).notNull(),
  estimatedEmissionsKg: decimal("estimatedEmissionsKg", { precision: 10, scale: 2 }).notNull(),
  planStatus: mysqlEnum("planStatus", ["draft", "ready", "in_transit", "completed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const impactSnapshots = mysqlTable("impactSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  scope: varchar("scope", { length: 96 }).notNull(),
  directTradeValueInr: decimal("directTradeValueInr", { precision: 12, scale: 2 }).notNull(),
  buyerSavingsInr: decimal("buyerSavingsInr", { precision: 12, scale: 2 }).notNull(),
  farmerIncomeUpliftPercent: decimal("farmerIncomeUpliftPercent", { precision: 6, scale: 2 }).notNull(),
  wasteAvoidedKg: decimal("wasteAvoidedKg", { precision: 10, scale: 2 }).notNull(),
  routeKmAvoided: decimal("routeKmAvoided", { precision: 10, scale: 2 }).notNull(),
  emissionsAvoidedKg: decimal("emissionsAvoidedKg", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("impact_scope_idx").on(table.scope)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
