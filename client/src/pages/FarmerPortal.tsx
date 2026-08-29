import { useState } from "react";
import {
  Sprout,
  Calendar,
  CloudSun,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Plus,
  ShieldCheck,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";

export default function FarmerPortal() {
  const [crop, setCrop] = useState("Tomato (Hybrid F1)");
  const [harvestKg, setHarvestKg] = useState(600);
  const [cluster, setCluster] = useState("Hosur Rayakottai Belt");
  const [expectedDate, setExpectedDate] = useState("2026-08-30");
  const [logged, setLogged] = useState(false);

  const { data: weatherData } = trpc.operations.harvestWeatherForecast.useQuery({
    lat: 12.5104,
    lng: 78.2137,
    locationName: "Krishnagiri Farmer Cluster",
  });

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f8faf5] py-8">
        <div className="site-container max-w-5xl space-y-6">
          <section className="rounded-3xl bg-forest p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#dbecc3]">
                  <Sprout size={24} />
                </div>
                <div>
                  <span className="pill bg-white/10 text-xs font-mono text-[#dbecc3]">
                    FARMER EMPOWERMENT PORTAL
                  </span>
                  <h1 className="mt-1 text-2xl font-bold">Kisan Direct Dashboard</h1>
                  <p className="text-xs text-white/70">
                    Log upcoming harvest batches, check micro-weather advisory, and track direct UPI bank settlements.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Harvest Log & Agro-Weather Advisory */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Harvest Registration */}
            <section className="soft-card rounded-3xl p-6 lg:col-span-2 border border-line">
              <h2 className="text-base font-bold text-ink border-b border-line pb-3">Log Upcoming Harvest</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-xs text-ink/60">
                  Crop Variety
                  <input
                    type="text"
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                  />
                </label>

                <label className="block text-xs text-ink/60">
                  Estimated Ready Yield (kg)
                  <input
                    type="number"
                    value={harvestKg}
                    onChange={(e) => setHarvestKg(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                  />
                </label>

                <label className="block text-xs text-ink/60">
                  Harvest Cluster
                  <input
                    type="text"
                    value={cluster}
                    onChange={(e) => setCluster(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                  />
                </label>

                <label className="block text-xs text-ink/60">
                  Expected Plucking Date
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                  />
                </label>

                <button
                  onClick={() => setLogged(true)}
                  className="action-button w-full flex items-center justify-center gap-2 bg-forest text-white py-2.5 text-xs font-bold"
                >
                  <Plus size={15} />
                  <span>Notify FPO for Aggregation</span>
                </button>

                {logged && (
                  <div className="rounded-xl bg-[#edf5e7] p-3 text-xs text-leaf font-semibold text-center border border-leaf/30">
                    ✓ Harvest registered with Krishnagiri Collective! Dispatch wave allocated.
                  </div>
                )}
              </div>
            </section>

            {/* Agro-Weather Advisory */}
            <section className="soft-card rounded-3xl p-6 lg:col-span-3 border border-line">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <CloudSun className="h-5 w-5 text-leaf" />
                  <h2 className="text-base font-bold text-ink">Agro-Weather Harvest Window</h2>
                </div>
                <span className="pill bg-sage text-forest font-bold">
                  {weatherData?.harvestSuitability ?? "OPTIMAL"}
                </span>
              </div>

              {weatherData && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-[#edf5e7] p-4 text-xs text-ink">
                    <p className="font-bold text-forest">Harvest Advisory Recommendation:</p>
                    <p className="mt-1 text-ink/80 leading-relaxed">{weatherData.recommendation}</p>
                    <div className="mt-3 flex gap-4 text-[11px] font-semibold text-ink/70">
                      <span>Temp: {weatherData.currentTempC}°C</span>
                      <span>Humidity: {weatherData.relativeHumidity}%</span>
                      <span>Rain Risk: {weatherData.precipitationProbability}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {weatherData.threeDayForecast.map((f) => (
                      <div key={f.day} className="rounded-xl bg-white p-3 text-center border border-line/60">
                        <span className="block text-xs font-bold text-ink">{f.day}</span>
                        <span className="block text-sm font-semibold text-forest mt-1">
                          {f.maxTempC}° / {f.minTempC}°
                        </span>
                        <span className={`pill text-[9px] mt-2 inline-block ${f.suitable ? "bg-sage text-forest" : "bg-rose-100 text-rose-800"}`}>
                          {f.suitable ? "Good Harvest" : "Rain Delay"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Payout History Ledger */}
          <section className="soft-card rounded-3xl p-6 border border-line">
            <h2 className="text-base font-bold text-ink border-b border-line pb-3">Direct Bank UPI Payout History</h2>
            <div className="mt-4 space-y-2.5">
              {[
                { lot: "LOT-TOM-260829-A", crop: "Tomato Grade A", kg: 450, payout: 12600, date: "29 Aug 2026", status: "INSTANT_UPI_SETTLED" },
                { lot: "LOT-ONI-260822-B", crop: "Red Onion Grade A", kg: 380, payout: 11780, date: "22 Aug 2026", status: "INSTANT_UPI_SETTLED" },
                { lot: "LOT-GRN-260814-A", crop: "Groundnut in Shell", kg: 200, payout: 14400, date: "14 Aug 2026", status: "INSTANT_UPI_SETTLED" },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-white p-3.5 text-xs border border-line/60">
                  <div>
                    <span className="font-bold text-forest">{p.lot}</span>
                    <span className="ml-2 text-ink/60">{p.crop} ({p.kg} kg) · {p.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-forest text-sm">₹{p.payout.toLocaleString()}</span>
                    <span className="pill bg-[#edf5e7] text-leaf font-bold text-[10px]">
                      <CheckCircle2 size={12} className="inline mr-1" /> UPI Credited
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
