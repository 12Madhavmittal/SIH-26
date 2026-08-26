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
    parseVoiceListing: publicProcedure
      .input(z.object({ transcript: z.string().min(1).max(1000) }))
      .mutation(({ input }) => parseVoiceListing(input.transcript)),
  }),
});

export type AppRouter = typeof appRouter;
