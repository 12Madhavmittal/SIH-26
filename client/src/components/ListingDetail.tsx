import {
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  MapPin,
  PackageCheck,
  Scale,
  ScanLine,
  ShieldCheck,
  ShoppingBasket,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import ProduceArt from "./ProduceArt";
import { EscrowTracker } from "./EscrowTracker";

type Basket = { quantityKg: number; buyerType: "consumer" | "bulk"; deliveryChoice: string; total: number };

export default function ListingDetail({ listing, onClose }: { listing: any; onClose: () => void }) {
  const [quantity, setQuantity] = useState(listing.minOrderKg);
  const [buyerType, setBuyerType] = useState<"consumer" | "bulk">("consumer");
  const [deliveryChoice, setDeliveryChoice] = useState("Consolidated next-day delivery");
  const [baskets, setBaskets] = useState<Partial<Record<"consumer" | "bulk", Basket>>>({});
  const [result, setResult] = useState<any>(null);

  const order = trpc.marketplace.reserveDemoOrder.useMutation();

  // Query live DB provenance for this lot if available
  const { data: traceData } = trpc.operations.traceLot.useQuery(
    { lotCode: listing.lotCode },
    { enabled: Boolean(listing.lotCode) }
  );

  const verification = listing.verification ?? {
    status: "Demo verified",
    reference: "FPO-DEMO-26033",
    copy: "Illustrative FPO onboarding record; production verification requires consented documents and field validation.",
  };

  const total = Number((quantity * listing.price.directBuyerPrice).toFixed(2));
  const activeBasket = baskets[buyerType];
  const minimumQuantity = buyerType === "bulk" ? Math.min(50, listing.availableKg) : listing.minOrderKg;

  useEffect(() => {
    setQuantity((current: number) => Math.min(listing.availableKg, Math.max(minimumQuantity, current)));
  }, [listing.availableKg, minimumQuantity]);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const addToBasket = () => {
    setResult(null);
    setBaskets((current) => ({
      ...current,
      [buyerType]: { quantityKg: quantity, buyerType, deliveryChoice, total },
    }));
  };

  const confirmOrder = () => {
    if (!activeBasket) return;
    order.mutate(
      { listingId: listing.id, quantityKg: activeBasket.quantityKg, buyerType: activeBasket.buyerType },
      { onSuccess: setResult }
    );
  };

  const contributors = traceData?.found ? traceData.contributors : listing.traceability ?? [];
  const weightCheck = traceData?.found ? traceData.weightCheck : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/30 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-8">
      <div role="dialog" aria-modal="true" aria-labelledby="listing-detail-title" className="mx-auto w-full max-w-5xl overflow-hidden rounded-[1.65rem] bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
          <div>
            <p className="section-eyebrow">Traceable direct lot</p>
            <p className="mt-1 font-display text-xl font-semibold tracking-[-0.05em]">{listing.lotCode}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white" aria-label="Close detail">
            <X size={18} />
          </button>
        </div>

        <div className="grid lg:grid-cols-[0.95fr_1.25fr]">
          {/* Left Column: Visuals & Provenance */}
          <div className="border-b border-line p-5 lg:border-b-0 lg:border-r lg:p-7">
            <ProduceArt type={listing.color} />
            <div className="mt-5">
              <span className="pill bg-sage text-forest"><ShieldCheck size={13} />{verification.status}</span>
              <h2 id="listing-detail-title" className="mt-3 font-display text-3xl font-semibold tracking-[-0.055em]">{listing.crop}</h2>
              <p className="mt-2 text-sm text-ink/65">{listing.variety} · {listing.grade} · {listing.harvestWindow}</p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-cream p-3 text-sm">
                <span className="text-ink/60">Available now</span>
                <strong>{listing.availableKg} kg</strong>
              </div>
              <div className="flex items-center gap-2 text-sm text-ink/70">
                <MapPin size={15} className="text-tomato" />{listing.fpo} · {listing.state}
              </div>
            </div>

            {/* Farmer Provenance & Weight Reconciliation */}
            <div className="mt-5 rounded-2xl border border-line/70 bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-ink">Farmer Contribution Registry</p>
                <span className="text-[10px] text-ink/50">{contributors.length} farmers pooled</span>
              </div>
              <div className="mt-3 space-y-2">
                {contributors.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-cream/70 p-2 text-xs">
                    <div>
                      <span className="font-bold text-ink">{c.farmerCode}</span>
                      <span className="ml-2 text-ink/50">{c.harvestCluster}</span>
                    </div>
                    <span className="font-mono font-semibold text-ink">{c.contributedKg} kg</span>
                  </div>
                ))}
              </div>
              {weightCheck && (
                <div className="mt-3 flex items-center gap-1.5 border-t border-line/40 pt-2 text-[10px] text-leaf">
                  <Scale size={12} />
                  <span>{weightCheck.message}</span>
                </div>
              )}
            </div>

            <p className="source-note mt-5">
              Reference mandi modal price: <strong>₹{listing.marketReference.pricePerKg.toFixed(2)}/kg</strong> at {listing.marketReference.market}, {listing.marketReference.state} on {listing.marketReference.observedOn}. Source: {listing.marketReference.source}.
            </p>
          </div>

          {/* Right Column: Pricing & Order Flow */}
          <div className="p-5 lg:p-7">
            <div className="rounded-2xl border border-line bg-cream p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink/60">Direct buyer price</p>
                  <p className="mt-0.5 font-display text-2xl font-semibold text-forest">₹{listing.price.directBuyerPrice}/kg</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink/60">Conventional market</p>
                  <p className="mt-0.5 text-sm font-bold text-ink/50 line-through">₹{listing.price.conventionalBuyerPrice}/kg</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-3 text-xs">
                <div>
                  <span className="text-ink/60">Farmer direct payout:</span>
                  <p className="font-bold text-leaf">₹{listing.price.farmerDirectEarnings}/kg</p>
                </div>
                <div>
                  <span className="text-ink/60">FPO aggregation & logistics:</span>
                  <p className="font-bold text-ink">₹{(listing.price.fpoServices + listing.price.logistics).toFixed(2)}/kg</p>
                </div>
              </div>
            </div>

            {/* Buyer Type Toggle */}
            <div className="mt-6 flex rounded-xl border border-line p-1 bg-cream/60">
              <button
                onClick={() => setBuyerType("consumer")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${buyerType === "consumer" ? "bg-white shadow text-forest" : "text-ink/60"}`}
              >
                Consumer Micro-Order
              </button>
              <button
                onClick={() => setBuyerType("bulk")}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${buyerType === "bulk" ? "bg-white shadow text-forest" : "text-ink/60"}`}
              >
                B2B Bulk Buyer (Wholesale)
              </button>
            </div>

            {/* Quantity Slider */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-ink/60">Select Quantity:</span>
                <span className="font-bold text-ink">{quantity} kg</span>
              </div>
              <input
                type="range"
                min={minimumQuantity}
                max={listing.availableKg}
                step={buyerType === "bulk" ? 10 : 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full accent-forest"
              />
            </div>

            {/* Add to Basket & Confirmation */}
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink/60">Subtotal</span>
                <span className="font-display text-2xl font-bold text-ink">₹{total}</span>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={addToBasket} className="action-button flex-1 bg-sage text-forest">
                  <ShoppingBasket size={16} className="inline mr-1" /> Update Basket
                </button>
                <button onClick={confirmOrder} disabled={!activeBasket || order.isPending} className="action-button flex-1 bg-forest text-white disabled:opacity-50">
                  {order.isPending ? "Confirming..." : "Confirm & Escrow"}
                </button>
              </div>

              {order.error && <p role="alert" className="mt-3 rounded-xl bg-[#fff0e9] px-3 py-2 text-xs font-semibold text-tomato">{order.error.message}</p>}

              {result && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-[#edf5e7] p-3 text-xs text-leaf">
                    <span className="font-bold">Order Confirmed!</span> Reference #{result.persistence?.orderId ?? "DEMO-99"} recorded into the delivery wave pool.
                  </div>
                  {/* Live Escrow Simulation Tracker */}
                  <EscrowTracker
                    orderId={`ORD-${result.persistence?.orderId ?? "DEMO-99"}`}
                    totalAmountInr={total}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
