/**
 * Pure helpers for wishlist alerts (price drop / back in stock). No imports on purpose: they are
 * unit-tested directly with node and safe on the client and the server.
 */

/** Only these price types carry a real numeric price a customer can compare. */
export const NUMERIC_PRICE_TYPES = ["FIXED_PRICE", "STARTING_FROM"] as const;

/** A price must drop by at least this percentage to be worth a notification. */
export const MIN_PRICE_DROP_PERCENT = 1;

/** At most one price-drop alert per product in this window. */
export const PRICE_DROP_ALERT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Do not repeat a back-in-stock alert for the same product inside this window (stock toggled by mistake). */
export const BACK_IN_STOCK_ALERT_WINDOW_MS = 6 * 60 * 60 * 1000;

export const MAX_ALERT_PRODUCT_NAME_LENGTH = 50;

export function isNumericPriceType(priceType: unknown): boolean {
  return typeof priceType === "string" && (NUMERIC_PRICE_TYPES as readonly string[]).includes(priceType);
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export type PriceDropInput = {
  oldPrice?: unknown;
  newPrice?: unknown;
  oldPriceType?: unknown;
  newPriceType?: unknown;
  minPercent?: number;
};

/** Decide whether an edit counts as a customer-visible price drop. Never throws. */
export function decidePriceDrop(input: PriceDropInput): { drop: boolean; percent: number } {
  const none = { drop: false, percent: 0 };
  if (!isNumericPriceType(input.oldPriceType) || !isNumericPriceType(input.newPriceType)) return none;
  const oldPrice = positiveNumber(input.oldPrice);
  const newPrice = positiveNumber(input.newPrice);
  if (oldPrice === null || newPrice === null || newPrice >= oldPrice) return none;
  const minPercent = typeof input.minPercent === "number" && Number.isFinite(input.minPercent) && input.minPercent > 0
    ? input.minPercent
    : MIN_PRICE_DROP_PERCENT;
  const percent = ((oldPrice - newPrice) / oldPrice) * 100;
  // The tiny epsilon keeps an exact 1% drop (e.g. 10000 -> 9900) from failing on float noise.
  return { drop: percent >= minPercent - 1e-9, percent };
}

/** True when the current price is lower than the price recorded when the product was saved. */
export function isPriceLowerThanSaved(current: { price?: unknown; priceType?: unknown }, priceAtSave: unknown): boolean {
  if (!isNumericPriceType(current.priceType)) return false;
  const now = positiveNumber(current.price);
  const then = positiveNumber(priceAtSave);
  return now !== null && then !== null && now < then;
}

/** The price to remember when a product is saved: only real numeric prices, otherwise nothing. */
export function priceToRememberAtSave(product: { price?: unknown; priceType?: unknown }): number | undefined {
  if (!isNumericPriceType(product.priceType)) return undefined;
  return positiveNumber(product.price) ?? undefined;
}

/** Indian digit grouping with a rupee sign, e.g. 1234567 -> "₹12,34,567". Invalid input gives "". */
export function formatInr(amount: unknown): string {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return "";
  const rounded = Math.round(amount * 100) / 100;
  const [whole, fraction] = rounded.toFixed(2).split(".");
  const lastThree = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${lastThree}` : lastThree;
  return `₹${grouped}${fraction === "00" ? "" : `.${fraction}`}`;
}

/** Shorten a product name for a notification without cutting a surrogate pair in half. */
export function truncateProductName(name: unknown, max = MAX_ALERT_PRODUCT_NAME_LENGTH): string {
  if (typeof name !== "string") return "";
  const clean = name.replace(/\s+/g, " ").trim();
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  return `${chars.slice(0, Math.max(1, max - 1)).join("").trimEnd()}…`;
}

/** Template variables for a wishlist alert. `price` is empty when there is no valid price. */
export function buildAlertValues(input: { shopName: string; productName?: unknown; price?: unknown }) {
  return {
    shopName: input.shopName,
    productName: truncateProductName(input.productName) || undefined,
    price: formatInr(input.price) || undefined,
  };
}

/**
 * Choose which subscriptions receive an alert: only those whose visitor actually saved the product.
 * Subscriptions without an actor id (older opt-ins) are never targeted. Result is de-duplicated.
 */
export function selectAudienceSubscriptionIds(
  subscriptions: ReadonlyArray<{ id: string; actorId?: string | null }>,
  savedActorIds: Iterable<string>,
): string[] {
  const savers = new Set<string>();
  for (const actorId of savedActorIds) if (typeof actorId === "string" && actorId) savers.add(actorId);
  if (savers.size === 0) return [];
  const selected = new Set<string>();
  for (const subscription of subscriptions) {
    if (subscription.id && subscription.actorId && savers.has(subscription.actorId)) selected.add(subscription.id);
  }
  return [...selected];
}

/** Back in stock only when stock really flips from sold out to available. */
export function isBackInStock(before: unknown, after: unknown): boolean {
  return before === "OUT_OF_STOCK" && after === "IN_STOCK";
}

/** True when the 24h price-drop window has not been used yet (informational; the DB guard is the source of truth). */
export function priceDropWindowOpen(lastAlertAt: Date | string | number | null | undefined, now = Date.now()) {
  if (lastAlertAt == null) return true;
  const time = new Date(lastAlertAt).getTime();
  return !Number.isFinite(time) || time <= now - PRICE_DROP_ALERT_WINDOW_MS;
}
