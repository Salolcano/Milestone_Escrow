"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import MilestoneEscrow from "../contracts/MilestoneEscrow";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import type { Escrow } from "../contracts/types";

/**
 * Returns the MilestoneEscrow contract instance, or null if
 * NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Read calls work without a wallet.
 */
export function useMilestoneEscrowContract(): MilestoneEscrow | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();

  return useMemo(() => {
    if (!contractAddress) {
      return null;
    }
    return new MilestoneEscrow(contractAddress, address);
  }, [contractAddress, address]);
}

export function useEscrows() {
  const contract = useMilestoneEscrowContract();

  return useQuery<Escrow[], Error>({
    queryKey: ["escrows"],
    queryFn: () => (contract ? contract.getEscrows() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useTotalLocked() {
  const contract = useMilestoneEscrowContract();

  return useQuery<string, Error>({
    queryKey: ["total-locked"],
    queryFn: () => (contract ? contract.getTotalLocked() : Promise.resolve("0")),
    refetchOnWindowFocus: true,
    enabled: !!contract,
    staleTime: 2000,
  });
}

export function useInvalidateEscrows() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["escrows"] });
    queryClient.invalidateQueries({ queryKey: ["total-locked"] });
  }, [queryClient]);
}
