import {
  BadgePercent,
  Building2,
  Check,
  ChevronDown,
  Filter,
  Layers,
  Scale,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import ListingDetail from "@/components/ListingDetail";
import ProduceArt from "@/components/ProduceArt";
import { demoFallback } from "@/lib/demoFallback";
import { trpc } from "@/lib/trpc";

export default function Marketplace() {
  const { data: liveData } = trpc.marketplace.demo.useQuery();
  const data = liveData ?? demoFallback;
  const [selected, setSelected] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All produce");

  // RWA Society Demand Pooling state
  const [societyPool, setSocietyPool] = useState<any>({
    societyName: "Adyar Palm Meadows RWA",
    crop: "Tomato",
    targetMinimumKg: 200,
    totalPooledKg: 140,
    baseRetailPricePerKg: 28,
    discountedPooledPricePerKg: 23.8,
    orders: [
      { residentName: "Priya Sundaram", flatNumber: "A-102", quantityKg: 35 },
      { residentName: "Vikram R.", flatNumber: "B-404", quantityKg: 50 },
      { residentName: "Anand M.", flatNumber: "C-201", quantityKg: 55 },
    ],
  });

  const [residentName, setResidentName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [memberKg, setMemberKg] = useState(25);
  const [poolMessage, setPoolMessage] = useState("");

  const handleJoinSocietyPool = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = residentName.trim();
    const flat = flatNumber.trim();
    if (!name || !flat || !Number.isFinite(memberKg) || memberKg <= 0) {
      setPoolMessage("Add a resident name, flat number, and a quantity greater than 0 kg.");
      return;
    }
    const newOrder = { residentName: name, flatNumber: flat, quantityKg: memberKg };
    const updatedOrders = [...societyPool.orders, newOrder];
    const totalPooled = updatedOrders.reduce((s: number, o: any) => s + o.quantityKg, 0);
    setSocietyPool((prev: any) => ({
      ...prev,
      orders: updatedOrders,
      totalPooledKg: totalPooled,
    }));
    setResidentName("");
    setFlatNumber("");
    setMemberKg(25);
    setPoolMessage(`${name}'s ${memberKg} kg request was added to the delivery wave.`);
  };

  const openListingFromKeyboard = (event: KeyboardEvent<HTMLElement>, item: any) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelected(item);
    }
  };

  const filtered = useMemo(
    () =>
      (data?.listings ?? []).filter(
        (listing: any) =>
          (category === "All produce" || listing.category === category) &&
          `${listing.crop} ${listing.fpo} ${listing.state}`.toLowerCase().includes(query.toLowerCase())
      ),
    [data, category, query]
  );

  return (
    <AppShell>
      <main className="pb-8">
        {/* Header Banner */}
        <section className="border-b border-line bg-[#eff3e7] py-12">
          <div className="site-container">
            <p className="section-eyebrow">Source-led discovery</p>
            <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <h1 className="display-title text-5xl font-semibold leading-none">
                  Meet the lot before you meet the price.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/65">
                  Explore FPO-coordinated produce lots with live AGMARKNET mandi price benchmarks, fair farmer uplift
                  spreads, and farmer-level provenance records.
                </p>
              </div>
              <div className="pill w-fit bg-white text-forest shadow-sm">
                <Sparkles size={14} />
                {data.listings.length} verified direct lots
              </div>
            </div>
          </div>
        </section>

        {/* RWA Apartment Society Demand Pooling Banner */}
        <section className="site-container py-6">
            <div className="rounded-3xl border border-line/70 bg-white p-6 shadow-[0_12px_30px_rgba(36,70,46,0.06)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line/60 pb-4">
              <div>
                <span className="pill bg-[#edf5e7] text-leaf text-xs font-bold">
                  <Building2 size={13} className="inline mr-1" />
                  RWA Demand Pooling Mode
                </span>
                <h2 className="display-title mt-1.5 text-2xl font-bold text-ink">
                  {societyPool.societyName} Collective Hub
                </h2>
                <p className="text-xs text-ink/60 mt-0.5">
                  Neighbours pool demand to unlock wholesale rates (-15% discount) and reduce delivery stops to 1 drop.
                </p>
              </div>
              <div className="rounded-2xl bg-sage/45 px-3 py-2 text-left md:text-right">
                <span className="pill bg-sage text-forest text-xs font-bold">
                  {societyPool.totalPooledKg} / {societyPool.targetMinimumKg} kg Pooled
                </span>
                <p className="text-xs font-bold text-forest mt-1">
                  Wholesale Rate: ₹{societyPool.discountedPooledPricePerKg}/kg (Retail: ₹{societyPool.baseRetailPricePerKg})
                </p>
              </div>
            </div>

            {/* Quick Order Form */}
            <form onSubmit={handleJoinSocietyPool} className="mt-4 flex flex-wrap items-end gap-2.5">
              <label className="text-xs text-ink/60 flex-1 min-w-[140px]">
                Resident Name
                <input
                  type="text"
                  placeholder="e.g. Ramesh"
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-[#f8faf5] px-3 py-2 text-xs text-ink"
                />
              </label>
              <label className="text-xs text-ink/60 w-28">
                Flat / Villa
                <input
                  type="text"
                  placeholder="e.g. D-302"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-[#f8faf5] px-3 py-2 text-xs text-ink"
                />
              </label>
              <label className="text-xs text-ink/60 w-24">
                Qty (kg)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={memberKg}
                  onChange={(e) => setMemberKg(e.target.valueAsNumber)}
                  className="mt-1 w-full rounded-xl border border-line bg-[#f8faf5] px-3 py-2 text-xs text-ink"
                />
              </label>
              <button type="submit" className="action-button bg-forest text-white py-2 px-4 text-xs font-bold shrink-0">
                Join Society Pool
              </button>
            </form>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-sage/60">
                <div
                  className="h-full rounded-full bg-forest transition-all"
                  style={{ width: `${Math.min(100, (societyPool.totalPooledKg / societyPool.targetMinimumKg) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink/50">
                <p>{societyPool.orders.length} apartment flats joined · {Math.max(0, societyPool.orders.length - 1)} last-mile urban delivery stops avoided.</p>
                <p className="font-semibold text-forest">{Math.max(0, societyPool.targetMinimumKg - societyPool.totalPooledKg)} kg to unlock the wave</p>
              </div>
              {poolMessage && (
                <p aria-live="polite" className="mt-3 rounded-lg bg-[#edf5e7] px-3 py-2 text-xs font-semibold text-leaf">
                  {poolMessage}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Listings Section */}
        <section className="site-container py-4">
          <div className="source-note mb-6">{data.dataNotice}</div>
          <div className="flex flex-col gap-5 lg:flex-row">
            {/* Filter Sidebar */}
            <aside className="soft-card h-fit rounded-2xl p-4 lg:w-60">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Filter lots</span>
                <Filter size={16} className="text-leaf" />
              </div>
              <label className="relative mt-4 block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Crop, FPO, state"
                  className="w-full rounded-xl border border-line bg-cream px-9 py-2.5 text-sm outline-none focus:border-leaf"
                />
              </label>
              <div className="mt-5">
                <p className="text-[.68rem] font-bold uppercase tracking-widest text-ink/45">Category</p>
                <div className="mt-2 grid gap-1">
                  {["All produce", "Fresh produce", "Staples", "Nuts & oilseeds"].map((item) => (
                    <button
                      key={item}
                      onClick={() => setCategory(item)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        category === item ? "bg-sage font-bold text-forest" : "text-ink/70 hover:bg-cream"
                      }`}
                    >
                      {item}
                      {category === item && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Produce Grid */}
            <div className="flex-1">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item: any) => (
                  <article
                    key={item.id}
                    onClick={() => setSelected(item)}
                    onKeyDown={(event) => openListingFromKeyboard(event, item)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${item.crop}`}
                    className="soft-card group flex cursor-pointer flex-col justify-between rounded-3xl p-5 transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="pill bg-sage text-forest">{item.grade}</span>
                        <span className="font-mono text-[.65rem] text-ink/45">{item.lotCode}</span>
                      </div>
                      <div className="my-5 flex justify-center">
                        <ProduceArt type={item.color} />
                      </div>
                      <h3 className="text-xl font-bold text-ink">{item.crop}</h3>
                      <p className="mt-1 text-xs text-ink/60">
                        {item.variety} · {item.fpo}
                      </p>

                      {/* Disintermediation Margin Highlight */}
                      <div className="mt-4 rounded-xl bg-forest/5 p-2.5 border border-forest/10">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ink/60">Direct App Price:</span>
                          <span className="font-bold text-forest text-sm">₹{item.price.directBuyerPrice}/kg</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="text-ink/50">Mandi Benchmark:</span>
                          <span className="text-ink/75">₹{item.marketReference.pricePerKg.toFixed(2)}/kg</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-line/50 pt-1.5 text-[11px]">
                          <span className="font-bold text-leaf flex items-center gap-1">
                            <BadgePercent size={13} /> +{item.comparison.farmerUpliftPercent}% Farmer Uplift
                          </span>
                          <span className="text-ink/60">Save ₹{item.comparison.buyerSavings}/kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                      <span className="text-ink/60">{item.availableKg} kg available</span>
                      <span className="font-semibold text-leaf group-hover:underline">View traceability &amp; order →</span>
                    </div>
                  </article>
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="soft-card mt-4 rounded-2xl p-8 text-center">
                  <p className="font-display text-2xl font-semibold">No matching lots yet.</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/60">Try a crop, FPO, or state name—or clear the active category to see every available lot.</p>
                  <button onClick={() => { setQuery(""); setCategory("All produce"); }} className="action-button action-secondary mt-5 text-sm">Clear filters</button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Selected Lot Modal */}
        {selected && <ListingDetail listing={selected} onClose={() => setSelected(null)} />}
      </main>
    </AppShell>
  );
}
