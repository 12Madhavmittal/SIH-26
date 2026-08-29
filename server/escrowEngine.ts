/**
 * Annadata Direct — Digital Escrow & Instant UPI Settlement State Machine
 *
 * Implements transparent milestone-based fund distribution:
 *
 *  [BUYER FUNDS ESCROW]
 *           │
 *           ▼ (State: FUNDS_LOCKED)
 *  [DISPATCH VERIFIED BY GPS]
 *           │
 *           ▼ (State: IN_TRANSIT_RELEASE_50) -> 50% logistics & FPO advance released
 *  [DELIVERY CONFIRMED & QC ACCEPTED]
 *           │
 *           ▼ (State: SETTLED_100) -> 100% direct farmer payout triggered via UPI
 */

export type EscrowState =
  | "INITIATED"
  | "FUNDS_LOCKED"
  | "DISPATCH_ADVANCE_RELEASED"
  | "DELIVERY_CONFIRMED"
  | "SETTLED_COMPLETE"
  | "DISPUTED_HOLD"
  | "REFUNDED";

export interface EscrowAccount {
  escrowId: string;
  orderId: string;
  totalAmountInr: number;
  farmerPayoutInr: number;
  fpoServiceInr: number;
  logisticsInr: number;
  platformFeeInr: number;
  currentState: EscrowState;
  farmerUpiId: string;
  fpoUpiId: string;
  logisticsUpiId: string;
  stateHistory: {
    state: EscrowState;
    timestamp: string;
    note: string;
    releasedAmountInr: number;
  }[];
}

export function createEscrowAccount(input: {
  orderId: string;
  totalAmountInr: number;
  farmerSharePercent?: number;
  fpoSharePercent?: number;
  logisticsSharePercent?: number;
  farmerUpiId?: string;
  fpoUpiId?: string;
  logisticsUpiId?: string;
}): EscrowAccount {
  const farmerShare = input.farmerSharePercent ?? 74.0; // 74% direct to farmer
  const fpoShare = input.fpoSharePercent ?? 8.0;         // 8% FPO grading & pooling
  const logisticsShare = input.logisticsSharePercent ?? 13.0; // 13% OSRM transport
  const platformShare = Math.max(0, 100 - (farmerShare + fpoShare + logisticsShare)); // 5%

  const farmerPayoutInr = Math.round((input.totalAmountInr * farmerShare) / 100);
  const fpoServiceInr = Math.round((input.totalAmountInr * fpoShare) / 100);
  const logisticsInr = Math.round((input.totalAmountInr * logisticsShare) / 100);
  const platformFeeInr = input.totalAmountInr - (farmerPayoutInr + fpoServiceInr + logisticsInr);

  const escrowId = `ESC-${input.orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}-${Date.now().toString().slice(-4)}`;

  return {
    escrowId,
    orderId: input.orderId,
    totalAmountInr: input.totalAmountInr,
    farmerPayoutInr,
    fpoServiceInr,
    logisticsInr,
    platformFeeInr,
    currentState: "INITIATED",
    farmerUpiId: input.farmerUpiId ?? "farmer.ramesh@okaxis",
    fpoUpiId: input.fpoUpiId ?? "krishnagiri.fpo@sbi",
    logisticsUpiId: input.logisticsUpiId ?? "fastlogistics@icici",
    stateHistory: [
      {
        state: "INITIATED",
        timestamp: new Date().toISOString(),
        note: "Escrow account generated. Awaiting buyer payment.",
        releasedAmountInr: 0,
      },
    ],
  };
}

export function transitionEscrowState(
  account: EscrowAccount,
  nextState: EscrowState
): EscrowAccount {
  const allowedTransitions: Record<EscrowState, EscrowState[]> = {
    INITIATED: ["FUNDS_LOCKED", "REFUNDED"],
    FUNDS_LOCKED: ["DISPATCH_ADVANCE_RELEASED", "DISPUTED_HOLD", "REFUNDED"],
    DISPATCH_ADVANCE_RELEASED: ["DELIVERY_CONFIRMED", "SETTLED_COMPLETE", "DISPUTED_HOLD", "REFUNDED"],
    DELIVERY_CONFIRMED: ["SETTLED_COMPLETE", "DISPUTED_HOLD", "REFUNDED"],
    DISPUTED_HOLD: ["SETTLED_COMPLETE", "REFUNDED"],
    SETTLED_COMPLETE: [],
    REFUNDED: [],
  };

  if (!allowedTransitions[account.currentState].includes(nextState)) {
    throw new Error(
      `Invalid escrow state transition from ${account.currentState} to ${nextState}`
    );
  }

  let note = "";
  let releasedAmount = 0;

  if (nextState === "FUNDS_LOCKED") {
    note = "Buyer funds captured and locked in RBI-compliant escrow nodal account.";
  } else if (nextState === "DISPATCH_ADVANCE_RELEASED") {
    // 50% logistics & FPO fee released on vehicle departure
    releasedAmount = Math.round((account.logisticsInr + account.fpoServiceInr) * 0.5);
    note = `Vehicle dispatched via GPS tracking. Initial ₹${releasedAmount} advance credited to logistics and FPO accounts.`;
  } else if (nextState === "DELIVERY_CONFIRMED") {
    note = "Digital proof-of-delivery (e-POD) signed by recipient. Preparing automated 100% UPI settlement.";
  } else if (nextState === "DISPUTED_HOLD") {
    note = "Dispute raised by party. Payout locked in escrow pending arbitration resolution.";
  } else if (nextState === "SETTLED_COMPLETE") {
    // 100% of remaining balance including full farmer payout released
    releasedAmount = account.totalAmountInr;
    note = `Delivery accepted by buyer. Instant ₹${account.farmerPayoutInr} UPI payout dispatched directly to ${account.farmerUpiId}.`;
  } else if (nextState === "REFUNDED") {
    note = "Order cancelled or damaged in transit. 100% funds refunded to buyer.";
  }

  return {
    ...account,
    currentState: nextState,
    stateHistory: [
      ...account.stateHistory,
      {
        state: nextState,
        timestamp: new Date().toISOString(),
        note,
        releasedAmountInr: releasedAmount,
      },
    ],
  };
}

