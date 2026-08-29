import { useState, useRef } from "react";
import {
  Truck,
  CheckCircle2,
  Navigation,
  MapPin,
  Camera,
  PenTool,
  Clock,
  ShieldCheck,
  Fuel,
  Sparkles,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";

export default function DriverPortal() {
  const [activeStopIndex, setActiveStopIndex] = useState(3);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("Mr. K. Ananth (RWA Hub Manager)");
  const [deliveredKg, setDeliveredKg] = useState(400);
  const [podSubmitted, setPodSubmitted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { data: tripData } = trpc.operations.getDriverActiveTrip.useQuery({
    tripCode: "TRIP-CHN-07",
  });

  const submitPod = trpc.operations.submitProofOfDelivery.useMutation({
    onSuccess: () => {
      setPodSubmitted(true);
      setActiveStopIndex((prev) => prev + 1);
    },
  });

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1b4329";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const currentStop = tripData?.stops[activeStopIndex] ?? tripData?.stops[3];

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f8faf5] py-8">
        <div className="site-container max-w-4xl space-y-6">
          {/* Top Driver Header */}
          <section className="rounded-3xl bg-forest p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#dbecc3]">
                  <Truck size={24} />
                </div>
                <div>
                  <span className="pill bg-white/10 text-xs font-mono text-[#dbecc3]">
                    {tripData?.tripCode ?? "TRIP-CHN-07"} · ACTIVE DISPATCH WAVE
                  </span>
                  <h1 className="mt-1 text-2xl font-bold">{tripData?.driverName ?? "Murugan Selvam"}</h1>
                  <p className="text-xs text-white/70">{tripData?.vehicleNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-right text-xs">
                <div>
                  <p className="text-white/60">Current Vehicle Load</p>
                  <p className="font-bold text-white text-base">
                    {tripData?.currentLoadKg} / {tripData?.capacityKg} kg
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Current Stop Check-in / e-POD */}
          <div className="grid gap-6 lg:grid-cols-5">
            <section className="soft-card rounded-3xl p-6 lg:col-span-3 border border-line">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-leaf" />
                  <h2 className="text-lg font-bold text-ink">Active Waypoint Action</h2>
                </div>
                <span className="pill bg-sage text-forest font-bold">Stop {activeStopIndex + 1} of {tripData?.stops.length}</span>
              </div>

              {currentStop && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-[#edf5e7] p-4 text-xs text-ink">
                    <p className="text-leaf font-bold uppercase tracking-wider text-[10px]">
                      {currentStop.type === "buyer" ? "Urban Buyer Drop" : "Farmgate Consolidation"}
                    </p>
                    <h3 className="text-base font-bold text-forest mt-0.5">{currentStop.name}</h3>
                    <p className="text-ink/60 mt-1 flex items-center gap-1">
                      <MapPin size={13} /> GPS: {currentStop.lat}, {currentStop.lng}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink">
                      Cargo: {Math.abs(currentStop.demandKg)} kg {currentStop.type === "buyer" ? "Delivery Drop" : "Pickup"}
                    </p>
                  </div>

                  {/* Digital Signature Pad (e-POD) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-ink flex items-center gap-1.5">
                        <PenTool size={14} className="text-leaf" /> Recipient Digital Signature (e-POD)
                      </label>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-[11px] text-ink/50 hover:text-ink underline"
                      >
                        Clear Pad
                      </button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={130}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full rounded-2xl border-2 border-dashed border-line bg-white touch-none cursor-crosshair"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-ink/60">
                      Recipient Name
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                      />
                    </label>
                    <label className="text-xs text-ink/60">
                      Confirmed Quantity (kg)
                      <input
                        type="number"
                        value={deliveredKg}
                        onChange={(e) => setDeliveredKg(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                      />
                    </label>
                  </div>

                  <button
                    onClick={() =>
                      submitPod.mutate({
                        tripCode: tripData?.tripCode ?? "TRIP-CHN-07",
                        stopId: currentStop.id,
                        recipientName,
                        deliveredKg,
                        signatureBase64: signatureData ?? undefined,
                        gpsLat: currentStop.lat,
                        gpsLng: currentStop.lng,
                      })
                    }
                    disabled={submitPod.isPending}
                    className="action-button w-full flex items-center justify-center gap-2 bg-forest text-white py-3 text-sm font-bold shadow-md"
                  >
                    <CheckCircle2 size={16} />
                    <span>{submitPod.isPending ? "Recording e-POD..." : "Confirm Delivery & Trigger Instant UPI Payout"}</span>
                  </button>

                  {podSubmitted && (
                    <div className="rounded-xl bg-[#edf5e7] p-3 text-xs text-leaf font-semibold text-center border border-leaf/30">
                      ✓ Stop verified! Instant UPI escrow release dispatched to farmer.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Stop Sequence Itinerary */}
            <section className="soft-card rounded-3xl p-6 lg:col-span-2 border border-line">
              <h2 className="text-base font-bold text-ink border-b border-line pb-3">Trip Waypoints</h2>
              <div className="mt-4 space-y-3">
                {tripData?.stops.map((stop, idx) => {
                  const isPast = idx < activeStopIndex;
                  const isCurrent = idx === activeStopIndex;
                  return (
                    <div
                      key={stop.id}
                      onClick={() => setActiveStopIndex(idx)}
                      className={`cursor-pointer rounded-2xl p-3 text-xs transition-all border ${
                        isCurrent
                          ? "border-forest bg-sage/30 shadow-sm font-bold"
                          : isPast
                          ? "border-line/40 bg-white/60 text-ink/50"
                          : "border-line bg-white text-ink"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span
                            className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                              isPast ? "bg-leaf text-forest" : isCurrent ? "bg-forest text-white" : "bg-cream text-ink"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span>{stop.name}</span>
                        </span>
                        {isPast && <CheckCircle2 size={14} className="text-leaf shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
