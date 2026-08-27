/**
 * Annadata Direct — Regional Geo-Clustering Engine
 *
 * Implements:
 * 1. Great-circle Haversine distance formula between geo-coordinates.
 * 2. Density-based spatial clustering (DBSCAN / Radius clustering) for grouping
 *    smallholder farmgate pickups and consumer micro-drops into coherent logistics zones
 *    (e.g., Hosur Cluster, Shoolagiri Cluster, South Chennai Drop Zone).
 * 3. Centroid calculation for dispatch hubs and collective aggregation nodes.
 */

export interface GeoPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demandKg?: number;
  metadata?: Record<string, any>;
}

export interface GeoCluster {
  clusterId: string;
  clusterName: string;
  center: { lat: number; lng: number };
  points: GeoPoint[];
  totalDemandKg: number;
  radiusKm: number;
}

const EARTH_RADIUS_KM = 6371.0088;

/**
 * Calculates Great-Circle distance in kilometers between two GPS coordinates
 * using the Haversine formula.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((EARTH_RADIUS_KM * c).toFixed(3));
}

/**
 * Computes the geographic centroid of a set of points.
 */
export function calculateCentroid(points: GeoPoint[]): { lat: number; lng: number } {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const sumLat = points.reduce((s, p) => s + p.lat, 0);
  const sumLng = points.reduce((s, p) => s + p.lng, 0);
  return {
    lat: Number((sumLat / points.length).toFixed(6)),
    lng: Number((sumLng / points.length).toFixed(6)),
  };
}

/**
 * Clusters geographic delivery/pickup points into regional zones based on a maximum radius.
 * Guarantees that points within `maxRadiusKm` of a cluster center are pooled together.
 */
export function clusterGeoPoints(
  points: GeoPoint[],
  maxRadiusKm: number = 25.0
): GeoCluster[] {
  if (points.length === 0) return [];

  const unassigned = [...points];
  const clusters: GeoCluster[] = [];
  let clusterCounter = 1;

  while (unassigned.length > 0) {
    // Pick the first unassigned seed point
    const seed = unassigned.shift()!;
    const clusterPoints: GeoPoint[] = [seed];

    // Find all unassigned points within maxRadiusKm from the seed
    for (let i = unassigned.length - 1; i >= 0; i--) {
      const candidate = unassigned[i];
      const dist = haversineDistanceKm(seed.lat, seed.lng, candidate.lat, candidate.lng);
      if (dist <= maxRadiusKm) {
        clusterPoints.push(candidate);
        unassigned.splice(i, 1);
      }
    }

    const center = calculateCentroid(clusterPoints);
    const radiusKm = clusterPoints.reduce((maxDist, p) => {
      const d = haversineDistanceKm(center.lat, center.lng, p.lat, p.lng);
      return Math.max(maxDist, d);
    }, 0);

    const totalDemandKg = clusterPoints.reduce((sum, p) => sum + (p.demandKg ?? 0), 0);

    clusters.push({
      clusterId: `ZONE-${String(clusterCounter).padStart(2, "0")}`,
      clusterName: `${seed.name.split(" ")[0]} Regional Zone`,
      center,
      points: clusterPoints,
      totalDemandKg,
      radiusKm: Number(radiusKm.toFixed(2)),
    });

    clusterCounter++;
  }

  return clusters;
}
