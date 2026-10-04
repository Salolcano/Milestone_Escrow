/**
 * TypeScript types for the MilestoneEscrow contract
 */

export type EscrowStatus = "funded" | "released" | "refunded" | "cancelled";

export interface Escrow {
  id: string;
  client: string;
  freelancer: string;
  title: string;
  requirements: string;
  /** Locked amount in the smallest unit (18 decimals), as text. */
  amount: string;
  status: EscrowStatus;
  attempts: number;
  max_attempts: number;
  evidence_url: string;
  verdict_reason: string;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}
