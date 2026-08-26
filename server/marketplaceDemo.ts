export type MarketReference = {
  pricePerKg: number;
  market: string;
  state: string;
  observedOn: string;
  source: string;
};

export type PriceBreakdown = {
  directBuyerPrice: number;
  farmerDirectEarnings: number;
  fpoServices: number;
  logistics: number;
  qualityAndPacking: number;
  conventionalBuyerPrice: number;
  farmerConventionalEarnings: number;
};

export type TraceabilityContribution = {
  farmerCode: string;
  harvestCluster: string;
  contributedKg: number;
  grade: string;
  harvestedOn: string;
};

export type Listing = {
  id: string;
  crop: string;
  variety: string;
  category: "Fresh produce" | "Staples" | "Nuts & oilseeds";
  grade: string;
  availableKg: number;
  minOrderKg: number;
  fpo: string;
  state: string;
  harvestWindow: string;
  price: PriceBreakdown;
  marketReference: MarketReference;
  lotCode: string;
  verification: { status: "Demo verified"; reference: string; copy: string };
  traceability: TraceabilityContribution[];
  demandSignal: "High demand" | "Balanced" | "Plan ahead";
  color: string;
};

export function calculatePriceComparison(price: PriceBreakdown) {
  const farmerUpliftPercent = Math.round(
    ((price.farmerDirectEarnings - price.farmerConventionalEarnings) / price.farmerConventionalEarnings) * 100
  );
  return {
    buyerSavings: Number((price.conventionalBuyerPrice - price.directBuyerPrice).toFixed(2)),
    farmerUpliftPercent,
    directFarmerSharePercent: Math.round((price.farmerDirectEarnings / price.directBuyerPrice) * 100),
  };
}

export function aggregateLot(contributions: TraceabilityContribution[]) {
  const totalKg = contributions.reduce((sum, contribution) => sum + contribution.contributedKg, 0);
  const distinctFarmers = new Set(contributions.map((contribution) => contribution.farmerCode)).size;
  return { totalKg, distinctFarmers };
}

export function recommendListing(input: {
  recentOrdersKg: number;
  committedBulkKg: number;
  arrivalTrendPercent: number;
  plannedSupplyKg: number;
}) {
  const demandBaseline = input.recentOrdersKg + input.committedBulkKg;
  const forecastKg = Math.round(demandBaseline * (1 - input.arrivalTrendPercent / 100));
  const recommendedKg = Math.round(Math.min(input.plannedSupplyKg, forecastKg * 0.92));
  const surplusKg = Math.max(0, input.plannedSupplyKg - forecastKg);
  return {
    forecastKg,
    recommendedKg,
    surplusKg,
    risk: surplusKg > forecastKg * 0.18 ? "Watch" : surplusKg > 0 ? "Balanced" : "Low",
  };
}

export function compareRoutePlans(input: {
  baselineKm: number;
  optimizedKm: number;
  baselineCost: number;
  optimizedCost: number;
  baselineEmissionsKg: number;
  optimizedEmissionsKg: number;
}) {
  return {
    baselineKm: input.baselineKm,
    optimizedKm: input.optimizedKm,
    kmSaved: input.baselineKm - input.optimizedKm,
    costSaved: input.baselineCost - input.optimizedCost,
    emissionsSavedKg: Number((input.baselineEmissionsKg - input.optimizedEmissionsKg).toFixed(1)),
    routeEfficiencyPercent: Math.round(((input.baselineKm - input.optimizedKm) / input.baselineKm) * 100),
  };
}

const tomatoTraceability: TraceabilityContribution[] = [
  { farmerCode: "KR-041", harvestCluster: "Hosur cluster", contributedKg: 240, grade: "A", harvestedOn: "25 Aug 2026" },
  { farmerCode: "KR-079", harvestCluster: "Hosur cluster", contributedKg: 210, grade: "A", harvestedOn: "25 Aug 2026" },
  { farmerCode: "KR-116", harvestCluster: "Shoolagiri cluster", contributedKg: 170, grade: "A", harvestedOn: "24 Aug 2026" },
];

const onionTraceability: TraceabilityContribution[] = [
  { farmerCode: "TN-108", harvestCluster: "Gobichettipalayam cluster", contributedKg: 360, grade: "A", harvestedOn: "23 Aug 2026" },
  { farmerCode: "TN-131", harvestCluster: "Gobichettipalayam cluster", contributedKg: 310, grade: "A", harvestedOn: "23 Aug 2026" },
  { farmerCode: "TN-155", harvestCluster: "Erode cluster", contributedKg: 310, grade: "A", harvestedOn: "22 Aug 2026" },
];

