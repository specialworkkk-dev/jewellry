const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function getPlanReminderStatus(planEndsAt?: Date | null) {
  if (!planEndsAt) {
    return { expired: false, withinReminderWindow: false, daysRemaining: 0 };
  }

  const millisecondsRemaining = planEndsAt.getTime() - Date.now();
  const expired = millisecondsRemaining < 0;
  return {
    expired,
    withinReminderWindow: expired || millisecondsRemaining <= 3 * DAY_IN_MILLISECONDS,
    daysRemaining: expired ? 0 : Math.max(1, Math.ceil(millisecondsRemaining / DAY_IN_MILLISECONDS)),
  };
}

export const PLAN_EXPIRED_MESSAGE =
  "Your plan has expired. Please renew your plan to continue adding content.";

/** True only for shops with an end date in the past; free plans (no planEndsAt) never expire. */
export function isPlanExpired(planEndsAt?: Date | string | null, now: number = Date.now()) {
  if (!planEndsAt) return false;
  const time = new Date(planEndsAt).getTime();
  return Number.isFinite(time) && time < now;
}

/** Returns a 403 payload when the shop may not create content, otherwise null. */
export function getPlanBlock(
  shop: { isActive?: boolean; planEndsAt?: Date | string | null },
  now: number = Date.now(),
): { error: string; status: 403 } | null {
  if (shop.isActive === false) return { error: "This shop is inactive", status: 403 };
  if (isPlanExpired(shop.planEndsAt, now)) return { error: PLAN_EXPIRED_MESSAGE, status: 403 };
  return null;
}

/** IST calendar day key, e.g. "2026-10-07". */
export function istDayKey(now: number = Date.now()) {
  return new Date(now + 330 * 60 * 1000).toISOString().slice(0, 10);
}

/** Start (UTC instant) of the current IST day. */
export function istDayStart(now: number = Date.now()) {
  return new Date(Date.parse(`${istDayKey(now)}T00:00:00.000Z`) - 330 * 60 * 1000);
}

/**
 * True when `url` points inside this shop's own R2 prefix. `folder` narrows it
 * to one sub-folder (e.g. "products"); omit to allow any folder of the shop.
 */
export function isShopMediaUrl(
  url: string,
  publicBaseUrl: string | undefined,
  shopId: string,
  folder?: string,
) {
  if (!url || !publicBaseUrl) return false;
  const base = publicBaseUrl.replace(/\/$/, "");
  const prefix = `${base}/shops/${shopId}/${folder ? `${folder}/` : ""}`;
  if (!url.startsWith(prefix)) return false;
  const rest = url.slice(prefix.length);
  return rest.length > 0 && !rest.split(/[/?#]/).some((part) => part === "..");
}

export function shopMediaBaseUrl() {
  return process.env.NEXT_PUBLIC_R2_DEV_URL?.replace(/\/$/, "");
}

/** Price-on-request / contact-for-price products must not carry a price. */
export function priceTypeAllowsPrice(priceType: string) {
  return priceType === "FIXED_PRICE" || priceType === "STARTING_FROM";
}

/** Ad expiry must be strictly in the future. */
export function isFutureDate(date: Date, now: number = Date.now()) {
  return Number.isFinite(date.getTime()) && date.getTime() > now;
}
