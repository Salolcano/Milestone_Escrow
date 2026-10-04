import { describe, expect, it } from "vitest";
import { ACTION_METHOD, availableActions, buildActionTx } from "../lib/escrowActions";
import type { Escrow } from "../lib/contracts/types";

const CLIENT = "0x00000000000000000000000000000000000000c1";
const FREELANCER = "0x00000000000000000000000000000000000000f2";
const STRANGER = "0x00000000000000000000000000000000000000d3";
const CONTRACT = "0x1234567890123456789012345678901234567890";

function escrow(overrides: Partial<Escrow> = {}): Escrow {
  return {
    id: "7",
    client: CLIENT,
    freelancer: FREELANCER,
    title: "Logo",
    requirements: "Three logo options as PNG and SVG",
    amount: "1000000000000000000",
    status: "funded",
    attempts: 0,
    max_attempts: 3,
    evidence_url: "",
    verdict_reason: "",
    ...overrides,
  };
}

describe("escrow actions call the matching contract methods", () => {
  it("maps each action to its contract method", () => {
    expect(ACTION_METHOD).toEqual({
      submit: "submit_evidence",
      cancel: "cancel_escrow",
      refund: "refund_after_rejection",
    });
  });

  it("builds the refund write with only the escrow id", () => {
    expect(buildActionTx(CONTRACT, "refund", "7")).toEqual({
      kind: "write",
      address: CONTRACT,
      method: "refund_after_rejection",
      args: ["7"],
    });
  });

  it("builds submit with the trimmed evidence url, and cancel with only the id", () => {
    expect(buildActionTx(CONTRACT, "submit", "7", "  https://work.example.org/logo  ")).toMatchObject({
      method: "submit_evidence",
      args: ["7", "https://work.example.org/logo"],
    });
    expect(buildActionTx(CONTRACT, "cancel", "7")).toMatchObject({ method: "cancel_escrow", args: ["7"] });
  });
});

describe("who sees which button", () => {
  it("client can cancel before any decided evidence, but not refund", () => {
    const a = availableActions(escrow({ attempts: 0 }), CLIENT, true);
    expect([a.canCancel, a.canRefund, a.canSubmit]).toEqual([true, false, false]);
  });

  it("after a rejection the client can refund, and cancel is gone", () => {
    for (const attempts of [1, 2]) {
      const a = availableActions(escrow({ attempts }), CLIENT, true);
      expect([a.canCancel, a.canRefund, a.canSubmit]).toEqual([false, true, false]);
    }
  });

  it("matches addresses regardless of letter case", () => {
    const a = availableActions(escrow({ attempts: 1, client: CLIENT.toUpperCase().replace("0X", "0x") }), CLIENT, true);
    expect(a.canRefund).toBe(true);
  });

  it("freelancer can only submit while funded, and never refund or cancel", () => {
    const a = availableActions(escrow({ attempts: 1 }), FREELANCER, true);
    expect([a.canCancel, a.canRefund, a.canSubmit]).toEqual([false, false, true]);
  });

  it("strangers and disconnected visitors get no actions", () => {
    for (const [viewer, connected] of [
      [STRANGER, true],
      [null, false],
      [CLIENT, false],
    ] as const) {
      const a = availableActions(escrow({ attempts: 1 }), viewer, connected);
      expect([a.canCancel, a.canRefund, a.canSubmit]).toEqual([false, false, false]);
    }
  });

  it("settled escrows offer nothing, including the refund", () => {
    for (const status of ["released", "refunded", "cancelled"] as const) {
      for (const viewer of [CLIENT, FREELANCER]) {
        const a = availableActions(escrow({ status, attempts: 1 }), viewer, true);
        expect([a.canCancel, a.canRefund, a.canSubmit]).toEqual([false, false, false]);
      }
    }
  });
});
