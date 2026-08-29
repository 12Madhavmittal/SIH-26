/**
 * Annadata Direct — Dispute & Claims Resolution Engine
 *
 * Handles automated & arbitrator-reviewed dispute claims across:
 * - TRANSIT_SPOILAGE (temperature breach / kinetic decay)
 * - WEIGHT_DISCREPANCY (weighbridge check failure)
 * - GRADE_MISMATCH (APEDA quality defect)
 * - DELAYED_DELIVERY (ETAs breached beyond perishability buffer)
 */

export type DisputeType =
  | "TRANSIT_SPOILAGE"
  | "WEIGHT_DISCREPANCY"
  | "GRADE_MISMATCH"
  | "DELAYED_DELIVERY"
  | "TEMPERATURE_BREACH";

export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED_REFUND"
  | "RESOLVED_REJECTED"
  | "SETTLED";

export interface DisputeClaim {
  disputeId: string;
  orderId: string;
  escrowId?: string;
  claimantRole: "buyer" | "fpo" | "transporter";
  disputeType: DisputeType;
  claimedAmountInr: number;
  description: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

const memoryDisputes = new Map<string, DisputeClaim>();

export function createDisputeClaim(input: {
  orderId: string;
  escrowId?: string;
  claimantRole: "buyer" | "fpo" | "transporter";
  disputeType: DisputeType;
  claimedAmountInr: number;
  description: string;
  evidenceUrls?: string[];
}): DisputeClaim {
  const disputeId = `DISP-${input.orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6)}-${Date.now().toString().slice(-4)}`;
  const claim: DisputeClaim = {
    disputeId,
    orderId: input.orderId,
    escrowId: input.escrowId,
    claimantRole: input.claimantRole,
    disputeType: input.disputeType,
    claimedAmountInr: input.claimedAmountInr,
    description: input.description,
    evidenceUrls: input.evidenceUrls ?? [],
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };
  memoryDisputes.set(disputeId, claim);
  return claim;
}

export function evaluateAutomatedResolution(claim: DisputeClaim, sensorBreachCount = 0): {
  recommendedAction: "AUTO_REFUND" | "MANUAL_REVIEW" | "REJECT";
  confidencePercent: number;
  reason: string;
} {
  if (claim.disputeType === "TEMPERATURE_BREACH" && sensorBreachCount >= 3) {
    return {
      recommendedAction: "AUTO_REFUND",
      confidencePercent: 95,
      reason: "Continuous cold-chain temperature telemetry breach detected during transit.",
    };
  }

  if (claim.disputeType === "TRANSIT_SPOILAGE" && claim.claimedAmountInr <= 500) {
    return {
      recommendedAction: "AUTO_REFUND",
      confidencePercent: 88,
      reason: "Low-value spoilage claim within standard micro-guarantee threshold.",
    };
  }

  return {
    recommendedAction: "MANUAL_REVIEW",
    confidencePercent: 70,
    reason: "Claim requires photo evidence inspection or weighbridge calibration check.",
  };
}

export function resolveDisputeClaim(
  disputeId: string,
  resolution: { status: "RESOLVED_REFUND" | "RESOLVED_REJECTED" | "SETTLED"; notes: string }
): DisputeClaim {
  const claim = memoryDisputes.get(disputeId);
  if (!claim) throw new Error(`Dispute ${disputeId} not found.`);
  const updated: DisputeClaim = {
    ...claim,
    status: resolution.status,
    resolutionNotes: resolution.notes,
    resolvedAt: new Date().toISOString(),
  };
  memoryDisputes.set(disputeId, updated);
  return updated;
}

export function getAllDisputes(): DisputeClaim[] {
  return Array.from(memoryDisputes.values());
}
