import { describe, it, expect } from "vitest";
import { createDisputeClaim, evaluateAutomatedResolution, resolveDisputeClaim } from "./disputeEngine";
import { recordTelemetryReading, getTripTelemetry } from "./telemetryEngine";
import { sendNotification } from "./notificationEngine";
import { solveCvrp, calculateUnconsolidatedBaselineKm } from "./logisticsEngine";

describe("New Enterprise & Logistics Engines Integration", () => {
  it("evaluates automated cold-chain dispute claim correctly", () => {
    const claim = createDisputeClaim({
      orderId: "ORD-TEST-01",
      claimantRole: "buyer",
      disputeType: "TEMPERATURE_BREACH",
      claimedAmountInr: 500,
      description: "Temp spiked above 15C",
    });

    const resolution = evaluateAutomatedResolution(claim, 4);
    expect(resolution.recommendedAction).toBe("AUTO_REFUND");
    expect(resolution.confidencePercent).toBeGreaterThan(90);

    const resolved = resolveDisputeClaim(claim.disputeId, {
      status: "RESOLVED_REFUND",
      notes: "Auto-refunded due to continuous telemetry breach",
    });
    expect(resolved.status).toBe("RESOLVED_REFUND");
  });

  it("records IoT telemetry readings and flags threshold breaches", () => {
    const reading = recordTelemetryReading({
      sensorId: "TEST-IOT-1",
      tripCode: "TRIP-TEST-99",
      temperatureCelsius: 16.5,
      humidityPercent: 88,
      doorOpen: false,
      gpsLat: 12.51,
      gpsLng: 78.21,
    });

    expect(reading.isAlertBreached).toBe(true);
    const logs = getTripTelemetry("TRIP-TEST-99");
    expect(logs.length).toBeGreaterThan(0);
  });

  it("dispatches notifications for instant payout and pickup ETA", async () => {
    const ntf = await sendNotification({
      recipientPhone: "+919999999999",
      recipientRole: "farmer",
      template: "PAYOUT_CREDITED",
      variables: {
        amount: 14000,
        upiId: "farmer@upi",
        lotCode: "LOT-TOM-01",
      },
    });

    expect(ntf.status).toBe("DELIVERED");
    expect(ntf.messageText).toContain("₹14000");
  });

  it("solves CVRP Pickup and Delivery with dynamic load decrement", () => {
    const distances = [
      [0, 10, 20, 30],
      [10, 0, 15, 25],
      [20, 15, 0, 10],
      [30, 25, 10, 0],
    ];
    const durations = [
      [0, 100, 200, 300],
      [100, 0, 150, 250],
      [200, 150, 0, 100],
      [300, 250, 100, 0],
    ];
    // Depot (0), Farm pickup (+400), Buyer drop (-300), Farm pickup (+200)
    const demands = [0, 400, -300, 200];
    const result = solveCvrp(distances, durations, demands, 1000, 2);

    expect(result.routes.length).toBeGreaterThan(0);
    expect(result.routes[0].nodeIndices[0]).toBe(0);
    const baseline = calculateUnconsolidatedBaselineKm(distances, demands.length);
    expect(baseline).toBeGreaterThan(0);
  });
});
