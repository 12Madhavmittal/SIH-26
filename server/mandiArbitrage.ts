/**
 * Annadata Direct — Multi-Mandi Price Arbitrage & Inter-Market Spread Engine
 *
 * Compares price differentials across neighboring APMC mandis and urban terminal markets.
 * Evaluates transport costs, APMC cess/taxes, and transit decay to determine whether:
 *   Option A: Sell locally at nearest rural mandi
 *   Option B: Transport to higher-value urban terminal APMC
 *   Option C: Direct Farmgate Buyer Delivery on Annadata Direct
 */

import { haversineDistanceKm } from "./geoClustering";

export interface MandiOption {
  mandiName: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  modalPricePerKg: number;
  cessPercent?: number; // APMC market fee (typically 1.0 - 2.5%)
}

export interface ArbitrageAnalysis {
  commodity: string;
  quantityKg: number;
  originHub: { name: string; lat: number; lng: number };
  directAppOfferPerKg: number;
  mandiComparisons: {
    mandiName: string;
    district: string;
    distanceKm: number;
    modalPricePerKg: number;
    estimatedTransportCostInr: number;
    estimatedApmcCessInr: number;
    netRealizationPerKg: number;
    totalNetPayoutInr: number;
    spreadVsLocalMandiPerKg: number;
  }[];
  bestMandiOption: {
    mandiName: string;
    netRealizationPerKg: number;
    totalNetPayoutInr: number;
  };
  directPlatformAdvantage: {
    directPayoutInr: number;
    extraEarningVsBestMandiInr: number;
    extraEarningPercent: number;
    recommendedChannel: "ANNADATA_DIRECT" | "REGIONAL_MANDI";
  };
}

const LCV_COST_PER_KM_INR = 22;
const AVERAGE_TRUCK_LOAD_KG = 1200; // Shared capacity divisor

export function calculateMultiMandiArbitrage(
  commodity: string,
  quantityKg: number,
  originHub: { name: string; lat: number; lng: number },
  mandis: MandiOption[],
  directAppOfferPerKg: number
): ArbitrageAnalysis {
  if (mandis.length === 0) {
    throw new Error("At least one target mandi is required for arbitrage comparison.");
  }

  const comparisons = mandis.map((mandi) => {
    const distanceKm = haversineDistanceKm(originHub.lat, originHub.lng, mandi.lat, mandi.lng);

    // Transport cost allocated proportionally: (Distance * 22) * (quantityKg / TruckCapacity)
    const transportShare = Math.min(1.0, quantityKg / AVERAGE_TRUCK_LOAD_KG);
    const estimatedTransportCostInr = Math.round(distanceKm * LCV_COST_PER_KM_INR * transportShare);

    const grossValueInr = quantityKg * mandi.modalPricePerKg;
    const cessRate = (mandi.cessPercent ?? 1.5) / 100;
    const estimatedApmcCessInr = Math.round(grossValueInr * cessRate);

    const totalDeductionsInr = estimatedTransportCostInr + estimatedApmcCessInr;
    const totalNetPayoutInr = Math.round(grossValueInr - totalDeductionsInr);
    const netRealizationPerKg = Number((totalNetPayoutInr / quantityKg).toFixed(2));

    return {
      mandiName: mandi.mandiName,
      district: mandi.district,
      distanceKm: Math.round(distanceKm),
      modalPricePerKg: mandi.modalPricePerKg,
      estimatedTransportCostInr,
      estimatedApmcCessInr,
      netRealizationPerKg,
      totalNetPayoutInr,
      spreadVsLocalMandiPerKg: 0, // Computed below against nearest mandi
    };
  });

  // Identify local (nearest) mandi
  const localMandi = [...comparisons].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  for (const c of comparisons) {
    c.spreadVsLocalMandiPerKg = Number((c.netRealizationPerKg - localMandi.netRealizationPerKg).toFixed(2));
  }

  // Best mandi option by highest net realization
  const bestMandi = [...comparisons].sort((a, b) => b.totalNetPayoutInr - a.totalNetPayoutInr)[0];

  const directPayoutInr = Math.round(quantityKg * directAppOfferPerKg);
  const extraEarningVsBestMandiInr = directPayoutInr - bestMandi.totalNetPayoutInr;
  const extraEarningPercent = Number(
    (((directAppOfferPerKg - bestMandi.netRealizationPerKg) / bestMandi.netRealizationPerKg) * 100).toFixed(1)
  );

  return {
    commodity,
    quantityKg,
    originHub,
    directAppOfferPerKg,
    mandiComparisons: comparisons,
    bestMandiOption: {
      mandiName: bestMandi.mandiName,
      netRealizationPerKg: bestMandi.netRealizationPerKg,
      totalNetPayoutInr: bestMandi.totalNetPayoutInr,
    },
    directPlatformAdvantage: {
      directPayoutInr,
      extraEarningVsBestMandiInr,
      extraEarningPercent,
      recommendedChannel: extraEarningVsBestMandiInr >= 0 ? "ANNADATA_DIRECT" : "REGIONAL_MANDI",
    },
  };
}
