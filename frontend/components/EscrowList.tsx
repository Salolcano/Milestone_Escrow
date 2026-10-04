"use client";

import { useMemo, useState } from "react";
import { Loader2, Lock, AlertCircle, ArrowLeft, ExternalLink, FileCheck2, Undo2 } from "lucide-react";
import { GenLayerTransactionPanel, type SubmitInput, type TrackedStatus } from "@genlayer/transaction-kit-react";
import { useEscrows, useInvalidateEscrows, useMilestoneEscrowContract } from "@/lib/hooks/useMilestoneEscrow";
import { GENLAYER_NETWORK, getContractAddress } from "@/lib/genlayer/client";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { formatGen } from "@/lib/utils/gen";
import { error, success } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import type { Escrow } from "@/lib/contracts/types";
import { ACTION_COPY, availableActions, buildActionTx, type EscrowAction } from "@/lib/escrowActions";

type Action = { id: string; mode: EscrowAction } | null;

export function EscrowList() {
  const contract = useMilestoneEscrowContract();
  const { data: escrows, isLoading, isError } = useEscrows();
  const { address, isConnected, isLoading: isWalletLoading } = useWallet();
  const kit = useTransactionKit(address);
  const invalidate = useInvalidateEscrows();
  const contractAddress = getContractAddress();

  const [action, setAction] = useState<Action>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [step, setStep] = useState<"form" | "review">("form");
  const [formError, setFormError] = useState("");

  // Stable tx identity: the panel re-estimates whenever this object changes.
  const actionTx = useMemo<SubmitInput | null>(
    () => (action ? buildActionTx(contractAddress, action.mode, action.id, evidenceUrl) : null),
    [contractAddress, action, evidenceUrl],
  );

  const closeAction = () => {
    setAction(null);
    setEvidenceUrl("");
    setStep("form");
    setFormError("");
  };

  const openAction = (id: string, mode: EscrowAction) => {
    if (!address) {
      error("Please connect your wallet first");
      return;
    }
    if (!kit) {
      error("Transaction kit unavailable", {
        description: "Please check your wallet connection and try again.",
      });
      return;
    }
    if (!contractAddress) {
      error("Contract address not configured", {
        description: "Please set NEXT_PUBLIC_CONTRACT_ADDRESS.",
      });
      return;
    }
    setAction({ id, mode });
    // Only submitting needs a form. Cancel and refund go straight to the transaction.
    setStep(mode === "submit" ? "form" : "review");
  };

  const reviewEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^https?:\/\//i.test(evidenceUrl.trim())) {
      setFormError("Enter a web address starting with http");
      return;
    }
    setFormError("");
    setStep("review");
  };

  const handleDone = (status: TrackedStatus) => {
    if (status.successful !== false) {
      invalidate();
      const copy = ACTION_COPY[action?.mode ?? "submit"];
      success(copy.doneTitle, { description: copy.doneDescription });
      closeAction();
      return;
    }

    error("Transaction failed", {
      description: "The transaction completed without a successful outcome.",
    });
  };

  if (isLoading) {
    return (
      <div className="border border-border rounded-2xl p-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          <p className="text-sm text-muted-foreground">Loading escrows...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="border border-dashed border-input rounded-2xl p-12">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-warn" />
          <h3 className="text-xl font-bold">Setup Required</h3>
          <p className="text-sm text-muted-foreground">
            Set <code className="bg-muted px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_CONTRACT_ADDRESS</code> to your deployed contract address.
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-border rounded-2xl p-8">
        <p className="text-center text-destructive">Failed to load escrows. Please try again.</p>
      </div>
    );
  }

  if (!escrows || escrows.length === 0) {
    return (
      <div className="border border-dashed border-input rounded-2xl p-12">
        <div className="text-center space-y-3">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
          <h3 className="text-xl font-bold">No Escrows Yet</h3>
          <p className="text-muted-foreground">Lock funds for the first milestone to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-t border-border">
        {escrows.map((escrow) => (
          <EscrowCard
            key={escrow.id}
            escrow={escrow}
            currentAddress={address}
            canAct={isConnected && !isWalletLoading}
            onAction={openAction}
          />
        ))}
      </div>

      <Dialog open={!!action} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{ACTION_COPY[action?.mode ?? "submit"].title}</DialogTitle>
            <DialogDescription>{ACTION_COPY[action?.mode ?? "submit"].description}</DialogDescription>
          </DialogHeader>

          {step === "review" && kit && contractAddress && actionTx ? (
            <div className="mt-4 space-y-4">
              {action?.mode === "submit" && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setStep("form")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              <div className="tx-plate">
                <GenLayerTransactionPanel
                  kit={kit}
                  tx={actionTx}
                  network={GENLAYER_NETWORK.chainName}
                  theme="dark"
                  trackUntil="decided"
                  onDone={handleDone}
                />
              </div>
            </div>
          ) : (
            <form onSubmit={reviewEvidence} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label htmlFor="evidenceUrl">Public page that shows the finished work</Label>
                <Input
                  id="evidenceUrl"
                  type="url"
                  placeholder="https://..."
                  value={evidenceUrl}
                  onChange={(e) => {
                    setEvidenceUrl(e.target.value);
                    setFormError("");
                  }}
                  className={formError ? "border-destructive" : ""}
                />
                {formError && <p className="text-xs text-destructive">{formError}</p>}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={closeAction}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" className="flex-1">
                  Review
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface EscrowCardProps {
  escrow: Escrow;
  currentAddress: string | null;
  canAct: boolean;
  onAction: (id: string, mode: EscrowAction) => void;
}

const STATUS: Record<Escrow["status"], { label: string; dot: string }> = {
  funded: { label: "Funds locked", dot: "bg-warn" },
  released: { label: "Paid to freelancer", dot: "bg-ok" },
  refunded: { label: "Refunded to client", dot: "bg-bad" },
  cancelled: { label: "Cancelled", dot: "bg-input" },
};

function StatusLabel({ status }: { status: Escrow["status"] }) {
  const { label, dot } = STATUS[status];
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function EscrowCard({ escrow, currentAddress, canAct, onAction }: EscrowCardProps) {
  const { isClient, isFreelancer, isOpen, canSubmit, canCancel, canRefund } = availableActions(
    escrow,
    currentAddress,
    canAct,
  );

  // One short line that says what to do next, or why there is no button.
  const hint = !isOpen
    ? ""
    : isFreelancer
      ? ""
      : isClient
        ? escrow.attempts > 0
          ? "Validators rejected the latest evidence. Refund now, or wait for the freelancer to try again."
          : "Waiting for the freelancer to submit evidence. You can cancel until they do."
        : currentAddress
          ? "Only the freelancer's wallet can submit evidence. Switch MetaMask to that account."
          : "Connect the freelancer's wallet to submit evidence.";

  return (
    <article className="grid gap-5 border-b border-border py-7 md:grid-cols-[1fr_auto] md:gap-10 animate-fade-in">
      <div className="min-w-0 space-y-3">
        <h3 className="break-words text-xl font-bold tracking-tight">{escrow.title}</h3>
        <p className="max-w-2xl break-words text-muted-foreground">{escrow.requirements}</p>

        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">Client</dt>
            <dd className="inline-flex items-center gap-1">
              <AddressDisplay address={escrow.client} maxLength={10} showCopy={true} />
              {isClient && <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background">you</span>}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">Freelancer</dt>
            <dd className="inline-flex items-center gap-1">
              <AddressDisplay address={escrow.freelancer} maxLength={10} showCopy={true} />
              {isFreelancer && (
                <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background">you</span>
              )}
            </dd>
          </div>
          {escrow.evidence_url && (
            <div>
              <a
                href={escrow.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:no-underline"
              >
                Latest evidence
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </dl>

        {escrow.verdict_reason && (
          <p className="max-w-2xl break-words border-l-2 border-foreground pl-3 text-sm">
            <span className="text-muted-foreground">Validators agreed: </span>
            {escrow.verdict_reason}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 md:items-end md:text-right">
        <div className="text-3xl font-bold tracking-tight">{formatGen(escrow.amount)} GEN</div>
        <StatusLabel status={escrow.status} />
        <div className="text-sm text-muted-foreground">
          Attempts {escrow.attempts} of {escrow.max_attempts}
        </div>
        {hint && <p className="max-w-xs text-sm text-muted-foreground md:text-right">{hint}</p>}
        {(canSubmit || canCancel || canRefund) && (
          <div className="flex flex-wrap gap-2 md:justify-end">
            {canSubmit && (
              <Button size="sm" variant="gradient" onClick={() => onAction(escrow.id, "submit")}>
                <FileCheck2 className="h-4 w-4" />
                Submit evidence
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="secondary" onClick={() => onAction(escrow.id, "cancel")}>
                Cancel and refund
              </Button>
            )}
            {canRefund && (
              <Button size="sm" variant="gradient" onClick={() => onAction(escrow.id, "refund")}>
                <Undo2 className="h-4 w-4" />
                Refund after rejection
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
