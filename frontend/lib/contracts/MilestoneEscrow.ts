import { createClient } from "genlayer-js";
import { GENLAYER_CHAIN } from "../genlayer/client";
import type { Escrow } from "./types";

/**
 * MilestoneEscrow contract class: read-only calls to the deployed Intelligent Contract.
 * Writes go through Transaction Kit (see the components in /components).
 */
class MilestoneEscrow {
  private contractAddress: `0x${string}`;
  private client: any;

  constructor(contractAddress: string, address?: string | null) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = {
      chain: GENLAYER_CHAIN,
    };

    if (address) {
      config.account = address as `0x${string}`;
    }

    this.client = createClient(config);
  }

  /**
   * Update the address used for calls
   */
  updateAccount(address: string): void {
    const config: any = {
      chain: GENLAYER_CHAIN,
      account: address as `0x${string}`,
    };

    this.client = createClient(config);
  }

  /**
   * Get all escrows (newest first)
   */
  async getEscrows(): Promise<Escrow[]> {
    try {
      const raw: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_escrows",
        args: [],
      });

      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return (parsed as Escrow[])
        .map((e) => ({
          ...e,
          amount: String(e.amount),
          attempts: Number(e.attempts),
          max_attempts: Number(e.max_attempts),
        }))
        .sort((a, b) => Number(b.id) - Number(a.id));
    } catch (error) {
      console.error("Error fetching escrows:", error);
      throw new Error("Failed to fetch escrows from contract");
    }
  }

  /**
   * Total GEN currently held by the contract for open escrows (smallest unit, as text)
   */
  async getTotalLocked(): Promise<string> {
    try {
      const total: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_total_locked",
        args: [],
      });

      return String(total ?? "0");
    } catch (error) {
      console.error("Error fetching total locked:", error);
      return "0";
    }
  }
}

export default MilestoneEscrow;
