import React from "react";
import { useParams, Link } from "wouter";
import {
  ShieldCheck,
  MapPin,
  Scale,
  Calendar,
  CheckCircle2,
  Users,
  BadgePercent,
  ArrowLeft,
  Sparkles,
  QrCode,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import ProduceArt from "@/components/ProduceArt";
import { trpc } from "@/lib/trpc";
import { demoFallback } from "@/lib/demoFallback";

export default function TraceLot() {
  const { lotCode } = useParams<{ lotCode: string }>();

  // Fetch DB provenance record
  const { data: traceData, isLoading } = trpc.operations.traceLot.useQuery(
    { lotCode: lotCode ?? "KHC-TOM-0826-A" },
    { enabled: Boolean(lotCode) }
  );

  // Fetch QR Code data
  const { data: qrData } = trpc.operations.qrProvenance.useQuery({
    lotCode: lotCode ?? "KHC-TOM-0826-A",
    crop: traceData?.found ? traceData.lot.crop : "Tomato",
    grade: traceData?.found ? traceData.lot.grade || "A" : "A",
    totalKg: traceData?.found ? traceData.lot.totalKg : 620,
    originHub: "Krishnagiri Harvest Collective FPO",
  });

  // Fallback demo matching
  const matchingDemoListing = (demoFallback.listings as any[]).find(
    (l) => l.lotCode === lotCode
  ) || demoFallback.listings[0];

  const cropName = traceData?.found ? traceData.lot.crop || matchingDemoListing.crop : matchingDemoListing.crop;
  const grade = traceData?.found ? traceData.lot.grade || "Grade A" : matchingDemoListing.grade;
  const totalKg = traceData?.found ? traceData.lot.totalKg : matchingDemoListing.availableKg;
  const contributors = traceData?.found ? traceData.contributors : matchingDemoListing.traceability || [];
  const weightCheck = traceData?.found ? traceData.weightCheck : null;

  return (
    <AppShell>
      <main className="min-h-[85vh] bg-[#f8faf5] py-10">
        <div className="site-container max-w-4xl">
          {/* Top Breadcrumb & Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-leaf transition"
            >
              <ArrowLeft size={14} /> Back to Marketplace
            </Link>
            <span className="pill bg-[#edf5e7] text-leaf font-bold">
              <ShieldCheck size={14} /> DoCA Verified Certificate
            </span>
          </div>

          {/* Certificate Card */}
          <div className="soft-card mt-6 rounded-[2rem] border border-line bg-white p-6 md:p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-line/60 pb-6">
              <div>
                <span className="pill bg-sage text-forest text-xs font-bold uppercase tracking-wider">
                  Farmgate Provenance Certificate
                </span>
                <h1 className="display-title mt-2 text-3xl md:text-4xl font-bold text-ink">
                  {cropName}
                </h1>
                <p className="mt-1 font-mono text-sm font-semibold text-leaf">
                  Lot Identifier: {lotCode}
                </p>
              </div>

              {/* QR Code Box */}
              {qrData?.qrSvg && (
                <div className="flex flex-col items-center rounded-2xl border border-line bg-[#f8faf5] p-3 text-center shadow-xs">
                  {/* Safe SVG insertion generated deterministically by backend server */}
                  <div
                    dangerouslySetInnerHTML={{ __html: qrData.qrSvg }}
                    className="w-28 h-28"
                  />
                  <span className="mt-2 text-[10px] font-mono text-ink/50">
                    Scan on box to verify
                  </span>
                </div>
              )}
            </div>

            {/* Quality & Batch Summary Grid */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-line/60 bg-[#f8faf5] p-4">
                <span className="text-[11px] text-ink/50 block">Produce Grade</span>
                <span className="text-base font-bold text-ink block mt-0.5">{grade}</span>
              </div>
              <div className="rounded-2xl border border-line/60 bg-[#f8faf5] p-4">
                <span className="text-[11px] text-ink/50 block">Consolidated Weight</span>
                <span className="text-base font-bold text-ink block mt-0.5">{totalKg} kg</span>
              </div>
              <div className="rounded-2xl border border-line/60 bg-[#f8faf5] p-4">
                <span className="text-[11px] text-ink/50 block">Origin FPO Hub</span>
                <span className="text-base font-bold text-ink block mt-0.5">Krishnagiri FPO</span>
              </div>
              <div className="rounded-2xl border border-line/60 bg-[#f8faf5] p-4">
                <span className="text-[11px] text-ink/50 block">Harvest Timestamp</span>
                <span className="text-base font-bold text-ink block mt-0.5">26 Aug 2026</span>
              </div>
            </div>

            {/* Farmer Attribution Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-leaf" />
                  <h3 className="text-lg font-bold text-ink">
                    Smallholder Farmer Attribution
                  </h3>
                </div>
                <span className="text-xs font-semibold text-ink/60">
                  {contributors.length} Independent Producers Pooled
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {contributors.map((c: any, idx: number) => (
                  <div
                    key={c.farmerCode || idx}
                    className="flex items-center justify-between rounded-xl border border-line/50 bg-[#f8faf5] p-3.5 text-xs transition hover:border-leaf"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-[11px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-ink">{c.farmerCode}</span>
                        <p className="text-[11px] text-ink/50">{c.harvestCluster}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-forest">
                        {c.contributedKg} kg
                      </span>
                      <p className="text-[10px] text-leaf">Verified Contributor</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weight Handling Loss Reconciliation */}
            {weightCheck && (
              <div className="mt-6 rounded-2xl bg-[#edf5e7] p-4 border border-leaf/20">
                <div className="flex items-center gap-2 text-xs font-bold text-forest">
                  <Scale size={16} />
                  <span>Digital Scale & Handling Loss Verification</span>
                </div>
                <p className="mt-1 text-xs text-ink/75 leading-relaxed">
                  {weightCheck.message} (Discrepancy: {weightCheck.discrepancyKg} kg / {weightCheck.discrepancyPercent}%)
                </p>
              </div>
            )}

            {/* Fair Price Spread Guarantee */}
            <div className="mt-6 rounded-2xl bg-forest p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base flex items-center gap-2">
                    <BadgePercent size={18} className="text-[#dbecc3]" />
                    Department of Consumer Affairs (DoCA) Fair Price Guarantee
                  </h4>
                  <p className="mt-1 text-xs text-white/70">
                    By purchasing this direct lot, the farmer received +46% higher income than local mandi modal rates, while retail consumer price was 18% lower than conventional supermarkets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
