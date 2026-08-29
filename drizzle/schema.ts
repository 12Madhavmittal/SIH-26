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

/** Escrow accounts for trustless settlement between Buyers, FPOs, and Transporters */
export const escrowAccounts = mysqlTable("escrowAccounts", {
  id: int("id").autoincrement().primaryKey(),
  escrowId: varchar("escrowId", { length: 96 }).notNull().unique(),
  orderId: varchar("orderId", { length: 96 }).notNull(),
  buyerId: varchar("buyerId", { length: 96 }).notNull(),
  fpoId: varchar("fpoId", { length: 96 }).notNull(),
  transporterId: varchar("transporterId", { length: 96 }),
  totalAmountInr: decimal("totalAmountInr", { precision: 12, scale: 2 }).notNull(),
  fpoAmountInr: decimal("fpoAmountInr", { precision: 12, scale: 2 }).notNull(),
  logisticsAmountInr: decimal("logisticsAmountInr", { precision: 12, scale: 2 }).notNull(),
  platformFeeInr: decimal("platformFeeInr", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", [
    "INITIATED",
    "FUNDS_LOCKED",
    "DISPATCH_ADVANCE_RELEASED",
    "DELIVERY_CONFIRMED",
    "SETTLED_COMPLETE",
    "DISPUTED_HOLD",
    "REFUNDED"
  ]).default("INITIATED").notNull(),
  fundLockedAt: timestamp("fundLockedAt"),
  advanceReleasedAt: timestamp("advanceReleasedAt"),
  settledAt: timestamp("settledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("escrow_order_idx").on(table.orderId), index("escrow_status_idx").on(table.status)]);

/** Society & RWA Group Demand Pooling */
export const societyPools = mysqlTable("societyPools", {
  id: int("id").autoincrement().primaryKey(),
  poolId: varchar("poolId", { length: 96 }).notNull().unique(),
  societyName: varchar("societyName", { length: 200 }).notNull(),
  clusterLocation: varchar("clusterLocation", { length: 200 }).notNull(),
  crop: varchar("crop", { length: 120 }).notNull(),
  targetKg: int("targetKg").notNull(),
  currentKg: int("currentKg").default(0).notNull(),
  tier1ThresholdKg: int("tier1ThresholdKg").default(100).notNull(),
  tier2ThresholdKg: int("tier2ThresholdKg").default(250).notNull(),
  tier1DiscountPercent: decimal("tier1DiscountPercent", { precision: 5, scale: 2 }).default("8.00").notNull(),
  tier2DiscountPercent: decimal("tier2DiscountPercent", { precision: 5, scale: 2 }).default("15.00").notNull(),
  basePricePerKg: decimal("basePricePerKg", { precision: 10, scale: 2 }).notNull(),
  currentPricePerKg: decimal("currentPricePerKg", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["OPEN", "TARGET_MET", "DISPATCHED", "DELIVERED", "EXPIRED"]).default("OPEN").notNull(),
  cutoffTime: timestamp("cutoffTime").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("society_crop_idx").on(table.crop), index("society_status_idx").on(table.status)]);

/** Individual orders inside a Society Pool */
export const societyPoolOrders = mysqlTable("societyPoolOrders", {
  id: int("id").autoincrement().primaryKey(),
  poolId: varchar("poolId", { length: 96 }).notNull(),
  residentName: varchar("residentName", { length: 160 }).notNull(),
  flatNumber: varchar("flatNumber", { length: 64 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  quantityKg: int("quantityKg").notNull(),
  pricePerKgAtOrder: decimal("pricePerKgAtOrder", { precision: 10, scale: 2 }).notNull(),
  totalInr: decimal("totalInr", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["PENDING", "PAID_ESCROW", "REFUNDED"]).default("PENDING").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("pool_order_pool_idx").on(table.poolId)]);

/** Dispute & Claims Resolution */
export const orderDisputes = mysqlTable("orderDisputes", {
  id: int("id").autoincrement().primaryKey(),
  disputeId: varchar("disputeId", { length: 96 }).notNull().unique(),
  orderId: varchar("orderId", { length: 96 }).notNull(),
  escrowId: varchar("escrowId", { length: 96 }),
  claimantRole: mysqlEnum("claimantRole", ["buyer", "fpo", "transporter"]).notNull(),
  disputeType: mysqlEnum("disputeType", [
    "TRANSIT_SPOILAGE",
    "WEIGHT_DISCREPANCY",
    "GRADE_MISMATCH",
    "DELAYED_DELIVERY",
    "TEMPERATURE_BREACH"
  ]).notNull(),
  claimedAmountInr: decimal("claimedAmountInr", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  evidenceUrls: text("evidenceUrls"), // JSON serialized string array
  status: mysqlEnum("status", ["OPEN", "UNDER_REVIEW", "RESOLVED_REFUND", "RESOLVED_REJECTED", "SETTLED"]).default("OPEN").notNull(),
  resolutionNotes: text("resolutionNotes"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("dispute_order_idx").on(table.orderId), index("dispute_status_idx").on(table.status)]);

/** Driver Trips, Check-ins and Digital Proof-of-Delivery (e-POD) */
export const driverTrips = mysqlTable("driverTrips", {
  id: int("id").autoincrement().primaryKey(),
  tripCode: varchar("tripCode", { length: 96 }).notNull().unique(),
  driverName: varchar("driverName", { length: 160 }).notNull(),
  vehicleNumber: varchar("vehicleNumber", { length: 64 }).notNull(),
  driverPhone: varchar("driverPhone", { length: 32 }),
  currentStopIndex: int("currentStopIndex").default(0).notNull(),
  totalStops: int("totalStops").notNull(),
  status: mysqlEnum("status", ["SCHEDULED", "IN_TRANSIT", "COMPLETED", "DELAYED"]).default("SCHEDULED").notNull(),
  currentLat: decimal("currentLat", { precision: 10, scale: 6 }),
  currentLng: decimal("currentLng", { precision: 10, scale: 6 }),
  lastGpsUpdate: timestamp("lastGpsUpdate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const proofOfDeliveries = mysqlTable("proofOfDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  podCode: varchar("podCode", { length: 96 }).notNull().unique(),
  tripCode: varchar("tripCode", { length: 96 }).notNull(),
  stopId: varchar("stopId", { length: 96 }).notNull(),
  recipientName: varchar("recipientName", { length: 160 }).notNull(),
  deliveredKg: int("deliveredKg").notNull(),
  conditionGrade: varchar("conditionGrade", { length: 32 }).default("A").notNull(),
  signatureBase64: text("signatureBase64"),
  photoUrl: text("photoUrl"),
  gpsLat: decimal("gpsLat", { precision: 10, scale: 6 }),
  gpsLng: decimal("gpsLng", { precision: 10, scale: 6 }),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
}, (table) => [index("pod_trip_idx").on(table.tripCode)]);

/** IoT Cold-chain Telemetry Logs */
export const coldChainTelemetry = mysqlTable("coldChainTelemetry", {
  id: int("id").autoincrement().primaryKey(),
  sensorId: varchar("sensorId", { length: 96 }).notNull(),
  tripCode: varchar("tripCode", { length: 96 }).notNull(),
  temperatureCelsius: decimal("temperatureCelsius", { precision: 5, scale: 2 }).notNull(),
  humidityPercent: decimal("humidityPercent", { precision: 5, scale: 2 }).notNull(),
  doorOpen: int("doorOpen").default(0).notNull(), // 0 = closed, 1 = open
  batteryPercent: int("batteryPercent").default(100).notNull(),
  isAlertBreached: int("isAlertBreached").default(0).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
}, (table) => [index("telemetry_trip_idx").on(table.tripCode), index("telemetry_sensor_idx").on(table.sensorId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
