import { describe, it, expect } from "vitest";
import {
  createEscrowAccount,
  transitionEscrowState,
} from "./escrowEngine";

describe("createEscrowAccount", () => {
  it("creates an escrow account with correct 74% farmer share allocation", () => {
    const acc = createEscrowAccount({
      orderId: "ORD-9901",
      totalAmountInr: 10000,
    });

    expect(acc.currentState).toBe("INITIATED");
    expect(acc.farmerPayoutInr).toBe(7400); // 74%
    expect(acc.fpoServiceInr).toBe(800);   // 8%
    expect(acc.logisticsInr).toBe(1300);   // 13%
    expect(acc.platformFeeInr).toBe(500);  // 5%
    expect(acc.stateHistory.length).toBe(1);
  });
});

describe("transitionEscrowState", () => {
  it("progresses cleanly through full 3-tier milestone lifecycle", () => {
    let acc = createEscrowAccount({
      orderId: "ORD-9901",
      totalAmountInr: 10000,
    });

    // Step 1: Buyer locks funds
    acc = transitionEscrowState(acc, "FUNDS_LOCKED");
    expect(acc.currentState).toBe("FUNDS_LOCKED");

    // Step 2: Vehicle dispatches -> 50% transport advance
    acc = transitionEscrowState(acc, "DISPATCH_ADVANCE_RELEASED");
    expect(acc.currentState).toBe("DISPATCH_ADVANCE_RELEASED");
    expect(acc.stateHistory[2].releasedAmountInr).toBe(1050); // (1300+800)*0.5

    // Step 3: Delivery confirmed -> 100% full farmer settlement
    acc = transitionEscrowState(acc, "SETTLED_COMPLETE");
    expect(acc.currentState).toBe("SETTLED_COMPLETE");
    expect(acc.stateHistory.length).toBe(4);
    expect(acc.stateHistory[3].note).toContain("farmer.ramesh@okaxis");
  });

  it("throws on illegal state transitions (e.g. INITIATED -> SETTLED_COMPLETE directly)", () => {
    const acc = createEscrowAccount({
      orderId: "ORD-9901",
      totalAmountInr: 10000,
    });

    expect(() => transitionEscrowState(acc, "SETTLED_COMPLETE")).toThrow(
      "Invalid escrow state transition"
    );
  });
});
