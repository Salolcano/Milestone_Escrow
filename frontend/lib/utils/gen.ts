/** GEN has 18 decimals. Amounts on chain are whole numbers of the smallest unit. */
const DECIMALS = 18;
const UNIT = BigInt(10) ** BigInt(DECIMALS);

/**
 * Turn what a person typed ("1.5") into the on-chain amount.
 * Returns null for anything that is not a positive amount with at most 18 decimals.
 */
export function parseGen(input: string): bigint | null {
  const text = input.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(text)) return null;

  const [whole, fraction = ""] = text.split(".");
  const amount = BigInt(whole) * UNIT + BigInt(fraction.padEnd(DECIMALS, "0"));
  return amount > BigInt(0) ? amount : null;
}

/** Turn an on-chain amount into text for people ("1.5"). Shows up to 4 decimals. */
export function formatGen(value: string | number | bigint | null | undefined): string {
  let amount: bigint;
  try {
    amount = BigInt(value ?? 0);
  } catch {
    return "0";
  }

  const whole = amount / UNIT;
  const fraction = (amount % UNIT).toString().padStart(DECIMALS, "0").slice(0, 4).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

/** A GenLayer / Ethereum style address: 0x + 40 hex characters. */
export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}
