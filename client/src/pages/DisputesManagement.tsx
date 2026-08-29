import { useState } from "react";
import { AlertCircle, CheckCircle, FileText, Scale, ShieldAlert, ThermometerSnowflake, Plus, Clock } from "lucide-react";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";

export default function DisputesManagement() {
  const [orderId, setOrderId] = useState("ORD-CHN-9021");
  const [claimantRole, setClaimantRole] = useState<"buyer" | "fpo" | "transporter">("buyer");
  const [disputeType, setDisputeType] = useState<
    "TRANSIT_SPOILAGE" | "WEIGHT_DISCREPANCY" | "GRADE_MISMATCH" | "DELAYED_DELIVERY" | "TEMPERATURE_BREACH"
  >("TEMPERATURE_BREACH");
  const [claimedAmountInr, setClaimedAmountInr] = useState(480);
  const [description, setDescription] = useState(
    "Reefer temperature spiked to 16.4°C during Krishnagiri-Chennai transit, leading to partial tomato skin softening."
  );

  const { data: disputesList, refetch } = trpc.operations.listDisputes.useQuery();

  const raiseDispute = trpc.operations.raiseDispute.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f8faf5] py-8">
        <div className="site-container max-w-5xl space-y-6">
          <section className="rounded-3xl bg-forest p-6 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#dbecc3]">
                <ShieldAlert size={24} />
              </div>
              <div>
                <span className="pill bg-white/10 text-xs font-mono text-[#dbecc3]">
                  TRANSPARENT ESCROW GOVERNANCE
                </span>
                <h1 className="mt-1 text-2xl font-bold">Disputes & Claims Resolution</h1>
                <p className="text-xs text-white/70">
                  Automated telemetry-backed arbitration for weight discrepancies, cold-chain breaches, and transit damage.
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Dispute Submission Form */}
            <section className="soft-card rounded-3xl p-6 lg:col-span-2 border border-line">
              <h2 className="text-base font-bold text-ink border-b border-line pb-3">File a New Claim</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-xs text-ink/60">
                  Order ID
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                  />
                </label>

                <label className="block text-xs text-ink/60">
                  Claimant Role
                  <select
                    value={claimantRole}
                    onChange={(e) => setClaimantRole(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                  >
                    <option value="buyer">Buyer (Consumer / Bulk)</option>
                    <option value="fpo">FPO Representative</option>
                    <option value="transporter">Transporter / Logistics</option>
                  </select>
                </label>

                <label className="block text-xs text-ink/60">
                  Dispute Category
                  <select
                    value={disputeType}
                    onChange={(e) => setDisputeType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                  >
                    <option value="TEMPERATURE_BREACH">Cold-chain Temperature Breach</option>
                    <option value="TRANSIT_SPOILAGE">Transit Spoilage / Decay</option>
                    <option value="WEIGHT_DISCREPANCY">Weighbridge Discrepancy</option>
                    <option value="GRADE_MISMATCH">APEDA Quality Grade Mismatch</option>
                    <option value="DELAYED_DELIVERY">Delayed Delivery ETA</option>
                  </select>
                </label>

                <label className="block text-xs text-ink/60">
                  Claimed Refund Amount (₹)
                  <input
                    type="number"
                    value={claimedAmountInr}
                    onChange={(e) => setClaimedAmountInr(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                  />
                </label>

                <label className="block text-xs text-ink/60">
                  Description & Evidence Details
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink"
                  />
                </label>

                <button
                  onClick={() =>
                    raiseDispute.mutate({
                      orderId,
                      claimantRole,
                      disputeType,
                      claimedAmountInr,
                      description,
                    })
                  }
                  disabled={raiseDispute.isPending}
                  className="action-button w-full flex items-center justify-center gap-2 bg-forest text-white py-2.5 text-xs font-bold"
                >
                  <Plus size={15} />
                  <span>{raiseDispute.isPending ? "Submitting..." : "Submit Claim to Arbitrator"}</span>
                </button>

                {raiseDispute.data && (
                  <div className="rounded-xl bg-[#edf5e7] p-3 text-xs text-leaf border border-leaf/30">
                    <p className="font-bold">Automated Evaluation:</p>
                    <p className="mt-1 text-[11px] text-ink/80">{raiseDispute.data.autoEval.reason}</p>
                    <span className="mt-1 inline-block pill bg-forest text-white text-[10px]">
                      Recommended: {raiseDispute.data.autoEval.recommendedAction} ({raiseDispute.data.autoEval.confidencePercent}%)
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Existing Disputes List */}
            <section className="soft-card rounded-3xl p-6 lg:col-span-3 border border-line">
              <h2 className="text-base font-bold text-ink border-b border-line pb-3">Active Claims Ledger</h2>
              <div className="mt-4 space-y-3">
                {(!disputesList || disputesList.length === 0) && (
                  <div className="rounded-2xl bg-sage/20 p-8 text-center text-xs text-ink/50">
                    No open claims. All escrow accounts settling smoothly.
                  </div>
                )}
                {disputesList?.map((d) => (
                  <div key={d.disputeId} className="rounded-2xl border border-line bg-white p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-forest">{d.disputeId} · {d.orderId}</span>
                      <span className="pill bg-amber-100 text-amber-900 font-bold">{d.status}</span>
                    </div>
                    <p className="text-ink/80">{d.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-ink/50 border-t border-line/40 pt-2">
                      <span>Claimant: <strong className="text-ink capitalize">{d.claimantRole}</strong></span>
                      <span className="font-bold text-forest">₹{d.claimedAmountInr}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
