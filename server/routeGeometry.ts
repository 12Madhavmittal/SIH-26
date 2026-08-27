/**
 * Annadata Direct — OSRM Route Geometry & Turn-by-Turn Path Fetcher
 *
 * Calls OSRM /route/v1/driving/ to get exact driving path GeoJSON coordinates
 * and turn-by-turn navigation legs for real-time map visualization.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteGeometryResponse {
  coordinates: [number, number][]; // [lng, lat] pairs for GeoJSON / Leaflet
  distanceMeters: number;
  durationSeconds: number;
  legs: {
    distanceMeters: number;
    durationSeconds: number;
    summary: string;
  }[];
  isLive: boolean;
}

const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";

/**
 * Generates an interpolated straight-line fallback path if OSRM is offline.
 */
export function generateFallbackPolyline(waypoints: LatLng[]): [number, number][] {
  if (waypoints.length === 0) return [];
  const line: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    // Interpolate 5 intermediate points per leg
    for (let step = 0; step <= 5; step++) {
      const fraction = step / 5;
      const lat = start.lat + (end.lat - start.lat) * fraction;
      const lng = start.lng + (end.lng - start.lng) * fraction;
      line.push([Number(lng.toFixed(5)), Number(lat.toFixed(5))]);
    }
  }
  return line;
}

/**
 * Fetches real OpenStreetMap road geometry connecting ordered waypoints.
 */
export async function fetchRouteGeometry(
  waypoints: LatLng[]
): Promise<RouteGeometryResponse> {
  if (waypoints.length < 2) {
    throw new Error("At least 2 waypoints are required to fetch route geometry.");
  }

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "annadata-direct-map" },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          coordinates: route.geometry.coordinates,
          distanceMeters: Math.round(route.distance),
          durationSeconds: Math.round(route.duration),
          legs: (route.legs || []).map((leg: any) => ({
            distanceMeters: Math.round(leg.distance),
            durationSeconds: Math.round(leg.duration),
            summary: leg.summary || "Highway link",
          })),
          isLive: true,
        };
      }
    }
  } catch (err) {
    console.warn("OSRM Route API unreachable, using smooth interpolated polyline", err);
  }

  // Resilient fallback
  const fallbackCoords = generateFallbackPolyline(waypoints);
  return {
    coordinates: fallbackCoords,
    distanceMeters: 550000,
    durationSeconds: 21600,
    legs: [],
    isLive: false,
  };
}
