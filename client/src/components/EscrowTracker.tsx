import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Truck,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export function EscrowTracker({
  orderId,
  totalAmountInr,
}: {
  orderId: string;
  totalAmountInr: number;
}) {
  const [account, setAccount] = useState<any>(null);

  const createEscrow = trpc.operations.createEscrow.useMutation();
  const transitionEscrow = trpc.operations.transitionEscrow.useMutation();

  const handleInit = () => {
    createEscrow.mutate(
      { orderId, totalAmountInr },
      { onSuccess: setAccount }
    );
  };

  const handleNextStep = (nextState: string) => {
    if (!account) return;
    transitionEscrow.mutate(
      { account, nextState: nextState as any },
      { onSuccess: setAccount }
    );
  };

  if (!account) {
    return (
      <div className="rounded-2xl border border-line/70 bg-[#f8faf5] p-4 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-forest" />
            <span className="font-bold text-ink">RBI-Compliant Digital Escrow</span>
          </div>
          <button
            onClick={handleInit}
            disabled={createEscrow.isPending}
            className="action-button bg-forest px-3 py-1.5 text-xs text-white"
          >
            {createEscrow.isPending ? "Generating..." : "Simulate Escrow Lock"}
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { state: "FUNDS_LOCKED", label: "Funds Locked (Escrow Nodal)", icon: Lock },
    { state: "DISPATCH_ADVANCE_RELEASED", label: "50% Logistics Advance", icon: Truck },
    { state: "SETTLED_COMPLETE", label: "100% UPI Farmer Payout", icon: CheckCircle2 },
  ];

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-line/60 pb-3">
        <div>
          <span className="pill bg-sage text-forest text-[10px] font-bold">
            Escrow Account: {account.escrowId}
          </span>
          <p className="mt-1 text-xs font-bold text-ink">
            Total Locked: ₹{account.totalAmountInr} (Farmer Direct Share: ₹{account.farmerPayoutInr})
          </p>
        </div>
        <span className="pill bg-[#edf5e7] text-leaf text-xs font-bold">
          {account.currentState}
        </span>
      </div>

      {/* Step Progress */}
      <div className="grid grid-cols-3 gap-2">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isDone = account.stateHistory.some((h: any) => h.state === s.state);
          return (
            <div
              key={s.state}
              className={`rounded-xl p-2.5 text-center border text-xs transition ${
                isDone
                  ? "bg-[#edf5e7] border-leaf/40 text-forest font-bold"
                  : "bg-cream/40 border-line/50 text-ink/40"
              }`}
            >
              <Icon size={14} className={`mx-auto mb-1 ${isDone ? "text-leaf" : "text-ink/30"}`} />
              <span className="block text-[10px]">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-line/40">
        {account.currentState === "INITIATED" && (
          <button
            onClick={() => handleNextStep("FUNDS_LOCKED")}
            className="action-button flex-1 bg-forest py-1.5 text-xs text-white"
          >
            Lock Buyer Funds in Escrow
          </button>
        )}
        {account.currentState === "FUNDS_LOCKED" && (
          <button
            onClick={() => handleNextStep("DISPATCH_ADVANCE_RELEASED")}
            className="action-button flex-1 bg-forest py-1.5 text-xs text-white"
          >
            Release 50% Logistics Advance (GPS Dispatched)
          </button>
        )}
        {account.currentState === "DISPATCH_ADVANCE_RELEASED" && (
          <button
            onClick={() => handleNextStep("SETTLED_COMPLETE")}
            className="action-button flex-1 bg-leaf py-1.5 text-xs text-white"
          >
            Confirm Delivery $\rightarrow$ Settle Farmer UPI (₹{account.farmerPayoutInr})
          </button>
        )}
      </div>

      {/* History Log */}
      <div className="rounded-xl bg-[#f8faf5] p-2.5 text-[11px] text-ink/70 space-y-1">
        {account.stateHistory.map((h: any, i: number) => (
          <div key={i} className="flex items-center justify-between">
            <span>• {h.note}</span>
            <span className="font-mono text-[9px] text-ink/40">{h.timestamp.slice(11, 19)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
