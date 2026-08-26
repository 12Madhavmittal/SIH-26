import { describe, it, expect } from "vitest";
import { solveCvrp, optimizeWave, type DeliveryNode } from "./logisticsEngine";

// Deterministic synthetic matrix (asymmetric, like real road networks).
const DIST = [
  [0, 10, 20, 30, 40],
  [12, 0, 8, 18, 28],
  [22, 9, 0, 11, 21],
  [32, 19, 12, 0, 10],
  [42, 29, 22, 11, 0],
];
const DUR = DIST.map((row) => row.map((d) => d * 1.2));
const DEMANDS = [0, 400, 250, 300, 200];

describe("solveCvrp", () => {
  it("visits every non-depot node exactly once across all routes", () => {
    const r = solveCvrp(DIST, DUR, DEMANDS, 1200, 4);
    // Interior stops only (routes are depot-closed: [0, ..., 0])
    const visited = r.routes.flatMap((rt) => rt.nodeIndices.filter((n) => n !== 0));
    expect([...visited].sort()).toEqual([1, 2, 3, 4]);
  });

  it("respects vehicle capacity", () => {
    const r = solveCvrp(DIST, DUR, DEMANDS, 500, 4);
    for (const rt of r.routes) expect(rt.loadKg).toBeLessThanOrEqual(500);
    // 1150kg demand with 500kg trucks requires >= 3 routes
    expect(r.routes.length).toBeGreaterThanOrEqual(3);
  });

  it("splits into multiple routes only when needed", () => {
    const oneTruck = solveCvrp(DIST, DUR, DEMANDS, 1200, 1);
    expect(oneTruck.routes).toHaveLength(1);
    expect(oneTruck.totalLoadKg).toBe(1150);
  });

  it("each route starts and ends at the depot (index 0)", () => {
    const r = solveCvrp(DIST, DUR, DEMANDS, 600, 4);
    for (const rt of r.routes) {
      expect(rt.nodeIndices[0]).toBe(0);
      expect(rt.nodeIndices[rt.nodeIndices.length - 1]).toBe(0);
      expect(rt.nodeIndices.length).toBeGreaterThan(2); // depot + at least one stop + depot
    }
  });

  it("route distance equals sum of arcs along the closed route", () => {
    const r = solveCvrp(DIST, DUR, DEMANDS, 1200, 1);
    const [route] = r.routes;
    let manual = 0;
    for (let i = 0; i < route.nodeIndices.length - 1; i++) {
      manual += DIST[route.nodeIndices[i]][route.nodeIndices[i + 1]];
    }
    expect(route.distanceM).toBe(manual);
  });

  it("matches brute-force optimal on a small instance", () => {
    // Brute-force optimum for this matrix is 81 via route 0->1->2->3->4->0
    const r = solveCvrp(DIST, DUR, DEMANDS, 1200, 1);
    expect(r.routes[0].distanceM).toBe(81);
  });
});

describe("optimizeWave validation", () => {
  const depot: DeliveryNode = { id: "depot", name: "FPO Hub", lat: 12.5104, lng: 78.2137, demandKg: 0 };

  it("rejects input without enough stops", async () => {
    await expect(optimizeWave([depot, { ...depot, id: "a" }])).rejects.toThrow("depot plus two stops");
  });

  it("rejects non-finite coordinates", async () => {
    const nodes = [
      depot,
      { id: "a", name: "A", lat: NaN, lng: 80.2, demandKg: 100 },
      { id: "b", name: "B", lat: 13.0, lng: 80.26, demandKg: 100 },
    ];
    await expect(optimizeWave(nodes)).rejects.toThrow("finite lat/lng");
  });

  it("rejects demand exceeding fleet capacity before calling OSRM", async () => {
    const nodes = [
      depot,
      { id: "a", name: "A", lat: 12.55, lng: 78.15, demandKg: 3000 },
      { id: "b", name: "B", lat: 12.48, lng: 78.28, demandKg: 3000 },
    ];
    await expect(optimizeWave(nodes, { maxVehicles: 1, vehicleCapacityKg: 1200 })).rejects.toThrow(
      "exceeds fleet capacity",
    );
  });
});
