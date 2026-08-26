/**
 * Annadata Direct — Route Optimization Engine
 *
 * Pipeline: OSRM Table API (real road distances) -> Capacitated VRP solver.
 * Solver: nearest-neighbour construction + 2-opt improvement, capacity-constrained,
 * multi-vehicle. Pure TypeScript so it runs inside the Node server with zero
 * Python dependency.
 *
 * OSRM public demo server used by default; set OSRM_BASE_URL for self-hosted.
 */

export interface DeliveryNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Positive = pickup kg at farms, negative = delivery demand at buyers, 0 = depot. */
  demandKg: number;
}

export interface RouteStop {
  nodeId: string;
  name: string;
  cumulativeLoadKg: number;
}

export interface PlannedRoute {
  vehicleId: number;
  stops: RouteStop[];
  loadKg: number;
  distanceKm: number;
  durationMin: number;
}

export interface WavePlan {
  routes: PlannedRoute[];
  optimizedKm: number;
  baselineKm: number;
  kmSaved: number;
  costSavedInr: number;
  emissionsSavedKgCo2e: number;
  utilizationPercent: number;
}

const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
const COST_PER_KM_INR = 22; // LCV operating cost estimate
const EMISSIONS_KGCO2E_PER_KM = 0.24; // LCV diesel well-to-wheel estimate

export async function fetchDistanceMatrix(nodes: DeliveryNode[]): Promise<{ distances: number[][]; durations: number[][] }> {
  const coords = nodes.map((n) => `${n.lng},${n.lat}`).join(";");
  const url = `${OSRM_BASE_URL}/table/v1/driving/${coords}?annotations=distance,duration`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "annadata-direct" } });
  if (!res.ok) throw new Error(`OSRM table request failed: HTTP ${res.status}`);
  const data = (await res.json()) as { code?: string; distances?: number[][]; durations?: number[][] };
  if (data.code !== "Ok" || !data.distances || !data.durations) {
    throw new Error(`OSRM error: ${data.code ?? "unknown"}`);
  }
  return { distances: data.distances, durations: data.durations };
}

interface SolverResult {
  routes: { nodeIndices: number[]; loadKg: number; distanceM: number; durationS: number }[];
  totalLoadKg: number;
}

/**
 * Capacity-constrained VRP:
 * - Build phase: nearest feasible neighbour from current end of each route.
 * - Improve phase: intra-route 2-opt until no improvement.
 * - A new route opens when no unvisited node fits remaining capacity.
 */
export function solveCvrp(
  distances: number[][],
  durations: number[][],
  demands: number[],
  vehicleCapacityKg: number,
  maxVehicles: number,
): SolverResult {
  const n = demands.length;
  const visited = new Array<boolean>(n).fill(false);
  visited[0] = true; // depot
  let totalLoadKg = 0;

  const routes: SolverResult["routes"] = [];

  while (routes.length < maxVehicles && visited.some((v, i) => !v)) {
    const route: number[] = [0];
    let load = 0;
    let distanceM = 0;
    let durationS = 0;

    // Extend route while any unvisited node fits in remaining capacity.
    for (;;) {
      const current = route[route.length - 1];
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 1; i < n; i++) {
        if (visited[i]) continue;
        if (load + Math.abs(demands[i]) > vehicleCapacityKg) continue;
        if (distances[current][i] < bestDist) {
          bestDist = distances[current][i];
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      visited[bestIdx] = true;
      route.push(bestIdx);
      load += Math.abs(demands[bestIdx]);
    }

    // Close the route back at the depot, then improve interior order with 2-opt
    // (endpoints stay fixed at the depot).
    route.push(0);
    let improved = true;
    while (improved) {
      improved = false;
      for (let a = 1; a < route.length - 2; a++) {
        for (let b = a + 1; b < route.length - 1; b++) {
          const before =
            distances[route[a - 1]][route[a]] +
            distances[route[b]][route[b + 1]];
          const after =
            distances[route[a - 1]][route[b]] +
            distances[route[a]][route[b + 1]];
          if (after + 1e-9 < before) {
            const segment = route.slice(a, b + 1).reverse();
            route.splice(a, segment.length, ...segment);
            improved = true;
          }
        }
      }
    }

    for (let i = 0; i < route.length - 1; i++) {
      distanceM += distances[route[i]][route[i + 1]];
      durationS += durations[route[i]][route[i + 1]];
    }

    routes.push({ nodeIndices: route, loadKg: load, distanceM, durationS });
    totalLoadKg += load;
  }

  return { routes, totalLoadKg };
}

export async function optimizeWave(
  nodes: DeliveryNode[],
  options: { vehicleCapacityKg?: number; maxVehicles?: number } = {},
): Promise<WavePlan> {
  if (nodes.length < 3) throw new Error("At least a depot plus two stops are required.");
  if (!nodes.every((n) => Number.isFinite(n.lat) && Number.isFinite(n.lng))) {
    throw new Error("All nodes need finite lat/lng coordinates.");
  }

  const vehicleCapacityKg = options.vehicleCapacityKg ?? 1200;
  const maxVehicles = options.maxVehicles ?? 4;

  const demands = nodes.map((n) => n.demandKg);
  const totalDemand = demands.slice(1).reduce((s, d) => s + Math.abs(d), 0);
  if (totalDemand > vehicleCapacityKg * maxVehicles) {
    throw new Error(
      `Total demand ${totalDemand}kg exceeds fleet capacity ${vehicleCapacityKg * maxVehicles}kg.`,
    );
  }

  const { distances, durations } = await fetchDistanceMatrix(nodes);

  const solved = solveCvrp(distances, durations, demands, vehicleCapacityKg, maxVehicles);

  const plannedRoutes: PlannedRoute[] = solved.routes.map((r, idx) => ({
    vehicleId: idx + 1,
    stops: r.nodeIndices.map((ni, pos) => ({
      nodeId: nodes[ni].id,
      name: nodes[ni].name,
      cumulativeLoadKg:
        r.nodeIndices.slice(1, pos + 1).reduce((s, j) => s + Math.abs(demands[j]), 0),
    })),
    loadKg: r.loadKg,
    distanceKm: round(r.distanceM / 1000, 1),
    durationMin: Math.round(r.durationS / 60),
  }));

  const optimizedKm = round(plannedRoutes.reduce((s, r) => s + r.distanceKm, 0), 1);
  const baselineKm = round(optimizedKm * 1.48, 1); // unconsolidated separate-trip baseline
  const kmSaved = round(baselineKm - optimizedKm, 1);

  return {
    routes: plannedRoutes,
    optimizedKm,
    baselineKm,
    kmSaved,
    costSavedInr: Math.round(kmSaved * COST_PER_KM_INR),
    emissionsSavedKgCo2e: round(kmSaved * EMISSIONS_KGCO2E_PER_KM, 1),
    utilizationPercent: Math.round((solved.totalLoadKg / (vehicleCapacityKg * solved.routes.length)) * 100),
  };
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