export const demoListings: Listing[] = [
  {
    id: "tomato-grade-a",
    crop: "Sun-ripened tomato",
    variety: "Market grade, sorted",
    category: "Fresh produce",
    grade: "Grade A",
    availableKg: 620,
    minOrderKg: 5,
    fpo: "Krishnagiri Harvest Collective",
    state: "Tamil Nadu",
    harvestWindow: "Packed within 18 hours",
    price: {
      directBuyerPrice: 28,
      farmerDirectEarnings: 20.5,
      fpoServices: 2.1,
      logistics: 3.4,
      qualityAndPacking: 2,
      conventionalBuyerPrice: 42,
      farmerConventionalEarnings: 13.4,
    },
    marketReference: {
      pricePerKg: 22.5,
      market: "Katpadi Uzhavar Sandhai",
      state: "Tamil Nadu",
      observedOn: "26 Aug 2026",
      source: "AGMARKNET / data.gov.in, modal price",
    },
    lotCode: "KHC-TOM-0826-A",
    verification: { status: "Demo verified", reference: "FPO-DEMO-26033-01", copy: "Illustrative FPO onboarding record; production verification would use consented organisation documents and field validation." },
    traceability: tomatoTraceability,
    demandSignal: "High demand",
    color: "tomato",
  },
  {
    id: "red-onion",
    crop: "Red onion",
    variety: "Medium bulb, graded",
    category: "Fresh produce",
    grade: "Grade A",
    availableKg: 980,
    minOrderKg: 10,
    fpo: "Kaveri Pooled Produce FPO",
    state: "Tamil Nadu",
    harvestWindow: "Cured & traceable",
    price: {
      directBuyerPrice: 52,
      farmerDirectEarnings: 38,
      fpoServices: 3.5,
      logistics: 6.5,
      qualityAndPacking: 4,
      conventionalBuyerPrice: 68,
      farmerConventionalEarnings: 26,
    },
    marketReference: {
      pricePerKg: 52.5,
      market: "Hosur Uzhavar Sandhai",
      state: "Tamil Nadu",
      observedOn: "26 Aug 2026",
      source: "AGMARKNET / data.gov.in, modal price",
    },
    lotCode: "KPF-ONI-0826-B",
    verification: { status: "Demo verified", reference: "FPO-DEMO-26033-02", copy: "Illustrative FPO onboarding record; production verification would use consented organisation documents and field validation." },
    traceability: onionTraceability,
    demandSignal: "Balanced",
    color: "onion",
  },
  {
    id: "groundnut-shell",
    crop: "Groundnut in shell",
    variety: "Big, naturally dried",
    category: "Nuts & oilseeds",
    grade: "Local premium",
    availableKg: 420,
    minOrderKg: 15,
    fpo: "Hosur Farmgate Network",
    state: "Tamil Nadu",
    harvestWindow: "Lot sealed 24 Aug",
    price: {
      directBuyerPrice: 96,
      farmerDirectEarnings: 76,
      fpoServices: 5,
      logistics: 8,
      qualityAndPacking: 7,
      conventionalBuyerPrice: 128,
      farmerConventionalEarnings: 55,
    },
    marketReference: {
      pricePerKg: 90,
      market: "Hosur Uzhavar Sandhai",
      state: "Tamil Nadu",
      observedOn: "26 Aug 2026",
      source: "AGMARKNET / data.gov.in, modal price",
    },
    lotCode: "HFN-GRN-0826-C",
    verification: { status: "Demo verified", reference: "FPO-DEMO-26033-03", copy: "Illustrative FPO onboarding record; production verification would use consented organisation documents and field validation." },
    traceability: [
      { farmerCode: "TN-203", harvestCluster: "Denkanikottai cluster", contributedKg: 220, grade: "Premium", harvestedOn: "20 Aug 2026" },
      { farmerCode: "TN-214", harvestCluster: "Denkanikottai cluster", contributedKg: 200, grade: "Premium", harvestedOn: "20 Aug 2026" },
    ],
    demandSignal: "Plan ahead",
    color: "groundnut",
  },
  {
    id: "common-paddy",
    crop: "Paddy (common)",
    variety: "1001, FAQ grade",
    category: "Staples",
    grade: "FAQ",
    availableKg: 2400,
    minOrderKg: 100,
    fpo: "Godavari Grain Circle",
    state: "Andhra Pradesh",
    harvestWindow: "Bulk lot, mill-ready",
    price: {
      directBuyerPrice: 27,
      farmerDirectEarnings: 23.5,
      fpoServices: 1.1,
      logistics: 1.4,
      qualityAndPacking: 1,
      conventionalBuyerPrice: 35,
      farmerConventionalEarnings: 18.5,
    },
    marketReference: {
      pricePerKg: 23.79,
      market: "Sampara (Kakinada Rural) APMC",
      state: "Andhra Pradesh",
      observedOn: "26 Aug 2026",
      source: "AGMARKNET / data.gov.in, modal price",
    },
    lotCode: "GGC-PAD-0826-A",
    verification: { status: "Demo verified", reference: "FPO-DEMO-26033-04", copy: "Illustrative FPO onboarding record; production verification would use consented organisation documents and field validation." },
    traceability: [
      { farmerCode: "AP-031", harvestCluster: "Kakinada Rural cluster", contributedKg: 800, grade: "FAQ", harvestedOn: "21 Aug 2026" },
      { farmerCode: "AP-052", harvestCluster: "Kakinada Rural cluster", contributedKg: 760, grade: "FAQ", harvestedOn: "21 Aug 2026" },
      { farmerCode: "AP-074", harvestCluster: "Sampara cluster", contributedKg: 840, grade: "FAQ", harvestedOn: "22 Aug 2026" },
    ],
    demandSignal: "Balanced",
    color: "paddy",
  },
];

