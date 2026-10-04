# MilestoneEscrow

Pay for finished work, not promises. Built on GenLayer.

A client locks GEN for a milestone and describes the finished work in plain English. The freelancer links a public web page that shows the work. The Intelligent Contract reads that page live, and GenLayer validators answer three fixed yes/no questions about it. If all three are yes, the contract releases the GEN to the freelancer. If the evidence is rejected three times, the GEN goes back to the client.

GenLayer is the core of the workflow: a normal smart contract cannot fetch a live web page or judge whether plain-English requirements were met.

## Network

- Network: Studio Next (Consensus v0.6)
- RPC: https://studio-next.genlayer.com/api
- Chain ID: 61997
- Explorer: https://explorer-studio-dev.genlayer.com/
- Deployed contract: *(set after deploying `contracts/milestone_escrow.py` on Studio Next)*

## Project structure

```
contracts/milestone_escrow.py   # MilestoneEscrow Intelligent Contract
frontend/                       # Next.js app (Transaction Kit RC2, genlayer-js 2.0.0-rc.1)
deploy/deployScript.ts          # Deployment script used by `genlayer deploy`
tests/unit/                     # Tests for the decision logic
```

## Contract

`contracts/milestone_escrow.py`

| Method | Type | What it does |
| --- | --- | --- |
| `create_escrow(title, freelancer, requirements)` | write, payable | The client locks the attached GEN for a milestone |
| `submit_evidence(escrow_id, evidence_url)` | write | The freelancer submits a page; validators check it |
| `cancel_escrow(escrow_id)` | write | The client takes the GEN back, only before any evidence was decided |
| `refund_after_rejection(escrow_id)` | write | The client takes the GEN back once validators have rejected evidence |
| `get_escrow(escrow_id)` | view | One escrow as JSON |
| `get_escrows()` | view | All escrows as JSON |
| `get_escrow_count()` | view | Number of escrows |
| `get_total_locked()` | view | GEN currently held for open escrows |

An escrow is `funded`, then ends as `released`, `refunded` or `cancelled`. Every end state is final: nobody can act on a settled escrow, and no amount can leave twice.

### Lifecycle and exits

| Situation | Who can act | Result |
| --- | --- | --- |
| Funded, no decided evidence yet | Client: `cancel_escrow` | `cancelled`, full amount back to the client |
| Funded, evidence not yet decided or unreadable | Freelancer: `submit_evidence` again | Nothing is recorded, so retrying is free |
| Validators approve | Freelancer's submission | `released`, amount sent to the freelancer |
| Validators reject, attempts left | Freelancer: submit again, **or** client: `refund_after_rejection` | Client's call gives `refunded` and the full amount back |
| Third rejection | Automatic | `refunded`, amount back to the client |

The client exit after a rejection exists so a rejected escrow can never sit funded forever just because the freelancer stops responding. It is open only once validators have recorded at least one rejection. `attempts` counts only decided submissions, and an approval settles the escrow at once, so a funded escrow with `attempts > 0` always means the latest decided submission was rejected. Evidence that could not be read, or a model answer that could not be used, never counts as a rejection and never opens the refund.

The trade-off is deliberate: after a rejection the client may refund immediately, which ends the freelancer's remaining attempts. Whichever of the two calls lands first wins.

## Who decides what

Code decides everything about money. Validators only answer a narrow question about evidence.

| Handled by deterministic code | Handled by validators |
| --- | --- |
| Who the client and freelancer are | Is a real piece of work shown on the page? |
| The amount locked and how much leaves | Does it satisfy the written requirements? |
| Who may submit, cancel or settle | Is the page about this specific work, not a placeholder? |
| The 3-attempt limit and the refund | |
| Release and refund direction | |
| The locked-funds counter | |

## How the decision works

`submit_evidence` reads the page with `gl.nondet.web.render` and asks the model for a fixed schema:

```
{"deliverable_present": bool, "requirements_met": bool, "evidence_specific": bool, "evidence_quote": str}
```

The result is reduced to one value (`approved`, `denied`, `unavailable` or `invalid`), and `gl.eq_principle.strict_eq` makes validators agree on exactly that value before any state changes or money moves.

Integrity rules:

- **Fail-safe approval.** All three checks must be the real JSON boolean `true`. Strings such as `"true"`, numbers, missing fields and malformed output never approve.
- **Evidence-bound approval.** An approval must quote text that is actually present in the fetched page. The contract checks this itself.
- **Unavailable evidence or unusable output** reverts the call with no state change, so the escrow stays funded and the freelancer can retry. It does not use up an attempt.
- **Prompt isolation.** The requirements and the page are untrusted. They are sent as one JSON-escaped data object, with the rules placed before and after it.
- **Consensus-bound explanation.** The stored `verdict_reason` is written by the contract from the agreed decision. Free-form model text is never stored.
- **Conservation.** `total_locked` goes up by exactly the amount attached on create and down by exactly the amount released, refunded or cancelled.
- **Attempt limit and client exit.** After 3 rejected submissions the funds return to the client automatically. Before that, the client can take them back with `refund_after_rejection` as soon as one rejection exists, so funds cannot stay locked indefinitely.

Known limitations: the freelancer chooses the evidence page, so this is a demo of consensus verification, not a replacement for a trusted escrow service. There are no deadlines. After a rejection the client can refund right away, which cuts the freelancer's remaining attempts short.

## Tests

The decision logic runs with plain `pytest` and needs no GenLayer tooling:

```
pip install pytest
pytest tests/unit/ -v
```

`tests/unit/test_decision_logic.py` covers the 3-boolean schema, string and malformed model output, missing and fake quotes, and prompt isolation.

`tests/unit/test_lifecycle.py` runs the real contract file through the full lifecycle: funding, cancel, approval, denial, the client refund after a rejection, the automatic refund after the third rejection, who may call what, no double payout from a settled escrow, and that locked, released and refunded amounts always add up. It uses a small stand-in for the GenLayer runtime (`tests/unit/harness.py`). That harness is not the GenLayer VM, so it checks the contract's logic, not validator consensus on Studio.

## Frontend

The frontend reads the contract with `genlayer-js`. Every write (`create_escrow`, `submit_evidence`, `cancel_escrow`) goes through the Transaction Kit panel, which shows the fee quote and tracks the transaction until validators decide. `create_escrow` is payable: the GEN to lock is passed to the panel as `userValue`, and the panel shows it next to the fee quote.

1. Copy `frontend/.env.example` to `frontend/.env`
2. Set `NEXT_PUBLIC_CONTRACT_ADDRESS` to your deployed contract address
3. Install and run:

```
npm ci
npm run dev
```

You need MetaMask. The app adds and switches to the Studio Next network (chain ID 61997) for you.
