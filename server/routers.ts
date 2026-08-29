import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import {
  assembleDemoLot,
  createDemoListing,
  getDeliveryPlanRecords,
  getImpactSnapshotRecords,
  getPersistedOrders,
  persistDemoReservation,
  updateDeliveryPlanStatus,
  lookupLotTraceability,
  updatePersistedOrderStatus,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createDemoOrder, demoListings, demoMarketplace } from "./marketplaceDemo";
import { optimizeWave } from "./logisticsEngine";
import { getMandiHistory, getMandiRate } from "./integrations/mandiEngine";
import { generateCropForecast } from "./demandForecast";
import { parseVoiceListing } from "./voiceListing";
import { clusterGeoPoints } from "./geoClustering";
import { evaluateProduceSpoilage, prioritizeDispatchWave } from "./spoilageDecay";
import { calculateMultiMandiArbitrage } from "./mandiArbitrage";
import { fetchRouteGeometry } from "./routeGeometry";
import { buildQrProvenancePayload, generateQrSvgString } from "./qrGenerator";
import { createEscrowAccount, transitionEscrowState, type EscrowState } from "./escrowEngine";
import { createSocietyPool, addMemberOrderToPool, type SocietyMemberOrder } from "./societyPooling";
import { formatOndcCatalog } from "./ondc/protocol";
import { createDisputeClaim, evaluateAutomatedResolution, getAllDisputes, resolveDisputeClaim } from "./disputeEngine";
import { getActiveAlerts, getTripTelemetry, recordTelemetryReading } from "./telemetryEngine";
import { fetchHarvestWeather } from "./weatherEngine";
import { getDispatchedNotifications, sendNotification } from "./notificationEngine";
import {
  persistEscrowAccount,
  persistOrderDispute,
  persistProofOfDelivery,
  persistSocietyPool,
  persistSocietyPoolOrder,
  persistTelemetryLog,
} from "./db";

const fpoProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "fpo") {
    throw new TRPCError({ code: "FORBIDDEN", message: "FPO workflow access is required for this action." });
  }
  return next();
});

const logisticsProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "logistics") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Logistics workflow access is required for this action." });
  }
  return next();
});

const operationsProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "fpo" && ctx.user.role !== "logistics") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Operations workflow access is required for this action." });
  }
  return next();
});

const listingInput = z.object({
  crop: z.string().min(2).max(120),
  availableKg: z.number().int().positive().max(100000),
  minOrderKg: z.number().int().positive().max(100000),
  directPricePerKg: z.number().positive().max(100000),
  marketReferencePerKg: z.number().positive().max(100000),
  conventionalPricePerKg: z.number().positive().max(100000),
});

