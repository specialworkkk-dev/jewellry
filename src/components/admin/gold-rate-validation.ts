export const GOLD_RATE_MAX = 500_000; // INR per gram; generous sanity bound

/**
 * Shared by the GoldRateUpdater UI and the server action that persists it.
 * Returns an error message, or null when valid. null/undefined rates mean "clear".
 */
export function validateGoldRates(rate22k: number | null | undefined, rate24k: number | null | undefined): string | null {
  for (const [label, rate] of [["22K", rate22k], ["24K", rate24k]] as const) {
    if (rate == null) continue;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return `${label} rate must be a positive number.`;
    if (rate > GOLD_RATE_MAX) return `${label} rate must not exceed ₹${GOLD_RATE_MAX.toLocaleString("en-IN")} per gram.`;
  }
  if (rate22k != null && rate24k != null && rate22k > rate24k) return "22K rate cannot be higher than the 24K rate.";
  return null;
}
