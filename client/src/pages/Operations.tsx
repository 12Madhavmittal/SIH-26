import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  CircleDotDashed,
  Clock,
  Fuel,
  Layers,
  Leaf,
  MapPin,
  MapPinned,
  PackageCheck,
  RefreshCw,
  Route,
  Scale,
  ScanLine,
  Sparkles,
  TrendingUp,
  Truck,
  UsersRound,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Link } from "wouter";
import ProduceArt from "@/components/ProduceArt";
import { RouteMap } from "@/components/RouteMap";
import { demoFallback } from "@/lib/demoFallback";
import { trpc } from "@/lib/trpc";

const riskStyle: Record<string, string> = {
  Low: "bg-[#edf5e7] text-leaf",
  Balanced: "bg-[#eef1e6] text-forest",
  Watch: "bg-[#fff0e9] text-tomato",
};

// Realistic node positions in the Krishnagiri - Chennai corridor
const DEFAULT_WAVE_NODES = [
  { id: "depot", name: "Krishnagiri FPO Consolidation Hub", lat: 12.5104, lng: 78.2137, demandKg: 0 },
  { id: "farm1", name: "Farmer A Farmgate (Hosur)", lat: 12.55, lng: 78.15, demandKg: 350 },
  { id: "farm2", name: "Farmer B Farmgate (Shoolagiri)", lat: 12.48, lng: 78.28, demandKg: 280 },
  { id: "buyer1", name: "Green Bowl Kitchens (Adyar Bulk)", lat: 12.9906, lng: 80.2206, demandKg: 300 },
  { id: "buyer2", name: "Besant Nagar Society Drop", lat: 13.0001, lng: 80.2667, demandKg: 150 },
  { id: "buyer3", name: "Velachery Residential Cluster", lat: 12.9759, lng: 80.2212, demandKg: 100 },
];

const DEFAULT_PERISHABLE_LOTS = [
  {
    lotCode: "KHC-TOM-0826-A",
    crop: "Tomato",
    grade: "A",
    totalKg: 620,
    unitPriceInr: 28,
    harvestedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(), // 14 hours ago
  },
  {
    lotCode: "KPF-ONI-0826-B",
    crop: "Onion",
    grade: "A",
    totalKg: 980,
    unitPriceInr: 52,
    harvestedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), // 48 hours ago
  },
  {
    lotCode: "HFN-GRN-0826-C",
    crop: "Groundnut",
    grade: "Premium",
    totalKg: 420,
    unitPriceInr: 96,
    harvestedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), // 72 hours ago
  },
];

