import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  calculateCentroid,
  clusterGeoPoints,
  type GeoPoint,
} from "./geoClustering";

describe("haversineDistanceKm", () => {
  it("calculates 0 km for identical points", () => {
    expect(haversineDistanceKm(12.5104, 78.2137, 12.5104, 78.2137)).toBe(0);
  });

  it("accurately calculates Krishnagiri to Chennai distance (~230-245 km straight-line)", () => {
    const dist = haversineDistanceKm(12.5104, 78.2137, 13.0827, 80.2707);
    expect(dist).toBeGreaterThan(230);
    expect(dist).toBeLessThan(255);
  });

  it("accurately calculates Hosur to Krishnagiri distance (~45-55 km)", () => {
    const dist = haversineDistanceKm(12.7409, 77.8253, 12.5104, 78.2137);
    expect(dist).toBeGreaterThan(45);
    expect(dist).toBeLessThan(55);
  });
});

describe("calculateCentroid", () => {
  it("returns (0,0) for empty point list", () => {
    expect(calculateCentroid([])).toEqual({ lat: 0, lng: 0 });
  });

  it("calculates exact midpoint of 2 symmetric coordinates", () => {
    const points: GeoPoint[] = [
      { id: "1", name: "P1", lat: 10, lng: 20 },
      { id: "2", name: "P2", lat: 20, lng: 40 },
    ];
    expect(calculateCentroid(points)).toEqual({ lat: 15, lng: 30 });
  });
});

describe("clusterGeoPoints", () => {
  const points: GeoPoint[] = [
    // Krishnagiri / Hosur Cluster (Origin Hubs)
    { id: "f1", name: "Hosur Farmgate 1", lat: 12.7409, lng: 77.8253, demandKg: 200 },
    { id: "f2", name: "Hosur Farmgate 2", lat: 12.735, lng: 77.83, demandKg: 250 },
    { id: "f3", name: "Shoolagiri Farmgate", lat: 12.68, lng: 77.95, demandKg: 180 },

    // Chennai Urban Cluster (Buyer Drops)
    { id: "b1", name: "Adyar Drop Point", lat: 12.9906, lng: 80.2206, demandKg: 300 },
    { id: "b2", name: "Besant Nagar Drop Point", lat: 13.0001, lng: 80.2667, demandKg: 150 },
    { id: "b3", name: "Velachery Drop Point", lat: 12.9759, lng: 80.2212, demandKg: 100 },
  ];

  it("returns empty array for empty inputs", () => {
    expect(clusterGeoPoints([])).toEqual([]);
  });

  it("separates distant geographic zones into distinct clusters", () => {
    // 30 km radius should cleanly isolate Krishnagiri/Hosur from Chennai (which is ~240 km away)
    const clusters = clusterGeoPoints(points, 30.0);
    expect(clusters.length).toBe(2);

    const totalDemandAcrossClusters = clusters.reduce((s, c) => s + c.totalDemandKg, 0);
    expect(totalDemandAcrossClusters).toBe(1180);

    // Each cluster should contain 3 points
    expect(clusters.every((c) => c.points.length === 3)).toBe(true);
  });

  it("includes all points in a single cluster when maxRadius is very large", () => {
    const single = clusterGeoPoints(points, 500.0);
    expect(single.length).toBe(1);
    expect(single[0].points.length).toBe(6);
  });
});