const tomatoRecommendation = recommendListing({
  recentOrdersKg: 440,
  committedBulkKg: 260,
  arrivalTrendPercent: -6,
  plannedSupplyKg: 760,
});

const onionRecommendation = recommendListing({
  recentOrdersKg: 360,
  committedBulkKg: 300,
  arrivalTrendPercent: 4,
  plannedSupplyKg: 980,
});

const routeComparison = compareRoutePlans({
  baselineKm: 86,
  optimizedKm: 54,
  baselineCost: 2650,
  optimizedCost: 1790,
  baselineEmissionsKg: 24.1,
  optimizedEmissionsKg: 15.1,
});

export const demoMarketplace = {
  dataNotice:
    "Mandi reference prices are dated public AGMARKNET/data.gov.in records. Farmers, FPOs, order quantities, routes, forecasts, and impact figures are clearly labelled illustrative demo records.",
  listings: demoListings.map((listing) => ({
    ...listing,
    comparison: calculatePriceComparison(listing.price),
    aggregation: aggregateLot(listing.traceability),
  })),
  demand: [
    {
      crop: "Sun-ripened tomato",
      forecastKg: tomatoRecommendation.forecastKg,
      recommendedKg: tomatoRecommendation.recommendedKg,
      plannedSupplyKg: 760,
      surplusKg: tomatoRecommendation.surplusKg,
      risk: tomatoRecommendation.risk,
      confidence: 82,
      explanation: "Recent direct orders and a confirmed bulk commitment are rising while reference arrivals are lower. List the first 680 kg now; retain the remainder for the next delivery wave.",
    },
    {
      crop: "Red onion",
      forecastKg: onionRecommendation.forecastKg,
      recommendedKg: onionRecommendation.recommendedKg,
      plannedSupplyKg: 980,
      surplusKg: onionRecommendation.surplusKg,
      risk: onionRecommendation.risk,
      confidence: 74,
      explanation: "Committed demand supports the current lot, but reference arrivals are improving. Release in two clusters to limit price and holding risk.",
    },
    {
      crop: "Groundnut in shell",
      forecastKg: 360,
      recommendedKg: 330,
      plannedSupplyKg: 420,
      surplusKg: 60,
      risk: "Balanced",
      confidence: 71,
      explanation: "Stable pantry demand and a longer shelf-life make this a suitable bulk-buyer lot; retain a 60 kg quality buffer.",
    },
  ],
  logistics: {
    planCode: "SOUTH-CHN-07",
    status: "Ready to dispatch",
    cluster: "South Chennai: 1 bulk buyer + 4 family orders",
    vehicle: "Electric LCV · 1.2 tonne capacity",
    utilizationPercent: 82,
    plannedLoadKg: 984,
    routeComparison,
    stops: [
      { order: 1, name: "FPO consolidation hub", detail: "Shoolagiri · 06:30", kind: "origin" },
      { order: 2, name: "Green Bowl Kitchens", detail: "Adyar · 10:05 · bulk", kind: "bulk" },
      { order: 3, name: "Family order cluster", detail: "Besant Nagar · 10:28", kind: "consumer" },
      { order: 4, name: "Family order cluster", detail: "Thiruvanmiyur · 10:47", kind: "consumer" },
      { order: 5, name: "Family order cluster", detail: "Velachery · 11:12", kind: "consumer" },
    ],
  },
  impact: {
    fulfilledOrders: 47,
    farmerIncomeUpliftPercent: 34,
    buyerSavingsInr: 14680,
    wasteAvoidedKg: 186,
    routeKmAvoided: 312,
    emissionsAvoidedKg: 75,
    directTradeValueInr: 82940,
    onTimeDeliveryPercent: 96,
  },
};

export function createDemoOrder(listingId: string, quantityKg: number, buyerType: "consumer" | "bulk") {
  const listing = demoListings.find((item) => item.id === listingId);
  if (!listing) throw new Error("Listing not found");
  if (quantityKg < listing.minOrderKg) throw new Error(`Minimum order is ${listing.minOrderKg} kg`);
  if (quantityKg > listing.availableKg) throw new Error("Requested quantity exceeds the demo lot availability");
  const total = Number((listing.price.directBuyerPrice * quantityKg).toFixed(2));
  return {
    orderCode: `AD-${listing.id.slice(0, 3).toUpperCase()}-${buyerType === "bulk" ? "B" : "C"}-0826`,
    listing: listing.crop,
    quantityKg,
    total,
    buyerType,
    routedTo: buyerType === "bulk" ? "South Chennai bulk cluster" : "Next consolidated delivery wave",
  };
}
