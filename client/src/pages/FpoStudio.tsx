import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardPlus,
  Compass,
  DollarSign,
  Globe,
  Layers3,
  Mic,
  Plus,
  Save,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";

const defaultContributions = [
  { farmerCode: "KR-201", harvestCluster: "Hosur cluster", contributedKg: 180 },
  { farmerCode: "KR-224", harvestCluster: "Shoolagiri cluster", contributedKg: 160 },
  { farmerCode: "KR-238", harvestCluster: "Hosur cluster", contributedKg: 140 },
];

const DEFAULT_MANDIS = [
  {
    mandiName: "Krishnagiri Uzhavar Sandhai",
    district: "Krishnagiri",
    state: "Tamil Nadu",
    lat: 12.518,
    lng: 78.216,
    modalPricePerKg: 20.0,
    cessPercent: 1.0,
  },
  {
    mandiName: "Kolar APMC Mandi",
    district: "Kolar",
    state: "Karnataka",
    lat: 13.136,
    lng: 78.129,
    modalPricePerKg: 24.5,
    cessPercent: 1.5,
  },
  {
    mandiName: "Chennai Koyambedu Terminal Market",
    district: "Chennai",
    state: "Tamil Nadu",
    lat: 13.069,
    lng: 80.194,
    modalPricePerKg: 31.0,
    cessPercent: 2.0,
  },
];