const lotInput = z.object({
  crop: z.string().min(2).max(120),
  grade: z.string().min(1).max(64),
  contributions: z.array(z.object({ farmerCode: z.string().min(2).max(64), harvestCluster: z.string().min(2).max(160), contributedKg: z.number().int().positive().max(100000) })).min(1).max(30),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  marketplace: router({
    demo: publicProcedure.query(() => demoMarketplace),
    reserveDemoOrder: publicProcedure
      .input(
        z.object({
          listingId: z.string().min(1),
          quantityKg: z.number().int().positive(),
          buyerType: z.enum(["consumer", "bulk"]),
        })
      )
      .mutation(async ({ input }) => {
        const order = createDemoOrder(input.listingId, input.quantityKg, input.buyerType);
        const listing = demoListings.find((item) => item.id === input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
        const persistence = await persistDemoReservation({
          crop: listing.crop,
          quantityKg: input.quantityKg,
          totalInr: order.total,
          buyerType: input.buyerType,
          directPricePerKg: listing.price.directBuyerPrice,
          marketReferencePerKg: listing.marketReference.pricePerKg,
          conventionalPricePerKg: listing.price.conventionalBuyerPrice,
        });
        return { ...order, persistence };
      }),
  }),
  fpo: router({
    demoCreateListing: publicProcedure.input(listingInput).mutation(({ input }) => createDemoListing(input)),
    createListing: fpoProcedure.input(listingInput).mutation(({ input }) => createDemoListing(input)),
    demoAssembleLot: publicProcedure.input(lotInput).mutation(({ input }) => assembleDemoLot(input)),
    assembleLot: fpoProcedure.input(lotInput).mutation(({ input }) => assembleDemoLot(input)),
  }),
  operations: router({
    orders: operationsProcedure.query(() => getPersistedOrders()),
    updateOrderStatus: logisticsProcedure
      .input(z.object({ orderId: z.number().int().positive(), orderStatus: z.enum(["placed", "consolidated", "routed", "delivered", "cancelled"]) }))
      .mutation(({ input }) => updatePersistedOrderStatus(input.orderId, input.orderStatus)),
    deliveryPlans: logisticsProcedure.query(() => getDeliveryPlanRecords()),
    updateDeliveryPlanStatus: logisticsProcedure
      .input(z.object({ planId: z.number().int().positive(), planStatus: z.enum(["draft", "ready", "in_transit", "completed"]) }))
      .mutation(({ input }) => updateDeliveryPlanStatus(input.planId, input.planStatus)),
    impactSnapshots: operationsProcedure.query(() => getImpactSnapshotRecords()),
    optimizeWave: operationsProcedure
      .input(
        z.object({
          nodes: z
            .array(
              z.object({
                id: z.string().min(1),
                name: z.string().min(1),
                lat: z.number().min(-90).max(90),
                lng: z.number().min(-180).max(180),
                demandKg: z.number(),
              }),
            )
            .min(3)
            .max(25),
          vehicleCapacityKg: z.number().int().positive().max(10000).default(1200),
          maxVehicles: z.number().int().positive().max(8).default(4),
        }),
      )
      .mutation(async ({ input }) => optimizeWave(input.nodes, input)),
    demandForecast: publicProcedure
      .input(
        z.object({
          commodity: z.string().min(2).max(120),
          state: z.string().min(2).max(100).default("Tamil Nadu"),
          currentStockKg: z.number().int().positive().max(100000).default(1000),
        }),
      )
      .query(({ input }) =>
        generateCropForecast(
          input.commodity,
          input.state,
          getMandiHistory(input.commodity, input.state).map((h) => ({
            date: h.date,
            pricePerKg: h.pricePerKg,
            arrivalsTonnes: h.arrivalsTonnes,
          })),
          input.currentStockKg,
        ),
      ),
    mandiRate: publicProcedure
      .input(
        z.object({
          commodity: z.string().min(2).max(120),
          state: z.string().min(2).max(100).default("Tamil Nadu"),
          district: z.string().max(100).optional(),
        }),
      )
      .query(async ({ input }) => getMandiRate(input.commodity, input.state, input.district)),
    traceLot: publicProcedure
      .input(z.object({ lotCode: z.string().min(5).max(96) }))
      .query(async ({ input }) => {
        const result = await lookupLotTraceability(input.lotCode);
        return result;
      }),
    qrProvenance: publicProcedure
      .input(
        z.object({
          lotCode: z.string(),
          crop: z.string(),
          grade: z.string().default("A"),
          totalKg: z.number().default(500),
          originHub: z.string().default("Krishnagiri FPO Hub"),
        })
      )
      .query(({ input }) => {
        const payload = buildQrProvenancePayload(input);
        const qrSvg = generateQrSvgString(payload.verificationUrl);
        return { payload, qrSvg };
      }),
    createEscrow: publicProcedure
      .input(
        z.object({
          orderId: z.string(),
          totalAmountInr: z.number().positive(),
          farmerUpiId: z.string().optional(),
        })
      )
      .mutation(({ input }) => createEscrowAccount(input)),
    transitionEscrow: publicProcedure
      .input(
        z.object({
          account: z.any(),
          nextState: z.enum([
            "INITIATED",
            "FUNDS_LOCKED",
            "DISPATCH_ADVANCE_RELEASED",
            "SETTLED_COMPLETE",
            "REFUNDED",
          ]),
        })
      )
      .mutation(({ input }) => transitionEscrowState(input.account, input.nextState as EscrowState)),
    createSocietyPool: publicProcedure
      .input(
        z.object({
          societyId: z.string(),
          societyName: z.string(),
          locality: z.string(),
          city: z.string().default("Chennai"),
          dropLat: z.number().default(12.9906),
          dropLng: z.number().default(80.2206),
          crop: z.string(),
          targetMinimumKg: z.number().default(200),
          baseRetailPricePerKg: z.number().default(28),
        })
      )
      .mutation(({ input }) => createSocietyPool(input)),
    addOrderToSocietyPool: publicProcedure
      .input(
        z.object({
          pool: z.any(),
          order: z.object({
            residentName: z.string(),
            flatNumber: z.string(),
            quantityKg: z.number().positive(),
          }),
        })
      )
      .mutation(({ input }) => addMemberOrderToPool(input.pool, input.order)),
    exportOndcCatalog: publicProcedure
      .input(
        z.object({
          district: z.string().default("Krishnagiri"),
        })
      )
      .query(({ input }) => formatOndcCatalog(demoListings, "Krishnagiri Harvest Collective FPO", input.district)),
    parseVoiceListing: publicProcedure
      .input(z.object({ transcript: z.string().min(1).max(1000) }))
      .mutation(({ input }) => parseVoiceListing(input.transcript)),
    routeGeometry: operationsProcedure
      .input(
        z.object({
          waypoints: z
            .array(
              z.object({
                lat: z.number().min(-90).max(90),
                lng: z.number().min(-180).max(180),
              })
            )
            .min(2)
            .max(25),
        })
      )
      .query(({ input }) => fetchRouteGeometry(input.waypoints)),
    clusterGeoNodes: operationsProcedure
      .input(
        z.object({
          points: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              lat: z.number().min(-90).max(90),
              lng: z.number().min(-180).max(180),
              demandKg: z.number().optional(),
            })
          ),
          maxRadiusKm: z.number().positive().default(25.0),
        })
      )
      .query(({ input }) => clusterGeoPoints(input.points, input.maxRadiusKm)),
    evaluateSpoilagePriority: operationsProcedure
      .input(
        z.object({
          lots: z.array(
            z.object({
              lotCode: z.string(),
              crop: z.string(),
              grade: z.string().default("A"),
              totalKg: z.number().positive(),
              unitPriceInr: z.number().positive(),
              harvestedAt: z.string(),
              isRefrigerated: z.boolean().optional(),
            })
          ),
        })
      )
      .query(({ input }) => prioritizeDispatchWave(input.lots)),
    mandiArbitrageMatrix: publicProcedure
      .input(
        z.object({
          commodity: z.string(),
          quantityKg: z.number().positive().default(1000),
          originHub: z.object({
            name: z.string().default("Krishnagiri FPO Hub"),
            lat: z.number().default(12.5104),
            lng: z.number().default(78.2137),
          }),
          directAppOfferPerKg: z.number().positive().default(28.0),
          mandis: z
            .array(
              z.object({
                mandiName: z.string(),
                district: z.string(),
                state: z.string(),
                lat: z.number(),
                lng: z.number(),
                modalPricePerKg: z.number().positive(),
                cessPercent: z.number().optional(),
              })
            )
            .min(1),
        })
      )
      .query(({ input }) =>
        calculateMultiMandiArbitrage(
          input.commodity,
          input.quantityKg,
          input.originHub,
          input.mandis,
          input.directAppOfferPerKg
        )
      ),

    /* ------------------- Driver, Telemetry & e-POD ------------------- */

    getDriverActiveTrip: publicProcedure
      .input(z.object({ tripCode: z.string().default("TRIP-CHN-07") }))
      .query(({ input }) => {
        return {
          tripCode: input.tripCode,
          driverName: "Murugan Selvam",
          vehicleNumber: "TN 24 AE 8812 (Electric Reefer LCV)",
          capacityKg: 1200,
          currentLoadKg: 780,
          status: "IN_TRANSIT" as const,
          stops: [
            { id: "depot", name: "Krishnagiri FPO Hub", type: "depot", status: "COMPLETED", lat: 12.5104, lng: 78.2137, demandKg: 0 },
            { id: "farm-1", name: "Ramesh Farmer Pickup", type: "farm", status: "COMPLETED", lat: 12.5500, lng: 78.1500, demandKg: 450 },
            { id: "farm-2", name: "Murugan Farmer Pickup", type: "farm", status: "COMPLETED", lat: 12.4800, lng: 78.2800, demandKg: 330 },
            { id: "buyer-1", name: "Prestige RWA Society Hub", type: "buyer", status: "NEXT_STOP", lat: 12.9906, lng: 80.2206, demandKg: -400 },
            { id: "buyer-2", name: "UrbanFresh Chennai Store", type: "buyer", status: "PENDING", lat: 13.0150, lng: 80.2600, demandKg: -380 },
            { id: "depot-return", name: "Return to Krishnagiri Depot", type: "return", status: "PENDING", lat: 12.5104, lng: 78.2137, demandKg: 0 },
          ],
        };
      }),

    submitProofOfDelivery: publicProcedure
      .input(
        z.object({
          tripCode: z.string(),
          stopId: z.string(),
          recipientName: z.string(),
          deliveredKg: z.number().positive(),
          conditionGrade: z.string().default("Grade A"),
          signatureBase64: z.string().optional(),
          gpsLat: z.number().optional(),
          gpsLng: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const podCode = `POD-${Date.now()}`;
        await persistProofOfDelivery({
          podCode,
          tripCode: input.tripCode,
          stopId: input.stopId,
          recipientName: input.recipientName,
          deliveredKg: input.deliveredKg,
          conditionGrade: input.conditionGrade,
          signatureBase64: input.signatureBase64,
          gpsLat: input.gpsLat,
          gpsLng: input.gpsLng,
        });

        // Trigger notification
        await sendNotification({
          recipientPhone: "+919876543210",
          recipientRole: "buyer",
          template: "PAYOUT_CREDITED",
          variables: {
            amount: input.deliveredKg * 28,
            upiId: "farmer.ramesh@okaxis",
            lotCode: "LOT-TOM-260829-A",
          },
        });

        return { success: true, podCode, message: "Proof-of-Delivery recorded and verified." };
      }),

    getLiveTelemetry: publicProcedure
      .input(z.object({ tripCode: z.string().default("TRIP-CHN-07") }))
      .query(({ input }) => {
        return {
          telemetryTimeline: getTripTelemetry(input.tripCode),
          activeAlerts: getActiveAlerts(),
        };
      }),

    /* ------------------- Weather & Agro Harvest ------------------- */

    harvestWeatherForecast: publicProcedure
      .input(
        z.object({
          lat: z.number().default(12.5104),
          lng: z.number().default(78.2137),
          locationName: z.string().default("Krishnagiri Farmer Cluster"),
        })
      )
      .query(({ input }) => fetchHarvestWeather(input.lat, input.lng, input.locationName)),

    /* ------------------- Disputes & Claims ------------------- */

    raiseDispute: publicProcedure
      .input(
        z.object({
          orderId: z.string(),
          escrowId: z.string().optional(),
          claimantRole: z.enum(["buyer", "fpo", "transporter"]),
          disputeType: z.enum([
            "TRANSIT_SPOILAGE",
            "WEIGHT_DISCREPANCY",
            "GRADE_MISMATCH",
            "DELAYED_DELIVERY",
            "TEMPERATURE_BREACH",
          ]),
          claimedAmountInr: z.number().positive(),
          description: z.string().min(5),
          evidenceUrls: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const claim = createDisputeClaim(input);
        await persistOrderDispute({ ...input, disputeId: claim.disputeId });
        const autoEval = evaluateAutomatedResolution(claim);
        return { claim, autoEval };
      }),

    listDisputes: publicProcedure.query(() => getAllDisputes()),

    resolveDispute: operationsProcedure
      .input(
        z.object({
          disputeId: z.string(),
          status: z.enum(["RESOLVED_REFUND", "RESOLVED_REJECTED", "SETTLED"]),
          notes: z.string(),
        })
      )
      .mutation(({ input }) => {
        return resolveDisputeClaim(input.disputeId, { status: input.status, notes: input.notes });
      }),
  }),
});

export type AppRouter = typeof appRouter;
