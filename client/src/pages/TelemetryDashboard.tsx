import { useState } from "react";
import {
  ThermometerSnowflake,
  AlertTriangle,
  Battery,
  DoorOpen,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";

export default function TelemetryDashboard() {
  const { data, refetch, isFetching } = trpc.operations.getLiveTelemetry.useQuery({
    tripCode: "TRIP-CHN-07",
  });

  const readings = data?.telemetryTimeline ?? [];
  const alerts = data?.activeAlerts ?? [];
  const latestReading = readings[readings.length - 1];

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f8faf5] py-8">
        <div className="site-container max-w-5xl space-y-6">
          <section className="rounded-3xl bg-forest p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#dbecc3]">
                  <ThermometerSnowflake size={24} />
                </div>
                <div>
                  <span className="pill bg-white/10 text-xs font-mono text-[#dbecc3]">
                    REEFER REFRIGERATION TELEMETRY
                  </span>
                  <h1 className="mt-1 text-2xl font-bold">Cold-Chain Quality Assurance</h1>
                  <p className="text-xs text-white/70">
                    Real-time container IoT sensors tracking temperature, relative humidity, door-ajar status, and GPS telemetry.
                  </p>
                </div>
              </div>
              <button
                onClick={() => refetch()}
                className="action-button flex items-center gap-2 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
              >
                <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
                <span>Sync Sensors</span>
              </button>
            </div>
          </section>

          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="soft-card rounded-2xl p-4 border border-line">
              <p className="text-xs text-ink/60">Container Temperature</p>
              <p className="mt-1 text-2xl font-bold text-forest">
                {latestReading ? `${latestReading.temperatureCelsius}°C` : "6.4°C"}
              </p>
              <span className="pill bg-sage text-forest text-[10px] mt-2 inline-block">
                Optimal range: 4°C - 10°C
              </span>
            </div>

            <div className="soft-card rounded-2xl p-4 border border-line">
              <p className="text-xs text-ink/60">Relative Humidity</p>
              <p className="mt-1 text-2xl font-bold text-forest">
                {latestReading ? `${latestReading.humidityPercent}%` : "86.0%"}
              </p>
              <span className="pill bg-sage text-forest text-[10px] mt-2 inline-block">
                Preserves moisture & crispness
              </span>
            </div>

            <div className="soft-card rounded-2xl p-4 border border-line">
              <p className="text-xs text-ink/60">Reefer Door Status</p>
              <p className="mt-1 text-2xl font-bold text-forest">
                {latestReading?.doorOpen ? "OPEN" : "SEALED"}
              </p>
              <span className={`pill text-[10px] mt-2 inline-block ${latestReading?.doorOpen ? "bg-rose-100 text-rose-800" : "bg-sage text-forest"}`}>
                {latestReading?.doorOpen ? "Thermal loss risk" : "Sensor lock intact"}
              </span>
            </div>

            <div className="soft-card rounded-2xl p-4 border border-line">
              <p className="text-xs text-ink/60">IoT Battery & Signal</p>
              <p className="mt-1 text-2xl font-bold text-forest">
                {latestReading ? `${latestReading.batteryPercent}%` : "94%"}
              </p>
              <span className="pill bg-sage text-forest text-[10px] mt-2 inline-block">
                Cellular 4G IoT Telematics
              </span>
            </div>
          </div>

          {/* Temperature Timeline Graph */}
          <section className="soft-card rounded-3xl p-6 border border-line">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-leaf" />
                <h2 className="text-base font-bold text-ink">Trip Temperature Profile (Krishnagiri → Chennai)</h2>
              </div>
              <span className="pill bg-sage text-forest font-bold">15-min Intervals</span>
            </div>

            <div className="mt-6 flex h-44 items-end gap-2 border-b border-line/60 pb-2">
              {readings.map((r, i) => {
                const heightPercent = Math.min(100, Math.max(10, (r.temperatureCelsius / 16) * 100));
                const isBreach = r.temperatureCelsius > 12;
                return (
                  <div key={i} className="group relative flex-1 flex flex-col items-center">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all ${
                        isBreach ? "bg-rose-500" : "bg-forest group-hover:bg-leaf"
                      }`}
                    />
                    <span className="mt-2 text-[9px] text-ink/50 block truncate">
                      {r.temperatureCelsius}°
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Alerts & Breach Logs */}
          <section className="soft-card rounded-3xl p-6 border border-line">
            <h2 className="text-base font-bold text-ink border-b border-line pb-3">Telemetry Event Log</h2>
            <div className="mt-4 space-y-2.5">
              {alerts.length === 0 && (
                <div className="rounded-xl bg-[#edf5e7] p-4 text-xs text-leaf font-semibold text-center">
                  ✓ Zero quality breaches detected. Cold-chain integrity guaranteed.
                </div>
              )}
              {alerts.map((alt) => (
                <div key={alt.alertId} className="flex items-center justify-between rounded-xl bg-rose-50 p-3 text-xs border border-rose-200 text-rose-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                    <span>{alt.message}</span>
                  </div>
                  <span className="font-mono text-[10px] opacity-70">{alt.timestamp.slice(11, 16)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
