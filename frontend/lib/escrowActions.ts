import type { SubmitInput } from "@genlayer/transaction-kit-react";
import type { Escrow } from "./contracts/types";

/** Everything a person can do to an escrow from the app. */
export type EscrowAction = "submit" | "cancel" | "refund";

/** The contract method each action calls. `refund` is the client's exit after a rejection. */
export const ACTION_METHOD: Record<EscrowAction, string> = {
  submit: "submit_evidence",
  cancel: "cancel_escrow",
  refund: "refund_after_rejection",
};

export const ACTION_COPY: Record<
  EscrowAction,
  { title: string; description: string; doneTitle: string; doneDescription: string }
> = {
  submit: {
    title: "Submit evidence",
    description:
      "Validators will read your page and answer 3 yes/no questions. If all are yes, the funds are released to you.",
    doneTitle: "Evidence decided",
    doneDescription: "Validators reached consensus. Check the escrow for the verdict.",
  },
  cancel: {
    title: "Cancel and refund",
    description: "No evidence was submitted yet, so you can cancel. The locked GEN returns to you.",
    doneTitle: "Escrow cancelled",
    doneDescription: "The locked GEN is on its way back to you.",
  },
  refund: {
    title: "Refund after rejection",
    description:
      "Validators rejected the freelancer's evidence. You can take the locked GEN back now. This closes the escrow for good, and the freelancer can no longer submit.",
    doneTitle: "Escrow refunded",
    doneDescription: "The locked GEN is on its way back to you.",
  },
};

/** Build the Transaction Kit write for an action. Only `submit` needs extra input. */
export function buildActionTx(
  contractAddress: string,
  action: EscrowAction,
  escrowId: string,
  evidenceUrl = "",
): SubmitInput {
  return {
    kind: "write",
    address: contractAddress as `0x${string}`,
    method: ACTION_METHOD[action],
    args: action === "submit" ? [escrowId, evidenceUrl.trim()] : [escrowId],
  };
}

/**
 * What the connected wallet may do. This mirrors the contract's own rules, so a
 * button is only shown when the contract would accept the call:
 * - freelancer: submit while funded
 * - client: cancel while funded and no evidence was decided yet,
 *           refund once at least one submission was rejected
 */
export function availableActions(escrow: Escrow, viewer: string | null, connected: boolean) {
  const me = viewer?.toLowerCase();
  const isClient = !!me && me === escrow.client?.toLowerCase();
  const isFreelancer = !!me && me === escrow.freelancer?.toLowerCase();
  const isOpen = escrow.status === "funded";

  return {
    isClient,
    isFreelancer,
    isOpen,
    canSubmit: connected && isFreelancer && isOpen,
    canCancel: connected && isClient && isOpen && escrow.attempts === 0,
    canRefund: connected && isClient && isOpen && escrow.attempts > 0,
  };
}