export default function FpoStudio() {
  const [listing, setListing] = useState({
    crop: "Tomato",
    availableKg: 480,
    minOrderKg: 10,
    directPricePerKg: 29,
    marketReferencePerKg: 22.5,
    conventionalPricePerKg: 43,
  });

  const [lot, setLot] = useState({
    crop: "Tomato",
    grade: "Grade A",
    contributions: defaultContributions,
  });

  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [listingResult, setListingResult] = useState<any>(null);
  const [lotResult, setLotResult] = useState<any>(null);

  const utils = trpc.useUtils();
  const createListing = trpc.fpo.demoCreateListing.useMutation({
    onSuccess: () => {
      utils.marketplace.demo.invalidate();
    },
  });
  const assembleLot = trpc.fpo.demoAssembleLot.useMutation({
    onSuccess: () => {
      utils.marketplace.demo.invalidate();
    },
  });
  const parseVoice = trpc.operations.parseVoiceListing.useMutation();

  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please type or paste below.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "hi-IN"; // Default to Hindi-India, handles Tamil/English accents
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText(transcript);
        setIsListening(false);
        // Automatically trigger AI parsing
        parseVoice.mutate(
          { transcript },
          {
            onSuccess: (res) => {
              if (res.crop) {
                const formattedCrop = res.crop.charAt(0).toUpperCase() + res.crop.slice(1);
                setListing((prev) => ({
                  ...prev,
                  crop: formattedCrop,
                  availableKg: res.quantityKg ?? prev.availableKg,
                }));
                setLot((prev) => ({
                  ...prev,
                  crop: formattedCrop,
                  grade: res.grade ?? "Grade A",
                  contributions: res.harvestCluster
                    ? [
                        {
                          farmerCode: "KR-VOICE",
                          harvestCluster: `${res.harvestCluster} cluster`,
                          contributedKg: res.quantityKg ?? 480,
                        },
                      ]
                    : prev.contributions,
                }));
              }
            },
          }
        );
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.warn("Speech error:", e);
      setIsListening(false);
    }
  };

  // Dynamic 7-day demand and price forecast for the chosen commodity
  const { data: forecastData, isLoading: isForecastLoading } = trpc.operations.demandForecast.useQuery({
    commodity: listing.crop,
    state: "Tamil Nadu",
    currentStockKg: listing.availableKg,
  });

  // Multi-Mandi Price Arbitrage Query
  const { data: arbitrageData } = trpc.operations.mandiArbitrageMatrix.useQuery({
    commodity: listing.crop,
    quantityKg: listing.availableKg,
    originHub: { name: "Krishnagiri FPO Hub", lat: 12.5104, lng: 78.2137 },
    directAppOfferPerKg: listing.directPricePerKg,
    mandis: DEFAULT_MANDIS,
  });

  // ONDC Beckn Catalog Export Query
  const { data: ondcData } = trpc.operations.exportOndcCatalog.useQuery({
    district: "Krishnagiri",
  });
  const [showOndcModal, setShowOndcModal] = useState(false);

  const totalKg = lot.contributions.reduce((sum, item) => sum + item.contributedKg, 0);

  const handleVoiceParse = () => {
    if (!voiceText.trim()) return;
    parseVoice.mutate(
      { transcript: voiceText },
      {
        onSuccess: (res) => {
          if (res.crop) {
            const formattedCrop = res.crop.charAt(0).toUpperCase() + res.crop.slice(1);
            setListing((prev) => ({
              ...prev,
              crop: formattedCrop,
              availableKg: res.quantityKg ?? prev.availableKg,
            }));
            setLot((prev) => ({
              ...prev,
              crop: formattedCrop,
              grade: res.grade ?? "Grade A",
              contributions: res.harvestCluster
                ? [
                    {
                      farmerCode: "KR-VOICE",
                      harvestCluster: `${res.harvestCluster} cluster`,
                      contributedKg: res.quantityKg ?? 480,
                    },
                  ]
                : prev.contributions,
            }));
          }
        },
      }
    );
  };

  return (
    <AppShell>
      <main>
        {/* Header Section */}
        <section className="border-b border-line bg-[#e6eed8] py-12">
          <div className="site-container grid gap-6 lg:grid-cols-[1.12fr_.88fr]">
            <div>
              <p className="section-eyebrow">FPO role workflow · demo studio</p>
              <h1 className="display-title mt-2 text-5xl font-semibold leading-none">
                Create a buyer-ready lot <em className="not-italic text-leaf">without losing the farmer.</em>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-ink/65">
              Assemble multi-farmer aggregated batches, verify weight tolerances against handling loss, and query the
              7-day statistical mandi forecast & multi-mandi arbitrage spreads before setting prices.
              </p>
              <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowOndcModal(true)}
                className="action-button inline-flex items-center gap-1.5 bg-forest text-white py-2 px-4 text-xs font-bold"
              >
                <Globe size={14} className="text-[#dbecc3]" />
                <span>Inspect ONDC Beckn Protocol Schema</span>
              </button>
              </div>
              </div>
            <div className="rounded-2xl bg-forest p-5 text-white">
              <p className="font-mono text-[.65rem] uppercase tracking-widest text-white/55">Protected production model</p>
              <div className="mt-5 space-y-4">
                {[
                  [ShieldCheck, "FPO onboarding", "Organisation profile, verification status, and safe reference."],
                  [Layers3, "Lot traceability", "Farmer contributions preserved beneath each buyer-ready lot."],
                  [ClipboardPlus, "Operational handoff", "Listings, consolidated lots, and delivery plans are persistable."],
                ].map(([Icon, title, copy]) => (
                  <div key={String(title)} className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[#dbecc3]">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">{title as string}</p>
                      <p className="mt-1 text-xs leading-5 text-white/65">{copy as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Vernacular Voice Assistant & AI Forecast Widget */}
        <section className="site-container py-6">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Voice Draft Box */}
            <div className="soft-card rounded-2xl p-5 border border-line/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-leaf" />
                  <h3 className="text-base font-bold text-ink">Vernacular Voice / Speech Assistant</h3>
                </div>
                <span className="pill bg-sage text-forest">Hindi · Tamil · English</span>
              </div>
              <p className="mt-2 text-xs text-ink/60">
                Farmers can speak in local language (e.g. <em>&quot;Meri 500 kg tamatar ki fasal tayar hai, A-grade, Hosur cluster me&quot;</em>) to auto-fill the lot form.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    isListening ? "animate-pulse bg-rose-600 text-white" : "bg-forest text-white hover:bg-forest/90"
                  }`}
                  title="Click to speak in Hindi, Tamil, or English"
                >
                  <Mic size={14} className={isListening ? "animate-bounce" : "text-[#dbecc3]"} />
                  <span>{isListening ? "Listening..." : "Speak"}</span>
                </button>
                <input
                  type="text"
                  placeholder="Or paste phrase: 500 kg tamatar A-grade Hosur..."
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none"
                />
                <button
                  onClick={handleVoiceParse}
                  disabled={parseVoice.isPending}
                  className="action-button flex shrink-0 items-center gap-1.5 bg-leaf px-4 py-2 text-xs text-forest font-bold"
                >
                  <Sparkles size={14} />
                  <span>{parseVoice.isPending ? "Parsing..." : "Parse"}</span>
                </button>
              </div>
              {parseVoice.data && (
                <div className="mt-3 rounded-xl bg-[#edf5e7] p-3 text-xs text-leaf">
                  <span className="font-bold">Detected:</span> {parseVoice.data.crop} · {parseVoice.data.quantityKg} kg · Grade {parseVoice.data.grade} · Cluster: {parseVoice.data.harvestCluster ?? "N/A"} ({parseVoice.data.confidence} confidence)
                </div>
              )}
            </div>

            {/* 7-Day Forecast & Decision Card */}
            <div className="soft-card rounded-2xl p-5 border border-line/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-leaf" />
                  <h3 className="text-base font-bold text-ink">7-Day AI Price & Demand Forecast</h3>
                </div>
                <span className="pill bg-sage text-forest">{forecastData?.commodity ?? listing.crop}</span>
              </div>

              {isForecastLoading ? (
                <div className="mt-4 animate-pulse text-xs text-ink/50">Computing arrival-elasticity forecast...</div>
              ) : forecastData ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-7 gap-1.5">
                    {forecastData.weeklyForecast.map((day: any) => (
                      <div key={day.date} className="rounded-lg bg-white p-2 text-center border border-line/40">
                        <span className="block text-[10px] text-ink/50">{day.date.slice(5)}</span>
                        <span className="block text-xs font-bold text-ink">₹{day.predictedPricePerKg}</span>
                        <span className="block text-[9px] text-ink/40">{day.estimatedDemandKg}kg</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-forest/5 p-3 text-xs border border-forest/10">
                    <span className="font-bold text-forest">Action: {forecastData.decision.action}</span>
                    <p className="mt-1 text-ink/75 leading-relaxed">{forecastData.decision.recommendationText}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Multi-Mandi Arbitrage Matrix */}
        {arbitrageData && (
          <section className="site-container py-2">
            <div className="soft-card rounded-2xl p-5 border border-line/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-leaf" />
                  <h3 className="text-base font-bold text-ink">Inter-Mandi Arbitrage Matrix</h3>
                </div>
                <span className="pill bg-[#edf5e7] text-leaf font-bold">
                  +{arbitrageData.directPlatformAdvantage.extraEarningPercent}% Higher Net Realization
                </span>
              </div>
              <p className="mt-1 text-xs text-ink/60">
                Calculates net farmer payout after deducting transport freight (₹22/km) and APMC cess across 3 nearest markets vs. direct delivery on Annadata Direct.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {arbitrageData.mandiComparisons.map((mandi) => (
                  <div key={mandi.mandiName} className="rounded-xl bg-white p-3.5 text-xs border border-line/60">
                    <div className="flex items-center justify-between font-bold text-ink">
                      <span>{mandi.mandiName}</span>
                      <span>₹{mandi.modalPricePerKg}/kg</span>
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-ink/60 border-t border-line/40 pt-2">
                      <div className="flex justify-between">
                        <span>Distance from hub:</span>
                        <span>{mandi.distanceKm} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transport deduction:</span>
                        <span>-₹{mandi.estimatedTransportCostInr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>APMC cess / fee:</span>
                        <span>-₹{mandi.estimatedApmcCessInr}</span>
                      </div>
                      <div className="flex justify-between border-t border-line/40 pt-1 font-bold text-forest">
                        <span>Net Farmer Rate:</span>
                        <span>₹{mandi.netRealizationPerKg}/kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-forest p-3 text-xs text-white">
                <div>
                  <span className="font-bold">Annadata Direct Farmgate Offer:</span> ₹{listing.directPricePerKg}/kg (Zero Transport & Cess Deductions)
                </div>
                <span className="font-bold text-[#dbecc3]">
                  Extra Farmer Payout: +₹{arbitrageData.directPlatformAdvantage.extraEarningVsBestMandiInr}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Step 1 & Step 2 Forms */}
        <section className="site-container py-6">
          <div className="grid gap-5 xl:grid-cols-2">
            {/* Publish Supply */}
            <article className="soft-card rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="section-eyebrow">Step 1 · publish supply</p>
                  <h2 className="display-title mt-1 text-3xl font-semibold">Create a transparent listing.</h2>
                </div>
                <span className="pill bg-sage text-forest">
                  <Sprout size={13} />
                  FPO catalog
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-ink/60">
                  Crop name
                  <input
                    value={listing.crop}
                    onChange={(e) => setListing((prev) => ({ ...prev, crop: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                  />
                </label>
                <label className="text-xs text-ink/60">
                  Available weight (kg)
                  <input
                    type="number"
                    value={listing.availableKg}
                    onChange={(e) => setListing((prev) => ({ ...prev, availableKg: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                  />
                </label>
                <label className="text-xs text-ink/60">
                  Direct buyer price (₹/kg)
                  <input
                    type="number"
                    value={listing.directPricePerKg}
                    onChange={(e) => setListing((prev) => ({ ...prev, directPricePerKg: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                  />
                </label>
                <label className="text-xs text-ink/60">
                  Mandi reference (₹/kg)
                  <input
                    type="number"
                    value={listing.marketReferencePerKg}
                    onChange={(e) => setListing((prev) => ({ ...prev, marketReferencePerKg: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                  />
                </label>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <button
                  onClick={() => createListing.mutate(listing, { onSuccess: (res) => setListingResult(res) })}
                  className="action-button flex items-center gap-2 bg-forest text-white"
                >
                  <Save size={15} />
                  <span>Publish listing</span>
                </button>
                {listingResult && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-leaf">
                    <CheckCircle2 size={16} /> Listing #{listingResult.listingId ?? "saved"}
                  </span>
                )}
              </div>
            </article>

            {/* Assemble Lot */}
            <article className="soft-card rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="section-eyebrow">Step 2 · batch traceability</p>
                  <h2 className="display-title mt-1 text-3xl font-semibold">Assemble a pooled lot.</h2>
                </div>
                <span className="pill bg-sage text-forest">
                  <Scale size={13} />
                  Total: {totalKg} kg
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {lot.contributions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs border border-line/50">
                    <div>
                      <span className="font-bold text-ink">{c.farmerCode}</span>
                      <span className="ml-2 text-ink/50">{c.harvestCluster}</span>
                    </div>
                    <span className="font-mono font-semibold text-ink">{c.contributedKg} kg</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <button
                  onClick={() => assembleLot.mutate(lot, { onSuccess: (res) => setLotResult(res) })}
                  className="action-button flex items-center gap-2 bg-forest text-white"
                >
                  <Plus size={15} />
                  <span>Assemble lot</span>
                </button>
                {lotResult && (
                  <div className="text-right">
                    <span className="block text-xs font-bold text-leaf">Lot: {lotResult.lotCode}</span>
                    {lotResult.weightCheck && (
                      <span className="block text-[10px] text-ink/60">{lotResult.weightCheck.message}</span>
                    )}
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>

        {/* ONDC Beckn Protocol JSON Modal */}
        {showOndcModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 px-3 py-6 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-3xl rounded-[2rem] bg-paper p-6 shadow-2xl border border-line">
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="text-forest" />
                  <h3 className="font-bold text-ink">ONDC / Beckn Protocol v1.2.0 Agriculture Schema</h3>
                </div>
                <button
                  onClick={() => setShowOndcModal(false)}
                  className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-ink"
                >
                  Close
                </button>
              </div>
              <p className="mt-2 text-xs text-ink/60">
                This machine-readable payload enables any national ONDC buyer app (Paytm, Pincode, Mystore) to discover Annadata Direct FPO lots.
              </p>
              <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-[#1e293b] p-4 text-[11px] font-mono text-[#a2d149] leading-relaxed">
                {JSON.stringify(ondcData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
