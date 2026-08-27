import { describe, it, expect } from "vitest";
import {
  generateFallbackPolyline,
  fetchRouteGeometry,
  type LatLng,
} from "./routeGeometry";

describe("generateFallbackPolyline", () => {
  it("returns empty array for empty waypoints", () => {
    expect(generateFallbackPolyline([])).toEqual([]);
  });

  it("generates interpolated coordinates between 2 points", () => {
    const waypoints: LatLng[] = [
      { lat: 12.5104, lng: 78.2137 },
      { lat: 13.0827, lng: 80.2707 },
    ];
    const polyline = generateFallbackPolyline(waypoints);
    expect(polyline.length).toBe(6); // 0..5 steps
    expect(polyline[0]).toEqual([78.2137, 12.5104]); // [lng, lat]
    expect(polyline[polyline.length - 1]).toEqual([80.2707, 13.0827]);
  });
});

describe("fetchRouteGeometry", () => {
  const waypoints: LatLng[] = [
    { lat: 12.5104, lng: 78.2137 }, // Krishnagiri
    { lat: 12.9906, lng: 80.2206 }, // Chennai Adyar
  ];

  it("throws when less than 2 waypoints are supplied", async () => {
    await expect(fetchRouteGeometry([{ lat: 12.5, lng: 78.2 }])).rejects.toThrow(
      "At least 2 waypoints"
    );
  });

  it("fetches route geometry coordinates connecting Krishnagiri to Chennai", async () => {
    const result = await fetchRouteGeometry(waypoints);
    expect(result.coordinates.length).toBeGreaterThan(5);
    expect(result.distanceMeters).toBeGreaterThan(100000); // > 100 km
    expect(result.durationSeconds).toBeGreaterThan(3600); // > 1 hour
  });
});
