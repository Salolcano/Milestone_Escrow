"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { GenLayerTransactionPanel, type SubmitInput, type TrackedStatus } from "@genlayer/transaction-kit-react";
import { useInvalidateEscrows } from "@/lib/hooks/useMilestoneEscrow";
import { GENLAYER_NETWORK, getContractAddress } from "@/lib/genlayer/client";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { formatGen, isAddress, parseGen } from "@/lib/utils/gen";
import { error, success } from "@/lib/utils/toast";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const TEXTAREA_CLASS =
  "flex w-full min-h-[96px] rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground";

const NO_ERRORS = { title: "", freelancer: "", requirements: "", amount: "" };

interface CreateEscrowModalProps {
  label?: string;
  size?: "default" | "sm" | "lg";
}

export function CreateEscrowModal({ label = "New escrow", size = "default" }: CreateEscrowModalProps) {
  const { isConnected, address, isLoading, connectWallet } = useWallet();
  const kit = useTransactionKit(address);
  const invalidate = useInvalidateEscrows();
  const contractAddress = getContractAddress();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "review">("form");
  const [title, setTitle] = useState("");
  const [freelancer, setFreelancer] = useState("");
  const [requirements, setRequirements] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState(NO_ERRORS);

  // Stable tx identity: the panel re-estimates whenever this object changes.
  const createEscrowTx = useMemo<SubmitInput>(
    () => ({
      kind: "write",
      address: contractAddress as `0x${string}`,
      method: "create_escrow",
      args: [title.trim(), freelancer.trim(), requirements.trim()],
    }),
    [contractAddress, title, freelancer, requirements],
  );

  // The GEN to lock. create_escrow is payable, and Transaction Kit takes the
  // attached amount as `userValue` (a bigint in the smallest unit), not inside tx.
  const lockedAmount = useMemo(() => parseGen(amount) ?? BigInt(0), [amount]);

  useEffect(() => {
    if (!isConnected && isOpen && step === "form") {
      setIsOpen(false);
    }
  }, [isConnected, isOpen, step]);

  const validateForm = (): boolean => {
    const next = { ...NO_ERRORS };
    if (!title.trim()) next.title = "Give the milestone a name";
    if (!isAddress(freelancer)) next.freelancer = "Enter the freelancer's wallet address (0x followed by 40 characters)";
    else if (freelancer.trim().toLowerCase() === address?.toLowerCase())
      next.freelancer = "The freelancer must be a different wallet than yours";
    if (requirements.trim().length < 10) next.requirements = "Describe the finished work (at least 10 characters)";
    if (parseGen(amount) === null) next.amount = "Enter an amount greater than 0, for example 1.5";
    setErrors(next);
    return !Object.values(next).some((e) => e !== "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
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
    if (!validateForm()) return;

    setStep("review");
  };

  const resetForm = () => {
    setTitle("");
    setFreelancer("");
    setRequirements("");
    setAmount("");
    setStep("form");
    setErrors(NO_ERRORS);
  };

  // A visitor without a wallet gets the connect prompt first, then the form.
  const handleOpenClick = async () => {
    if (!isConnected || !address) {
      try {
        await connectWallet();
        setIsOpen(true);
      } catch {
        // connectWallet already shows the reason in a toast
      }
      return;
    }
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    setIsOpen(open);
  };

  const handleDone = (status: TrackedStatus) => {
    if (status.successful !== false) {
      invalidate();
      success("Escrow funded", {
        description: "Your GEN is now locked on GenLayer until the work is verified.",
      });
      resetForm();
      setIsOpen(false);
      return;
    }

    error("Failed to create escrow", {
      description: "The transaction completed without a successful outcome.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button variant="gradient" size={size} disabled={isLoading} onClick={handleOpenClick}>
        <Plus className="w-4 h-4" />
        {isConnected || size !== "lg" ? label : "Connect wallet to lock funds"}
      </Button>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Lock funds for a milestone</DialogTitle>
          <DialogDescription>
            Describe the finished work. The GEN you attach is locked until validators verify the freelancer&apos;s
            evidence.
          </DialogDescription>
        </DialogHeader>

        {step === "review" && kit && contractAddress ? (
          <div className="mt-4 space-y-4">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep("form")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <p className="text-sm text-muted-foreground">
              You are locking <span className="font-semibold text-foreground">{formatGen(lockedAmount)} GEN</span>.
              This amount is sent together with the transaction below.
            </p>
            <div className="tx-plate">
              <GenLayerTransactionPanel
                kit={kit}
                tx={createEscrowTx}
                userValue={lockedAmount}
                network={GENLAYER_NETWORK.chainName}
                theme="dark"
                trackUntil="decided"
                onDone={handleDone}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Milestone name</Label>
              <Input
                id="title"
                placeholder="Logo design, final files"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors({ ...errors, title: "" });
                }}
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="freelancer">Freelancer wallet address</Label>
              <Input
                id="freelancer"
                placeholder="0x..."
                value={freelancer}
                onChange={(e) => {
                  setFreelancer(e.target.value);
                  setErrors({ ...errors, freelancer: "" });
                }}
                className={errors.freelancer ? "border-destructive" : ""}
              />
              {errors.freelancer && <p className="text-xs text-destructive">{errors.freelancer}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">What must be delivered (plain English)</Label>
              <textarea
                id="requirements"
                placeholder="A public page that shows 3 logo options in PNG and SVG, with the source files linked."
                value={requirements}
                onChange={(e) => {
                  setRequirements(e.target.value);
                  setErrors({ ...errors, requirements: "" });
                }}
                className={`${TEXTAREA_CLASS} ${errors.requirements ? "border-destructive" : ""}`}
              />
              {errors.requirements && <p className="text-xs text-destructive">{errors.requirements}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount to lock (GEN)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="1.5"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors({ ...errors, amount: "" });
                }}
                className={errors.amount ? "border-destructive" : ""}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" className="flex-1" disabled={!kit}>
                Review
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