export default function Operations() {
  const { data: liveData } = trpc.marketplace.demo.useQuery();
  const data = liveData ?? demoFallback;
  const staticLogistics = data?.logistics;

  const [customNodes, setCustomNodes] = useState(DEFAULT_WAVE_NODES);

  // Live dynamic route optimizer mutation
  const optimizeMutation = trpc.operations.optimizeWave.useMutation();
  const [livePlan, setLivePlan] = useState<any>(null);

  // Regional Geo-clustering query
  const { data: geoClusters } = trpc.operations.clusterGeoNodes.useQuery({
    points: customNodes,
    maxRadiusKm: 30.0,
  });

  // Perishable Spoilage Priority query
  const { data: spoilagePriorities } = trpc.operations.evaluateSpoilagePriority.useQuery({
    lots: DEFAULT_PERISHABLE_LOTS,
  });

  const handleRunOptimization = () => {
    optimizeMutation.mutate(
      {
        nodes: customNodes,
        vehicleCapacityKg: 1200,
        maxVehicles: 2,
      },
      {
        onSuccess: (result) => {
          setLivePlan(result);
        },
      }
    );
  };

  const handleStopDragEnd = (stopId: string, newLat: number, newLng: number) => {
    setCustomNodes((prev) =>
      prev.map((n) => (n.id === stopId ? { ...n, lat: Number(newLat.toFixed(4)), lng: Number(newLng.toFixed(4)) } : n))
    );
  };

  const currentKmSaved = livePlan ? livePlan.kmSaved : staticLogistics?.routeComparison?.kmSaved ?? 32;
  const currentCostSaved = livePlan ? livePlan.costSavedInr : staticLogistics?.routeComparison?.costSaved ?? 860;
  const currentEmissions = livePlan ? livePlan.emissionsSavedKgCo2e : staticLogistics?.routeComparison?.emissionsSavedKg ?? 9;
  const currentOptimizedKm = livePlan ? livePlan.optimizedKm : staticLogistics?.routeComparison?.optimizedKm ?? 54;
  const currentBaselineKm = livePlan ? livePlan.baselineKm : staticLogistics?.routeComparison?.baselineKm ?? 86;
  const currentUtil = livePlan ? livePlan.utilizationPercent : staticLogistics?.utilizationPercent ?? 82;

  const currentStops = livePlan?.routes?.[0]?.stops ?? staticLogistics?.stops ?? [];
  const selectedRouteNodeIds: string[] | null =
    livePlan?.routes?.[0]?.stops?.map((stop: { nodeId: string }) => stop.nodeId) ?? null;
  const nodeById = new Map(customNodes.map((node) => [node.id, node]));
  const mapRouteNodes = selectedRouteNodeIds
    ? selectedRouteNodeIds
        .map((id) => nodeById.get(id))
        .filter((node): node is (typeof DEFAULT_WAVE_NODES)[number] => Boolean(node))
    : [
        ...customNodes,
        { ...customNodes[0], id: "depot-return", name: "Return to Krishnagiri FPO Hub" },
      ];
  const mapStops = mapRouteNodes.map((node, index) => ({
    ...node,
    type:
      node.id === "depot-return" || (index === mapRouteNodes.length - 1 && node.id === "depot")
        ? ("return" as const)
        : node.id === "depot"
          ? ("depot" as const)
          : node.id.startsWith("farm")
            ? ("farm" as const)
            : ("buyer" as const),
  }));

  return (
    <AppShell>
      <main>
        {/* Hero Section */}
        <section className="border-b border-line bg-[#24462e] py-12 text-white">
          <div className="site-container">
            <p className="section-eyebrow !text-[#dbecc3]">FPO & logistics workspace</p>
            <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <h1 className="display-title text-5xl font-semibold leading-none">
                  Operate the full chain,
                  <br />
                  <em className="not-italic text-[#dbecc3]">not just the storefront.</em>
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
                  This workspace coordinates harvest pooling, regional geo-clustering, perishable shelf-life decay, and
                  open-source OSRM + CVRP multi-stop vehicle dispatch.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <Link href="/fpo-studio" className="action-button bg-[#dbecc3] text-forest no-underline">
                  Open FPO studio
                </Link>
                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                  <p className="font-mono text-[.65rem] uppercase tracking-widest text-white/50">Wave status</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold">
                    <span className="h-2 w-2 rounded-full bg-[#dbecc3]" />
                    {livePlan ? "Dynamic OSRM Solved" : staticLogistics?.status ?? "Ready to dispatch"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Demand & Live Dispatch Section */}
        <section className="site-container py-8">
          <div className="grid gap-5 xl:grid-cols-[1.28fr_.72fr]">
            <div className="space-y-6">
              {/* Demand Intelligence Grid */}
              <div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="section-eyebrow">Demand intelligence</p>
                    <h2 className="display-title mt-1 text-3xl font-semibold">Explain the recommendation.</h2>
                  </div>
                  <span className="pill bg-sage text-forest">
                    <CircleDotDashed size={13} />
                    Elasticity & EMA time-series model
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {(data?.demand ?? []).map((item: any) => (
                    <article key={item.crop} className="soft-card rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`pill ${riskStyle[item.risk] ?? "bg-[#edf5e7] text-leaf"}`}>{item.risk} risk</span>
                        <span className="font-mono text-[.62rem] text-ink/45">{item.confidence}% conf.</span>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage/60">
                          <ProduceArt
                            type={
                              item.crop.toLowerCase().includes("tomato")
                                ? "tomato"
                                : item.crop.toLowerCase().includes("onion")
                                ? "onion"
                                : "groundnut"
                            }
                            compact
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold leading-tight text-ink">{item.crop}</h3>
                          <p className="text-xs text-ink/60">Forecast: {item.forecastKg} kg</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-ink/75">{item.explanation}</p>
                      <div className="mt-4 border-t border-line/60 pt-3 text-[.7rem] text-ink/60">
                        <span>Recommend: <strong>{item.recommendedKg} kg</strong></span> · <span>Surplus: {item.surplusKg} kg</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* Regional Geo-Clustering & Perishable Priority Cards */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* Regional Geo-Clusters */}
                <div className="soft-card rounded-3xl p-5 border border-line/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-leaf" />
                      <h3 className="text-base font-bold text-ink">Regional Geo-Clusters (DBSCAN)</h3>
                    </div>
                    <span className="pill bg-sage text-forest">{geoClusters?.length ?? 0} Zones</span>
                  </div>
                  <p className="mt-2 text-xs text-ink/60">
                    Groups pickup farmgates and buyer drops by geographic proximity (30 km density radius) before routing.
                  </p>
                  <div className="mt-4 space-y-2.5">
                    {(geoClusters ?? []).map((cluster) => (
                      <div key={cluster.clusterId} className="rounded-xl bg-white p-3 text-xs border border-line/50">
                        <div className="flex items-center justify-between font-bold text-ink">
                          <span>{cluster.clusterName}</span>
                          <span className="font-mono text-leaf">{cluster.totalDemandKg} kg pooled</span>
                        </div>
                        <p className="mt-1 text-[11px] text-ink/50">
                          {cluster.points.length} nodes · Radius: {cluster.radiusKm} km · Centroid: {cluster.center.lat.toFixed(3)}, {cluster.center.lng.toFixed(3)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Perishable Shelf-Life Decay Ranking */}
                <div className="soft-card rounded-3xl p-5 border border-line/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-tomato" />
                      <h3 className="text-base font-bold text-ink">Perishable Decay & Priority</h3>
                    </div>
                    <span className="pill bg-[#fff0e9] text-tomato">Q(t) = Q₀·e^(-kt)</span>
                  </div>
                  <p className="mt-2 text-xs text-ink/60">
                    Decay-based dispatch sequencing ensures high-deterioration crops leave on the earliest wave.
                  </p>
                  <div className="mt-4 space-y-2.5">
                    {(spoilagePriorities ?? []).map((lot) => (
                      <div key={lot.lotCode} className="rounded-xl bg-white p-3 text-xs border border-line/50">
                        <div className="flex items-center justify-between font-bold text-ink">
                          <span>
                            #{lot.dispatchUrgencyRank} {lot.crop} ({lot.lotCode})
                          </span>
                          <span className={lot.spoilageRiskLevel === "Critical" || lot.spoilageRiskLevel === "High" ? "text-tomato" : "text-leaf"}>
                            {lot.currentQualityScore}% Quality
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-ink/60">
                          <span>Shelf-life left: <strong>{lot.remainingShelfLifeHours}h</strong></span>
                          <span>Risk: <strong>{lot.spoilageRiskLevel}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Route Optimizer Card */}
              <div className="soft-card rounded-3xl p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Route className="h-5 w-5 text-leaf" />
                      <h3 className="text-lg font-bold text-ink">CVRP Dispatch Wave + Google Road View</h3>
                    </div>
                    <p className="mt-1 text-xs text-ink/60">
                      Solves the dispatch wave over an OSRM road matrix, then renders the selected stop order on Google Maps.
                    </p>
                  </div>
                  <button
                    onClick={handleRunOptimization}
                    disabled={optimizeMutation.isPending}
                    className="action-button flex items-center gap-2 bg-forest text-white hover:bg-forest/90 disabled:opacity-50"
                  >
                    {optimizeMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-[#dbecc3]" />
                    )}
                    <span>{optimizeMutation.isPending ? "Calculating route matrix..." : "Recalculate Dynamic Route"}</span>
                  </button>
                </div>

                {/* Efficiency KPIs */}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-line/70 bg-white/60 p-4">
                    <p className="font-mono text-[.62rem] uppercase tracking-wider text-ink/50">Road Distance</p>
                    <p className="mt-1 text-xl font-bold text-ink">{currentOptimizedKm} km</p>
                    <p className="text-[.68rem] text-ink/50">vs {currentBaselineKm} km baseline</p>
                  </div>
                  <div className="rounded-2xl border border-line/70 bg-white/60 p-4">
                    <p className="font-mono text-[.62rem] uppercase tracking-wider text-ink/50">Km Avoided</p>
                    <p className="mt-1 flex items-center gap-1 text-xl font-bold text-leaf">
                      <ArrowDownRight size={18} />
                      {currentKmSaved} km
                    </p>
                    <p className="text-[.68rem] text-leaf/80">Consolidated pooling</p>
                  </div>
                  <div className="rounded-2xl border border-line/70 bg-white/60 p-4">
                    <p className="font-mono text-[.62rem] uppercase tracking-wider text-ink/50">Fuel Cost Saved</p>
                    <p className="mt-1 text-xl font-bold text-ink">₹{currentCostSaved}</p>
                    <p className="text-[.68rem] text-ink/50">₹22/km LCV rate</p>
                  </div>
                  <div className="rounded-2xl border border-line/70 bg-white/60 p-4">
                    <p className="font-mono text-[.62rem] uppercase tracking-wider text-ink/50">CO₂e Avoided</p>
                    <p className="mt-1 flex items-center gap-1 text-xl font-bold text-leaf">
                      <Leaf size={16} />
                      {currentEmissions} kg
                    </p>
                    <p className="text-[.68rem] text-ink/50">0.24 kg/km diesel</p>
                  </div>
                </div>

                {/* Google Maps renders road geometry for the chosen dispatch order. */}
                <div className="mt-6 border-t border-line/60 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/60 mb-3">
                    Selected Dispatch Route
                  </p>
                  <RouteMap stops={mapStops} onStopDragEnd={handleStopDragEnd} />
                </div>

                {/* Stop Sequence Timeline */}
                <div className="mt-6 border-t border-line/60 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">
                    Planned Stop Sequence (Depot → Drops → Return)
                  </p>
                  <div className="mt-3 space-y-2">
                    {currentStops.map((stop: any, idx: number) => (
                      <div
                        key={stop.nodeId ?? `${stop.name ?? "stop"}-${idx}`}
                        className="flex items-center justify-between rounded-xl bg-white/80 p-3 text-xs border border-line/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest text-[10px] font-bold text-white">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-ink">{stop.name}</span>
                        </div>
                        <span className="font-mono text-[.68rem] text-ink/60">
                          {stop.cumulativeLoadKg !== undefined
                            ? `Cumulative load: ${stop.cumulativeLoadKg} kg`
                            : stop.detail ?? "Verified route node"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Vehicle Readiness & Impact */}
            <div className="space-y-4">
              <div className="soft-card rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-ink">LCV Load Utilization</h3>
                  <span className="pill bg-sage text-forest">{currentUtil}% full</span>
                </div>
                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-sage/60">
                  <div
                    className="h-full rounded-full bg-forest transition-all duration-500"
                    style={{ width: `${Math.min(100, currentUtil)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-ink/60">
                  Electric / Diesel Light Commercial Vehicle (1.2 Tonne Payload Capacity).
                </p>
              </div>

              <div className="soft-card rounded-3xl p-6">
                <h3 className="font-bold text-ink">DoCA Supply-Chain Metrics</h3>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between border-b border-line/40 pb-2">
                    <span className="text-ink/60">Disintermediation Gain</span>
                    <span className="font-bold text-leaf">+{data?.impact?.farmerIncomeUpliftPercent ?? 34}% to farmers</span>
                  </div>
                  <div className="flex justify-between border-b border-line/40 pb-2">
                    <span className="text-ink/60">Buyer Direct Savings</span>
                    <span className="font-bold text-ink">₹{data?.impact?.buyerSavingsInr ?? 14680}</span>
                  </div>
                  <div className="flex justify-between border-b border-line/40 pb-2">
                    <span className="text-ink/60">Post-Harvest Waste Avoided</span>
                    <span className="font-bold text-leaf">{data?.impact?.wasteAvoidedKg ?? 186} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/60">On-Time Dispatch SLA</span>
                    <span className="font-bold text-ink">{data?.impact?.onTimeDeliveryPercent ?? 96}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
