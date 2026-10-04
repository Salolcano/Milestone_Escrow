"use client";

import { useWallet } from "@/lib/genlayer/wallet";
import { useEscrows, useTotalLocked } from "@/lib/hooks/useMilestoneEscrow";
import { formatGen } from "@/lib/utils/gen";

function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="px-5 py-6 md:px-8">
      <div className="text-3xl font-bold tracking-tight md:text-4xl">{value}</div>
      <div className="mt-1 text-sm">{label}</div>
      {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

export function Ledger() {
  const { address, isConnected } = useWallet();
  const { data: totalLocked = "0" } = useTotalLocked();
  const { data: escrows = [] } = useEscrows();

  const me = address?.toLowerCase();
  const released = escrows.filter((e) => e.status === "released").length;
  const waitingOnYou = escrows.filter((e) => e.status === "funded" && e.freelancer.toLowerCase() === me).length;

  return (
    <section aria-label="Totals" className="border-y border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-border md:grid-cols-4 md:divide-x">
        <Stat
          value={`${formatGen(totalLocked)} GEN`}
          label="Locked right now"
          note="Falls by exactly what is paid out or refunded"
        />
        <Stat value={String(escrows.length)} label="Escrows created" />
        <Stat value={String(released)} label="Paid to freelancers" />
        <Stat
          value={isConnected ? String(waitingOnYou) : "-"}
          label="Waiting for your evidence"
          note={isConnected ? undefined : "Connect a wallet to see yours"}
        />
      </div>
    </section>
  );
}
